"use client";

import { useOthers, useSelf, useUpdateMyPresence } from "@liveblocks/react";
import { useCallback } from "react";

export type CursorPosition = { x: number; y: number } | null;

/**
 * Provides presence tracking for the command board.
 * Wraps Liveblocks presence hooks with a domain-specific API.
 */
export function useCommandBoardPresence() {
  const updateMyPresence = useUpdateMyPresence();
  const self = useSelf();
  const others = useOthers();

  const updateCursor = useCallback(
    (cursor: CursorPosition) => {
      updateMyPresence({ cursor });
    },
    [updateMyPresence]
  );

  const updateSelectedCard = useCallback(
    (cardId: string | null) => {
      updateMyPresence({ selectedCardId: cardId });
    },
    [updateMyPresence]
  );

  const updateDragging = useCallback(
    (isDragging: boolean) => {
      updateMyPresence({ isDragging });
    },
    [updateMyPresence]
  );

  const clearPresence = useCallback(() => {
    updateMyPresence({ cursor: null, selectedCardId: null, isDragging: false });
  }, [updateMyPresence]);

  return {
    myPresence: self?.presence ?? {
      cursor: null,
      selectedCardId: null,
      isDragging: false,
    },
    others,
    updateCursor,
    updateSelectedCard,
    updateDragging,
    clearPresence,
  };
}

/**
 * Returns other users' cursor positions and user info for rendering live cursors.
 * Each entry includes connectionId, cursor position, and user info.
 */
export function useOtherCursors() {
  return useOthers((others) =>
    others.map((other) => ({
      connectionId: other.connectionId,
      cursor: other.presence.cursor,
      info: other.info,
    }))
  );
}
