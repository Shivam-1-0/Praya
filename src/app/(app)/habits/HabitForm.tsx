"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createHabit, updateHabit } from "./actions";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type Habit = {
  id: string;
  title: string;
  description: string | null;
  frequency_type: "daily" | "weekly" | "custom_days";
  custom_days: number[] | null;
  is_important: boolean;
};

export function HabitForm({
  habit,
  importantCount,
  onDone,
  onCancel,
}: {
  habit?: Habit;
  importantCount: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(habit?.title ?? "");
  const [description, setDescription] = useState(habit?.description ?? "");
  const [frequencyType, setFrequencyType] = useState<Habit["frequency_type"]>(
    habit?.frequency_type ?? "daily",
  );
  const [customDays, setCustomDays] = useState<number[]>(habit?.custom_days ?? []);
  const [isImportant, setIsImportant] = useState(habit?.is_important ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importantLocked = !isImportant && importantCount >= 3;

  function toggleDay(day: number) {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const input = { title, description, frequencyType, customDays, isImportant };
    const result = habit ? await updateHabit(habit.id, input) : await createHabit(input);

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-border bg-card p-5"
    >
      <div className="space-y-1.5">
        <Label htmlFor="habit-title">Title</Label>
        <Input
          id="habit-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Read 20 pages"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="habit-description">Note (optional)</Label>
        <Input
          id="habit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Any night, before bed"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="habit-frequency">Frequency</Label>
        <select
          id="habit-frequency"
          value={frequencyType}
          onChange={(e) => setFrequencyType(e.target.value as Habit["frequency_type"])}
          className="h-9 w-full rounded-lg border border-border bg-input px-3 text-sm"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="custom_days">Custom days</option>
        </select>
      </div>

      {frequencyType === "custom_days" ? (
        <div className="space-y-1.5">
          <Label>Days</Label>
          <div className="flex gap-1.5">
            {DAYS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => toggleDay(i)}
                className={`flex size-9 items-center justify-center rounded-full border text-xs transition-colors ${
                  customDays.includes(i)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {label[0]}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isImportant}
          disabled={importantLocked}
          onChange={(e) => setIsImportant(e.target.checked)}
          className="size-4 rounded border-border accent-primary"
        />
        Important habit
        <span className="text-xs text-muted-foreground">
          {importantLocked ? "(max 3 reached)" : "(max 3 active)"}
        </span>
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : habit ? "Save changes" : "Add habit"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
