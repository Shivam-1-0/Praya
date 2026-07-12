import { createHash, randomBytes } from "node:crypto";
import { getSupabaseServiceRole } from "@/lib/supabase/service";

// Praya's automation API keys are high-entropy random tokens, not user-chosen
// passwords, so SHA-256 is sufficient (bcrypt/argon2 would be over-engineering).
// The threat model is "don't store the raw secret," not "resist guessing weak input."

const KEY_PREFIX = "pk_praya_";

export function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateKey(): { raw: string; prefix: string; hash: string } {
  const raw = KEY_PREFIX + randomBytes(24).toString("hex");
  return { raw, prefix: raw.slice(0, 16), hash: hashKey(raw) };
}

export type ResolvedKey = { userId: string; keyId: string };

export async function resolveApiKey(request: Request): Promise<ResolvedKey | null> {
  const auth = request.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(pk_praya_[A-Za-z0-9]+)$/);
  if (!match) return null;

  const supabase = getSupabaseServiceRole();
  const { data } = await supabase
    .from("api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", hashKey(match[1]))
    .maybeSingle();

  if (!data || data.revoked_at) return null;

  // Fire-and-forget touch. Supabase builders are thenables (not native Promises),
  // so `void` alone doesn't trigger execution — attach a .then() to actually fire.
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {}, () => {});

  return { userId: data.user_id, keyId: data.id };
}
