"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { SuggestionsPanel } from "../../../(operations)/kitchen/components/suggestions-panel";
import type { SuggestedAction } from "../../../(operations)/kitchen/lib/suggestions-types";
import { useSuggestions } from "../../../(operations)/kitchen/lib/use-suggestions";

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
      <div className="mb-4 flex justify-end">
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
        <div className="mb-6 rounded-lg border border-hairline bg-background">
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
