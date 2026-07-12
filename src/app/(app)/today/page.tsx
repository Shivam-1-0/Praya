import { getSupabaseServer } from "@/lib/supabase/server";
import { getTodayInTimezone, getWeekStart } from "@/lib/today";
import { isHabitScheduledOn } from "@/lib/habits";
import { getGreeting, formatTodayLong, formatWeekday } from "@/lib/greeting";
import { TodayClient } from "./TodayClient";

export default async function TodayPage() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, timezone")
    .eq("user_id", user!.id)
    .single();

  const tz = profile?.timezone ?? "UTC";
  const today = getTodayInTimezone(tz);

  const weekStart = getWeekStart(today);

  const { data: habitsRaw } = await supabase
    .from("habits")
    .select("id, title, frequency_type, custom_days, target_count, is_important")
    .eq("user_id", user!.id)
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const { data: tasksRaw } = await supabase
    .from("tasks")
    .select("id, title, priority")
    .eq("user_id", user!.id)
    .is("archived_at", null)
    .eq("due_date", today)
    .order("created_at", { ascending: true });

  const [{ data: weekComps }, { data: review }] = await Promise.all([
    supabase
      .from("completions")
      .select("item_type, item_id, completion_date")
      .eq("user_id", user!.id)
      .gte("completion_date", weekStart)
      .lte("completion_date", today),
    supabase
      .from("day_reviews")
      .select("day_score, completed_at")
      .eq("user_id", user!.id)
      .eq("review_date", today)
      .maybeSingle(),
  ]);

  const doneSet = new Set(
    (weekComps ?? [])
      .filter((c) => c.completion_date === today)
      .map((c) => `${c.item_type}:${c.item_id}`),
  );
  const weekHabitCounts = new Map<string, number>();
  for (const c of weekComps ?? []) {
    if (c.item_type !== "habit") continue;
    weekHabitCounts.set(c.item_id, (weekHabitCounts.get(c.item_id) ?? 0) + 1);
  }

  const habits = (habitsRaw ?? [])
    .filter((h) => isHabitScheduledOn(h, today, weekHabitCounts.get(h.id) ?? 0))
    .map((h) => ({
      id: h.id,
      title: h.title,
      frequency_type: h.frequency_type,
      is_important: h.is_important,
      complete: doneSet.has(`habit:${h.id}`),
    }));

  const tasks = (tasksRaw ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    complete: doneSet.has(`task:${t.id}`),
  }));

  const reviewedScore = review?.completed_at ? Number(review.day_score) : null;

  return (
    <TodayClient
      weekday={formatWeekday(tz)}
      greeting={getGreeting(tz)}
      name={profile?.display_name ?? null}
      dateLabel={formatTodayLong(tz)}
      today={today}
      habits={habits}
      tasks={tasks}
      reviewedScore={reviewedScore}
    />
  );
}
