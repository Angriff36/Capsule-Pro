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
  let locations: unknown[] = [];

  if (
    !request.entityTypes ||
    request.entityTypes.includes("scheduling") ||
    request.entityTypes.includes("timeline") ||
    request.entityTypes.includes("venue")
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
      include: {
        venue: true,
        location: true,
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

  if (!request.entityTypes || request.entityTypes.includes("venue")) {
    locations = await database.location.findMany({
      where: {
        deletedAt: null,
        isActive: true,
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
6. Venue conflicts: Multiple events at the same venue on the same date

For each conflict, provide:
- id: unique UUID
- type: one of "scheduling", "resource", "staff", "inventory", "timeline", "venue"
- severity: "low", "medium", "high", or "critical"
- title: brief, actionable title
- description: detailed explanation of the conflict
- affectedEntities: array of objects with type, id, and name
- suggestedAction: brief suggestion for resolution
- resolutionOptions: array of specific resolution options with:
  - type: "reassign", "reschedule", "substitute", "cancel", or "split"
  - description: specific action to resolve
  - affectedEntities: entities affected by this resolution
  - estimatedImpact: "low", "medium", or "high"

Be specific and reference actual entity IDs and names. For resolution options, suggest specific alternatives:
- For staff conflicts: suggest alternative employees with similar roles/skills
- For inventory conflicts: suggest substitute items or alternative sources
- For venue conflicts: suggest alternative venues or date changes
- For scheduling conflicts: suggest rescheduling options

Only report real conflicts, not potential issues. Provide actionable resolution options.`;

  const dataForAnalysis = {
    events: events.map((e: unknown) => ({
      id: (e as { id: string }).id,
      title: (e as { title: string }).title,
      eventDate: (e as { eventDate: Date }).eventDate,
      guestCount: (e as { guestCount: number }).guestCount,
      status: (e as { status: string }).status,
      venueId: (e as { venueId: string | null }).venueId,
      venueName:
        (e as { venue: { name: string | null } | null }).venue?.name ?? null,
      locationId: (e as { locationId: string | null }).locationId,
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
    locations: locations.map((l: unknown) => ({
      id: (l as { id: string }).id,
      name: (l as { name: string }).name,
      city: (l as { city: string | null }).city,
      isActive: (l as { isActive: boolean }).isActive,
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
      const parsedConflicts = JSON.parse(jsonMatch[0]) as unknown[];
      conflicts = parsedConflicts.map((conflict: unknown) => {
        const c = conflict as Record<string, unknown>;
        return {
          id: (c.id as string | undefined) || crypto.randomUUID(),
          type: (c.type as ConflictType) ?? "scheduling",
          severity: (c.severity as ConflictSeverity) ?? "medium",
          title: (c.title as string) ?? "Conflict detected",
          description: (c.description as string) ?? "",
          affectedEntities: ((c.affectedEntities as unknown[]) ?? []).map(
            (entity: unknown) => {
              const e = entity as Record<string, unknown>;
              return {
                type:
                  (e.type as
                    | "event"
                    | "task"
                    | "employee"
                    | "inventory"
                    | "venue") ?? "event",
                id: (e.id as string) ?? "",
                name: (e.name as string) ?? "Unknown",
              };
            }
          ),
          suggestedAction: c.suggestedAction as string | undefined,
          resolutionOptions: ((c.resolutionOptions as unknown[]) ?? []).map(
            (option: unknown) => {
              const o = option as Record<string, unknown>;
              return {
                type:
                  (o.type as
                    | "reassign"
                    | "reschedule"
                    | "substitute"
                    | "cancel"
                    | "split") ?? "reschedule",
                description: (o.description as string) ?? "",
                affectedEntities: ((o.affectedEntities as unknown[]) ?? []).map(
                  (entity: unknown) => {
                    const e = entity as Record<string, unknown>;
                    return {
                      type:
                        (e.type as
                          | "event"
                          | "task"
                          | "employee"
                          | "inventory"
                          | "venue") ?? "event",
                      id: (e.id as string) ?? "",
                      name: (e.name as string) ?? "Unknown",
                    };
                  }
                ),
                estimatedImpact:
                  (o.estimatedImpact as "low" | "medium" | "high") ?? "medium",
              };
            }
          ),
          createdAt: new Date(),
        } satisfies Conflict;
      });
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
      {
        scheduling: 0,
        resource: 0,
        staff: 0,
        inventory: 0,
        timeline: 0,
        venue: 0,
      }
    ),
  };

  return {
    conflicts,
    summary,
    analyzedAt: new Date(),
  };
}
