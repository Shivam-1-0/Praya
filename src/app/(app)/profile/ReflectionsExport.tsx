"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

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

const SATISFACTION_LABEL: Record<number, string> = {
  1: "Wasted day",
  2: "Dissatisfied",
  3: "Somewhat satisfied",
  4: "Very satisfied",
  5: "Extremely satisfied",
};

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ReflectionsExport({ reflections }: { reflections: ReflectionRow[] }) {
  const [generating, setGenerating] = useState(false);

  async function handleDownload() {
    setGenerating(true);
    try {
      // Lazy import so jspdf only ships to the client when actually used.
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 56;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("Praya — Reflections journal", margin, y);
      y += 22;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(120);
      const exportedOn = new Date().toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      doc.text(
        `Exported ${exportedOn}  ·  ${reflections.length} reflection${reflections.length === 1 ? "" : "s"}`,
        margin,
        y,
      );
      y += 24;
      doc.setTextColor(0);

      const ensureRoom = (needed: number) => {
        if (y + needed > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      for (const r of reflections) {
        ensureRoom(80);

        // Divider
        doc.setDrawColor(210);
        doc.line(margin, y, pageWidth - margin, y);
        y += 20;

        // Date + score + satisfaction
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(formatDate(r.review_date), margin, y);
        y += 16;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(120);
        const meta = [
          r.day_score != null ? `Score ${r.day_score}%` : null,
          r.satisfaction_rating != null ? SATISFACTION_LABEL[r.satisfaction_rating] : null,
        ]
          .filter(Boolean)
          .join("  ·  ");
        if (meta) {
          doc.text(meta, margin, y);
          y += 18;
        }
        doc.setTextColor(0);

        // Reflection body
        if (r.reflection_text) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(11);
          const lines = doc.splitTextToSize(r.reflection_text, contentWidth) as string[];
          for (const line of lines) {
            ensureRoom(16);
            doc.text(line, margin, y);
            y += 15;
          }
          y += 4;
        }

        // Missed items
        if (r.items.length > 0) {
          ensureRoom(20);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(120);
          doc.text("MISSED ITEMS", margin, y);
          doc.setTextColor(0);
          y += 14;

          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          for (const item of r.items) {
            const validTag =
              item.is_valid === true ? " · valid" : item.is_valid === false ? " · on me" : "";
            const head = `• ${item.title} (${item.kind})${validTag}`;
            const reasonLines = item.reason
              ? (doc.splitTextToSize(item.reason, contentWidth - 12) as string[])
              : [];
            ensureRoom(14 + reasonLines.length * 13);
            doc.text(head, margin, y);
            y += 13;
            if (reasonLines.length > 0) {
              doc.setTextColor(80);
              for (const line of reasonLines) {
                doc.text(line, margin + 12, y);
                y += 13;
              }
              doc.setTextColor(0);
            }
            y += 2;
          }
        }

        y += 12;
      }

      doc.save(`praya-reflections-${new Date().toISOString().slice(0, 10)}.pdf`);
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
