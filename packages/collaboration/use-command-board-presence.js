"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.useCommandBoardPresence = useCommandBoardPresence;
exports.useOtherCursors = useOtherCursors;
const suspense_1 = require("@liveblocks/react/suspense");
const react_1 = require("react");
function useCommandBoardPresence() {
  const [presence, updateMyPresence] = (0, suspense_1.useMyPresence)();
  const others = (0, suspense_1.useOthers)();
  const updateCursor = (0, react_1.useCallback)(
    (cursor) => {
      updateMyPresence({ cursor });
    },
    [updateMyPresence]
  );
  const updateSelectedCard = (0, react_1.useCallback)(
    (cardId) => {
      updateMyPresence({ selectedCardId: cardId });
    },
    [updateMyPresence]
  );
  const updateDragging = (0, react_1.useCallback)(
    (isDragging) => {
      updateMyPresence({ isDragging });
    },
    [updateMyPresence]
  );
  const clearPresence = (0, react_1.useCallback)(() => {
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
function useOtherCursors() {
  const others = (0, suspense_1.useOthers)();
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
