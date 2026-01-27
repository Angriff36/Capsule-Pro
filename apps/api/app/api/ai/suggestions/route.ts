import { openai } from "@ai-sdk/openai";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type {
  ActionHandler,
  SuggestedAction,
  SuggestionCategory,
  SuggestionPriority,
  SuggestionType,
} from "./types";

// AI model configuration
const AI_MODEL = "gpt-4o-mini";
const TEMPERATURE = 0.7;

// Suggestion type configurations
const SUGGESTION_TYPES: Record<
  string,
  {
    type: SuggestionType;
    defaultCategory: SuggestionCategory;
    defaultPriority: SuggestionPriority;
  }
> = {
  task_assignment: {
    type: "deadline_alert",
    defaultCategory: "kitchen",
    defaultPriority: "high",
  },
  task_creation: {
    type: "actionable_insight",
    defaultCategory: "kitchen",
    defaultPriority: "medium",
  },
  deadline_adjustment: {
    type: "deadline_alert",
    defaultCategory: "events",
    defaultPriority: "high",
  },
  resource_allocation: {
    type: "resource_conflict",
    defaultCategory: "scheduling",
    defaultPriority: "medium",
  },
  capacity_alert: {
    type: "capacity_warning",
    defaultCategory: "kitchen",
    defaultPriority: "high",
  },
  inventory_alert: {
    type: "follow_up",
    defaultCategory: "inventory",
    defaultPriority: "medium",
  },
  optimization: {
    type: "optimization",
    defaultCategory: "general",
    defaultPriority: "low",
  },
};

async function getContextData(
  tenantId: string,
  timeframe: "today" | "week" | "month" = "week"
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(today);
  if (timeframe === "today") {
    endDate.setDate(endDate.getDate() + 1);
  } else if (timeframe === "week") {
    endDate.setDate(endDate.getDate() + 7);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  // Fetch events
  const upcomingEvents = await database.event.findMany({
    where: {
      tenantId,
      deletedAt: null,
      eventDate: { gte: today, lte: endDate },
    },
    orderBy: { eventDate: "asc" },
    take: 10,
  });

  // Fetch event dishes separately (junction table)
  const eventIds = upcomingEvents.map((e) => e.id);
  const eventDishes =
    eventIds.length > 0
      ? await database.$queryRaw<
          Array<{
            tenant_id: string;
            id: string;
            event_id: string;
            dish_id: string;
            course: string | null;
            quantity_servings: number;
          }>
        >`
      SELECT tenant_id, id, event_id, dish_id, course, quantity_servings
      FROM tenant_events.event_dishes
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
        AND event_id = ANY(${eventIds}::uuid[])
      `
      : [];

  // Fetch dishes for the event dishes
  const dishIds = [...new Set(eventDishes.map((ed) => ed.dish_id))];
  const dishes =
    dishIds.length > 0
      ? await database.dish.findMany({
          where: {
            tenantId,
            id: { in: dishIds },
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
            allergens: true,
            dietaryTags: true,
          },
        })
      : [];

  const dishMap = new Map(dishes.map((d) => [d.id, d]));

  // Fetch incomplete prep tasks
  const prepTasks = await database.prepTask.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: { not: "completed" },
      dueByDate: { lte: endDate },
    },
    orderBy: { dueByDate: "asc" },
    take: 20,
  });

  // Fetch inventory alerts with item names
  const inventoryAlertsRaw = await database.inventoryAlert.findMany({
    where: {
      tenantId,
      resolved_at: null,
      deleted_at: null,
    },
    orderBy: { triggered_at: "desc" },
    take: 15,
  });

  // Get item IDs and fetch item names
  const itemIds = [...new Set(inventoryAlertsRaw.map((a) => a.itemId))];
  const inventoryItems =
    itemIds.length > 0
      ? await database.inventoryItem.findMany({
          where: {
            tenantId,
            id: { in: itemIds },
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];

  const itemMap = new Map(inventoryItems.map((item) => [item.id, item.name]));

  // Fetch staff assignments (need to filter by event date separately)
  const staffAssignments = await database.eventStaffAssignment.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    take: 50,
  });

  // Get events for staff assignments
  const staffEventIds = [...new Set(staffAssignments.map((s) => s.eventId))];
  const staffEvents =
    staffEventIds.length > 0
      ? await database.event.findMany({
          where: {
            id: { in: staffEventIds },
            eventDate: { gte: today, lte: endDate },
            deletedAt: null,
          },
          select: {
            id: true,
            title: true,
            eventDate: true,
          },
        })
      : [];

  const staffEventIdsFiltered = new Set(staffEvents.map((e) => e.id));
  const filteredStaffAssignments = staffAssignments.filter((s) =>
    staffEventIdsFiltered.has(s.eventId)
  );

  // Build events with dishes
  const eventsWithDishes = upcomingEvents.map((event) => ({
    id: event.id,
    title: event.title,
    eventDate: event.eventDate,
    guestCount: event.guestCount,
    venue: event.venueName,
    status: event.status,
    dishes: eventDishes
      .filter((ed) => ed.event_id === event.id)
      .map((ed) => {
        const dish = dishMap.get(ed.dish_id);
        return dish
          ? {
              id: dish.id,
              name: dish.name,
              allergens: dish.allergens,
              dietaryTags: dish.dietaryTags,
              servings: ed.quantity_servings,
              course: ed.course,
            }
          : null;
      })
      .filter((d): d is NonNullable<typeof d> => d !== null),
  }));

  // Calculate capacity metrics
  const eventsByDate = new Map<string, typeof eventsWithDishes>();
  for (const event of eventsWithDishes) {
    const dateKey = event.eventDate.toDateString();
    const events = eventsByDate.get(dateKey);
    if (events) {
      events.push(event);
    } else {
      eventsByDate.set(dateKey, [event]);
    }
  }

  const highVolumeDays = Array.from(eventsByDate.entries())
    .filter(([_, events]) => events.length >= 2)
    .map(([date, events]) => ({ date, eventCount: events.length, events }));

  return {
    upcomingEvents: eventsWithDishes,
    prepTasks: prepTasks.map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      dueByDate: t.dueByDate,
      priority: t.priority,
      estimatedMinutes: t.estimatedMinutes,
      taskType: t.taskType,
    })),
    inventoryAlerts: inventoryAlertsRaw.map((a) => ({
      id: a.id,
      alertType: a.alertType,
      itemName: itemMap.get(a.itemId) || "Unknown Item",
      thresholdValue: a.threshold_value.toString(),
      triggeredAt: a.triggered_at,
      notes: a.notes,
    })),
    staffAssignments: filteredStaffAssignments.map((s) => ({
      id: s.id,
      eventId: s.eventId,
      employeeId: s.employeeId,
      role: s.role,
      startTime: s.startTime,
      endTime: s.endTime,
    })),
    incompleteTaskCount: prepTasks.filter((t) => t.status !== "completed")
      .length,
    highVolumeDays,
    totalEvents: eventsWithDishes.length,
    timeframe,
  };
}

async function generateAISuggestions(
  tenantId: string,
  context: Awaited<ReturnType<typeof getContextData>>,
  maxSuggestions = 5
): Promise<SuggestedAction[]> {
  // Build system prompt
  const systemPrompt = `You are an expert catering operations advisor with deep knowledge of kitchen workflows, event planning, inventory management, and staff scheduling.

Your role is to analyze the current state of operations and suggest the most impactful next actions.

**Your suggestions should:**
1. PRIORITIZE by business impact and urgency
2. CONSIDER dependencies between tasks and events
3. RESPECT team capacity (don't suggest work when overloaded)
4. AVOID conflicts (double-booking, equipment, ingredients)
5. EXPLAIN reasoning for each suggestion

**Suggestion types you can generate:**
- task_assignment: Suggest assigning tasks to available staff
- task_creation: Identify missing prep tasks based on events
- deadline_adjustment: Flag unrealistic due dates
- resource_allocation: Suggest equipment, ingredient, or staff reallocation
- capacity_alert: Warn about potential bottlenecks
- inventory_alert: Highlight critical stock issues
- optimization: Suggest process improvements

**Response format (strict JSON):**
\`\`\`json
{
  "suggestions": [
    {
      "suggestionType": "task_assignment|task_creation|deadline_adjustment|resource_allocation|capacity_alert|inventory_alert|optimization",
      "category": "events|kitchen|scheduling|crm|inventory|general",
      "priority": "high|medium|low",
      "title": "Brief actionable title (max 60 chars)",
      "description": "Clear explanation of what to do and why (max 200 chars)",
      "reasoning": "Why this matters (max 150 chars)",
      "actionType": "navigate|api_call",
      "actionPath": "/path/to/page or /api/endpoint",
      "estimatedImpact": "Expected outcome (max 100 chars)"
    }
  ]
}
\`\`\`

**Constraints:**
- Return exactly ${maxSuggestions} suggestions or fewer
- Never suggest actions that violate business rules
- Never assign tasks to unavailable employees
- Never suggest actions on completed/canceled tasks
- Base suggestions ONLY on the provided context data
- Keep descriptions concise and actionable`;

  // Build user prompt with context
  const userPrompt = `Analyze the following catering operations state and suggest ${maxSuggestions} most impactful next actions:

**Current State:**
- Timeframe: ${context.timeframe}
- Upcoming Events: ${context.totalEvents}
- Incomplete Prep Tasks: ${context.incompleteTaskCount}
- Inventory Alerts: ${context.inventoryAlerts.length}

**Upcoming Events:**
${JSON.stringify(context.upcomingEvents, null, 2)}

**Prep Tasks:**
${JSON.stringify(context.prepTasks.slice(0, 15), null, 2)}

**Inventory Alerts:**
${JSON.stringify(context.inventoryAlerts, null, 2)}

**High Volume Days:**
${JSON.stringify(context.highVolumeDays, null, 2)}

**Staff Assignments:**
${JSON.stringify(context.staffAssignments.slice(0, 10), null, 2)}

Generate ${maxSuggestions} prioritized suggestions based on this state.`;

  try {
    // Call AI model
    const result = await generateText({
      model: openai(AI_MODEL),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: TEMPERATURE,
    });

    // Parse AI response
    const aiResponse = JSON.parse(result.text.trim());

    // Define type for AI response to avoid any
    type AiSuggestion = {
      suggestionType: string;
      category: string;
      priority: string;
      title: string;
      description: string;
      reasoning: string;
      actionType: string;
      actionPath?: string;
      estimatedImpact?: string;
    };

    // Convert to SuggestedAction format
    const suggestions: SuggestedAction[] = (
      (aiResponse.suggestions as AiSuggestion[]) || []
    ).map((s, index) => {
      const config =
        SUGGESTION_TYPES[s.suggestionType] || SUGGESTION_TYPES.optimization;

      return {
        id: `suggestion-${Date.now()}-${index}`,
        tenantId,
        type: config.type,
        category: config.defaultCategory,
        priority: config.defaultPriority,
        title: s.title,
        description: s.description,
        context: {
          reasoning: s.reasoning,
          source: "ai-suggestions",
        },
        action:
          s.actionType === "api_call"
            ? {
                type: "api_call" as const,
                method: "GET" as const,
                endpoint: s.actionPath,
              }
            : {
                type: "navigate" as const,
                path: s.actionPath || "/kitchen",
              },
        estimatedImpact: s.estimatedImpact,
        createdAt: new Date(),
        dismissed: false,
      };
    });

    return suggestions;
  } catch (error) {
    console.error("AI suggestion generation failed:", error);

    // Fallback to rule-based suggestions
    return generateFallbackSuggestions(tenantId, context, maxSuggestions);
  }
}

function generateFallbackSuggestions(
  tenantId: string,
  context: Awaited<ReturnType<typeof getContextData>>,
  maxSuggestions: number
): SuggestedAction[] {
  const suggestions: SuggestedAction[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Urgent tasks due within 24 hours
  const urgentTasks = context.prepTasks.filter((t) => {
    const daysUntilDue = Math.ceil(
      (t.dueByDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilDue <= 1 && t.status !== "completed";
  });

  if (urgentTasks.length > 0) {
    suggestions.push({
      id: `suggestion-${Date.now()}-1`,
      tenantId,
      type: "deadline_alert",
      category: "kitchen",
      priority: "high",
      title: `${urgentTasks.length} urgent prep task${urgentTasks.length > 1 ? "s" : ""} due soon`,
      description: `Review and prioritize these tasks to avoid delays: ${urgentTasks
        .slice(0, 3)
        .map((t) => t.name)
        .join(", ")}`,
      action: { type: "navigate", path: "/kitchen" },
      estimatedImpact: "Prevent delays and ensure quality standards",
      createdAt: new Date(),
      dismissed: false,
    });
  }

  // Critical inventory alerts
  const criticalAlerts = context.inventoryAlerts.filter(
    (a) => a.alertType === "critical"
  );
  if (criticalAlerts.length > 0) {
    suggestions.push({
      id: `suggestion-${Date.now()}-2`,
      tenantId,
      type: "follow_up",
      category: "inventory",
      priority: "high",
      title: `${criticalAlerts.length} critical inventory alert${
        criticalAlerts.length > 1 ? "s" : ""
      }`,
      description: criticalAlerts
        .slice(0, 3)
        .map((a) => `${a.itemName}: ${a.alertType}`)
        .join("; "),
      action: { type: "navigate", path: "/inventory" },
      estimatedImpact: "Prevent stockouts before events",
      createdAt: new Date(),
      dismissed: false,
    });
  }

  // High volume days warning
  if (context.highVolumeDays.length > 0) {
    suggestions.push({
      id: `suggestion-${Date.now()}-3`,
      tenantId,
      type: "capacity_warning",
      category: "scheduling",
      priority: "medium",
      title: `${context.highVolumeDays.length} high-volume day${
        context.highVolumeDays.length > 1 ? "s" : ""
      } detected`,
      description: `Review staffing for: ${context.highVolumeDays
        .slice(0, 2)
        .map((d) => d.date)
        .join(", ")}`,
      action: { type: "navigate", path: "/staff/scheduling" },
      estimatedImpact: "Ensure adequate staffing coverage",
      createdAt: new Date(),
      dismissed: false,
    });
  }

  // Capacity warning
  if (context.incompleteTaskCount > 10) {
    suggestions.push({
      id: `suggestion-${Date.now()}-4`,
      tenantId,
      type: "capacity_warning",
      category: "kitchen",
      priority: "medium",
      title: "High prep task volume",
      description: `${context.incompleteTaskCount} incomplete tasks. Consider prioritizing or redistributing work.`,
      action: { type: "navigate", path: "/kitchen" },
      estimatedImpact: "Reduce bottleneck risk and improve efficiency",
      createdAt: new Date(),
      dismissed: false,
    });
  }

  // General optimization suggestion
  if (suggestions.length < maxSuggestions) {
    suggestions.push({
      id: `suggestion-${Date.now()}-5`,
      tenantId,
      type: "optimization",
      category: "general",
      priority: "low",
      title: "Review weekly performance",
      description: "Analyze key metrics to identify improvement opportunities.",
      action: { type: "navigate", path: "/analytics" },
      estimatedImpact: "Identify trends and optimization opportunities",
      createdAt: new Date(),
      dismissed: false,
    });
  }

  return suggestions.slice(0, maxSuggestions);
}

export async function GET(request: Request) {
  try {
    // Auth check
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const maxSuggestions = Number.parseInt(
      searchParams.get("maxSuggestions") || "5",
      10
    );
    const timeframe = (searchParams.get("timeframe") || "week") as
      | "today"
      | "week"
      | "month";
    const boardId = searchParams.get("boardId") || undefined;
    const eventId = searchParams.get("eventId") || undefined;

    // Validate parameters
    if (maxSuggestions < 1 || maxSuggestions > 20) {
      return NextResponse.json(
        { message: "maxSuggestions must be between 1 and 20" },
        { status: 400 }
      );
    }

    // Fetch context data
    const contextData = await getContextData(tenantId, timeframe);

    // Generate AI suggestions (with fallback)
    const suggestions = await generateAISuggestions(
      tenantId,
      contextData,
      maxSuggestions
    );

    // Return response
    return NextResponse.json({
      suggestions,
      summary: `Generated ${suggestions.length} AI-powered suggestion${suggestions.length !== 1 ? "s" : ""} based on current state.`,
      generatedAt: new Date(),
      context: {
        timeframe,
        boardId,
        eventId,
        totalEvents: contextData.totalEvents,
        incompleteTasks: contextData.incompleteTaskCount,
        inventoryAlerts: contextData.inventoryAlerts.length,
      },
    });
  } catch (error) {
    console.error("Suggestions API error:", error);

    return NextResponse.json(
      {
        message: "Failed to generate suggestions",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
