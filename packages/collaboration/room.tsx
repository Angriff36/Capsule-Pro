"use client";

import type { ResolveMentionSuggestionsArgs } from "@liveblocks/client";
import { LiveMap } from "@liveblocks/client";
import type { ResolveUsersArgs } from "@liveblocks/node";
import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";
import type { ComponentProps, ReactNode } from "react";

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
  fallback,
  ...props
}: RoomProps) => (
  <LiveblocksProvider authEndpoint={authEndpoint} {...props}>
    <RoomProvider
      id={id}
      initialPresence={{
        cursor: null,
        selectedCardId: null,
        isDragging: false,
      }}
      initialStorage={() => ({ cards: new LiveMap() })}
    >
      <ClientSideSuspense fallback={fallback}>{children}</ClientSideSuspense>
    </RoomProvider>
  </LiveblocksProvider>
);
