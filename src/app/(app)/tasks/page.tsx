import { getSupabaseServer } from "@/lib/supabase/server";
import { getTodayInTimezone } from "@/lib/today";
import { PageHeader } from "@/components/PageHeader";
import { TasksClient } from "./TasksClient";

export default async function TasksPage() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("user_id", user!.id)
    .single();

  const today = getTodayInTimezone(profile?.timezone ?? "UTC");

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, description, due_date, priority")
    .eq("user_id", user!.id)
    .is("archived_at", null)
    .order("due_date", { ascending: true });

  const { data: comps } = await supabase
    .from("completions")
    .select("item_id, completion_date")
    .eq("user_id", user!.id)
    .eq("item_type", "task");

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
