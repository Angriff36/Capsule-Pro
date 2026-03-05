/**
 * AI-Powered Bottleneck Suggestions
 *
 * Generates intelligent improvement suggestions for detected bottlenecks
 * using OpenAI GPT models.
 *
 * @packageDocumentation
 */
import type { Bottleneck, ImprovementSuggestion } from "./types.js";
declare function resolveOpenAiApiKey(): string | null;
/**
 * Generate AI-powered improvement suggestions for a bottleneck
 */
export declare function generateAiSuggestion(bottleneck: Bottleneck, context?: {
    tenantId: string;
    locationId?: string;
    historicalBottlenecks?: Bottleneck[];
}): Promise<ImprovementSuggestion | null>;
/**
 * Generate AI-powered suggestions for multiple bottlenecks
 */
export declare function generateAiSuggestionsBatch(bottlenecks: Bottleneck[], context?: {
    tenantId: string;
    locationId?: string;
    historicalBottlenecks?: Bottleneck[];
}): Promise<ImprovementSuggestion[]>;
/**
 * Prioritize suggestions based on bottleneck severity and potential impact
 */
export declare function prioritizeSuggestions(suggestions: ImprovementSuggestion[], maxCount?: number): ImprovementSuggestion[];
export { resolveOpenAiApiKey };
//# sourceMappingURL=ai-suggestions.d.ts.map