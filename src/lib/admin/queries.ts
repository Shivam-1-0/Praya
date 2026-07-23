import { getSupabaseServiceRole } from "@/lib/supabase/service";
import { getTodayInTimezone, lastNDates } from "@/lib/today";

// Cross-user reads and audit-log writes for the admin surface. Service-role
// by necessity — an admin looking at another user's data has no session for
// that user. Every function that reveals per-user data writes an audit row.

export type UsageStats = {
  totalUsers: number;
  totalAdmins: number;
  totalActiveHabits: number;
  totalOpenTasks: number;
  completionsLast7d: number;
  reviewsLast7d: number;
  activeUsersLast7d: number;
};

export async function getUsageStats(): Promise<UsageStats> {
  const supabase = getSupabaseServiceRole();
  const today = getTodayInTimezone("UTC");
  const windowStart = lastNDates(today, 7)[0];

  const [
    users,
    admins,
    habits,
    tasks,
    completions,
    reviews,
    activeUsers,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_admin", true),
    supabase.from("habits").select("*", { count: "exact", head: true }).is("archived_at", null),
    supabase.from("tasks").select("*", { count: "exact", head: true }).is("archived_at", null),
    supabase
      .from("completions")
      .select("*", { count: "exact", head: true })
      .gte("completion_date", windowStart),
    supabase
      .from("day_reviews")
      .select("*", { count: "exact", head: true })
      .gte("review_date", windowStart)
      .not("completed_at", "is", null),
    supabase
      .from("completions")
      .select("user_id")
      .gte("completion_date", windowStart),
  ]);

  const uniqueUsers = new Set((activeUsers.data ?? []).map((r) => r.user_id));

  return {
    totalUsers: users.count ?? 0,
    totalAdmins: admins.count ?? 0,
    totalActiveHabits: habits.count ?? 0,
    totalOpenTasks: tasks.count ?? 0,
    completionsLast7d: completions.count ?? 0,
    reviewsLast7d: reviews.count ?? 0,
    activeUsersLast7d: uniqueUsers.size,
  };
}

export type UserRow = {
  user_id: string;
  display_name: string | null;
  timezone: string;
  is_admin: boolean;
  created_at: string;
  active_habit_count: number;
  reviews_count: number;
};

export async function listUsers(adminUserId: string): Promise<UserRow[]> {
  const supabase = getSupabaseServiceRole();

  const [{ data: profiles }, { data: habits }, { data: reviews }] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, display_name, timezone, is_admin, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("habits").select("user_id").is("archived_at", null),
    supabase.from("day_reviews").select("user_id").not("completed_at", "is", null),
  ]);

  const habitByUser = new Map<string, number>();
  for (const h of habits ?? []) habitByUser.set(h.user_id, (habitByUser.get(h.user_id) ?? 0) + 1);
  const reviewByUser = new Map<string, number>();
  for (const r of reviews ?? []) reviewByUser.set(r.user_id, (reviewByUser.get(r.user_id) ?? 0) + 1);

  await logAdminAction(adminUserId, "list_users", null, {
    result_count: (profiles ?? []).length,
  });

  return (profiles ?? []).map((p) => ({
    ...p,
    active_habit_count: habitByUser.get(p.user_id) ?? 0,
    reviews_count: reviewByUser.get(p.user_id) ?? 0,
  }));
}

export type UserOverview = {
  profile: {
    user_id: string;
    display_name: string | null;
    timezone: string;
    is_admin: boolean;
    created_at: string;
  };
  email: string | null;
  activeHabits: Array<{ id: string; title: string; is_important: boolean; frequency_type: string }>;
  openTaskCount: number;
  completionsLast30d: number;
  recentReviews: Array<{ review_date: string; day_score: number | null; satisfaction_rating: number | null }>;
};

export async function getUserOverview(
  adminUserId: string,
  targetUserId: string,
): Promise<UserOverview | null> {
  const supabase = getSupabaseServiceRole();
  const today = getTodayInTimezone("UTC");
  const window30 = lastNDates(today, 30)[0];

  const [
    { data: profile },
    { data: authUser },
    { data: habits },
    { count: openTaskCount },
    { count: completionsLast30d },
    { data: recentReviews },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, display_name, timezone, is_admin, created_at")
      .eq("user_id", targetUserId)
      .maybeSingle(),
    supabase.auth.admin.getUserById(targetUserId),
    supabase
      .from("habits")
      .select("id, title, is_important, frequency_type")
      .eq("user_id", targetUserId)
      .is("archived_at", null)
      .order("is_important", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetUserId)
      .is("archived_at", null),
    supabase
      .from("completions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetUserId)
      .gte("completion_date", window30),
    supabase
      .from("day_reviews")
      .select("review_date, day_score, satisfaction_rating")
      .eq("user_id", targetUserId)
      .not("completed_at", "is", null)
      .order("review_date", { ascending: false })
      .limit(7),
  ]);

  if (!profile) return null;

  await logAdminAction(adminUserId, "view_user_overview", targetUserId, null);

  return {
    profile,
    email: authUser?.user?.email ?? null,
    activeHabits: habits ?? [],
    openTaskCount: openTaskCount ?? 0,
    completionsLast30d: completionsLast30d ?? 0,
    recentReviews: (recentReviews ?? []).map((r) => ({
      review_date: r.review_date,
      day_score: r.day_score != null ? Number(r.day_score) : null,
      satisfaction_rating: r.satisfaction_rating,
    })),
  };
}

export type AuditRow = {
  id: string;
  admin_user_id: string;
  action: string;
  target_user_id: string | null;
  detail: unknown;
  created_at: string;
};

export async function getRecentAuditLog(limit = 50): Promise<AuditRow[]> {
  const supabase = getSupabaseServiceRole();
  const { data } = await supabase
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AuditRow[];
}

async function logAdminAction(
  adminUserId: string,
  action: string,
  targetUserId: string | null,
  detail: Record<string, unknown> | null,
) {
  const supabase = getSupabaseServiceRole();
  await supabase.from("admin_audit_log").insert({
    admin_user_id: adminUserId,
    action,
    target_user_id: targetUserId,
    detail,
  });
}
