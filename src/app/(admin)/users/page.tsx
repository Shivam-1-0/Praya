import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { listUsers } from "@/lib/admin/queries";
import { PageHeader } from "@/components/PageHeader";

export default async function AdminUsersPage() {
  const { user } = await requireAdmin();
  const users = await listUsers(user.id);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Users"
        subtitle={`${users.length} account${users.length === 1 ? "" : "s"}.`}
      />

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-background/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name / email</th>
              <th className="px-4 py-3">Timezone</th>
              <th className="px-4 py-3 text-right">Habits</th>
              <th className="px-4 py-3 text-right">Reviews</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => (
              <tr key={u.user_id} className="hover:bg-secondary/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{u.display_name || <span className="text-muted-foreground">—</span>}</span>
                    {u.is_admin && (
                      <span className="rounded-full border border-primary/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[11px] text-muted-foreground">{u.user_id.slice(0, 8)}…</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.timezone}</td>
                <td className="px-4 py-3 text-right">{u.active_habit_count}</td>
                <td className="px-4 py-3 text-right">{u.reviews_count}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(u.created_at).toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/users/${u.user_id}`} className="text-primary hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
