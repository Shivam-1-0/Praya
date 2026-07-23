"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Sparkles, X, Send, RotateCcw } from "lucide-react";
import {
  loadVeylaThread,
  sendVeylaMessage,
  resetVeylaThread,
  type VeylaMessage,
} from "@/lib/veyla-actions";

export function VeylaFab() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<VeylaMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  // Load the most recent conversation the first time the panel is opened.
  useEffect(() => {
    if (!open || loaded) return;
    loadVeylaThread()
      .then(({ conversationId, messages }) => {
        setConversationId(conversationId);
        setMessages(messages);
        setLoaded(true);
      })
      .catch((e) => setError((e as Error).message));
  }, [open, loaded]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, pending]);

  function handleSend() {
    const text = input.trim();
    if (!text || pending) return;

    const optimistic: VeylaMessage = {
      id: `pending-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setInput("");
    setError(null);

    startTransition(async () => {
      try {
        const { conversationId: newId, assistant } = await sendVeylaMessage(conversationId, text);
        setConversationId(newId);
        setMessages((m) => [...m, assistant]);
      } catch (e) {
        setError((e as Error).message);
        setMessages((m) => m.filter((msg) => msg.id !== optimistic.id));
      }
    });
  }

  async function handleReset() {
    if (!confirm("Clear this Veyla conversation? Messages will be deleted.")) return;
    await resetVeylaThread();
    setMessages([]);
    setConversationId(null);
    setError(null);
  }

  return (
    <div className="fixed bottom-24 right-5 z-30 md:bottom-6 md:right-6">
      {open ? (
        <div className="mb-3 flex h-[28rem] w-80 flex-col rounded-2xl border border-border bg-card shadow-lg md:w-96">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              <span className="text-sm font-medium">Veyla</span>
            </div>
            <div className="flex items-center gap-3">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleReset}
                  aria-label="Clear conversation"
                  className="text-muted-foreground hover:text-foreground"
                  title="Clear"
                >
                  <RotateCcw size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {!loaded ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : messages.length === 0 ? (
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Hi, I&apos;m Veyla. I can answer questions about your habits, tasks, and today&apos;s
                  progress.
                </p>
                <p className="text-xs text-muted-foreground">
                  Try &quot;how am I doing today?&quot; or &quot;which important habits are pending?&quot;
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                      m.role === "user"
                        ? "bg-primary/15 text-foreground"
                        : "border border-border bg-background text-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {pending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                  <span className="inline-flex gap-1">
                    <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                    <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
                    <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
            {error && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                {error}
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-border px-3 py-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={pending}
              placeholder="Ask Veyla…"
              className="flex-1 rounded-full border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary/50 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || pending}
              aria-label="Send"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Veyla"
        className="ml-auto flex size-14 items-center justify-center rounded-full border-2 border-primary bg-card text-primary transition-colors hover:bg-primary/10"
      >
        <Sparkles size={22} strokeWidth={1.75} />
      </button>
    </div>
  );
}
