import type { ReflectionRow } from "./ReflectionsExport";

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

export async function generateReflectionsPDF(reflections: ReflectionRow[]): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 56;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

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

    doc.setDrawColor(210);
    doc.line(margin, y, pageWidth - margin, y);
    y += 20;

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
}
