"use client";

Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsPageWithSuggestions = EventsPageWithSuggestions;
const button_1 = require("@repo/design-system/components/ui/button");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const suggestions_panel_1 = require("../../command-board/components/suggestions-panel");
const use_suggestions_1 = require("../../command-board/hooks/use-suggestions");
function EventsPageWithSuggestions({ tenantId }) {
  const [showSuggestions, setShowSuggestions] = (0, react_1.useState)(false);
  const {
    suggestions,
    isLoading: suggestionsLoading,
    fetchSuggestions,
    dismissSuggestion,
  } = (0, use_suggestions_1.useSuggestions)(tenantId);
  const handleActionClick = (suggestion) => {
    if (suggestion.action.type === "navigate") {
      window.location.href = suggestion.action.path;
    }
  };
  return (
    <>
      <div className="flex justify-end mb-4">
        <button_1.Button
          onClick={() => {
            setShowSuggestions(!showSuggestions);
            if (!showSuggestions && suggestions.length === 0) {
              fetchSuggestions();
            }
          }}
          variant="outline"
        >
          <lucide_react_1.Sparkles className="mr-2 h-4 w-4" />
          AI Suggestions
        </button_1.Button>
      </div>

      {showSuggestions && (
        <div className="mb-6 rounded-lg border bg-background shadow-lg">
          <suggestions_panel_1.SuggestionsPanel
            isLoading={suggestionsLoading}
            onAction={handleActionClick}
            onDismiss={dismissSuggestion}
            onRefresh={fetchSuggestions}
            suggestions={suggestions}
          />
        </div>
      )}
    </>
  );
}
