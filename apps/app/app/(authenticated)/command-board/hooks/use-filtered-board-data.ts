"use client";

import { useMemo } from "react";
import type {
  BoardAnnotation,
  BoardProjection,
  DerivedConnection,
  ResolvedEntity,
} from "../types/index";
import type { BoardFilters } from "../types/filters";
import { getEntityDate } from "../types/filters";

// ============================================================================
// Types
// ============================================================================

interface UseFilteredBoardDataProps {
  projections: BoardProjection[];
  entities: Map<string, ResolvedEntity>;
  derivedConnections: DerivedConnection[];
  annotations: BoardAnnotation[];
  filters: BoardFilters;
}

interface FilteredBoardData {
  /** Filtered projections */
  projections: BoardProjection[];
  /** Filtered entities (only those for visible projections) */
  entities: Map<string, ResolvedEntity>;
  /** Filtered derived connections (only between visible projections) */
  derivedConnections: DerivedConnection[];
  /** Filtered annotations (only between visible projections) */
  annotations: BoardAnnotation[];
  /** IDs of visible projections for quick lookup */
  visibleProjectionIds: Set<string>;
  /** IDs of hidden projections (for undo/info) */
  hiddenProjectionIds: Set<string>;
  /** IDs of hidden connections (for undo/info) */
  hiddenConnectionIds: Set<string>;
}

// ============================================================================
// Hook: useFilteredBoardData
// ============================================================================

/**
 * Hook to filter board data based on active filters.
 *
 * Filters are applied to:
 * - Entity types (show only selected types)
 * - Statuses (show only selected statuses)
 * - Date range (show only entities within date range)
 * - Tags (show only entities with selected tags)
 * - Connection types (show only selected connection types)
 *
 * Returns filtered projections, entities, and connections.
 */
export function useFilteredBoardData({
  projections,
  entities,
  derivedConnections,
  annotations,
  filters,
}: UseFilteredBoardDataProps): FilteredBoardData {
  // Filter projections based on entity type, status, date range, and tags
  const filteredProjections = useMemo(() => {
    // If no relevant filters are active, return all projections
    if (
      filters.entityTypes.length === 0 &&
      filters.statuses.length === 0 &&
      filters.dateRange === null &&
      filters.tags.length === 0
    ) {
      return projections;
    }

    return projections.filter((projection) => {
      const key = `${projection.entityType}:${projection.entityId}`;
      const entity = entities.get(key);

      // Entity type filter
      if (filters.entityTypes.length > 0) {
        if (!filters.entityTypes.includes(projection.entityType)) {
          return false;
        }
      }

      // Status filter
      if (filters.statuses.length > 0 && entity) {
        const status = getEntityStatus(entity);
        if (status && !filters.statuses.includes(status)) {
          return false;
        }
      }

      // Date range filter
      if (filters.dateRange && entity) {
        const entityDate = getEntityDate({
          type: entity.type,
          data: entity.data as unknown as Record<string, unknown>,
        });
        if (entityDate) {
          const start = filters.dateRange.start
            ? new Date(filters.dateRange.start)
            : null;
          const end = filters.dateRange.end
            ? new Date(filters.dateRange.end)
            : null;

          if (start && entityDate < start) {
            return false;
          }
          if (end && entityDate > end) {
            return false;
          }
        }
      }

      // Tags filter
      if (filters.tags.length > 0 && entity) {
        const entityTags = getEntityTags(entity);
        const hasMatchingTag = filters.tags.some((tag) =>
          entityTags.includes(tag)
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    });
  }, [projections, entities, filters]);

  // Build set of visible projection IDs
  const visibleProjectionIds = useMemo(() => {
    return new Set(filteredProjections.map((p) => p.id));
  }, [filteredProjections]);

  // Build set of hidden projection IDs
  const hiddenProjectionIds = useMemo(() => {
    const allIds = new Set(projections.map((p) => p.id));
    const hiddenIds = new Set<string>();
    for (const id of allIds) {
      if (!visibleProjectionIds.has(id)) {
        hiddenIds.add(id);
      }
    }
    return hiddenIds;
  }, [projections, visibleProjectionIds]);

  // Filter entities to only include visible projections
  const filteredEntities = useMemo(() => {
    const filtered = new Map<string, ResolvedEntity>();
    for (const projection of filteredProjections) {
      const key = `${projection.entityType}:${projection.entityId}`;
      const entity = entities.get(key);
      if (entity) {
        filtered.set(key, entity);
      }
    }
    return filtered;
  }, [filteredProjections, entities]);

  // Filter derived connections based on connection type filter and visible projections
  const { filteredDerivedConnections, hiddenConnectionIds } = useMemo(() => {
    // If connection type filter is active and doesn't include 'derived', hide all derived
    if (
      filters.connectionTypes.length > 0 &&
      !filters.connectionTypes.includes("derived")
    ) {
      return {
        filteredDerivedConnections: [],
        hiddenConnectionIds: new Set(derivedConnections.map((c) => c.id)),
      };
    }

    // Filter connections to only those between visible projections
    const filtered = derivedConnections.filter(
      (conn) =>
        visibleProjectionIds.has(conn.fromProjectionId) &&
        visibleProjectionIds.has(conn.toProjectionId)
    );

    const hiddenIds = new Set<string>();
    for (const conn of derivedConnections) {
      if (!filtered.includes(conn)) {
        hiddenIds.add(conn.id);
      }
    }

    return {
      filteredDerivedConnections: filtered,
      hiddenConnectionIds: hiddenIds,
    };
  }, [derivedConnections, filters.connectionTypes, visibleProjectionIds]);

  // Filter annotations (manual connections) based on connection type filter and visible projections
  const filteredAnnotations = useMemo(() => {
    // If connection type filter is active and doesn't include 'manual', hide all annotations
    if (
      filters.connectionTypes.length > 0 &&
      !filters.connectionTypes.includes("manual")
    ) {
      return [];
    }

    // Filter annotations to only those between visible projections
    return annotations.filter(
      (annotation) =>
        annotation.fromProjectionId === null ||
        annotation.toProjectionId === null ||
        (visibleProjectionIds.has(annotation.fromProjectionId) &&
          visibleProjectionIds.has(annotation.toProjectionId))
    );
  }, [annotations, filters.connectionTypes, visibleProjectionIds]);

  return {
    projections: filteredProjections,
    entities: filteredEntities,
    derivedConnections: filteredDerivedConnections,
    annotations: filteredAnnotations,
    visibleProjectionIds,
    hiddenProjectionIds,
    hiddenConnectionIds,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/** Get status from an entity for filtering */
function getEntityStatus(entity: ResolvedEntity): string | null {
  switch (entity.type) {
    case "event":
      return entity.data.status;
    case "prep_task":
      return entity.data.status;
    case "kitchen_task":
      return entity.data.status;
    case "proposal":
      return entity.data.status;
    case "shipment":
      return entity.data.status;
    case "risk":
      return entity.data.status;
    case "financial_projection":
      return entity.data.healthStatus;
    default:
      return null;
  }
}

/** Get tags from an entity for filtering */
function getEntityTags(entity: ResolvedEntity): string[] {
  switch (entity.type) {
    case "dish":
      return entity.data.dietaryTags ?? [];
    case "note":
      return entity.data.tags ?? [];
    default:
      return [];
  }
}
