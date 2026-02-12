/**
 * use-conflict-resolution Hook
 *
 * React hook that provides conflict detection and resolution for collaborative
 * command board editing. Integrates with the conflict-resolver library
 * and provides toast notifications for conflicts.
 */

"use client";

import type { VectorClock } from "@repo/realtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { CommandBoardCard } from "../../types";
import {
  type CommandBoardCardContent,
  type ConflictDetails,
  type ConflictResolution,
  canAutoResolve,
  createConflictResolver,
  describeConflict,
  getConflictSeverity,
  type MergeOptions,
} from "../lib/conflict-resolver";

// =============================================================================
// Types
// =============================================================================

/**
 * Resolution strategy options for handling conflicts
 */
export type ResolutionStrategy = "acceptMine" | "acceptTheirs" | "merge";

/**
 * Extended conflict details with local pending state tracking
 */
export interface TrackedConflict extends ConflictDetails {
  /** Timestamp when conflict was detected */
  detectedAt: Date;
  /** Whether conflict has been resolved */
  resolved: boolean;
}

/**
 * Pending local change that hasn't been committed yet
 */
export interface PendingChange {
  /** Card ID being changed */
  cardId: string;
  /** Type of change (position, content, or both) */
  changeType: "position" | "content" | "both";
  /** Local card state before remote event arrived */
  localCard: CommandBoardCard;
  /** Timestamp when local change was made */
  timestamp: Date;
  /** Whether this change is currently being synced */
  syncing: boolean;
}

/**
 * Remote card update event from realtime
 */
export interface RemoteCardEvent {
  /** Card ID */
  cardId: string;
  /** Remote card state */
  remoteCard: CommandBoardCard;
  /** Vector clock from event */
  vectorClock: VectorClock;
  /** Event timestamp */
  timestamp: Date;
  /** User who made the change */
  userId: string;
}

/**
 * Return type for useConflictResolution hook
 */
export interface UseConflictResolutionReturn {
  /** List of active conflicts */
  conflicts: TrackedConflict[];
  /** Whether there are any active conflicts */
  hasConflict: boolean;
  /** List of pending local changes */
  pendingChanges: PendingChange[];
  /** Whether there are pending changes */
  hasPendingChanges: boolean;
  /**
   * Register a local change as pending
   * @param cardId - Card being changed
   * @param localCard - Current local card state
   * @param changeType - Type of change
   */
  registerPendingChange: (
    cardId: string,
    localCard: CommandBoardCard,
    changeType: "position" | "content" | "both"
  ) => void;
  /**
   * Mark a pending change as synced (committed to server)
   * @param cardId - Card that was synced
   */
  markAsSynced: (cardId: string) => void;
  /**
   * Handle a remote card update event
   * @param event - Remote card event data
   * @returns The resolved card state if conflict was auto-resolved, null otherwise
   */
  handleRemoteEvent: (event: RemoteCardEvent) => CommandBoardCard | null;
  /**
   * Resolve a specific conflict with a strategy
   * @param conflictId - ID of conflict to resolve
   * @param strategy - Resolution strategy to apply
   * @param mergeOptions - Required for "merge" strategy
   */
  resolveConflict: (
    conflictId: string,
    strategy: ResolutionStrategy,
    mergeOptions?: MergeOptions
  ) => void;
  /**
   * Clear/remove a conflict without resolving
   * @param conflictId - ID of conflict to clear
   */
  clearConflict: (conflictId: string) => void;
  /**
   * Resolve all conflicts using a strategy
   * @param strategy - Resolution strategy to apply to all conflicts
   */
  resolveAll: (strategy: ResolutionStrategy) => void;
  /**
   * Clear all conflicts
   */
  clearAll: () => void;
}

/**
 * Options for useConflictResolution hook
 */
export interface UseConflictResolutionOptions {
  /** Board ID for this instance */
  boardId: string;
  /** Callback when a conflict is resolved with final card state */
  onConflictResolved?: (
    conflictId: string,
    resolvedCard: CommandBoardCard
  ) => void;
  /** Callback when a conflict is detected */
  onConflictDetected?: (conflict: ConflictDetails) => void;
  /** Whether to auto-resolve conflicts when possible (default: true) */
  autoResolve?: boolean;
  /** Whether to show toast notifications (default: true) */
  showToasts?: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * useConflictResolution Hook
 *
 * Provides conflict detection and resolution for collaborative command board editing.
 *
 * Tracks local pending changes and detects conflicts when remote events arrive.
 * Integrates with the conflict-resolver library and shows toast notifications.
 *
 * @example
 * ```tsx
 * const {
 *   conflicts,
 *   hasConflict,
 *   resolveConflict,
 *   registerPendingChange,
 *   handleRemoteEvent,
 *   clearConflict
 * } = useConflictResolution({
 *   boardId: board.id,
 *   onConflictResolved: (id, card) => {
 *     dispatch({ type: "UPDATE_CARD", payload: card });
 *   },
 * });
 *
 * // When user starts editing a card
 * const handleCardChange = (card: CommandBoardCard) => {
 *   registerPendingChange(card.id, card, "content");
 * };
 *
 * // When remote event arrives
 * const handleRemoteUpdate = (event: RemoteCardEvent) => {
 *   const resolved = handleRemoteEvent(event);
 *   if (resolved) {
 *     dispatch({ type: "UPDATE_CARD", payload: resolved });
 *   }
 * };
 * ```
 */
export function useConflictResolution({
  boardId,
  onConflictResolved,
  onConflictDetected,
  autoResolve = true,
  showToasts = true,
}: UseConflictResolutionOptions): UseConflictResolutionReturn {
  // State for tracking conflicts and pending changes
  const [conflicts, setConflicts] = useState<TrackedConflict[]>([]);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);

  // Refs for non-state tracking
  const resolverRef = useRef(createConflictResolver());
  const _conflictCounterRef = useRef(0);

  /**
   * Register a local change as pending (not yet committed to server)
   */
  const registerPendingChange = useCallback(
    (
      cardId: string,
      localCard: CommandBoardCard,
      changeType: "position" | "content" | "both"
    ): void => {
      setPendingChanges((prev) => {
        // Remove any existing pending change for this card
        const filtered = prev.filter((pc) => pc.cardId !== cardId);

        // Add new pending change
        return [
          ...filtered,
          {
            cardId,
            changeType,
            localCard: { ...localCard },
            timestamp: new Date(),
            syncing: false,
          },
        ];
      });
    },
    []
  );

  /**
   * Mark a pending change as synced (committed to server)
   */
  const markAsSynced = useCallback((cardId: string): void => {
    setPendingChanges((prev) => prev.filter((pc) => pc.cardId !== cardId));
  }, []);

  /**
   * Show toast notification for a conflict
   */
  const showConflictToast = useCallback(
    (conflict: ConflictDetails): void => {
      if (!showToasts) {
        return;
      }

      const severity = getConflictSeverity(conflict);
      const description = describeConflict(conflict);

      switch (severity) {
        case "high":
          toast.error(description, {
            duration: 10_000,
            id: conflict.conflictId,
            action: {
              label: "Resolve",
              onClick: () => {
                // Focus on conflict resolution UI
              },
            },
          });
          break;
        case "medium":
          toast.warning(description, {
            duration: 8000,
            id: conflict.conflictId,
          });
          break;
        case "low":
          toast.info(description, {
            duration: 5000,
            id: conflict.conflictId,
          });
          break;
      }
    },
    [showToasts]
  );

  /**
   * Add a new conflict to the tracked list
   */
  const addConflict = useCallback(
    (conflict: ConflictDetails): void => {
      const trackedConflict: TrackedConflict = {
        ...conflict,
        detectedAt: new Date(),
        resolved: false,
      };

      setConflicts((prev) => [...prev, trackedConflict]);

      // Notify callback
      onConflictDetected?.(conflict);

      // Show toast
      showConflictToast(conflict);
    },
    [onConflictDetected, showConflictToast]
  );

  /**
   * Handle a remote card update event and detect/resolves conflicts
   */
  const handleRemoteEvent = useCallback(
    (event: RemoteCardEvent): CommandBoardCard | null => {
      const { cardId, remoteCard } = event;

      // Check if there's a pending local change for this card
      const pendingChange = pendingChanges.find((pc) => pc.cardId === cardId);

      if (!pendingChange) {
        // No pending change - no conflict possible
        return null;
      }

      // We have a pending local change and a remote update
      // Use the resolver to detect conflict
      const detected = resolverRef.current.detectConflict(
        pendingChange.localCard,
        remoteCard
      );

      if (!detected) {
        // No actual conflict (e.g., changes are compatible)
        // Clear pending change and return null
        markAsSynced(cardId);
        return null;
      }

      // Conflict detected!
      // Check if we should auto-resolve
      if (autoResolve && canAutoResolve(detected)) {
        const result = resolverRef.current.autoResolve(detected);

        if (showToasts) {
          toast.success(
            `Conflict auto-resolved for card "${cardId.slice(0, 8)}..."`,
            { duration: 3000 }
          );
        }

        // Clear pending change
        markAsSynced(cardId);

        // Notify callback
        onConflictResolved?.(detected.conflictId, result.resolvedCard);

        return result.resolvedCard;
      }

      // Manual resolution required
      addConflict(detected);

      return null;
    },
    [
      pendingChanges,
      autoResolve,
      showToasts,
      markAsSynced,
      addConflict,
      onConflictResolved,
    ]
  );

  /**
   * Resolve a specific conflict with a strategy
   */
  const resolveConflict = useCallback(
    (
      conflictId: string,
      strategy: ResolutionStrategy,
      mergeOptions?: MergeOptions
    ): void => {
      const conflict = conflicts.find((c) => c.conflictId === conflictId);

      if (!conflict) {
        console.warn(`Conflict not found: ${conflictId}`);
        return;
      }

      let resolution: ConflictResolution;

      switch (strategy) {
        case "acceptMine":
          resolution = { strategy: "acceptMine" };
          break;
        case "acceptTheirs":
          resolution = { strategy: "acceptTheirs" };
          break;
        case "merge":
          if (!mergeOptions) {
            toast.error("Merge options required for merge strategy");
            return;
          }
          resolution = { strategy: "merge", mergeOptions };
          break;
      }

      const result = resolverRef.current.resolveConflict(conflict, resolution);

      // Update conflict as resolved
      setConflicts((prev) =>
        prev.map((c) =>
          c.conflictId === conflictId ? { ...c, resolved: true } : c
        )
      );

      // Clear any pending change for this card
      markAsSynced(conflict.cardId);

      // Notify callback
      onConflictResolved?.(conflictId, result.resolvedCard);

      // Show success toast
      if (showToasts) {
        toast.success("Conflict resolved successfully", { duration: 3000 });
      }

      // Remove resolved conflict after a delay
      setTimeout(() => {
        setConflicts((prev) => prev.filter((c) => c.conflictId !== conflictId));
      }, 1000);
    },
    [conflicts, onConflictResolved, markAsSynced, showToasts]
  );

  /**
   * Clear/remove a conflict without resolving
   */
  const clearConflict = useCallback(
    (conflictId: string): void => {
      setConflicts((prev) => prev.filter((c) => c.conflictId !== conflictId));

      // Also clear pending change for this card
      const conflict = conflicts.find((c) => c.conflictId === conflictId);
      if (conflict) {
        markAsSynced(conflict.cardId);
      }
    },
    [conflicts, markAsSynced]
  );

  /**
   * Resolve all conflicts with a strategy
   */
  const resolveAll = useCallback(
    (strategy: ResolutionStrategy): void => {
      const unresolvedConflicts = conflicts.filter((c) => !c.resolved);

      for (const conflict of unresolvedConflicts) {
        resolveConflict(conflict.conflictId, strategy);
      }
    },
    [conflicts, resolveConflict]
  );

  /**
   * Clear all conflicts
   */
  const clearAll = useCallback((): void => {
    setConflicts([]);

    // Clear all pending changes
    setPendingChanges([]);

    if (showToasts) {
      toast.success("All conflicts cleared", { duration: 3000 });
    }
  }, [showToasts]);

  // Clean up resolved conflicts periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setConflicts((prev) => prev.filter((c) => !c.resolved));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Clean up pending changes for cards that have been synced
  // This is a safety net in case markAsSynced wasn't called
  useEffect(() => {
    const now = Date.now();
    const STALE_TIMEOUT = 60_000; // 1 minute

    setPendingChanges((prev) =>
      prev.filter((pc) => now - pc.timestamp.getTime() < STALE_TIMEOUT)
    );
  }, []);

  return {
    conflicts,
    hasConflict: conflicts.length > 0,
    pendingChanges,
    hasPendingChanges: pendingChanges.length > 0,
    registerPendingChange,
    markAsSynced,
    handleRemoteEvent,
    resolveConflict,
    clearConflict,
    resolveAll,
    clearAll,
  };
}

// =============================================================================
// Utility Types and Functions
// =============================================================================

/**
 * Create merge options for a field-by-field merge
 *
 * @param localFields - Fields to accept from local version
 * @param remoteFields - Fields to accept from remote version
 * @param positionSource - Which position to accept
 * @returns Merge options object
 */
export function createMergeOptions(
  localFields: readonly (keyof CommandBoardCardContent)[],
  remoteFields: readonly (keyof CommandBoardCardContent)[],
  positionSource: "local" | "remote" | "latest" = "latest"
): MergeOptions {
  return {
    positionSource,
    localContentFields: [...localFields],
    remoteContentFields: [...remoteFields],
  };
}

/**
 * Get all content field keys for merge options
 */
export const ALL_CONTENT_FIELDS: readonly (keyof CommandBoardCardContent)[] = [
  "title",
  "content",
  "cardType",
  "status",
  "color",
  "entityId",
  "entityType",
  "metadata",
] as const;

/**
 * Create merge options that prefer all local content
 */
export function preferLocalContent(): MergeOptions {
  return createMergeOptions(ALL_CONTENT_FIELDS, [], "local");
}

/**
 * Create merge options that prefer all remote content
 */
export function preferRemoteContent(): MergeOptions {
  return createMergeOptions([], ALL_CONTENT_FIELDS, "remote");
}

/**
 * Create merge options that prefer position by timestamp
 */
export function preferLatestPosition(
  localFields: readonly (keyof CommandBoardCardContent)[] = [],
  remoteFields: readonly (keyof CommandBoardCardContent)[] = []
): MergeOptions {
  return createMergeOptions(localFields, remoteFields, "latest");
}

/**
 * Create merge options for content conflict (keep latest position)
 */
export function createContentConflictMerge(
  conflictingFields: readonly (keyof CommandBoardCardContent)[],
  preferLocal: boolean
): MergeOptions {
  return preferLocal
    ? createMergeOptions(conflictingFields, [], "latest")
    : createMergeOptions([], conflictingFields, "latest");
}

/**
 * Create merge options for position conflict (keep latest position)
 */
export function createPositionConflictMerge(
  preferLocal: boolean
): MergeOptions {
  return preferLocal
    ? createMergeOptions(ALL_CONTENT_FIELDS, [], "local")
    : createMergeOptions([], ALL_CONTENT_FIELDS, "remote");
}

/**
 * Create merge options for concurrent conflict (prefer one version)
 */
export function createConcurrentConflictMerge(
  preferLocal: boolean
): MergeOptions {
  return preferLocal
    ? createMergeOptions(ALL_CONTENT_FIELDS, [], "local")
    : createMergeOptions([], ALL_CONTENT_FIELDS, "remote");
}
