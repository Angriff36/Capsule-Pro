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
import { AlertTriangle, Clock } from "lucide-react";
import { DraftRecoveryDialogProps } from "../types/draft-recovery-dialog-props";

/**
 * Utility function to format timestamp in a human-readable way
 */
function formatRelativeTime(timestamp: Date): string {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
  }
}

export function DraftRecoveryDialog({
  open,
  draftTimestamp,
  onRestore,
  onDiscard,
  onCancel,
}: DraftRecoveryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <DialogTitle>Unsaved Draft Detected</DialogTitle>
              <DialogDescription className="mt-1">
                You have a draft that may contain unsaved changes.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {draftTimestamp ? (
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
              <div className="flex items-center gap-2 text-orange-800">
                <Clock className="h-4 w-4" />
                <span className="font-medium">
                  Draft saved {formatRelativeTime(draftTimestamp)}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
              <p className="text-orange-800">
                A draft was found but the timestamp could not be determined.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              What would you like to do with your draft?
            </p>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <p className="text-sm text-blue-800">
                <strong>Restore Draft:</strong> Load your unsaved changes and continue working where you left off.
              </p>
            </div>

            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-800">
                <strong>Discard Draft:</strong> Permanently delete your unsaved changes and start fresh.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            onClick={onCancel}
            variant="outline"
            className="sm:order-3"
          >
            Cancel
          </Button>
          <Button
            onClick={onDiscard}
            variant="destructive"
            className="sm:order-2"
          >
            Discard Draft
          </Button>
          <Button
            onClick={onRestore}
            className="sm:order-1"
          >
            Restore Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}