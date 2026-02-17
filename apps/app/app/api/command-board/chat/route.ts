import { openai } from "@ai-sdk/openai";
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { convertToModelMessages, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";

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

**Guidelines:**
- Be concise and actionable
- When suggesting board modifications, use the suggest_board_action tool
- When answering questions about data, use the query_board_context tool first
- Always explain WHY you're suggesting an action
- Use markdown formatting for readability
- Keep responses under 200 words unless the user asks for detail`;

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

const boardTools = {
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
    execute: async ({ commandId, reason }) => {
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

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return new Response("Unauthorized", { status: 401 });
    }

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
      tools: boardTools,
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
  const board = await database.commandBoard.findFirst({
    where: { id: boardId, deletedAt: null },
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
    where: { boardId, deletedAt: null },
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
  const projections = await database.boardProjection.findMany({
    where: { boardId, deletedAt: null },
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
            where: { id: { in: eventIds }, deletedAt: null },
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
