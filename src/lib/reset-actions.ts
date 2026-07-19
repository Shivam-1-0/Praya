"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";

// Full JSON dump of everything owned by the current user. Used by the
// mandatory pre-reset export. api_keys is metadata-only — the hashed key
// itself is never returned because the raw key was one-time-reveal on create
// and the hash is useless to the exporter.
export async function exportAccountData() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const [
    profile,
    habits,
    tasks,
    completions,
    reviews,
    reviewItems,
    veylaConversations,
    veylaMessages,
    apiKeys,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).single(),
    supabase.from("habits").select("*").eq("user_id", user.id),
    supabase.from("tasks").select("*").eq("user_id", user.id),
    supabase.from("completions").select("*").eq("user_id", user.id),
    supabase.from("day_reviews").select("*").eq("user_id", user.id),
    supabase.from("day_review_items").select("*").eq("user_id", user.id),
    supabase.from("veyla_conversations").select("*").eq("user_id", user.id),
    supabase.from("veyla_messages").select("*").eq("user_id", user.id),
    supabase
      .from("api_keys")
      .select("id, name, key_prefix, last_used_at, created_at, revoked_at")
      .eq("user_id", user.id),
  ]);

  return {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    email: user.email,
    profile: profile.data,
    habits: habits.data ?? [],
    tasks: tasks.data ?? [],
    completions: completions.data ?? [],
    day_reviews: reviews.data ?? [],
    day_review_items: reviewItems.data ?? [],
    veyla_conversations: veylaConversations.data ?? [],
    veyla_messages: veylaMessages.data ?? [],
    api_keys: apiKeys.data ?? [],
  };
}

// Wipe everything the user owns except the profile row (which keeps their
// account alive). Children first so we're safe whether or not FKs cascade.
// Runs under RLS as the user — each delete filters explicitly on user_id.
export async function resetAccountData() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase.from("day_review_items").delete().eq("user_id", user.id);
  await supabase.from("day_reviews").delete().eq("user_id", user.id);
  await supabase.from("completions").delete().eq("user_id", user.id);
  await supabase.from("veyla_messages").delete().eq("user_id", user.id);
  await supabase.from("veyla_conversations").delete().eq("user_id", user.id);
  await supabase.from("habits").delete().eq("user_id", user.id);
  await supabase.from("tasks").delete().eq("user_id", user.id);
  await supabase.from("api_keys").delete().eq("user_id", user.id);

  revalidatePath("/", "layout");
}
