// Suggestion types for AI-powered suggestions API
// These types are shared between the API route and client components

export type SuggestionPriority = "high" | "medium" | "low";

export type SuggestionType =
  | "deadline_alert"
  | "resource_conflict"
  | "capacity_warning"
  | "optimization"
  | "follow_up"
  | "data_inconsistency"
  | "actionable_insight";

export type SuggestionCategory =
  | "events"
  | "kitchen"
  | "scheduling"
  | "crm"
  | "inventory"
  | "general";

export type ActionHandler =
  | { type: "navigate"; path: string }
  | {
      type: "api_call";
      method: "GET" | "POST" | "PUT" | "DELETE";
      endpoint: string;
      payload?: unknown;
    }
  | { type: "function"; functionName: string; params?: unknown }
  | { type: "external"; url: string };

export interface SuggestedAction {
  action: ActionHandler;
  category: SuggestionCategory;
  context?: Record<string, unknown>;
  createdAt: Date;
  description: string;
  dismissed: boolean;
  estimatedImpact?: string;
  expiresAt?: Date;
  id: string;
  metadata?: Record<string, unknown>;
  priority: SuggestionPriority;
  tenantId: string;
  title: string;
  type: SuggestionType;
}

export interface SuggestionsResponse {
  context?: {
    timeframe: "today" | "week" | "month";
    boardId?: string;
    eventId?: string;
    totalEvents?: number;
    incompleteTasks?: number;
    inventoryAlerts?: number;
  };
  generatedAt: Date;
  suggestions: SuggestedAction[];
  summary: string;
}
