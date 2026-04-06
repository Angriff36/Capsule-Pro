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
import { useTransition } from "react";
import { toast } from "sonner";
import {
  bulkDeleteDishes,
  bulkDeleteRecipes,
  deleteDish,
  deleteRecipe,
} from "../actions";

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  type: "recipes" | "dishes";
}

export function BulkActionsBar({
  selectedIds,
  onClearSelection,
  type,
}: BulkActionsBarProps) {
  const [isPending, startTransition] = useTransition();
  const count = selectedIds.length;

  if (count === 0) return null;

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
    <div className="sticky top-0 z-10 flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2.5 shadow-sm">
      <span className="text-sm font-medium text-accent">
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
  selected: boolean;
  onToggle: (id: string) => void;
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

export function SingleDeleteButton({
  id,
  name,
  type,
}: SingleDeleteButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        if (type === "recipe") {
          await deleteRecipe(id);
        } else {
          await deleteDish(id);
        }
        toast.success(`Deleted "${name}"`);
      } catch {
        toast.error(`Failed to delete "${name}"`);
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          disabled={isPending}
          onClick={(e) => e.preventDefault()}
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
            This will soft-delete the {type}. It can be recovered from the
            cleanup page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleDelete}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
