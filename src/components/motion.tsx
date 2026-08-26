"use client";

import { motion, type Variants } from "motion/react";

// Shared, GPU-cheap (transform/opacity only) motion primitives.
// Reduced-motion is respected globally via the CSS guard in globals.css and
// Motion's own prefers-reduced-motion handling.

const EASE = [0.22, 1, 0.36, 1] as const; // gentle ease-out, luxurious settle

// A container that staggers its direct <Stagger.Item> children in on mount.
// Kept snappy — total cascade for 6 items ~= 200ms, so nothing feels held back.
const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.025 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: EASE },
  },
};

export function Stagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {children}
    </motion.div>
  );
}

Stagger.Item = function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
};

// A single element that fades + rises in on mount. Optional delay in seconds.
export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}
