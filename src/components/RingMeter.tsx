"use client";

import { motion } from "motion/react";

// Circular progress ring with an animated honey→brass sweep and a serif
// numeric center. `pct` is 0–100. Animates the stroke on mount and whenever
// pct changes (e.g. as items are checked off).
export function RingMeter({
  pct,
  size = 96,
  stroke = 4,
}: {
  pct: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        <defs>
          <linearGradient id="ringHoney" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e8b776" />
            <stop offset="55%" stopColor="#c99553" />
            <stop offset="100%" stopColor="#a87738" />
          </linearGradient>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="var(--secondary)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="url(#ringHoney)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: "spring", stiffness: 90, damping: 20 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-3xl leading-none tabular text-foreground">
          {Math.round(clamped)}
        </span>
        <span className="mt-0.5 text-[7px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Percent
        </span>
      </div>
    </div>
  );
}
