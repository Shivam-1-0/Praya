import type { LucideIcon } from "lucide-react";

export function Chip({
  icon: Icon,
  children,
  tone = "muted",
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  tone?: "muted" | "gold";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] ${
        tone === "gold"
          ? "border-primary/40 text-primary"
          : "border-border text-muted-foreground"
      }`}
    >
      {Icon ? <Icon size={11} strokeWidth={2} /> : null}
      {children}
    </span>
  );
}
