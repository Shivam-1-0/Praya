"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitReview } from "./actions";

const SATISFACTION_OPTIONS = [
  { value: 1, label: "Wasted" },
  { value: 2, label: "Dissatisfied" },
  { value: 3, label: "Somewhat" },
  { value: 4, label: "Very" },
  { value: 5, label: "Extremely" },
] as const;

export type MissedItem = {
  item_type: "habit" | "task";
  item_id: string;
  title: string;
};

type ItemState = { reason: string; isValid: boolean | null };

export function ReviewClient({
  missedItems,
  initialSatisfaction,
  initialReflection,
}: {
  missedItems: MissedItem[];
  initialSatisfaction: number | null;
  initialReflection: string;
}) {
  const [items, setItems] = useState<Record<string, ItemState>>(() => {
    const seed: Record<string, ItemState> = {};
    for (const m of missedItems) {
      seed[`${m.item_type}:${m.item_id}`] = { reason: "", isValid: null };
    }
    return seed;
  });
  const [satisfaction, setSatisfaction] = useState<number | null>(initialSatisfaction);
  const [reflection, setReflection] = useState(initialReflection);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(key: string, patch: Partial<ItemState>) {
    setItems((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (satisfaction == null) {
      setError("Pick how the day felt overall.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const missed = missedItems.map((m) => {
      const key = `${m.item_type}:${m.item_id}`;
      return {
        itemType: m.item_type,
        itemId: m.item_id,
        reasonText: items[key].reason,
        isValid: items[key].isValid,
      };
    });

    const res = await submitReview({
      satisfactionRating: satisfaction,
      reflectionText: reflection,
      missed,
    });
    if (res && "error" in res && res.error) {
      setError(res.error);
      setSubmitting(false);
    }
    // On success submitReview redirects; no need to reset state.
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {missedItems.length > 0 ? (
        <section className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Missed items</p>
            <p className="mt-1 text-sm text-muted-foreground">
              For each item you didn&apos;t finish, note why — and be honest about whether that
              reason was valid.
            </p>
          </div>
          <div className="space-y-3">
            {missedItems.map((m) => {
              const key = `${m.item_type}:${m.item_id}`;
              const state = items[key];
              return (
                <div key={key} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{m.title}</p>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                      {m.item_type}
                    </span>
                  </div>
                  <textarea
                    value={state.reason}
                    onChange={(e) => updateItem(key, { reason: e.target.value })}
                    placeholder="Why did this slip?"
                    rows={2}
                    className="mt-3 w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ValidityButton
                      active={state.isValid === true}
                      onClick={() => updateItem(key, { isValid: state.isValid === true ? null : true })}
                      icon={<CheckCircle2 size={14} />}
                    >
                      Valid reason
                    </ValidityButton>
                    <ValidityButton
                      active={state.isValid === false}
                      onClick={() => updateItem(key, { isValid: state.isValid === false ? null : false })}
                      icon={<XCircle size={14} />}
                    >
                      Invalid — on me
                    </ValidityButton>
                    <ValidityButton
                      active={state.isValid == null}
                      onClick={() => updateItem(key, { isValid: null })}
                      icon={<HelpCircle size={14} />}
                    >
                      Skip
                    </ValidityButton>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">How did today feel?</p>
        <div className="grid grid-cols-5 gap-2">
          {SATISFACTION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSatisfaction(opt.value)}
              className={`rounded-xl border py-3 text-center transition-colors ${
                satisfaction === opt.value
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <p className="text-lg font-semibold">{opt.value}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.08em]">{opt.label}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reflection</p>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="What did today teach you?"
          rows={4}
          className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Saving…" : "Close the day"}
      </Button>
    </form>
  );
}

function ValidityButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-primary text-primary"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
