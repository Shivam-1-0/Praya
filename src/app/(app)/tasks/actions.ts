"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";

type ActionResult = { error?: string };

type TaskInput = {
  title: string;
  description: string;
  dueDate: string;
  priority: "low" | "medium" | "high" | "";
};

export async function createTask(input: TaskInput): Promise<ActionResult> {
  const title = input.title.trim();
  if (!title) return { error: "Title is required." };
  if (!input.dueDate) return { error: "Due date is required." };

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    title,
    description: input.description.trim() || null,
    due_date: input.dueDate,
    priority: input.priority || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/tasks");
  return {};
}

export async function updateTask(id: string, input: TaskInput): Promise<ActionResult> {
  const title = input.title.trim();
  if (!title) return { error: "Title is required." };
  if (!input.dueDate) return { error: "Due date is required." };

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("tasks")
    .update({
      title,
      description: input.description.trim() || null,
      due_date: input.dueDate,
      priority: input.priority || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/tasks");
  return {};
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("tasks")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/tasks");
  return {};
}
