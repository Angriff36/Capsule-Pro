"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { cn } from "@repo/design-system/lib/utils";
import { TriangleAlert } from "lucide-react";
import type { CommitResponse } from "../actions";
import type { StaffImpact } from "../impact";

export interface CommitDialogDraft {
  cardId: string;
  name: string;
  role: string;
  /** ISO strings. */
  shiftStart: string;
  shiftEnd: string;
  /** Label of the conflicting commitment, when the impact check flagged one. */
  conflictWith?: string;
}

interface CommitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drafts: CommitDialogDraft[];
  impact: StaffImpact | undefined;
  onConfirm: () => void;
  committing: boolean;
  /** Last commit attempt; failures keep the dialog open with the error shown. */
  result?: CommitResponse | null;
}

function formatShift(startIso: string, endIso: string): string {
  if (!(startIso && endIso)) return "—";
  const start = new Date(startIso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const end = new Date(endIso).toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${start} – ${end}`;
}

/** Review-and-commit dialog: lists every staged draft + the impact summary. */
export function CommitDialog({
  open,
  onOpenChange,
  drafts,
  impact,
  onConfirm,
  committing,
  result,
}: CommitDialogProps) {
  const conflictCount = drafts.filter((d) => d.conflictWith).length;
  const failure = result && !result.success ? result : null;

  // Block dismissal while a commit is in flight.
  const handleOpenChange = (next: boolean) => {
    if (next || !committing) onOpenChange(next);
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review &amp; commit</DialogTitle>
          <DialogDescription>
            {drafts.length} draft{drafts.length === 1 ? "" : "s"} will be
            committed to this event.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {drafts.map((draft) => (
            <div
              className={cn(
                "rounded-md border border-border px-3 py-2",
                failure?.failedCardId === draft.cardId &&
                  "border-destructive bg-destructive/5"
              )}
              key={draft.cardId}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium">{draft.name}</p>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {draft.role || "—"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatShift(draft.shiftStart, draft.shiftEnd)}
              </p>
              {draft.conflictWith && (
                <p className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive">
                  <TriangleAlert className="h-3 w-3 shrink-0" />
                  conflicts with {draft.conflictWith}
                </p>
              )}
            </div>
          ))}
        </div>

        {impact && (
          <dl className="flex items-center gap-4 rounded-md bg-muted/50 px-3 py-2 text-sm">
            <div className="flex items-baseline gap-1.5">
              <dt className="text-xs text-muted-foreground">Labor</dt>
              <dd className="font-semibold tabular-nums">
                +${impact.laborCost}
              </dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt className="text-xs text-muted-foreground">Hours</dt>
              <dd className="font-semibold tabular-nums">
                {impact.totalHours.toFixed(1)}
              </dd>
            </div>
          </dl>
        )}

        {conflictCount > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              {conflictCount} conflict{conflictCount === 1 ? "" : "s"} detected.
              Conflicts are warnings — committing anyway is allowed.
            </p>
          </div>
        )}

        {failure && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {failure.error}
          </p>
        )}

        <DialogFooter>
          <Button
            disabled={committing}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={committing || drafts.length === 0}
            onClick={onConfirm}
          >
            {committing
              ? "Committing…"
              : `Commit ${drafts.length} draft${drafts.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
