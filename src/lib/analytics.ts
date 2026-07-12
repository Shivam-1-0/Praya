import { isHabitScheduledOn, countsTowardDayScore, type HabitSchedule } from "./habits";
import { getWeekStart, getWeekEnd } from "./today";

export type AnalyticsHabit = HabitSchedule & {
  id: string;
  title: string;
  is_important: boolean;
  created_at: string; // ISO timestamptz
};

export type HabitStats = {
  currentStreak: number;
  longestStreak: number;
  completed: number;
  scheduled: number;
  invalidMisses: number;
};

function addDay(d: string, n = 1): string {
  const dt = new Date(`${d}T12:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function addWeek(d: string, n = 1): string {
  return addDay(d, n * 7);
}

// Streak rules per HANDOFF.md discussion:
// - daily: consecutive scheduled days with a completion. Today is "open": if not
//   yet done, don't break the streak — start counting from yesterday.
// - custom_days: same, but non-scheduled days are transparent (neither extend
//   nor break).
// - weekly: consecutive ISO weeks where completion count >= target_count.
//   Current week is open: if quota not met but week isn't over, don't break.
// Valid-reason misses still break the streak — invalid-miss-count is separate.
export function computeStreaks(
  habit: AnalyticsHabit,
  completionDates: string[],
  today: string,
): { current: number; longest: number } {
  const startDate = habit.created_at.slice(0, 10);
  const set = new Set(completionDates);

  if (habit.frequency_type === "weekly") {
    const byWeek = new Map<string, number>();
    for (const d of completionDates) {
      const ws = getWeekStart(d);
      byWeek.set(ws, (byWeek.get(ws) ?? 0) + 1);
    }
    const startWeek = getWeekStart(startDate);
    const curWeek = getWeekStart(today);

    let longest = 0;
    let run = 0;
    for (let w = startWeek; w <= curWeek; w = addWeek(w)) {
      const met = (byWeek.get(w) ?? 0) >= habit.target_count;
      const isOpenCurrent = w === curWeek && !met && today < getWeekEnd(today);
      if (isOpenCurrent) continue;
      if (met) {
        run += 1;
        if (run > longest) longest = run;
      } else {
        run = 0;
      }
    }

    let current = 0;
    let w = curWeek;
    const curMet = (byWeek.get(curWeek) ?? 0) >= habit.target_count;
    if (!curMet && today < getWeekEnd(today)) {
      w = addWeek(w, -1);
    }
    while (w >= startWeek) {
      if ((byWeek.get(w) ?? 0) >= habit.target_count) current += 1;
      else break;
      w = addWeek(w, -1);
    }
    return { current, longest };
  }

  const isScheduled = (d: string) =>
    habit.frequency_type === "daily" ? true : isHabitScheduledOn(habit, d, 0);

  let longest = 0;
  let run = 0;
  for (let d = startDate; d <= today; d = addDay(d)) {
    if (!isScheduled(d)) continue;
    if (set.has(d)) {
      run += 1;
      if (run > longest) longest = run;
    } else if (d === today) {
      // today still open
    } else {
      run = 0;
    }
  }

  let current = 0;
  let cd = today;
  if (isScheduled(today) && !set.has(today)) cd = addDay(cd, -1);
  while (cd >= startDate) {
    if (isScheduled(cd)) {
      if (set.has(cd)) current += 1;
      else break;
    }
    cd = addDay(cd, -1);
  }
  return { current, longest };
}

// completed / scheduled over [windowStart..today], applying the same
// countsTowardDayScore rules the dashboard/review use — a weekly habit only
// counts on days it either was completed or ran out of runway.
export function computeCompletionCounts(
  habit: AnalyticsHabit,
  completionDates: string[],
  windowStart: string,
  today: string,
): { completed: number; scheduled: number } {
  const set = new Set(completionDates);
  const effectiveStart =
    habit.created_at.slice(0, 10) > windowStart ? habit.created_at.slice(0, 10) : windowStart;

  let completed = 0;
  let scheduled = 0;
  let weekCursor = "";
  let weekBeforeToday = 0;

  for (let d = effectiveStart; d <= today; d = addDay(d)) {
    const ws = getWeekStart(d);
    if (ws !== weekCursor) {
      weekCursor = ws;
      weekBeforeToday = 0;
    }
    const done = set.has(d);
    const contrib = countsTowardDayScore(habit, d, weekBeforeToday, done, getWeekEnd(d));
    if (contrib === "complete") {
      completed += 1;
      scheduled += 1;
    } else if (contrib === "missed") {
      scheduled += 1;
    }
    if (done) weekBeforeToday += 1;
  }
  return { completed, scheduled };
}
