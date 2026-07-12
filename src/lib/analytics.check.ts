// Runnable check for analytics streak + rate math. `npx tsx src/lib/analytics.check.ts`.
import assert from "node:assert";
import { computeStreaks, computeCompletionCounts, type AnalyticsHabit } from "./analytics";

const created = "2026-06-01T00:00:00Z";

function daily(id = "d"): AnalyticsHabit {
  return {
    id,
    title: "d",
    is_important: false,
    created_at: created,
    frequency_type: "daily",
    custom_days: null,
    target_count: 1,
  };
}
function custom(days: number[]): AnalyticsHabit {
  return {
    id: "c",
    title: "c",
    is_important: false,
    created_at: created,
    frequency_type: "custom_days",
    custom_days: days,
    target_count: 1,
  };
}
function weekly(target: number): AnalyticsHabit {
  return {
    id: "w",
    title: "w",
    is_important: false,
    created_at: created,
    frequency_type: "weekly",
    custom_days: null,
    target_count: target,
  };
}

// Daily: 5-day streak ending today
{
  const dates = ["2026-07-08", "2026-07-09", "2026-07-10", "2026-07-11", "2026-07-12"];
  const s = computeStreaks(daily(), dates, "2026-07-12");
  assert.strictEqual(s.current, 5, "daily 5-day streak");
  assert.strictEqual(s.longest, 5);
}

// Daily: today not done — streak from yesterday still holds
{
  const dates = ["2026-07-09", "2026-07-10", "2026-07-11"];
  const s = computeStreaks(daily(), dates, "2026-07-12");
  assert.strictEqual(s.current, 3, "today-open doesn't break daily streak");
}

// Daily: yesterday missed, today done — current = 1, previous run recorded in longest
{
  const dates = ["2026-07-08", "2026-07-09", "2026-07-12"];
  const s = computeStreaks(daily(), dates, "2026-07-12");
  assert.strictEqual(s.current, 1);
  assert.strictEqual(s.longest, 2);
}

// custom_days: only Mon/Wed/Fri (1,3,5). Non-scheduled days are transparent.
// 2026-07-12 is a Sun. Prior Mon=6, Wed=8, Fri=10 all completed → streak = 3.
{
  const dates = ["2026-07-06", "2026-07-08", "2026-07-10"];
  const s = computeStreaks(custom([1, 3, 5]), dates, "2026-07-12");
  assert.strictEqual(s.current, 3, "custom_days streak ignores non-scheduled");
  assert.strictEqual(s.longest, 3);
}

// custom_days: missed Fri breaks the streak
{
  const dates = ["2026-07-06", "2026-07-08"]; // Mon, Wed done; Fri missed
  const s = computeStreaks(custom([1, 3, 5]), dates, "2026-07-12");
  assert.strictEqual(s.current, 0, "missed scheduled day breaks custom_days streak");
  assert.strictEqual(s.longest, 2);
}

// Weekly 3x: this week (Mon 2026-07-06 .. Sun 2026-07-12) has 3 completions — met.
// Prior week (2026-06-29 .. 2026-07-05) has 3 — met. Streak = 2.
{
  const dates = [
    "2026-06-29", "2026-07-01", "2026-07-03", // prior week
    "2026-07-06", "2026-07-08", "2026-07-10", // current
  ];
  const s = computeStreaks(weekly(3), dates, "2026-07-12");
  assert.strictEqual(s.current, 2, "weekly consecutive weeks met");
  assert.strictEqual(s.longest, 2);
}

// Weekly 3x: current week only has 2 completions and today = Fri 2026-07-10
// (week still open). Prior week met. Current shouldn't break: streak = 1 (prior).
{
  const dates = [
    "2026-06-29", "2026-07-01", "2026-07-03",
    "2026-07-06", "2026-07-08",
  ];
  const s = computeStreaks(weekly(3), dates, "2026-07-10");
  assert.strictEqual(s.current, 1, "open current week doesn't break weekly streak");
  assert.strictEqual(s.longest, 1);
}

// Weekly 3x: current week Sun (2026-07-12), only 2 done → week over, not met → current = 0
{
  const dates = [
    "2026-06-29", "2026-07-01", "2026-07-03",
    "2026-07-06", "2026-07-08",
  ];
  const s = computeStreaks(weekly(3), dates, "2026-07-12");
  assert.strictEqual(s.current, 0, "closed unmet current week breaks weekly streak");
  assert.strictEqual(s.longest, 1);
}

// Completion counts — daily, window = last 7 days ending today.
// Done 3 of last 7 → completed=3, scheduled=7.
{
  const dates = ["2026-07-08", "2026-07-10", "2026-07-12"];
  const r = computeCompletionCounts(daily(), dates, "2026-07-06", "2026-07-12");
  assert.strictEqual(r.completed, 3);
  assert.strictEqual(r.scheduled, 7);
}

// Completion counts — weekly 3x, Fri window position. Deferral rule:
// completions before Fri < target (0), remaining=3, days_left=3 → miss counts.
{
  const r = computeCompletionCounts(weekly(3), [], "2026-07-06", "2026-07-10");
  // Mon-Thu should be not_counted (runway open); Fri = missed → scheduled=1.
  assert.strictEqual(r.completed, 0);
  assert.strictEqual(r.scheduled, 1, "weekly Mon-Thu not counted, Fri missed");
}

console.log("analytics.check.ts OK");
