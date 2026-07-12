import { getSupabaseServer } from "@/lib/supabase/server";
import { getTodayInTimezone } from "@/lib/today";
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

  const { data: habitsRaw } = await supabase
    .from("habits")
    .select("id, title, frequency_type, custom_days, is_important")
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

  const [{ data: comps }, { data: review }] = await Promise.all([
    supabase
      .from("completions")
      .select("item_type, item_id")
      .eq("user_id", user!.id)
      .eq("completion_date", today),
    supabase
      .from("day_reviews")
      .select("day_score, completed_at")
      .eq("user_id", user!.id)
      .eq("review_date", today)
      .maybeSingle(),
  ]);

  const doneSet = new Set((comps ?? []).map((c) => `${c.item_type}:${c.item_id}`));

  const habits = (habitsRaw ?? [])
    .filter((h) => isHabitScheduledOn(h, today))
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
