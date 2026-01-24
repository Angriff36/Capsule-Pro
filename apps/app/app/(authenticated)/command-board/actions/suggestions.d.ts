import type { SuggestedAction, SuggestionCategory } from "./suggestions-types";
export declare function generateSuggestions(input: {
  tenantId: string;
  boardId?: string;
  eventId?: string;
  module?: SuggestionCategory;
  timeframe?: "today" | "week" | "month";
  maxSuggestions?: number;
}): Promise<{
  suggestions: SuggestedAction[];
  summary: string;
  generatedAt: Date;
}>;
//# sourceMappingURL=suggestions.d.ts.map
