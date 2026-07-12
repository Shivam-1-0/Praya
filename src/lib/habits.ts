export type HabitSchedule = {
  frequency_type: "daily" | "weekly" | "custom_days";
  custom_days: number[] | null;
};

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function frequencyLabel(h: HabitSchedule): string {
  if (h.frequency_type === "daily") return "Daily";
  if (h.frequency_type === "weekly") return "Weekly";
  const days = (h.custom_days ?? [])
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_SHORT[d]);
  return days.length ? days.join(", ") : "Custom";
}

// Is this habit scheduled on the given calendar date (YYYY-MM-DD, already in
// the user's timezone)? Weekday is derived at noon-UTC to avoid tz off-by-one.
export function isHabitScheduledOn(habit: HabitSchedule, dateStr: string): boolean {
  if (habit.frequency_type === "daily") return true;
  // ponytail: weekly currently shows every day (a standing weekly habit).
  // Revisit if a specific weekday or a weekly-count model is wanted.
  if (habit.frequency_type === "weekly") return true;
  const weekday = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
  return (habit.custom_days ?? []).includes(weekday);
}
