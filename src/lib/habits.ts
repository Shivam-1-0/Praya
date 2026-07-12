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
