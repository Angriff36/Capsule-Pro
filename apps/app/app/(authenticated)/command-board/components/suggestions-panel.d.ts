import type { SuggestedAction } from "../actions/suggestions-types";
type SuggestionsPanelProps = {
  suggestions: SuggestedAction[];
  isLoading?: boolean;
  onDismiss?: (suggestionId: string) => void;
  onRefresh?: () => void;
  onAction?: (suggestion: SuggestedAction) => void;
};
export declare function SuggestionsPanel({
  suggestions,
  isLoading,
  onDismiss,
  onRefresh,
  onAction,
}: SuggestionsPanelProps): import("react").JSX.Element;
//# sourceMappingURL=suggestions-panel.d.ts.map
