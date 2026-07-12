// Day score = 70% completion + 20% important-habit consistency + 10% satisfaction.
// Satisfaction is null until End-of-Day Review is submitted. When null, the
// caller decides how to display an in-progress score (we show 0–90% partial).
// The SAME function powers Today's live score, /api/v1/day-score, AND the
// snapshot written to day_reviews.day_score at review time.

export type DayScoreInputs = {
  totalItems: number;
  completedItems: number;
  importantTotal: number;
  importantCompleted: number;
  satisfactionRating: number | null; // 1..5, null when day not yet reviewed
};

export type DayScore = {
  completion_rate: number;
  important_habit_consistency: number;
  satisfaction_component: number | null;
  score: number;
  is_final: boolean;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeDayScore(i: DayScoreInputs): DayScore {
  const completion = i.totalItems === 0 ? 0 : i.completedItems / i.totalItems;
  const important = i.importantTotal === 0 ? 0 : i.importantCompleted / i.importantTotal;
  // 1..5 → 0..1 linearly (1 "wasted day" = 0, 5 "extremely" = 1).
  const satisfaction = i.satisfactionRating == null ? null : (i.satisfactionRating - 1) / 4;

  const base = completion * 0.7 + important * 0.2;
  const finalized = satisfaction == null ? base : base + satisfaction * 0.1;

  return {
    completion_rate: round2(completion),
    important_habit_consistency: round2(important),
    satisfaction_component: satisfaction == null ? null : round2(satisfaction),
    score: round2(finalized * 100),
    is_final: satisfaction != null,
  };
}
