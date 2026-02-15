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
import { useEffect, useState } from "react";
import { createConnection } from "../actions/connections";
import type { CommandBoardCard } from "../types";
import { RelationshipConfig, RelationshipType } from "../types";

interface ConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
  cards: CommandBoardCard[];
  sourceCardId?: string | null;
  targetCardId?: string | null;
  onCreate?: () => void;
}

export function ConnectionDialog({
  open,
  onOpenChange,
  boardId,
  cards,
  sourceCardId: initialSourceCardId,
  targetCardId: initialTargetCardId,
  onCreate,
}: ConnectionDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sourceCardId, setSourceCardId] = useState<string>("");
  const [targetCardId, setTargetCardId] = useState<string>("");
  const [relationshipType, setRelationshipType] = useState<RelationshipType>(
    RelationshipType.generic
  );
  const [label, setLabel] = useState<string>("");

  // Reset form state when dialog opens
  useEffect(() => {
    if (open) {
      setSourceCardId(initialSourceCardId ?? "");
      setTargetCardId(initialTargetCardId ?? "");
      setRelationshipType(RelationshipType.generic);
      setLabel("");
      setError(null);
    }
  }, [open, initialSourceCardId, initialTargetCardId]);

  // Auto-detect relationship type when cards are selected
  useEffect(() => {
    const sourceCard = cards.find((c) => c.id === sourceCardId);
    const targetCard = cards.find((c) => c.id === targetCardId);

    if (sourceCard && targetCard && sourceCard.id !== targetCard.id) {
      // Auto-detect based on card types
      if (sourceCard.cardType === "client" && targetCard.cardType === "event") {
        setRelationshipType(RelationshipType.client_to_event);
      } else if (
        sourceCard.cardType === "event" &&
        targetCard.cardType === "task"
      ) {
        setRelationshipType(RelationshipType.event_to_task);
      } else if (
        sourceCard.cardType === "task" &&
        targetCard.cardType === "employee"
      ) {
        setRelationshipType(RelationshipType.task_to_employee);
      } else if (
        sourceCard.cardType === "event" &&
        targetCard.cardType === "inventory"
      ) {
        setRelationshipType(RelationshipType.event_to_inventory);
      } else {
        setRelationshipType(RelationshipType.generic);
      }
    }
  }, [sourceCardId, targetCardId, cards]);

  const handleCreate = async () => {
    if (!(sourceCardId && targetCardId)) {
      setError("Please select both source and target cards");
      return;
    }

    if (sourceCardId === targetCardId) {
      setError("Source and target cards must be different");
      return;
    }

    setIsCreating(true);
    setError(null);

    const result = await createConnection(boardId, {
      fromCardId: sourceCardId,
      toCardId: targetCardId,
      relationshipType,
      label: label || undefined,
    });

    if (result.success) {
      onOpenChange(false);
      onCreate?.();
    } else {
      setError(result.error || "Failed to create connection");
    }

    setIsCreating(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!(newOpen && isCreating)) {
      onOpenChange(newOpen);
    }
  };

  // Filter out the selected source card from target options
  const targetCardOptions = sourceCardId
    ? cards.filter((c) => c.id !== sourceCardId)
    : cards;

  const sourceCard = cards.find((c) => c.id === sourceCardId);
  const targetCard = cards.find((c) => c.id === targetCardId);

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Connection</DialogTitle>
          <DialogDescription>
            Connect two cards to show a relationship between them.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Source Card */}
          <div className="grid gap-2">
            <Label htmlFor="source-card">From Card</Label>
            <Select
              defaultValue={initialSourceCardId ?? undefined}
              onValueChange={setSourceCardId}
              value={sourceCardId || undefined}
            >
              <SelectTrigger id="source-card">
                <SelectValue placeholder="Select source card" />
              </SelectTrigger>
              <SelectContent>
                {cards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.title} ({card.cardType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sourceCard && (
              <p className="text-xs text-muted-foreground">
                {sourceCard.title} ({sourceCard.cardType})
              </p>
            )}
          </div>

          {/* Target Card */}
          <div className="grid gap-2">
            <Label htmlFor="target-card">To Card</Label>
            <Select
              defaultValue={initialTargetCardId ?? undefined}
              onValueChange={setTargetCardId}
              value={targetCardId || undefined}
            >
              <SelectTrigger id="target-card">
                <SelectValue placeholder="Select target card" />
              </SelectTrigger>
              <SelectContent>
                {targetCardOptions.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.title} ({card.cardType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {targetCard && (
              <p className="text-xs text-muted-foreground">
                {targetCard.title} ({targetCard.cardType})
              </p>
            )}
          </div>

          {/* Relationship Type */}
          <div className="grid gap-2">
            <Label htmlFor="relationship-type">Relationship Type</Label>
            <Select
              onValueChange={(value) =>
                setRelationshipType(value as RelationshipType)
              }
              value={relationshipType}
            >
              <SelectTrigger id="relationship-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RelationshipConfig).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
                      {config.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional Label */}
          <div className="grid gap-2">
            <Label htmlFor="connection-label">Label (Optional)</Label>
            <Input
              id="connection-label"
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Custom label for the connection"
              value={label}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the default label for the relationship type
            </p>
          </div>

          {/* Error Message */}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            disabled={isCreating}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={isCreating || !sourceCardId || !targetCardId}
            onClick={handleCreate}
            type="button"
          >
            {isCreating ? "Creating..." : "Create Connection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
