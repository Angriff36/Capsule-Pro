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
import type { PaletteDish } from "../actions";

export interface DishDialogSubmit {
  course: string;
  quantityServings: number;
  specialInstructions: string;
}

const COURSE_PRESETS = ["Appetizer", "Main", "Side", "Dessert"];

interface DishDialogProps {
  /** Non-null opens the dialog for this palette dish. */
  dish: PaletteDish | null;
  errorMessage: string | null;
  /** Servings default to the event's guest count. */
  guestCount: number;
  onClose: () => void;
  onConfirm: (input: DishDialogSubmit) => void;
  pending: boolean;
}

export function DishDialog({
  dish,
  guestCount,
  pending,
  errorMessage,
  onConfirm,
  onClose,
}: DishDialogProps) {
  const [quantity, setQuantity] = useState("");
  const [course, setCourse] = useState("");
  const [instructions, setInstructions] = useState("");

  // Re-seed inputs each time the dialog opens for a new dish.
  useEffect(() => {
    if (!dish) {
      return;
    }
    setQuantity(String(Math.max(1, guestCount)));
    setCourse("");
    setInstructions("");
  }, [dish, guestCount]);

  const parsedQuantity = Number.parseInt(quantity, 10);
  const valid = !Number.isNaN(parsedQuantity) && parsedQuantity > 0;

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={dish !== null}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add dish draft</DialogTitle>
          <DialogDescription>
            {dish ? `Add ${dish.name} to this event's menu as a draft.` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="dish-quantity">Servings</Label>
            <Input
              id="dish-quantity"
              inputMode="numeric"
              min={1}
              onChange={(e) => setQuantity(e.target.value)}
              type="number"
              value={quantity}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dish-course">Course</Label>
            <Input
              id="dish-course"
              onChange={(e) => setCourse(e.target.value)}
              placeholder="e.g. Main"
              value={course}
            />
            <div className="flex flex-wrap gap-1">
              {COURSE_PRESETS.map((preset) => (
                <button
                  className="rounded-full border border-border px-2 py-0.5 text-muted-foreground text-xs transition-colors hover:border-primary/50 hover:text-foreground"
                  key={preset}
                  onClick={() => setCourse(preset)}
                  type="button"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dish-instructions">
              Special instructions{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="dish-instructions"
              onChange={(e) => setInstructions(e.target.value)}
              value={instructions}
            />
          </div>
          {errorMessage && (
            <p className="text-destructive text-sm">{errorMessage}</p>
          )}
        </div>
        <DialogFooter>
          <Button disabled={pending} onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={!valid || pending}
            onClick={() =>
              onConfirm({
                quantityServings: parsedQuantity,
                course: course.trim(),
                specialInstructions: instructions.trim(),
              })
            }
          >
            {pending ? "Adding…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
