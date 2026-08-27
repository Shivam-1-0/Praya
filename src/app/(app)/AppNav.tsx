"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { PrayaMark } from "@/components/PrayaMark";
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

// Bottom tab bar — phones only (hidden at md and up). Floating pill with a
// shared-layout active indicator that glides between tabs.
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-center pb-4 md:hidden">
      <div className="flex items-center gap-1 rounded-full border border-border bg-card/90 px-2 py-1.5 shadow-lg backdrop-blur">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`relative flex size-11 items-center justify-center rounded-full transition-colors ${
                active ? "text-accent-foreground" : "text-muted-foreground"
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="bottomNavActive"
                  className="absolute inset-0 rounded-full bg-foreground"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              ) : null}
              <Icon size={20} strokeWidth={1.75} className="relative" />
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
      <Link href="/today" className="mb-9 px-3 text-primary">
        <PrayaMark width={56} />
      </Link>

      <nav className="flex flex-col gap-1">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              }`}
            >
              {active ? (
                <motion.span
                  layoutId="sideNavActive"
                  className="absolute inset-0 rounded-xl bg-secondary/70"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              ) : null}
              <Icon
                size={18}
                strokeWidth={1.75}
                className={`relative ${active ? "text-primary" : ""}`}
              />
              <span className="relative">{label}</span>
            </Link>
          );
        })}
      </nav>

      <Link
        href="/profile"
        className="mt-auto flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-secondary/60"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary font-serif text-base italic text-primary">
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
