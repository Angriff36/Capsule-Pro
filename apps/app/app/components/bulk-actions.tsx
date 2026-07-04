"use client";

/**
 * @module components/bulk-actions
 * @intent Reusable checkbox-selection state + a floating action bar that dispatches
 *   governed Manifest commands as a batched sequence through the canonical dispatcher.
 * @responsibility UI orchestration only — every mutation goes through `executeCommand`
 *   (constitution §4 UI/Command Board: the UI collects intent and invokes commands; it
 *   does not own domain behavior). No direct writes, no client-side state machines.
 * @domain Shared / list views
 * @canonical true
 */

import { Button } from "@repo/design-system/components/ui/button";
import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  executeCommandBatch,
  type ManifestBatchOperation,
} from "@/app/lib/manifest-client";

/** Checkbox-selection state for a list of stable string ids. */
export function useBulkSelection(allIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (allIds.length > 0 && allIds.every((id) => prev.has(id))) {
        return new Set();
      }
      return new Set(allIds);
    });
  }, [allIds]);

  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id));

  return {
    selectedIds: [...selected],
    count: selected.size,
    isSelected: (id: string) => selected.has(id),
    toggle,
    toggleAll,
    clear,
    allSelected,
    someSelected: selected.size > 0 && !allSelected,
  };
}

export interface BulkAction {
  /** Extra body merged into each command call (besides `{ id }`). */
  body?: Record<string, unknown>;
  /** Manifest command name (e.g. "voidInvoice", "disqualify"). */
  command: string;
  /** If set, confirm before running. `{count}` is substituted. */
  confirm?: string;
  label: string;
  variant?: "default" | "destructive" | "outline" | "secondary";
}

/**
 * Floating bar shown when ≥1 item is selected. Each action dispatches its governed
 * command for every selected id as atomic batched transactions via the canonical
 * batch endpoint (POST /api/manifest/batch) — one server transaction per chunk of
 * MAX_BATCH_SIZE (50), so N selected rows cost ⌈N/50⌉ round-trips (was N) and each
 * chunk commits atomically or rolls back together.
 */
export function BulkActionBar({
  entity,
  selectedIds,
  actions,
  onClear,
  onDone,
}: {
  entity: string;
  selectedIds: string[];
  actions: BulkAction[];
  onClear: () => void;
  onDone?: () => void;
}) {
  const [running, setRunning] = useState<string | null>(null);
  const count = selectedIds.length;

  if (count === 0) {
    return null;
  }

  const run = async (action: BulkAction) => {
    if (
      action.confirm &&
      !window.confirm(action.confirm.replace("{count}", String(count)))
    ) {
      return;
    }
    setRunning(action.command);
    // Chunk at the server's MAX_BATCH_SIZE (50): each chunk is one atomic
    // transaction (POST /api/manifest/batch) — all ops in the chunk commit or
    // the chunk rolls back. N round-trips collapses to ⌈N/50⌉.
    const CHUNK_SIZE = 50;
    const operations: ManifestBatchOperation[] = selectedIds.map((id) => ({
      entity,
      command: action.command,
      params: { id, ...action.body },
    }));
    let done = 0;
    try {
      for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
        const results = await executeCommandBatch(
          operations.slice(i, i + CHUNK_SIZE)
        );
        done += results.length;
      }
      toast.success(`${action.label}: ${done} of ${count} succeeded`);
      onClear();
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-hairline bg-canvas px-4 py-2.5 shadow-lg">
      <span className="px-1 font-medium text-sm">{count} selected</span>
      <div className="h-4 w-px bg-hairline" />
      {actions.map((action) => (
        <Button
          disabled={running !== null}
          key={action.command}
          onClick={() => run(action)}
          size="sm"
          variant={action.variant ?? "outline"}
        >
          {running === action.command && (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          )}
          {action.label}
        </Button>
      ))}
      <Button onClick={onClear} size="sm" variant="ghost">
        Clear
      </Button>
    </div>
  );
}
