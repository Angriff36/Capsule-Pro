"use server";

import { openai } from "@ai-sdk/openai";
import { database, Prisma } from "@repo/database";
import { generateText } from "ai";
import { runManifestCommand } from "@/lib/manifest-command";
import { requireCurrentUser, requireTenantId } from "../../../lib/tenant";

const AI_MODEL = "gpt-4o-mini";

export type TaskSection = "prep" | "setup" | "cleanup";

export interface TaskBreakdownItem {
  assignment?: string;
  confidence?: number;
  description?: string;
  dueInHours?: number;
  durationMinutes: number;
  endTime?: string;
  historicalContext?: string;
  id: string;
  ingredients?: string[];
  isCritical: boolean;
  name: string;
  relativeTime?: string;
  section: TaskSection;
  startTime?: string;
  steps?: string[];
}

export interface TaskBreakdown {
  cleanup: TaskBreakdownItem[];
  disclaimer?: string;
  eventDate: Date;
  generatedAt: Date;
  guestCount: number;
  historicalEventCount?: number;
  prep: TaskBreakdownItem[];
  setup: TaskBreakdownItem[];
  totalCleanupTime: number;
  totalPrepTime: number;
  totalSetupTime: number;
}

export interface GenerateTaskBreakdownParams {
  customInstructions?: string;
  eventId: string;
}

export async function generateTaskBreakdown({
  eventId,
  customInstructions,
}: GenerateTaskBreakdownParams): Promise<TaskBreakdown> {
  const tenantId = await requireTenantId();

  const event = await database.event.findFirst({
    where: {
      tenantId,
      id: eventId,
    },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  const similarEvents = await database.$queryRaw<
    { id: string; title: string; event_date: Date; guest_count: number }[]
  >(
    Prisma.sql`
      SELECT id, title, event_date, guest_count
      FROM tenant_events.events
      WHERE tenant_id = ${tenantId}
        AND id != ${eventId}
        AND deleted_at IS NULL
        AND event_type = ${event.eventType}
        AND ABS(guest_count - ${event.guestCount}) <= 10
      ORDER BY event_date DESC
      LIMIT 5
    `
  );

  // Fetch event dishes/menu items for AI analysis
  const eventDishesResult = await database.$queryRaw<
    Array<{
      id: string;
      dish_id: string;
      name: string;
      category: string | null;
      course: string | null;
      quantity_servings: number;
      dietary_tags: string[] | null;
      allergens: string[] | null;
    }>
  >(
    Prisma.sql`
      SELECT
        ed.id,
        ed.dish_id,
        d.name,
        d.category,
        ed.course,
        ed.quantity_servings,
        COALESCE(d.dietary_tags, ARRAY[]::text[]) as dietary_tags,
        COALESCE(d.allergens, ARRAY[]::text[]) as allergens
      FROM tenant_events.event_dishes ed
      JOIN tenant_kitchen.dishes d ON ed.dish_id = d.id AND ed.tenant_id = d.tenant_id
      WHERE ed.tenant_id = ${tenantId}
        AND ed.event_id = ${eventId}
        AND ed.deleted_at IS NULL
      ORDER BY ed.created_at
    `
  );

  const dishesData = eventDishesResult.map((d) => ({
    name: d.name,
    category: d.category,
    course: d.course,
    servings: d.quantity_servings,
    dietaryTags: d.dietary_tags,
    allergens: d.allergens,
  }));

  const tasks = await generateTasksFromAI(
    event,
    customInstructions,
    similarEvents,
    dishesData
  );

  const totalPrepTime = tasks.prep.reduce(
    (sum, t) => sum + t.durationMinutes,
    0
  );
  const totalSetupTime = tasks.setup.reduce(
    (sum, t) => sum + t.durationMinutes,
    0
  );
  const totalCleanupTime = tasks.cleanup.reduce(
    (sum, t) => sum + t.durationMinutes,
    0
  );

  return {
    ...tasks,
    totalPrepTime,
    totalSetupTime,
    totalCleanupTime,
    guestCount: event.guestCount,
    eventDate: event.eventDate,
    generatedAt: new Date(),
    historicalEventCount: similarEvents.length || undefined,
    disclaimer:
      similarEvents.length === 0
        ? "Generated from event details (no historical data available)"
        : undefined,
  };
}

async function generateTasksFromAI(
  event: {
    id: string;
    title: string;
    eventType: string;
    eventDate: Date;
    guestCount: number;
    venueName?: string | null;
    venueAddress?: string | null;
    notes?: string | null;
    tags?: string[];
  },
  customInstructions?: string,
  similarEvents?: {
    id: string;
    title: string;
    event_date: Date;
    guest_count: number;
  }[],
  dishesData?: Array<{
    name: string;
    category: string | null;
    course: string | null;
    servings: number;
    dietaryTags: string[] | null;
    allergens: string[] | null;
  }>
): Promise<{
  prep: TaskBreakdownItem[];
  setup: TaskBreakdownItem[];
  cleanup: TaskBreakdownItem[];
}> {
  const systemPrompt = `You are an expert catering operations manager that generates comprehensive kitchen task breakdowns for events. Your task is to analyze event details and create actionable tasks organized into three sections: PREP, SETUP, and CLEANUP.

Your task breakdowns must be:
1. SPECIFIC - Each task should be concrete and actionable
2. TIMED - Include realistic duration estimates in minutes
3. SEQUENCED - Tasks should be ordered logically with relative timing
4. STATION-ASSIGNED - Each prep task should indicate which kitchen station (hot line, cold prep, pastry, etc.)
5. CRITICAL FLAGS - Mark tasks that are on the critical path or have hard deadlines

OUTPUT FORMAT (JSON only, no markdown):
{
  "prep": [
    {
      "name": "Task name",
      "description": "Detailed description of what needs to be done",
      "durationMinutes": number,
      "relativeTime": "e.g., '48 hours before event', '24 hours before event', 'day of event'",
      "station": "kitchen station name",
      "isCritical": boolean,
      "steps": ["step1", "step2"] // optional, for complex tasks
    }
  ],
  "setup": [...],
  "cleanup": [...]
}

GUIDELINES:
- Scale task durations based on guest count (use ~15 min per 25 guests as base, adjusted for complexity)
- For events >50 guests, add additional prep tasks for batch cooking
- For events >100 guests, add setup tasks for additional equipment/staff
- Always include a team briefing task 30 minutes before event
- Critical tasks include: special orders, defrosting, time-sensitive prep
- Consider dietary restrictions and allergens when generating tasks
- Include tasks for equipment transport if venue is off-site
- Factor in event type (wedding vs corporate vs casual) for appropriate complexity
- If dishes are provided, create tasks specific to those menu items`;

  const eventData = {
    id: event.id,
    title: event.title,
    eventType: event.eventType,
    eventDate: event.eventDate.toISOString(),
    guestCount: event.guestCount,
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    notes: event.notes,
    tags: event.tags,
  };

  const userPrompt = `Generate a comprehensive task breakdown for this catering event:

EVENT DETAILS:
${JSON.stringify(eventData, null, 2)}

${
  dishesData && dishesData.length > 0
    ? `
MENU/DISHES (${dishesData.length} items):
${JSON.stringify(dishesData, null, 2)}
`
    : ""
}

${
  similarEvents && similarEvents.length > 0
    ? `
SIMILAR PAST EVENTS (${similarEvents.length} events):
${JSON.stringify(
  similarEvents.map((e) => ({
    title: e.title,
    date: e.event_date,
    guests: e.guest_count,
  })),
  null,
  2
)}
`
    : ""
}

${
  customInstructions
    ? `
CUSTOM INSTRUCTIONS:
${customInstructions}
`
    : ""
}

Please generate a complete task breakdown following the system prompt guidelines. Return ONLY valid JSON, no markdown formatting.`;

  try {
    const result = await generateText({
      model: openai(AI_MODEL),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.6,
    });

    // Parse AI response
    let aiTasks: {
      prep: Array<{
        name: string;
        description: string;
        durationMinutes: number;
        relativeTime: string;
        station?: string;
        isCritical: boolean;
        steps?: string[];
      }>;
      setup: Array<{
        name: string;
        description: string;
        durationMinutes: number;
        relativeTime: string;
        station?: string;
        isCritical: boolean;
        steps?: string[];
      }>;
      cleanup: Array<{
        name: string;
        description: string;
        durationMinutes: number;
        relativeTime: string;
        station?: string;
        isCritical: boolean;
        steps?: string[];
      }>;
    };

    try {
      // Extract JSON from response (handle potential markdown code blocks)
      const jsonMatch =
        result.text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) ||
        result.text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        aiTasks = JSON.parse(jsonText);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("AI Response text:", result.text);
      // Throw error instead of silently falling back - user should know AI failed
      throw new Error(
        "Failed to parse AI response. The AI returned invalid JSON. Please try again."
      );
    }

    // Transform AI tasks to TaskBreakdownItem format with proper IDs
    const now = Date.now();
    const transformTask = (
      task: {
        name: string;
        description: string;
        durationMinutes: number;
        relativeTime: string;
        station?: string;
        isCritical: boolean;
        steps?: string[];
      },
      section: "prep" | "setup" | "cleanup",
      index: number
    ): TaskBreakdownItem => ({
      id: `${section}-${index}-${now}`,
      name: task.name,
      description: task.description,
      section,
      durationMinutes: Math.max(5, Math.round(task.durationMinutes)), // Minimum 5 minutes
      relativeTime: task.relativeTime,
      ...(task.station && { station: task.station }),
      isCritical: task.isCritical,
      steps: task.steps,
      confidence: 0.85, // AI-generated tasks have moderate confidence
    });

    return {
      prep: (aiTasks.prep || []).map((t, i) => transformTask(t, "prep", i)),
      setup: (aiTasks.setup || []).map((t, i) => transformTask(t, "setup", i)),
      cleanup: (aiTasks.cleanup || []).map((t, i) =>
        transformTask(t, "cleanup", i)
      ),
    };
  } catch (aiError) {
    console.error("AI generation failed:", aiError);
    // Re-throw the error instead of silently falling back.
    // The UI should handle this and show an error message to the user.
    throw new Error(
      `AI task generation failed: ${aiError instanceof Error ? aiError.message : "Unknown error"}. Please check your OpenAI API key and try again.`
    );
  }
}

export async function saveTaskBreakdown(
  eventId: string,
  breakdown: TaskBreakdown
): Promise<void> {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;

  const allTasks = [
    ...breakdown.prep.map((t) => ({ ...t, taskType: "prep" as const })),
    ...breakdown.setup.map((t) => ({ ...t, taskType: "setup" as const })),
    ...breakdown.cleanup.map((t) => ({ ...t, taskType: "cleanup" as const })),
  ];

  // Read: location lookup stays as direct Prisma (constitution §10)
  const locationResult = await database.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT id FROM tenant.locations
      WHERE tenant_id = ${tenantId}
      LIMIT 1
    `
  );

  const locationId =
    locationResult[0]?.id ?? "00000000-0000-0000-0000-000000000000";

  for (const task of allTasks) {
    const eventDate = new Date(breakdown.eventDate);
    const startByDate = new Date(eventDate);
    const dueByDate = new Date(eventDate);

    if (task.relativeTime?.includes("hours before")) {
      const hoursBefore = Number.parseInt(
        task.relativeTime.match(/\d+/)?.[0] || "0",
        10
      );
      dueByDate.setHours(dueByDate.getHours() - hoursBefore);
    } else if (task.relativeTime?.includes("before event")) {
      if (task.relativeTime.includes("72")) {
        startByDate.setDate(startByDate.getDate() - 3);
        dueByDate.setDate(dueByDate.getDate() - 2);
      } else if (task.relativeTime.includes("48")) {
        startByDate.setDate(startByDate.getDate() - 2);
        dueByDate.setDate(dueByDate.getDate() - 2);
      } else if (task.relativeTime.includes("24")) {
        startByDate.setDate(startByDate.getDate() - 1);
        dueByDate.setDate(dueByDate.getDate() - 1);
      } else if (task.relativeTime.includes("12")) {
        dueByDate.setHours(dueByDate.getHours() - 12);
      } else if (task.relativeTime.includes("6")) {
        dueByDate.setHours(dueByDate.getHours() - 6);
      }
    }

    const taskType =
      task.section === "prep"
        ? "prep"
        : task.section === "setup"
          ? "setup"
          : "cleanup";

    // Governed write: PrepTask.create via Manifest runtime
    const result = await runManifestCommand({
      entity: "PrepTask",
      command: "create",
      body: {
        name: task.name,
        eventId,
        prepListId: "",
        taskType,
        // Manifest priority range is 1-5 (1=critical, 5=low).
        // Previous direct-write used 8 for critical — outside valid range.
        priority: task.isCritical ? 1 : 5,
        quantityTotal: breakdown.guestCount,
        quantityUnitId: 0,
        servingsTotal: breakdown.guestCount,
        startByDate: startByDate.getTime(),
        dueByDate: dueByDate.getTime(),
        notes: task.description ?? "",
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!result.ok) {
      throw new Error(
        `Failed to create prep task "${task.name}": ${result.message}`
      );
    }

    // Governed write: set supplementary details via PrepTask.updateDetails
    const createdId =
      typeof result.result === "object" && result.result !== null
        ? (result.result as { id?: string }).id
        : undefined;

    if (createdId) {
      // Governed write: set supplementary details via PrepTask.updateDetails
      const detailResult = await runManifestCommand({
        entity: "PrepTask",
        command: "updateDetails",
        body: {
          id: createdId,
          dishId: "",
          locationId,
          estimatedMinutes: task.durationMinutes,
          dueByTime: "",
        },
        user: { id: user.id, tenantId: user.tenantId, role: user.role },
      });

      if (!detailResult.ok) {
        throw new Error(
          `Failed to update details for prep task "${task.name}": ${detailResult.message}`
        );
      }
    }
  }
}
