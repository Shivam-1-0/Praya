import { getSupabaseServer } from "@/lib/supabase/server";
import { getTodayInTimezone, lastNDates } from "@/lib/today";
import { PageHeader } from "@/components/PageHeader";

export default async function AnalyticsPage() {
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
  const days = lastNDates(today, 14);

  const { data: comps } = await supabase
    .from("completions")
    .select("completion_date")
    .eq("user_id", user!.id)
    .gte("completion_date", days[0]);

  const perDay = new Map<string, number>(days.map((d) => [d, 0]));
  for (const c of comps ?? []) {
    perDay.set(c.completion_date, (perDay.get(c.completion_date) ?? 0) + 1);
  }
  const counts = days.map((d) => perDay.get(d) ?? 0);
  const total = counts.reduce((a, b) => a + b, 0);
  const peak = Math.max(1, ...counts);
  const activeDays = counts.filter((c) => c > 0).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Performance"
        title="Analytics"
        subtitle="How your consistency is trending over time."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile label="Completions (14d)" value={String(total)} />
        <StatTile label="Active days" value={`${activeDays} / 14`} />
        <StatTile label="Best day" value={String(peak === 1 && total === 0 ? 0 : peak)} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Completions — last 14 days
        </p>
        <div className="mt-6 flex h-40 items-end gap-1.5">
          {days.map((d, i) => {
            const h = Math.round((counts[i] / peak) * 100);
            return (
              <div key={d} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-full w-full items-end">
                  <div
                    className="w-full rounded-t bg-primary/80"
                    style={{ height: `${counts[i] === 0 ? 2 : h}%` }}
                    title={`${d}: ${counts[i]}`}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground">{d.slice(8)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-border p-5">
        <p className="text-sm text-muted-foreground">
          Habit consistency, important-habit streaks, and missed-reason breakdowns unlock
          once you start running End-of-Day reviews.
        </p>
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
