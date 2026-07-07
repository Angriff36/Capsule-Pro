// Suggestion types for Kitchen AI suggestions
// Shared between API and client components

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
  createdAt: Date | string;
  description: string;
  dismissed: boolean;
  estimatedImpact?: string;
  expiresAt?: Date | string;
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
  generatedAt: Date | string;
  suggestions: SuggestedAction[];
  summary: string;
}
