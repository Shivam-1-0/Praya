@AGENTS.md

# Praya

Multi-tenant habit + daily-task app. Next.js 16 (App Router, Turbopack) + Supabase + Vercel + Gemini API.
Reference plan: `~/.claude/plans/okay-this-sounds-right-hidden-dragonfly.md` (copy this into `docs/original-plan.md` if it isn't there yet — it's currently local-machine-only).
Full build history, every bug hit, and open product decisions: `HANDOFF.md` (read on demand, not auto-loaded).

## Before starting any task
Run `git log` and `git status` first. Don't assume a clean tree. Commit when a feature or fix is done — don't let uncommitted work pile up across sessions again.

## Rules that are load-bearing

**Next.js 16 renames:** `middleware.ts` → `src/proxy.ts`, exported function is `proxy` not `middleware`. `matcher` config export is unchanged.

**Two-layer route protection** — `PROTECTED_PREFIXES` in `src/lib/supabase/middleware.ts` (redirect UX) AND `(app)/layout.tsx`'s `getUser()` check (defense-in-depth). Both required. Don't remove either.

**Service-role key containment.** The service-role client bypasses RLS. It is used in EXACTLY three files, for narrow reasons that don't have a session to key off:
- `src/lib/automation/queries.ts` — external API-key requests have no Supabase session, so RLS can't apply. Every function in this file takes `userId` as its mandatory first parameter and every query filters explicitly on it. If you add a function here, you must do the same.
- `src/lib/automation/auth.ts` — the api_keys hash lookup itself has no user to scope by (it's *resolving* who the request belongs to).
- `src/lib/admin/queries.ts` — admin cross-user reads + `admin_audit_log` writes. Gated by `requireAdmin()` in `src/lib/admin/guard.ts`; every cross-user read audit-logs.

If you're tempted to use `getSupabaseServiceRole()` anywhere else, you're probably solving the wrong problem. Anon client + RLS is the answer for anything with a session.

**One shared completion action.** `src/lib/completions-actions.ts` → `toggleCompletion`. Today, Habits, and Tasks tabs all call it. Row existence = complete; toggling off deletes the row. Never write a second path — the original build's worst bug was state divergence between tabs.

**Timezone matters.** "Today" is computed in the user's stored `profiles.timezone`, never server UTC. See `src/lib/today.ts` and `src/lib/greeting.ts`.

**Automation API surface:** `/api/v1/*`, Bearer auth, read-only in v1. `/api/v1` is excluded from the proxy matcher (no session cookie). Path-versioned from day one.

**Supabase builders are thenables, not Promises.** `void supabase.from(...).update(...).eq(...)` does NOT execute the query. Use `.then(() => {}, () => {})` when you actually mean fire-and-forget.

**Always run `npm run build` before `git push`.** Turbopack dev is lenient about type narrowing that `next build` rejects. When prod looks stale, that's usually why — Vercel silently keeps the previous deploy.

**Base UI, not Radix.** `@base-ui/react`'s `Button` uses a `render` prop for polymorphism, not `asChild`. Pass `nativeButton={false}` when rendering it as a non-`<button>` element (e.g. `<Button render={<Link href="/login" />} nativeButton={false}>`), or it throws a console warning.

**Dev server doesn't persist between sessions.** "My app isn't opening" for local dev almost always means the dev server needs restarting, not a real bug — it's only alive while explicitly started. Prod is always live at `praya-black.vercel.app`; use it when you can, dev server only when you're actively editing.

**Turbopack can show stale/phantom errors after a refactor** (duplicate definitions that don't exist on disk, module-not-found after installing a package mid-session). Confirm with `tsc --noEmit` or a direct file read before trusting it — if confirmed stale, restart the dev server rather than debugging code that's already correct.

**n8n in Docker can't reach `localhost`.** Use `host.docker.internal:<port>` instead — `localhost` inside the container refers to the container itself.

**Important-habit limit is enforced at the DB level**, not just in the UI — a trigger (`enforce_important_habit_limit`) blocks a 4th active important habit. Don't try to work around it in application code.

## Current status (check before assuming something exists)

- **Built and tested end-to-end:** auth, Habits/Tasks CRUD + shared completions, End-of-Day Review + score snapshotting, automation API (4 endpoints), Reflections PDF export, Analytics (Phase 7), Veyla AI assistant (Phase 8), Admin surface (Phase 9), Reset/Start-Fresh + full JSON export (Phase 10 partial), habit reorder (up/down, `sort_order` live).
- **Deployed** at `https://praya-black.vercel.app` via Vercel↔GitHub (`Shivam-1-0/Praya`, pushes to `main` auto-deploy). Requires env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `GEMINI_API_KEY`. See HANDOFF §8.
- **Weekly habit frequency is settled** — it's an N-per-week quota (`target_count`). See HANDOFF §9.1.
- **Review edit window:** editable for 12 hours after the first submit, then permanently locked. Math in `src/lib/review-lock.ts` (runnable check alongside).
- **Still open (deliberately deferred):** rate limiting on `/api/v1/*` (§9.6, `@upstash/ratelimit` drop-in when abuse shows up). Every other §9 item is resolved.

## Stack cheatsheet

- `src/lib/supabase/server.ts` — `getSupabaseServer()` for Server Components, Route Handlers, Server Actions
- `src/lib/supabase/client.ts` — `getSupabaseBrowser()` for Client Components
- `src/lib/supabase/middleware.ts` — `updateSession()` used by `src/proxy.ts`
- `src/lib/supabase/service.ts` — service-role, restricted use (see above)
- Migrations live in `supabase/migrations/`, applied by pasting into Supabase SQL Editor
- Storage buckets: none currently. If you add one, keep it private + `<user_id>/*` path convention

## Compact instructions
When compacting, preserve: the specific task/bug currently being worked on, code changes made this session, and file paths touched. Drop general exploration and superseded plans.
