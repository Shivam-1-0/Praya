import { createClient } from "@supabase/supabase-js";

// BYPASSES RLS. Do NOT import this from route handlers, server components,
// or server actions. It is only used by:
//   - src/lib/automation/queries.ts (external API-key requests have no session)
//   - src/lib/automation/auth.ts   (api_keys lookup has no user_id to scope by)
//   - src/lib/admin/queries.ts     (admin cross-user reads + audit_log writes)
// If you're tempted to use it anywhere else, you're solving the wrong problem —
// the anon client + RLS is the right answer for anything with a session.
export function getSupabaseServiceRole() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
