"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";

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
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={done}
      aria-label={`Mark ${label} ${done ? "incomplete" : "complete"}`}
      whileTap={{ scale: 0.85 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`flex ${dim} shrink-0 items-center justify-center border-2 transition-colors ${
        shape === "square" ? "rounded-lg" : "rounded-full"
      } ${
        done
          ? "border-primary bg-primary/15 text-primary"
          : "border-border text-transparent hover:border-muted-foreground"
      }`}
    >
      <motion.span
        initial={false}
        animate={done ? { scale: 1, opacity: 1 } : { scale: 0.4, opacity: 0 }}
        transition={{ type: "spring", stiffness: 600, damping: 22 }}
        style={{ display: "flex" }}
      >
        <Check size={iconSize} strokeWidth={3} />
      </motion.span>
    </motion.button>
  );
}
