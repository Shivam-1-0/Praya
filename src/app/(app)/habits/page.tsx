import { getSessionUser } from "@/lib/session";
import { getTodayInTimezone } from "@/lib/today";
import { PageHeader } from "@/components/PageHeader";
import { HabitsClient } from "./HabitsClient";

export default async function HabitsPage() {
  const { supabase, user, timezone } = await getSessionUser();
  const today = getTodayInTimezone(timezone);

  const [{ data: habits }, { data: comps }] = await Promise.all([
    supabase
      .from("habits")
      .select("id, title, description, frequency_type, custom_days, target_count, is_important, archived_at")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("completions")
      .select("item_id")
      .eq("user_id", user.id)
      .eq("item_type", "habit")
      .eq("completion_date", today),
  ]);

  const doneSet = new Set((comps ?? []).map((c) => c.item_id));

  const activeHabits = (habits ?? [])
    .filter((h) => !h.archived_at)
    .map((h) => ({ ...h, complete: doneSet.has(h.id) }));
  const archivedHabits = (habits ?? []).filter((h) => h.archived_at);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Your habits"
        title="Habits"
        subtitle="Foundations you build one day at a time."
      />
      <HabitsClient activeHabits={activeHabits} archivedHabits={archivedHabits} today={today} />
    </div>
  );
}
