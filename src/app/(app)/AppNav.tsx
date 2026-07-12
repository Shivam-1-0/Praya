"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  ListChecks,
  CheckSquare,
  BarChart3,
  LayoutDashboard,
  ChevronRight,
} from "lucide-react";

const TABS = [
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/habits", label: "Habits", icon: ListChecks },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

// Bottom tab bar — phones only (hidden at md and up).
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around px-1 py-2">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={19} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// Left sidebar — desktop only (hidden below md).
export function SideNav({ name, email }: { name: string | null; email: string }) {
  const pathname = usePathname();
  const initial = (name || email).charAt(0).toUpperCase();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border px-4 py-6 md:flex">
      <span className="mb-9 px-3 text-base font-semibold tracking-[0.28em] text-primary uppercase">
        Praya
      </span>

      <nav className="flex flex-col gap-1">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-secondary/60 text-foreground"
                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              }`}
            >
              {active ? (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
              ) : null}
              <Icon
                size={18}
                strokeWidth={1.75}
                className={active ? "text-primary" : ""}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/profile"
        className="mt-auto flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-secondary/60"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-medium text-primary">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name || "Your account"}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
      </Link>
    </aside>
  );
}
