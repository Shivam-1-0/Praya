import { GoogleGenAI } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { countsTowardDayScore, isHabitScheduledOn } from "./habits";
import { getTodayInTimezone, getWeekStart, getWeekEnd, lastNDates } from "./today";

let clientInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!clientInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    clientInstance = new GoogleGenAI({ apiKey });
  }
  return clientInstance;
}

export const VEYLA_MODEL = "gemini-2.5-flash";

// Static app-knowledge doc. Update whenever app behavior changes so Veyla
// stays truthful. Grounding here is a HARD contract with the prompt below.
export const APP_KNOWLEDGE = `Praya is a habit and daily-task tracker with 5 tabs:
- Today: today's scheduled habits and tasks with check-off toggles, plus the End-of-Day Review CTA once every scheduled item is either done or the day is closing.
- Habits: manage recurring habits. Three frequency types — daily, weekly (an N-per-week quota, 1-7), and custom_days (specific weekdays only). Up to 3 habits can be marked "important". Weekly habits deferral: a weekly habit only counts toward today's score if it was completed today OR the remaining days in the week can no longer absorb the quota.
- Tasks: one-off dated todos with a due_date and optional priority. Past tasks are hidden by default (never affect score).
- Analytics: windowed 30/90/365d completion rate, important-habit consistency, per-habit current+longest streaks, invalid-miss count, day-score trend. Streaks: valid-reason misses still break the streak.
- Dashboard: today's completion %, active habit count, tasks-today count, this-week bar chart.

End-of-Day Review: for each missed scheduled item the user notes a reason and marks it valid (excused) or invalid (on them). Also picks a 1-5 satisfaction rating and writes free-form reflection text. Same-day re-editable.

The Profile tab has: account info, reflections PDF export, API key management (for the automation API), sign-out, and a Danger Zone reset that wipes all data.

The app knows the user's timezone and uses it everywhere.
`;

export const VEYLA_SYSTEM_PROMPT = `You are Veyla, a small in-app assistant for Praya (a habit and daily-task app).

## Ground rules (non-negotiable)
1. Only use facts from the APP KNOWLEDGE and USER SNAPSHOT below. Do NOT invent habits, tasks, scores, streaks, or features.
2. If the user asks about something not in your snapshot or app knowledge, say "I'm not sure — you might want to check the [relevant tab]" rather than guessing.
3. Never invent features. If the user asks "can Praya do X" and X isn't in the app knowledge, say so directly.
4. Keep replies short — 1 to 3 sentences is typical. This is a productivity tool, not a chatbot.
5. When the user asks for advice, be practical and specific to what's in their snapshot. Don't lecture.

## APP KNOWLEDGE
${APP_KNOWLEDGE}
`;

export type VeylaSnapshot = {
  today: string;
  timezone: string;
  todaysHabits: Array<{ title: string; important: boolean; done: boolean; frequency: string }>;
  todaysTasks: Array<{ title: string; done: boolean; priority: number | null }>;
  activeHabitCount: number;
  importantHabitCount: number;
  recentDayScores: Array<{ date: string; score: number | null }>;
  todayCompletionPct: number;
};

// Small live snapshot of the user's current state. Used as a per-request
// context block, so Veyla answers with real data instead of hallucinating.
// Uses the anon client + RLS — no service-role.
export async function getVeylaSnapshot(
  supabase: SupabaseClient,
  userId: string,
  timezone: string,
): Promise<VeylaSnapshot> {
  const today = getTodayInTimezone(timezone);
  const weekStart = getWeekStart(today);
  const weekEnd = getWeekEnd(today);
  const trendWindow = lastNDates(today, 14);

  const [{ data: habits }, { data: tasks }, { data: weekComps }, { data: reviews }] =
    await Promise.all([
      supabase
        .from("habits")
        .select("id, title, frequency_type, custom_days, target_count, is_important")
        .eq("user_id", userId)
        .is("archived_at", null),
      supabase
        .from("tasks")
        .select("id, title, priority")
        .eq("user_id", userId)
        .is("archived_at", null)
        .eq("due_date", today),
      supabase
        .from("completions")
        .select("item_type, item_id, completion_date")
        .eq("user_id", userId)
        .gte("completion_date", weekStart)
        .lte("completion_date", today),
      supabase
        .from("day_reviews")
        .select("review_date, day_score")
        .eq("user_id", userId)
        .gte("review_date", trendWindow[0])
        .not("completed_at", "is", null),
    ]);

  const habitCountBefore = new Map<string, number>();
  const habitDoneToday = new Set<string>();
  const taskDoneToday = new Set<string>();
  for (const c of weekComps ?? []) {
    if (c.item_type === "habit") {
      if (c.completion_date < today) {
        habitCountBefore.set(c.item_id, (habitCountBefore.get(c.item_id) ?? 0) + 1);
      } else if (c.completion_date === today) {
        habitDoneToday.add(c.item_id);
      }
    } else if (c.item_type === "task" && c.completion_date === today) {
      taskDoneToday.add(c.item_id);
    }
  }

  const todaysHabits: VeylaSnapshot["todaysHabits"] = [];
  for (const h of habits ?? []) {
    const scheduled = isHabitScheduledOn(h, today, habitCountBefore.get(h.id) ?? 0);
    if (!scheduled) continue;
    const frequency =
      h.frequency_type === "weekly"
        ? h.target_count > 1
          ? `weekly x${h.target_count}`
          : "weekly"
        : h.frequency_type;
    todaysHabits.push({
      title: h.title,
      important: h.is_important,
      done: habitDoneToday.has(h.id),
      frequency,
    });
  }

  const todaysTasks = (tasks ?? []).map((t) => ({
    title: t.title,
    done: taskDoneToday.has(t.id),
    priority: t.priority ?? null,
  }));

  let totalToday = todaysTasks.length;
  let doneToday = todaysTasks.filter((t) => t.done).length;
  for (const h of habits ?? []) {
    const c = countsTowardDayScore(
      h,
      today,
      habitCountBefore.get(h.id) ?? 0,
      habitDoneToday.has(h.id),
      weekEnd,
    );
    if (c === "not_counted") continue;
    totalToday += 1;
    if (c === "complete") doneToday += 1;
  }
  const todayCompletionPct = totalToday === 0 ? 0 : Math.round((doneToday / totalToday) * 100);

  const reviewMap = new Map<string, number | null>();
  for (const r of reviews ?? []) {
    reviewMap.set(r.review_date, r.day_score != null ? Number(r.day_score) : null);
  }
  const recentDayScores = trendWindow.map((d) => ({
    date: d,
    score: reviewMap.get(d) ?? null,
  }));

  return {
    today,
    timezone,
    todaysHabits,
    todaysTasks,
    activeHabitCount: (habits ?? []).length,
    importantHabitCount: (habits ?? []).filter((h) => h.is_important).length,
    recentDayScores,
    todayCompletionPct,
  };
}

export function renderSnapshotForPrompt(snap: VeylaSnapshot): string {
  const habitLines = snap.todaysHabits.length
    ? snap.todaysHabits
        .map(
          (h) =>
            `- ${h.done ? "[x]" : "[ ]"} ${h.title}${h.important ? " (important)" : ""} · ${h.frequency}`,
        )
        .join("\n")
    : "  (none scheduled today)";
  const taskLines = snap.todaysTasks.length
    ? snap.todaysTasks
        .map((t) => `- ${t.done ? "[x]" : "[ ]"} ${t.title}${t.priority ? ` · p${t.priority}` : ""}`)
        .join("\n")
    : "  (no tasks today)";
  const scoreLine = snap.recentDayScores
    .filter((d) => d.score != null)
    .slice(-7)
    .map((d) => `${d.date}:${d.score}%`)
    .join(", ");

  return `## USER SNAPSHOT (as of ${snap.today}, timezone ${snap.timezone})
Today's completion: ${snap.todayCompletionPct}%
Active habits: ${snap.activeHabitCount} (${snap.importantHabitCount}/3 marked important)

Today's habits:
${habitLines}

Today's tasks:
${taskLines}

Recent day-score trend (last reviewed days): ${scoreLine || "(none reviewed yet)"}
`;
}
