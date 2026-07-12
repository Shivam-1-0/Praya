"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Chip } from "@/components/Chip";
import { createApiKey, revokeApiKey } from "./api-keys-actions";

export type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ApiKeysPanel({ keys }: { keys: ApiKeyRow[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<{ raw: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await createApiKey(name);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setNewKey({ raw: res.rawKey!, name: res.name! });
    setName("");
    setShowForm(false);
    router.refresh();
  }

  async function handleRevoke(id: string) {
    setPendingId(id);
    await revokeApiKey(id);
    setPendingId(null);
    router.refresh();
  }

  async function copyKey() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey.raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">API keys</p>
        <Chip>{keys.length}</Chip>
      </div>
      <p className="text-sm text-muted-foreground">
        Connect Praya to n8n, Zapier, or your own scripts.
      </p>

      {newKey ? (
        <div className="mt-4 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-primary">
            Copy your key now
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            This is the only time you&apos;ll see the full key. Store it somewhere safe.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs">
              {newKey.raw}
            </code>
            <Button type="button" onClick={copyKey} variant="outline">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setNewKey(null)}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground"
          >
            I&apos;ve saved it, dismiss
          </button>
        </div>
      ) : null}

      <div className="mt-5 space-y-2">
        {keys.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground">No keys yet.</p>
        ) : null}
        {keys.map((key) => (
          <div
            key={key.id}
            className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{key.name}</p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">{key.key_prefix}…</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {key.last_used_at ? `Last used ${formatDate(key.last_used_at)}` : "Never used"}
                {" · "}Created {formatDate(key.created_at)}
              </p>
            </div>
            <button
              type="button"
              disabled={pendingId === key.id}
              onClick={() => handleRevoke(key.id)}
              aria-label={`Revoke ${key.name}`}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive disabled:opacity-40"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {showForm ? (
        <form onSubmit={handleCreate} className="mt-4 space-y-3 rounded-xl border border-border p-4">
          <div className="space-y-1.5">
            <Label htmlFor="key-name">Name</Label>
            <Input
              id="key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="n8n roast agent"
              required
              autoFocus
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create key"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Plus size={15} /> New API key
        </button>
      )}
    </section>
  );
}
