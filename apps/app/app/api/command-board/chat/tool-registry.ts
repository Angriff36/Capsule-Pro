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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

// Error codes for safe user-facing messages
type SafeErrorCode =
  | "BOARD_NOT_FOUND"
  | "BOARD_UNAVAILABLE"
  | "CONFLICT_CHECK_FAILED"
  | "COMMAND_FAILED"
  | "INVALID_REQUEST"
  | "PERMISSION_DENIED"
  | "SERVICE_UNAVAILABLE"
  | "UNKNOWN_ERROR";

// Map HTTP status codes to safe error codes
function httpStatusToErrorCode(status: number): SafeErrorCode {
  if (status === 401 || status === 403) return "PERMISSION_DENIED";
  if (status === 404) return "BOARD_NOT_FOUND";
  if (status >= 500) return "SERVICE_UNAVAILABLE";
  if (status >= 400) return "INVALID_REQUEST";
  return "UNKNOWN_ERROR";
}

// Map error codes to safe, actionable user messages
const SAFE_ERROR_MESSAGES: Record<SafeErrorCode, string> = {
  BOARD_NOT_FOUND: "The requested board could not be found. It may have been deleted or you may not have access.",
  BOARD_UNAVAILABLE: "The board is temporarily unavailable. Please try again.",
  CONFLICT_CHECK_FAILED: "Conflict detection could not be completed. Other operations can still proceed.",
  COMMAND_FAILED: "The requested action could not be completed. Please try again.",
  INVALID_REQUEST: "The request format was invalid. Please rephrase and try again.",
  PERMISSION_DENIED: "You do not have permission to perform this action.",
  SERVICE_UNAVAILABLE: "The service is temporarily unavailable. Please try again in a moment.",
  UNKNOWN_ERROR: "An unexpected error occurred. Please try again.",
};

// Sanitize error messages - never expose raw internal errors, UUIDs, or stack traces
function sanitizeErrorMessage(
  rawMessage: string,
  fallbackCode: SafeErrorCode = "UNKNOWN_ERROR"
): { code: SafeErrorCode; message: string } {
  // If message contains database/Prisma keywords, use generic message
  const dbKeywords = [
    "PrismaClient",
    "database",
    "connection",
    "timeout",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "deadlock",
    "constraint",
    "violates",
    "SQL",
    "query",
    "table",
    "column",
  ];

  const lowerMessage = rawMessage.toLowerCase();
  if (dbKeywords.some((kw) => lowerMessage.includes(kw.toLowerCase()))) {
    return { code: "SERVICE_UNAVAILABLE", message: SAFE_ERROR_MESSAGES.SERVICE_UNAVAILABLE };
  }

  // If message contains UUIDs or looks like internal IDs, sanitize
  if (UUID_REGEX.test(rawMessage) || rawMessage.includes("tenant_") || rawMessage.includes("id:")) {
    return { code: fallbackCode, message: SAFE_ERROR_MESSAGES[fallbackCode] };
  }

  // For known safe patterns, pass through
  const knownSafePatterns = [
    /^boardId is required$/i,
    /^board .* not found$/i,
    /^unsupported manifest command route/i,
    /^unknown tool:/i,
  ];

  if (knownSafePatterns.some((pattern) => pattern.test(rawMessage))) {
    return { code: fallbackCode, message: rawMessage };
  }

  // Default: use safe generic message
  return { code: fallbackCode, message: SAFE_ERROR_MESSAGES[fallbackCode] };
}

// Redact sensitive fields from data objects
function redactSensitiveFields<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveFields(item)) as T;
  }

  const SENSITIVE_KEYS = new Set([
    "tenantId",
    "userId",
    "authCookie",
    "password",
    "token",
    "secret",
    "apiKey",
    "accessToken",
    "refreshToken",
  ]);

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      // Redact sensitive fields
      result[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      result[key] = redactSensitiveFields(value);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

function resolveBoardId(
  args: Record<string, unknown>,
  context: ManifestAgentContext
): string | null {
  const argBoardId =
    typeof args.boardId === "string" && args.boardId.length > 0
      ? args.boardId
      : null;
  if (argBoardId && isUuid(argBoardId)) {
    return argBoardId;
  }

  const contextBoardId =
    typeof context.boardId === "string" && context.boardId.length > 0
      ? context.boardId
      : null;
  if (contextBoardId && isUuid(contextBoardId)) {
    return contextBoardId;
  }

  return null;
}

async function readBoardStateTool(
  args: Record<string, unknown>,
  context: ManifestAgentContext
): Promise<AgentToolResult> {
  const boardId = resolveBoardId(args, context);

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
    const sanitized = sanitizeErrorMessage("Board not found", "BOARD_NOT_FOUND");
    return {
      ok: false,
      summary: sanitized.message,
      error: sanitized.message,
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
    data: redactSensitiveFields(snapshot),
  };
}

async function detectConflictsTool(
  args: Record<string, unknown>,
  context: ManifestAgentContext
): Promise<AgentToolResult> {
  const boardId = resolveBoardId(args, context);

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
    const errorCode = httpStatusToErrorCode(response.status);
    const safeMessage = SAFE_ERROR_MESSAGES.CONFLICT_CHECK_FAILED;
    return {
      ok: false,
      summary: safeMessage,
      error: safeMessage,
    };
  }

  const conflicts =
    typeof parsedBody === "object" && parsedBody !== null
      ? ((parsedBody as { conflicts?: unknown[] }).conflicts ?? [])
      : [];

  return {
    ok: true,
    summary: `Detected ${conflicts.length} conflicts`,
    data: redactSensitiveFields(parsedBody),
  };
}

async function executeManifestCommandTool(
  args: Record<string, unknown>,
  context: ManifestAgentContext,
  callId: string
): Promise<AgentToolResult> {
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
    const errorCode = httpStatusToErrorCode(response.status);
    const safeMessage = SAFE_ERROR_MESSAGES.COMMAND_FAILED;
    return {
      ok: false,
      summary: safeMessage,
      error: safeMessage,
    };
  }

  return {
    ok: true,
    summary: `${key} executed successfully`,
    data: redactSensitiveFields({
      routePath,
      response: parsedResponse,
    }),
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
        boardId: { type: "string" },
      },
      required: [],
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
      required: [],
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
      required: ["entityName", "commandName", "args"],
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
        const rawMessage =
          error instanceof Error
            ? error.message
            : "Unknown tool execution error";

        // Capture full error for observability
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
          error: rawMessage,
          correlationId: context.correlationId,
        });

        // Sanitize error for user-facing response
        const sanitized = sanitizeErrorMessage(rawMessage, "UNKNOWN_ERROR");
        return {
          ok: false,
          summary: sanitized.message,
          error: sanitized.message,
        };
      }
    },
  };
}
