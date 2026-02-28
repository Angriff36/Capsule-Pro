"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@repo/design-system/components/ui/command";
import { useReactFlow } from "@xyflow/react";
import {
  BookOpenIcon,
  CalendarIcon,
  CheckSquareIcon,
  ClockIcon,
  EraserIcon,
  Loader2Icon,
  MaximizeIcon,
  PackageIcon,
  RefreshCwIcon,
  StickyNoteIcon,
  UserIcon,
  UsersIcon,
  UtensilsIcon,
  ZapIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  BOARD_COMMANDS,
  type BoardCommandId,
} from "../actions/command-definitions";
import { executeCommand } from "../actions/execute-command";
import { addProjection } from "../actions/projections";
import {
  type SearchResultItem,
  searchEntities,
} from "../actions/search-entities";
import type { BoardProjection } from "../types/board";
import { ENTITY_TYPE_LABELS, type EntityType } from "../types/entities";

// ============================================================================
// Constants
// ============================================================================

const DEBOUNCE_MS = 250;

/** Icon mapping for entity types */
const ENTITY_TYPE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  event: CalendarIcon,
  client: UsersIcon,
  prep_task: CheckSquareIcon,
  kitchen_task: UtensilsIcon,
  employee: UserIcon,
  inventory_item: PackageIcon,
  recipe: BookOpenIcon,
  note: StickyNoteIcon,
};

/** Icon mapping for board commands */
const COMMAND_ICONS: Record<
  BoardCommandId,
  React.ComponentType<{ className?: string }>
> = {
  clear_board: EraserIcon,
  auto_populate: RefreshCwIcon,
  show_this_week: CalendarIcon,
  show_overdue: ClockIcon,
  show_all_events: CalendarIcon,
  show_all_tasks: CheckSquareIcon,
};

// ============================================================================
// Types
// ============================================================================

interface CommandPaletteProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectionAdded?: (projection: BoardProjection) => void;
}

// ============================================================================
// Command Palette Component
// ============================================================================

/**
 * Command palette (Cmd+K) for the command board.
 *
 * Groups:
 * 1. Entity Search — search and add entities to the board
 * 2. Board Commands — clear, auto-populate, etc.
 * 3. Quick Actions — show this week, show overdue, etc.
 * 4. View Commands — fit to screen, zoom in/out (client-side only)
 */
export function CommandPalette({
  boardId,
  open,
  onOpenChange,
  onProjectionAdded,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactFlow = useReactFlow();

  // ---- Debounced entity search ----
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query || query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await searchEntities(query);
        if (result.success && result.data) {
          // Flatten all result groups into a single array
          const flat: SearchResultItem[] = [
            ...result.data.events,
            ...result.data.clients,
            ...result.data.prepTasks,
            ...result.data.kitchenTasks,
            ...result.data.employees,
            ...result.data.inventoryItems,
            ...result.data.recipes,
            ...result.data.notes,
          ];
          setSearchResults(flat);
        }
      } catch (error) {
        console.error("[CommandPalette] Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // ---- Reset state when dialog closes ----
  useEffect(() => {
    if (!open) {
      setQuery("");
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [open]);

  // ---- Handle adding an entity to the board ----
  const handleAddEntity = useCallback(
    async (item: SearchResultItem) => {
      startTransition(async () => {
        try {
          // Get viewport center for placement
          const viewport = reactFlow.getViewport();
          const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
          const centerY =
            (-viewport.y + window.innerHeight / 2) / viewport.zoom;

          // Add some randomness to avoid stacking
          const offsetX = (Math.random() - 0.5) * 200;
          const offsetY = (Math.random() - 0.5) * 200;

          const result = await addProjection(boardId, {
            entityType: item.entityType,
            entityId: item.id,
            positionX: Math.round(centerX + offsetX),
            positionY: Math.round(centerY + offsetY),
          });

          if (result.success && result.projection) {
            onProjectionAdded?.(result.projection);
            toast.success(
              `Added ${ENTITY_TYPE_LABELS[item.entityType] ?? item.entityType}: ${item.title}`
            );
          } else {
            toast.error(result.error ?? "Failed to add entity");
          }
        } catch (error) {
          console.error("[CommandPalette] Failed to add entity:", error);
          toast.error("Failed to add entity to board");
        }
      });

      onOpenChange(false);
    },
    [boardId, onOpenChange, onProjectionAdded, reactFlow]
  );

  // ---- Handle executing a board command ----
  const handleCommand = useCallback(
    async (commandId: BoardCommandId) => {
      onOpenChange(false);

      startTransition(async () => {
        try {
          const result = await executeCommand(boardId, commandId);
          if (result.success) {
            toast.success(result.message);
          } else {
            toast.error(result.error ?? result.message);
          }
        } catch (error) {
          console.error(`[CommandPalette] Command ${commandId} failed:`, error);
          toast.error("Command failed");
        }
      });
    },
    [boardId, onOpenChange]
  );

  // ---- Handle view commands (client-side only) ----
  const handleFitView = useCallback(() => {
    reactFlow.fitView({ padding: 0.2, duration: 300 });
    onOpenChange(false);
    toast.success("Fitted view to all nodes");
  }, [reactFlow, onOpenChange]);

  const handleZoomToFit = useCallback(() => {
    reactFlow.zoomTo(1, { duration: 300 });
    onOpenChange(false);
    toast.success("Reset zoom to 100%");
  }, [reactFlow, onOpenChange]);

  // ---- Group search results by entity type ----
  const groupedResults = searchResults.reduce<
    Record<string, SearchResultItem[]>
  >((acc, item) => {
    const key = item.entityType;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});

  const boardCommands = BOARD_COMMANDS.filter((c) => c.group === "board");
  const quickActions = BOARD_COMMANDS.filter((c) => c.group === "quick_action");

  return (
    <CommandDialog onOpenChange={onOpenChange} open={open}>
      <CommandInput
        onValueChange={setQuery}
        placeholder="Search entities, run commands..."
        value={query}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? (
            <div className="flex items-center justify-center gap-2 py-6">
              <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground text-sm">
                Searching...
              </span>
            </div>
          ) : query.length > 0 ? (
            "No results found."
          ) : (
            "Type to search entities or select a command."
          )}
        </CommandEmpty>

        {/* Entity Search Results */}
        {Object.entries(groupedResults).map(([entityType, items]) => {
          const Icon = ENTITY_TYPE_ICONS[entityType] ?? StickyNoteIcon;
          const label =
            ENTITY_TYPE_LABELS[entityType as EntityType] ?? entityType;

          return (
            <CommandGroup heading={`${label}s`} key={entityType}>
              {items.map((item) => (
                <CommandItem
                  disabled={isPending}
                  key={`${item.entityType}:${item.id}`}
                  onSelect={() => handleAddEntity(item)}
                  value={`${item.entityType}:${item.id}:${item.title}`}
                >
                  <Icon className="mr-2 h-4 w-4 shrink-0 opacity-60" />
                  <div className="flex flex-col">
                    <span>{item.title}</span>
                    {item.subtitle && (
                      <span className="text-muted-foreground text-xs">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}

        {/* Show commands when no search query or few results */}
        {query.length < 2 && (
          <>
            {/* View Commands (client-side) */}
            <CommandGroup heading="View">
              <CommandItem onSelect={handleFitView} value="fit-to-screen">
                <MaximizeIcon className="mr-2 h-4 w-4 shrink-0 opacity-60" />
                <div className="flex flex-col">
                  <span>Fit to Screen</span>
                  <span className="text-muted-foreground text-xs">
                    Zoom to fit all cards in view
                  </span>
                </div>
              </CommandItem>
              <CommandItem onSelect={handleZoomToFit} value="reset-zoom">
                <ZapIcon className="mr-2 h-4 w-4 shrink-0 opacity-60" />
                <div className="flex flex-col">
                  <span>Reset Zoom</span>
                  <span className="text-muted-foreground text-xs">
                    Reset zoom to 100%
                  </span>
                </div>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* Board Commands */}
            <CommandGroup heading="Board">
              {boardCommands.map((cmd) => {
                const Icon = COMMAND_ICONS[cmd.id];
                return (
                  <CommandItem
                    disabled={isPending}
                    key={cmd.id}
                    onSelect={() => handleCommand(cmd.id)}
                    value={`command:${cmd.id}:${cmd.label}`}
                  >
                    <Icon className="mr-2 h-4 w-4 shrink-0 opacity-60" />
                    <div className="flex flex-col">
                      <span>{cmd.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {cmd.description}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>

            <CommandSeparator />

            {/* Quick Actions */}
            <CommandGroup heading="Quick Actions">
              {quickActions.map((cmd) => {
                const Icon = COMMAND_ICONS[cmd.id];
                return (
                  <CommandItem
                    disabled={isPending}
                    key={cmd.id}
                    onSelect={() => handleCommand(cmd.id)}
                    value={`action:${cmd.id}:${cmd.label}`}
                  >
                    <Icon className="mr-2 h-4 w-4 shrink-0 opacity-60" />
                    <div className="flex flex-col">
                      <span>{cmd.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {cmd.description}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
