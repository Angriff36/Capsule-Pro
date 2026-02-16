"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useReactFlow } from "@xyflow/react";
import { toast } from "sonner";
import {
  BookOpenIcon,
  CalendarIcon,
  CheckSquareIcon,
  ChevronRightIcon,
  FileTextIcon,
  Loader2Icon,
  PackageIcon,
  PlusIcon,
  SendIcon,
  StickyNoteIcon,
  TruckIcon,
  UserIcon,
  UsersIcon,
  UtensilsIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@repo/design-system/components/ui/button";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/design-system/components/ui/collapsible";
import {
  browseEntities,
  type BrowseItem,
} from "../actions/browse-entities";
import { addProjection } from "../actions/projections";
import type { BoardProjection } from "../types/board";
import {
  ENTITY_TYPE_COLORS,
  ENTITY_TYPE_LABELS,
  type EntityType,
} from "../types/entities";

// ============================================================================
// Constants
// ============================================================================

/** Ordered list of entity categories to display */
const ENTITY_CATEGORIES: Array<{
  type: EntityType;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { type: "event", icon: CalendarIcon },
  { type: "client", icon: UsersIcon },
  { type: "prep_task", icon: CheckSquareIcon },
  { type: "kitchen_task", icon: UtensilsIcon },
  { type: "employee", icon: UserIcon },
  { type: "inventory_item", icon: PackageIcon },
  { type: "recipe", icon: BookOpenIcon },
  { type: "dish", icon: UtensilsIcon },
  { type: "proposal", icon: FileTextIcon },
  { type: "shipment", icon: TruckIcon },
  { type: "note", icon: StickyNoteIcon },
];

// ============================================================================
// Types
// ============================================================================

interface EntityBrowserProps {
  boardId: string;
  onClose: () => void;
  onProjectionAdded?: (projection: BoardProjection) => void;
  projections?: BoardProjection[];
}

interface CategoryState {
  items: BrowseItem[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Component
// ============================================================================

export function EntityBrowser({
  boardId,
  onClose,
  onProjectionAdded,
  projections = [],
}: EntityBrowserProps) {
  const reactFlow = useReactFlow();
  const [isPending, startTransition] = useTransition();

  // Build set of entity keys already on board for quick lookup
  const onBoardKeys = useMemo(
    () => new Set(projections.map((p) => `${p.entityType}:${p.entityId}`)),
    [projections]
  );

  // Track loaded state per category — lazy load on expand
  const [categories, setCategories] = useState<Record<string, CategoryState>>(
    {}
  );

  // Track which item is currently being added
  const [addingId, setAddingId] = useState<string | null>(null);

  // ---- Load a category's items on first expand ----
  const handleOpenChange = useCallback(
    (entityType: EntityType, isOpen: boolean) => {
      if (!isOpen) return;

      // Already loaded? Skip.
      const existing = categories[entityType];
      if (existing?.loaded || existing?.loading) return;

      // Mark as loading
      setCategories((prev) => ({
        ...prev,
        [entityType]: { items: [], loaded: false, loading: true, error: null },
      }));

      // Fetch
      browseEntities(entityType)
        .then((result) => {
          if (result.success) {
            setCategories((prev) => ({
              ...prev,
              [entityType]: {
                items: result.items,
                loaded: true,
                loading: false,
                error: null,
              },
            }));
          } else {
            console.error(
              `[EntityBrowser] Failed to browse ${entityType}:`,
              result.error
            );
            setCategories((prev) => ({
              ...prev,
              [entityType]: {
                items: [],
                loaded: true,
                loading: false,
                error: result.error ?? "Failed to load",
              },
            }));
          }
        })
        .catch((error) => {
          console.error(
            `[EntityBrowser] Error browsing ${entityType}:`,
            error
          );
          setCategories((prev) => ({
            ...prev,
            [entityType]: {
              items: [],
              loaded: true,
              loading: false,
              error: "Failed to load",
            },
          }));
        });
    },
    [categories]
  );

  // ---- Add an entity to the board ----
  const handleAddEntity = useCallback(
    (item: BrowseItem) => {
      if (addingId) return; // Prevent double-clicks

      setAddingId(item.id);

      startTransition(async () => {
        try {
          // Smart placement: use grid pattern to avoid overlapping
          const viewport = reactFlow.getViewport();
          const viewportCenterX =
            (-viewport.x + window.innerWidth / 2) / viewport.zoom;
          const viewportCenterY =
            (-viewport.y + window.innerHeight / 2) / viewport.zoom;

          // Grid spacing based on card dimensions (280px width + 40px gap)
          const GRID_SPACING_X = 320;
          const GRID_SPACING_Y = 200;

          // Use existing projections to determine grid position
          const existingCount = projections.length;
          const gridX = existingCount % 3;
          const gridY = Math.floor(existingCount / 3);

          const offsetX = gridX * GRID_SPACING_X;
          const offsetY = gridY * GRID_SPACING_Y;

          const result = await addProjection(boardId, {
            entityType: item.entityType,
            entityId: item.id,
            positionX: Math.round(viewportCenterX + offsetX),
            positionY: Math.round(viewportCenterY + offsetY),
          });

          if (result.success && result.projection) {
            onProjectionAdded?.(result.projection);
            const label =
              ENTITY_TYPE_LABELS[item.entityType] ?? item.entityType;
            toast.success(`${label} added to board`);
          } else {
            // Check for duplicate error and show specific message
            const errorMsg = result.error ?? "Failed to add entity";
            if (errorMsg.includes("already exists") || errorMsg.includes("already on this board")) {
              const label =
                ENTITY_TYPE_LABELS[item.entityType] ?? item.entityType;
              toast.info(`This ${label.toLowerCase()} is already on the board`);
            } else {
              toast.error(errorMsg);
            }
          }
        } catch (error) {
          console.error("[EntityBrowser] Failed to add entity:", error);
          toast.error("Failed to add entity to board");
        } finally {
          setAddingId(null);
        }
      });
    },
    [addingId, boardId, onProjectionAdded, reactFlow, startTransition]
  );

  return (
    <div className="flex h-full w-72 flex-col border-l bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <h2 className="text-sm font-semibold">Entities</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable category list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {ENTITY_CATEGORIES.map(({ type, icon: Icon }) => {
            const label = ENTITY_TYPE_LABELS[type] ?? type;
            const colors = ENTITY_TYPE_COLORS[type];
            const state = categories[type];

            return (
              <Collapsible
                key={type}
                onOpenChange={(isOpen) => handleOpenChange(type, isOpen)}
              >
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-muted/50 transition-colors group">
                  <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                  <Icon className={`h-4 w-4 shrink-0 ${colors.icon}`} />
                  <span className="flex-1 text-left">{label}s</span>
                  {state?.loaded && (
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {state.items.length}
                    </span>
                  )}
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="ml-5 mt-0.5 mb-1 space-y-px">
                    {/* Loading */}
                    {state?.loading && (
                      <div className="flex items-center gap-2 px-2 py-2">
                        <Loader2Icon className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Loading...
                        </span>
                      </div>
                    )}

                    {/* Error */}
                    {state?.error && (
                      <div className="px-2 py-2 text-xs text-destructive">
                        {state.error}
                      </div>
                    )}

                    {/* Empty */}
                    {state?.loaded && !state.error && state.items.length === 0 && (
                      <div className="px-2 py-2 text-xs text-muted-foreground">
                        No {label.toLowerCase()}s found
                      </div>
                    )}

                    {/* Items */}
                    {state?.items.map((item) => {
                      const isAdding = addingId === item.id;
                      const isOnBoard = onBoardKeys.has(`${item.entityType}:${item.id}`);

                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={isPending || isAdding || isOnBoard}
                          onClick={() => handleAddEntity(item)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/50 transition-colors disabled:opacity-50 group/item"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-foreground">
                              {item.title}
                            </div>
                            {item.subtitle && (
                              <div className="truncate text-muted-foreground text-[10px]">
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                          {isAdding ? (
                            <Loader2Icon className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
                          ) : isOnBoard ? (
                            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              On board
                            </span>
                          ) : (
                            <PlusIcon className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
