"use client";

import { useState } from "react";
import { BulkActionsBar, SelectableCheckbox, SingleDeleteButton } from "./bulk-actions-bar";

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
      const allSelected = ids.every((id) => prev.includes(id));
      return allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])];
    });
  };

  const clearSelection = () => setSelectedIds([]);

  const bulkBar = (
    <BulkActionsBar
      selectedIds={selectedIds}
      onClearSelection={clearSelection}
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
