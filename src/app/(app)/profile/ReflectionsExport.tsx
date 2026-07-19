"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateReflectionsPDF } from "./reflections-pdf";

export type ReflectionRow = {
  review_date: string; // YYYY-MM-DD
  satisfaction_rating: number | null;
  reflection_text: string | null;
  day_score: number | null;
  items: Array<{
    kind: "habit" | "task";
    title: string;
    reason: string | null;
    is_valid: boolean | null;
  }>;
};

export function ReflectionsExport({ reflections }: { reflections: ReflectionRow[] }) {
  const [generating, setGenerating] = useState(false);

  async function handleDownload() {
    setGenerating(true);
    try {
      await generateReflectionsPDF(reflections);
    } finally {
      setGenerating(false);
    }
  }

  const disabled = reflections.length === 0 || generating;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reflections</p>
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
          {reflections.length}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Download every end-of-day reflection you&apos;ve written, up through today.
      </p>

      <Button
        type="button"
        onClick={handleDownload}
        disabled={disabled}
        variant="outline"
        className="mt-4 w-full"
      >
        <Download size={15} />
        {generating
          ? "Preparing…"
          : reflections.length === 0
            ? "No reflections yet"
            : "Download PDF"}
      </Button>
    </section>
  );
}
