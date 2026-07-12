export type HabitSchedule = {
  frequency_type: "daily" | "weekly" | "custom_days";
  custom_days: number[] | null;
  target_count: number;
};

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function frequencyLabel(h: HabitSchedule): string {
  if (h.frequency_type === "daily") return "Daily";
  if (h.frequency_type === "weekly") {
    return h.target_count > 1 ? `Weekly (${h.target_count}×)` : "Weekly";
  }
  const days = (h.custom_days ?? [])
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_SHORT[d]);
  return days.length ? days.join(", ") : "Custom";
}

// Is this habit scheduled on the given calendar date (YYYY-MM-DD, already in
// the user's timezone)? Weekday derived at noon-UTC to avoid tz off-by-one.
//
// `weeklyCompletionCount` = completions of this habit in the current ISO week
// (Mon-Sun). Ignored for daily/custom_days.
export function isHabitScheduledOn(
  habit: HabitSchedule,
  dateStr: string,
  weeklyCompletionCount: number,
): boolean {
  if (habit.frequency_type === "daily") return true;
  if (habit.frequency_type === "weekly") {
    return weeklyCompletionCount < habit.target_count;
  }
  const weekday = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
  return (habit.custom_days ?? []).includes(weekday);
}

// Does this habit contribute to today's day-score, and if so as done or missed?
// Deferral-until-out-of-runway: a weekly habit only counts today when it was
// done today OR the remaining days in the week can no longer absorb the quota.
// See HANDOFF.md §9.1 for the design decision.
export type DayScoreContribution = "complete" | "missed" | "not_counted";

export function countsTowardDayScore(
  habit: HabitSchedule,
  dateStr: string,
  weekCountBeforeToday: number,
  wasCompletedToday: boolean,
  weekEndDate: string,
): DayScoreContribution {
  if (habit.frequency_type === "daily") {
    return wasCompletedToday ? "complete" : "missed";
  }
  if (habit.frequency_type === "custom_days") {
    const weekday = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
    if (!(habit.custom_days ?? []).includes(weekday)) return "not_counted";
    return wasCompletedToday ? "complete" : "missed";
  }
  // weekly
  if (wasCompletedToday) return "complete";
  const remainingQuota = habit.target_count - weekCountBeforeToday;
  if (remainingQuota <= 0) return "not_counted";
  const daysLeftIncludingToday = daysBetweenInclusive(dateStr, weekEndDate);
  return daysLeftIncludingToday <= remainingQuota ? "missed" : "not_counted";
}

function daysBetweenInclusive(fromStr: string, toStr: string): number {
  const from = Date.UTC(
    Number(fromStr.slice(0, 4)),
    Number(fromStr.slice(5, 7)) - 1,
    Number(fromStr.slice(8, 10)),
  );
  const to = Date.UTC(
    Number(toStr.slice(0, 4)),
    Number(toStr.slice(5, 7)) - 1,
    Number(toStr.slice(8, 10)),
  );
  return Math.round((to - from) / 86_400_000) + 1;
}
