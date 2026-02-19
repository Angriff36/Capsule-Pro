"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Check, ChevronDown, Edit3, Loader2, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BULK_EDITABLE_PROPERTIES,
  type BulkEditChanges,
  type BulkEditItem,
  type BulkEditPreview,
  type BulkEditResult,
  ENTITY_STATUS_OPTIONS,
  executeBulkEdit,
  getBulkEditPreview,
  PRIORITY_OPTIONS,
} from "../actions/bulk-edit";
import type { BoardProjection, ResolvedEntity } from "../types/index";

// ============================================================================
// Types
// ============================================================================

interface BulkActionToolbarProps {
  /** Currently selected projections */
  selectedProjections: BoardProjection[];
  /** Resolved entities map for displaying entity info */
  entities: Map<string, ResolvedEntity>;
  /** Callback when bulk edit is completed */
  onBulkEditComplete?: () => void;
  /** Callback to clear selection */
  onClearSelection?: () => void;
  /** Callback to perform undo */
  onUndo?: (snapshot: BulkEditResult["undoSnapshot"]) => void;
}

// ============================================================================
// Component
// ============================================================================

export function BulkActionToolbar({
  selectedProjections,
  entities,
  onBulkEditComplete,
  onClearSelection,
  onUndo,
}: BulkActionToolbarProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [preview, setPreview] = useState<BulkEditPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<BulkEditChanges>({});

  // Determine what properties can be bulk edited based on selected entity types
  const editableProperties = useMemo(() => {
    const selectedTypes = new Set(selectedProjections.map((p) => p.entityType));
    const common: string[] = [];

    // Find properties that ALL selected types have in common
    const typeArray = Array.from(selectedTypes);
    if (typeArray.length === 0) {
      return [];
    }

    const firstTypeProps = new Set(
      BULK_EDITABLE_PROPERTIES[typeArray[0]] ?? []
    );

    for (const prop of firstTypeProps) {
      const allHaveIt = typeArray.every((type) =>
        (BULK_EDITABLE_PROPERTIES[type] ?? []).includes(prop)
      );
      if (allHaveIt) {
        common.push(prop);
      }
    }

    return common;
  }, [selectedProjections]);

  // Get available status options based on selected types
  const availableStatusOptions = useMemo(() => {
    const selectedTypes = new Set(selectedProjections.map((p) => p.entityType));
    const options = new Set<string>();

    for (const type of selectedTypes) {
      const typeOptions = ENTITY_STATUS_OPTIONS[type] ?? [];
      for (const opt of typeOptions) {
        options.add(opt);
      }
    }

    return Array.from(options);
  }, [selectedProjections]);

  // Can show status options if any selected entity type supports status
  const canEditStatus = useMemo(() => {
    return selectedProjections.some((p) =>
      (BULK_EDITABLE_PROPERTIES[p.entityType] ?? []).includes("status")
    );
  }, [selectedProjections]);

  const canEditPriority = useMemo(() => {
    return selectedProjections.some((p) =>
      (BULK_EDITABLE_PROPERTIES[p.entityType] ?? []).includes("priority")
    );
  }, [selectedProjections]);

  // Generate preview when changes are made
  const handleChangesUpdate = useCallback(
    async (changes: BulkEditChanges) => {
      setPendingChanges(changes);

      if (Object.values(changes).every((v) => v === undefined)) {
        setPreview(null);
        return;
      }

      setIsLoadingPreview(true);
      try {
        const items: BulkEditItem[] = selectedProjections.map((p) => ({
          entityType: p.entityType,
          entityId: p.entityId,
          projectionId: p.id,
        }));

        const result = await getBulkEditPreview(items, changes);
        setPreview(result);
      } catch (error) {
        console.error("[BulkActionToolbar] Failed to get preview:", error);
      } finally {
        setIsLoadingPreview(false);
      }
    },
    [selectedProjections]
  );

  // Execute bulk edit
  const handleExecute = useCallback(async () => {
    if (Object.values(pendingChanges).every((v) => v === undefined)) {
      return;
    }

    setIsExecuting(true);
    try {
      const items: BulkEditItem[] = selectedProjections.map((p) => ({
        entityType: p.entityType,
        entityId: p.entityId,
        projectionId: p.id,
      }));

      const result = await executeBulkEdit(items, pendingChanges);

      if (result.success) {
        toast.success(`Updated ${result.updatedCount} entities`);
        onBulkEditComplete?.();
        setIsPopoverOpen(false);
        setPendingChanges({});
        setPreview(null);
        onClearSelection?.();

        // Store undo snapshot for potential undo
        if (result.undoSnapshot.length > 0 && onUndo) {
          // Show undo toast
          toast("Bulk edit completed", {
            action: {
              label: "Undo",
              onClick: () => onUndo(result.undoSnapshot),
            },
          });
        }
      } else {
        toast.error(
          `Failed to update some entities: ${result.errors
            .map((e) => e.error)
            .join(", ")}`
        );
      }
    } catch (error) {
      console.error("[BulkActionToolbar] Failed to execute:", error);
      toast.error("Failed to update entities");
    } finally {
      setIsExecuting(false);
    }
  }, [
    pendingChanges,
    selectedProjections,
    onBulkEditComplete,
    onClearSelection,
    onUndo,
  ]);

  // Clear changes
  const handleClearChanges = useCallback(() => {
    setPendingChanges({});
    setPreview(null);
  }, []);

  // If no items selected, don't render
  if (selectedProjections.length === 0) {
    return null;
  }

  // Check if any properties can be edited
  if (editableProperties.length === 0 && !canEditStatus && !canEditPriority) {
    return (
      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-2 shadow-lg">
          <span className="text-sm text-muted-foreground">
            {selectedProjections.length} items selected (no editable properties)
          </span>
          <Button onClick={onClearSelection} size="sm" variant="ghost">
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 shadow-lg">
        {/* Selection count */}
        <span className="text-sm font-medium">
          {selectedProjections.length} selected
        </span>

        {/* Clear selection button */}
        <Button onClick={onClearSelection} size="sm" variant="ghost">
          <X className="size-4" />
        </Button>

        <div className="h-6 w-px bg-border" />

        {/* Bulk Edit Popover */}
        <Popover onOpenChange={setIsPopoverOpen} open={isPopoverOpen}>
          <PopoverTrigger asChild>
            <Button className="gap-1.5" size="sm" variant="outline">
              <Edit3 className="size-4" />
              Bulk Edit
              <ChevronDown className="size-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-80">
            <div className="space-y-4">
              <div className="text-sm font-medium">Bulk Edit Properties</div>

              {/* Status selector */}
              {canEditStatus && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Status
                  </label>
                  <Select
                    onValueChange={(value) =>
                      handleChangesUpdate({
                        ...pendingChanges,
                        status: value || undefined,
                      })
                    }
                    value={pendingChanges.status ?? ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Clear</SelectItem>
                      {availableStatusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Priority selector */}
              {canEditPriority && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Priority
                  </label>
                  <Select
                    onValueChange={(value) =>
                      handleChangesUpdate({
                        ...pendingChanges,
                        priority: value || undefined,
                      })
                    }
                    value={pendingChanges.priority ?? ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Clear</SelectItem>
                      {PRIORITY_OPTIONS.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Preview */}
              {(isLoadingPreview || preview) && (
                <div className="rounded-md border bg-muted/50 p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Preview Changes
                  </div>
                  {isLoadingPreview ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="size-4 animate-spin" />
                    </div>
                  ) : preview ? (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {preview.warnings.length > 0 && (
                        <div className="text-xs text-amber-600">
                          {preview.warnings.join(", ")}
                        </div>
                      )}
                      {preview.items.map((item, i) => (
                        <div
                          className="text-xs"
                          key={`${item.entityId}-${item.fieldName}-${i}`}
                        >
                          <span className="font-medium">
                            {item.entityTitle}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            ({item.fieldName}):{" "}
                          </span>
                          <span className="text-red-600 line-through">
                            {item.currentValue}
                          </span>
                          <span className="text-muted-foreground"> → </span>
                          <span className="text-green-600">
                            {item.newValue}
                          </span>
                        </div>
                      ))}
                      {preview.items.length === 0 &&
                        preview.warnings.length === 0 && (
                          <div className="text-xs text-muted-foreground">
                            No changes to apply
                          </div>
                        )}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  disabled={isExecuting}
                  onClick={handleClearChanges}
                  size="sm"
                  variant="ghost"
                >
                  Clear
                </Button>
                <Button
                  disabled={
                    isExecuting ||
                    Object.values(pendingChanges).every(
                      (v) => v === undefined
                    ) ||
                    (preview && preview.items.length === 0)
                  }
                  onClick={handleExecute}
                  size="sm"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-1" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Check className="size-4 mr-1" />
                      Apply Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
