"use server";

import { openai } from "@ai-sdk/openai";
import { database, Prisma } from "@repo/database";
import { generateText } from "ai";
import { requireTenantId } from "../../../lib/tenant";

const AI_MODEL = "gpt-4o-mini";

export type TaskSection = "prep" | "setup" | "cleanup";

export type TaskBreakdownItem = {
  id: string;
  name: string;
  description?: string;
  section: TaskSection;
  durationMinutes: number;
  startTime?: string;
  endTime?: string;
  relativeTime?: string;
  assignment?: string;
  ingredients?: string[];
  steps?: string[];
  isCritical: boolean;
  dueInHours?: number;
  historicalContext?: string;
  confidence?: number;
};

export type TaskBreakdown = {
  prep: TaskBreakdownItem[];
  setup: TaskBreakdownItem[];
  cleanup: TaskBreakdownItem[];
  totalPrepTime: number;
  totalSetupTime: number;
  totalCleanupTime: number;
  guestCount: number;
  eventDate: Date;
  generatedAt: Date;
  historicalEventCount?: number;
  disclaimer?: string;
};

export type GenerateTaskBreakdownParams = {
  eventId: string;
  customInstructions?: string;
};

export async function generateTaskBreakdown({
  eventId,
  customInstructions,
}: GenerateTaskBreakdownParams): Promise<TaskBreakdown> {
  const tenantId = await requireTenantId();

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
      link_id: string;
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
        ed.link_id,
        ed.dish_id,
        d.name,
        d.category,
        ed.course,
        ed.quantity_servings,
        COALESCE(d.dietary_tags, ARRAY[]::text[]) as dietary_tags,
        COALESCE(d.allergens, ARRAY[]::text[]) as allergens
      FROM tenant_events.event_dishes ed
      JOIN tenant_dishes.dishes d ON ed.dish_id = d.id
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

  const _historicalContext =
    similarEvents.length > 0
      ? `Based on ${similarEvents.length} similar events`
      : undefined;

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
      // Fall back to basic rule-based tasks if AI fails
      return getFallbackTasks(event, dishesData);
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
    // Fall back to basic rule-based tasks if AI call fails
    return getFallbackTasks(event, dishesData);
  }
}

/**
 * Fallback rule-based task generation when AI is unavailable
 */
function getFallbackTasks(
  event: {
    title: string;
    eventType: string;
    eventDate: Date;
    guestCount: number;
    venueName?: string | null;
  },
  _dishesData?: Array<{
    name: string;
    category: string | null;
  }>
): {
  prep: TaskBreakdownItem[];
  setup: TaskBreakdownItem[];
  cleanup: TaskBreakdownItem[];
} {
  const guestCount = event.guestCount;
  const scaleFactor = guestCount / 25;
  const now = Date.now();

  const prepTasks: TaskBreakdownItem[] = [
    {
      id: `prep-1-${now}`,
      name: "Review event details and menu",
      description: "Finalize menu items, guest count, and special requirements",
      section: "prep",
      durationMinutes: Math.round(30 * Math.min(scaleFactor, 2)),
      relativeTime: "48 hours before event",
      isCritical: false,
      confidence: 0.7,
    },
    {
      id: `prep-2-${now}`,
      name: "Order special ingredients",
      description: "Place orders for items requiring advance procurement",
      section: "prep",
      durationMinutes: 20,
      relativeTime: "72 hours before event",
      isCritical: true,
      dueInHours: 72,
      confidence: 0.7,
    },
    {
      id: `prep-3-${now}`,
      name: "Prep sauces and marinades",
      description:
        "Prepare bases, sauces, and marinades that benefit from resting",
      section: "prep",
      durationMinutes: Math.round(60 * Math.min(scaleFactor, 1.5)),
      relativeTime: "12 hours before event",
      isCritical: false,
      confidence: 0.7,
    },
    {
      id: `prep-4-${now}`,
      name: "Chop vegetables and mise en place",
      description: "Complete all vegetable prep and station setup",
      section: "prep",
      durationMinutes: Math.round(90 * Math.min(scaleFactor, 1.5)),
      relativeTime: "6 hours before event",
      isCritical: false,
      steps: [
        "Wash and sanitize all produce",
        "Chop vegetables according to recipe specifications",
        "Portion and label all prep items",
        "Set up work stations",
      ],
      confidence: 0.7,
    },
  ];

  const setupTasks: TaskBreakdownItem[] = [
    {
      id: `setup-1-${now}`,
      name: event.venueName
        ? "Transport equipment to venue"
        : "Set up cooking stations",
      description: event.venueName
        ? "Load and transport all cooking equipment and supplies"
        : "Configure cooking equipment and work areas",
      section: "setup",
      durationMinutes: Math.round(60 * Math.min(scaleFactor, 1.5)),
      relativeTime: "3 hours before event",
      isCritical: false,
      confidence: 0.7,
    },
    {
      id: `setup-2-${now}`,
      name: "Final food prep and plating setup",
      description: "Complete final prep and arrange plating stations",
      section: "setup",
      durationMinutes: Math.round(60 * scaleFactor),
      relativeTime: "1 hour before event",
      isCritical: true,
      confidence: 0.7,
    },
    {
      id: `setup-3-${now}`,
      name: "Team briefing",
      description: "Review timeline, assignments, and special requirements",
      section: "setup",
      durationMinutes: 15,
      relativeTime: "30 minutes before event",
      isCritical: false,
      confidence: 0.7,
    },
  ];

  const cleanupTasks: TaskBreakdownItem[] = [
    {
      id: `cleanup-1-${now}`,
      name: "Initial breakdown of serving stations",
      description: "Remove empty containers and organize service ware",
      section: "cleanup",
      durationMinutes: Math.round(30 * Math.min(scaleFactor, 1.5)),
      relativeTime: "During service",
      isCritical: false,
      confidence: 0.7,
    },
    {
      id: `cleanup-2-${now}`,
      name: "Clean cooking equipment",
      description: "Wash, sanitize, and store all cooking equipment",
      section: "cleanup",
      durationMinutes: Math.round(60 * scaleFactor),
      relativeTime: "After service",
      isCritical: false,
      confidence: 0.7,
    },
    {
      id: `cleanup-3-${now}`,
      name: event.venueName
        ? "Transport equipment back"
        : "Final kitchen clean",
      description: event.venueName
        ? "Load and transport all equipment to home base"
        : "Complete final cleaning and organize storage",
      section: "cleanup",
      durationMinutes: Math.round(45 * scaleFactor),
      relativeTime: "After service",
      isCritical: false,
      confidence: 0.7,
    },
  ];

  return {
    prep: prepTasks,
    setup: setupTasks,
    cleanup: cleanupTasks,
  };
}

export async function saveTaskBreakdown(
  eventId: string,
  breakdown: TaskBreakdown
): Promise<void> {
  const tenantId = await requireTenantId();

  const allTasks = [
    ...breakdown.prep.map((t) => ({ ...t, taskType: "prep" as const })),
    ...breakdown.setup.map((t) => ({ ...t, taskType: "setup" as const })),
    ...breakdown.cleanup.map((t) => ({ ...t, taskType: "cleanup" as const })),
  ];

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

    await database.prepTask.create({
      data: {
        tenantId,
        id: task.id,
        eventId,
        locationId,
        taskType:
          task.section === "prep"
            ? "prep"
            : task.section === "setup"
              ? "setup"
              : "cleanup",
        name: task.name,
        quantityTotal: breakdown.guestCount,
        servingsTotal: breakdown.guestCount,
        startByDate,
        dueByDate,
        estimatedMinutes: task.durationMinutes,
        status: "pending",
        priority: task.isCritical ? 8 : 5,
        notes: task.description,
      },
    });
  }
}
