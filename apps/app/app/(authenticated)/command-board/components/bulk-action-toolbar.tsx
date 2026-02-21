"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
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
import {
  Check,
  ChevronDown,
  Edit3,
  FolderPlus,
  Loader2,
  Ungroup,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type BulkEditChanges,
  type BulkEditItem,
  type BulkEditPreview,
  type BulkEditResult,
  executeBulkEdit,
  getBulkEditPreview,
} from "../actions/bulk-edit";
import {
  BULK_EDITABLE_PROPERTIES,
  ENTITY_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from "../actions/bulk-edit-utils";
import {
  createGroup,
  getSharedGroupForProjections,
  removeProjectionsFromGroup,
} from "../actions/groups";
import type { BoardProjection } from "../types/index";

// ============================================================================
// Types
// ============================================================================

interface BulkActionToolbarProps {
  /** Currently selected projections */
  selectedProjections: BoardProjection[];
  /** Board ID for group operations */
  boardId: string;
  /** Callback when bulk edit is completed */
  onBulkEditComplete?: () => void;
  /** Callback to clear selection */
  onClearSelection?: () => void;
  /** Callback to perform undo */
  onUndo?: (snapshot: BulkEditResult["undoSnapshot"]) => void;
  /** Callback when group is created/modified */
  onGroupChange?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function BulkActionToolbar({
  selectedProjections,
  boardId,
  onBulkEditComplete,
  onClearSelection,
  onUndo,
  onGroupChange,
}: BulkActionToolbarProps) {
  const CLEAR_SELECT_VALUE = "__clear__";
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [preview, setPreview] = useState<BulkEditPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<BulkEditChanges>({});

  // Group-related state
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isUngrouping, setIsUngrouping] = useState(false);
  const [sharedGroupId, setSharedGroupId] = useState<string | null>(null);

  // Check if all selected projections share the same group
  useEffect(() => {
    async function checkSharedGroup() {
      if (selectedProjections.length < 2) {
        setSharedGroupId(null);
        return;
      }
      const projectionIds = selectedProjections.map((p) => p.id);
      const groupId = await getSharedGroupForProjections(projectionIds);
      setSharedGroupId(groupId);
    }
    checkSharedGroup();
  }, [selectedProjections]);

  // Can create group if 2+ items selected
  const canCreateGroup = selectedProjections.length >= 2;

  // Can ungroup if all selected items are in the same group
  const canUngroup = sharedGroupId !== null;

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

  // Create group handler
  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    setIsCreatingGroup(true);
    try {
      const projectionIds = selectedProjections.map((p) => p.id);
      const result = await createGroup(boardId, {
        name: groupName.trim(),
        projectionIds,
      });

      if (result.success) {
        toast.success(
          `Group "${groupName.trim()}" created with ${selectedProjections.length} items`
        );
        setIsGroupDialogOpen(false);
        setGroupName("");
        onGroupChange?.();
        onClearSelection?.();
      } else {
        toast.error(result.error ?? "Failed to create group");
      }
    } catch (error) {
      console.error("[BulkActionToolbar] Failed to create group:", error);
      toast.error("Failed to create group");
    } finally {
      setIsCreatingGroup(false);
    }
  }, [
    boardId,
    groupName,
    selectedProjections,
    onGroupChange,
    onClearSelection,
  ]);

  // Ungroup handler
  const handleUngroup = useCallback(async () => {
    if (!sharedGroupId) {
      return;
    }

    setIsUngrouping(true);
    try {
      const projectionIds = selectedProjections.map((p) => p.id);
      const result = await removeProjectionsFromGroup(projectionIds);

      toast.success(`${result.count} items removed from group`);
      onGroupChange?.();
      onClearSelection?.();
    } catch (error) {
      console.error("[BulkActionToolbar] Failed to ungroup:", error);
      toast.error("Failed to ungroup items");
    } finally {
      setIsUngrouping(false);
    }
  }, [sharedGroupId, selectedProjections, onGroupChange, onClearSelection]);

  // Render preview content based on loading state
  const renderPreviewContent = () => {
    if (isLoadingPreview) {
      return (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="size-4 animate-spin" />
        </div>
      );
    }

    if (preview) {
      return (
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
              <span className="font-medium">{item.entityTitle}</span>
              <span className="text-muted-foreground">
                {" "}
                ({item.fieldName}):{" "}
              </span>
              <span className="text-red-600 line-through">
                {item.currentValue}
              </span>
              <span className="text-muted-foreground"> → </span>
              <span className="text-green-600">{item.newValue}</span>
            </div>
          ))}
          {preview.items.length === 0 && preview.warnings.length === 0 && (
            <div className="text-xs text-muted-foreground">
              No changes to apply
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // If no items selected, don't render
  if (selectedProjections.length === 0) {
    return null;
  }

  // Check if any properties can be edited
  if (
    editableProperties.length === 0 &&
    !canEditStatus &&
    !canEditPriority &&
    !canCreateGroup
  ) {
    return (
      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-2 shadow-lg">
          <span className="text-sm text-muted-foreground">
            {selectedProjections.length} items selected (no actions available)
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
                  <label
                    className="text-xs text-muted-foreground"
                    htmlFor="bulk-status-select"
                  >
                    Status
                  </label>
                  <Select
                    onValueChange={(value) =>
                      handleChangesUpdate({
                        ...pendingChanges,
                          status:
                          value === CLEAR_SELECT_VALUE ? undefined : value,
                      })
                    }
                    value={pendingChanges.status ?? CLEAR_SELECT_VALUE}
                  >
                    <SelectTrigger id="bulk-status-select">
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CLEAR_SELECT_VALUE}>Clear</SelectItem>
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
                  <label
                    className="text-xs text-muted-foreground"
                    htmlFor="bulk-priority-select"
                  >
                    Priority
                  </label>
                  <Select
                    onValueChange={(value) =>
                      handleChangesUpdate({
                        ...pendingChanges,
                        priority:
                          value === CLEAR_SELECT_VALUE ? undefined : value,
                      })
                    }
                    value={pendingChanges.priority ?? CLEAR_SELECT_VALUE}
                  >
                    <SelectTrigger id="bulk-priority-select">
                      <SelectValue placeholder="Select priority..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CLEAR_SELECT_VALUE}>Clear</SelectItem>
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
                  {renderPreviewContent()}
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
                    (preview !== null && preview.items.length === 0)
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

        {/* Group actions */}
        {canCreateGroup && (
          <>
            <div className="h-6 w-px bg-border" />
            <Button
              className="gap-1.5"
              onClick={() => setIsGroupDialogOpen(true)}
              size="sm"
              variant="outline"
            >
              <FolderPlus className="size-4" />
              Group
            </Button>
          </>
        )}

        {canUngroup && (
          <Button
            className="gap-1.5"
            disabled={isUngrouping}
            onClick={handleUngroup}
            size="sm"
            variant="outline"
          >
            {isUngrouping ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Ungroup className="size-4" />
            )}
            Ungroup
          </Button>
        )}
      </div>

      {/* Group name dialog */}
      <Dialog onOpenChange={setIsGroupDialogOpen} open={isGroupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="group-name-input">
                Group Name
              </label>
              <Input
                id="group-name-input"
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isCreatingGroup) {
                    handleCreateGroup();
                  }
                }}
                placeholder="e.g., Weekend Events, Team Alpha..."
                value={groupName}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedProjections.length} items will be grouped together. You
              can expand/collapse the group or move it as a unit.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsGroupDialogOpen(false)} variant="ghost">
              Cancel
            </Button>
            <Button
              disabled={isCreatingGroup || !groupName.trim()}
              onClick={handleCreateGroup}
            >
              {isCreatingGroup ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1" />
                  Creating...
                </>
              ) : (
                "Create Group"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
