"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
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
import { Trash2, X, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { bulkDeleteRecipes, bulkDeleteDishes } from "../actions";

interface SelectableListProps {
  items: { id: string; name: string }[];
  type: "recipes" | "dishes";
  children: React.ReactNode;
}

export function SelectableList({ items, type, children }: SelectableListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const selectMode = true;

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      try {
        if (type === "recipes") await bulkDeleteRecipes(ids);
        else await bulkDeleteDishes(ids);
        toast.success(`Deleted ${ids.length} ${type}`);
        clearSelection();
      } catch {
        toast.error(`Failed to delete ${type}`);
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Bulk actions - visible when items selected */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2">
          <Checkbox
            checked={selectedIds.size === items.length}
            onCheckedChange={selectAll}
            className="h-4 w-4"
          />
          <span className="text-xs font-medium">
            {selectedIds.size} of {items.length} selected
          </span>
          <div className="flex-1" />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5 text-xs h-7"
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete {selectedIds.size}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete {selectedIds.size} {type}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will soft-delete the selected {type}. They can be
                  recovered from the cleanup page.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete {selectedIds.size}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="text-xs h-7"
          >
            Clear
          </Button>
        </div>
      )}

      {/* Item grid with optional checkboxes */}
      <SelectionContext.Provider value={{ selectMode, selectedIds, toggleItem }}>
        {children}
      </SelectionContext.Provider>
    </div>
  );
}

// Context for checkboxes inside the grid
import { createContext, useContext } from "react";

interface SelectionContextType {
  selectMode: boolean;
  selectedIds: Set<string>;
  toggleItem: (id: string) => void;
}

const SelectionContext = createContext<SelectionContextType>({
  selectMode: false,
  selectedIds: new Set(),
  toggleItem: () => {},
});

export function useSelection() {
  return useContext(SelectionContext);
}

export function ItemCheckbox({ id }: { id: string }) {
  const { selectMode, selectedIds, toggleItem } = useSelection();
  if (!selectMode) return null;

  return (
    <div
      className="shrink-0"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleItem(id);
      }}
    >
      <Checkbox
        checked={selectedIds.has(id)}
        className="h-4 w-4 pointer-events-none"
      />
    </div>
  );
}
