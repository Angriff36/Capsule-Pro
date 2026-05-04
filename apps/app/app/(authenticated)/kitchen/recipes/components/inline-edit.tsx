"use client";

import { cn } from "@repo/design-system/lib/utils";
import { Check, Pencil, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";

interface InlineTextInputProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  className?: string;
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
          "group/edit inline-flex items-center gap-1 rounded-md border border-transparent px-1.5 py-0.5 -ml-1.5 text-left cursor-pointer outline-none transition-all",
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
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/edit:opacity-100 transition-opacity shrink-0" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-ring bg-background px-1 py-0.5",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        className="h-6 px-0.5 text-sm bg-transparent outline-none w-full min-w-[100px]"
        disabled={isPending}
        onBlur={save}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") cancel();
        }}
        ref={inputRef}
        value={draft}
      />
      <button
        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-[var(--brand-leafy-green)] hover:bg-muted disabled:opacity-30 transition-colors"
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
        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-muted disabled:opacity-30 transition-colors"
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
  value: string | null;
  onSave: (value: string) => Promise<void>;
  className?: string;
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
          "group/edit inline-flex items-center gap-1 rounded-md border border-transparent px-1.5 py-0.5 -ml-1.5 text-left cursor-pointer outline-none transition-all",
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
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/edit:opacity-100 transition-opacity shrink-0" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-ring bg-background px-1 py-0.5",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <span className="text-muted-foreground text-xs">$</span>
      <input
        autoFocus
        className="h-6 w-20 px-0.5 text-sm bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        disabled={isPending}
        min="0"
        onBlur={save}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") cancel();
        }}
        ref={inputRef}
        step="0.01"
        type="number"
        value={draft}
      />
      <button
        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-[var(--brand-leafy-green)] hover:bg-muted disabled:opacity-30 transition-colors"
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
        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-muted disabled:opacity-30 transition-colors"
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
