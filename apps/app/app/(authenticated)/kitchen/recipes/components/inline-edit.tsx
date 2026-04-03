"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Pencil, X } from "lucide-react";
import { cn } from "@repo/design-system/lib/utils";

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
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startEdit();
        }}
        className={cn(
          "group/edit inline-flex items-center gap-1 rounded-md border border-transparent px-1.5 py-0.5 -ml-1.5 text-left cursor-pointer outline-none transition-all",
          "hover:border-border hover:bg-muted/60 focus-visible:ring-1 focus-visible:ring-ring",
          className
        )}
      >
        <span className="truncate">{value}</span>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/edit:opacity-100 transition-opacity shrink-0" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-ring bg-background px-1 py-0.5 shadow-sm",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") cancel();
        }}
        onBlur={save}
        disabled={isPending}
        className="h-6 px-0.5 text-sm bg-transparent outline-none w-full min-w-[100px]"
        autoFocus
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          save();
        }}
        disabled={isPending || !draft.trim() || draft === value}
        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-[var(--brand-leafy-green)] hover:bg-muted disabled:opacity-30 transition-colors"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          cancel();
        }}
        disabled={isPending}
        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-muted disabled:opacity-30 transition-colors"
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
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          startEdit();
        }}
        className={cn(
          "group/edit inline-flex items-center gap-1 rounded-md border border-transparent px-1.5 py-0.5 -ml-1.5 text-left cursor-pointer outline-none transition-all",
          "hover:border-border hover:bg-muted/60 focus-visible:ring-1 focus-visible:ring-ring",
          className
        )}
      >
        <span>{displayValue}</span>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/edit:opacity-100 transition-opacity shrink-0" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-ring bg-background px-1 py-0.5 shadow-sm",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <span className="text-muted-foreground text-xs">$</span>
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        min="0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") cancel();
        }}
        onBlur={save}
        disabled={isPending}
        className="h-6 w-20 px-0.5 text-sm bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        autoFocus
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          save();
        }}
        disabled={isPending}
        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-[var(--brand-leafy-green)] hover:bg-muted disabled:opacity-30 transition-colors"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          cancel();
        }}
        disabled={isPending}
        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-muted disabled:opacity-30 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
