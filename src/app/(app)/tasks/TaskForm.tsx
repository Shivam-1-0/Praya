"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTask, updateTask } from "./actions";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: "low" | "medium" | "high" | null;
};

export function TaskForm({
  task,
  defaultDueDate,
  onDone,
  onCancel,
}: {
  task?: Task;
  defaultDueDate: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [dueDate, setDueDate] = useState(task?.due_date ?? defaultDueDate);
  const [priority, setPriority] = useState<NonNullable<Task["priority"]> | "">(
    task?.priority ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const input = { title, description, dueDate, priority };
    const result = task ? await updateTask(task.id, input) : await createTask(input);

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
        <Label htmlFor="task-title">Title</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Submit quarterly report"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="task-description">Note (optional)</Label>
        <Input
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Attach the final numbers"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="task-due-date">Due date</Label>
          <Input
            id="task-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="task-priority">Priority</Label>
          <select
            id="task-priority"
            value={priority ?? ""}
            onChange={(e) => setPriority(e.target.value as NonNullable<Task["priority"]> | "")}
            className="h-9 w-full rounded-lg border border-border bg-input px-3 text-sm"
          >
            <option value="">None</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : task ? "Save changes" : "Add task"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
