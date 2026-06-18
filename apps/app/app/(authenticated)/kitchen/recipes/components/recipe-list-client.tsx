"use client";

import { useState } from "react";
import {
  BulkActionsBar,
  SelectableCheckbox,
  SingleDeleteButton,
} from "./bulk-actions-bar";

interface RecipeListClientProps {
  children: (props: {
    selectedIds: string[];
    toggleSelection: (id: string) => void;
    isSelected: (id: string) => boolean;
    selectAll: (ids: string[]) => void;
    clearSelection: () => void;
    bulkBar: React.ReactNode;
    SelectCheckbox: typeof SelectableCheckbox;
    DeleteButton: typeof SingleDeleteButton;
  }) => React.ReactNode;
  type: "recipes" | "dishes";
}

export function RecipeListClient({ children, type }: RecipeListClientProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const isSelected = (id: string) => selectedIds.includes(id);

  const selectAll = (ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = new Set(ids).isSubsetOf(new Set(prev));
      return allSelected
        ? [...new Set(prev).difference(new Set(ids))]
        : [...new Set(prev).union(new Set(ids))];
    });
  };

  const clearSelection = () => setSelectedIds([]);

  const bulkBar = (
    <BulkActionsBar
      onClearSelection={clearSelection}
      selectedIds={selectedIds}
      type={type}
    />
  );

  return (
    <>
      {children({
        selectedIds,
        toggleSelection,
        isSelected,
        selectAll,
        clearSelection,
        bulkBar,
        SelectCheckbox: SelectableCheckbox,
        DeleteButton: SingleDeleteButton,
      })}
    </>
  );
}
