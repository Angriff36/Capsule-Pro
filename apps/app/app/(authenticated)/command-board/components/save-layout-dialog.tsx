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
import { useState } from "react";
import { type SaveLayoutInput, saveLayout } from "../actions/layouts";
import type { ViewportState } from "../types";

interface SaveLayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  viewport: ViewportState;
  visibleCards: string[];
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;
  onSave?: (layoutId: string, name: string) => void;
}

export function SaveLayoutDialog({
  open,
  onOpenChange,
  boardId,
  viewport,
  visibleCards,
  gridSize,
  showGrid,
  snapToGrid,
  onSave,
}: SaveLayoutDialogProps) {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please enter a layout name");
      return;
    }

    setIsSaving(true);
    setError(null);

    const input: SaveLayoutInput = {
      boardId,
      name: name.trim(),
      viewport,
      visibleCards,
      gridSize,
      showGrid,
      snapToGrid,
    };

    const result = await saveLayout(input);

    if (result.success) {
      setName("");
      onOpenChange(false);
      onSave?.(result.data?.id ?? "", result.data?.name ?? "");
    } else {
      setError(result.error || "Failed to save layout");
    }

    setIsSaving(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!(newOpen && isSaving)) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setName("");
        setError(null);
      }
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Layout</DialogTitle>
          <DialogDescription>
            Save the current viewport and card visibility as a named layout.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-2">
            <Label htmlFor="layout-name">Layout Name</Label>
            <Input
              autoFocus
              id="layout-name"
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isSaving) {
                  handleSave();
                }
              }}
              placeholder="My Default View"
              value={name}
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>

          <div className="mt-4 rounded-md bg-muted/50 px-3 py-2 text-muted-foreground text-xs">
            <p className="font-medium">Layout includes:</p>
            <ul className="ml-4 mt-1 list-disc space-y-0.5">
              <li>Zoom level and pan position</li>
              <li>Visible cards</li>
              <li>Grid settings</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={isSaving}
            onClick={() => handleOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isSaving || !name.trim()} onClick={handleSave}>
            {isSaving ? "Saving..." : "Save Layout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
