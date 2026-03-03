// ============================================================================
// Board Filter Types — Filter state and utilities for the Command Board
// ============================================================================

import type { EntityType } from "./entities";

// ============================================================================
// Filter State
// ============================================================================

/** Status values that can be filtered by (common across entity types) */
export const FILTERABLE_STATUSES = [
  // Event statuses
  "confirmed",
  "tentative",
  "cancelled",
  "completed",
  // Task statuses
  "pending",
  "in_progress",
  "done",
  "cancelled",
  // Proposal statuses
  "draft",
  "sent",
  "accepted",
  "rejected",
  // Shipment statuses
  "pending",
  "shipped",
  "delivered",
  // Risk statuses
  "identified",
  "monitoring",
  "mitigating",
  "resolved",
] as const;

export type FilterableStatus = (typeof FILTERABLE_STATUSES)[number];

/** Connection type filter options */
export const CONNECTION_TYPE_FILTERS = {
  derived: "Derived",
  manual: "Manual",
} as const;

export type ConnectionTypeFilter = keyof typeof CONNECTION_TYPE_FILTERS;

/** Date range filter */
export interface DateRangeFilter {
  start: string | null; // ISO date string or null
  end: string | null; // ISO date string or null
}

/** Complete board filter state */
export interface BoardFilters {
  /** Entity types to show (empty = show all) */
  entityTypes: EntityType[];
  /** Statuses to show (empty = show all) */
  statuses: string[];
  /** Date range filter (null = no filter) */
  dateRange: DateRangeFilter | null;
  /** Tags to filter by (empty = show all) */
  tags: string[];
  /** Connection types to show (empty = show all) */
  connectionTypes: ConnectionTypeFilter[];
}

// ============================================================================
// Default State
// ============================================================================

/** Default filter state (no filters active) */
export const DEFAULT_FILTERS: BoardFilters = {
  entityTypes: [],
  statuses: [],
  dateRange: null,
  tags: [],
  connectionTypes: [],
};

// ============================================================================
// URL Serialization
// ============================================================================

/** Serialize filters to URL search params */
export function filtersToSearchParams(filters: BoardFilters): URLSearchParams {
  const params = new URLSearchParams();

  // Entity types as comma-separated list
  if (filters.entityTypes.length > 0) {
    params.set("types", filters.entityTypes.join(","));
  }

  // Statuses as comma-separated list
  if (filters.statuses.length > 0) {
    params.set("status", filters.statuses.join(","));
  }

  // Date range
  if (filters.dateRange) {
    if (filters.dateRange.start) {
      params.set("dateStart", filters.dateRange.start);
    }
    if (filters.dateRange.end) {
      params.set("dateEnd", filters.dateRange.end);
    }
  }

  // Tags as comma-separated list
  if (filters.tags.length > 0) {
    params.set("tags", filters.tags.join(","));
  }

  // Connection types
  if (filters.connectionTypes.length > 0) {
    params.set("connections", filters.connectionTypes.join(","));
  }

  return params;
}

/** Parse filters from URL search params */
export function parseFiltersFromSearchParams(
  searchParams: URLSearchParams
): BoardFilters {
  const entityTypes: EntityType[] = [];
  const statuses: string[] = [];
  let dateRange: DateRangeFilter | null = null;
  const tags: string[] = [];
  const connectionTypes: ConnectionTypeFilter[] = [];

  // Parse entity types
  const typesParam = searchParams.get("types");
  if (typesParam) {
    const types = typesParam.split(",").filter(Boolean);
    for (const type of types) {
      if (isValidEntityType(type)) {
        entityTypes.push(type as EntityType);
      }
    }
  }

  // Parse statuses
  const statusParam = searchParams.get("status");
  if (statusParam) {
    statuses.push(...statusParam.split(",").filter(Boolean));
  }

  // Parse date range
  const dateStart = searchParams.get("dateStart");
  const dateEnd = searchParams.get("dateEnd");
  if (dateStart || dateEnd) {
    dateRange = {
      start: dateStart,
      end: dateEnd,
    };
  }

  // Parse tags
  const tagsParam = searchParams.get("tags");
  if (tagsParam) {
    tags.push(...tagsParam.split(",").filter(Boolean));
  }

  // Parse connection types
  const connectionsParam = searchParams.get("connections");
  if (connectionsParam) {
    const types = connectionsParam.split(",").filter(Boolean);
    for (const type of types) {
      if (type === "derived" || type === "manual") {
        connectionTypes.push(type as ConnectionTypeFilter);
      }
    }
  }

  return {
    entityTypes,
    statuses,
    dateRange,
    tags,
    connectionTypes,
  };
}

/** Check if a string is a valid entity type */
function isValidEntityType(type: string): boolean {
  const validTypes: EntityType[] = [
    "event",
    "client",
    "prep_task",
    "kitchen_task",
    "employee",
    "inventory_item",
    "recipe",
    "dish",
    "proposal",
    "shipment",
    "note",
    "risk",
    "financial_projection",
  ];
  return validTypes.includes(type as EntityType);
}

// ============================================================================
// Filter Utilities
// ============================================================================

/** Check if any filters are active */
export function hasActiveFilters(filters: BoardFilters): boolean {
  return (
    filters.entityTypes.length > 0 ||
    filters.statuses.length > 0 ||
    filters.dateRange !== null ||
    filters.tags.length > 0 ||
    filters.connectionTypes.length > 0
  );
}

/** Count the number of active filter categories */
export function countActiveFilterCategories(filters: BoardFilters): number {
  let count = 0;
  if (filters.entityTypes.length > 0) count++;
  if (filters.statuses.length > 0) count++;
  if (filters.dateRange !== null) count++;
  if (filters.tags.length > 0) count++;
  if (filters.connectionTypes.length > 0) count++;
  return count;
}

/** Get a date from an entity for filtering purposes */
export function getEntityDate(entity: {
  type: string;
  data: Record<string, unknown>;
}): Date | null {
  switch (entity.type) {
    case "event":
      return entity.data.eventDate as Date | null;
    case "prep_task":
      return entity.data.dueByDate as Date | null;
    case "kitchen_task":
      return entity.data.dueDate as Date | null;
    default:
      return null;
  }
}
