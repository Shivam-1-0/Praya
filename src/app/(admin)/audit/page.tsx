import { requireAdmin } from "@/lib/admin/guard";
import { getRecentAuditLog } from "@/lib/admin/queries";
import { PageHeader } from "@/components/PageHeader";

export default async function AdminAuditPage() {
  await requireAdmin();
  const rows = await getRecentAuditLog(100);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Audit log"
        subtitle="Last 100 admin actions, newest first."
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No admin actions logged yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(r.created_at).toISOString().replace("T", " ").slice(0, 19)}
                </td>
                <td className="px-4 py-3 font-mono text-[11px]">{r.admin_user_id.slice(0, 8)}…</td>
                <td className="px-4 py-3">{r.action}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                  {r.target_user_id ? `${r.target_user_id.slice(0, 8)}…` : "—"}
                </td>
                <td className="px-4 py-3 text-[11px] text-muted-foreground">
                  {r.detail ? JSON.stringify(r.detail) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
