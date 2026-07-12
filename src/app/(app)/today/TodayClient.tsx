"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Sparkles, CircleCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CheckToggle } from "@/components/CheckToggle";
import { toggleCompletion } from "@/lib/completions-actions";

type HabitItem = {
  id: string;
  title: string;
  frequency_type: "daily" | "weekly" | "custom_days";
  is_important: boolean;
  complete: boolean;
};

type TaskItem = {
  id: string;
  title: string;
  priority: "low" | "medium" | "high" | null;
  complete: boolean;
};

const FREQUENCY_LABEL: Record<HabitItem["frequency_type"], string> = {
  daily: "Daily",
  weekly: "Weekly",
  custom_days: "Custom days",
};

function keyOf(type: "habit" | "task", id: string) {
  return `${type}:${id}`;
}

export function TodayClient({
  weekday,
  greeting,
  name,
  dateLabel,
  today,
  habits,
  tasks,
  reviewedScore,
}: {
  weekday: string;
  greeting: string;
  name: string | null;
  dateLabel: string;
  today: string;
  habits: HabitItem[];
  tasks: TaskItem[];
  reviewedScore: number | null;
}) {
  const [done, setDone] = useState<Set<string>>(
    () =>
      new Set([
        ...habits.filter((h) => h.complete).map((h) => keyOf("habit", h.id)),
        ...tasks.filter((t) => t.complete).map((t) => keyOf("task", t.id)),
      ]),
  );
  const [, startTransition] = useTransition();

  function toggle(type: "habit" | "task", id: string) {
    const key = keyOf(type, id);
    const wasDone = done.has(key);

    setDone((prev) => {
      const next = new Set(prev);
      if (wasDone) next.delete(key);
      else next.add(key);
      return next;
    });

    startTransition(async () => {
      const res = await toggleCompletion(type, id, today);
      if (res.error) {
        setDone((prev) => {
          const next = new Set(prev);
          if (wasDone) next.add(key);
          else next.delete(key);
          return next;
        });
      }
    });
  }

  const totalItems = habits.length + tasks.length;
  const doneCount = done.size;
  const pct = totalItems === 0 ? 0 : Math.round((doneCount / totalItems) * 100);
  const habitsDone = habits.filter((h) => done.has(keyOf("habit", h.id))).length;
  const tasksDone = tasks.filter((t) => done.has(keyOf("task", t.id))).length;

  const metric = (
    <div className="flex items-stretch divide-x divide-border overflow-hidden rounded-2xl border border-border bg-card">
      <div className="px-5 py-3">
        <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Done today</p>
        <p className="mt-1 text-2xl font-semibold">
          <span className="text-primary">{doneCount}</span>
          <span className="text-lg text-muted-foreground"> / {totalItems}</span>
        </p>
      </div>
      <div className="px-5 py-3">
        <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Completion</p>
        <p className="mt-1 text-2xl font-semibold text-primary">{pct}%</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Today's agenda"
        title={weekday}
        subtitle={`${greeting}${name ? `, ${name}` : ""} · ${dateLabel}`}
        right={metric}
      />

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <ItemCard
          label="Habits"
          countDone={habitsDone}
          countTotal={habits.length}
          emptyText="No habits scheduled today."
          addHref="/habits"
          addLabel="Add habit"
        >
          {habits.map((habit) => {
            const isDone = done.has(keyOf("habit", habit.id));
            return (
              <div key={habit.id} className="flex items-center gap-3 py-3">
                <CheckToggle
                  shape="square"
                  done={isDone}
                  label={habit.title}
                  onClick={() => toggle("habit", habit.id)}
                />
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium text-muted-foreground">
                  {habit.title.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`truncate text-sm font-medium ${isDone ? "text-muted-foreground" : ""}`}>
                      {habit.title}
                    </p>
                    {habit.is_important ? (
                      <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Important" />
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{FREQUENCY_LABEL[habit.frequency_type]}</p>
                </div>
              </div>
            );
          })}
        </ItemCard>

        <ItemCard
          label="Tasks"
          countDone={tasksDone}
          countTotal={tasks.length}
          emptyText="Nothing due today."
          addHref="/tasks"
          addLabel="Add task"
        >
          {tasks.map((task) => {
            const isDone = done.has(keyOf("task", task.id));
            return (
              <div key={task.id} className="flex items-center gap-3 py-3">
                <CheckToggle
                  shape="circle"
                  done={isDone}
                  label={task.title}
                  onClick={() => toggle("task", task.id)}
                />
                <p className={`flex-1 text-sm ${isDone ? "text-muted-foreground line-through" : ""}`}>
                  {task.title}
                </p>
                {task.priority ? (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {task.priority}
                  </span>
                ) : null}
              </div>
            );
          })}
        </ItemCard>
      </div>

      {reviewedScore != null ? (
        <div className="flex items-center justify-between rounded-2xl border border-primary/40 bg-primary/5 p-5">
          <div className="flex items-center gap-3">
            <CircleCheck className="text-primary" size={22} strokeWidth={1.75} />
            <div>
              <p className="text-sm font-medium text-primary">Day closed</p>
              <p className="text-xs text-muted-foreground">
                Your reflection is saved. Score locked at {reviewedScore}%.
              </p>
            </div>
          </div>
          <Link
            href="/review"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Edit
          </Link>
        </div>
      ) : (
        <Link
          href="/review"
          className="flex items-center justify-between rounded-2xl border border-dashed border-border p-5 transition-colors hover:border-primary/50"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="text-primary" size={22} strokeWidth={1.75} />
            <div>
              <p className="text-sm font-medium">Reflect on today</p>
              <p className="text-xs text-muted-foreground">
                Close the day honestly. Takes a minute.
              </p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">→</span>
        </Link>
      )}
    </div>
  );
}

function ItemCard({
  label,
  countDone,
  countTotal,
  emptyText,
  addHref,
  addLabel,
  children,
}: {
  label: string;
  countDone: number;
  countTotal: number;
  emptyText: string;
  addHref: string;
  addLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <span className="text-xs text-muted-foreground">
          {countDone} of {countTotal} completed
        </span>
      </div>
      <div className="divide-y divide-border">
        {countTotal === 0 ? <p className="py-3 text-sm text-muted-foreground">{emptyText}</p> : children}
      </div>
      <Link
        href={addHref}
        className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Plus size={15} /> {addLabel}
      </Link>
    </section>
  );
}

