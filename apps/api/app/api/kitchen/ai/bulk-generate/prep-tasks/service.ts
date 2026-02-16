/**
 * Service for AI Bulk Task Generation
 * Handles the business logic for generating prep tasks from events using AI
 */

import { openai } from "@ai-sdk/openai";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { generateText } from "ai";
import { v4 as uuidv4 } from "uuid";
import type {
  AIGeneratedTasks,
  BulkGenerateRequest,
  GeneratedPrepTask,
  GenerationContext,
} from "./types";

const AI_MODEL = "gpt-4o-mini";
const TEMPERATURE = 0.7;

/**
 * Fetches context data for task generation from an event
 */
async function getGenerationContext(
  tenantId: string,
  eventId: string
): Promise<GenerationContext> {
  // Fetch event details
  const event = await database.event.findFirst({
    where: {
      tenantId,
      id: eventId,
      deletedAt: null,
    },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  // Fetch event dishes (junction table)
  const eventDishes = await database.$queryRaw<
    Array<{
      dish_id: string;
      course: string | null;
      quantity_servings: number;
    }>
  >`
    SELECT dish_id, course, quantity_servings
    FROM tenant_events.event_dishes
    WHERE event_id = ${eventId}::uuid
      AND deleted_at IS NULL
  `;

  // Get dish IDs
  const dishIds = eventDishes.map((ed) => ed.dish_id);

  // Fetch dish details
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

  // Fetch existing prep tasks for this event
  const existingPrepTasks = await database.prepTask.findMany({
    where: {
      tenantId,
      eventId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      dishId: true,
      status: true,
      dueByDate: true,
    },
  });

  // Build context with dishes
  const dishesWithContext = eventDishes
    .map((ed) => {
      const dish = dishMap.get(ed.dish_id);
      return dish
        ? {
            id: dish.id,
            name: dish.name,
            servings: ed.quantity_servings,
            course: ed.course,
            allergens: dish.allergens,
            dietaryTags: dish.dietaryTags,
          }
        : null;
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  return {
    eventId: event.id,
    eventName: event.title,
    eventDate: event.eventDate,
    guestCount: event.guestCount,
    venue: event.venueName,
    dishes: dishesWithContext,
    existingPrepTasks: existingPrepTasks.map((t) => ({
      id: t.id,
      name: t.name,
      dishId: t.dishId,
      status: t.status,
      dueByDate: t.dueByDate,
    })),
  };
}

/**
 * Generates prep tasks using AI based on event context
 */
async function generateTasksWithAI(
  context: GenerationContext,
  options: BulkGenerateRequest["options"] = {}
): Promise<AIGeneratedTasks> {
  const systemPrompt = `You are an expert catering kitchen operations manager with deep knowledge of:
- Professional kitchen workflows and prep sequences
- Recipe scaling and batch preparation
- Food safety requirements and allergen handling
- Station-based kitchen organization
- Critical path planning for event execution

**Your Role:**
Generate comprehensive prep task lists for catering events based on menu items and guest count.

**Task Generation Guidelines:**
1. Each dish should have 2-5 prep tasks depending on complexity
2. Tasks should follow logical prep sequence (mis en place → batch prep → finishing)
3. Consider allergen-aware preparation (separate tasks for allergen-containing items)
4. Account for prep time based on guest count and complexity
5. Assign appropriate stations (hot line, cold prep, pastry, etc.)
6. Set priorities (1=highest urgency, 10=lowest)
7. Include estimated preparation minutes
8. Flag tasks that must complete before event service (isEventFinish=true)

**Task Types:**
- "prep": Basic ingredient preparation (chopping, marinating, etc.)
- "batch": Batch cooking items (sauces, stocks, braises)
- "finish": Final preparation before service
- "setup": Equipment and station setup
- "allergen": Allergen-aware separate preparation
- "plating": Plating and garnish preparation

**Station Options:**
- "hot_line": Hot line cooking
- "cold_prep": Cold prep / garde manager
- "pastry": Pastry / baking
- "butcher": Butchery / meat fabrication
- "general": General prep

**Response Format (strict JSON):**
\`\`\`json
{
  "tasks": [
    {
      "name": "Clear task description",
      "dishId": "dish_id_or_null",
      "taskType": "prep|batch|finish|setup|allergen|plating",
      "quantityTotal": 1,
      "servingsTotal": guest_count_or_null,
      "startByDate": "YYYY-MM-DD",
      "dueByDate": "YYYY-MM-DD",
      "priority": 1-10,
      "estimatedMinutes": minutes,
      "notes": "helpful_prep_notes_or_null",
      "station": "station_name_or_null",
      "isEventFinish": false,
      "dependencies": []
    }
  ],
  "warnings": []
}
\`\`\`

**Date Guidelines:**
- Start dates should be 1-3 days before event for complex prep
- Due dates should align with critical path (most critical tasks due earliest)
- Setup tasks due early, finishing tasks due just before service
- Event date: ${context.eventDate.toISOString().split("T")[0]}`;

  const userPrompt = `Generate prep tasks for the following catering event:

**Event Details:**
- Event: ${context.eventName}
- Date: ${context.eventDate.toISOString().split("T")[0]}
- Guest Count: ${context.guestCount}
- Venue: ${context.venue || "TBD"}

**Menu Items:**
${JSON.stringify(context.dishes, null, 2)}

**Existing Prep Tasks (avoid duplicating these):**
${JSON.stringify(
  context.existingPrepTasks.map((t) => t.name),
  null,
  2
)}

**Generation Options:**
- Include Kitchen Tasks: ${options.includeKitchenTasks ?? false}
- Batch Multiplier: ${options.batchMultiplier ?? 1}x
- Priority Strategy: ${options.priorityStrategy ?? "due_date"}
- Dietary Restrictions: ${options.applyDietaryRestrictions?.join(", ") || "None"}

Generate comprehensive prep tasks covering all menu items. Ensure:
1. No duplicate tasks with existing prep tasks
2. Logical task sequencing with dependencies
3. Appropriate priority and timing
4. Station assignments
5. Realistic time estimates`;

  try {
    const result = await generateText({
      model: openai(AI_MODEL),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: TEMPERATURE,
    });

    const aiResponse = JSON.parse(result.text.trim()) as AIGeneratedTasks;

    // Validate and sanitize AI response
    if (!(aiResponse.tasks && Array.isArray(aiResponse.tasks))) {
      throw new Error("Invalid AI response: missing tasks array");
    }

    return {
      tasks: aiResponse.tasks,
      warnings: aiResponse.warnings || [],
    };
  } catch (error: unknown) {
    captureException(error);
    throw new Error(
      `Failed to generate tasks with AI: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Converts AI-generated tasks to database format
 */
function convertTasksToDbFormat(
  aiTasks: AIGeneratedTasks["tasks"],
  _tenantId: string,
  _eventId: string,
  context: GenerationContext,
  options: BulkGenerateRequest["options"] = {}
): GeneratedPrepTask[] {
  const eventDate = context.eventDate;
  const basePriority = options.basePriority ?? 5;

  return aiTasks.map((task) => {
    // Apply batch multiplier to quantities
    const multiplier = options.batchMultiplier ?? 1;
    const quantityTotal = task.quantityTotal * multiplier;
    const servingsTotal = task.servingsTotal
      ? Math.round(task.servingsTotal * multiplier)
      : null;

    // Apply priority strategy
    let priority = task.priority;
    if (options.priorityStrategy === "urgency") {
      // Higher priority for tasks due sooner
      const daysUntilDue = Math.ceil(
        (new Date(task.dueByDate).getTime() - eventDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysUntilDue <= 1) {
        priority = 3;
      } else if (daysUntilDue <= 2) {
        priority = 5;
      } else {
        priority = 7;
      }
    }
    if (options.priorityStrategy === "manual") {
      priority = basePriority;
    }

    return {
      name: task.name,
      dishId: task.dishId,
      recipeVersionId: null, // AI doesn't generate recipe versions
      taskType: task.taskType,
      quantityTotal,
      quantityUnitId: null,
      servingsTotal,
      startByDate: new Date(task.startByDate),
      dueByDate: new Date(task.dueByDate),
      dueByTime: null,
      isEventFinish: task.isEventFinish,
      priority,
      estimatedMinutes: task.estimatedMinutes,
      notes: task.notes,
      station: task.station,
    };
  });
}

/**
 * Main service function to generate bulk prep tasks
 */
export async function generateBulkPrepTasks(
  tenantId: string,
  request: BulkGenerateRequest
): Promise<{
  batchId: string;
  status: "processing" | "completed" | "partial" | "failed";
  generatedCount: number;
  totalExpected: number;
  tasks: GeneratedPrepTask[];
  errors: string[];
  warnings: string[];
  summary: string;
}> {
  const batchId = uuidv4();
  const errors: string[] = [];
  const warnings: string[] = [];
  let generatedTasks: GeneratedPrepTask[] = [];

  try {
    // Get generation context
    const context = await getGenerationContext(tenantId, request.eventId);

    if (context.dishes.length === 0) {
      return {
        batchId,
        status: "failed",
        generatedCount: 0,
        totalExpected: 0,
        tasks: [],
        errors: ["Event has no menu items assigned. Cannot generate tasks."],
        warnings: [],
        summary: "No menu items found for this event.",
      };
    }

    // Generate tasks with AI
    const aiResult = await generateTasksWithAI(context, request.options);
    warnings.push(...aiResult.warnings);

    // Convert to DB format
    generatedTasks = convertTasksToDbFormat(
      aiResult.tasks,
      tenantId,
      request.eventId,
      context,
      request.options
    );

    return {
      batchId,
      status: "completed",
      generatedCount: generatedTasks.length,
      totalExpected: generatedTasks.length,
      tasks: generatedTasks,
      errors,
      warnings,
      summary: `Generated ${generatedTasks.length} prep tasks for ${context.eventName} (${context.guestCount} guests).`,
    };
  } catch (error: unknown) {
    captureException(error);
    return {
      batchId,
      status: "failed",
      generatedCount: generatedTasks.length,
      totalExpected: 0,
      tasks: generatedTasks,
      errors: [
        error instanceof Error ? error.message : "Unknown error occurred",
      ],
      warnings,
      summary: "Failed to generate tasks. Please try again.",
    };
  }
}

/**
 * Saves generated tasks to database
 */
export async function saveGeneratedTasks(
  tenantId: string,
  eventId: string,
  tasks: GeneratedPrepTask[]
): Promise<{ created: number; errors: string[] }> {
  const errors: string[] = [];
  let created = 0;

  // Get location ID for tenant (default location)
  const locations = await database.location.findMany({
    where: { tenantId, deletedAt: null },
    take: 1,
  });

  const locationId = locations[0]?.id;

  if (!locationId) {
    return {
      created: 0,
      errors: ["No location found for tenant. Please create a location first."],
    };
  }

  try {
    // Create tasks in bulk
    for (const task of tasks) {
      try {
        await database.prepTask.create({
          data: {
            tenantId,
            eventId,
            dishId: task.dishId,
            recipeVersionId: task.recipeVersionId,
            methodId: null,
            containerId: null,
            locationId,
            taskType: task.taskType,
            name: task.name,
            quantityTotal: task.quantityTotal,
            quantityUnitId: task.quantityUnitId,
            quantityCompleted: 0,
            servingsTotal: task.servingsTotal,
            startByDate: task.startByDate,
            dueByDate: task.dueByDate,
            dueByTime: task.dueByTime,
            isEventFinish: task.isEventFinish,
            status: "pending",
            priority: task.priority,
            estimatedMinutes: task.estimatedMinutes,
            actualMinutes: null,
            notes: task.notes,
          },
        });
        created++;
      } catch (error: unknown) {
        errors.push(
          `Failed to create task "${task.name}": ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  } catch (error: unknown) {
    errors.push(
      `Database error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  return { created, errors };
}
