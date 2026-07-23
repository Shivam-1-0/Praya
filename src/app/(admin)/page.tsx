import { getUsageStats } from "@/lib/admin/queries";
import { PageHeader } from "@/components/PageHeader";

export default async function AdminOverviewPage() {
  const stats = await getUsageStats();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="Overview" subtitle="Rolling counts for the last 7 days." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total users" value={stats.totalUsers} />
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
