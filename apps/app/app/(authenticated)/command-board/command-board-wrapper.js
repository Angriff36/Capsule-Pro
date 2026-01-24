"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandBoardRealtimeContent = CommandBoardRealtimeContent;
const collaboration_1 = require("@repo/collaboration");
const button_1 = require("@repo/design-system/components/ui/button");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const conflicts_1 = require("./actions/conflicts");
const board_canvas_realtime_1 = require("./components/board-canvas-realtime");
const conflict_warning_panel_1 = require("./components/conflict-warning-panel");
const suggestions_panel_1 = require("./components/suggestions-panel");
const use_suggestions_1 = require("./hooks/use-suggestions");
function CommandBoardRealtimeContent({
  boardId,
  orgId,
  tenantId,
  initialCards = [],
}) {
  const [cards, setCards] = (0, react_1.useState)(initialCards);
  const [conflicts, setConflicts] = (0, react_1.useState)([]);
  const [isDetectingConflicts, setIsDetectingConflicts] = (0, react_1.useState)(
    false
  );
  const [showSuggestions, setShowSuggestions] = (0, react_1.useState)(false);
  const {
    suggestions,
    isLoading: suggestionsLoading,
    fetchSuggestions,
    dismissSuggestion,
  } = (0, use_suggestions_1.useSuggestions)(tenantId, boardId);
  const handleDetectConflicts = async () => {
    setIsDetectingConflicts(true);
    try {
      const result = await (0, conflicts_1.detectConflicts)({
        boardId,
      });
      setConflicts(result.conflicts);
    } catch (err) {
      console.error("Failed to detect conflicts:", err);
    } finally {
      setIsDetectingConflicts(false);
    }
  };
  const handleActionClick = (suggestion) => {
    if (suggestion.action.type === "navigate") {
      window.location.href = suggestion.action.path;
    }
  };
  const handleDismissConflicts = () => {
    setConflicts([]);
  };
  const roomId = `${orgId}:command-board:${boardId}`;
  return (
    <collaboration_1.Room
      authEndpoint="/api/collaboration/auth"
      fallback={
        <div className="flex h-full items-center justify-center text-sm">
          Connecting...
        </div>
      }
      id={roomId}
    >
      <div className="h-full w-full">
        <collaboration_1.LivePresenceIndicator className="absolute top-4 right-4 z-50" />
        <div className="absolute top-4 left-4 z-50 flex gap-2">
          <button_1.Button
            disabled={isDetectingConflicts}
            onClick={handleDetectConflicts}
            variant="outline"
          >
            <lucide_react_1.RefreshCw
              className={`h-4 w-4 ${isDetectingConflicts ? "animate-spin" : ""}`}
            />
            {isDetectingConflicts ? "Detecting..." : "Detect Conflicts"}
          </button_1.Button>
          <button_1.Button
            onClick={() => {
              setShowSuggestions(!showSuggestions);
              if (!showSuggestions && suggestions.length === 0) {
                fetchSuggestions();
              }
            }}
            variant="outline"
          >
            <lucide_react_1.Sparkles className="h-4 w-4" />
            AI Suggestions
          </button_1.Button>
        </div>
        <conflict_warning_panel_1.ConflictWarningPanel
          conflicts={conflicts}
          onClose={handleDismissConflicts}
        />
        {showSuggestions && (
          <div className="absolute right-4 top-16 z-40 h-3/4 w-96 shadow-xl">
            <suggestions_panel_1.SuggestionsPanel
              isLoading={suggestionsLoading}
              onAction={handleActionClick}
              onDismiss={dismissSuggestion}
              onRefresh={fetchSuggestions}
              suggestions={suggestions}
            />
          </div>
        )}
        <board_canvas_realtime_1.BoardCanvas
          boardId={boardId}
          canEdit={true}
          initialCards={cards}
          onCardsChange={setCards}
        />
      </div>
    </collaboration_1.Room>
  );
}
