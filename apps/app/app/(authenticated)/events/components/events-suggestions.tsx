"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import type { SuggestedAction } from "../../command-board/actions/suggestions-types";
import { SuggestionsPanel } from "../../command-board/components/suggestions-panel";
import { useSuggestions } from "../../command-board/hooks/use-suggestions";

interface EventsPageWithSuggestionsProps {
  tenantId: string;
}

export function EventsPageWithSuggestions({
  tenantId,
}: EventsPageWithSuggestionsProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const {
    suggestions,
    isLoading: suggestionsLoading,
    fetchSuggestions,
    dismissSuggestion,
  } = useSuggestions(tenantId);

  const handleActionClick = (suggestion: SuggestedAction) => {
    if (suggestion.action.type === "navigate") {
      window.location.href = suggestion.action.path;
    }
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button
          onClick={() => {
            setShowSuggestions(!showSuggestions);
            if (!showSuggestions && suggestions.length === 0) {
              fetchSuggestions();
            }
          }}
          variant="outline"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          AI Suggestions
        </Button>
      </div>

      {showSuggestions && (
        <div className="mb-6 rounded-lg border bg-background shadow-lg">
          <SuggestionsPanel
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
