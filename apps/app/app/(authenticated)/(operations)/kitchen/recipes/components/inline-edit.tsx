"use client";

import { cn } from "@repo/design-system/lib/utils";
import { Check, Pencil, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";

interface InlineTextInputProps {
  className?: string;
  onSave: (value: string) => Promise<void>;
  value: string;
}

export function InlineTextInput({
  value,
  onSave,
  className,
}: InlineTextInputProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const save = () => {
    if (!draft.trim() || draft === value) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      try {
        await onSave(draft);
        setEditing(false);
      } catch {
        setDraft(value);
        setEditing(false);
      }
    });
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        className={cn(
          "group/edit -ml-1.5 inline-flex cursor-pointer items-center gap-1 rounded-sm border border-transparent px-1.5 py-0.5 text-left outline-none transition-all",
          "hover:border-border hover:bg-muted/60 focus-visible:ring-1 focus-visible:ring-ring",
          className
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startEdit();
        }}
        type="button"
      >
        <span className="truncate">{value}</span>
        <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/edit:opacity-100" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border border-ring bg-background px-1 py-0.5",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        className="h-6 w-full min-w-[100px] bg-transparent px-0.5 text-sm outline-none"
        disabled={isPending}
        onBlur={save}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            save();
          }
          if (e.key === "Escape") {
            cancel();
          }
        }}
        ref={inputRef}
        value={draft}
      />
      <button
        className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-[var(--brand-leafy-green)] disabled:opacity-30"
        disabled={isPending || !draft.trim() || draft === value}
        onClick={(e) => {
          e.stopPropagation();
          save();
        }}
        type="button"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:opacity-30"
        disabled={isPending}
        onClick={(e) => {
          e.stopPropagation();
          cancel();
        }}
        type="button"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface InlinePriceInputProps {
  className?: string;
  onSave: (value: string) => Promise<void>;
  value: string | null;
}

export function InlinePriceInput({
  value,
  onSave,
  className,
}: InlinePriceInputProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(value ?? "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const save = () => {
    const num = Number.parseFloat(draft);
    if (Number.isNaN(num) || num < 0) {
      setEditing(false);
      return;
    }
    const newPrice = num === 0 ? "" : draft;
    if (newPrice === (value ?? "")) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      try {
        await onSave(draft);
        setEditing(false);
      } catch {
        setDraft(value ?? "");
        setEditing(false);
      }
    });
  };

  const cancel = () => {
    setDraft(value ?? "");
    setEditing(false);
  };

  const displayValue = value ? `$${Number(value).toFixed(2)}` : "\u2014";

  if (!editing) {
    return (
      <button
        className={cn(
          "group/edit -ml-1.5 inline-flex cursor-pointer items-center gap-1 rounded-sm border border-transparent px-1.5 py-0.5 text-left outline-none transition-all",
          "hover:border-border hover:bg-muted/60 focus-visible:ring-1 focus-visible:ring-ring",
          className
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startEdit();
        }}
        type="button"
      >
        <span>{displayValue}</span>
        <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/edit:opacity-100" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border border-ring bg-background px-1 py-0.5",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <span className="text-muted-foreground text-xs">$</span>
      <input
        autoFocus
        className="h-6 w-20 bg-transparent px-0.5 text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        disabled={isPending}
        min="0"
        onBlur={save}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            save();
          }
          if (e.key === "Escape") {
            cancel();
          }
        }}
        ref={inputRef}
        step="0.01"
        type="number"
        value={draft}
      />
      <button
        className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-[var(--brand-leafy-green)] disabled:opacity-30"
        disabled={isPending}
        onClick={(e) => {
          e.stopPropagation();
          save();
        }}
        type="button"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:opacity-30"
        disabled={isPending}
        onClick={(e) => {
          e.stopPropagation();
          cancel();
        }}
        type="button"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
