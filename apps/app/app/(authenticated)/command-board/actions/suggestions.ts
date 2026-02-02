"use server";

import { database } from "@repo/database";
import type {
  ActionHandler,
  SuggestedAction,
  SuggestionCategory,
  SuggestionPriority,
  SuggestionType,
} from "./suggestions-types";

async function getContextData(tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const [upcomingEvents, prepTasks, inventoryAlerts] = await Promise.all([
    database.event.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        event_date: { gte: today, lte: nextWeek },
      },
      orderBy: { event_date: "asc" },
      take: 20,
    }),
    database.prep_tasks.findMany({
      where: {
        tenant_id: tenantId,
        deleted_at: null,
        status: { not: "completed" },
        due_by_date: { lte: nextWeek },
      },
      orderBy: { due_by_date: "asc" },
      take: 20,
    }),
    database.inventory_alerts.findMany({
      where: {
        tenant_id: tenantId,
      },
      take: 10,
    }),
  ]);

  return {
    upcomingDeadlines: upcomingEvents
      .map((e) => ({
        id: e.id,
        title: e.title,
        dueDate: e.event_date,
        type: "event",
      }))
      .concat(
        prepTasks.map((t) => ({
          id: t.id,
          title: t.name,
          dueDate: t.due_by_date,
          type: "prep_task",
        }))
      ),
    upcomingEvents,
    incompleteTasks: prepTasks.length,
    inventoryAlerts,
    totalEvents: upcomingEvents.length,
  };
}

function generateSuggestion(
  type: SuggestionType,
  category: SuggestionCategory,
  priority: SuggestionPriority,
  title: string,
  description: string,
  action: ActionHandler,
  tenantId: string,
  estimatedImpact?: string
): SuggestedAction {
  return {
    id: `suggestion-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    tenantId,
    type,
    category,
    priority,
    title,
    description,
    action,
    estimatedImpact,
    createdAt: new Date(),
    dismissed: false,
  };
}

function addDeadlineSuggestions(
  deadlines: Array<{ id: string; title: string; dueDate: Date; type: string }>,
  tenantId: string,
  maxSuggestions: number
): SuggestedAction[] {
  const suggestions: SuggestedAction[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const deadline of deadlines.slice(0, maxSuggestions)) {
    const daysUntilDue = Math.ceil(
      (deadline.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilDue <= 1) {
      suggestions.push(
        generateSuggestion(
          "deadline_alert",
          deadline.type === "event" ? "events" : "kitchen",
          "high",
          `Urgent: ${deadline.title} due soon`,
          `${deadline.type === "event" ? "Event" : "Prep task"} is due ${daysUntilDue === 0 ? "today" : "tomorrow"}. Review progress and take action.`,
          {
            type: "navigate",
            path:
              deadline.type === "event"
                ? `/events/${deadline.id}`
                : `/kitchen/tasks/${deadline.id}`,
          },
          tenantId,
          "Avoid delays and ensure quality standards"
        )
      );
    } else if (daysUntilDue <= 3) {
      suggestions.push(
        generateSuggestion(
          "deadline_alert",
          deadline.type === "event" ? "events" : "kitchen",
          "medium",
          `Upcoming: ${deadline.title}`,
          `${deadline.type === "event" ? "Event" : "Prep task"} is due in ${daysUntilDue} days. Start preparation now.`,
          {
            type: "navigate",
            path:
              deadline.type === "event"
                ? `/events/${deadline.id}`
                : `/kitchen/tasks/${deadline.id}`,
          },
          tenantId,
          "Ensure adequate preparation time"
        )
      );
    }
  }
  return suggestions;
}

function addCapacitySuggestions(
  incompleteTasks: number,
  tenantId: string
): SuggestedAction[] {
  const suggestions: SuggestedAction[] = [];

  if (incompleteTasks > 5) {
    suggestions.push(
      generateSuggestion(
        "capacity_warning",
        "kitchen",
        "high",
        "High prep task volume",
        `You have ${incompleteTasks} incomplete prep tasks. Consider prioritizing or redistributing work.`,
        {
          type: "navigate",
          path: "/kitchen/tasks",
        },
        tenantId,
        "Reduce bottleneck risk and improve efficiency"
      )
    );
  }
  return suggestions;
}

function addResourceSuggestions(
  upcomingEvents: Array<{ event_date: Date }>,
  tenantId: string
): SuggestedAction[] {
  const suggestions: SuggestedAction[] = [];

  if (upcomingEvents.length >= 2) {
    const eventDates = upcomingEvents.map((e) => e.event_date.toDateString());
    const hasSameDayEvents = new Set(eventDates).size < eventDates.length;

    if (hasSameDayEvents) {
      suggestions.push(
        generateSuggestion(
          "resource_conflict",
          "events",
          "medium",
          "Multiple events scheduled for same day",
          "Review event details to ensure adequate staffing and resources for all events.",
          {
            type: "navigate",
            path: "/events",
          },
          tenantId,
          "Prevent resource overcommitment"
        )
      );
    }
  }
  return suggestions;
}

function addInventorySuggestions(
  inventoryAlerts: unknown[],
  tenantId: string
): SuggestedAction[] {
  const suggestions: SuggestedAction[] = [];
  const alertCount = inventoryAlerts.length;

  if (alertCount > 0) {
    suggestions.push(
      generateSuggestion(
        "follow_up",
        "inventory",
        alertCount > 3 ? "high" : "medium",
        `${alertCount} inventory alert${alertCount > 1 ? "s" : ""} pending`,
        "Review and address inventory alerts to prevent stockouts or overstock situations.",
        {
          type: "navigate",
          path: "/inventory",
        },
        tenantId,
        "Maintain optimal inventory levels"
      )
    );
  }
  return suggestions;
}

function addGeneralSuggestions(tenantId: string): SuggestedAction[] {
  return [
    generateSuggestion(
      "optimization",
      "general",
      "low",
      "Review weekly performance",
      "Analyze key metrics from the past week to identify improvement opportunities.",
      {
        type: "navigate",
        path: "/analytics",
      },
      tenantId,
      "Identify trends and optimization opportunities"
    ),
  ];
}

export async function generateSuggestions(input: {
  tenantId: string;
  boardId?: string;
  eventId?: string;
  module?: SuggestionCategory;
  timeframe?: "today" | "week" | "month";
  maxSuggestions?: number;
}) {
  const { tenantId, maxSuggestions = 5 } = input;

  const contextData = await getContextData(tenantId);
  const suggestions: SuggestedAction[] = [];

  const deadlineSuggestions = addDeadlineSuggestions(
    contextData.upcomingDeadlines,
    tenantId,
    maxSuggestions
  );
  suggestions.push(...deadlineSuggestions);

  const capacitySuggestions = addCapacitySuggestions(
    contextData.incompleteTasks,
    tenantId
  );
  suggestions.push(...capacitySuggestions);

  const resourceSuggestions = addResourceSuggestions(
    contextData.upcomingEvents,
    tenantId
  );
  suggestions.push(...resourceSuggestions);

  const inventorySuggestions = addInventorySuggestions(
    contextData.inventoryAlerts,
    tenantId
  );
  suggestions.push(...inventorySuggestions);

  const generalSuggestions = addGeneralSuggestions(tenantId);
  suggestions.push(...generalSuggestions);

  return {
    suggestions: suggestions.slice(0, maxSuggestions),
    summary: `Generated ${Math.min(suggestions.length, maxSuggestions)} suggestions based on current state.`,
    generatedAt: new Date(),
  };
}
