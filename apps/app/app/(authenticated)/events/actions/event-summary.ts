"use server";
import {
  getEvent,
  listEventSummaries,
} from "@/app/lib/manifest-client.generated";

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import {
  countEventStaff,
  loadEventDishesSummary,
  loadPrepTasksForEvent,
} from "@/app/lib/convex/event-domain-loaders";
import { runManifestCommand } from "@/lib/manifest-command";
import { requireCurrentUser, requireTenantId } from "../../../lib/tenant";
import { calculateEventProfitability } from "../../analytics/events/actions/get-event-profitability";

const AI_MODEL = "gpt-4o-mini";
const JSON_OBJECT_REGEX = /\{[\s\S]*\}/;

export type SummarySection =
  | "highlights"
  | "issues"
  | "financialPerformance"
  | "clientFeedback"
  | "insights";

export interface SummaryItem {
  description: string;
  metric?: string;
  severity?: "info" | "success" | "warning" | "critical";
  title: string;
}

export interface EventSummaryData {
  clientFeedback: SummaryItem[];
  financialPerformance: SummaryItem[];
  highlights: SummaryItem[];
  insights: SummaryItem[];
  issues: SummaryItem[];
  overallSummary: string;
}

export interface GeneratedEventSummary {
  clientFeedback: SummaryItem[];
  eventId: string;
  financialPerformance: SummaryItem[];
  generatedAt: Date;
  generationDurationMs: number;
  highlights: SummaryItem[];
  id: string;
  insights: SummaryItem[];
  issues: SummaryItem[];
  overallSummary: string;
}

export interface GetEventSummaryResult {
  error?: string;
  success: boolean;
  summary?: GeneratedEventSummary;
}

function parseSummaryItems(value: unknown): SummaryItem[] {
  if (Array.isArray(value)) {
    return value as SummaryItem[];
  }
  if (typeof value === "string" && value.trim().length > 0) {
    try {
      return JSON.parse(value) as SummaryItem[];
    } catch {
      return [];
    }
  }
  return [];
}

export async function getEventSummary(
  eventId: string
): Promise<GetEventSummaryResult> {
  const tenantId = await requireTenantId();
  const existingSummary = (await listEventSummaries()).data
    .filter(
      (summary) =>
        summary.tenantId === tenantId &&
        summary.eventId === eventId &&
        !summary.deletedAt
    )
    .sort(
      (a, b) =>
        new Date(b.generatedAt || 0).getTime() -
        new Date(a.generatedAt || 0).getTime()
    );

  if (existingSummary.length === 0) {
    return { success: false, error: "No summary found" };
  }

  const summary = existingSummary[0];
  return {
    success: true,
    summary: {
      id: summary.id,
      eventId: summary.eventId,
      highlights: parseSummaryItems(summary.highlights),
      issues: parseSummaryItems(summary.issues),
      financialPerformance: parseSummaryItems(summary.financialPerformance),
      clientFeedback: parseSummaryItems(summary.clientFeedback),
      insights: parseSummaryItems(summary.insights),
      overallSummary: summary.overallSummary || "",
      generatedAt: new Date(summary.generatedAt || Date.now()),
      generationDurationMs: summary.generationDurationMs || 0,
    },
  };
}

export async function generateEventSummary(
  eventId: string
): Promise<GeneratedEventSummary> {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;
  const startTime = Date.now();

  const event = await getEvent(eventId);

  if (!event) {
    throw new Error("Event not found");
  }

  const [eventDishesResult, prepTasksResult, staffCount] = await Promise.all([
    loadEventDishesSummary(tenantId, eventId),
    loadPrepTasksForEvent(tenantId, eventId),
    countEventStaff(tenantId, eventId),
  ]);

  let profitability: Awaited<ReturnType<typeof calculateEventProfitability>> | null =
    null;
  let profitabilityError: string | null = null;
  try {
    profitability = await calculateEventProfitability(eventId);
  } catch (error) {
    profitabilityError =
      error instanceof Error ? error.message : "Unknown error";
  }

  const eventData = {
    id: event.id,
    title: event.title,
    eventType: event.eventType,
    eventDate: new Date(event.eventDate).toISOString(),
    guestCount: event.guestCount,
    status: event.status,
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    budget: event.budget ? Number(event.budget) : null,
    notes: event.notes,
    tags: event.tags,
  };

  const dishesData = eventDishesResult.map((d) => ({
    name: d.name,
    category: d.category,
    course: d.course,
    servings: d.quantityServings,
    dietaryTags: d.dietaryTags,
  }));

  const tasksData = prepTasksResult.map((t) => ({
    name: t.name,
    status: t.status,
    priority: t.isEventFinish ? 1 : 5,
    estimatedMinutes: t.servingsTotal,
  }));

  const staffData = [{ role: "assigned", employeeName: `${staffCount} staff` }];

  const systemPrompt = `You are an event management analyst that creates comprehensive executive summaries for completed events. Your task is to analyze event data and generate a detailed summary with:

1. HIGHLIGHTS - Key successes, achievements, and positive outcomes
2. ISSUES - Problems, challenges, or areas needing attention
3. FINANCIAL PERFORMANCE - Budget vs actuals, margins, cost analysis
4. CLIENT FEEDBACK - Any feedback information available
5. INSIGHTS - Actionable recommendations and learnings

Guidelines:
- Be concise but informative
- Use specific numbers and metrics where available
- Highlight critical information (safety, allergens, special requirements)
- Focus on actionable insights
- Never include sensitive financial data unless specifically authorized
- Format for quick reading (executives may only read the highlights)

Return your analysis as a structured JSON object with this exact format:
{
  "highlights": [{"title": "...", "description": "...", "severity": "success", "metric": "..."}],
  "issues": [{"title": "...", "description": "...", "severity": "warning", "metric": "..."}],
  "financialPerformance": [{"title": "...", "description": "...", "metric": "..."}],
  "clientFeedback": [{"title": "...", "description": "..."}],
  "insights": [{"title": "...", "description": "..."}],
  "overallSummary": "A 2-3 paragraph executive summary of the event"
}`;

  const userPrompt = `Analyze this event data and generate an executive summary:

EVENT:
${JSON.stringify(eventData, null, 2)}

DISHES/MENU:
${JSON.stringify(dishesData, null, 2)}

PREP TASKS:
${JSON.stringify(tasksData, null, 2)}

STAFF ASSIGNMENTS:
${JSON.stringify(staffData, null, 2)}

FINANCIAL DATA:
${
  profitability
    ? JSON.stringify(
        {
          budgetedRevenue: profitability.budgetedRevenue,
          actualRevenue: profitability.actualRevenue,
          budgetedMarginPct: profitability.budgetedGrossMarginPct,
          actualMarginPct: profitability.actualGrossMarginPct,
          marginVariance: profitability.marginVariancePct,
          foodCostVariance: profitability.foodCostVariance,
          laborCostVariance: profitability.laborCostVariance,
        },
        null,
        2
      )
    : `Profitability data not available: ${profitabilityError || "Unknown error"}`
}

Please provide a comprehensive executive summary following the system prompt guidelines.`;

  const result = await generateText({
    model: openai(AI_MODEL),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.5,
  });

  let summaryData: EventSummaryData;
  try {
    const jsonMatch = result.text.match(JSON_OBJECT_REGEX);
    if (jsonMatch) {
      summaryData = JSON.parse(jsonMatch[0]) as EventSummaryData;
    } else {
      throw new Error("No JSON found in response");
    }
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    summaryData = {
      highlights: [],
      issues: [],
      financialPerformance: [],
      clientFeedback: [],
      insights: [],
      overallSummary:
        "Unable to generate summary from AI response. Please review event data manually.",
    };
  }

  const endTime = Date.now();
  const generationDurationMs = endTime - startTime;

  // Governed write: EventSummary.create via Manifest runtime
  const createResult = await runManifestCommand({
    entity: "EventSummary",
    command: "create",
    body: {
      eventId,
      highlights: JSON.stringify(summaryData.highlights),
      issues: JSON.stringify(summaryData.issues),
      financialPerformance: JSON.stringify(summaryData.financialPerformance),
      clientFeedback: JSON.stringify(summaryData.clientFeedback),
      insights: JSON.stringify(summaryData.insights),
      overallSummary: summaryData.overallSummary,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!createResult.ok) {
    throw new Error(`Failed to create EventSummary: ${createResult.message}`);
  }

  const summaryId = (createResult.result as { id: string }).id;

  return {
    id: summaryId,
    eventId,
    highlights: summaryData.highlights,
    issues: summaryData.issues,
    financialPerformance: summaryData.financialPerformance,
    clientFeedback: summaryData.clientFeedback,
    insights: summaryData.insights,
    overallSummary: summaryData.overallSummary,
    generatedAt: new Date(),
    generationDurationMs,
  };
}

export async function deleteEventSummary(summaryId: string): Promise<void> {
  const user = await requireCurrentUser();
  const summary = (await listEventSummaries()).data.find((row) => row.id === summaryId);
  if (!summary) {
    return;
  }
  const result = await runManifestCommand({
    entity: "EventSummary",
    command: "update",
    body: {
      id: summaryId,
      eventId: summary.eventId,
      highlights: "[]",
      issues: "[]",
      financialPerformance: "[]",
      clientFeedback: "[]",
      insights: "[]",
      overallSummary: "[deleted]",
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
  if (!result.ok) {
    throw new Error(result.message || "Failed to clear event summary");
  }
}
