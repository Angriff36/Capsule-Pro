"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/design-system/components/ui/collapsible";
import { Input } from "@repo/design-system/components/ui/input";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { cn } from "@repo/design-system/lib/utils";
import { useReactFlow } from "@xyflow/react";
import {
  BookOpenIcon,
  CalendarIcon,
  CheckSquareIcon,
  ChevronRightIcon,
  FileTextIcon,
  Loader2Icon,
  PackageIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  StickyNoteIcon,
  TruckIcon,
  UserIcon,
  UsersIcon,
  UtensilsIcon,
  XIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { type BrowseItem, browseEntities } from "../actions/browse-entities";
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
  refreshing: boolean;
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

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Keyboard navigation state
  const [focusedCategoryIndex, setFocusedCategoryIndex] = useState<number>(0);
  const [focusedItemIndex, setFocusedItemIndex] = useState<number>(-1); // -1 means category header focused
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Filter items based on search query
  const filterItems = useCallback(
    (items: BrowseItem[]) => {
      if (!searchQuery.trim()) {
        return items;
      }
      const query = searchQuery.toLowerCase();
      return items.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.subtitle?.toLowerCase().includes(query)
      );
    },
    [searchQuery]
  );

  // ---- Load a category's items on first expand ----
  const handleOpenChange = useCallback(
    (entityType: EntityType, isOpen: boolean) => {
      if (!isOpen) {
        return;
      }

      // Already loaded? Skip.
      const existing = categories[entityType];
      if (existing?.loaded || existing?.loading) {
        return;
      }

      // Mark as loading
      setCategories((prev) => ({
        ...prev,
        [entityType]: {
          items: [],
          loaded: false,
          loading: true,
          refreshing: false,
          error: null,
        },
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
                refreshing: false,
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
                refreshing: false,
                error: result.error ?? "Failed to load",
              },
            }));
          }
        })
        .catch((error) => {
          console.error(`[EntityBrowser] Error browsing ${entityType}:`, error);
          setCategories((prev) => ({
            ...prev,
            [entityType]: {
              items: [],
              loaded: true,
              loading: false,
              refreshing: false,
              error: "Failed to load",
            },
          }));
        });
    },
    [categories]
  );

  // ---- Refresh a category's items ----
  const handleRefresh = useCallback(
    (entityType: EntityType, event: React.MouseEvent) => {
      event.stopPropagation(); // Prevent collapsible toggle

      const existing = categories[entityType];
      if (!existing?.loaded || existing.refreshing) {
        return;
      }

      // Mark as refreshing
      setCategories((prev) => {
        const currentState = prev[entityType];
        if (!currentState) {
          return prev;
        }
        return {
          ...prev,
          [entityType]: { ...currentState, refreshing: true, error: null },
        };
      });

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
                refreshing: false,
                error: null,
              },
            }));
          } else {
            console.error(
              `[EntityBrowser] Failed to refresh ${entityType}:`,
              result.error
            );
            setCategories((prev) => {
              const currentState = prev[entityType];
              if (!currentState) {
                return prev;
              }
              return {
                ...prev,
                [entityType]: {
                  ...currentState,
                  refreshing: false,
                  error: result.error ?? "Failed to refresh",
                },
              };
            });
          }
        })
        .catch((error) => {
          console.error(
            `[EntityBrowser] Error refreshing ${entityType}:`,
            error
          );
          setCategories((prev) => {
            const currentState = prev[entityType];
            if (!currentState) {
              return prev;
            }
            return {
              ...prev,
              [entityType]: {
                ...currentState,
                refreshing: false,
                error: "Failed to refresh",
              },
            };
          });
        });
    },
    [categories]
  );

  // ---- Add an entity to the board at a specific position ----
  const handleAddEntityAtPosition = useCallback(
    (item: BrowseItem, positionX?: number, positionY?: number) => {
      if (addingId) {
        return; // Prevent double-clicks
      }

      setAddingId(item.id);

      startTransition(async () => {
        try {
          let finalX = positionX;
          let finalY = positionY;

          // If no position provided, use smart placement
          if (finalX === undefined || finalY === undefined) {
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

            finalX = viewportCenterX + offsetX;
            finalY = viewportCenterY + offsetY;
          }

          const result = await addProjection(boardId, {
            entityType: item.entityType,
            entityId: item.id,
            positionX: Math.round(finalX),
            positionY: Math.round(finalY),
          });

          if (result.success && result.projection) {
            onProjectionAdded?.(result.projection);
            const label =
              ENTITY_TYPE_LABELS[item.entityType] ?? item.entityType;
            toast.success(`${label} added to board`);
          } else {
            // Check for duplicate error and show specific message
            const errorMsg = result.error ?? "Failed to add entity";
            if (
              errorMsg.includes("already exists") ||
              errorMsg.includes("already on this board")
            ) {
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
    [addingId, boardId, onProjectionAdded, reactFlow, projections.length]
  );

  // ---- Add an entity to the board (click handler - uses smart placement) ----
  const handleAddEntity = useCallback(
    (item: BrowseItem) => {
      handleAddEntityAtPosition(item);
    },
    [handleAddEntityAtPosition]
  );

  // ---- Handle drag start - set drag data for drop handler ----
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLButtonElement>, item: BrowseItem) => {
      const data = JSON.stringify({
        entityType: item.entityType,
        entityId: item.id,
        title: item.title,
      });
      e.dataTransfer.setData("application/json", data);
      e.dataTransfer.effectAllowed = "copy";
    },
    []
  );

  // ---- Get navigable items for keyboard navigation ----
  const getNavigableItems = useCallback(
    (categoryIndex: number): BrowseItem[] => {
      const category = ENTITY_CATEGORIES[categoryIndex];
      if (!category) {
        return [];
      }
      const state = categories[category.type];
      if (!state?.loaded) {
        return [];
      }
      return filterItems(state.items);
    },
    [categories, filterItems]
  );

  // ---- Expand category for navigation ----
  const expandCategory = useCallback(
    (categoryIndex: number) => {
      const category = ENTITY_CATEGORIES[categoryIndex];
      if (!category) {
        return;
      }
      const state = categories[category.type];
      // Trigger load if not loaded
      if (!(state?.loaded || state?.loading)) {
        handleOpenChange(category.type, true);
      }
    },
    [categories, handleOpenChange]
  );

  // ---- Keyboard navigation helpers ----
  const handleArrowDown = useCallback(
    (currentItems: BrowseItem[], currentItemIndex: number) => {
      if (currentItemIndex < currentItems.length - 1) {
        setFocusedItemIndex(currentItemIndex + 1);
      } else if (
        currentItemIndex === currentItems.length - 1 &&
        focusedCategoryIndex < ENTITY_CATEGORIES.length - 1
      ) {
        setFocusedCategoryIndex(focusedCategoryIndex + 1);
        setFocusedItemIndex(-1);
      }
    },
    [focusedCategoryIndex]
  );

  const handleArrowUp = useCallback(
    (_currentItems: BrowseItem[], currentItemIndex: number) => {
      if (currentItemIndex > 0) {
        setFocusedItemIndex(currentItemIndex - 1);
      } else if (currentItemIndex === 0) {
        setFocusedItemIndex(-1);
      } else if (currentItemIndex === -1 && focusedCategoryIndex > 0) {
        const prevCategoryIndex = focusedCategoryIndex - 1;
        const prevItems = getNavigableItems(prevCategoryIndex);
        setFocusedCategoryIndex(prevCategoryIndex);
        setFocusedItemIndex(Math.max(-1, prevItems.length - 1));
        expandCategory(prevCategoryIndex);
      }
    },
    [focusedCategoryIndex, getNavigableItems, expandCategory]
  );

  const handleEnterOrRight = useCallback(
    (currentItems: BrowseItem[], currentItemIndex: number) => {
      if (currentItemIndex >= 0 && currentItems[currentItemIndex]) {
        const item = currentItems[currentItemIndex];
        const isOnBoard = onBoardKeys.has(`${item.entityType}:${item.id}`);
        if (!isOnBoard) {
          handleAddEntity(item);
        }
      } else if (currentItemIndex === -1) {
        expandCategory(focusedCategoryIndex);
        const items = getNavigableItems(focusedCategoryIndex);
        if (items.length > 0) {
          setFocusedItemIndex(0);
        }
      }
    },
    [
      focusedCategoryIndex,
      getNavigableItems,
      expandCategory,
      handleAddEntity,
      onBoardKeys,
    ]
  );

  const handleTab = useCallback(
    (shiftKey: boolean) => {
      const direction = shiftKey ? -1 : 1;
      const nextCategoryIndex = focusedCategoryIndex + direction;

      if (
        nextCategoryIndex >= 0 &&
        nextCategoryIndex < ENTITY_CATEGORIES.length
      ) {
        setFocusedCategoryIndex(nextCategoryIndex);
        setFocusedItemIndex(-1);
        expandCategory(nextCategoryIndex);
      }
    },
    [focusedCategoryIndex, expandCategory]
  );

  // ---- Keyboard navigation handler ----
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentItems = getNavigableItems(focusedCategoryIndex);
      const currentItemIndex = focusedItemIndex;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          handleArrowDown(currentItems, currentItemIndex);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          handleArrowUp(currentItems, currentItemIndex);
          break;
        }
        case "ArrowRight":
        case "Enter": {
          e.preventDefault();
          handleEnterOrRight(currentItems, currentItemIndex);
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          if (currentItemIndex >= 0) {
            setFocusedItemIndex(-1);
          }
          break;
        }
        case "Tab": {
          e.preventDefault();
          handleTab(e.shiftKey);
          break;
        }
        case "Escape": {
          e.preventDefault();
          onClose();
          break;
        }
        default:
          break;
      }
    },
    [
      focusedCategoryIndex,
      focusedItemIndex,
      getNavigableItems,
      handleArrowDown,
      handleArrowUp,
      handleEnterOrRight,
      handleTab,
      onClose,
    ]
  );

  // ---- Scroll focused item into view ----
  useEffect(() => {
    if (focusedItemIndex >= 0) {
      const category = ENTITY_CATEGORIES[focusedCategoryIndex];
      if (category) {
        const items = getNavigableItems(focusedCategoryIndex);
        const item = items[focusedItemIndex];
        if (item) {
          const key = `${category.type}:${item.id}`;
          const element = itemRefs.current.get(key);
          element?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }
    }
  }, [focusedCategoryIndex, focusedItemIndex, getNavigableItems]);

  return (
    <section
      aria-label="Entity Browser"
      className="flex h-full w-72 flex-col border-l bg-card"
      onKeyDown={handleKeyDown}
      ref={containerRef as React.RefObject<HTMLElement>}
      tabIndex={-1}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <h2 className="text-sm font-semibold">Entities</h2>
        <Button
          className="h-7 w-7"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="border-b px-2 py-2">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-xs"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entities..."
            type="search"
            value={searchQuery}
          />
        </div>
      </div>

      {/* Scrollable category list */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {ENTITY_CATEGORIES.map(({ type, icon: Icon }, categoryIndex) => {
            const label = ENTITY_TYPE_LABELS[type] ?? type;
            const colors = ENTITY_TYPE_COLORS[type];
            const state = categories[type];
            const isCategoryFocused =
              focusedCategoryIndex === categoryIndex && focusedItemIndex === -1;
            const filteredItems = filterItems(state?.items ?? []);

            return (
              <Collapsible
                key={type}
                onOpenChange={(isOpen) => handleOpenChange(type, isOpen)}
              >
                <CollapsibleTrigger
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors group",
                    isCategoryFocused
                      ? "bg-primary/10 ring-2 ring-primary/50"
                      : "hover:bg-muted/50"
                  )}
                >
                  <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                  <Icon className={`h-4 w-4 shrink-0 ${colors.icon}`} />
                  <span className="flex-1 text-left">{label}s</span>
                  {state?.loaded && (
                    <>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {state.items.length}
                      </span>
                      <button
                        className="h-4 w-4 shrink-0 flex items-center justify-center rounded hover:bg-muted-foreground/10 transition-colors"
                        disabled={state.refreshing}
                        onClick={(e) => handleRefresh(type, e)}
                        title={`Refresh ${label.toLowerCase()}s`}
                        type="button"
                      >
                        <RefreshCwIcon
                          className={`h-3 w-3 text-muted-foreground ${state.refreshing ? "animate-spin" : ""}`}
                        />
                      </button>
                    </>
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
                    {state?.loaded &&
                      !state.error &&
                      filteredItems.length === 0 && (
                        <div className="px-2 py-2 text-xs text-muted-foreground">
                          {searchQuery
                            ? `No matching ${label.toLowerCase()}s`
                            : `No ${label.toLowerCase()}s found`}
                        </div>
                      )}

                    {/* Items */}
                    {filteredItems.map((item, itemIndex) => {
                      const isAdding = addingId === item.id;
                      const isOnBoard = onBoardKeys.has(
                        `${item.entityType}:${item.id}`
                      );
                      const isItemFocused =
                        focusedCategoryIndex === categoryIndex &&
                        focusedItemIndex === itemIndex;

                      return (
                        <button
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors disabled:opacity-50 group/item cursor-grab active:cursor-grabbing",
                            isItemFocused
                              ? "bg-primary/10 ring-2 ring-primary/50"
                              : "hover:bg-muted/50"
                          )}
                          disabled={isPending || isAdding || isOnBoard}
                          draggable={!(isOnBoard || isPending || isAdding)}
                          key={item.id}
                          onClick={() => handleAddEntity(item)}
                          onDragStart={(e) => handleDragStart(e, item)}
                          ref={(el) => {
                            if (el) {
                              itemRefs.current.set(`${type}:${item.id}`, el);
                            } else {
                              itemRefs.current.delete(`${type}:${item.id}`);
                            }
                          }}
                          type="button"
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
    </section>
  );
}
