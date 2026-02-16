"use client";

// Re-export real Liveblocks hooks — React 19 compatible as of @liveblocks/react 3.x
export {
  useBroadcastEvent,
  useEventListener,
  useMutation,
  useStorage,
} from "@liveblocks/react";

export { LiveCursors } from "./live-cursors";
export { LivePresenceIndicator } from "./live-presence-indicator";
export {
  useCommandBoardPresence,
  useOtherCursors,
} from "./use-command-board-presence";
