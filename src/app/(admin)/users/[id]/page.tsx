import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/guard";
import { getUserOverview } from "@/lib/admin/queries";
import { PageHeader } from "@/components/PageHeader";

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireAdmin();
  const overview = await getUserOverview(user.id, id);
  if (!overview) notFound();

  const p = overview.profile;

  return (
    <div className="space-y-8">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={12} /> All users
      </Link>

      <PageHeader
        eyebrow="Admin · User"
        title={p.display_name || "(no name)"}
        subtitle={overview.email ?? "(no email)"}
      />

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Profile</p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-4">
          <Field label="User ID" value={<span className="font-mono text-xs">{p.user_id}</span>} />
          <Field label="Timezone" value={p.timezone} />
          <Field label="Admin" value={p.is_admin ? "Yes" : "No"} />
          <Field label="Joined" value={new Date(p.created_at).toISOString().slice(0, 10)} />
        </dl>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Active habits" value={overview.activeHabits.length} />
        <Stat label="Open tasks" value={overview.openTaskCount} />
        <Stat label="Completions (30d)" value={overview.completionsLast30d} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Active habits</p>
        {overview.activeHabits.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No active habits.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {overview.activeHabits.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {h.title}
                  {h.is_important && (
                    <span className="ml-2 rounded-full border border-primary/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                      Important
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">{h.frequency_type}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Recent reviews (last 7)
        </p>
        {overview.recentReviews.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No completed reviews yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {overview.recentReviews.map((r) => (
              <li key={r.review_date} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted-foreground">{r.review_date}</span>
                <span className="flex gap-4">
                  <span>Score {r.day_score ?? "—"}%</span>
                  <span className="text-muted-foreground">
                    Satisfaction {r.satisfaction_rating ?? "—"}/5
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm">{value}</dd>
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
