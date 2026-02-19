"use client";

import { useBroadcastEvent, useEventListener } from "@repo/collaboration/hooks";
import { useEffect, useRef } from "react";
import type { BoardSyncEvent } from "./use-board-sync";

// ============================================================================
// Liveblocks Sync Hook
// ============================================================================

/**
 * Bridges the board sync system with Liveblocks broadcast/event hooks.
 *
 * Calls `useBroadcastEvent` and `useEventListener` from Liveblocks to wire
 * realtime sync into the board. Must be called inside a component rendered
 * within a Liveblocks RoomProvider (i.e. inside BoardRoom).
 *
 * The `setBroadcast` callback receives the Liveblocks broadcast function so
 * the board sync system can send events. The `handleEvent` callback is called
 * when a remote event arrives.
 */
export function useLiveblocksSync(
  setBroadcast: (fn: ((event: BoardSyncEvent) => void) | null) => void,
  handleEvent: (event: BoardSyncEvent) => void
): void {
  const handleEventRef = useRef(handleEvent);
  handleEventRef.current = handleEvent;

  // Get the Liveblocks broadcast function
  const broadcast = useBroadcastEvent();

  // Wire broadcast into the sync system
  useEffect(() => {
    setBroadcast((event: BoardSyncEvent) => {
      try {
        broadcast(event);
      } catch (error) {
        console.error("[useLiveblocksSync] Failed to broadcast event:", error);
      }
    });
    return () => setBroadcast(null);
  }, [broadcast, setBroadcast]);

  // Listen for incoming events from other users
  useEventListener(({ event }: { event: unknown }) => {
    try {
      // Validate the event shape before dispatching
      const syncEvent = event as BoardSyncEvent;
      if (syncEvent && typeof syncEvent === "object" && "type" in syncEvent) {
        handleEventRef.current(syncEvent);
      }
    } catch (error) {
      console.error(
        "[useLiveblocksSync] Failed to handle incoming event:",
        error
      );
    }
  });
}
