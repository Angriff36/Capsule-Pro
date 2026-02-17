import { openai } from "@ai-sdk/openai";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { convertToModelMessages, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import {
  type BoardMutation,
  type DomainCommandStep,
  type ManifestEntityRef,
  type ManifestPlanQuestion,
  suggestedManifestPlanSchema,
} from "../../../(authenticated)/command-board/types/manifest-plan";
import { createPendingManifestPlan } from "../../../lib/command-board/manifest-plans";
import { requireTenantId } from "../../../lib/tenant";

// ---------------------------------------------------------------------------
// AI Model Configuration
// ---------------------------------------------------------------------------

const AI_MODEL = "gpt-4o-mini";
const TEMPERATURE = 0.7;

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are the Command Board assistant for a catering operations platform called Convoy.

Your role is to help users manage their command board — a visual, spatial interface where events, clients, tasks, employees, and inventory items are projected as cards with derived relationship connections.

**What you can do:**
1. Answer questions about the board state (events, tasks, clients, etc.)
2. Suggest board actions (add entities, show overdue items, clear board)
3. Provide operational insights (scheduling conflicts, capacity issues)
4. Help with event planning and task management

**Board commands you can suggest:**
- show_this_week: Populate board with this week's events and tasks
- show_overdue: Add overdue tasks and past-due events
- show_all_events: Add all active events
- show_all_tasks: Add all pending tasks
- auto_populate: Auto-populate based on board scope settings
- clear_board: Remove all projections from the board

**Domain plan command names currently supported in approvals:**
- create_event
- link_menu
- add_dish_to_event
- link_menu_item

**When users ask for multi-step operational changes**, use the suggest_manifest_plan tool.
The plan must be previewable and approval-gated before execution.
For suggest_manifest_plan, provide a compact draft (title, summary, optional scope/prereqs/boardPreview/domainPlan/trace).

**Guidelines:**
- Be concise and actionable
- When suggesting board modifications, use the suggest_board_action tool
- When suggesting domain-intent execution, use suggest_manifest_plan
- When answering questions about data, use the query_board_context tool first
- Always explain WHY you're suggesting an action
- Use markdown formatting for readability
- Keep responses under 200 words unless the user asks for detail`;

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

function createBoardTools(params: {
  boardId?: string;
  tenantId: string;
  userId: string | null;
}) {
  const { boardId, tenantId, userId } = params;
  const entityTypeEnum = z.enum([
    "event",
    "client",
    "prep_task",
    "kitchen_task",
    "employee",
    "inventory_item",
    "recipe",
    "dish",
    "proposal",
    "shipment",
    "note",
  ]);

  const planDraftSchema = z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    confidence: z.number().min(0).max(1).optional(),
    scope: z
      .object({
        entities: z
          .array(
            z.object({
              entityType: entityTypeEnum,
              entityId: z.string().min(1),
            })
          )
          .optional(),
      })
      .optional(),
    prerequisites: z
      .array(
        z.object({
          questionId: z.string().min(1),
          prompt: z.string().min(1),
          type: z.enum(["string", "enum", "date", "number", "select"]),
          options: z.array(z.string().min(1)).optional(),
          required: z.boolean().optional(),
        })
      )
      .optional(),
    boardPreview: z.array(z.record(z.string(), z.unknown())).optional(),
    domainPlan: z
      .array(
        z.object({
          stepId: z.string().min(1),
          entityType: entityTypeEnum.optional(),
          entityId: z.string().optional(),
          commandName: z.string().min(1),
          args: z.record(z.string(), z.unknown()).optional(),
          expectedEvents: z.array(z.string().min(1)).optional(),
          failureModes: z.array(z.string().min(1)).optional(),
        })
      )
      .optional(),
    trace: z
      .object({
        reasoningSummary: z.string().min(1),
        citations: z.array(z.string().min(1)).optional(),
      })
      .optional(),
  });

  return {
    suggest_board_action: tool({
      description:
        "Suggest a board action for the user to approve. Use this when you want to modify the board.",
      inputSchema: z.object({
        commandId: z
          .enum([
            "show_this_week",
            "show_overdue",
            "show_all_events",
            "show_all_tasks",
            "auto_populate",
            "clear_board",
          ])
          .describe("The board command to suggest"),
        reason: z
          .string()
          .describe("Brief explanation of why this action is helpful"),
      }),
      execute: ({ commandId, reason }) => {
        // The tool result is returned to the AI for it to format a response
        // The actual execution happens client-side after user approval
        return {
          suggested: true,
          commandId,
          reason,
          message: `Suggested action: ${commandId}. ${reason}`,
        };
      },
    }),
    suggest_manifest_plan: tool({
      description:
        "Suggest a full previewable/executable manifest plan for board + domain operations. Use for multi-step intent and orchestration requests.",
      inputSchema: planDraftSchema,
      execute: async (input) => {
        if (!boardId) {
          return {
            suggested: false,
            error: "boardId is required to build manifest plans",
          };
        }

        const parsedInput = planDraftSchema.parse(input);
        const entities = (parsedInput.scope?.entities ??
          []) as ManifestEntityRef[];
        const prerequisites = (parsedInput.prerequisites ?? []).map((q) => ({
          ...q,
          required: q.required ?? true,
        })) as ManifestPlanQuestion[];
        const boardPreview = (parsedInput.boardPreview ??
          []) as BoardMutation[];
        const domainPlan = (parsedInput.domainPlan ?? []).map((step) => ({
          ...step,
          args: step.args ?? {},
        })) as DomainCommandStep[];

        const plan = suggestedManifestPlanSchema.parse({
          planId: crypto.randomUUID(),
          title: parsedInput.title,
          summary: parsedInput.summary,
          confidence: parsedInput.confidence ?? 0.7,
          scope: {
            boardId,
            tenantId,
            entities,
          },
          prerequisites,
          boardPreview,
          domainPlan,
          execution: {
            mode: "execute",
            idempotencyKey: crypto.randomUUID(),
          },
          trace: parsedInput.trace ?? {
            reasoningSummary:
              "AI-generated plan based on current board context.",
            citations: [],
          },
        });

        await createPendingManifestPlan({
          tenantId,
          boardId,
          requestedBy: userId,
          plan,
        });

        return {
          suggested: true,
          plan,
          message: `Suggested plan: ${plan.title}`,
        };
      },
    }),
    query_board_context: tool({
      description:
        "Query the current board state to answer user questions about entities on the board.",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "What to look up: 'events', 'tasks', 'overdue', 'this_week', 'summary'"
          ),
        boardId: z.string().describe("The board ID to query"),
      }),
      execute: async ({ query, boardId }) => {
        try {
          return await queryBoardData(boardId, query);
        } catch (error) {
          console.error("[AI Chat] Board query failed:", error);
          return { error: "Failed to query board data" };
        }
      },
    }),
  };
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId) {
      return new Response("Unauthorized", { status: 401 });
    }
    const tenantId = await requireTenantId();

    const body = await request.json();
    const { messages, boardId } = body as {
      messages: UIMessage[];
      boardId?: string;
    };

    if (!(messages && Array.isArray(messages))) {
      return new Response("Invalid request: messages required", {
        status: 400,
      });
    }

    // Fetch board context for the AI
    let boardContext = "";
    if (boardId) {
      try {
        boardContext = await getBoardContext(boardId);
      } catch (error) {
        console.error("[AI Chat] Failed to fetch board context:", error);
        boardContext = "Board context unavailable.";
      }
    }

    const systemWithContext = boardContext
      ? `${SYSTEM_PROMPT}\n\n**Current Board State:**\n${boardContext}`
      : SYSTEM_PROMPT;

    const result = streamText({
      model: openai(AI_MODEL),
      system: systemWithContext,
      messages: await convertToModelMessages(messages),
      temperature: TEMPERATURE,
      tools: createBoardTools({
        boardId,
        tenantId,
        userId: userId ?? null,
      }),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[AI Chat] Route error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ---------------------------------------------------------------------------
// Board Context Helpers
// ---------------------------------------------------------------------------

async function getBoardContext(boardId: string): Promise<string> {
  const tenantId = await requireTenantId();
  const board = await database.commandBoard.findFirst({
    where: { tenantId, id: boardId, deletedAt: null },
    select: {
      name: true,
      description: true,
      status: true,
      tags: true,
    },
  });

  if (!board) {
    return "Board not found.";
  }

  const projections = await database.boardProjection.findMany({
    where: { tenantId, boardId, deletedAt: null },
    select: {
      entityType: true,
      entityId: true,
    },
  });

  // Count entities by type
  const typeCounts: Record<string, number> = {};
  for (const p of projections) {
    typeCounts[p.entityType] = (typeCounts[p.entityType] || 0) + 1;
  }

  const typesSummary = Object.entries(typeCounts)
    .map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`)
    .join(", ");

  return [
    `Board: "${board.name}" (${board.status})`,
    board.description ? `Description: ${board.description}` : null,
    board.tags.length > 0 ? `Tags: ${board.tags.join(", ")}` : null,
    `Projections: ${projections.length} total (${typesSummary || "none"})`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function queryBoardData(
  boardId: string,
  query: string
): Promise<Record<string, unknown>> {
  const tenantId = await requireTenantId();
  const projections = await database.boardProjection.findMany({
    where: { tenantId, boardId, deletedAt: null },
    select: {
      entityType: true,
      entityId: true,
    },
  });

  const eventIds = projections
    .filter((p) => p.entityType === "event")
    .map((p) => p.entityId);
  const taskIds = projections
    .filter((p) => p.entityType === "prep_task")
    .map((p) => p.entityId);

  if (query === "summary" || query === "events") {
    const events =
      eventIds.length > 0
        ? await database.event.findMany({
            where: { tenantId, id: { in: eventIds }, deletedAt: null },
            select: {
              title: true,
              eventDate: true,
              guestCount: true,
              status: true,
              venueName: true,
            },
            orderBy: { eventDate: "asc" },
            take: 10,
          })
        : [];

    return {
      type: "events",
      count: events.length,
      events: events.map((e) => ({
        title: e.title,
        date: e.eventDate,
        guests: e.guestCount,
        status: e.status,
        venue: e.venueName,
      })),
    };
  }

  if (query === "tasks" || query === "overdue") {
    const now = new Date();
    const tasks =
      taskIds.length > 0
        ? await database.prepTask.findMany({
            where: {
              tenantId,
              id: { in: taskIds },
              deletedAt: null,
              ...(query === "overdue"
                ? { dueByDate: { lt: now }, status: { not: "completed" } }
                : {}),
            },
            select: {
              name: true,
              status: true,
              priority: true,
              dueByDate: true,
            },
            orderBy: { dueByDate: "asc" },
            take: 15,
          })
        : [];

    return {
      type: query === "overdue" ? "overdue_tasks" : "tasks",
      count: tasks.length,
      tasks: tasks.map((t) => ({
        name: t.name,
        status: t.status,
        priority: t.priority,
        dueBy: t.dueByDate,
      })),
    };
  }

  if (query === "this_week") {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const events = await database.event.findMany({
      where: {
        tenantId,
        deletedAt: null,
        eventDate: { gte: now, lte: weekEnd },
      },
      select: {
        title: true,
        eventDate: true,
        guestCount: true,
        status: true,
      },
      orderBy: { eventDate: "asc" },
      take: 10,
    });

    return {
      type: "this_week",
      count: events.length,
      events: events.map((e) => ({
        title: e.title,
        date: e.eventDate,
        guests: e.guestCount,
        status: e.status,
      })),
    };
  }

  // Default: return projection counts
  const typeCounts: Record<string, number> = {};
  for (const p of projections) {
    typeCounts[p.entityType] = (typeCounts[p.entityType] || 0) + 1;
  }

  return {
    type: "summary",
    totalProjections: projections.length,
    byType: typeCounts,
  };
}
