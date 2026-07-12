import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getTodayInTimezone, lastNDates } from "@/lib/today";
import { PageHeader } from "@/components/PageHeader";
import { frequencyLabel } from "@/lib/habits";
import {
  computeStreaks,
  computeCompletionCounts,
  type AnalyticsHabit,
} from "@/lib/analytics";

const WINDOWS: Record<string, { days: number; label: string }> = {
  "30": { days: 30, label: "30 days" },
  "90": { days: 90, label: "90 days" },
  "365": { days: 365, label: "1 year" },
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string }>;
}) {
  const sp = await searchParams;
  const winKey = sp.window && WINDOWS[sp.window] ? sp.window : "30";
  const windowDays = WINDOWS[winKey].days;

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("user_id", user!.id)
    .single();

  const tz = profile?.timezone ?? "UTC";
  const today = getTodayInTimezone(tz);
  const windowDates = lastNDates(today, windowDays);
  const windowStart = windowDates[0];

  const [{ data: habits }, { data: comps }, { data: reviewItems }, { data: reviews }] =
    await Promise.all([
      supabase
        .from("habits")
        .select("id, title, frequency_type, custom_days, target_count, is_important, created_at")
        .eq("user_id", user!.id)
        .is("archived_at", null)
        .order("is_important", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase
        .from("completions")
        .select("item_id, completion_date")
        .eq("user_id", user!.id)
        .eq("item_type", "habit"),
      supabase
        .from("day_review_items")
        .select("item_id, is_valid")
        .eq("user_id", user!.id)
        .eq("item_type", "habit")
        .gte("created_at", `${windowStart}T00:00:00Z`),
      supabase
        .from("day_reviews")
        .select("review_date, day_score")
        .eq("user_id", user!.id)
        .gte("review_date", windowStart)
        .order("review_date", { ascending: true }),
    ]);

  const completionsByHabit = new Map<string, string[]>();
  for (const c of comps ?? []) {
    const arr = completionsByHabit.get(c.item_id) ?? [];
    arr.push(c.completion_date);
    completionsByHabit.set(c.item_id, arr);
  }
  for (const arr of completionsByHabit.values()) arr.sort();

  const invalidMissesByHabit = new Map<string, number>();
  for (const r of reviewItems ?? []) {
    if (r.is_valid === false) {
      invalidMissesByHabit.set(r.item_id, (invalidMissesByHabit.get(r.item_id) ?? 0) + 1);
    }
  }

  const activeHabits = (habits ?? []) as AnalyticsHabit[];
  const rows = activeHabits.map((h) => {
    const dates = completionsByHabit.get(h.id) ?? [];
    const streaks = computeStreaks(h, dates, today);
    const window = computeCompletionCounts(h, dates, windowStart, today);
    const rate =
      window.scheduled === 0
        ? null
        : Math.round((window.completed / window.scheduled) * 100);
    return {
      habit: h,
      current: streaks.current,
      longest: streaks.longest,
      rate,
      completed: window.completed,
      scheduled: window.scheduled,
      invalidMisses: invalidMissesByHabit.get(h.id) ?? 0,
    };
  });

  const overallCompleted = rows.reduce((s, r) => s + r.completed, 0);
  const overallScheduled = rows.reduce((s, r) => s + r.scheduled, 0);
  const overallRate =
    overallScheduled === 0 ? null : Math.round((overallCompleted / overallScheduled) * 100);

  const importantRows = rows.filter((r) => r.habit.is_important);
  const impCompleted = importantRows.reduce((s, r) => s + r.completed, 0);
  const impScheduled = importantRows.reduce((s, r) => s + r.scheduled, 0);
  const impRate = impScheduled === 0 ? null : Math.round((impCompleted / impScheduled) * 100);

  const invalidTotal = rows.reduce((s, r) => s + r.invalidMisses, 0);

  const reviewMap = new Map<string, number>();
  for (const r of reviews ?? []) {
    if (r.day_score != null) reviewMap.set(r.review_date, Number(r.day_score));
  }
  const trendDays = lastNDates(today, Math.min(windowDays, 90));
  const trendValues = trendDays.map((d) => reviewMap.get(d) ?? null);
  const trendPresent = trendValues.filter((v): v is number => v != null);
  const trendAvg =
    trendPresent.length === 0
      ? null
      : Math.round(trendPresent.reduce((a, b) => a + b, 0) / trendPresent.length);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Performance"
        title="Analytics"
        subtitle="Deep view of habit consistency, streaks, and misses."
      />

      <div className="flex items-center gap-2 text-xs">
        <span className="uppercase tracking-[0.2em] text-muted-foreground">Window</span>
        {Object.entries(WINDOWS).map(([key, w]) => (
          <Link
            key={key}
            href={`/analytics?window=${key}`}
            className={`rounded-full border px-3 py-1 transition ${
              key === winKey
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {w.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label={`Completion (${WINDOWS[winKey].label})`}
          value={overallRate == null ? "—" : `${overallRate}%`}
          hint={`${overallCompleted} / ${overallScheduled}`}
          accent
        />
        <StatTile
          label="Important consistency"
          value={impRate == null ? "—" : `${impRate}%`}
          hint={`${impCompleted} / ${impScheduled} • ${importantRows.length} habits`}
        />
        <StatTile
          label="Invalid misses"
          value={String(invalidTotal)}
          hint="Skipped without a valid reason"
        />
        <StatTile
          label="Avg day-score"
          value={trendAvg == null ? "—" : `${trendAvg}`}
          hint={`${trendPresent.length} reviewed days`}
        />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Day-score trend
        </p>
        {trendPresent.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No End-of-Day reviews in this window yet.
          </p>
        ) : (
          <div className="mt-6 flex h-32 items-end gap-[2px]">
            {trendValues.map((v, i) => {
              const h = v == null ? 0 : Math.max(2, Math.round(v));
              return (
                <div
                  key={trendDays[i]}
                  className="flex-1"
                  title={v == null ? `${trendDays[i]}: —` : `${trendDays[i]}: ${v}`}
                >
                  <div
                    className={`w-full rounded-t ${v == null ? "bg-border/40" : "bg-primary/80"}`}
                    style={{ height: `${v == null ? 2 : h}%` }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Per-habit ({WINDOWS[winKey].label})
          </p>
        </div>
        {rows.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            No active habits yet. Add some from the Habits tab.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((r) => (
              <div
                key={r.habit.id}
                className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-6 sm:items-center"
              >
                <div className="col-span-2 sm:col-span-2">
                  <p className="text-sm font-medium">
                    {r.habit.title}
                    {r.habit.is_important && (
                      <span className="ml-2 rounded-full border border-primary/40 px-2 py-[1px] text-[10px] uppercase tracking-wider text-primary">
                        Important
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {frequencyLabel(r.habit)}
                  </p>
                </div>
                <Cell label="Rate" value={r.rate == null ? "—" : `${r.rate}%`} sub={`${r.completed}/${r.scheduled}`} />
                <Cell label="Current" value={String(r.current)} />
                <Cell label="Longest" value={String(r.longest)} />
                <Cell
                  label="Invalid miss"
                  value={String(r.invalidMisses)}
                  emphasize={r.invalidMisses > 0}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent ? "text-primary" : ""}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Cell({
  label,
  value,
  sub,
  emphasize,
}: {
  label: string;
  value: string;
  sub?: string;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold ${emphasize ? "text-primary" : ""}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
