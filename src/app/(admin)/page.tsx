import { getUsageStats } from "@/lib/admin/queries";
import { PageHeader } from "@/components/PageHeader";

export default async function AdminOverviewPage() {
  const stats = await getUsageStats();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="Overview" subtitle="Rolling counts for the last 7 days." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total users" value={stats.totalUsers} invert />
        <Stat label="Admins" value={stats.totalAdmins} />
        <Stat label="Active habits" value={stats.totalActiveHabits} />
        <Stat label="Open tasks" value={stats.totalOpenTasks} />
        <Stat label="Completions (7d)" value={stats.completionsLast7d} />
        <Stat label="Reviews (7d)" value={stats.reviewsLast7d} />
        <Stat label="Active users (7d)" value={stats.activeUsersLast7d} />
      </div>
    </div>
  );
}

function Stat({ label, value, invert }: { label: string; value: number; invert?: boolean }) {
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
      <p className={`relative mt-2 font-serif text-3xl tabular ${invert ? "text-background" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
