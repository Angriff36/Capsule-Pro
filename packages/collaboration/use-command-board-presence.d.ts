export type CursorPosition = {
  x: number;
  y: number;
} | null;
export declare function useCommandBoardPresence(): {
  myPresence: {
    cursor: {
      x: number;
      y: number;
    } | null;
    selectedCardId: string | null;
    isDragging: boolean;
  };
  others: readonly import("@liveblocks/client").User<
    {
      cursor: {
        x: number;
        y: number;
      } | null;
      selectedCardId: string | null;
      isDragging: boolean;
    },
    {
      id: string;
      info: {
        name?: string;
        avatar?: string;
        color: string;
      };
    }
  >[];
  updateCursor: (cursor: CursorPosition) => void;
  updateSelectedCard: (cardId: string | null) => void;
  updateDragging: (isDragging: boolean) => void;
  clearPresence: () => void;
};
export declare function useOtherCursors(): {
  connectionId: number;
  cursor: {
    x: number;
    y: number;
  } | null;
  selectedCardId: string | null;
  isDragging: boolean;
  info: {
    name?: string;
    avatar?: string;
    color: string;
  };
}[];
//# sourceMappingURL=use-command-board-presence.d.ts.map
