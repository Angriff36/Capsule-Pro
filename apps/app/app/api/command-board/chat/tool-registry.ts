import { randomUUID } from "node:crypto";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";

export interface ManifestAgentContext {
  tenantId: string;
  userId: string;
  boardId?: string;
  authCookie?: string | null;
  correlationId: string;
}

export interface AgentToolCall {
  name: string;
  argumentsJson: string;
  callId: string;
}

export interface AgentToolResult {
  ok: boolean;
  summary: string;
  data?: unknown;
  error?: string;
}

interface ToolDefinition {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:2223";

const COMMAND_ROUTE_REGISTRY = new Map<string, string>([
  ["CommandBoard:create", "/api/command-board/boards/commands/create"],
  ["CommandBoard:update", "/api/command-board/boards/commands/update"],
  ["CommandBoard:activate", "/api/command-board/boards/commands/activate"],
  ["CommandBoard:deactivate", "/api/command-board/boards/commands/deactivate"],
  ["CommandBoardCard:create", "/api/command-board/cards/commands/create"],
  ["CommandBoardCard:update", "/api/command-board/cards/commands/update"],
  ["CommandBoardCard:move", "/api/command-board/cards/commands/move"],
  ["CommandBoardCard:resize", "/api/command-board/cards/commands/resize"],
  ["CommandBoardCard:remove", "/api/command-board/cards/commands/remove"],
  ["CommandBoardGroup:create", "/api/command-board/groups/commands/create"],
  ["CommandBoardGroup:update", "/api/command-board/groups/commands/update"],
  ["CommandBoardGroup:remove", "/api/command-board/groups/commands/remove"],
  [
    "CommandBoardConnection:create",
    "/api/command-board/connections/commands/create",
  ],
  [
    "CommandBoardConnection:remove",
    "/api/command-board/connections/commands/remove",
  ],
  ["CommandBoardLayout:create", "/api/command-board/layouts/commands/create"],
  ["CommandBoardLayout:update", "/api/command-board/layouts/commands/update"],
  ["CommandBoardLayout:remove", "/api/command-board/layouts/commands/remove"],
]);

function safeJsonParse(input: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(input) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Parsed below as a tool validation failure.
  }

  return {};
}

function assertTenant(
  inputTenantId: unknown,
  contextTenantId: string
): string | null {
  if (typeof inputTenantId !== "string" || inputTenantId.length === 0) {
    return "tenantId is required";
  }

  if (inputTenantId !== contextTenantId) {
    return "tenantId does not match authenticated tenant";
  }

  return null;
}

async function readBoardStateTool(
  args: Record<string, unknown>,
  context: ManifestAgentContext
): Promise<AgentToolResult> {
  const tenantError = assertTenant(args.tenantId, context.tenantId);
  if (tenantError) {
    return { ok: false, summary: tenantError, error: tenantError };
  }

  const boardId =
    typeof args.boardId === "string" && args.boardId.length > 0
      ? args.boardId
      : context.boardId;

  if (!boardId) {
    return {
      ok: false,
      summary: "boardId is required",
      error: "boardId is required",
    };
  }

  const board = await database.commandBoard.findFirst({
    where: {
      id: boardId,
      tenantId: context.tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      tags: true,
    },
  });

  if (!board) {
    return {
      ok: false,
      summary: `Board ${boardId} not found`,
      error: `Board ${boardId} not found`,
    };
  }

  const projections = await database.boardProjection.findMany({
    where: {
      tenantId: context.tenantId,
      boardId,
      deletedAt: null,
    },
    select: {
      id: true,
      entityType: true,
      entityId: true,
      positionX: true,
      positionY: true,
      width: true,
      height: true,
      groupId: true,
      pinned: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  const byType = projections.reduce<Record<string, number>>(
    (acc, projection) => {
      acc[projection.entityType] = (acc[projection.entityType] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const snapshot = {
    tenantId: context.tenantId,
    board,
    projections,
    projectionSummary: {
      total: projections.length,
      byType,
    },
    capturedAt: new Date().toISOString(),
  };

  return {
    ok: true,
    summary: `Loaded board snapshot with ${projections.length} projections`,
    data: snapshot,
  };
}

async function detectConflictsTool(
  args: Record<string, unknown>,
  context: ManifestAgentContext
): Promise<AgentToolResult> {
  const tenantError = assertTenant(args.tenantId, context.tenantId);
  if (tenantError) {
    return { ok: false, summary: tenantError, error: tenantError };
  }

  const boardId =
    typeof args.boardId === "string" && args.boardId.length > 0
      ? args.boardId
      : context.boardId;

  if (!boardId) {
    return {
      ok: false,
      summary: "boardId is required",
      error: "boardId is required",
    };
  }

  const payload: Record<string, unknown> = { boardId };

  if (args.timeRange && typeof args.timeRange === "object") {
    payload.timeRange = args.timeRange;
  }

  if (Array.isArray(args.entityTypes)) {
    payload.entityTypes = args.entityTypes;
  }

  const response = await fetch(`${API_BASE_URL}/api/conflicts/detect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-correlation-id": context.correlationId,
      ...(context.authCookie ? { Cookie: context.authCookie } : {}),
    },
    cache: "no-store",
    body: JSON.stringify(payload),
  });

  const responseBody = await response.text();
  let parsedBody: unknown = responseBody;
  try {
    parsedBody = JSON.parse(responseBody);
  } catch {
    // Preserve raw response text.
  }

  if (!response.ok) {
    return {
      ok: false,
      summary: `detect_conflicts failed with ${response.status}`,
      error:
        typeof parsedBody === "string"
          ? parsedBody
          : JSON.stringify(parsedBody),
      data: parsedBody,
    };
  }

  const conflicts =
    typeof parsedBody === "object" && parsedBody !== null
      ? ((parsedBody as { conflicts?: unknown[] }).conflicts ?? [])
      : [];

  return {
    ok: true,
    summary: `Detected ${conflicts.length} conflicts`,
    data: parsedBody,
  };
}

async function executeManifestCommandTool(
  args: Record<string, unknown>,
  context: ManifestAgentContext,
  callId: string
): Promise<AgentToolResult> {
  const tenantError = assertTenant(args.tenantId, context.tenantId);
  if (tenantError) {
    return { ok: false, summary: tenantError, error: tenantError };
  }

  const entityName = typeof args.entityName === "string" ? args.entityName : "";
  const commandName =
    typeof args.commandName === "string" ? args.commandName : "";
  const key = `${entityName}:${commandName}`;
  const routePath = COMMAND_ROUTE_REGISTRY.get(key);

  if (!routePath) {
    return {
      ok: false,
      summary: `Unsupported manifest command route for ${key}`,
      error: `Unsupported manifest command route for ${key}`,
      data: {
        supported: Array.from(COMMAND_ROUTE_REGISTRY.keys()),
      },
    };
  }

  const idempotencyKey =
    typeof args.idempotencyKey === "string" && args.idempotencyKey.length > 0
      ? args.idempotencyKey
      : `${context.correlationId}:${callId}:${randomUUID()}`;

  const bodyArgs =
    args.args && typeof args.args === "object" && !Array.isArray(args.args)
      ? { ...(args.args as Record<string, unknown>) }
      : {};

  const instanceId =
    typeof args.instanceId === "string" && args.instanceId.length > 0
      ? args.instanceId
      : null;

  if (
    instanceId &&
    bodyArgs.id === undefined &&
    bodyArgs.instanceId === undefined
  ) {
    bodyArgs.id = instanceId;
  }

  if (bodyArgs.idempotencyKey === undefined) {
    bodyArgs.idempotencyKey = idempotencyKey;
  }

  if (typeof args.userId === "string" && args.userId.length > 0) {
    bodyArgs.userId = args.userId;
  } else if (!bodyArgs.userId) {
    bodyArgs.userId = context.userId;
  }

  const endpoint = `${API_BASE_URL}${routePath}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-correlation-id": context.correlationId,
      "x-idempotency-key": idempotencyKey,
      ...(context.authCookie ? { Cookie: context.authCookie } : {}),
    },
    cache: "no-store",
    body: JSON.stringify(bodyArgs),
  });

  const responseText = await response.text();
  let parsedResponse: unknown = responseText;
  try {
    parsedResponse = JSON.parse(responseText);
  } catch {
    // Preserve raw response.
  }

  if (!response.ok) {
    return {
      ok: false,
      summary: `${key} failed with ${response.status}`,
      error:
        typeof parsedResponse === "string"
          ? parsedResponse
          : JSON.stringify(parsedResponse),
      data: {
        routePath,
        idempotencyKey,
        response: parsedResponse,
      },
    };
  }

  return {
    ok: true,
    summary: `${key} executed successfully`,
    data: {
      routePath,
      idempotencyKey,
      response: parsedResponse,
    },
  };
}

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: "function",
    name: "read_board_state",
    description:
      "Read the current command board snapshot for context. Use this before proposing or executing changes.",
    parameters: {
      type: "object",
      properties: {
        tenantId: { type: "string" },
        boardId: { type: "string" },
      },
      required: ["tenantId", "boardId"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "detect_conflicts",
    description:
      "Run conflict detection for the board and return operational risks.",
    parameters: {
      type: "object",
      properties: {
        tenantId: { type: "string" },
        boardId: { type: "string" },
        timeRange: {
          type: "object",
          properties: {
            start: { type: "string" },
            end: { type: "string" },
          },
          required: ["start", "end"],
          additionalProperties: false,
        },
        entityTypes: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["tenantId", "boardId"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "execute_manifest_command",
    description:
      "Execute a write command through manifest-backed command routes. Never write directly to the database.",
    parameters: {
      type: "object",
      properties: {
        tenantId: { type: "string" },
        userId: { type: "string" },
        entityName: { type: "string" },
        instanceId: { type: "string" },
        commandName: { type: "string" },
        args: {
          type: "object",
          additionalProperties: true,
        },
        idempotencyKey: { type: "string" },
      },
      required: ["tenantId", "userId", "entityName", "commandName", "args"],
      additionalProperties: false,
    },
  },
];

export function createManifestToolRegistry(context: ManifestAgentContext) {
  return {
    definitions: TOOL_DEFINITIONS,
    async executeToolCall(call: AgentToolCall): Promise<AgentToolResult> {
      const parsedArgs = safeJsonParse(call.argumentsJson);

      try {
        if (call.name === "read_board_state") {
          return await readBoardStateTool(parsedArgs, context);
        }

        if (call.name === "detect_conflicts") {
          return await detectConflictsTool(parsedArgs, context);
        }

        if (call.name === "execute_manifest_command") {
          return await executeManifestCommandTool(
            parsedArgs,
            context,
            call.callId
          );
        }

        return {
          ok: false,
          summary: `Unknown tool: ${call.name}`,
          error: `Unknown tool: ${call.name}`,
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unknown tool execution error";
        captureException(error, {
          tags: {
            route: "command-board-chat",
            toolName: call.name,
          },
          extra: {
            correlationId: context.correlationId,
            toolArguments: parsedArgs,
          },
        });

        log.error("[command-board-chat] Tool execution failed", {
          toolName: call.name,
          error: message,
          correlationId: context.correlationId,
        });

        return {
          ok: false,
          summary: `Tool ${call.name} failed`,
          error: message,
        };
      }
    },
  };
}
