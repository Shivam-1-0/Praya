"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Sparkles, CircleCheck, ArrowRight } from "lucide-react";
import { CheckToggle } from "@/components/CheckToggle";
import { RingMeter } from "@/components/RingMeter";
import { Stagger, FadeIn } from "@/components/motion";
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

  return (
    <div className="space-y-8">
      {/* Serif greeting */}
      <FadeIn>
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground">
            Today
          </p>
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-muted-foreground tabular">
            {dateLabel}
          </p>
        </div>
        <h1 className="mt-3 font-serif text-5xl font-normal leading-[1.05] tracking-tight md:text-6xl">
          {greeting}
          {name ? (
            <>
              ,<br />
              <span className="italic text-primary">{name}.</span>
            </>
          ) : (
            "."
          )}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {weekday} · {totalItems === 0 ? "Nothing scheduled" : `${totalItems} things to tend to`}
        </p>
      </FadeIn>

      {/* Ring meter + rhythm */}
      <FadeIn delay={0.05}>
        <div className="flex items-center gap-6 rounded-2xl border border-border bg-card p-6">
          <RingMeter pct={pct} />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
              Today&apos;s rhythm
            </p>
            <p className="mt-1 font-serif text-2xl tabular">
              {doneCount} <span className="text-base text-muted-foreground">of {totalItems}</span>
            </p>
            <p className="mt-1 text-xs italic text-muted-foreground">
              {pct === 100 && totalItems > 0
                ? "A full day, kept."
                : pct >= 60
                  ? "On pace for a good day."
                  : "Room to make it count."}
            </p>
          </div>
        </div>
      </FadeIn>

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
              <Stagger.Item key={habit.id}>
                <div className="flex items-center gap-3 py-3">
                  <CheckToggle
                    shape="square"
                    done={isDone}
                    label={habit.title}
                    onClick={() => toggle("habit", habit.id)}
                  />
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary font-serif text-sm italic text-primary">
                    {habit.title.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`truncate text-sm font-medium ${isDone ? "text-muted-foreground line-through decoration-border" : ""}`}>
                        {habit.title}
                      </p>
                      {habit.is_important ? (
                        <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Important" />
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">{FREQUENCY_LABEL[habit.frequency_type]}</p>
                  </div>
                </div>
              </Stagger.Item>
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
              <Stagger.Item key={task.id}>
                <div className="flex items-center gap-3 py-3">
                  <CheckToggle
                    shape="circle"
                    done={isDone}
                    label={task.title}
                    onClick={() => toggle("task", task.id)}
                  />
                  <p className={`flex-1 text-sm ${isDone ? "text-muted-foreground line-through decoration-border" : ""}`}>
                    {task.title}
                  </p>
                  {task.priority ? (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.15em] ${
                        task.priority === "high"
                          ? "bg-foreground text-accent"
                          : "border border-border text-muted-foreground"
                      }`}
                    >
                      {task.priority}
                    </span>
                  ) : null}
                </div>
              </Stagger.Item>
            );
          })}
        </ItemCard>
      </div>

      {/* Reflect CTA — the one espresso moment */}
      {reviewedScore != null ? (
        <FadeIn>
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
            <Link href="/review" className="text-xs text-muted-foreground hover:text-foreground">
              Edit
            </Link>
          </div>
        </FadeIn>
      ) : (
        <FadeIn>
          <Link
            href="/review"
            className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-foreground p-5 text-background transition-transform hover:scale-[1.005]"
          >
            <span
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 100% 0%, rgba(232,183,118,0.18), transparent 60%)",
              }}
            />
            <Sparkles className="relative text-accent" size={20} strokeWidth={1.75} />
            <div className="relative flex-1">
              <p className="font-serif text-lg">Reflect on today.</p>
              <p className="text-xs text-muted-foreground">One minute. Then rest.</p>
            </div>
            <ArrowRight className="relative text-accent transition-transform group-hover:translate-x-1" size={16} />
          </Link>
        </FadeIn>
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
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
        <span className="text-xs text-muted-foreground tabular">
          {countDone} of {countTotal}
        </span>
      </div>
      <Stagger className="divide-y divide-border">
        {countTotal === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          children
        )}
      </Stagger>
      <Link
        href={addHref}
        className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <Plus size={15} /> {addLabel}
      </Link>
    </section>
  );
}
