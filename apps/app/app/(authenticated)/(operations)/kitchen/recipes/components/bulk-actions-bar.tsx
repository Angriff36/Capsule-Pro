"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/design-system/components/ui/alert-dialog";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  bulkDeleteDishes,
  bulkDeleteRecipes,
  type DishDeleteMode,
  type DishDeletionImpact,
  deleteDish,
  deleteRecipe,
  getDishDeletionImpact,
} from "../actions";

interface BulkActionsBarProps {
  onClearSelection: () => void;
  selectedIds: string[];
  type: "recipes" | "dishes";
}

export function BulkActionsBar({
  selectedIds,
  onClearSelection,
  type,
}: BulkActionsBarProps) {
  const [isPending, startTransition] = useTransition();
  const count = selectedIds.length;

  if (count === 0) {
    return null;
  }

  const handleBulkDelete = () => {
    startTransition(async () => {
      try {
        if (type === "recipes") {
          await bulkDeleteRecipes(selectedIds);
        } else {
          await bulkDeleteDishes(selectedIds);
        }
        toast.success(`Deleted ${count} ${type}`);
        onClearSelection();
      } catch {
        toast.error(`Failed to delete ${type}`);
      }
    });
  };

  return (
    <div className="sticky top-0 z-10 flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2.5">
      <span className="font-medium text-accent text-sm">
        {count} {type} selected
      </span>
      <div className="flex-1" />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            className="gap-1.5"
            disabled={isPending}
            size="sm"
            variant="destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete {count}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {count} {type}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the selected {type}. They can be recovered
              from the cleanup page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkDelete}
            >
              Delete {count} {type}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button
        className="gap-1"
        onClick={onClearSelection}
        size="sm"
        variant="ghost"
      >
        <X className="h-3.5 w-3.5" />
        Clear
      </Button>
    </div>
  );
}

interface SelectableCheckboxProps {
  id: string;
  onToggle: (id: string) => void;
  selected: boolean;
}

export function SelectableCheckbox({
  id,
  selected,
  onToggle,
}: SelectableCheckboxProps) {
  return (
    <Checkbox
      checked={selected}
      className="h-4 w-4 shrink-0"
      onCheckedChange={() => onToggle(id)}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

interface SingleDeleteButtonProps {
  id: string;
  name: string;
  type: "recipe" | "dish";
}

/** One-sentence summary of what still references the dish. */
function impactSentence(impact: DishDeletionImpact): string {
  const parts: string[] = [];
  if (impact.confirmedUpcomingEvents > 0) {
    parts.push(`${impact.confirmedUpcomingEvents} confirmed upcoming event(s)`);
  }
  if (impact.draftUpcomingEvents > 0) {
    parts.push(`${impact.draftUpcomingEvents} draft upcoming event(s)`);
  }
  if (impact.activePrepListItems > 0) {
    parts.push(`${impact.activePrepListItems} prep-list item(s)`);
  }
  if (impact.activePrepTasks > 0) {
    parts.push(`${impact.activePrepTasks} active prep task(s)`);
  }
  return parts.join(", ");
}

export function SingleDeleteButton({
  id,
  name,
  type,
}: SingleDeleteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<DishDeletionImpact | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);

  // On open, look up what still references the dish so deletion can preserve
  // existing commitments by default and offer an explicit draft-removal choice.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && type === "dish") {
      setImpact(null);
      setLoadingImpact(true);
      getDishDeletionImpact(id)
        .then(setImpact)
        .catch(() => setImpact(null))
        .finally(() => setLoadingImpact(false));
    }
  };

  const runDelete = (mode: DishDeleteMode) => {
    startTransition(async () => {
      try {
        if (type === "recipe") {
          await deleteRecipe(id);
        } else {
          await deleteDish(id, mode);
        }
        toast.success(`Deleted "${name}"`);
        setOpen(false);
      } catch {
        toast.error(`Failed to delete "${name}"`);
      }
    });
  };

  const hasDeps = type === "dish" && (impact?.hasDependencies ?? false);

  return (
    <AlertDialog onOpenChange={handleOpenChange} open={open}>
      <AlertDialogTrigger asChild>
        <Button
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          disabled={isPending}
          onClick={(e) => {
            // The row is a link; preventDefault stops navigation. Radix skips
            // its own open handler when defaultPrevented, so drive the
            // controlled dialog open explicitly (also kicks off the impact fetch).
            e.preventDefault();
            e.stopPropagation();
            handleOpenChange(true);
          }}
          size="icon"
          variant="ghost"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            {type === "recipe" &&
              "This will soft-delete the recipe. It can be recovered from the cleanup page."}
            {type === "dish" &&
              loadingImpact &&
              "Checking existing event commitments and prep work…"}
            {type === "dish" &&
              !loadingImpact &&
              hasDeps &&
              impact &&
              `This dish is still used by ${impactSentence(impact)}. By default these existing commitments are PRESERVED — only the catalog dish is hidden.`}
            {type === "dish" &&
              !(loadingImpact || hasDeps) &&
              "No upcoming events or active prep work use this dish. It will be soft-deleted."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {hasDeps && impact && impact.draftUpcomingEvents > 0 && (
            <Button
              disabled={isPending}
              onClick={() => runDelete("removeDrafts")}
              variant="outline"
            >
              Delete & remove from {impact.draftUpcomingEvents} draft event(s)
            </Button>
          )}
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={type === "dish" && loadingImpact}
            onClick={(e) => {
              // Manage close ourselves so the async delete + toast complete.
              e.preventDefault();
              runDelete("preserve");
            }}
          >
            {hasDeps ? "Delete — keep commitments" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
