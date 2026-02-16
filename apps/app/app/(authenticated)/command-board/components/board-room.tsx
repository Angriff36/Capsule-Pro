"use client";

import { Room } from "@repo/collaboration/room";
import type { ReactNode } from "react";
import { getUsers } from "@/app/actions/users/get";
import { searchUsers } from "@/app/actions/users/search";
import { apiUrl } from "@/app/lib/api";

interface BoardRoomProps {
  boardId: string;
  orgId: string;
  children: ReactNode;
}

/**
 * Wraps the board in a Liveblocks Room for realtime collaboration.
 *
 * The room ID is scoped to the org + board, so each board has its own
 * presence/storage namespace. If Liveblocks auth fails, the fallback
 * renders children without collaboration features (graceful degradation).
 */
export function BoardRoom({ boardId, orgId, children }: BoardRoomProps) {
  const resolveUsers = async ({ userIds }: { userIds: string[] }) => {
    const response = await getUsers(userIds);
    if ("error" in response) {
      throw new Error("Problem resolving users");
    }
    return response.data;
  };

  const resolveMentionSuggestions = async ({ text }: { text: string }) => {
    const response = await searchUsers(text);
    if ("error" in response) {
      throw new Error("Problem resolving mention suggestions");
    }
    return response.data;
  };

  return (
    <Room
      authEndpoint={apiUrl("/api/collaboration/auth")}
      fallback={children}
      id={`${orgId}:board:${boardId}`}
      resolveMentionSuggestions={resolveMentionSuggestions}
      resolveUsers={resolveUsers}
    >
      {children}
    </Room>
  );
}
