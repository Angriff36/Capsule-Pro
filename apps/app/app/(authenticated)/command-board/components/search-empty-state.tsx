"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  BookOpenIcon,
  CalendarIcon,
  CheckSquareIcon,
  ClockIcon,
  LightbulbIcon,
  type LucideIcon,
  PackageIcon,
  PlusIcon,
  SearchXIcon,
  StickyNoteIcon,
  UserIcon,
  UsersIcon,
  UtensilsIcon,
} from "lucide-react";
import type { EntityType } from "../types/entities";

// ============================================================================
// Types
// ============================================================================

export interface SearchSuggestion {
  id: string;
  title: string;
  subtitle?: string | null;
  entityType: EntityType;
  matchScore?: number;
}

export interface CreateOption {
  entityType: EntityType;
  label: string;
  href: string;
}

interface SearchEmptyStateProps {
  searchQuery: string;
  /** Fuzzy-matched alternative suggestions */
  suggestions?: SearchSuggestion[];
  /** Recently viewed items */
  recentlyViewed?: SearchSuggestion[];
  /** Callback when user clicks a suggestion */
  onSuggestionClick?: (suggestion: SearchSuggestion) => void;
  /** Options to create new items matching the search */
  createOptions?: CreateOption[];
  /** Callback when user clicks a create option */
  onCreateClick?: (option: CreateOption) => void;
  /** Whether suggestions are loading */
  isLoading?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const ENTITY_TYPE_ICONS: Record<EntityType, LucideIcon> = {
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
  risk: StickyNoteIcon,
  financial_projection: BookOpenIcon,
};

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  event: "Event",
  client: "Client",
  prep_task: "Prep Task",
  kitchen_task: "Kitchen Task",
  employee: "Employee",
  inventory_item: "Inventory Item",
  recipe: "Recipe",
  dish: "Dish",
  proposal: "Proposal",
  shipment: "Shipment",
  note: "Note",
  risk: "Risk",
  financial_projection: "Financial",
};

// Default create options based on common entity types
const DEFAULT_CREATE_OPTIONS: CreateOption[] = [
  { entityType: "event", label: "Create event", href: "/events/new" },
  { entityType: "client", label: "Add client", href: "/crm/clients/new" },
  {
    entityType: "prep_task",
    label: "Create prep task",
    href: "/kitchen/prep/new",
  },
  {
    entityType: "inventory_item",
    label: "Add inventory item",
    href: "/inventory/items/new",
  },
  {
    entityType: "recipe",
    label: "Create recipe",
    href: "/kitchen/recipes/new",
  },
];

// ============================================================================
// Component
// ============================================================================

export function SearchEmptyState({
  searchQuery,
  suggestions = [],
  recentlyViewed = [],
  createOptions = DEFAULT_CREATE_OPTIONS,
  onSuggestionClick,
  onCreateClick,
  isLoading = false,
}: SearchEmptyStateProps) {
  const hasSuggestions = suggestions.length > 0;
  const hasRecentlyViewed = recentlyViewed.length > 0;
  const truncatedQuery =
    searchQuery.length > 30 ? `${searchQuery.slice(0, 30)}...` : searchQuery;

  /** Render a suggestion item */
  const renderSuggestionItem = (suggestion: SearchSuggestion) => {
    const Icon = ENTITY_TYPE_ICONS[suggestion.entityType] ?? StickyNoteIcon;
    const entityLabel =
      ENTITY_TYPE_LABELS[suggestion.entityType] ?? suggestion.entityType;

    return (
      <button
        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left hover:bg-accent transition-colors group"
        key={`${suggestion.entityType}:${suggestion.id}`}
        onClick={() => onSuggestionClick?.(suggestion)}
        type="button"
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
        <div className="flex-1 min-w-0">
          <span className="text-sm truncate block">{suggestion.title}</span>
          {suggestion.subtitle && (
            <span className="text-xs text-muted-foreground truncate block">
              {suggestion.subtitle}
            </span>
          )}
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          {entityLabel}
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4">
      {/* Main empty state */}
      <div className="flex flex-col items-center text-center mb-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
          <SearchXIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">
          No results for "{truncatedQuery}"
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Try a different search term or create a new item
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-xs text-muted-foreground">
          Finding suggestions...
        </div>
      )}

      {/* Fuzzy-matched suggestions */}
      {!isLoading && hasSuggestions && (
        <div className="w-full mb-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 px-1">
            <LightbulbIcon className="h-3.5 w-3.5" />
            <span>Did you mean?</span>
          </div>
          <div className="flex flex-col gap-1">
            {suggestions.slice(0, 5).map(renderSuggestionItem)}
          </div>
        </div>
      )}

      {/* Recently viewed items */}
      {!(isLoading || hasSuggestions) && hasRecentlyViewed && (
        <div className="w-full mb-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 px-1">
            <ClockIcon className="h-3.5 w-3.5" />
            <span>Recent items</span>
          </div>
          <div className="flex flex-col gap-1">
            {recentlyViewed.slice(0, 5).map(renderSuggestionItem)}
          </div>
        </div>
      )}

      {/* Create new item options */}
      <div className="w-full">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 px-1">
          <PlusIcon className="h-3.5 w-3.5" />
          <span>Create new</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {createOptions.slice(0, 4).map((option) => {
            const Icon = ENTITY_TYPE_ICONS[option.entityType] ?? PlusIcon;

            return (
              <Button
                asChild={!onCreateClick}
                className="h-7 text-xs"
                key={option.entityType}
                onClick={() => onCreateClick?.(option)}
                size="sm"
                variant="outline"
              >
                {onCreateClick ? (
                  <span className="flex items-center gap-1.5">
                    <Icon className="h-3 w-3" />
                    {option.label}
                  </span>
                ) : (
                  <a className="flex items-center gap-1.5" href={option.href}>
                    <Icon className="h-3 w-3" />
                    {option.label}
                  </a>
                )}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
