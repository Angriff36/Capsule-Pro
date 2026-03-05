"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Label } from "@repo/design-system/components/ui/label";
import { Separator } from "@repo/design-system/components/ui/separator";
import {
  AlertCircleIcon,
  CheckIcon,
  Loader2Icon,
  MergeIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import type { BoardDelta } from "../actions/boards";

interface MergeConflict {
  type: "projection_modified" | "projection_removed" | "concurrent_edit";
  entityId: string;
  description: string;
}

interface MergeSimulationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  simulationId: string;
  sourceBoardId: string;
  delta: BoardDelta | null;
  onMergeComplete?: () => void;
}

export function MergeSimulationDialog({
  open,
  onOpenChange,
  simulationId,
  sourceBoardId,
  delta,
  onMergeComplete,
}: MergeSimulationDialogProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [conflicts, setConflicts] = useState<MergeConflict[]>([]);
  const [applyRemovals, setApplyRemovals] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for conflicts when dialog opens
  useEffect(() => {
    if (open && simulationId) {
      setIsChecking(true);
      setError(null);
      apiFetch(
        `/api/command-board/simulations/merge?simulationId=${simulationId}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.hasConflicts) {
            setConflicts(data.conflicts || []);
          } else {
            setConflicts([]);
          }
        })
        .catch((err) => {
          console.error("Failed to check conflicts:", err);
          setError("Failed to check for conflicts");
        })
        .finally(() => {
          setIsChecking(false);
        });
    }
  }, [open, simulationId]);

  const handleMerge = useCallback(async () => {
    setIsMerging(true);
    setError(null);

    try {
      const response = await apiFetch("/api/command-board/simulations/merge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          simulationId,
          options: {
            applyRemovals,
            discardAfterMerge: true,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        onMergeComplete?.();
        onOpenChange(false);
      } else if (data.hasConflicts) {
        setConflicts(data.conflicts || []);
        setError("Merge conflicts detected. Please review below.");
      } else {
        setError(data.error || data.message || "Failed to merge simulation");
      }
    } catch (err) {
      console.error("Failed to merge:", err);
      setError("Failed to merge simulation. Please try again.");
    } finally {
      setIsMerging(false);
    }
  }, [simulationId, applyRemovals, onMergeComplete, onOpenChange]);

  const hasRemovals =
    (delta?.summary.removals ?? 0) > 0 ||
    (delta?.removedProjectionIds?.length ?? 0) > 0;

  const totalChanges = delta?.summary.totalChanges ?? 0;
  const hasConflictsWarning = conflicts.length > 0;

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <MergeIcon className="h-5 w-5" />
            Merge Simulation to Source Board
          </AlertDialogTitle>
          <AlertDialogDescription>
            Apply changes from this simulation back to the source board.
            {totalChanges > 0 && (
              <span className="block mt-2">
                {totalChanges} change{totalChanges === 1 ? "" : "s"} will be
                applied.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isChecking ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              Checking for conflicts...
            </span>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Conflicts Warning */}
            {hasConflictsWarning && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                <div className="flex items-start gap-3">
                  <AlertCircleIcon className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-900 dark:text-amber-100">
                      Merge Conflicts Detected
                    </h4>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                      The source board has been modified since this simulation
                      was created. Review the conflicts below before merging.
                    </p>
                    <ul className="mt-2 space-y-1">
                      {conflicts.map((conflict, index) => (
                        <li
                          className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2"
                          key={index}
                        >
                          <span>•</span>
                          <span>{conflict.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Changes Summary */}
            {delta && totalChanges > 0 && (
              <div className="rounded-md border bg-muted/30 p-4">
                <h4 className="font-medium mb-3">Summary of Changes</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckIcon className="h-4 w-4 text-green-600" />
                    <span className="text-muted-foreground">Added:</span>
                    <span className="font-medium">
                      {delta.summary.additions}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircleIcon className="h-4 w-4 text-amber-600" />
                    <span className="text-muted-foreground">Modified:</span>
                    <span className="font-medium">
                      {delta.summary.modifications}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XIcon className="h-4 w-4 text-red-600" />
                    <span className="text-muted-foreground">Removed:</span>
                    <span className="font-medium">
                      {delta.summary.removals}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Removals Option */}
            {hasRemovals && (
              <div className="flex items-start gap-3 rounded-md border p-3">
                <Checkbox
                  checked={applyRemovals}
                  disabled={isMerging}
                  id="applyRemovals"
                  onCheckedChange={(checked) =>
                    setApplyRemovals(checked === true)
                  }
                />
                <div className="flex-1">
                  <Label
                    className="text-sm font-medium cursor-pointer"
                    htmlFor="applyRemovals"
                  >
                    Apply removals to source board
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    If checked, entities removed in this simulation will also be
                    removed from the source board.
                  </p>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Separator />

            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">What happens on merge:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>New entities from simulation are added to source board</li>
                <li>Modified positions and settings are applied</li>
                <li>Simulation is automatically discarded after merge</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isMerging || isChecking}>
            Cancel
          </AlertDialogCancel>
          <Button
            className="bg-primary"
            disabled={isMerging || isChecking}
            onClick={handleMerge}
          >
            {isMerging && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            Merge Changes
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
