import type { SuggestedAction } from "./suggestions-types";
export declare function useSuggestions(tenantId?: string | null): {
  suggestions: SuggestedAction[];
  isLoading: boolean;
  error: string | null;
  fetchSuggestions: (options?: {
    maxSuggestions?: number;
    timeframe?: "today" | "week" | "month";
  }) => Promise<void>;
  dismissSuggestion: (suggestionId: string) => void;
  handleAction: (suggestion: SuggestedAction) => void;
};
//# sourceMappingURL=use-suggestions.d.ts.map
