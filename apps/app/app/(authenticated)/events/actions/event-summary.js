"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventSummary = getEventSummary;
exports.generateEventSummary = generateEventSummary;
exports.deleteEventSummary = deleteEventSummary;
const openai_1 = require("@ai-sdk/openai");
const database_1 = require("@repo/database");
const ai_1 = require("ai");
const tenant_1 = require("../../../lib/tenant");
const get_event_profitability_1 = require("../../analytics/events/actions/get-event-profitability");
const AI_MODEL = "gpt-4o-mini";
async function getEventSummary(eventId) {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const existingSummary = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
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
    `);
  if (existingSummary.length === 0) {
    return { success: false, error: "No summary found" };
  }
  const summary = existingSummary[0];
  return {
    success: true,
    summary: {
      id: summary.id,
      eventId: summary.event_id,
      highlights: summary.highlights || [],
      issues: summary.issues || [],
      financialPerformance: summary.financial_performance || [],
      clientFeedback: summary.client_feedback || [],
      insights: summary.insights || [],
      overallSummary: summary.overall_summary || "",
      generatedAt: summary.generated_at,
      generationDurationMs: summary.generation_duration_ms || 0,
    },
  };
}
async function generateEventSummary(eventId) {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const startTime = Date.now();
  const event = await database_1.database.event.findUnique({
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
  const eventDishesResult = await database_1.database.$queryRaw(database_1
    .Prisma.sql`
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
    `);
  const prepTasksResult = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
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
    `);
  let profitability = null;
  let profitabilityError = null;
  try {
    profitability = await (0,
    get_event_profitability_1.calculateEventProfitability)(eventId);
  } catch (error) {
    profitabilityError =
      error instanceof Error ? error.message : "Unknown error";
  }
  const staffAssignmentsResult = await database_1.database.$queryRaw(database_1
    .Prisma.sql`
      SELECT
        esa.id,
        esa.role,
        CONCAT(e.first_name, ' ', e.last_name) as employee_name
      FROM tenant_events.event_staff_assignments esa
      LEFT JOIN tenant_staff.employees e ON esa.employee_id = e.id
      WHERE esa.tenant_id = ${tenantId}
        AND esa.event_id = ${eventId}
        AND esa.deleted_at IS NULL
    `);
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
  const result = await (0, ai_1.generateText)({
    model: (0, openai_1.openai)(AI_MODEL),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.5,
  });
  let summaryData;
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      summaryData = JSON.parse(jsonMatch[0]);
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
  const summaryRecord = await database_1.database.$queryRaw(database_1.Prisma
    .sql`
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
    `);
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
async function deleteEventSummary(summaryId) {
  const tenantId = await (0, tenant_1.requireTenantId)();
  await database_1.database.$queryRaw(database_1.Prisma.sql`
      UPDATE tenant_events.event_summaries
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${summaryId}
        AND deleted_at IS NULL
    `);
}
