import { getSupabaseServer } from "@/lib/supabase/server";
import { getTodayInTimezone, getWeekStart, getWeekEnd, lastNDates } from "@/lib/today";
import { countsTowardDayScore } from "@/lib/habits";
import { PageHeader } from "@/components/PageHeader";

export default async function DashboardPage() {
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
  const week = lastNDates(today, 7);

  const weekStart = getWeekStart(today);

  const { data: habits } = await supabase
    .from("habits")
    .select("id, frequency_type, custom_days, target_count, is_important")
    .eq("user_id", user!.id)
    .is("archived_at", null);

  const { data: tasksToday } = await supabase
    .from("tasks")
    .select("id")
    .eq("user_id", user!.id)
    .is("archived_at", null)
    .eq("due_date", today);

  const { data: compsWeek } = await supabase
    .from("completions")
    .select("item_type, item_id, completion_date")
    .eq("user_id", user!.id)
    .gte("completion_date", week[0]);

  const habitCountBeforeToday = new Map<string, number>();
  const habitDoneToday = new Set<string>();
  for (const c of compsWeek ?? []) {
    if (c.item_type !== "habit") continue;
    if (c.completion_date < weekStart) continue;
    if (c.completion_date < today) {
      habitCountBeforeToday.set(c.item_id, (habitCountBeforeToday.get(c.item_id) ?? 0) + 1);
    } else if (c.completion_date === today) {
      habitDoneToday.add(c.item_id);
    }
  }

  const activeHabits = habits ?? [];
  const weekEnd = getWeekEnd(today);
  let habitTotal = 0;
  let habitDone = 0;
  for (const h of activeHabits) {
    const c = countsTowardDayScore(
      h,
      today,
      habitCountBeforeToday.get(h.id) ?? 0,
      habitDoneToday.has(h.id),
      weekEnd,
    );
    if (c === "not_counted") continue;
    habitTotal += 1;
    if (c === "complete") habitDone += 1;
  }
  const importantCount = activeHabits.filter((h) => h.is_important).length;
  const taskCount = (tasksToday ?? []).length;

  const perDay = new Map<string, number>(week.map((d) => [d, 0]));
  for (const c of compsWeek ?? []) {
    perDay.set(c.completion_date, (perDay.get(c.completion_date) ?? 0) + 1);
  }
  const weekCounts = week.map((d) => perDay.get(d) ?? 0);
  const peak = Math.max(1, ...weekCounts);
  const taskDoneToday = (compsWeek ?? []).filter(
    (c) => c.item_type === "task" && c.completion_date === today,
  ).length;
  const totalToday = habitTotal + taskCount;
  const doneToday = habitDone + taskDoneToday;
  const pctToday = totalToday === 0 ? 0 : Math.round((doneToday / totalToday) * 100);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        subtitle="Your consistency at a glance."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Today's completion" value={`${pctToday}%`} invert />
        <StatTile label="Active habits" value={String(activeHabits.length)} />
        <StatTile label="Tasks today" value={String(taskCount)} />
        <StatTile label="Important habits" value={`${importantCount} / 3`} accent />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">Daily rhythm · this week</p>
        <div className="mt-8 flex h-32 items-end gap-2">
          {week.map((d, i) => {
            const h = Math.round((weekCounts[i] / peak) * 100);
            const isPeak = weekCounts[i] === peak && weekCounts[i] > 0;
            const isToday = d === today;
            return (
              <div key={d} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative flex h-full w-full items-end">
                  {isPeak ? (
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-serif text-sm text-primary tabular">
                      {weekCounts[i]}
                    </span>
                  ) : null}
                  <div
                    className={`w-full rounded-t ${
                      weekCounts[i] === 0
                        ? "bg-secondary"
                        : isPeak
                          ? "bg-primary"
                          : "bg-accent"
                    }`}
                    style={{ height: `${weekCounts[i] === 0 ? 2 : h}%` }}
                    title={`${d}: ${weekCounts[i]}`}
                  />
                </div>
                <span className={`text-[10px] ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-border p-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">Latest reflection</p>
        <p className="mt-3 font-serif text-lg italic text-muted-foreground">
          Your reflections will appear here after your first End-of-Day review.
        </p>
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
  invert,
}: {
  label: string;
  value: string;
  accent?: boolean;
  invert?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 ${
        invert ? "border-foreground bg-foreground" : "border-border bg-card"
      }`}
    >
      {invert ? (
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 100% 0%, rgba(232,183,118,0.2), transparent 65%)",
          }}
        />
      ) : null}
      <p
        className={`relative text-[10px] font-medium uppercase tracking-[0.28em] ${
          invert ? "text-accent" : "text-muted-foreground"
        }`}
      >
        {label}
      </p>
      <p
        className={`relative mt-2 font-serif text-3xl tabular ${
          invert ? "text-background" : accent ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
