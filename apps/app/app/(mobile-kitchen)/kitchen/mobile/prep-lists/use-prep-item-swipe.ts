"use client";

import { useCallback, useRef, useState } from "react";
import type { PrepListItem } from "../types";
import type { SwipeState } from "./prep-item-card";

const SWIPE_THRESHOLD = 80;

export interface UsePrepItemSwipeResult {
  handleTouchEnd: (item: PrepListItem) => void;
  handleTouchMove: (e: React.TouchEvent, itemId: string) => void;
  handleTouchStart: (e: React.TouchEvent, itemId: string) => void;
  swipeState: SwipeState | null;
}

/**
 * Left-swipe gesture for opening the prep-item note sheet.
 */
export function usePrepItemSwipe(
  onSwipeOpenNote: (item: PrepListItem) => void
): UsePrepItemSwipeResult {
  const [swipeState, setSwipeState] = useState<SwipeState | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, itemId: string) => {
      touchStartX.current = e.touches[0]?.clientX ?? 0;
      touchStartY.current = e.touches[0]?.clientY ?? 0;
      setSwipeState({ itemId, translateX: 0, isSwiping: false });
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent, itemId: string) => {
      if (!swipeState || swipeState.itemId !== itemId) {
        return;
      }

      const currentX = e.touches[0]?.clientX ?? 0;
      const currentY = e.touches[0]?.clientY ?? 0;
      const deltaX = currentX - touchStartX.current;
      const deltaY = currentY - touchStartY.current;

      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        return;
      }

      const translateX = Math.min(0, deltaX);

      setSwipeState({
        itemId,
        translateX,
        isSwiping: Math.abs(deltaX) > 10,
      });
    },
    [swipeState]
  );

  const handleTouchEnd = useCallback(
    (item: PrepListItem) => {
      if (!swipeState || swipeState.itemId !== item.id) {
        return;
      }

      if (swipeState.translateX < -SWIPE_THRESHOLD) {
        onSwipeOpenNote(item);
      }

      setSwipeState(null);
    },
    [swipeState, onSwipeOpenNote]
  );

  return {
    swipeState,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
