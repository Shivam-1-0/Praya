"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";

// Veyla's launcher is part of the visual identity (present on every screen).
// The assistant itself lands in a later phase — for now the panel says so
// rather than pretending to chat.
export function VeylaFab() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-24 right-5 z-30 md:bottom-6 md:right-6">
      {open ? (
        <div className="mb-3 w-64 rounded-2xl border border-border bg-card p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              <span className="text-sm font-medium">Veyla</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Your grounded assistant is coming in a later update.
          </p>
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
