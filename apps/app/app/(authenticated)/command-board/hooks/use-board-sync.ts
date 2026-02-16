"use client";

import { useCallback, useEffect, useRef } from "react";

// ============================================================================
// Types
// ============================================================================

/** Events broadcast over Liveblocks for board synchronization */
export type BoardSyncEvent =
  | {
      type: "PROJECTION_MOVED";
      projectionId: string;
      x: number;
      y: number;
    }
  | {
      type: "PROJECTION_ADDED";
      projectionId: string;
    }
  | {
      type: "PROJECTION_REMOVED";
      projectionId: string;
    }
  | {
      type: "BOARD_REFRESHED";
    };

interface UseBoardSyncOptions {
  /** Called when a remote user moves a projection */
  onRemoteMove?: (projectionId: string, x: number, y: number) => void;
  /** Called when a remote user adds a projection */
  onRemoteAdd?: (projectionId: string) => void;
  /** Called when a remote user removes a projection */
  onRemoteRemove?: (projectionId: string) => void;
  /** Called when a remote user triggers a board refresh */
  onRemoteRefresh?: () => void;
}

// ============================================================================
// Debounce Helper
// ============================================================================

const BROADCAST_DEBOUNCE_MS = 50;

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for broadcasting and receiving board sync events via Liveblocks.
 *
 * Uses a try/catch wrapper around Liveblocks hooks so the board works
 * even when not inside a Liveblocks Room (graceful degradation).
 *
 * Position broadcasts are debounced to avoid flooding during drag.
 */
export function useBoardSync(options: UseBoardSyncOptions = {}) {
  const { onRemoteMove, onRemoteAdd, onRemoteRemove, onRemoteRefresh } =
    options;

  // Debounce timer for position broadcasts
  const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingMoveRef = useRef<{
    projectionId: string;
    x: number;
    y: number;
  } | null>(null);

  // Try to import Liveblocks hooks dynamically — they throw if not in a Room
  const broadcastRef = useRef<((event: BoardSyncEvent) => void) | null>(null);

  // Initialize broadcast function
  useEffect(() => {
    try {
      // Dynamic import to avoid errors when not in a Room context
      // The actual hook binding happens in the BoardFlow component
      // This is a placeholder — the broadcast function is set via setBroadcast
    } catch {
      // Not in a Liveblocks Room — broadcasting disabled
    }
  }, []);

  // ---- Broadcast helpers ----

  const setBroadcast = useCallback(
    (fn: ((event: BoardSyncEvent) => void) | null) => {
      broadcastRef.current = fn;
    },
    []
  );

  const broadcastMove = useCallback(
    (projectionId: string, x: number, y: number) => {
      pendingMoveRef.current = { projectionId, x, y };

      if (moveTimerRef.current) return; // Already debouncing

      moveTimerRef.current = setTimeout(() => {
        moveTimerRef.current = null;
        const pending = pendingMoveRef.current;
        if (pending && broadcastRef.current) {
          broadcastRef.current({
            type: "PROJECTION_MOVED",
            projectionId: pending.projectionId,
            x: pending.x,
            y: pending.y,
          });
        }
        pendingMoveRef.current = null;
      }, BROADCAST_DEBOUNCE_MS);
    },
    []
  );

  const broadcastAdd = useCallback((projectionId: string) => {
    broadcastRef.current?.({
      type: "PROJECTION_ADDED",
      projectionId,
    });
  }, []);

  const broadcastRemove = useCallback((projectionId: string) => {
    broadcastRef.current?.({
      type: "PROJECTION_REMOVED",
      projectionId,
    });
  }, []);

  const broadcastRefresh = useCallback(() => {
    broadcastRef.current?.({
      type: "BOARD_REFRESHED",
    });
  }, []);

  // ---- Event handler for incoming events ----

  const handleEvent = useCallback(
    (event: BoardSyncEvent) => {
      switch (event.type) {
        case "PROJECTION_MOVED":
          onRemoteMove?.(event.projectionId, event.x, event.y);
          break;
        case "PROJECTION_ADDED":
          onRemoteAdd?.(event.projectionId);
          break;
        case "PROJECTION_REMOVED":
          onRemoteRemove?.(event.projectionId);
          break;
        case "BOARD_REFRESHED":
          onRemoteRefresh?.();
          break;
      }
    },
    [onRemoteMove, onRemoteAdd, onRemoteRemove, onRemoteRefresh]
  );

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (moveTimerRef.current) {
        clearTimeout(moveTimerRef.current);
      }
    };
  }, []);

  return {
    /** Set the broadcast function (from useBroadcastEvent) */
    setBroadcast,
    /** Broadcast a position change (debounced) */
    broadcastMove,
    /** Broadcast that a projection was added */
    broadcastAdd,
    /** Broadcast that a projection was removed */
    broadcastRemove,
    /** Broadcast that the board should be refreshed */
    broadcastRefresh,
    /** Handle an incoming sync event */
    handleEvent,
  };
}
