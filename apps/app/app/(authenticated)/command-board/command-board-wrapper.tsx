"use client";

import { LivePresenceIndicator, Room } from "@repo/collaboration";
import { Button } from "@repo/design-system/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import {
  type Conflict,
  type ConflictDetectionResult,
  detectConflicts,
} from "./actions/conflicts";
import { BoardCanvas } from "./components/board-canvas-realtime";
import { ConflictWarningPanel } from "./components/conflict-warning-panel";
import type { CommandBoardCard } from "./types";

type CommandBoardRealtimePageProps = {
  boardId: string;
  orgId: string;
  initialCards?: CommandBoardCard[];
};

function CommandBoardRealtimeContent({
  boardId,
  orgId,
  initialCards = [],
}: CommandBoardRealtimePageProps) {
  const [cards, setCards] = useState<CommandBoardCard[]>(initialCards);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isDetectingConflicts, setIsDetectingConflicts] = useState(false);

  const handleDetectConflicts = async () => {
    setIsDetectingConflicts(true);
    try {
      const result: ConflictDetectionResult = await detectConflicts({
        boardId,
      });
      setConflicts(result.conflicts);
    } catch (err) {
      console.error("Failed to detect conflicts:", err);
    } finally {
      setIsDetectingConflicts(false);
    }
  };

  const handleDismissConflicts = () => {
    setConflicts([]);
  };

  const roomId = `${orgId}:command-board:${boardId}`;

  return (
    <Room
      authEndpoint="/api/collaboration/auth"
      fallback={
        <div className="flex h-full items-center justify-center text-sm">
          Connecting...
        </div>
      }
      id={roomId}
    >
      <div className="h-full w-full">
        <LivePresenceIndicator className="absolute top-4 right-4 z-50" />
        <Button
          className="absolute top-4 left-4 z-50 gap-2"
          disabled={isDetectingConflicts}
          onClick={handleDetectConflicts}
          variant="outline"
        >
          <RefreshCw
            className={`h-4 w-4 ${isDetectingConflicts ? "animate-spin" : ""}`}
          />
          {isDetectingConflicts ? "Detecting..." : "Detect Conflicts"}
        </Button>
        <ConflictWarningPanel
          conflicts={conflicts}
          onClose={handleDismissConflicts}
        />
        <BoardCanvas
          boardId={boardId}
          canEdit={true}
          initialCards={cards}
          onCardsChange={setCards}
        />
      </div>
    </Room>
  );
}

export { CommandBoardRealtimeContent };
