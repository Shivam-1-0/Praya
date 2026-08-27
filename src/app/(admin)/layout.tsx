import Link from "next/link";
import { LayoutGrid, Users, ScrollText } from "lucide-react";
import { PrayaMark } from "@/components/PrayaMark";
import { requireAdmin } from "@/lib/admin/guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, displayName } = await requireAdmin();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-3">
              <PrayaMark width={38} className="text-primary" />
              <span className="font-serif text-lg italic text-muted-foreground">
                Admin
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <NavLink href="/admin" icon={<LayoutGrid size={14} />} label="Overview" />
            <NavLink href="/admin/users" icon={<Users size={14} />} label="Users" />
            <NavLink href="/admin/audit" icon={<ScrollText size={14} />} label="Audit" />
            <span className="text-xs text-muted-foreground">
              {displayName || user.email}
            </span>
            <Link href="/today" className="text-xs text-muted-foreground hover:text-foreground">
              ← App
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
    >
      {icon}
      {label}
    </Link>
  );
}
