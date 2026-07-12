"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import { generateKey } from "@/lib/automation/auth";

type CreateResult = { rawKey?: string; prefix?: string; name?: string; error?: string };

export async function createApiKey(name: string): Promise<CreateResult> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required." };

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { raw, prefix, hash } = generateKey();

  const { error } = await supabase.from("api_keys").insert({
    user_id: user.id,
    name: trimmed,
    key_prefix: prefix,
    key_hash: hash,
  });

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { rawKey: raw, prefix, name: trimmed };
}

export async function revokeApiKey(id: string): Promise<{ error?: string }> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return {};
}
