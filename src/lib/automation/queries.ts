import { getSupabaseServiceRole } from "@/lib/supabase/service";
import { getTodayInTimezone } from "@/lib/today";
import { isHabitScheduledOn } from "@/lib/habits";
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

  const { data: habitsRaw } = await supabase
    .from("habits")
    .select("id, title, description, frequency_type, custom_days, is_important")
    .eq("user_id", userId)
    .is("archived_at", null);

  const { data: tasksRaw } = await supabase
    .from("tasks")
    .select("id, title, description, priority")
    .eq("user_id", userId)
    .is("archived_at", null)
    .eq("due_date", today);

  const { data: comps } = await supabase
    .from("completions")
    .select("item_type, item_id")
    .eq("user_id", userId)
    .eq("completion_date", today);

  const done = new Set((comps ?? []).map((c) => `${c.item_type}:${c.item_id}`));

  const habits = (habitsRaw ?? [])
    .filter((h) => isHabitScheduledOn(h, today))
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

  const importantHabits = habits.filter((h) => h.is_important);

  return {
    date: today,
    timezone: tz,
    habits,
    tasks,
    summary: {
      total_items: habits.length + tasks.length,
      completed_items: habits.filter((h) => h.is_complete).length + tasks.filter((t) => t.is_complete).length,
      important_habits_total: importantHabits.length,
      important_habits_completed: importantHabits.filter((h) => h.is_complete).length,
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
    .select("id, title, description, frequency_type, custom_days, is_important, archived_at, created_at")
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
