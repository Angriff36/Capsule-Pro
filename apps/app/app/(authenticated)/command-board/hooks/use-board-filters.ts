"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  type BoardFilters,
  DEFAULT_FILTERS,
  filtersToSearchParams,
  parseFiltersFromSearchParams,
} from "../types/filters";

// ============================================================================
// Hook: useBoardFilters
// ============================================================================

/**
 * Hook to manage board filter state with URL persistence.
 *
 * Filters are stored in URL search params so they survive page refresh.
 * The hook provides:
 * - Current filter state
 * - Individual filter setters
 * - Clear all filters function
 * - Active filter count
 */
export function useBoardFilters(): {
  filters: BoardFilters;
  setFilters: (filters: BoardFilters) => void;
  setEntityTypes: (entityTypes: BoardFilters["entityTypes"]) => void;
  setStatuses: (statuses: BoardFilters["statuses"]) => void;
  setDateRange: (dateRange: BoardFilters["dateRange"]) => void;
  setTags: (tags: BoardFilters["tags"]) => void;
  setConnectionTypes: (
    connectionTypes: BoardFilters["connectionTypes"]
  ) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
} {
  const router = useRouter();
  const pathname = usePathname();
  const rawSearchParams = useSearchParams();

  // Coerce to URLSearchParams (useSearchParams returns ReadonlyURLSearchParams | null)
  const searchParams = useMemo<URLSearchParams>(() => {
    if (!rawSearchParams) return new URLSearchParams();
    // Copy into a plain URLSearchParams so our parse util accepts it
    return new URLSearchParams(rawSearchParams.toString());
  }, [rawSearchParams]);

  // Parse current filters from URL
  const filters = useMemo(() => {
    return parseFiltersFromSearchParams(searchParams);
  }, [searchParams]);

  // Update URL with new filters
  const updateUrl = useCallback(
    (newFilters: BoardFilters) => {
      const newParams = filtersToSearchParams(newFilters);
      const base = pathname ?? "";
      const newUrl = newParams.toString()
        ? `${base}?${newParams.toString()}`
        : base;

      // Use replace to avoid adding to history for filter changes
      router.replace(newUrl, { scroll: false });
    },
    [pathname, router]
  );

  // Set all filters at once
  const setFilters = useCallback(
    (newFilters: BoardFilters) => {
      updateUrl(newFilters);
    },
    [updateUrl]
  );

  // Individual setters
  const setEntityTypes = useCallback(
    (entityTypes: BoardFilters["entityTypes"]) => {
      updateUrl({ ...filters, entityTypes });
    },
    [filters, updateUrl]
  );

  const setStatuses = useCallback(
    (statuses: BoardFilters["statuses"]) => {
      updateUrl({ ...filters, statuses });
    },
    [filters, updateUrl]
  );

  const setDateRange = useCallback(
    (dateRange: BoardFilters["dateRange"]) => {
      updateUrl({ ...filters, dateRange });
    },
    [filters, updateUrl]
  );

  const setTags = useCallback(
    (tags: BoardFilters["tags"]) => {
      updateUrl({ ...filters, tags });
    },
    [filters, updateUrl]
  );

  const setConnectionTypes = useCallback(
    (connectionTypes: BoardFilters["connectionTypes"]) => {
      updateUrl({ ...filters, connectionTypes });
    },
    [filters, updateUrl]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    updateUrl(DEFAULT_FILTERS);
  }, [updateUrl]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.entityTypes.length > 0 ||
      filters.statuses.length > 0 ||
      filters.dateRange !== null ||
      filters.tags.length > 0 ||
      filters.connectionTypes.length > 0
    );
  }, [filters]);

  // Count active filter categories
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.entityTypes.length > 0) count++;
    if (filters.statuses.length > 0) count++;
    if (filters.dateRange !== null) count++;
    if (filters.tags.length > 0) count++;
    if (filters.connectionTypes.length > 0) count++;
    return count;
  }, [filters]);

  return {
    filters,
    setFilters,
    setEntityTypes,
    setStatuses,
    setDateRange,
    setTags,
    setConnectionTypes,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
  };
}
