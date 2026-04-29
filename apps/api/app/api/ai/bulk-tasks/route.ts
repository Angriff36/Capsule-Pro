import { openai } from "@ai-sdk/openai";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const AI_MODEL = "gpt-4o-mini";
const TEMPERATURE = 0.4;

// --- Types ---

interface EventDishRow {
  tenant_id: string;
  id: string;
  event_id: string;
  dish_id: string;
  course: string | null;
  quantity_servings: number;
}

interface GeneratedTask {
  id: string;
  taskType: string;
  name: string;
  dishName: string | null;
  dishId: string | null;
  quantityTotal: number;
  estimatedMinutes: number;
  priority: number;
  startByOffsetDays: number;
  dueByOffsetDays: number;
  dueByTime: string;
  notes: string | null;
}

interface TaskGroup {
  stationName: string;
  stationType: string;
  tasks: GeneratedTask[];
}

// --- Context Gathering ---

async function getEventContext(tenantId: string, eventId: string) {
  const event = await database.event.findFirst({
    where: { tenantId, id: eventId, deletedAt: null },
  });

  if (!event) throw new Error("Event not found");
  if (!event.locationId)
    throw new Error("Event must have a location assigned to generate tasks");

  // Fetch event dishes via junction table
  const eventDishes = await database.$queryRaw<EventDishRow[]>`
    SELECT tenant_id, id, event_id, dish_id, course, quantity_servings
    FROM tenant_events.event_dishes
    WHERE tenant_id = ${tenantId}::uuid
      AND deleted_at IS NULL
      AND event_id = ${eventId}::uuid
  `;

  if (eventDishes.length === 0)
    throw new Error("Event must have menu items assigned to generate tasks");

  // Fetch dish details
  const dishIds = [...new Set(eventDishes.map((ed) => ed.dish_id))];
  const dishes =
    dishIds.length > 0
      ? await database.dish.findMany({
          where: { tenantId, id: { in: dishIds }, deletedAt: null },
          select: {
            id: true,
            name: true,
            category: true,
            allergens: true,
            dietaryTags: true,
            minPrepLeadDays: true,
            maxPrepLeadDays: true,
          },
        })
      : [];

  const dishMap = new Map(dishes.map((d) => [d.id, d]));

  // Fetch stations for this location
  const stations = await database.station.findMany({
    where: {
      tenantId,
      locationId: event.locationId,
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      stationType: true,
      capacitySimultaneousTasks: true,
    },
  });

  // Fetch existing prep tasks (to avoid duplicates)
  const existingTasks = await database.prepTask.findMany({
    where: { tenantId, eventId, deletedAt: null },
    select: { id: true, name: true, taskType: true, status: true },
  });

  // Fetch prep methods
  const prepMethods = await database.prepMethod.findMany({
    where: { tenantId, isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      category: true,
      estimatedDurationMinutes: true,
    },
  });

  return {
    event,
    eventDishes: eventDishes.map((ed) => ({
      dishId: ed.dish_id,
      course: ed.course,
      quantityServings: ed.quantity_servings,
      dish: dishMap.get(ed.dish_id) ?? null,
    })),
    stations,
    existingTasks,
    prepMethods,
  };
}

// --- AI Task Generation ---

async function generateTasksWithAI(
  context: Awaited<ReturnType<typeof getEventContext>>
): Promise<{ taskGroups: TaskGroup[]; warnings: string[] }> {
  const { event, eventDishes, stations, existingTasks, prepMethods } = context;

  const eventDate = new Date(event.eventDate);
  const eventDateStr = eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const menuSummary = eventDishes
    .filter((ed) => ed.dish)
    .map((ed) => ({
      name: ed.dish!.name,
      category: ed.dish!.category,
      servings: ed.quantityServings,
      course: ed.course,
      allergens: ed.dish!.allergens,
      dietaryTags: ed.dish!.dietaryTags,
      minPrepLeadDays: ed.dish!.minPrepLeadDays,
      maxPrepLeadDays: ed.dish!.maxPrepLeadDays,
    }));

  const existingTaskNames = existingTasks.map((t) => t.name.toLowerCase());

  const systemPrompt = `You are a catering kitchen operations expert. Generate prep, setup, service, and follow-up tasks for a catering event.

RULES:
1. Generate tasks based ONLY on the provided menu items, guest count, and event timing
2. Group tasks by kitchen station when possible
3. Use day offsets: 0 = event day, -1 = day before, -2 = two days before, 1 = day after
4. Never generate tasks that duplicate existing tasks (listed below)
5. All dueByTime values in 24h format (HH:MM)
6. priority: 1=urgent, 5=normal, 10=low
7. Consider dish-specific prep lead times (min/max prep lead days)
8. Estimate realistic quantities based on guest count
9. Estimate realistic prep times in minutes

RESPONSE FORMAT (strict JSON):
{
  "taskGroups": [
    {
      "stationName": "Station or work area name",
      "stationType": "hot-line|cold-prep|bakery|garnish|prep-station|setup|general",
      "tasks": [
        {
          "taskType": "prep|setup|service|follow-up",
          "name": "Clear task name",
          "dishName": "Related dish name or null",
          "quantityTotal": 50,
          "estimatedMinutes": 45,
          "priority": 5,
          "startByOffsetDays": -2,
          "dueByOffsetDays": -1,
          "dueByTime": "08:00",
          "notes": "Instructions or null"
        }
      ]
    }
  ],
  "warnings": ["Any warnings about the plan"]
}`;

  const userPrompt = `Generate kitchen tasks for this catering event:

EVENT:
- Title: ${event.title}
- Date: ${eventDateStr}
- Guests: ${event.guestCount}
- Venue: ${event.venueName ?? "TBD"}

MENU (${menuSummary.length} items):
${JSON.stringify(menuSummary, null, 2)}

AVAILABLE STATIONS:
${stations.length > 0 ? stations.map((s) => `- ${s.name} (${s.stationType}, capacity: ${s.capacitySimultaneousTasks})`).join("\n") : "No stations configured. Group tasks by general work areas (Hot Line, Cold Prep, Setup, General)."}

AVAILABLE PREP METHODS:
${prepMethods.length > 0 ? prepMethods.map((m) => `- ${m.name} (${m.category ?? "general"}, ~${m.estimatedDurationMinutes ?? "?"} min)`).join("\n") : "No prep methods configured."}

EXISTING TASKS (do NOT duplicate):
${existingTaskNames.length > 0 ? existingTaskNames.map((n) => `- ${n}`).join("\n") : "No existing tasks."}

Generate comprehensive tasks covering prep, setup, service, and follow-up. Return valid JSON only.`;

  const result = await generateText({
    model: openai(AI_MODEL),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: TEMPERATURE,
  });

  const parsed = JSON.parse(result.text.trim());

  interface AiTask {
    taskType?: string;
    name?: string;
    dishName?: string | null;
    quantityTotal?: number;
    estimatedMinutes?: number;
    priority?: number;
    startByOffsetDays?: number;
    dueByOffsetDays?: number;
    dueByTime?: string;
    notes?: string | null;
  }

  interface AiTaskGroup {
    stationName: string;
    stationType: string;
    tasks: AiTask[];
  }

  const taskGroups: TaskGroup[] = (parsed.taskGroups || []).map(
    (group: AiTaskGroup, groupIdx: number) => ({
      stationName: group.stationName || "General",
      stationType: group.stationType || "general",
      tasks: group.tasks.map((task: AiTask, taskIdx: number) => ({
        id: `gen-${groupIdx}-${taskIdx}`,
        taskType: task.taskType || "prep",
        name: task.name || "Unnamed task",
        dishName: task.dishName ?? null,
        dishId: null as string | null,
        quantityTotal: task.quantityTotal || 1,
        estimatedMinutes: task.estimatedMinutes || 30,
        priority: task.priority || 5,
        startByOffsetDays: task.startByOffsetDays ?? -1,
        dueByOffsetDays: task.dueByOffsetDays ?? 0,
        dueByTime: task.dueByTime || "08:00",
        notes: task.notes ?? null,
      })),
    })
  );

  // Match dish names to dish IDs
  for (const group of taskGroups) {
    for (const task of group.tasks) {
      if (task.dishName) {
        const match = eventDishes.find(
          (ed) =>
            ed.dish &&
            ed.dish.name.toLowerCase() === task.dishName!.toLowerCase()
        );
        if (match?.dish) task.dishId = match.dish.id;
      }
    }
  }

  return { taskGroups, warnings: parsed.warnings || [] };
}

// --- Fallback Generation ---

function generateFallbackTasks(
  context: Awaited<ReturnType<typeof getEventContext>>
): { taskGroups: TaskGroup[]; warnings: string[] } {
  const { event, eventDishes, stations } = context;
  const warnings: string[] = [
    "AI generation unavailable. Using rule-based fallback.",
  ];

  const groups: TaskGroup[] = [];
  const categoryGroups = new Map<
    string,
    typeof eventDishes
  >();

  for (const ed of eventDishes) {
    if (!ed.dish) continue;
    const cat = ed.dish.category ?? "General";
    const existing = categoryGroups.get(cat) ?? [];
    existing.push(ed);
    categoryGroups.set(cat, existing);
  }

  let taskIndex = 0;

  for (const [category, dishes] of categoryGroups) {
    let stationType = "general";
    let stationName = category;

    if (
      category.toLowerCase().includes("hot") ||
      category.toLowerCase().includes("main")
    ) {
      stationType = "hot-line";
      stationName =
        stations.find((s) => s.stationType === "hot-line")?.name ??
        "Hot Line";
    } else if (
      category.toLowerCase().includes("cold") ||
      category.toLowerCase().includes("salad") ||
      category.toLowerCase().includes("appetizer")
    ) {
      stationType = "cold-prep";
      stationName =
        stations.find((s) => s.stationType === "cold-prep")?.name ??
        "Cold Prep";
    } else if (
      category.toLowerCase().includes("bake") ||
      category.toLowerCase().includes("dessert")
    ) {
      stationType = "bakery";
      stationName =
        stations.find((s) => s.stationType === "bakery")?.name ?? "Bakery";
    }

    const tasks: GeneratedTask[] = dishes.map((ed) => {
      const dish = ed.dish!;
      const leadDays = dish.minPrepLeadDays || 1;
      return {
        id: `gen-fallback-${taskIndex++}`,
        taskType: "prep",
        name: `Prep ${dish.name}`,
        dishName: dish.name,
        dishId: dish.id,
        quantityTotal: ed.quantityServings || event.guestCount,
        estimatedMinutes: 45,
        priority: 5,
        startByOffsetDays: -(leadDays + 1),
        dueByOffsetDays: -leadDays,
        dueByTime: "08:00",
        notes: `Prepare ${ed.quantityServings} servings of ${dish.name}`,
      };
    });

    groups.push({ stationName, stationType, tasks });
  }

  groups.push({
    stationName: "Event Setup",
    stationType: "setup",
    tasks: [
      {
        id: `gen-fallback-${taskIndex++}`,
        taskType: "setup",
        name: "Setup event venue and service stations",
        dishName: null,
        dishId: null,
        quantityTotal: 1,
        estimatedMinutes: 120,
        priority: 3,
        startByOffsetDays: 0,
        dueByOffsetDays: 0,
        dueByTime: "10:00",
        notes: "Setup tables, chairs, service stations, and equipment",
      },
    ],
  });

  groups.push({
    stationName: "Follow-up",
    stationType: "general",
    tasks: [
      {
        id: `gen-fallback-${taskIndex++}`,
        taskType: "follow-up",
        name: "Post-event cleanup and inventory check",
        dishName: null,
        dishId: null,
        quantityTotal: 1,
        estimatedMinutes: 90,
        priority: 7,
        startByOffsetDays: 1,
        dueByOffsetDays: 1,
        dueByTime: "10:00",
        notes: "Clean stations, return equipment, check inventory levels",
      },
    ],
  });

  return { taskGroups: groups, warnings };
}

// --- POST Handler ---

export async function POST(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant found" }, { status: 401 });
    }

    const body = (await request.json()) as { eventId?: string };
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json(
        { message: "Event ID is required" },
        { status: 400 }
      );
    }

    const context = await getEventContext(tenantId, eventId);

    let result: { taskGroups: TaskGroup[]; warnings: string[] };
    try {
      result = await generateTasksWithAI(context);
    } catch (aiError) {
      captureException(aiError);
      result = generateFallbackTasks(context);
    }

    return NextResponse.json({
      eventId: context.event.id,
      eventTitle: context.event.title,
      eventDate: context.event.eventDate.toISOString(),
      guestCount: context.event.guestCount,
      locationId: context.event.locationId!,
      taskGroups: result.taskGroups,
      warnings: result.warnings,
      generatedAt: new Date().toISOString(),
      model: AI_MODEL,
    });
  } catch (error) {
    captureException(error);

    if (error instanceof Error) {
      if (error.message === "Event not found") {
        return NextResponse.json(
          { message: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes("must have")) {
        return NextResponse.json(
          { message: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Failed to generate tasks",
      },
      { status: 500 }
    );
  }
}
