import type { SuggestedAction } from "../actions/suggestions-types";
export declare function useSuggestions(
  tenantId: string,
  boardId?: string,
  eventId?: string
): {
  suggestions: SuggestedAction[];
  isLoading: boolean;
  error: string | null;
  fetchSuggestions: () => Promise<void>;
  dismissSuggestion: (suggestionId: string) => Promise<void>;
};
//# sourceMappingURL=use-suggestions.d.ts.map
