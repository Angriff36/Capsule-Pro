"use client";

import { Button } from "@repo/design-system/components/ui/button";
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
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Trash2, X } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  bulkDeleteRecipes,
  bulkDeleteDishes,
  deleteRecipe,
  deleteDish,
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
            variant="destructive"
            size="sm"
            className="gap-1.5"
            disabled={isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete {count}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {count} {type}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the selected {type}. They can be recovered
              from the cleanup page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {count} {type}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="gap-1"
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
      onCheckedChange={() => onToggle(id)}
      className="h-4 w-4 shrink-0"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

interface SingleDeleteButtonProps {
  id: string;
  name: string;
  type: "recipe" | "dish";
}

export function SingleDeleteButton({ id, name, type }: SingleDeleteButtonProps) {
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
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          disabled={isPending}
          onClick={(e) => e.preventDefault()}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This will soft-delete the {type}. It can be recovered from the cleanup page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
