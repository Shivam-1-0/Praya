"use client";

import { Check } from "lucide-react";

export function CheckToggle({
  shape,
  done,
  label,
  onClick,
  size = "sm",
}: {
  shape: "square" | "circle";
  done: boolean;
  label: string;
  onClick: () => void;
  size?: "sm" | "lg";
}) {
  const dim = size === "lg" ? "size-10" : "size-6";
  const iconSize = size === "lg" ? 18 : 14;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={done}
      aria-label={`Mark ${label} ${done ? "incomplete" : "complete"}`}
      className={`flex ${dim} shrink-0 items-center justify-center border-2 transition-colors ${
        shape === "square" ? "rounded-lg" : "rounded-full"
      } ${
        done
          ? "border-primary bg-primary/15 text-primary"
          : "border-border text-transparent hover:border-muted-foreground"
      }`}
    >
      <Check size={iconSize} strokeWidth={3} />
    </button>
  );
}
