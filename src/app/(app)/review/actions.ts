"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getTodayInTimezone, getWeekStart, getWeekEnd } from "@/lib/today";
import { countsTowardDayScore } from "@/lib/habits";
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
  const weekStart = getWeekStart(today);

  // Fresh count of today's items + completions to snapshot the score against.
  const [{ data: habits }, { data: tasks }, { data: weekComps }] = await Promise.all([
    supabase
      .from("habits")
      .select("id, frequency_type, custom_days, target_count, is_important")
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
      .select("item_type, item_id, completion_date")
      .eq("user_id", user.id)
      .gte("completion_date", weekStart)
      .lte("completion_date", today),
  ]);

  const done = new Set(
    (weekComps ?? [])
      .filter((c) => c.completion_date === today)
      .map((c) => `${c.item_type}:${c.item_id}`),
  );
  const habitCountBeforeToday = new Map<string, number>();
  for (const c of weekComps ?? []) {
    if (c.item_type !== "habit") continue;
    if (c.completion_date < today) {
      habitCountBeforeToday.set(c.item_id, (habitCountBeforeToday.get(c.item_id) ?? 0) + 1);
    }
  }
  const weekEnd = getWeekEnd(today);
  let totalItems = tasks?.length ?? 0;
  let completedItems = (tasks ?? []).filter((t) => done.has(`task:${t.id}`)).length;
  let importantTotal = 0;
  let importantCompleted = 0;
  for (const h of habits ?? []) {
    const c = countsTowardDayScore(
      h,
      today,
      habitCountBeforeToday.get(h.id) ?? 0,
      done.has(`habit:${h.id}`),
      weekEnd,
    );
    if (c === "not_counted") continue;
    totalItems += 1;
    if (c === "complete") completedItems += 1;
    if (h.is_important) {
      importantTotal += 1;
      if (c === "complete") importantCompleted += 1;
    }
  }

  const snapshot = computeDayScore({
    totalItems,
    completedItems,
    importantTotal,
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
