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
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { useEffect, useState } from "react";
import { bulkUpdateCards } from "../actions/bulk-update-cards";
import type { BulkUpdateInput } from "../actions/bulk-update-cards";
import type { CardStatus, CommandBoardCard } from "../types";

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCards: CommandBoardCard[];
  onBulkUpdate?: (updateData: Omit<BulkUpdateInput, "cardIds">) => Promise<void>;
  onUpdate?: () => void;
}

type PropertyValue = string | null;
type PropertyState = PropertyValue | "mixed";

/**
 * Helper to check if all cards have the same value for a property
 */
function getCommonValue<T>(
  cards: CommandBoardCard[],
  accessor: (card: CommandBoardCard) => T
): PropertyState {
  if (cards.length === 0) {
    return null;
  }
  const firstValue = accessor(cards[0]);
  const allSame = cards.every((card) => accessor(card) === firstValue);
  return allSame ? (firstValue as PropertyState) : "mixed";
}

export function BulkEditDialog({
  open,
  onOpenChange,
  selectedCards,
  onBulkUpdate,
  onUpdate,
}: BulkEditDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state - track which fields are being edited
  const [editStatus, setEditStatus] = useState(false);
  const [editColor, setEditColor] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [editContent, setEditContent] = useState(false);

  const [statusValue, setStatusValue] = useState<CardStatus | "">("");
  const [colorValue, setColorValue] = useState("");
  const [titleValue, setTitleValue] = useState("");
  const [contentValue, setContentValue] = useState("");

  // Derived state - current common values or "mixed"
  const commonStatus = getCommonValue(selectedCards, (card) => card.status);
  const commonColor = getCommonValue(selectedCards, (card) => card.color);
  const commonTitle = getCommonValue(selectedCards, (card) => card.title);
  const commonContent = getCommonValue(selectedCards, (card) => card.content);

  // Reset form state when dialog opens
  useEffect(() => {
    if (open) {
      setEditStatus(false);
      setEditColor(false);
      setEditTitle(false);
      setEditContent(false);
      setStatusValue("");
      setColorValue("");
      setTitleValue("");
      setContentValue("");
      setError(null);
    }
  }, [open]);

  const handleUpdate = async () => {
    if (selectedCards.length === 0) {
      setError("No cards selected");
      return;
    }

    setIsUpdating(true);
    setError(null);

    const cardIds = selectedCards.map((c) => c.id);

    const updateData: Omit<BulkUpdateInput, "cardIds"> = {};

    // Only include fields that were explicitly edited
    if (editStatus && statusValue) {
      (updateData as BulkUpdateInput).status = statusValue as CardStatus;
    }
    if (editColor) {
      (updateData as BulkUpdateInput).color = colorValue || null;
    }
    if (editTitle && titleValue) {
      (updateData as BulkUpdateInput).title = titleValue;
    }
    if (editContent) {
      (updateData as BulkUpdateInput).content = contentValue || null;
    }

    // Check if at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      setError("Please select at least one property to update");
      setIsUpdating(false);
      return;
    }

    // Use callback if provided (for undo/redo support), otherwise fallback to direct action
    if (onBulkUpdate) {
      try {
        await onBulkUpdate(updateData);
        onOpenChange(false);
        onUpdate?.();
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to update cards");
      }
    } else {
      // Fallback: Call action directly (for backward compatibility)
      const result = await bulkUpdateCards({ cardIds, ...updateData });

      if (result.success) {
        onOpenChange(false);
        onUpdate?.();
      } else {
        setError(result.error || "Failed to update cards");
      }
    }

    setIsUpdating(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!(newOpen && isUpdating)) {
      onOpenChange(newOpen);
    }
  };

  const getStatusDisplay = (status: PropertyState): string => {
    if (status === "mixed") {
      return "Mixed";
    }
    if (status === "active") {
      return "Active";
    }
    if (status === "completed") {
      return "Completed";
    }
    if (status === "archived") {
      return "Archived";
    }
    return "None";
  };

  const getStatusColor = (status: PropertyState): string => {
    if (status === "mixed") {
      return "text-muted-foreground";
    }
    if (status === "active") {
      return "text-green-600";
    }
    if (status === "completed") {
      return "text-blue-600";
    }
    if (status === "archived") {
      return "text-gray-500";
    }
    return "text-muted-foreground";
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Edit Cards</DialogTitle>
          <DialogDescription>
            Edit {selectedCards.length} selected card
            {selectedCards.length !== 1 ? "s" : ""}. Only the fields you modify
            will be updated.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="status">Status</Label>
              {!editStatus && (
                <span className={`text-sm ${getStatusColor(commonStatus)}`}>
                  {getStatusDisplay(commonStatus)}
                </span>
              )}
            </div>
            {editStatus ? (
              <Select
                onValueChange={(value) => setStatusValue(value as CardStatus)}
                value={statusValue}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Button
                className="w-full justify-start"
                onClick={() => {
                  setEditStatus(true);
                  if (commonStatus !== "mixed" && commonStatus) {
                    setStatusValue(commonStatus as CardStatus);
                  }
                }}
                size="sm"
                variant="outline"
              >
                Change status
              </Button>
            )}
          </div>

          {/* Color */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="color">Color</Label>
              {!editColor && (
                <div className="flex items-center gap-2">
                  {commonColor && commonColor !== "mixed" ? (
                    <>
                      <div
                        className="h-4 w-4 rounded border"
                        style={{ backgroundColor: commonColor }}
                      />
                      <span className="text-muted-foreground text-xs">
                        {commonColor}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      {commonColor === "mixed" ? "Mixed" : "None"}
                    </span>
                  )}
                </div>
              )}
            </div>
            {editColor ? (
              <div className="flex gap-2">
                <Input
                  className="h-9 w-16 p-1"
                  id="color"
                  onChange={(e) => setColorValue(e.target.value)}
                  type="color"
                  value={colorValue}
                />
                <Input
                  className="flex-1"
                  onChange={(e) => setColorValue(e.target.value)}
                  placeholder="#000000 or empty"
                  value={colorValue}
                />
                <Button
                  onClick={() => setColorValue("")}
                  size="sm"
                  variant="ghost"
                >
                  Clear
                </Button>
              </div>
            ) : (
              <Button
                className="w-full justify-start"
                onClick={() => {
                  setEditColor(true);
                  if (commonColor && commonColor !== "mixed") {
                    setColorValue(commonColor);
                  }
                }}
                size="sm"
                variant="outline"
              >
                Change color
              </Button>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="title">Title</Label>
              {!editTitle && commonTitle !== "mixed" && (
                <span className="text-muted-foreground text-sm max-w-[150px] truncate">
                  {commonTitle}
                </span>
              )}
              {!editTitle && commonTitle === "mixed" && (
                <span className="text-muted-foreground text-sm">Mixed</span>
              )}
            </div>
            {editTitle ? (
              <Input
                autoFocus
                id="title"
                onChange={(e) => setTitleValue(e.target.value)}
                placeholder="New title"
                value={titleValue}
              />
            ) : (
              <Button
                className="w-full justify-start"
                onClick={() => {
                  setEditTitle(true);
                  if (commonTitle && commonTitle !== "mixed") {
                    setTitleValue(commonTitle);
                  }
                }}
                size="sm"
                variant="outline"
              >
                Set new title
              </Button>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Content</Label>
              {!editContent && commonContent !== "mixed" && (
                <span className="text-muted-foreground text-sm max-w-[150px] truncate">
                  {commonContent || "(empty)"}
                </span>
              )}
              {!editContent && commonContent === "mixed" && (
                <span className="text-muted-foreground text-sm">Mixed</span>
              )}
            </div>
            {editContent ? (
              <Textarea
                id="content"
                onChange={(e) => setContentValue(e.target.value)}
                placeholder="New content"
                rows={3}
                value={contentValue}
              />
            ) : (
              <Button
                className="w-full justify-start"
                onClick={() => {
                  setEditContent(true);
                  if (commonContent && commonContent !== "mixed") {
                    setContentValue(commonContent);
                  }
                }}
                size="sm"
                variant="outline"
              >
                Set new content
              </Button>
            )}
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            disabled={isUpdating}
            onClick={() => handleOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isUpdating} onClick={handleUpdate}>
            {isUpdating
              ? "Updating..."
              : `Update ${selectedCards.length} Card${selectedCards.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
