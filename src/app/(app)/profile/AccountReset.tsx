"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileText, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportAccountData, resetAccountData } from "@/lib/reset-actions";
import { generateReflectionsPDF } from "./reflections-pdf";
import type { ReflectionRow } from "./ReflectionsExport";

export function AccountReset({ reflections }: { reflections: ReflectionRow[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [pdfDone, setPdfDone] = useState(false);
  const [jsonDone, setJsonDone] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState<null | "pdf" | "json" | "reset">(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handlePdf() {
    setBusy("pdf");
    setError(null);
    try {
      await generateReflectionsPDF(reflections);
      setPdfDone(true);
    } catch (e) {
      setError((e as Error).message || "PDF export failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleJson() {
    setBusy("json");
    setError(null);
    try {
      const data = await exportAccountData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `praya-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setJsonDone(true);
    } catch (e) {
      setError((e as Error).message || "JSON export failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleReset() {
    setBusy("reset");
    setError(null);
    try {
      await resetAccountData();
      startTransition(() => {
        router.push("/today");
        router.refresh();
      });
    } catch (e) {
      setError((e as Error).message || "Reset failed");
      setBusy(null);
    }
  }

  const canReset = pdfDone && jsonDone && confirm === "RESET" && busy === null && !pending;

  return (
    <section className="rounded-2xl border border-destructive/40 bg-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <AlertTriangle size={14} className="text-destructive" />
        <p className="text-xs uppercase tracking-[0.2em] text-destructive">Danger zone</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Reset your account back to a blank slate. Your habits, tasks, completions,
        reviews, Veyla history, and API keys are permanently deleted. Your login,
        email, and profile stay.
      </p>

      {!expanded ? (
        <Button
          type="button"
          onClick={() => setExpanded(true)}
          variant="outline"
          className="mt-4 w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 size={15} />
          Reset all data
        </Button>
      ) : (
        <div className="mt-4 space-y-3">
          <Step
            index={1}
            title="Download reflections PDF"
            done={pdfDone}
            action={
              <Button
                type="button"
                onClick={handlePdf}
                disabled={busy !== null || reflections.length === 0}
                variant="outline"
                size="sm"
              >
                <FileText size={13} />
                {busy === "pdf"
                  ? "Preparing…"
                  : reflections.length === 0
                    ? "No reflections"
                    : pdfDone
                      ? "Downloaded"
                      : "Download PDF"}
              </Button>
            }
            note={
              reflections.length === 0
                ? "You have no completed reviews to export — skip enabled."
                : null
            }
            skippable={reflections.length === 0}
            onSkip={() => setPdfDone(true)}
          />

          <Step
            index={2}
            title="Download full data (JSON)"
            done={jsonDone}
            action={
              <Button
                type="button"
                onClick={handleJson}
                disabled={busy !== null}
                variant="outline"
                size="sm"
              >
                <Download size={13} />
                {busy === "json" ? "Preparing…" : jsonDone ? "Downloaded" : "Download JSON"}
              </Button>
            }
          />

          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-medium">
              <span className="mr-2 text-muted-foreground">3.</span>
              Type <span className="font-mono text-destructive">RESET</span> to confirm
            </p>
            <input
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={!pdfDone || !jsonDone || busy !== null}
              placeholder="RESET"
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm disabled:opacity-40"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => {
                setExpanded(false);
                setPdfDone(false);
                setJsonDone(false);
                setConfirm("");
                setError(null);
              }}
              disabled={busy !== null || pending}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleReset}
              disabled={!canReset}
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy === "reset" || pending ? "Erasing…" : "Erase everything"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function Step({
  index,
  title,
  done,
  action,
  note,
  skippable,
  onSkip,
}: {
  index: number;
  title: string;
  done: boolean;
  action: React.ReactNode;
  note?: string | null;
  skippable?: boolean;
  onSkip?: () => void;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        done ? "border-primary/40 bg-primary/5" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium">
          <span className="mr-2 text-muted-foreground">{index}.</span>
          {title}
          {done && <span className="ml-2 text-primary">✓</span>}
        </p>
        {skippable && !done ? (
          <Button type="button" onClick={onSkip} variant="outline" size="sm">
            Skip
          </Button>
        ) : (
          action
        )}
      </div>
      {note && <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>}
    </div>
  );
}
