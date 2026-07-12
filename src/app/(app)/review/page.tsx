import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getTodayInTimezone } from "@/lib/today";
import { isHabitScheduledOn } from "@/lib/habits";
import { PageHeader } from "@/components/PageHeader";
import { ReviewClient, type MissedItem } from "./ReviewClient";

export default async function ReviewPage() {
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

  const [{ data: habits }, { data: tasks }, { data: comps }, { data: existing }] = await Promise.all([
    supabase
      .from("habits")
      .select("id, title, frequency_type, custom_days, is_important")
      .eq("user_id", user!.id)
      .is("archived_at", null),
    supabase
      .from("tasks")
      .select("id, title")
      .eq("user_id", user!.id)
      .is("archived_at", null)
      .eq("due_date", today),
    supabase
      .from("completions")
      .select("item_type, item_id")
      .eq("user_id", user!.id)
      .eq("completion_date", today),
    supabase
      .from("day_reviews")
      .select("satisfaction_rating, reflection_text")
      .eq("user_id", user!.id)
      .eq("review_date", today)
      .maybeSingle(),
  ]);

  const done = new Set((comps ?? []).map((c) => `${c.item_type}:${c.item_id}`));

  const missedItems: MissedItem[] = [];
  for (const h of habits ?? []) {
    if (!isHabitScheduledOn(h, today)) continue;
    if (done.has(`habit:${h.id}`)) continue;
    missedItems.push({ item_type: "habit", item_id: h.id, title: h.title });
  }
  for (const t of tasks ?? []) {
    if (done.has(`task:${t.id}`)) continue;
    missedItems.push({ item_type: "task", item_id: t.id, title: t.title });
  }

  return (
    <div className="space-y-8">
      <Link
        href="/today"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft size={14} /> Back to today
      </Link>

      <PageHeader
        eyebrow="End of day"
        title="Reflect"
        subtitle="Close the day honestly. The score locks once you submit."
      />

      <ReviewClient
        missedItems={missedItems}
        initialSatisfaction={existing?.satisfaction_rating ?? null}
        initialReflection={existing?.reflection_text ?? ""}
      />
    </div>
  );
}
