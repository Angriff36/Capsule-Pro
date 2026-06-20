"use client";

/**
 * Click-to-edit for a single scalar field.
 *
 * Renders a value as plain text until clicked; then swaps to an inline input with
 * a save/cancel affordance. Committing (Enter or blur) dispatches the governed
 * update command through the canonical Manifest dispatcher via `executeCommand`
 * (constitution §5/§6) — the UI orchestrates intent only, it does not own the
 * mutation semantics. Escape reverts without dispatching, and an unchanged value
 * commits as a no-op (no command sent).
 *
 * This is the scalar-field sibling of `StatusTransitionBadge` (inline FSM change).
 * Rollout to a new field is a one-line swap of a static value for an
 * `<InlineEditField entity command field value … />`.
 *
 * The component is deliberately command-agnostic: the caller names the entity,
 * the update command, and the param the value maps to. The dispatched body is
 * `{ id, [field]: <coerced value> }`. Runtime guard/policy failures surface as the
 * runtime's friendly-error toast.
 */

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { cn } from "@repo/design-system/lib/utils";
import { Check, PencilIcon, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { useOptimisticCommand } from "@/app/lib/use-optimistic-command";

type FieldType = "text" | "number" | "date";

interface InlineEditFieldProps {
  className?: string;
  /** Update command on the entity, e.g. "updateGuestCount". */
  command: string;
  /** Formatted display string (defaults to the raw value). */
  display?: string;
  /** Text shown when the value is null/empty and not editing. */
  emptyLabel?: string;
  /** Manifest entity name, e.g. "Event". */
  entity: string;
  /** Command param the value maps to, e.g. "newGuestCount". */
  field: string;
  /** Instance id to dispatch against. */
  id: string;
  /** Accessible label for the field, e.g. "Guest Count". */
  label: string;
  /** Called after a successful save with the committed value. */
  onSaved?: (value: string | number) => void;
  /** Input kind, drives coercion of the dispatched value. Default "text". */
  type?: FieldType;
  /** Current value. */
  value: string | number | null | undefined;
}

/** Coerce the raw input string into the value sent to the command. */
function coerce(
  raw: string,
  type: FieldType
): { ok: true; value: string | number } | { ok: false } {
  const trimmed = raw.trim();
  if (type === "number") {
    if (trimmed === "") {
      return { ok: false };
    }
    const n = Number(trimmed);
    return Number.isFinite(n) ? { ok: true, value: n } : { ok: false };
  }
  if (type === "date") {
    if (trimmed === "") {
      return { ok: false };
    }
    const ms = Date.parse(trimmed);
    return Number.isNaN(ms)
      ? { ok: false }
      : { ok: true, value: new Date(ms).toISOString() };
  }
  return { ok: true, value: trimmed };
}

/** `<input type="date">` wants YYYY-MM-DD; map the current value into that shape. */
function toInputValue(
  value: string | number | null | undefined,
  type: FieldType
): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (type === "date") {
    const ms = Date.parse(String(value));
    return Number.isNaN(ms) ? "" : new Date(ms).toISOString().slice(0, 10);
  }
  return String(value);
}

export function InlineEditField({
  entity,
  id,
  command,
  field,
  value,
  type = "text",
  label,
  display,
  emptyLabel = "Not set",
  onSaved,
  className,
}: InlineEditFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  // Optimistic value + per-command rollback; `busy` mirrors the in-flight state.
  const { value: liveValue, pending: busy, run } = useOptimisticCommand(value);
  // Set on cancel's mousedown so the resulting blur skips its commit.
  const cancellingRef = useRef(false);
  const inputId = useId();

  function startEditing() {
    setDraft(toInputValue(liveValue, type));
    setEditing(true);
  }

  function cancel() {
    cancellingRef.current = false;
    setEditing(false);
  }

  async function commit() {
    if (busy) {
      return;
    }
    const original = toInputValue(liveValue, type);
    if (draft === original) {
      // Unchanged — treat as cancel, no command dispatched.
      setEditing(false);
      return;
    }
    const parsed = coerce(draft, type);
    if (!parsed.ok) {
      toast.error(
        `Enter a valid ${type === "number" ? "number" : type === "date" ? "date" : "value"}`
      );
      return;
    }

    // Close the editor immediately and show the new value optimistically; the
    // hook reverts to the pre-command value (and toasts the friendly error) if
    // the governed command fails.
    setEditing(false);
    const res = await run(
      entity,
      command,
      { id, [field]: parsed.value },
      {
        optimistic: parsed.value,
        successMessage: `${label} updated`,
        errorMessage: `Could not update ${label}`,
      }
    );
    if (res) {
      onSaved?.(parsed.value);
    }
  }

  if (!editing) {
    // While an optimistic override is active, show the predicted value over the
    // (now-stale) preformatted `display`.
    const optimistic = liveValue !== value;
    const shown = optimistic
      ? String(liveValue)
      : (display ??
        (value === null || value === undefined || value === ""
          ? emptyLabel
          : String(value)));
    return (
      <button
        aria-label={`Edit ${label}`}
        className={cn(
          "group inline-flex items-center gap-1 rounded-sm text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        onClick={startEditing}
        type="button"
      >
        <span>{shown}</span>
        <PencilIcon className="size-3 opacity-0 transition-opacity group-hover:opacity-60" />
      </button>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Input
        aria-label={label}
        autoFocus
        className="h-7 w-28 px-2 py-1 text-sm"
        disabled={busy}
        id={inputId}
        onBlur={() => {
          if (cancellingRef.current) {
            cancel();
            return;
          }
          commit();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        type={type === "number" ? "number" : type === "date" ? "date" : "text"}
        value={draft}
      />
      <Button
        aria-label={`Save ${label}`}
        className="size-7 shrink-0"
        disabled={busy}
        onClick={commit}
        // Commit on click; prevent the input's blur from firing first.
        onMouseDown={(e) => e.preventDefault()}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Check className="size-3.5" />
      </Button>
      <Button
        aria-label={`Cancel editing ${label}`}
        className="size-7 shrink-0"
        disabled={busy}
        onClick={cancel}
        // Flag so the input's blur cancels instead of committing.
        onMouseDown={() => {
          cancellingRef.current = true;
        }}
        size="icon"
        type="button"
        variant="ghost"
      >
        <X className="size-3.5" />
      </Button>
    </span>
  );
}
