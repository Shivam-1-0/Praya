"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Archive, RotateCcw, CalendarDays, Star, ChevronUp, ChevronDown } from "lucide-react";
import { Chip } from "@/components/Chip";
import { CheckToggle } from "@/components/CheckToggle";
import { Stagger } from "@/components/motion";
import { frequencyLabel } from "@/lib/habits";
import { toggleCompletion } from "@/lib/completions-actions";
import { HabitForm, type Habit } from "./HabitForm";
import { archiveHabit, restoreHabit, reorderHabits } from "./actions";

type ActiveHabit = Habit & { complete: boolean };

export function HabitsClient({
  activeHabits,
  archivedHabits,
  today,
}: {
  activeHabits: ActiveHabit[];
  archivedHabits: Habit[];
  today: string;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(
    () => new Set(activeHabits.filter((h) => h.complete).map((h) => h.id)),
  );
  const [, startTransition] = useTransition();

  // Local order so up/down feels instant. Re-seed only when the SET of active
  // habits changes (create/archive/edit) — a pure reorder keeps membership the
  // same, so the optimistic order survives the router.refresh() that follows.
  const [ordered, setOrdered] = useState<ActiveHabit[]>(activeHabits);
  const membershipKey = activeHabits.map((h) => h.id).sort().join(",");
  const seededKey = useRef(membershipKey);
  if (seededKey.current !== membershipKey) {
    seededKey.current = membershipKey;
    setOrdered(activeHabits);
  }

  const importantCount = activeHabits.filter((h) => h.is_important).length;

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= ordered.length) return;
    const next = ordered.slice();
    [next[index], next[target]] = [next[target], next[index]];
    setOrdered(next);
    startTransition(async () => {
      await reorderHabits(next.map((h) => h.id));
    });
  }

  function toggle(id: string) {
    const wasDone = done.has(id);
    setDone((prev) => {
      const next = new Set(prev);
      if (wasDone) next.delete(id);
      else next.add(id);
      return next;
    });
    startTransition(async () => {
      const res = await toggleCompletion("habit", id, today);
      if (res.error) {
        setDone((prev) => {
          const next = new Set(prev);
          if (wasDone) next.add(id);
          else next.delete(id);
          return next;
        });
      }
    });
  }

  function openCreate() {
    setEditingHabit(null);
    setShowForm(true);
  }
  function openEdit(habit: Habit) {
    setEditingHabit(habit);
    setShowForm(true);
  }
  function closeForm() {
    setShowForm(false);
    setEditingHabit(null);
  }
  function handleDone() {
    closeForm();
    router.refresh();
  }

  async function handleArchive(id: string) {
    setPendingId(id);
    await archiveHabit(id);
    setPendingId(null);
    router.refresh();
  }
  async function handleRestore(id: string) {
    setPendingId(id);
    await restoreHabit(id);
    setPendingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {showForm ? (
        <HabitForm
          habit={editingHabit ?? undefined}
          importantCount={
            editingHabit ? importantCount - (editingHabit.is_important ? 1 : 0) : importantCount
          }
          onDone={handleDone}
          onCancel={closeForm}
        />
      ) : null}

      {activeHabits.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No habits yet. Add your first one below.</p>
        </div>
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2">
          {ordered.map((habit, index) => {
            const isDone = done.has(habit.id);
            return (
              <Stagger.Item key={habit.id}>
              <div
                className={`relative overflow-hidden rounded-2xl border border-border bg-card p-4 transition-transform hover:-translate-y-0.5 ${
                  habit.is_important ? "pl-5" : ""
                }`}
              >
                {habit.is_important ? (
                  <span className="absolute inset-y-4 left-0 w-1 rounded-full bg-primary" aria-hidden />
                ) : null}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col">
                    <IconButton
                      label="Move up"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      size="sm"
                    >
                      <ChevronUp size={14} />
                    </IconButton>
                    <IconButton
                      label="Move down"
                      disabled={index === ordered.length - 1}
                      onClick={() => move(index, 1)}
                      size="sm"
                    >
                      <ChevronDown size={14} />
                    </IconButton>
                  </div>
                  <CheckToggle
                    shape="square"
                    size="lg"
                    done={isDone}
                    label={habit.title}
                    onClick={() => toggle(habit.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`truncate font-medium ${isDone ? "text-muted-foreground" : ""}`}>
                        {habit.title}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Chip icon={CalendarDays}>{frequencyLabel(habit)}</Chip>
                      {habit.is_important ? (
                        <Chip icon={Star} tone="gold">
                          Important
                        </Chip>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <IconButton label="Edit" onClick={() => openEdit(habit)}>
                      <Pencil size={15} />
                    </IconButton>
                    <IconButton
                      label="Archive"
                      disabled={pendingId === habit.id}
                      onClick={() => handleArchive(habit.id)}
                    >
                      <Archive size={15} />
                    </IconButton>
                  </div>
                </div>
              </div>
              </Stagger.Item>
            );
          })}
        </Stagger>
      )}

      {!showForm ? (
        <button
          type="button"
          onClick={openCreate}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Plus size={16} /> Add habit
        </button>
      ) : null}

      {archivedHabits.length > 0 ? (
        <div>
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
          >
            {showArchived ? "Hide" : "Show"} archived ({archivedHabits.length})
          </button>
          {showArchived ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {archivedHabits.map((habit) => (
                <div
                  key={habit.id}
                  className="flex items-center justify-between rounded-xl border border-border px-4 py-3 opacity-70"
                >
                  <p className="truncate text-sm">{habit.title}</p>
                  <IconButton
                    label="Restore"
                    disabled={pendingId === habit.id}
                    onClick={() => handleRestore(habit.id)}
                  >
                    <RotateCcw size={15} />
                  </IconButton>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  size = "md",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30 ${
        size === "sm" ? "size-5" : "size-8"
      }`}
    >
      {children}
    </button>
  );
}
