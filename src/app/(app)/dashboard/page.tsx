import { getSupabaseServer } from "@/lib/supabase/server";
import { getTodayInTimezone, lastNDates } from "@/lib/today";
import { isHabitScheduledOn } from "@/lib/habits";
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

  const { data: habits } = await supabase
    .from("habits")
    .select("id, frequency_type, custom_days, is_important")
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
    .select("completion_date")
    .eq("user_id", user!.id)
    .gte("completion_date", week[0]);

  const activeHabits = habits ?? [];
  const scheduledToday = activeHabits.filter((h) => isHabitScheduledOn(h, today));
  const importantCount = activeHabits.filter((h) => h.is_important).length;
  const taskCount = (tasksToday ?? []).length;

  const perDay = new Map<string, number>(week.map((d) => [d, 0]));
  for (const c of compsWeek ?? []) {
    perDay.set(c.completion_date, (perDay.get(c.completion_date) ?? 0) + 1);
  }
  const weekCounts = week.map((d) => perDay.get(d) ?? 0);
  const peak = Math.max(1, ...weekCounts);
  const doneToday = perDay.get(today) ?? 0;
  const totalToday = scheduledToday.length + taskCount;
  const pctToday = totalToday === 0 ? 0 : Math.round((doneToday / totalToday) * 100);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        subtitle="Your consistency at a glance."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Today's completion" value={`${pctToday}%`} accent />
        <StatTile label="Active habits" value={String(activeHabits.length)} />
        <StatTile label="Tasks today" value={String(taskCount)} />
        <StatTile label="Important habits" value={`${importantCount} / 3`} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">This week</p>
        <div className="mt-6 flex h-32 items-end gap-2">
          {week.map((d, i) => {
            const h = Math.round((weekCounts[i] / peak) * 100);
            return (
              <div key={d} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-full w-full items-end">
                  <div
                    className="w-full rounded-t bg-primary/80"
                    style={{ height: `${weekCounts[i] === 0 ? 2 : h}%` }}
                    title={`${d}: ${weekCounts[i]}`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-border p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Latest reflection</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Your reflections will appear here after your first End-of-Day review.
        </p>
      </section>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
