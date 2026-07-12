"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";

type ActionResult = { error?: string };

type HabitInput = {
  title: string;
  description: string;
  frequencyType: "daily" | "weekly" | "custom_days";
  customDays: number[];
  targetCount: number;
  isImportant: boolean;
};

function normalizeTargetCount(frequencyType: HabitInput["frequencyType"], raw: number): number {
  if (frequencyType !== "weekly") return 1;
  const n = Math.floor(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.min(7, Math.max(1, n));
}

function importantLimitError(message: string) {
  return message.includes("Cannot have more than 3 active important habits")
    ? "You already have 3 important habits. Unmark one first."
    : message;
}

export async function createHabit(input: HabitInput): Promise<ActionResult> {
  const title = input.title.trim();
  if (!title) return { error: "Title is required." };

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("habits").insert({
    user_id: user.id,
    title,
    description: input.description.trim() || null,
    frequency_type: input.frequencyType,
    custom_days: input.frequencyType === "custom_days" ? input.customDays : null,
    target_count: normalizeTargetCount(input.frequencyType, input.targetCount),
    is_important: input.isImportant,
  });

  if (error) return { error: importantLimitError(error.message) };

  revalidatePath("/habits");
  return {};
}

export async function updateHabit(id: string, input: HabitInput): Promise<ActionResult> {
  const title = input.title.trim();
  if (!title) return { error: "Title is required." };

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("habits")
    .update({
      title,
      description: input.description.trim() || null,
      frequency_type: input.frequencyType,
      custom_days: input.frequencyType === "custom_days" ? input.customDays : null,
      target_count: normalizeTargetCount(input.frequencyType, input.targetCount),
      is_important: input.isImportant,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: importantLimitError(error.message) };

  revalidatePath("/habits");
  return {};
}

export async function archiveHabit(id: string): Promise<ActionResult> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("habits")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/habits");
  return {};
}

export async function restoreHabit(id: string): Promise<ActionResult> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("habits")
    .update({ archived_at: null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: importantLimitError(error.message) };
  revalidatePath("/habits");
  return {};
}
