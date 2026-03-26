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
  const [selectMode, setSelectMode] = useState(false);

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
      {/* Selection controls */}
      <div className="flex items-center gap-2">
        <Button
          variant={selectMode ? "secondary" : "ghost"}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => {
            if (selectMode) clearSelection();
            else setSelectMode(true);
          }}
        >
          <CheckSquare className="h-3.5 w-3.5" />
          {selectMode ? "Cancel" : "Select"}
        </Button>

        {selectMode && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={selectAll}
            >
              {selectedIds.size === items.length ? "Deselect all" : "Select all"}
            </Button>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs font-medium text-accent">
                  {selectedIds.size} selected
                </span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1.5 text-xs"
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
                  className="gap-1 text-xs"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

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
