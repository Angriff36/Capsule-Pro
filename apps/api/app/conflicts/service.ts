import { openai } from "@ai-sdk/openai";
import { database } from "@repo/database";
import { generateText } from "ai";
import type {
  Conflict,
  ConflictDetectionRequest,
  ConflictDetectionResult,
  ConflictSeverity,
  ConflictType,
} from "./types";

const AI_MODEL = "gpt-4o-mini";
const ARRAY_REGEX = /\[[\s\S]*\]/;

export async function detectConflicts(
  request: ConflictDetectionRequest
): Promise<ConflictDetectionResult> {
  let events: unknown[] = [];
  let tasks: unknown[] = [];
  let employees: unknown[] = [];
  let inventory: unknown[] = [];

  if (
    !request.entityTypes ||
    request.entityTypes.includes("scheduling") ||
    request.entityTypes.includes("timeline")
  ) {
    events = await database.event.findMany({
      where: {
        deletedAt: null,
        ...(request.timeRange && {
          eventDate: {
            gte: request.timeRange.start,
            lte: request.timeRange.end,
          },
        }),
      },
    });
  }

  if (
    !request.entityTypes ||
    request.entityTypes.includes("resource") ||
    request.entityTypes.includes("inventory")
  ) {
    tasks = await database.kitchenTask.findMany({
      where: {
        deletedAt: null,
        ...(request.timeRange && {
          dueDate: {
            gte: request.timeRange.start,
            lte: request.timeRange.end,
          },
        }),
      },
    });
  }

  if (!request.entityTypes || request.entityTypes.includes("staff")) {
    employees = await database.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
    });
  }

  if (!request.entityTypes || request.entityTypes.includes("inventory")) {
    inventory = await database.inventoryItem.findMany({
      where: {
        deletedAt: null,
      },
    });
  }

  const systemPrompt = `You are a scheduling conflict detection specialist for a catering and event management system. Analyze the provided data and identify conflicts.

Conflict types to look for:
1. Scheduling conflicts: Events scheduled at the same time with overlapping staff
2. Resource over-allocation: Too many kitchen tasks assigned, insufficient time
3. Staff conflicts: Same employee assigned to multiple events or tasks at the same time
4. Inventory issues: Insufficient stock for upcoming events
5. Timeline issues: Tasks with impossible deadlines, overlapping preparation times

Return conflicts in a structured JSON format with:
- id: unique UUID
- type: one of "scheduling", "resource", "staff", "inventory", "timeline"
- severity: "low", "medium", "high", or "critical"
- title: brief, actionable title
- description: detailed explanation of the conflict
- affectedEntities: array of objects with type, id, and name
- suggestedAction: optional, brief suggestion for resolution

Be specific and reference actual entity IDs and names. Only report real conflicts, not potential issues.`;

  const dataForAnalysis = {
    events: events.map((e: unknown) => ({
      id: (e as { id: string }).id,
      title: (e as { title: string }).title,
      eventDate: (e as { eventDate: Date }).eventDate,
      guestCount: (e as { guestCount: number }).guestCount,
      status: (e as { status: string }).status,
    })),
    tasks: tasks.map((t: unknown) => ({
      id: (t as { id: string }).id,
      title: (t as { title: string }).title,
      status: (t as { status: string }).status,
      priority: (t as { priority: number }).priority,
      dueDate: (t as { dueDate: Date | null }).dueDate,
    })),
    employees: employees.map((e: unknown) => ({
      id: (e as { id: string }).id,
      name: `${(e as { firstName: string }).firstName} ${(e as { lastName: string }).lastName}`,
      role: (e as { role: string }).role,
    })),
    inventory: inventory.map((i: unknown) => ({
      id: (i as { id: string }).id,
      name: (i as { name: string }).name,
      quantityOnHand: (i as { quantityOnHand: number }).quantityOnHand,
      category: (i as { category: string }).category,
    })),
  };

  const result = await generateText({
    model: openai(AI_MODEL),
    system: systemPrompt,
    prompt: JSON.stringify(dataForAnalysis, null, 2),
    temperature: 0.3,
  });

  let conflicts: Conflict[] = [];

  try {
    const jsonMatch = result.text.match(ARRAY_REGEX);
    if (jsonMatch) {
      const parsedConflicts = JSON.parse(jsonMatch[0]) as Conflict[];
      conflicts = parsedConflicts.map((conflict) => ({
        ...conflict,
        id: conflict.id || crypto.randomUUID(),
        createdAt: new Date(),
      }));
    }
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    conflicts = [];
  }

  const summary = {
    total: conflicts.length,
    bySeverity: conflicts.reduce(
      (acc: Record<ConflictSeverity, number>, conflict) => {
        acc[conflict.severity] = (acc[conflict.severity] || 0) + 1;
        return acc;
      },
      { low: 0, medium: 0, high: 0, critical: 0 }
    ),
    byType: conflicts.reduce(
      (acc: Record<ConflictType, number>, conflict) => {
        acc[conflict.type] = (acc[conflict.type] || 0) + 1;
        return acc;
      },
      { scheduling: 0, resource: 0, staff: 0, inventory: 0, timeline: 0 }
    ),
  };

  return {
    conflicts,
    summary,
    analyzedAt: new Date(),
  };
}
