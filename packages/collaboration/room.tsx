"use client";

import { LiveMap } from "@liveblocks/client";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import type { ReactNode } from "react";

interface RoomProps {
  id: string;
  children: ReactNode;
  authEndpoint: string;
  fallback: ReactNode;
  // biome-ignore lint/suspicious/noExplicitAny: Liveblocks resolver types are complex generics
  resolveUsers?: (args: { userIds: string[] }) => Promise<any>;
  // biome-ignore lint/suspicious/noExplicitAny: Liveblocks resolver types are complex generics
  resolveMentionSuggestions?: (args: {
    text: string;
    roomId: string;
  }) => Promise<any>;
}

/**
 * Wraps children in LiveblocksProvider + RoomProvider for real-time collaboration.
 * The authEndpoint is called by Liveblocks to authenticate the user.
 */
export function Room({
  id,
  children,
  authEndpoint,
  fallback: _fallback,
  resolveUsers,
  resolveMentionSuggestions,
}: RoomProps) {
  return (
    <LiveblocksProvider
      authEndpoint={authEndpoint}
      resolveMentionSuggestions={resolveMentionSuggestions}
      resolveUsers={resolveUsers}
    >
      <RoomProvider
        id={id}
        initialPresence={{
          cursor: null,
          selectedCardId: null,
          isDragging: false,
        }}
        initialStorage={{
          projections: new LiveMap(),
        }}
      >
        {children}
      </RoomProvider>
    </LiveblocksProvider>
  );
}
