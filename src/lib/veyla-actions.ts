"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import {
  getGeminiClient,
  VEYLA_MODEL,
  VEYLA_SYSTEM_PROMPT,
  getVeylaSnapshot,
  renderSnapshotForPrompt,
} from "@/lib/veyla";

export type VeylaMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

// Load the user's most recent conversation and its messages. If there's no
// conversation yet, returns { conversationId: null, messages: [] }.
export async function loadVeylaThread(): Promise<{
  conversationId: string | null;
  messages: VeylaMessage[];
}> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { conversationId: null, messages: [] };

  const { data: convo } = await supabase
    .from("veyla_conversations")
    .select("id")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!convo) return { conversationId: null, messages: [] };

  const { data: messages } = await supabase
    .from("veyla_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", convo.id)
    .order("created_at", { ascending: true });

  return {
    conversationId: convo.id,
    messages: (messages ?? []) as VeylaMessage[],
  };
}

export async function sendVeylaMessage(
  conversationId: string | null,
  userMessage: string,
): Promise<{ conversationId: string; assistant: VeylaMessage }> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const trimmed = userMessage.trim();
  if (!trimmed) throw new Error("Empty message");

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("user_id", user.id)
    .single();
  const timezone = profile?.timezone ?? "UTC";

  // Create the conversation lazily on first message.
  let convoId = conversationId;
  if (!convoId) {
    const { data: newConvo, error } = await supabase
      .from("veyla_conversations")
      .insert({ user_id: user.id, title: trimmed.slice(0, 60) })
      .select("id")
      .single();
    if (error || !newConvo) throw new Error(`Failed to create conversation: ${error?.message}`);
    convoId = newConvo.id;
  }

  await supabase
    .from("veyla_messages")
    .insert({ conversation_id: convoId, user_id: user.id, role: "user", content: trimmed });

  // Fetch history (already includes the user message we just wrote).
  const { data: history } = await supabase
    .from("veyla_messages")
    .select("role, content")
    .eq("conversation_id", convoId)
    .order("created_at", { ascending: true });

  const snapshot = await getVeylaSnapshot(supabase, user.id, timezone);
  const snapshotBlock = renderSnapshotForPrompt(snapshot);

  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model: VEYLA_MODEL,
    contents: (history ?? []).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    config: {
      systemInstruction: `${VEYLA_SYSTEM_PROMPT}\n\n${snapshotBlock}`,
      temperature: 0.4,
      maxOutputTokens: 500,
    },
  });

  const assistantText = response.text?.trim() || "I'm not sure how to answer that.";

  const { data: saved, error: saveErr } = await supabase
    .from("veyla_messages")
    .insert({
      conversation_id: convoId,
      user_id: user.id,
      role: "assistant",
      content: assistantText,
    })
    .select("id, role, content, created_at")
    .single();

  if (saveErr || !saved) throw new Error(`Failed to save assistant message: ${saveErr?.message}`);

  await supabase
    .from("veyla_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", convoId);

  return {
    conversationId: convoId!,
    assistant: saved as VeylaMessage,
  };
}

export async function resetVeylaThread(): Promise<void> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("veyla_conversations").delete().eq("user_id", user.id);
}
