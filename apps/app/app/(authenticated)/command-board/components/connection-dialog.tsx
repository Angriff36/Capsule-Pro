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
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import {
  createConnection,
  type CreateConnectionResult,
} from "../actions/annotations";
import {
  CONNECTION_COLORS,
  CONNECTION_STYLES,
} from "../lib/connection-constants";
import type { BoardProjection } from "../types/board";

// ============================================================================
// Types
// ============================================================================

interface ConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceProjection: BoardProjection | null;
  targetProjection: BoardProjection | null;
  boardId: string;
  /** Callback fired when a connection is successfully created */
  onConnectionCreated?: (result: CreateConnectionResult) => void;
}

// ============================================================================
// Component
// ============================================================================

export function ConnectionDialog({
  open,
  onOpenChange,
  sourceProjection,
  targetProjection,
  boardId,
  onConnectionCreated,
}: ConnectionDialogProps) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState<string>("#9ca3af");
  const [style, setStyle] = useState<string>("solid");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Reset form on close
        setLabel("");
        setColor("#9ca3af");
        setStyle("solid");
        setError(null);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  const handleSubmit = useCallback(async () => {
    if (!sourceProjection || !targetProjection) {
      setError("Missing source or target projection");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createConnection(boardId, {
        fromProjectionId: sourceProjection.id,
        toProjectionId: targetProjection.id,
        label: label.trim() || undefined,
        color,
        style: style as "solid" | "dashed" | "dotted",
      });

      if (result.success) {
        onConnectionCreated?.(result);
        handleOpenChange(false);
      } else {
        setError(result.error ?? "Failed to create connection");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create connection"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    boardId,
    sourceProjection,
    targetProjection,
    label,
    color,
    style,
    onConnectionCreated,
    handleOpenChange,
  ]);

  // Get entity display names
  const sourceName =
    sourceProjection?.entityType && sourceProjection?.entityId
      ? `${sourceProjection.entityType}:${sourceProjection.entityId.slice(0, 8)}`
      : "Unknown";
  const targetName =
    targetProjection?.entityType && targetProjection?.entityId
      ? `${targetProjection.entityType}:${targetProjection.entityId.slice(0, 8)}`
      : "Unknown";

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Connection</DialogTitle>
          <DialogDescription>
            Connect <span className="font-medium">{sourceName}</span> to{" "}
            <span className="font-medium">{targetName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Label input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right" htmlFor="label">
              Label
            </Label>
            <Input
              className="col-span-3"
              id="label"
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., depends on, related to"
              value={label}
            />
          </div>

          {/* Color selector */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right" htmlFor="color">
              Color
            </Label>
            <Select onValueChange={setColor} value={color}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a color" />
              </SelectTrigger>
              <SelectContent>
                {CONNECTION_COLORS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full border"
                        style={{ backgroundColor: c.value }}
                      />
                      <span>{c.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Style selector */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right" htmlFor="style">
              Style
            </Label>
            <Select onValueChange={setStyle} value={style}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a style" />
              </SelectTrigger>
              <SelectContent>
                {CONNECTION_STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <div className="flex flex-col">
                      <span>{s.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Error message */}
          {error && (
            <div className="col-span-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => handleOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Connection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
