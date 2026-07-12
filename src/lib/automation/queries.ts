import { getSupabaseServiceRole } from "@/lib/supabase/service";
import { getTodayInTimezone, getWeekStart, getWeekEnd } from "@/lib/today";
import { isHabitScheduledOn, countsTowardDayScore } from "@/lib/habits";
import { computeDayScore } from "@/lib/day-score";

// The ONLY module allowed to use the service-role client for user data.
// Every function takes userId as its mandatory first parameter and every
// query below filters explicitly on it. Do not add a function here that
// omits that filter — RLS is not the safety net for this code path.

async function getTimezone(userId: string): Promise<string> {
  const supabase = getSupabaseServiceRole();
  const { data } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("user_id", userId)
    .single();
  return data?.timezone ?? "UTC";
}

type HabitRow = {
  id: string;
  title: string;
  description: string | null;
  frequency_type: "daily" | "weekly" | "custom_days";
  custom_days: number[] | null;
  target_count: number;
  is_important: boolean;
  archived_at: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: "low" | "medium" | "high" | null;
  archived_at: string | null;
};

export async function getTodaySnapshot(userId: string) {
  const supabase = getSupabaseServiceRole();
  const tz = await getTimezone(userId);
  const today = getTodayInTimezone(tz);
  const weekStart = getWeekStart(today);

  const { data: habitsRaw } = await supabase
    .from("habits")
    .select("id, title, description, frequency_type, custom_days, target_count, is_important")
    .eq("user_id", userId)
    .is("archived_at", null);

  const { data: tasksRaw } = await supabase
    .from("tasks")
    .select("id, title, description, priority")
    .eq("user_id", userId)
    .is("archived_at", null)
    .eq("due_date", today);

  const { data: weekComps } = await supabase
    .from("completions")
    .select("item_type, item_id, completion_date")
    .eq("user_id", userId)
    .gte("completion_date", weekStart)
    .lte("completion_date", today);

  const done = new Set(
    (weekComps ?? [])
      .filter((c) => c.completion_date === today)
      .map((c) => `${c.item_type}:${c.item_id}`),
  );
  const weekHabitCounts = new Map<string, number>();
  const habitCountBeforeToday = new Map<string, number>();
  for (const c of weekComps ?? []) {
    if (c.item_type !== "habit") continue;
    weekHabitCounts.set(c.item_id, (weekHabitCounts.get(c.item_id) ?? 0) + 1);
    if (c.completion_date < today) {
      habitCountBeforeToday.set(c.item_id, (habitCountBeforeToday.get(c.item_id) ?? 0) + 1);
    }
  }
  const weekEnd = getWeekEnd(today);

  const habits = (habitsRaw ?? [])
    .filter((h) => isHabitScheduledOn(h, today, weekHabitCounts.get(h.id) ?? 0))
    .map((h) => ({
      id: h.id,
      title: h.title,
      description: h.description,
      is_important: h.is_important,
      is_complete: done.has(`habit:${h.id}`),
    }));

  const tasks = (tasksRaw ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    is_complete: done.has(`task:${t.id}`),
  }));

  // Score denominator uses countsTowardDayScore, not visibility — a weekly
  // habit still has runway shouldn't sink today's score. See HANDOFF.md §9.1.
  let habitTotal = 0;
  let habitCompleted = 0;
  let importantTotal = 0;
  let importantCompleted = 0;
  for (const h of habitsRaw ?? []) {
    const c = countsTowardDayScore(
      h,
      today,
      habitCountBeforeToday.get(h.id) ?? 0,
      done.has(`habit:${h.id}`),
      weekEnd,
    );
    if (c === "not_counted") continue;
    habitTotal += 1;
    if (c === "complete") habitCompleted += 1;
    if (h.is_important) {
      importantTotal += 1;
      if (c === "complete") importantCompleted += 1;
    }
  }

  return {
    date: today,
    timezone: tz,
    habits,
    tasks,
    summary: {
      total_items: habitTotal + tasks.length,
      completed_items: habitCompleted + tasks.filter((t) => t.is_complete).length,
      important_habits_total: importantTotal,
      important_habits_completed: importantCompleted,
    },
  };
}

export async function getDayScore(userId: string) {
  const supabase = getSupabaseServiceRole();
  const snap = await getTodaySnapshot(userId);

  // If a finalized review exists for today, return the snapshotted score
  // so historical scores never silently shift when scoring logic changes.
  const { data: review } = await supabase
    .from("day_reviews")
    .select("day_score, satisfaction_rating, completed_at")
    .eq("user_id", userId)
    .eq("review_date", snap.date)
    .maybeSingle();

  if (review?.completed_at && review.day_score != null) {
    const finalized = computeDayScore({
      totalItems: snap.summary.total_items,
      completedItems: snap.summary.completed_items,
      importantTotal: snap.summary.important_habits_total,
      importantCompleted: snap.summary.important_habits_completed,
      satisfactionRating: review.satisfaction_rating,
    });
    return { date: snap.date, ...finalized, score: Number(review.day_score) };
  }

  const partial = computeDayScore({
    totalItems: snap.summary.total_items,
    completedItems: snap.summary.completed_items,
    importantTotal: snap.summary.important_habits_total,
    importantCompleted: snap.summary.important_habits_completed,
    satisfactionRating: null,
  });
  return { date: snap.date, ...partial };
}

export async function listHabits(userId: string, archived: boolean | null) {
  const supabase = getSupabaseServiceRole();
  let q = supabase
    .from("habits")
    .select("id, title, description, frequency_type, custom_days, target_count, is_important, archived_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (archived === false) q = q.is("archived_at", null);
  else if (archived === true) q = q.not("archived_at", "is", null);
  const { data } = await q;
  return (data ?? []) as HabitRow[] & { created_at: string }[];
}

export async function listTasks(userId: string, from: string | null, to: string | null) {
  const supabase = getSupabaseServiceRole();
  let q = supabase
    .from("tasks")
    .select("id, title, description, due_date, priority, archived_at, created_at")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("due_date", { ascending: true });
  if (from) q = q.gte("due_date", from);
  if (to) q = q.lte("due_date", to);
  const { data } = await q;
  return (data ?? []) as TaskRow[] & { created_at: string }[];
}
