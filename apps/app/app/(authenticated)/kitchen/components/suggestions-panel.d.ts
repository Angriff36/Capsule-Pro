import type { SuggestedAction } from "../lib/suggestions-types";
type SuggestionsPanelProps = {
  suggestions: SuggestedAction[];
  isLoading?: boolean;
  onDismiss?: (suggestionId: string) => void;
  onRefresh?: () => void;
  onAction?: (suggestion: SuggestedAction) => void;
  onClose?: () => void;
};
export declare function SuggestionsPanel({
  suggestions,
  isLoading,
  onDismiss,
  onRefresh,
  onAction,
  onClose,
}: SuggestionsPanelProps): import("react").JSX.Element;
//# sourceMappingURL=suggestions-panel.d.ts.map
