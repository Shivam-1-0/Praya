@AGENTS.md

# Praya

Multi-tenant habit + daily-task app. Next.js 16 (App Router, Turbopack) + Supabase + Vercel + Gemini API.
Reference plan: `~/.claude/plans/okay-this-sounds-right-hidden-dragonfly.md`.

## Rules that are load-bearing

**Next.js 16 renames:** `middleware.ts` → `src/proxy.ts`, exported function is `proxy` not `middleware`. `matcher` config export is unchanged.

**Two-layer route protection** — `PROTECTED_PREFIXES` in `src/lib/supabase/middleware.ts` (redirect UX) AND `(app)/layout.tsx`'s `getUser()` check (defense-in-depth). Both required. Don't remove either.

**Service-role key containment.** The service-role client bypasses RLS. It is used in EXACTLY two files, for narrow reasons that don't have a session to key off:
- `src/lib/automation/queries.ts` — external API-key requests have no Supabase session, so RLS can't apply. Every function in this file takes `userId` as its mandatory first parameter and every query filters explicitly on it. If you add a function here, you must do the same.
- `src/lib/automation/auth.ts` — the api_keys hash lookup itself has no user to scope by (it's *resolving* who the request belongs to).

If you're tempted to use `getSupabaseServiceRole()` anywhere else, you're probably solving the wrong problem. Anon client + RLS is the answer for anything with a session.

**One shared completion action.** `src/lib/completions-actions.ts` → `toggleCompletion`. Today, Habits, and Tasks tabs all call it. Row existence = complete; toggling off deletes the row. Never write a second path — the original build's worst bug was state divergence between tabs.

**Timezone matters.** "Today" is computed in the user's stored `profiles.timezone`, never server UTC. See `src/lib/today.ts` and `src/lib/greeting.ts`.

**Automation API surface:** `/api/v1/*`, Bearer auth, read-only in v1. `/api/v1` is excluded from the proxy matcher (no session cookie). Path-versioned from day one.

**Supabase builders are thenables, not Promises.** `void supabase.from(...).update(...).eq(...)` does NOT execute the query. Use `.then(() => {}, () => {})` when you actually mean fire-and-forget.

**Always run `npm run build` before `git push`.** Turbopack dev is lenient about type narrowing that `next build` rejects. When prod looks stale, that's usually why — Vercel silently keeps the previous deploy.

## Stack cheatsheet

- `src/lib/supabase/server.ts` — `getSupabaseServer()` for Server Components, Route Handlers, Server Actions
- `src/lib/supabase/client.ts` — `getSupabaseBrowser()` for Client Components
- `src/lib/supabase/middleware.ts` — `updateSession()` used by `src/proxy.ts`
- `src/lib/supabase/service.ts` — service-role, restricted use (see above)
- Migrations live in `supabase/migrations/`, applied by pasting into Supabase SQL Editor
- Storage buckets: none currently. If you add one, keep it private + `<user_id>/*` path convention
