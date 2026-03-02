"use client";

import { useCallback, useEffect, useRef } from "react";
import { resolveEntities } from "../actions/resolve-entities";
import type { EntityType, ResolvedEntity } from "../types/entities";
import type { BoardProjection } from "../types/index";

// ============================================================================
// Types
// ============================================================================

interface EntityRef {
  entityType: EntityType;
  entityId: string;
}

interface UseEntityPollingOptions {
  /** Projections containing entity references to poll */
  projections: BoardProjection[];
  /** Callback when entities are updated */
  onEntitiesUpdate: (updates: Map<string, ResolvedEntity>) => void;
  /** Polling interval in milliseconds (default: 30000 = 30 seconds) */
  interval?: number;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
  /** Whether to pause when tab is not visible (default: true) */
  pauseOnHidden?: boolean;
}

interface UseEntityPollingReturn {
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
  /** Whether a refresh is in progress */
  isRefreshing: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Default polling interval: 30 seconds */
const DEFAULT_POLL_INTERVAL = 30_000;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract entity refs from projections
 */
function extractEntityRefs(projections: BoardProjection[]): EntityRef[] {
  return projections.map((p) => ({
    entityType: p.entityType as EntityType,
    entityId: p.entityId,
  }));
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to periodically poll for entity updates on the command board.
 *
 * This hook:
 * - Extracts entity refs from projections
 * - Periodically calls resolveEntities to get fresh data
 * - Compares old vs new data and only triggers updates when there are changes
 * - Pauses polling when the tab is not visible (optional)
 *
 * @example
 * ```tsx
 * useEntityPolling({
 *   projections,
 *   onEntitiesUpdate: (updates) => {
 *     setEntities(prev => {
 *       const newMap = new Map(prev);
 *       for (const [key, entity] of updates) {
 *         newMap.set(key, entity);
 *       }
 *       return newMap;
 *     });
 *   },
 *   interval: 30_000, // 30 seconds
 * });
 * ```
 */
export function useEntityPolling({
  projections,
  onEntitiesUpdate,
  interval = DEFAULT_POLL_INTERVAL,
  enabled = true,
  pauseOnHidden = true,
}: UseEntityPollingOptions): UseEntityPollingReturn {
  const isRefreshingRef = useRef(false);
  const onEntitiesUpdateRef = useRef(onEntitiesUpdate);

  // Keep callback ref updated
  useEffect(() => {
    onEntitiesUpdateRef.current = onEntitiesUpdate;
  }, [onEntitiesUpdate]);

  // Refresh function
  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) {
      return;
    }
    if (!enabled) {
      return;
    }
    if (projections.length === 0) {
      return;
    }

    // Check if tab is visible when pauseOnHidden is true
    if (pauseOnHidden && document.visibilityState === "hidden") {
      return;
    }

    isRefreshingRef.current = true;

    try {
      const refs = extractEntityRefs(projections);
      if (refs.length === 0) {
        return;
      }

      const result = await resolveEntities(refs);

      if (result.success && result.data && result.data.size > 0) {
        onEntitiesUpdateRef.current(result.data);
      }
    } catch (error) {
      // Silently fail - polling should not disrupt the UI
      console.error("[useEntityPolling] Failed to refresh entities:", error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [enabled, projections, pauseOnHidden]);

  // Set up polling interval
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const intervalId = setInterval(refresh, interval);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, interval, refresh]);

  // Handle visibility change for pauseOnHidden
  useEffect(() => {
    if (!(enabled && pauseOnHidden)) {
      return;
    }

    const handleVisibilityChange = () => {
      // Refresh immediately when tab becomes visible again
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, pauseOnHidden, refresh]);

  return {
    refresh,
    isRefreshing: isRefreshingRef.current,
  };
}

export type { UseEntityPollingOptions, UseEntityPollingReturn };
