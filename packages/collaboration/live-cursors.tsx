"use client";

import type { RefObject } from "react";
import { memo } from "react";
import { LiveCursor } from "./live-cursor";
import { useOtherCursors } from "./use-command-board-presence";

interface LiveCursorsProps {
  containerRef?: RefObject<HTMLDivElement>;
}

/**
 * Renders live cursors for all other users in the room.
 * Each cursor shows the user's name and a colored pointer.
 */
function LiveCursorsComponent({
  containerRef: _containerRef,
}: LiveCursorsProps) {
  const others = useOtherCursors();

  return (
    <>
      {others.map(({ connectionId, cursor, info }) => {
        if (!cursor) {
          return null;
        }

        return (
          <LiveCursor
            color={info.color}
            key={`cursor-${connectionId}`}
            name={info.name ?? "Anonymous"}
            x={cursor.x}
            y={cursor.y}
          />
        );
      })}
    </>
  );
}

export const LiveCursors = memo(LiveCursorsComponent);
