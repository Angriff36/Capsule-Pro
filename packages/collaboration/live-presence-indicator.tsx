"use client";

import { useOthers, useSelf } from "@liveblocks/react";
import { memo } from "react";

interface PresenceIndicatorProps {
  className?: string;
}

/**
 * Shows colored dots for each user currently in the room.
 * Includes the current user and all other connected users.
 */
function PresenceIndicator({ className }: PresenceIndicatorProps) {
  const self = useSelf();
  const others = useOthers();

  if (!self) {
    return null;
  }

  return (
    <div className={`flex items-center -space-x-1 ${className ?? ""}`}>
      {/* Current user */}
      <div
        className="h-2.5 w-2.5 rounded-full ring-2 ring-background"
        style={{ backgroundColor: self.info.color }}
        title={self.info.name ?? "You"}
      />
      {/* Other users */}
      {others.map((other) => (
        <div
          className="h-2.5 w-2.5 rounded-full ring-2 ring-background"
          key={other.connectionId}
          style={{ backgroundColor: other.info.color }}
          title={other.info.name ?? "Anonymous"}
        />
      ))}
    </div>
  );
}

export const LivePresenceIndicator = memo(PresenceIndicator);
