"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/design-system/components/ui/command";
import {
  BookOpenIcon,
  CalendarIcon,
  CheckSquareIcon,
  Loader2Icon,
  PackageIcon,
  StickyNoteIcon,
  UserIcon,
  UsersIcon,
  UtensilsIcon,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { addProjection } from "../actions/projections";
import {
  type SearchResultItem,
  type SearchResults,
  searchEntities,
} from "../actions/search-entities";
import type { BoardProjection } from "../types/board";
import { ENTITY_TYPE_LABELS, type EntityType } from "../types/entities";

// ============================================================================
// Constants
// ============================================================================

const DEBOUNCE_MS = 300;

/** Icon mapping for each searchable entity type */
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
  dish: BookOpenIcon,
  proposal: BookOpenIcon,
  shipment: PackageIcon,
  note: StickyNoteIcon,
};

/** Groups config for rendering search results in order */
const SEARCH_GROUPS: Array<{
  key: keyof SearchResults;
  entityType: EntityType;
}> = [
  { key: "events", entityType: "event" },
  { key: "clients", entityType: "client" },
  { key: "prepTasks", entityType: "prep_task" },
  { key: "kitchenTasks", entityType: "kitchen_task" },
  { key: "employees", entityType: "employee" },
  { key: "inventoryItems", entityType: "inventory_item" },
  { key: "recipes", entityType: "recipe" },
  { key: "notes", entityType: "note" },
];

// ============================================================================
// Component
// ============================================================================

export interface EntitySearchProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEntityAdded: (projection: BoardProjection) => void;
}

export function EntitySearch({
  boardId,
  open,
  onOpenChange,
  onEntityAdded,
}: EntitySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track how many entities have been added in this session to offset positions
  const addCountRef = useRef(0);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(null);
      setIsSearching(false);
      setIsAdding(false);
      addCountRef.current = 0;
    }
  }, [open]);

  // Debounced search
  const handleSearch = useCallback((value: string) => {
    setQuery(value);

    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't search for empty/whitespace-only queries
    if (!value.trim()) {
      setResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await searchEntities(value);
        if (result.success && result.data) {
          setResults(result.data);
        } else {
          console.error("[entity-search] Search failed:", result.error);
          toast.error(result.error ?? "Search failed");
        }
      } catch (error) {
        console.error("[entity-search] Search error:", error);
        toast.error("Failed to search entities");
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Handle selecting a search result — add it to the board
  const handleSelect = useCallback(
    async (item: SearchResultItem) => {
      if (isAdding) {
        return;
      }

      setIsAdding(true);

      try {
        // Offset each new projection so they don't stack on top of each other
        const offset = addCountRef.current * 40;
        const positionX = 200 + offset;
        const positionY = 200 + offset;

        // Cast to satisfy addProjection's type — the runtime values are
        // compatible, but the two EntityType definitions differ at the type level
        // (types.ts has 5 types, types/entities.ts has 11 types)
        const result = await addProjection(boardId, {
          entityType: item.entityType as never,
          entityId: item.id,
          positionX,
          positionY,
        });

        if (result.success && result.projection) {
          addCountRef.current += 1;
          const label =
            ENTITY_TYPE_LABELS[
              item.entityType as keyof typeof ENTITY_TYPE_LABELS
            ] ?? item.entityType;
          toast.success(`${label} added to board`);
          onEntityAdded(result.projection);
          onOpenChange(false);
        } else {
          console.error(
            "[entity-search] Failed to add projection:",
            result.error
          );
          toast.error(result.error ?? "Failed to add entity to board");
        }
      } catch (error) {
        console.error("[entity-search] Add projection error:", error);
        toast.error("Failed to add entity to board");
      } finally {
        setIsAdding(false);
      }
    },
    [boardId, isAdding, onEntityAdded, onOpenChange]
  );

  // Check if there are any results at all
  const hasAnyResults =
    results !== null &&
    SEARCH_GROUPS.some((group) => results[group.key].length > 0);

  const hasQuery = query.trim().length > 0;
  const isBusy = isSearching || isAdding;
  const showResults = !isBusy && results !== null;

  return (
    <CommandDialog
      description="Search across all entity types to add to the board"
      onOpenChange={onOpenChange}
      open={open}
      showCloseButton={false}
      title="Search Entities"
    >
      <CommandInput
        onValueChange={handleSearch}
        placeholder="Search events, clients, tasks, employees..."
        value={query}
      />
      <CommandList>
        {/* Loading state */}
        {isSearching ? (
          <div className="flex items-center justify-center py-6">
            <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Searching...
            </span>
          </div>
        ) : null}

        {/* Empty state — only show when we have a query, finished searching, and no results */}
        {!isSearching && hasQuery && !hasAnyResults ? (
          <CommandEmpty>No entities found.</CommandEmpty>
        ) : null}

        {/* Adding overlay */}
        {isAdding ? (
          <div className="flex items-center justify-center py-6">
            <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              Adding to board...
            </span>
          </div>
        ) : null}

        {/* Results grouped by entity type */}
        {showResults
          ? SEARCH_GROUPS.map((group) => {
              const items = results[group.key];
              if (items.length === 0) {
                return null;
              }

              const Icon = ENTITY_TYPE_ICONS[group.entityType] ?? CalendarIcon;
              const label =
                ENTITY_TYPE_LABELS[
                  group.entityType as keyof typeof ENTITY_TYPE_LABELS
                ] ?? group.entityType;

              return (
                <CommandGroup heading={`${label}s`} key={group.key}>
                  {items.map((item) => (
                    <CommandItem
                      key={`${item.entityType}:${item.id}`}
                      onSelect={() => handleSelect(item)}
                      value={`${item.entityType}:${item.id}:${item.title}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{item.title}</span>
                      {item.subtitle ? (
                        <span className="ml-2 max-w-[120px] truncate text-xs text-muted-foreground">
                          {item.subtitle}
                        </span>
                      ) : null}
                      <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {label}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })
          : null}
      </CommandList>
    </CommandDialog>
  );
}
