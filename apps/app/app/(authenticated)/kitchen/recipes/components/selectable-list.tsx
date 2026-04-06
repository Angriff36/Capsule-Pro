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
import { Input } from "@repo/design-system/components/ui/input";
import { Check, DollarSign, Tag, Trash2 } from "lucide-react";
import { createContext, useContext, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  bulkDeleteDishes,
  bulkDeleteRecipes,
  bulkUpdateDishPrice,
  bulkUpdateNames,
} from "../actions";

interface SelectableListProps {
  items: { id: string; name: string }[];
  type: "recipes" | "dishes";
  children: React.ReactNode;
}

interface SelectionContextType {
  selectMode: boolean;
  selectedIds: Set<string>;
  toggleItem: (id: string) => void;
  editMode: boolean;
}

const SelectionContext = createContext<SelectionContextType>({
  selectMode: false,
  selectedIds: new Set(),
  toggleItem: () => {},
  editMode: false,
});

export function useSelection() {
  return useContext(SelectionContext);
}

export function SelectableList({ items, type, children }: SelectableListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [selectMode, setSelectMode] = useState(true);

  const [batchPrice, setBatchPrice] = useState("");
  const [batchName, setBatchName] = useState("");
  const [showBatchEdit, setShowBatchEdit] = useState(false);

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
    setShowBatchEdit(false);
    setBatchPrice("");
    setBatchName("");
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

  const handleBulkPrice = () => {
    const ids = Array.from(selectedIds);
    const num = Number.parseFloat(batchPrice);
    if (Number.isNaN(num) || num < 0) {
      toast.error("Enter a valid price");
      return;
    }
    startTransition(async () => {
      try {
        await bulkUpdateDishPrice(ids, batchPrice);
        toast.success(`Updated price on ${ids.length} dishes`);
        setBatchPrice("");
      } catch {
        toast.error("Failed to update prices");
      }
    });
  };

  const handleBulkName = () => {
    const ids = Array.from(selectedIds);
    if (!batchName.trim()) {
      toast.error("Enter a name");
      return;
    }
    startTransition(async () => {
      try {
        await bulkUpdateNames(ids, type, batchName);
        toast.success(`Renamed ${ids.length} ${type}`);
        setBatchName("");
      } catch {
        toast.error("Failed to rename");
      }
    });
  };

  return (
    <div className="space-y-3">
      {selectedIds.size > 0 && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size === items.length}
              className="h-4 w-4"
              onCheckedChange={selectAll}
            />
            <span className="text-xs font-medium">
              {selectedIds.size} of {items.length} selected
            </span>
            <div className="flex-1" />

            {type === "dishes" && (
              <Button
                className="text-xs h-7 gap-1.5"
                onClick={() => setShowBatchEdit((v) => !v)}
                size="sm"
                variant="ghost"
              >
                <DollarSign className="h-3.5 w-3.5" />
                Batch Edit
              </Button>
            )}

            <Button
              className="text-xs h-7 gap-1.5"
              onClick={() => setShowBatchEdit((v) => !v)}
              size="sm"
              variant="ghost"
            >
              <Tag className="h-3.5 w-3.5" />
              Rename
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="gap-1.5 text-xs h-7"
                  disabled={isPending}
                  size="sm"
                  variant="destructive"
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
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleBulkDelete}
                  >
                    Delete {selectedIds.size}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              className="text-xs h-7"
              onClick={clearSelection}
              size="sm"
              variant="ghost"
            >
              Clear
            </Button>
          </div>

          {showBatchEdit && (
            <div className="flex items-center gap-2 pt-1 border-t border-border/50">
              {type === "dishes" && (
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="h-7 w-28 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min="0"
                    onChange={(e) => setBatchPrice(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleBulkPrice();
                    }}
                    placeholder="Set price..."
                    step="0.01"
                    type="number"
                    value={batchPrice}
                  />
                  <Button
                    className="h-7 text-xs gap-1"
                    disabled={isPending || !batchPrice}
                    onClick={handleBulkPrice}
                    size="sm"
                    variant="secondary"
                  >
                    <Check className="h-3 w-3" />
                    Apply
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="h-7 w-44 text-xs"
                  onChange={(e) => setBatchName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleBulkName();
                  }}
                  placeholder="Set name for all..."
                  value={batchName}
                />
                <Button
                  className="h-7 text-xs gap-1"
                  disabled={isPending || !batchName.trim()}
                  onClick={handleBulkName}
                  size="sm"
                  variant="secondary"
                >
                  <Check className="h-3 w-3" />
                  Apply
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <SelectionContext.Provider
        value={{ selectMode, selectedIds, toggleItem, editMode: true }}
      >
        {children}
      </SelectionContext.Provider>
    </div>
  );
}

export function ItemCheckbox({ id }: { id: string }) {
  const { selectMode, selectedIds, toggleItem } = useSelection();
  if (!selectMode) return null;

  return (
    <div
      aria-checked={selectedIds.has(id)}
      className="shrink-0"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleItem(id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleItem(id);
        }
      }}
      role="checkbox"
      tabIndex={0}
    >
      <Checkbox
        checked={selectedIds.has(id)}
        className="h-4 w-4 pointer-events-none"
      />
    </div>
  );
}
