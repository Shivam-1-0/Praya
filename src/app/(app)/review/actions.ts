"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getTodayInTimezone } from "@/lib/today";
import { isHabitScheduledOn } from "@/lib/habits";
import { computeDayScore } from "@/lib/day-score";

type MissedItemInput = {
  itemType: "habit" | "task";
  itemId: string;
  reasonText: string;
  isValid: boolean | null;
};

type SubmitReviewInput = {
  satisfactionRating: number; // 1..5
  reflectionText: string;
  missed: MissedItemInput[];
};

// Snapshots the score at submission time so historical days never shift when
// the formula changes. Wipes any previous per-item rows for this day + inserts
// the fresh set so re-submitting mid-day is safe.
export async function submitReview(input: SubmitReviewInput) {
  if (input.satisfactionRating < 1 || input.satisfactionRating > 5) {
    return { error: "Satisfaction rating must be between 1 and 5." };
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("user_id", user.id)
    .single();
  const today = getTodayInTimezone(profile?.timezone ?? "UTC");

  // Fresh count of today's items + completions to snapshot the score against.
  const [{ data: habits }, { data: tasks }, { data: comps }] = await Promise.all([
    supabase
      .from("habits")
      .select("id, frequency_type, custom_days, is_important")
      .eq("user_id", user.id)
      .is("archived_at", null),
    supabase
      .from("tasks")
      .select("id")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .eq("due_date", today),
    supabase
      .from("completions")
      .select("item_type, item_id")
      .eq("user_id", user.id)
      .eq("completion_date", today),
  ]);

  const done = new Set((comps ?? []).map((c) => `${c.item_type}:${c.item_id}`));
  const scheduledHabits = (habits ?? []).filter((h) => isHabitScheduledOn(h, today));
  const totalItems = scheduledHabits.length + (tasks?.length ?? 0);
  const completedItems =
    scheduledHabits.filter((h) => done.has(`habit:${h.id}`)).length +
    (tasks ?? []).filter((t) => done.has(`task:${t.id}`)).length;
  const importantHabits = scheduledHabits.filter((h) => h.is_important);
  const importantCompleted = importantHabits.filter((h) => done.has(`habit:${h.id}`)).length;

  const snapshot = computeDayScore({
    totalItems,
    completedItems,
    importantTotal: importantHabits.length,
    importantCompleted,
    satisfactionRating: input.satisfactionRating,
  });

  const now = new Date().toISOString();

  // Upsert the day_reviews row.
  const { data: review, error: reviewError } = await supabase
    .from("day_reviews")
    .upsert(
      {
        user_id: user.id,
        review_date: today,
        satisfaction_rating: input.satisfactionRating,
        reflection_text: input.reflectionText.trim() || null,
        day_score: snapshot.score,
        completed_at: now,
      },
      { onConflict: "user_id,review_date" },
    )
    .select("id")
    .single();

  if (reviewError) return { error: reviewError.message };

  // Replace per-item rows for this day (re-submitting is fine).
  await supabase.from("day_review_items").delete().eq("day_review_id", review.id);

  const validRows = input.missed.filter((m) => m.reasonText.trim() || m.isValid != null);
  if (validRows.length > 0) {
    const { error: itemsError } = await supabase.from("day_review_items").insert(
      validRows.map((m) => ({
        day_review_id: review.id,
        user_id: user.id,
        item_type: m.itemType,
        item_id: m.itemId,
        reason_text: m.reasonText.trim() || null,
        is_valid: m.isValid,
      })),
    );
    if (itemsError) return { error: itemsError.message };
  }

  revalidatePath("/today");
  revalidatePath("/review");
  redirect("/today");
}
