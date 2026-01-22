"use server";

import { openai } from "@ai-sdk/openai";
import { database, Prisma } from "@repo/database";
import { generateText } from "ai";
import { requireTenantId } from "../../../lib/tenant";
import { calculateEventProfitability } from "../../analytics/events/actions/get-event-profitability";

const AI_MODEL = "gpt-4o-mini";

export type SummarySection =
  | "highlights"
  | "issues"
  | "financialPerformance"
  | "clientFeedback"
  | "insights";

export interface SummaryItem {
  title: string;
  description: string;
  severity?: "info" | "success" | "warning" | "critical";
  metric?: string;
}

export interface EventSummaryData {
  highlights: SummaryItem[];
  issues: SummaryItem[];
  financialPerformance: SummaryItem[];
  clientFeedback: SummaryItem[];
  insights: SummaryItem[];
  overallSummary: string;
}

export interface GeneratedEventSummary {
  id: string;
  eventId: string;
  highlights: SummaryItem[];
  issues: SummaryItem[];
  financialPerformance: SummaryItem[];
  clientFeedback: SummaryItem[];
  insights: SummaryItem[];
  overallSummary: string;
  generatedAt: Date;
  generationDurationMs: number;
}

export interface GetEventSummaryResult {
  success: boolean;
  summary?: GeneratedEventSummary;
  error?: string;
}

export async function getEventSummary(
  eventId: string
): Promise<GetEventSummaryResult> {
  const tenantId = await requireTenantId();

  const existingSummary = await database.$queryRaw<
    Array<{
      id: string;
      event_id: string;
      highlights: unknown;
      issues: unknown;
      financial_performance: unknown;
      client_feedback: unknown;
      insights: unknown;
      overall_summary: string;
      generated_at: Date;
      generation_duration_ms: number | null;
    }>
  >(
    Prisma.sql`
      SELECT
        id,
        event_id,
        highlights,
        issues,
        financial_performance,
        client_feedback,
        insights,
        overall_summary,
        generated_at,
        generation_duration_ms
      FROM tenant_events.event_summaries
      WHERE tenant_id = ${tenantId}
        AND event_id = ${eventId}
        AND deleted_at IS NULL
      ORDER BY generated_at DESC
      LIMIT 1
    `
  );

  if (existingSummary.length === 0) {
    return { success: false, error: "No summary found" };
  }

  const summary = existingSummary[0];
  return {
    success: true,
    summary: {
      id: summary.id,
      eventId: summary.event_id,
      highlights: (summary.highlights as SummaryItem[]) || [],
      issues: (summary.issues as SummaryItem[]) || [],
      financialPerformance:
        (summary.financial_performance as SummaryItem[]) || [],
      clientFeedback: (summary.client_feedback as SummaryItem[]) || [],
      insights: (summary.insights as SummaryItem[]) || [],
      overallSummary: summary.overall_summary || "",
      generatedAt: summary.generated_at,
      generationDurationMs: summary.generation_duration_ms || 0,
    },
  };
}

export async function generateEventSummary(
  eventId: string
): Promise<GeneratedEventSummary> {
  const tenantId = await requireTenantId();
  const startTime = Date.now();

  const event = await database.event.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: eventId,
      },
    },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  const eventDishesResult = await database.$queryRaw<
    Array<{
      link_id: string;
      dish_id: string;
      name: string;
      category: string | null;
      course: string | null;
      quantity_servings: number;
      dietary_tags: string[] | null;
    }>
  >(
    Prisma.sql`
      SELECT
        ed.link_id,
        ed.dish_id,
        d.name,
        d.category,
        ed.course,
        ed.quantity_servings,
        COALESCE(d.dietary_tags, ARRAY[]::text[]) as dietary_tags
      FROM tenant_events.event_dishes ed
      JOIN tenant_dishes.dishes d ON ed.dish_id = d.id
      WHERE ed.tenant_id = ${tenantId}
        AND ed.event_id = ${eventId}
        AND ed.deleted_at IS NULL
      ORDER BY ed.created_at
    `
  );

  const prepTasksResult = await database.$queryRaw<
    Array<{
      id: string;
      name: string;
      status: string;
      priority: number;
      estimated_minutes: number | null;
    }>
  >(
    Prisma.sql`
      SELECT
        id,
        name,
        status,
        priority,
        estimated_minutes
      FROM tenant_kitchen.prep_tasks
      WHERE tenant_id = ${tenantId}
        AND event_id = ${eventId}
        AND deleted_at IS NULL
      ORDER BY due_by_date
    `
  );

  let profitability = null;
  let profitabilityError = null;
  try {
    profitability = await calculateEventProfitability(eventId);
  } catch (error) {
    profitabilityError =
      error instanceof Error ? error.message : "Unknown error";
  }

  const staffAssignmentsResult = await database.$queryRaw<
    Array<{
      id: string;
      role: string;
      employee_name: string | null;
    }>
  >(
    Prisma.sql`
      SELECT
        esa.id,
        esa.role,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name
      FROM tenant_events.event_staff_assignments esa
      LEFT JOIN tenant_staff.employees e ON esa.employee_id = e.id
      WHERE esa.tenant_id = ${tenantId}
        AND esa.event_id = ${eventId}
        AND esa.deleted_at IS NULL
    `
  );

  const eventData = {
    id: event.id,
    title: event.title,
    eventType: event.eventType,
    eventDate: event.eventDate.toISOString(),
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
    servings: d.quantity_servings,
    dietaryTags: d.dietary_tags,
  }));

  const tasksData = prepTasksResult.map((t) => ({
    name: t.name,
    status: t.status,
    priority: t.priority,
    estimatedMinutes: t.estimated_minutes,
  }));

  const staffData = staffAssignmentsResult.map((s) => ({
    role: s.role,
    employeeName: s.employee_name,
  }));

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
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
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

  const summaryRecord = await database.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`
      INSERT INTO tenant_events.event_summaries (
        tenant_id,
        id,
        event_id,
        highlights,
        issues,
        financial_performance,
        client_feedback,
        insights,
        overall_summary,
        generated_at,
        generation_duration_ms,
        created_at,
        updated_at
      ) VALUES (
        ${tenantId},
        gen_random_uuid(),
        ${eventId},
        ${JSON.stringify(summaryData.highlights)}::jsonb,
        ${JSON.stringify(summaryData.issues)}::jsonb,
        ${JSON.stringify(summaryData.financialPerformance)}::jsonb,
        ${JSON.stringify(summaryData.clientFeedback)}::jsonb,
        ${JSON.stringify(summaryData.insights)}::jsonb,
        ${summaryData.overallSummary},
        NOW(),
        ${generationDurationMs},
        NOW(),
        NOW()
      )
      RETURNING id
    `
  );

  return {
    id: summaryRecord[0].id,
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
  const tenantId = await requireTenantId();

  await database.$queryRaw(
    Prisma.sql`
      UPDATE tenant_events.event_summaries
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${summaryId}
        AND deleted_at IS NULL
    `
  );
}
