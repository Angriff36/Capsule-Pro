"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Check,
  GitCompare,
  MapPin,
  Type,
  X,
} from "lucide-react";
import { useCallback, useEffect } from "react";
import type {
  CommandBoardCardContent,
  ConflictDetails,
  ConflictResolution,
} from "../lib/conflict-resolver";
import type { CardPosition } from "../types";

interface ConflictResolutionDialogProps {
  open: boolean;
  conflict: ConflictDetails;
  onResolve: (resolution: ConflictResolution) => void;
  onClose: () => void;
}

type ContentFieldKey = keyof CommandBoardCardContent;

const CONTENT_FIELD_LABELS: Record<ContentFieldKey, string> = {
  title: "Title",
  content: "Content",
  cardType: "Card Type",
  status: "Status",
  color: "Color",
  entityId: "Entity ID",
  entityType: "Entity Type",
  metadata: "Metadata",
};

const POSITION_FIELDS = ["x", "y", "width", "height", "zIndex"] as const;

const conflictTypeConfig = {
  position: {
    label: "Position",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: MapPin,
  },
  content: {
    label: "Content",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: Type,
  },
  concurrent: {
    label: "Both",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: AlertTriangle,
  },
} as const;

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatPosition(position: CardPosition): string {
  return `x: ${position.x}, y: ${position.y}, w: ${position.width}, h: ${position.height}`;
}

function getPositionDiffs(
  local: CardPosition,
  remote: CardPosition
): readonly string[] {
  const diffs: string[] = [];
  for (const field of POSITION_FIELDS) {
    if (
      local[field as keyof CardPosition] !== remote[field as keyof CardPosition]
    ) {
      diffs.push(
        `${field}: ${local[field as keyof CardPosition]} → ${remote[field as keyof CardPosition]}`
      );
    }
  }
  return diffs;
}

function getContentDiffs(
  local: CommandBoardCardContent,
  remote: CommandBoardCardContent,
  conflictingFields: readonly ContentFieldKey[]
): readonly { field: string; local: unknown; remote: unknown }[] {
  return conflictingFields.map((field) => ({
    field: CONTENT_FIELD_LABELS[field],
    local: local[field],
    remote: remote[field],
  }));
}

export function ConflictResolutionDialog({
  open,
  conflict,
  onResolve,
  onClose,
}: ConflictResolutionDialogProps) {
  const { conflictType, localVersion, remoteVersion } = conflict;

  // Get conflicting fields based on conflict type
  const getConflictingFields = useCallback((): ContentFieldKey[] => {
    switch (conflictType.type) {
      case "content":
        return [...conflictType.conflictingFields];
      case "concurrent":
        return [...conflictType.contentConflict.conflictingFields];
      case "position":
        return [];
    }
  }, [conflictType]);

  const conflictingFields = getConflictingFields();
  const positionDiffs =
    conflictType.type === "position" || conflictType.type === "concurrent"
      ? getPositionDiffs(localVersion.position, remoteVersion.position)
      : [];
  const contentDiffs =
    conflictingFields.length > 0
      ? getContentDiffs(
          localVersion.content,
          remoteVersion.content,
          conflictingFields
        )
      : [];

  // Determine if merge is applicable
  const canMerge =
    conflictType.type === "concurrent" ||
    (conflictType.type === "content" && conflictingFields.length > 1) ||
    (conflictType.type === "content" && positionDiffs.length > 0);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handleResolve = useCallback(
    (strategy: ConflictResolution["strategy"]) => {
      let resolution: ConflictResolution;

      switch (strategy) {
        case "acceptMine":
          resolution = { strategy: "acceptMine" };
          break;
        case "acceptTheirs":
          resolution = { strategy: "acceptTheirs" };
          break;
        case "merge":
          // Default merge strategy: prefer local for position, remote for content
          // In a full implementation, this would open a more detailed merge dialog
          resolution = {
            strategy: "merge",
            mergeOptions: {
              positionSource: "local",
              localContentFields: [],
              remoteContentFields: conflictingFields,
            },
          };
          break;
      }

      onResolve(resolution);
    },
    [onResolve, conflictingFields]
  );

  const typeConfig = conflictTypeConfig[conflictType.type];
  const ConflictIcon = typeConfig.icon;

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={open}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 rounded-full bg-orange-100 p-2">
              <ConflictIcon className="h-5 w-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <DialogTitle>Resolve Card Conflict</DialogTitle>
              <DialogDescription className="mt-1">
                Another user made conflicting changes to this card. Choose how
                to resolve the conflict.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Conflict Type Badge */}
          <div className="flex items-center gap-2">
            <Badge className={typeConfig.color} variant="outline">
              <ConflictIcon className="mr-1 h-3 w-3" />
              {typeConfig.label} Conflict
            </Badge>
            <span className="text-muted-foreground text-sm">
              Card: <span className="font-mono text-xs">{conflict.cardId}</span>
            </span>
          </div>

          {/* Conflict Summary */}
          <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
            <div className="flex items-center gap-2 text-orange-800 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              <span>What changed:</span>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-orange-700">
              {positionDiffs.map((diff) => (
                <li className="flex items-center gap-2" key={diff}>
                  <span className="h-1 w-1 rounded-full bg-orange-400" />
                  Position: {diff}
                </li>
              ))}
              {contentDiffs.map((diff) => (
                <li className="flex items-center gap-2" key={diff.field}>
                  <span className="h-1 w-1 rounded-full bg-orange-400" />
                  {diff.field}:{" "}
                  <span className="line-through opacity-70">
                    {String(diff.local ?? "none")}
                  </span>{" "}
                  <ArrowRight className="h-3 w-3" />{" "}
                  <span className="font-medium">
                    {String(diff.remote ?? "none")}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Version Comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Local Version */}
            <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                    Your Version
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {formatTimestamp(localVersion.timestamp)}
                  </span>
                </div>
              </div>

              {positionDiffs.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-blue-900 uppercase mb-1">
                    Position
                  </p>
                  <p className="text-sm font-mono bg-white rounded px-2 py-1 border border-blue-200">
                    {formatPosition(localVersion.position)}
                  </p>
                </div>
              )}

              {contentDiffs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-900 uppercase mb-1">
                    Content
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm bg-white rounded px-2 py-1 border border-blue-200">
                      <span className="font-medium">
                        {localVersion.content.title}
                      </span>
                    </p>
                    {localVersion.content.content && (
                      <p className="text-xs text-blue-700 line-clamp-2 bg-white rounded px-2 py-1 border border-blue-200">
                        {localVersion.content.content}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Remote Version */}
            <div className="rounded-lg border-2 border-purple-200 bg-purple-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                    Their Version
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {formatTimestamp(remoteVersion.timestamp)}
                  </span>
                </div>
              </div>

              {positionDiffs.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-purple-900 uppercase mb-1">
                    Position
                  </p>
                  <p className="text-sm font-mono bg-white rounded px-2 py-1 border border-purple-200">
                    {formatPosition(remoteVersion.position)}
                  </p>
                </div>
              )}

              {contentDiffs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-purple-900 uppercase mb-1">
                    Content
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm bg-white rounded px-2 py-1 border border-purple-200">
                      <span className="font-medium">
                        {remoteVersion.content.title}
                      </span>
                    </p>
                    {remoteVersion.content.content && (
                      <p className="text-xs text-purple-700 line-clamp-2 bg-white rounded px-2 py-1 border border-purple-200">
                        {remoteVersion.content.content}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Visual Diff Indicator */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Your changes</span>
            </div>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-purple-500" />
              <span className="text-muted-foreground">Their changes</span>
            </div>
          </div>

          {/* Merge Preview (only if applicable) */}
          {canMerge && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <div className="flex items-center gap-2 text-green-800 text-sm font-medium mb-2">
                <GitCompare className="h-4 w-4" />
                <span>Merge Preview</span>
              </div>
              <p className="text-sm text-green-700">
                If you choose "Merge Both", your local position will be kept
                while accepting their content changes.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-4">
          <Button className="sm:order-4" onClick={onClose} variant="outline">
            <X className="mr-2 h-4 w-4" />
            Cancel (Esc)
          </Button>
          <Button
            className="sm:order-1 bg-blue-600 hover:bg-blue-700"
            onClick={() => handleResolve("acceptMine")}
            variant="default"
          >
            <Check className="mr-2 h-4 w-4" />
            Keep Mine
          </Button>
          <Button
            className="sm:order-2 bg-purple-600 hover:bg-purple-700"
            onClick={() => handleResolve("acceptTheirs")}
            variant="default"
          >
            <Check className="mr-2 h-4 w-4" />
            Use Theirs
          </Button>
          {canMerge && (
            <Button
              className="sm:order-3 bg-green-600 hover:bg-green-700"
              onClick={() => handleResolve("merge")}
              variant="default"
            >
              <GitCompare className="mr-2 h-4 w-4" />
              Merge Both
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
