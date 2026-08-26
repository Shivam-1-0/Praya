import { getSessionUser } from "@/lib/session";
import { getTodayInTimezone } from "@/lib/today";
import { PageHeader } from "@/components/PageHeader";
import { TasksClient } from "./TasksClient";

export default async function TasksPage() {
  const { supabase, user, timezone } = await getSessionUser();
  const today = getTodayInTimezone(timezone);

  const [{ data: tasks }, { data: comps }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, description, due_date, priority")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("due_date", { ascending: true }),
    supabase
      .from("completions")
      .select("item_id, completion_date")
      .eq("user_id", user.id)
      .eq("item_type", "task"),
  ]);

  // A task is complete when a completion exists on its own due date.
  const doneSet = new Set((comps ?? []).map((c) => `${c.item_id}:${c.completion_date}`));
  const withDone = (tasks ?? []).map((t) => ({
    ...t,
    complete: doneSet.has(`${t.id}:${t.due_date}`),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Your tasks"
        title="Tasks"
        subtitle="One-off items for a specific day."
      />
      <TasksClient tasks={withDone} today={today} />
    </div>
  );
}
