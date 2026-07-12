// Runnable: `npx tsx src/lib/habits.check.ts`
import { countsTowardDayScore, type HabitSchedule } from "./habits";
import { getWeekEnd } from "./today";

const daily: HabitSchedule = { frequency_type: "daily", custom_days: null, target_count: 1 };
const weekly3: HabitSchedule = { frequency_type: "weekly", custom_days: null, target_count: 3 };
const mwf: HabitSchedule = { frequency_type: "custom_days", custom_days: [1, 3, 5], target_count: 1 };

// Week: Mon 2026-07-06 .. Sun 2026-07-12
const MON = "2026-07-06", TUE = "2026-07-07", WED = "2026-07-08";
const THU = "2026-07-09", FRI = "2026-07-10", SAT = "2026-07-11", SUN = "2026-07-12";
const END = getWeekEnd(MON);
if (END !== SUN) throw new Error(`getWeekEnd expected ${SUN} got ${END}`);

const ok = (got: string, want: string, msg: string) => {
  if (got !== want) throw new Error(`${msg}: expected ${want}, got ${got}`);
};

// Daily
ok(countsTowardDayScore(daily, MON, 0, true, END), "complete", "daily done");
ok(countsTowardDayScore(daily, MON, 0, false, END), "missed", "daily not done");

// Custom days (M/W/F)
ok(countsTowardDayScore(mwf, MON, 0, false, END), "missed", "mwf on Mon missed");
ok(countsTowardDayScore(mwf, TUE, 0, false, END), "not_counted", "mwf on Tue skipped");
ok(countsTowardDayScore(mwf, WED, 0, true, END), "complete", "mwf on Wed done");

// Weekly 3× — untouched all week (runway logic).
// Mon: 7 days left, 3 needed -> not_counted
ok(countsTowardDayScore(weekly3, MON, 0, false, END), "not_counted", "weekly Mon safe");
// Thu: 4 days left, 3 needed -> not_counted (still one buffer day)
ok(countsTowardDayScore(weekly3, THU, 0, false, END), "not_counted", "weekly Thu safe");
// Fri: 3 days left, 3 needed -> missed (must-do-today)
ok(countsTowardDayScore(weekly3, FRI, 0, false, END), "missed", "weekly Fri required");
// Sat: 2 days left, 3 needed -> missed (running behind, still counts)
ok(countsTowardDayScore(weekly3, SAT, 0, false, END), "missed", "weekly Sat required");
// Sun: 1 day left, 3 needed -> missed
ok(countsTowardDayScore(weekly3, SUN, 0, false, END), "missed", "weekly Sun required");

// Weekly 3× — done today
ok(countsTowardDayScore(weekly3, MON, 0, true, END), "complete", "weekly Mon done");

// Weekly 3× — quota already met before today (2 before + 1 done = 3, next day at 3 -> hidden)
ok(countsTowardDayScore(weekly3, THU, 3, false, END), "not_counted", "weekly quota met -> hidden");

// Weekly 3× — 2 done before today, 1 remaining. Fri: 3 days left, 1 needed -> not_counted
ok(countsTowardDayScore(weekly3, FRI, 2, false, END), "not_counted", "weekly Fri with 2 done safe");
// Sun: 1 day left, 1 needed -> missed
ok(countsTowardDayScore(weekly3, SUN, 2, false, END), "missed", "weekly Sun with 2 done required");

console.log("habits.check ok");
