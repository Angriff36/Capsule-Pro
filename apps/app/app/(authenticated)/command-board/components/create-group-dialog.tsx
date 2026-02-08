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
import { useEffect, useState } from "react";
import { createGroup } from "../actions/groups";
import type { CommandBoardCard } from "../types";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  selectedCards: CommandBoardCard[];
  onCreate?: () => void;
}

const PRESET_COLORS = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Yellow", value: "#f59e0b" },
  { name: "Red", value: "#ef4444" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Gray", value: "#6b7280" },
];

export function CreateGroupDialog({
  open,
  onOpenChange,
  boardId,
  selectedCards,
  onCreate,
}: CreateGroupDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState("");

  // Reset form state when dialog opens
  useEffect(() => {
    if (open) {
      setGroupName("");
      setSelectedColor(null);
      setCustomColor("");
      setError(null);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setError("Please enter a group name");
      return;
    }

    setIsCreating(true);
    setError(null);

    const color = customColor || selectedColor || null;

    const result = await createGroup(boardId, {
      name: groupName.trim(),
      color,
      cardIds: selectedCards.map((c) => c.id),
    });

    if (result.success) {
      onOpenChange(false);
      onCreate?.();
    } else {
      setError(result.error || "Failed to create group");
    }

    setIsCreating(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!(newOpen && isCreating)) {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
          <DialogDescription>
            Group {selectedCards.length} selected card
            {selectedCards.length !== 1 ? "s" : ""} together. Groups can be
            moved, collapsed, and organized on the board.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              autoFocus
              id="group-name"
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              value={groupName}
            />
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label>Group Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  className={`h-8 w-8 rounded border-2 transition-all ${
                    selectedColor === color.value
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  key={color.value}
                  onClick={() => {
                    setSelectedColor(color.value);
                    setCustomColor("");
                  }}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                  type="button"
                />
              ))}
              <button
                className={`h-8 w-8 rounded border-2 transition-all ${
                  !selectedColor && !customColor
                    ? "border-foreground scale-110"
                    : "border-transparent hover:scale-105"
                } bg-gradient-to-br from-gray-100 to-gray-300`}
                onClick={() => {
                  setSelectedColor(null);
                  setCustomColor("");
                }}
                title="None"
                type="button"
              />
            </div>

            {/* Custom Color Input */}
            <div className="flex gap-2 items-center">
              <Label htmlFor="custom-color" className="text-sm text-muted-foreground">
                Custom:
              </Label>
              <Input
                className="h-8 w-16 p-1"
                id="custom-color"
                onChange={(e) => {
                  setCustomColor(e.target.value);
                  setSelectedColor(null);
                }}
                type="color"
                value={customColor}
              />
              {customColor && (
                <>
                  <span className="text-muted-foreground text-xs">
                    {customColor}
                  </span>
                  <Button
                    onClick={() => setCustomColor("")}
                    size="sm"
                    variant="ghost"
                  >
                    Clear
                  </Button>
                </>
              )}
            </div>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            disabled={isCreating}
            onClick={() => handleOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isCreating || !groupName.trim()} onClick={handleCreate}>
            {isCreating ? "Creating..." : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
