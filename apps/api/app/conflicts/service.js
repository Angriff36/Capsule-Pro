Object.defineProperty(exports, "__esModule", { value: true });
exports.detectConflicts = detectConflicts;
const openai_1 = require("@ai-sdk/openai");
const database_1 = require("@repo/database");
const ai_1 = require("ai");
const AI_MODEL = "gpt-4o-mini";
const ARRAY_REGEX = /\[[\s\S]*\]/;
async function detectConflicts(request) {
  let events = [];
  let tasks = [];
  let employees = [];
  let inventory = [];
  if (
    !request.entityTypes ||
    request.entityTypes.includes("scheduling") ||
    request.entityTypes.includes("timeline")
  ) {
    events = await database_1.database.event.findMany({
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
    tasks = await database_1.database.kitchenTask.findMany({
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
    employees = await database_1.database.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
    });
  }
  if (!request.entityTypes || request.entityTypes.includes("inventory")) {
    inventory = await database_1.database.inventoryItem.findMany({
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
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      eventDate: e.eventDate,
      guestCount: e.guestCount,
      status: e.status,
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
    })),
    employees: employees.map((e) => ({
      id: e.id,
      name: `${e.firstName} ${e.lastName}`,
      role: e.role,
    })),
    inventory: inventory.map((i) => ({
      id: i.id,
      name: i.name,
      quantityOnHand: i.quantityOnHand,
      category: i.category,
    })),
  };
  const result = await (0, ai_1.generateText)({
    model: (0, openai_1.openai)(AI_MODEL),
    system: systemPrompt,
    prompt: JSON.stringify(dataForAnalysis, null, 2),
    temperature: 0.3,
  });
  let conflicts = [];
  try {
    const jsonMatch = result.text.match(ARRAY_REGEX);
    if (jsonMatch) {
      const parsedConflicts = JSON.parse(jsonMatch[0]);
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
      (acc, conflict) => {
        acc[conflict.severity] = (acc[conflict.severity] || 0) + 1;
        return acc;
      },
      { low: 0, medium: 0, high: 0, critical: 0 }
    ),
    byType: conflicts.reduce(
      (acc, conflict) => {
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
