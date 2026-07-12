"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Flag } from "lucide-react";
import { Chip } from "@/components/Chip";
import { CheckToggle } from "@/components/CheckToggle";
import { toggleCompletion } from "@/lib/completions-actions";
import { TaskForm, type Task } from "./TaskForm";
import { deleteTask } from "./actions";

type TaskRow = Task & { complete: boolean };

function formatDue(due: string, today: string): string {
  if (due === today) return "Today";
  return new Date(`${due}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function TasksClient({ tasks, today }: { tasks: TaskRow[]; today: string }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(
    () => new Set(tasks.filter((t) => t.complete).map((t) => t.id)),
  );
  const [, startTransition] = useTransition();

  const todayTasks = tasks.filter((t) => t.due_date === today);
  const upcomingTasks = tasks.filter((t) => t.due_date > today);
  const pastTasks = tasks.filter((t) => t.due_date < today);

  function toggle(task: TaskRow) {
    const wasDone = done.has(task.id);
    setDone((prev) => {
      const next = new Set(prev);
      if (wasDone) next.delete(task.id);
      else next.add(task.id);
      return next;
    });
    startTransition(async () => {
      const res = await toggleCompletion("task", task.id, task.due_date);
      if (res.error) {
        setDone((prev) => {
          const next = new Set(prev);
          if (wasDone) next.add(task.id);
          else next.delete(task.id);
          return next;
        });
      }
    });
  }

  function openCreate() {
    setEditingTask(null);
    setShowForm(true);
  }
  function openEdit(task: Task) {
    setEditingTask(task);
    setShowForm(true);
  }
  function closeForm() {
    setShowForm(false);
    setEditingTask(null);
  }
  function handleDone() {
    closeForm();
    router.refresh();
  }
  async function handleDelete(id: string) {
    setPendingId(id);
    await deleteTask(id);
    setPendingId(null);
    router.refresh();
  }

  function Row({ task }: { task: TaskRow }) {
    const isDone = done.has(task.id);
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5">
        <CheckToggle
          shape="circle"
          done={isDone}
          label={task.title}
          onClick={() => toggle(task)}
        />
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-medium ${isDone ? "text-muted-foreground line-through" : ""}`}>
            {task.title}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Chip>{formatDue(task.due_date, today)}</Chip>
            {task.priority ? (
              <Chip icon={Flag} tone={task.priority === "high" ? "gold" : "muted"}>
                {task.priority}
              </Chip>
            ) : null}
          </div>
        </div>
        <div className="flex gap-1">
          <IconButton label="Edit" onClick={() => openEdit(task)}>
            <Pencil size={15} />
          </IconButton>
          <IconButton
            label="Delete"
            disabled={pendingId === task.id}
            onClick={() => handleDelete(task.id)}
          >
            <Trash2 size={15} />
          </IconButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {showForm ? (
        <TaskForm
          task={editingTask ?? undefined}
          defaultDueDate={today}
          onDone={handleDone}
          onCancel={closeForm}
        />
      ) : null}

      <Section label="Today">
        {todayTasks.length === 0 ? (
          <EmptyRow>Nothing due today.</EmptyRow>
        ) : (
          todayTasks.map((task) => <Row key={task.id} task={task} />)
        )}
      </Section>

      {upcomingTasks.length > 0 ? (
        <Section label="Upcoming">
          {upcomingTasks.map((task) => (
            <Row key={task.id} task={task} />
          ))}
        </Section>
      ) : null}

      {!showForm ? (
        <button
          type="button"
          onClick={openCreate}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Plus size={16} /> Add task
        </button>
      ) : null}

      {pastTasks.length > 0 ? (
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className="rounded-full border border-border px-4 py-1.5 text-xs uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
          >
            {showPast ? "Hide" : "Show"} past tasks ({pastTasks.length})
          </button>
          {showPast ? (
            <div className="w-full space-y-2.5 opacity-80">
              {pastTasks.map((task) => (
                <Row key={task.id} task={task} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}
