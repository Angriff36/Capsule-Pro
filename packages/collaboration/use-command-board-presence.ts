"use client";

import { useMyPresence, useOthers } from "@liveblocks/react/suspense";
import { useCallback } from "react";

export type CursorPosition = { x: number; y: number } | null;

export function useCommandBoardPresence() {
  const [presence, updateMyPresence] = useMyPresence();
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
    updateMyPresence({
      cursor: null,
      selectedCardId: null,
      isDragging: false,
    });
  }, [updateMyPresence]);

  return {
    myPresence: presence,
    others,
    updateCursor,
    updateSelectedCard,
    updateDragging,
    clearPresence,
  };
}

export function useOtherCursors() {
  const others = useOthers();

  return others
    .map((other) => ({
      connectionId: other.connectionId,
      cursor: other.presence.cursor,
      selectedCardId: other.presence.selectedCardId,
      isDragging: other.presence.isDragging,
      info: other.info,
    }))
    .filter((other) => other.cursor !== null);
}
