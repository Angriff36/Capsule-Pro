"use client";

import { LivePresenceIndicator, Room } from "@repo/collaboration";
import { Button } from "@repo/design-system/components/ui/button";
import { RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { apiUrl } from "@/app/lib/api";
import {
  type Conflict,
  type ConflictDetectionResult,
  detectConflicts,
} from "./actions/conflicts";
import type { SuggestedAction } from "./actions/suggestions-types";
import { BoardCanvas } from "./components/board-canvas-realtime";
import { BoardHeader } from "./components/board-header";
import { ConflictWarningPanel } from "./components/conflict-warning-panel";
import { SuggestionsPanel } from "./components/suggestions-panel";
import { useSuggestions } from "./hooks/use-suggestions";
import type { CommandBoardCard } from "./types";

interface CommandBoardRealtimePageProps {
  boardId: string;
  orgId: string;
  tenantId: string;
  boardName?: string;
  boardStatus?: string;
  boardDescription?: string | null;
  boardTags?: string[];
  initialCards?: CommandBoardCard[];
}

function CommandBoardRealtimeContent({
  boardId,
  orgId,
  tenantId,
  boardName,
  boardStatus,
  boardDescription,
  boardTags,
  initialCards = [],
}: CommandBoardRealtimePageProps) {
  const [cards, setCards] = useState<CommandBoardCard[]>(initialCards);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isDetectingConflicts, setIsDetectingConflicts] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const {
    suggestions,
    isLoading: suggestionsLoading,
    fetchSuggestions,
    dismissSuggestion,
  } = useSuggestions(tenantId, boardId);

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

  const handleActionClick = (suggestion: SuggestedAction) => {
    if (suggestion.action.type === "navigate") {
      window.location.href = suggestion.action.path;
    }
  };

  const handleDismissConflicts = () => {
    setConflicts([]);
  };

  const roomId = `${orgId}:command-board:${boardId}`;

  return (
    <Room
      authEndpoint={apiUrl("/api/collaboration/auth")}
      fallback={
        <div className="flex h-full items-center justify-center text-sm">
          Connecting...
        </div>
      }
      id={roomId}
    >
      <div className="flex h-full w-full flex-col">
        <BoardHeader
          boardDescription={boardDescription}
          boardId={boardId}
          boardName={boardName}
          boardStatus={boardStatus}
          boardTags={boardTags}
        />
        <div className="relative flex-1">
          <LivePresenceIndicator className="absolute top-4 right-4 z-50" />
          <div className="absolute top-4 left-4 z-50 flex gap-2">
            <Button
              disabled={isDetectingConflicts}
              onClick={handleDetectConflicts}
              variant="outline"
            >
              <RefreshCw
                className={`h-4 w-4 ${isDetectingConflicts ? "animate-spin" : ""}`}
              />
              {isDetectingConflicts ? "Detecting..." : "Detect Conflicts"}
            </Button>
            <Button
              onClick={() => {
                setShowSuggestions(!showSuggestions);
                if (!showSuggestions && suggestions.length === 0) {
                  fetchSuggestions();
                }
              }}
              variant="outline"
            >
              <Sparkles className="h-4 w-4" />
              AI Suggestions
            </Button>
          </div>
          <ConflictWarningPanel
            conflicts={conflicts}
            onClose={handleDismissConflicts}
          />
          {showSuggestions && (
            <div className="absolute right-4 top-16 z-40 h-3/4 w-96 shadow-xl">
              <SuggestionsPanel
                isLoading={suggestionsLoading}
                onAction={handleActionClick}
                onDismiss={dismissSuggestion}
                onRefresh={fetchSuggestions}
                suggestions={suggestions}
              />
            </div>
          )}
          <BoardCanvas
            boardId={boardId}
            canEdit={true}
            initialCards={cards}
            onCardsChange={setCards}
          />
        </div>
      </div>
    </Room>
  );
}

export { CommandBoardRealtimeContent };
