"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";

// The single write path for completion state, shared by Today / Habits / Tasks.
// Row existence = complete; toggling off deletes the row. One code path means
// the surfaces cannot diverge (the original build's worst bug).
export async function toggleCompletion(
  itemType: "habit" | "task",
  itemId: string,
  date: string,
): Promise<{ complete: boolean; error?: string }> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { complete: false, error: "Not signed in." };

  const { data: existing } = await supabase
    .from("completions")
    .select("id")
    .eq("user_id", user.id)
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .eq("completion_date", date)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("completions").delete().eq("id", existing.id);
    if (error) return { complete: true, error: error.message };
    revalidatePath("/today");
    return { complete: false };
  }

  const { error } = await supabase.from("completions").insert({
    user_id: user.id,
    item_type: itemType,
    item_id: itemId,
    completion_date: date,
  });
  if (error) return { complete: false, error: error.message };
  revalidatePath("/today");
  return { complete: true };
}
