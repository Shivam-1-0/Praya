# Praya — Developer Handoff

Written for someone with zero context picking this up cold. Covers architecture, data model, what's built, what's not, every bug we hit, and every decision still open.

Reference docs: `CLAUDE.md` (load-bearing rules, read first), `~/.claude/plans/okay-this-sounds-right-hidden-dragonfly.md` (the original approved architecture plan this build follows).

---

## 1. What Praya is

A multi-tenant habit tracker + daily task manager with an execution-first loop: **Plan → Execute → Reflect → Review → Improve**. Rebuild of a prior personal app that broke repeatedly when built via Google AI Studio's app-generator. This rebuild is hand-written, not tool-generated.

Three deliberate scope changes from the original single-user brief:
1. **Multi-tenant SaaS** — built for many users, not one.
2. **Automation API** — external tools (n8n, etc.) can pull a user's own data via API key.
3. **"Obsidian Gold" visual theme** — dark, single-gold-accent, no light mode.

Notion/Calendar integrations are explicitly out of scope.

---

## 2. Stack & repo layout

- **Next.js 16** (App Router, Turbopack dev). **Important Next 16 rename**: middleware lives at `src/proxy.ts`, exported function is `proxy` not `middleware`. Don't "fix" this back to Next 15 convention.
- **Supabase**: Postgres + Auth (magic link) + RLS. No Storage buckets yet (nothing needs file upload).
- **Vercel**: NOT YET DEPLOYED. Everything so far has only run against `localhost:3001` + the real Supabase project. This is the single biggest gap — see §8.
- **Gemini API**: NOT YET WIRED. Zero integration exists. `GEMINI_API_KEY` isn't even in `.env.local`.
- Repo: `C:\Users\shiva\praya` (lowercase — npm package names can't have capital letters, this is cosmetic only, Windows is case-insensitive). Own git repo, sibling to `Internship Copilot`, fully independent — no shared Supabase project, no shared code.
- **shadcn/ui**: style `base-nova`, base color `neutral`. Component primitives come from **`@base-ui/react`, NOT Radix**. This matters: Base UI's `Button` uses a `render` prop for polymorphism, not `asChild`, and throws a console warning unless you also pass `nativeButton={false}` when rendering it as a non-`<button>` element (e.g. wrapping a `<Link>`). We hit this bug once already (see §7).
- **Styling**: Tailwind 4, CSS-variable theme in `src/app/globals.css`. Single `:root` block — no `.dark` class, no toggle. Deliberately dark-only.

### Git state — important
Praya's repo was `git init`'d early in the build and files were staged (`git add -A`) once, but **no commits have been made** across this entire build. A new developer will find either an empty history or one giant uncommitted diff, depending on what's in the working tree when they arrive. Check `git log` and `git status` first thing.

---

## 3. Data model

All tables in `public`, RLS enabled on every one, single migration file: `supabase/migrations/0001_init.sql`. **No Supabase CLI adopted** — schema changes are hand-pasted into Supabase's SQL Editor (the plan recommended adopting the CLI for versioned migrations; this never happened. If you add tables, either keep hand-pasting consistently or set up the CLI properly — don't half-adopt it).

| Table | Purpose | Notable columns / constraints |
|---|---|---|
| `profiles` | 1:1 with `auth.users` | `timezone` (critical — "today" is ALWAYS computed from this, never server UTC), `is_admin` (unused — no admin UI built yet), `display_name`. Auto-created via a Postgres trigger (`handle_new_user`) on `auth.users` insert. |
| `habits` | Recurring commitments | `frequency_type` (`daily`/`weekly`/`custom_days`), `custom_days smallint[]`, `is_important`, `archived_at` (soft delete, never hard-delete), `sort_order` (exists, populated with default `0`, **no reorder UI was ever built** — list order is `created_at`, not `sort_order`). A DB trigger (`enforce_important_habit_limit`) blocks a 4th active important habit at the database level — this can't be bypassed by any write path, UI or API. |
| `tasks` | One-off, date-specific | `due_date`, `priority` (`low`/`medium`/`high`, nullable), `archived_at`. |
| `completions` | Single source of truth for "done today" | `item_type` (`habit`/`task`) + `item_id` (polymorphic, no FK) + `completion_date`. **Row existence = complete.** No `is_complete` boolean — toggling off deletes the row. `unique(user_id, item_type, item_id, completion_date)` makes double-completion structurally impossible. |
| `day_reviews` | End-of-Day Review, one per user per day | `satisfaction_rating` (1–5), `reflection_text`, `day_score` (snapshotted numeric — NOT recomputed live once set, so historical scores can't shift if the formula changes later), `completed_at` (null = not yet reviewed). `unique(user_id, review_date)`. |
| `day_review_items` | Per-missed-item reason + valid/invalid | Denormalized `user_id` (not just via `day_review_id`) so RLS is a direct check, not a join — this table gets hit hard by anything doing miss-reason analytics. |
| `veyla_conversations` / `veyla_messages` | Chat history for the AI assistant | **Tables exist, completely unused.** Veyla (Phase 8) was never built. |
| `api_keys` | Automation API auth | `key_prefix` (plaintext, shown in UI), `key_hash` (SHA-256, unique-indexed — hot lookup path for every automation request), `scopes text[]` (only `read:today` used so far, forward-looking), `revoked_at` (soft-revoke). |
| `admin_audit_log` | For a future admin surface | RLS enabled with **zero policies** — only the service-role client can touch it. Table exists but nothing writes to it yet; no admin UI exists. |

**Indexes**: `habits(user_id, archived_at)`, `tasks(user_id, due_date)`, `completions(user_id, completion_date)`, `completions(user_id, item_type, item_id)`, `day_review_items(user_id, day_review_id)`, `api_keys(key_hash)` unique.

---

## 4. Auth & the service-role containment rule

Three Supabase client factories, ported from a sibling project (Internship Copilot) with the exact same pattern:
- `src/lib/supabase/server.ts` — `getSupabaseServer()`, for Server Components / Route Handlers / Server Actions.
- `src/lib/supabase/client.ts` — `getSupabaseBrowser()`, for Client Components.
- `src/lib/supabase/service.ts` — `getSupabaseServiceRole()`, **bypasses RLS entirely**.

**Two-layer route protection** — both required, neither removable:
1. `src/lib/supabase/middleware.ts` (`PROTECTED_PREFIXES` array) → redirect UX, runs via `src/proxy.ts`.
2. `(app)/layout.tsx` → server-side `getUser()` check, defense-in-depth.

Protected prefixes currently: `/today /habits /tasks /analytics /dashboard /review /profile /admin`. `/admin` is in the list but there's no `(admin)` route group behind it yet — it would just redirect to login like everything else, no `is_admin` gate exists in code.

`/api/v1/*` is deliberately **excluded** from the proxy matcher — it authenticates via Bearer token, not session cookie, so running the session-check middleware on it is wasted work.

**Service-role usage is restricted to exactly two files, on purpose:**
- `src/lib/automation/queries.ts` — every function takes `userId` as its mandatory first parameter and every query filters explicitly on it. This is the whole safety model for the automation API (external requests have no session for RLS to key off).
- `src/lib/automation/auth.ts` — the `api_keys` hash lookup itself has no user to scope by (it's *resolving* identity).

If you ever see `getSupabaseServiceRole()` imported anywhere else, that's a bug — RLS + the anon client is the correct pattern for anything with a session.

Magic-link flow: `src/app/login/page.tsx` + `actions.ts` (calls `signInWithOtp`) → `src/app/auth/callback/route.ts` (exchanges code) → redirect to `/today`. `src/app/logout/route.ts` clears session only, never touches data.

---

## 5. Core app logic — the parts that matter most

### Completion system (the thing the old app got wrong)
`src/lib/completions-actions.ts` → `toggleCompletion(itemType, itemId, date)`. **This is the only write path for completion state.** Today, Habits, and Tasks tabs all call this exact function. Because it's one code path with a DB-enforced unique constraint, the three surfaces cannot diverge — this was the original app's worst bug and the whole reason this function is centralized instead of reimplemented per screen.

### Timezone handling
`src/lib/today.ts` → `getTodayInTimezone(tz)` returns `YYYY-MM-DD` computed in the user's stored timezone via `Intl.DateTimeFormat('en-CA', {timeZone: tz})`. Timezone is captured client-side on first login (`TimezoneSync.tsx` detects `Intl.DateTimeFormat().resolvedOptions().timeZone` and calls a server action) and re-synced on every protected page load. **Never use server UTC for "today" anywhere** — this was flagged from the start as the way to avoid reintroducing the day-rollover version of the completion bug.

### Day score
`src/lib/day-score.ts` → `computeDayScore()`. Formula: 70% completion rate + 20% important-habit consistency + 10% satisfaction (satisfaction is `null`/excluded until a review is submitted). **One function, three consumers**: Today's live partial score, `/api/v1/day-score`, and the snapshot written to `day_reviews.day_score` at review submission. The snapshot is never recomputed after the fact — `/api/v1/day-score` returns the literal DB value once a review exists (`is_final: true`), and a live computation otherwise (`is_final: false`).

### Habit scheduling
`src/lib/habits.ts` exports two related functions with distinct roles — don't collapse them.
- `isHabitScheduledOn()` drives **visibility** (Today's card list). For `weekly`, it returns true until the ISO-week completion count hits `target_count`, so users can proactively check the habit off any day of the week.
- `countsTowardDayScore()` drives the **day-score denominator** (Dashboard, Review's missed list + score snapshot, `/api/v1/day-score`, `/api/v1/today` summary). For `weekly`, it uses the deferral-until-out-of-runway model — see §9.1.

---

## 6. Route map & what's built vs. stubbed

| Route | Status |
|---|---|
| `/` | Public landing, links to `/login`. |
| `/login`, `/auth/callback`, `/logout` | Fully built, tested end-to-end with a real magic-link click. |
| `(app)/today` | **Fully built.** Greeting, date, live progress meter, Habits/Tasks cards with working check/uncheck, "Reflect on today" CTA (or "Day closed" chip once reviewed). |
| `(app)/habits` | **Fully built.** Card grid, create/edit/archive/restore, frequency picker incl. custom-days toggle, max-3-important enforcement (client hint + DB trigger backstop), check/uncheck wired to the same shared action as Today. |
| `(app)/tasks` | **Fully built.** Today/Upcoming sections, "Show past tasks" toggle (past hidden by default, never affects score), create/edit/delete, priority chips, check/uncheck wired the same way. |
| `(app)/review` | **Fully built.** Per-missed-item reason + valid/invalid, 1–5 satisfaction picker, reflection textarea, submits via `submitReview` server action, snapshots the score. Editable same-day (re-submit overwrites). |
| `(app)/analytics` | **Fully built (Phase 7).** Window toggle (30/90/365d), overall completion rate, important-habit consistency, invalid-miss count, avg day-score, day-score trend bars, per-habit table with current + longest streak, windowed rate, and invalid-miss chip. Streak/rate math lives in `src/lib/analytics.ts` with a runnable check at `src/lib/analytics.check.ts` (`npx tsx src/lib/analytics.check.ts`). Streak rules: valid-reason misses still break the streak (invalid-miss-count is the separate metric); custom_days non-scheduled days are transparent; today (or the current ISO week for weekly habits) is treated as "open" and doesn't break the streak until the period closes. |
| `(app)/dashboard` | **Built, added mid-session at user request as the 5th nav tab.** Stat tiles (today's completion %, active habits, tasks today, important-habits x/3) + a 7-day bar chart + a reflection-preview slot. **Overlaps conceptually with Analytics** — the two were never explicitly reconciled against the original plan's separate definitions. Worth a product decision on whether to merge or clearly differentiate them. |
| `(app)/profile` | **Built.** Account info (email/name/timezone), **Reflections PDF export** (see below), API key management (create/revoke, one-time raw-key reveal), sign out. |
| `(admin)/*` | **Not built at all.** `is_admin` column and `admin_audit_log` table exist; no route group, no gating, no UI. |
| `/api/v1/today`, `/day-score`, `/habits`, `/tasks` | **Fully built and tested end-to-end**, including a real n8n HTTP Request node hitting it through Docker (`host.docker.internal`). Bearer auth, read-only, path-versioned. |

### Reflections PDF export
`src/app/(app)/profile/ReflectionsExport.tsx` — client-side PDF generation via `jspdf` (lazy-imported so it doesn't bloat the initial bundle), deliberately client-side to avoid the exact Vercel-serverless-bundle class of problem that bit a sibling project's PDF *parsing* code. Pulls every completed `day_reviews` row up through today plus their `day_review_items`, joined against habit/task titles (orphaned items — parent habit/task later deleted — are silently skipped, not shown as blank).

**Note**: this is narrower than what the original plan specified for data export. The plan's "My Profile & data management" section calls for a **mandatory PDF export gating a full account Reset/Start Fresh flow** (wipe habits/tasks/completions/reviews/etc., keep the account). That Reset flow — and a general JSON export of *all* data, not just reflections — **was never built**. Only this reflections-specific PDF exists.

---

## 7. Every real bug hit during this build (and the fix)

1. **npm package naming** — `create-next-app` rejects capital letters in the project name. Folder is `praya` not `Praya`. Cosmetic, Windows path resolution is case-insensitive anyway.
2. **Font variable naming mismatch** — `create-next-app`'s scaffolded `layout.tsx` named the Geist font CSS variable `--font-geist-sans`, but shadcn's `base-nova` theme template expected `--font-sans`. Silently fell back to Times New Roman. Fixed by renaming at the source (`layout.tsx`), not patching around it in `globals.css`.
3. **Base UI's `Button` doesn't support `asChild`** (that's a Radix pattern). It uses a `render` prop instead, and needs `nativeButton={false}` explicitly set when the rendered element isn't a real `<button>` (e.g. `<Button render={<Link href="/login" />} nativeButton={false}>`). Two separate console errors, both real, both fixed.
4. **Dev-server module-resolution caching** — installing `@supabase/ssr` via npm *while the dev server was already running* left it permanently reporting "module not found" until a full server **restart** (a browser reload alone doesn't re-trigger Turbopack's dependency graph for packages that didn't exist at boot).
5. **Preview-tool launch config scoping** — the preview tool reads `.claude/launch.json` from the Claude Code *session's root directory*, not from an arbitrary project folder. Early on this caused the preview tool to silently launch the wrong app (Internship Copilot's dev server) when asked to preview Praya. Fixed by adding a `praya-dev` config to the session root's own `launch.json`, using `npm --prefix <path-to-praya>` to target the right directory, on port 3001 (Internship Copilot uses 3000).
6. **Sandboxed preview browser cannot hold a real Supabase session** — confirmed repeatedly: cross-origin PKCE code exchange silently fails in the automated browser, magic-link tokens are single-use so any replay/retry fails by design, and cookie propagation across a cross-origin redirect chain doesn't behave the same as a real browser. This is a **testing-infrastructure limitation, not an app bug** — verification for authed screens relied on TypeScript, direct DOM/accessibility-tree inspection, curl against real endpoints with service-role-seeded data, and the user's own browser for actual interaction testing.
7. **Supabase JS query builders are thenables, not native Promises** — `void supabase.from('api_keys').update(...)` does **not** execute the query. Silent no-op. Caught because `last_used_at` wasn't updating on API key use. Fixed with `.then(() => {}, () => {})` to actually trigger execution as fire-and-forget.
8. **A real TypeScript bug the dev server hid** — `TaskForm.tsx`'s local `priority` state type allowed `null`, but the server action's input type didn't. Compiled fine under Turbopack dev, would have hard-failed `next build`. This is exactly the dev/prod gap the project's `CLAUDE.md` warns about — **always run a full typecheck (or `npm run build`) before trusting a change, dev server output is not sufficient proof.**
9. **Stale Turbopack module-cache false alarm** — after a refactor, the dev server kept reporting a duplicate `CheckToggle` definition that didn't exist on disk (confirmed via direct file read + `tsc --noEmit` passing clean). Root cause: Turbopack's cache from mid-edit, unrelated to the file that was actually being previewed. Resolved by restarting the dev server.
10. **n8n + Docker Desktop networking** — `localhost` inside a Docker container refers to the container itself, not the Windows host. n8n running via Docker Desktop couldn't reach `localhost:3001`; fixed by using Docker's special hostname `host.docker.internal:3001` instead.
11. **Dev server dies between Claude Code sessions** — recurred multiple times ("my app isn't opening"). The local dev server is only alive while explicitly started within an active tool session; it doesn't persist independently. Not a Praya bug — the actual fix is deploying to Vercel (§8), which hasn't happened yet.

---

## 8. Deployment — DONE

**Live at `https://praya-black.vercel.app`.** GitHub repo: `Shivam-1-0/Praya`, deployed via Vercel's GitHub integration (pushes to `main` auto-deploy). Magic-link auth verified end-to-end against the prod domain.

Env vars set on Vercel (Production + Preview):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Sensitive)
- `NEXT_PUBLIC_SITE_URL=https://praya-black.vercel.app` — pinned so login redirects use the stable domain, not the per-deploy `VERCEL_URL`. `src/lib/site-url.ts` prefers this env var first.

Supabase Auth → URL Configuration:
- Site URL: `https://praya-black.vercel.app`
- Redirect URLs allowlist includes `https://praya-black.vercel.app/auth/callback` and `https://praya-black.vercel.app/**`.

Still-outstanding for future phases:
- `GEMINI_API_KEY` — not set anywhere yet, add when Phase 8 Veyla lands.
- Custom domain — currently on the `*.vercel.app` alias only.

Deploy gotchas we hit (documented in case they recur):
- **Env var names are case- and prefix-sensitive.** Custom-cased names like `Supabase_URL` don't work — the code reads exact `process.env.NEXT_PUBLIC_SUPABASE_URL` etc. Vercel doesn't let you rename an existing var, you have to delete and re-add.
- **Supabase Site URL controls magic-link redirects.** Leaving it at `localhost:3000` after deploying to prod causes the email link to redirect to localhost. Update it whenever the prod domain changes.

---

## 9. Open product decisions — genuinely unresolved, need a call

1. **Weekly habit semantics — RESOLVED.** Two commits:
   - `8a61335` defined weekly as an **N-per-week quota** (`habits.target_count`, 1–7, default 1). `isHabitScheduledOn()` returns false once the ISO-week completion count hits the target, so completed weekly habits drop off Today's card list, Review's missed list, Dashboard's visible items, and the automation snapshot's `habits[]`.
   - Follow-up commit resolved the two gaps left open by 8a61335:
     - **Per-day score denominator** no longer overcounts a weekly habit across every day it's still "due" before quota is hit. Introduced `countsTowardDayScore()` in `src/lib/habits.ts` and swapped all four denominator sites (Dashboard, Review's snapshot action, Review's missed-list filter, `getTodaySnapshot`/`getDayScore` in the automation layer).
     - **Review UI** now distinguishes "already hit weekly target" from "archived" via a "This week's wins" chip strip in `ReviewClient` — archived habits stay silently excluded (SQL filter), quota-met weekly habits get a positive callout.

   **Design decision — deferral-until-out-of-runway model.** A weekly habit contributes to today's day-score denominator only if:
   - it was completed today (1/1), OR
   - it wasn't completed today AND `days_left_in_week_including_today <= target_remaining_before_today` (0/1 — the runway has closed).

   Otherwise it contributes 0/0 — the day still has time to absorb the quota, so a skip today isn't a miss yet.

   **Observable consequence:** an ignored 3×/week habit produces **no score drag** on Mon–Thu; the first miss lands Friday (3 days left = 3 needed), followed by Sat and Sun. Net effect over a fully-untouched week: exactly 3 misses in the denominator, matching the quota. This is intentional — deferral is legal in a weekly quota, and the score should reflect that. If a future product call wants heavier accountability (score drag from day 1), the alternative is fractional weighting (`target/7` per day); the swap point is a single function, `countsTowardDayScore()`.

   Runnable check for the math: `npx tsx src/lib/habits.check.ts`.
2. **Same-day review edit vs. permanent lock.** Currently editable same-day (upsert + item replace). Never explicitly confirmed with the user — the original plan raised this as an open question and it defaulted to "editable" without a decision being made.
3. **Analytics vs. Dashboard split — RESOLVED.** Dashboard is at-a-glance (today's completion %, active-habit count, current week bar chart, latest reflection). Analytics is deep metrics (windowed rate, important-habit consistency, per-habit streaks + invalid-miss count, day-score trend). Bar charts are the only visual overlap — Dashboard shows 7 days of raw completion volume, Analytics shows 30/90/365d of scored review outcomes, and they answer different questions. No further reconciliation needed.
4. **Reset/Start Fresh + full JSON export — RESOLVED.** Both built. Profile page's Danger Zone section (`src/app/(app)/profile/AccountReset.tsx`) gates the wipe behind: (1) reflections PDF download, (2) full JSON download (`exportAccountData` in `src/lib/reset-actions.ts` dumps every user-owned row from profiles/habits/tasks/completions/day_reviews/day_review_items/veyla_*/api_keys metadata), (3) typing "RESET". PDF is auto-skippable when there are no completed reviews. Wipe (`resetAccountData`) runs children-first delete under RLS, keeps the profile row. PDF generation extracted to `reflections-pdf.ts` so both the standalone export and the reset flow share it.
5. **Habit reordering** — `sort_order` column exists and is dormant. No drag-and-drop UI. List order is currently `created_at`.
6. **Rate limiting on `/api/v1/*`** — deliberately deferred per plan. `@upstash/ratelimit` is the noted drop-in if abuse ever shows up. Not urgent pre-launch given expected traffic.
7. **Admin surface** — entirely unbuilt. `is_admin` currently has no way to be set except raw SQL, and no code checks it anywhere.

---

## 10. What's next per the original plan (unbuilt phases)

- ~~**Phase 7: Analytics**~~ — **DONE.** Completion rate (windowed), important-habit consistency, invalid-miss-count, per-habit streaks (current + longest), day-score trend. See §6 for the route entry and `src/lib/analytics.ts` for the math (runnable check: `src/lib/analytics.check.ts`).
- ~~**Phase 8: Veyla**~~ — **DONE (code side).** `@google/genai` singleton in `src/lib/veyla.ts` with `gemini-2.5-flash`, static `APP_KNOWLEDGE` + `VEYLA_SYSTEM_PROMPT` (hard "say I'm not sure" rules), and a `getVeylaSnapshot()` that pulls the user's live state (today's habits/tasks with done-flags, active-habit count, important-habit count, today's completion %, last 14 day-scores) via anon client + RLS. Server actions in `src/lib/veyla-actions.ts` — `loadVeylaThread` (most-recent convo + messages), `sendVeylaMessage` (create-or-append convo, save user msg, call Gemini with history + snapshot + system prompt, save assistant msg), `resetVeylaThread`. `VeylaFab.tsx` is now a real chat panel — auto-loads recent thread on open, optimistic user bubble, pending dots, clear-conversation button. **Requires `GEMINI_API_KEY` env var on Vercel + local `.env.local`** — code throws a clear error until set.
- **Phase 9: Admin surface** — `(admin)` route group, `is_admin` gating, audit log writes, minimal usage stats + per-user lookup.
- ~~**Phase 10 (partial): Reset/Start Fresh + full JSON export**~~ — **DONE.** See §9.4 for the resolved entry. Wired into the Profile page's Danger Zone.
- ~~**Deployment**~~ — **DONE.** See §8.
