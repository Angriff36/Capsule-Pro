"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Calendar } from "@repo/design-system/components/ui/calendar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/design-system/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import { ScrollArea } from "@repo/design-system/components/ui/scroll-area";
import { cn } from "@repo/design-system/lib/utils";
import {
  AlertTriangleIcon,
  BookOpenIcon,
  CalendarIcon,
  CheckSquareIcon,
  ChevronDownIcon,
  DollarSignIcon,
  CalendarIcon as EventCalendarIcon,
  FileTextIcon,
  FilterIcon,
  Link2Icon,
  PackageIcon,
  RotateCcwIcon,
  StickyNoteIcon,
  TagIcon,
  TruckIcon,
  UserIcon,
  UsersIcon,
  UtensilsIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  ENTITY_TYPE_COLORS,
  ENTITY_TYPE_LABELS,
  type EntityType,
} from "../types/entities";
import type { BoardFilters as BoardFiltersType } from "../types/filters";
import {
  CONNECTION_TYPE_FILTERS,
  type ConnectionTypeFilter,
} from "../types/filters";

// ============================================================================
// Constants
// ============================================================================

/** Entity type icons */
const ENTITY_TYPE_ICONS: Record<
  EntityType,
  React.ComponentType<{ className?: string }>
> = {
  event: EventCalendarIcon,
  client: UsersIcon,
  prep_task: CheckSquareIcon,
  kitchen_task: UtensilsIcon,
  employee: UserIcon,
  inventory_item: PackageIcon,
  recipe: BookOpenIcon,
  dish: UtensilsIcon,
  proposal: FileTextIcon,
  shipment: TruckIcon,
  note: StickyNoteIcon,
  risk: AlertTriangleIcon,
  financial_projection: DollarSignIcon,
};

/** Common statuses grouped by category */
const STATUS_GROUPS = {
  Events: ["confirmed", "tentative", "cancelled", "completed"],
  Tasks: ["pending", "in_progress", "done"],
  Proposals: ["draft", "sent", "accepted", "rejected"],
  Shipments: ["pending", "shipped", "delivered"],
  Risks: ["identified", "monitoring", "mitigating", "resolved"],
};

// ============================================================================
// Types
// ============================================================================

interface BoardFilterPanelProps {
  filters: BoardFiltersType;
  onFiltersChange: (filters: BoardFiltersType) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  /** Tags extracted from entities on the board */
  availableTags?: string[];
}

// ============================================================================
// Component
// ============================================================================

export function BoardFilterPanel({
  filters,
  onFiltersChange,
  onClearFilters,
  hasActiveFilters,
  activeFilterCount,
  availableTags = [],
}: BoardFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Entity type toggle
  const toggleEntityType = useCallback(
    (type: EntityType) => {
      const newTypes = filters.entityTypes.includes(type)
        ? filters.entityTypes.filter((t) => t !== type)
        : [...filters.entityTypes, type];
      onFiltersChange({ ...filters, entityTypes: newTypes });
    },
    [filters, onFiltersChange]
  );

  // Status toggle
  const toggleStatus = useCallback(
    (status: string) => {
      const newStatuses = filters.statuses.includes(status)
        ? filters.statuses.filter((s) => s !== status)
        : [...filters.statuses, status];
      onFiltersChange({ ...filters, statuses: newStatuses });
    },
    [filters, onFiltersChange]
  );

  // Tag toggle
  const toggleTag = useCallback(
    (tag: string) => {
      const newTags = filters.tags.includes(tag)
        ? filters.tags.filter((t) => t !== tag)
        : [...filters.tags, tag];
      onFiltersChange({ ...filters, tags: newTags });
    },
    [filters, onFiltersChange]
  );

  // Connection type toggle
  const toggleConnectionType = useCallback(
    (type: ConnectionTypeFilter) => {
      const newTypes = filters.connectionTypes.includes(type)
        ? filters.connectionTypes.filter((t) => t !== type)
        : [...filters.connectionTypes, type];
      onFiltersChange({ ...filters, connectionTypes: newTypes });
    },
    [filters, onFiltersChange]
  );

  // Date range handler
  const handleDateSelect = useCallback(
    (range: { from?: Date; to?: Date } | undefined) => {
      if (!range) {
        onFiltersChange({ ...filters, dateRange: null });
        return;
      }
      onFiltersChange({
        ...filters,
        dateRange: {
          start: range.from?.toISOString() ?? null,
          end: range.to?.toISOString() ?? null,
        },
      });
    },
    [filters, onFiltersChange]
  );

  // Format date for display
  const formatDateRange = useMemo(() => {
    if (!filters.dateRange) return null;
    const start = filters.dateRange.start
      ? new Date(filters.dateRange.start).toLocaleDateString()
      : "";
    const end = filters.dateRange.end
      ? new Date(filters.dateRange.end).toLocaleDateString()
      : "";
    if (start && end) return `${start} - ${end}`;
    if (start) return `From ${start}`;
    if (end) return `Until ${end}`;
    return null;
  }, [filters.dateRange]);

  return (
    <div className="flex items-center gap-2">
      {/* Filter Toggle Button */}
      <Popover onOpenChange={setIsExpanded} open={isExpanded}>
        <PopoverTrigger asChild>
          <Button
            className="gap-1.5"
            size="sm"
            variant={hasActiveFilters ? "default" : "outline"}
          >
            <FilterIcon className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground/20 text-xs">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Board Filters</h3>
            {hasActiveFilters && (
              <Button
                className="h-7 gap-1 text-xs"
                onClick={onClearFilters}
                size="sm"
                variant="ghost"
              >
                <RotateCcwIcon className="h-3 w-3" />
                Clear all
              </Button>
            )}
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-1 p-3">
              {/* Entity Types Filter */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-medium hover:bg-muted/50">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">Entity Types</span>
                    {filters.entityTypes.length > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 text-xs text-primary">
                        {filters.entityTypes.length}
                      </span>
                    )}
                  </span>
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-1 grid grid-cols-2 gap-1 px-1">
                    {(Object.keys(ENTITY_TYPE_LABELS) as EntityType[]).map(
                      (type) => {
                        const Icon = ENTITY_TYPE_ICONS[type];
                        const colors = ENTITY_TYPE_COLORS[type];
                        const isActive = filters.entityTypes.includes(type);

                        return (
                          <button
                            className={cn(
                              "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted/50"
                            )}
                            key={type}
                            onClick={() => toggleEntityType(type)}
                            type="button"
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                              {ENTITY_TYPE_LABELS[type]}
                            </span>
                            {isActive && (
                              <XIcon className="ml-auto h-3 w-3 shrink-0 opacity-70" />
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Status Filter */}
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-medium hover:bg-muted/50">
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">Status</span>
                    {filters.statuses.length > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 text-xs text-primary">
                        {filters.statuses.length}
                      </span>
                    )}
                  </span>
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-1 space-y-2 px-1">
                    {Object.entries(STATUS_GROUPS).map(([group, statuses]) => (
                      <div key={group}>
                        <div className="mb-1 px-1 text-xs font-medium text-muted-foreground">
                          {group}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {statuses.map((status) => {
                            const isActive = filters.statuses.includes(status);
                            return (
                              <button
                                className={cn(
                                  "rounded-md px-2 py-1 text-xs transition-colors",
                                  isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted/50 hover:bg-muted"
                                )}
                                key={status}
                                onClick={() => toggleStatus(status)}
                                type="button"
                              >
                                {status.replace("_", " ")}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Date Range Filter */}
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-medium hover:bg-muted/50">
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Date Range</span>
                    {filters.dateRange && (
                      <span className="rounded-full bg-primary/10 px-1.5 text-xs text-primary">
                        1
                      </span>
                    )}
                  </span>
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 px-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          className="w-full justify-start text-left text-xs font-normal"
                          size="sm"
                          variant="outline"
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {formatDateRange || "Select date range..."}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-0">
                        <Calendar
                          initialFocus
                          mode="range"
                          numberOfMonths={2}
                          onSelect={(range) =>
                            handleDateSelect(
                              range as { from?: Date; to?: Date } | undefined
                            )
                          }
                          selected={{
                            from: filters.dateRange?.start
                              ? new Date(filters.dateRange.start)
                              : undefined,
                            to: filters.dateRange?.end
                              ? new Date(filters.dateRange.end)
                              : undefined,
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    {filters.dateRange && (
                      <Button
                        className="mt-2 h-7 w-full text-xs"
                        onClick={() =>
                          onFiltersChange({ ...filters, dateRange: null })
                        }
                        size="sm"
                        variant="ghost"
                      >
                        <XIcon className="mr-1 h-3 w-3" />
                        Clear date range
                      </Button>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Tags Filter */}
              {availableTags.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-medium hover:bg-muted/50">
                    <span className="flex items-center gap-2">
                      <TagIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Tags</span>
                      {filters.tags.length > 0 && (
                        <span className="rounded-full bg-primary/10 px-1.5 text-xs text-primary">
                          {filters.tags.length}
                        </span>
                      )}
                    </span>
                    <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-1 flex flex-wrap gap-1 px-1">
                      {availableTags.map((tag) => {
                        const isActive = filters.tags.includes(tag);
                        return (
                          <button
                            className={cn(
                              "rounded-md px-2 py-1 text-xs transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/50 hover:bg-muted"
                            )}
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            type="button"
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Connection Types Filter */}
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-medium hover:bg-muted/50">
                  <span className="flex items-center gap-2">
                    <Link2Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Connections</span>
                    {filters.connectionTypes.length > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 text-xs text-primary">
                        {filters.connectionTypes.length}
                      </span>
                    )}
                  </span>
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-1 flex flex-wrap gap-1 px-1">
                    {(
                      Object.entries(CONNECTION_TYPE_FILTERS) as [
                        ConnectionTypeFilter,
                        string,
                      ][]
                    ).map(([type, label]) => {
                      const isActive = filters.connectionTypes.includes(type);
                      return (
                        <button
                          className={cn(
                            "rounded-md px-2 py-1 text-xs transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/50 hover:bg-muted"
                          )}
                          key={type}
                          onClick={() => toggleConnectionType(type)}
                          type="button"
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Quick Clear Button (when collapsed and has filters) */}
      {!isExpanded && hasActiveFilters && (
        <Button
          className="h-8 w-8"
          onClick={onClearFilters}
          size="icon"
          title="Clear all filters"
          variant="ghost"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
