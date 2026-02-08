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

export interface CardToCreate {
  entityType: "client" | "event" | "task" | "employee" | "inventory" | "note";
  entityId?: string;
  title: string;
  content?: string;
  position: { x: number; y: number; width: number; height: number; zIndex: number };
  color?: string;
}

export type ActionHandler =
  | { type: "navigate"; path: string }
  | {
      type: "api_call";
      method: "GET" | "POST" | "PUT" | "DELETE";
      endpoint: string;
      payload?: unknown;
    }
  | { type: "function"; functionName: string; params?: unknown }
  | { type: "external"; url: string }
  | {
      type: "bulk_create_cards";
      cards: CardToCreate[];
      message?: string; // Success message to show after creation
    };

export interface SuggestedAction {
  id: string;
  tenantId: string;
  type: SuggestionType;
  category: SuggestionCategory;
  priority: SuggestionPriority;
  title: string;
  description: string;
  context?: Record<string, unknown>;
  action: ActionHandler;
  estimatedImpact?: string;
  createdAt: Date;
  expiresAt?: Date;
  dismissed: boolean;
  metadata?: Record<string, unknown>;
}

export interface SuggestionContext {
  boardId?: string;
  eventId?: string;
  module?: SuggestionCategory;
  timeframe?: "today" | "week" | "month";
  data?: {
    upcomingDeadlines?: Array<{
      id: string;
      title: string;
      dueDate: Date;
      type: string;
    }>;
    conflictingEvents?: Array<{
      id: string;
      title: string;
      date: Date;
      conflict: string;
    }>;
    capacityIssues?: Array<{
      id: string;
      type: string;
      severity: string;
      details: string;
    }>;
    overdueItems?: Array<{ id: string; title: string; overdueSince: Date }>;
    incompleteTasks?: number;
    totalEvents?: number;
    totalGuests?: number;
    revenueMetrics?: {
      period: string;
      revenue: number;
      target: number;
      variance: number;
    };
  };
}

export type GenerateSuggestionsInput = SuggestionContext & {
  tenantId: string;
  userId?: string;
  maxSuggestions?: number;
};

export interface GenerateSuggestionsOutput {
  suggestions: SuggestedAction[];
  summary: string;
  generatedAt: Date;
}

export interface DismissSuggestionInput {
  id: string;
  tenantId: string;
  reason?: string;
}

export interface ExecuteActionInput {
  suggestionId: string;
  tenantId: string;
  userId?: string;
}
