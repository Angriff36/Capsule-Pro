import { createHash, randomUUID } from "node:crypto";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
// Use the shared helper: server-side → direct API URL; client-side → "" (rewrite proxy)
import { getApiBaseUrl } from "@/app/lib/api";
import { createPendingManifestPlan } from "@/app/lib/command-board/manifest-plans";
import { suggestManifestPlanInputSchema } from "../../../(authenticated)/command-board/types/manifest-plan";
import {
  loadCommandCatalog,
  resolveCanonicalEntityCommandPair,
} from "./manifest-command-tools";

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

// ── Deterministic idempotency key helpers ──────────────────────────

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortDeep(obj[key]);
    }
    return out;
  }
  return value;
}

/**
 * Extract the semantic tool-args payload from the wrapper object.
 * Mirrors the bodyArgs derivation in executeManifestCommandRoute but
 * is used earlier — before bodyArgs is built — so the idempotency key
 * hashes only caller-intent fields, not injected meta like userId.
 */
function extractSemanticArgs(
  args: Record<string, unknown>
): Record<string, unknown> {
  if (args.args && typeof args.args === "object" && !Array.isArray(args.args)) {
    return args.args as Record<string, unknown>;
  }
  // Flat-args path: strip meta/wrapper fields, keep only semantic payload
  const META_KEYS = new Set([
    "entityName",
    "commandName",
    "instanceId",
    "idempotencyKey",
    "args",
  ]);
  return Object.fromEntries(
    Object.entries(args).filter(([name]) => !META_KEYS.has(name))
  );
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

/**
 * Build a deterministic idempotency key from stable inputs.
 * Uses SHA-256 so the key is fixed-length (64 hex chars) and collision-resistant.
 * callId is included because it is stable across retries of the same
 * logical tool call (the agent-loop reuses functionCall.call_id).
 *
 * Exported for unit testing only — not part of the public API surface.
 */
export function deterministicIdempotencyKey(
  correlationId: string,
  callId: string,
  toolKey: string,
  args: Record<string, unknown>
): string {
  const semanticArgs = extractSemanticArgs(args);
  const argsFingerprint = stableStringify(semanticArgs);
  const input = `${correlationId}|${callId}|${toolKey}|${argsFingerprint}`;
  return createHash("sha256").update(input).digest("hex");
}

function tokenize(input: string): string[] {
  return input
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0);
}

function closestSupportedSequence(
  entityName: string,
  commandName: string,
  supportedKeys: string[]
): string[] {
  if (supportedKeys.length === 0) {
    return [];
  }

  if (commandName.length > 0) {
    const matchingCommand = supportedKeys
      .filter((key) => {
        const command = key.split(".")[1] ?? "";
        return command.toLowerCase() === commandName.toLowerCase();
      })
      .sort((a, b) => {
        const aEntity = a.split(".")[0] ?? "";
        const bEntity = b.split(".")[0] ?? "";
        const aExactEntity = aEntity.toLowerCase() === entityName.toLowerCase();
        const bExactEntity = bEntity.toLowerCase() === entityName.toLowerCase();
        if (aExactEntity !== bExactEntity) {
          return aExactEntity ? -1 : 1;
        }
        return a.localeCompare(b);
      });

    if (matchingCommand.length > 0) {
      return matchingCommand.slice(0, 5);
    }
  }

  if (entityName.length > 0) {
    const matchingEntity = supportedKeys
      .filter((key) => {
        const entity = key.split(".")[0] ?? "";
        return entity.toLowerCase() === entityName.toLowerCase();
      })
      .sort((a, b) => a.localeCompare(b));

    if (matchingEntity.length > 0) {
      return matchingEntity.slice(0, 5);
    }
  }

  const requestedTokens = tokenize(`${entityName} ${commandName}`);
  return [...supportedKeys]
    .sort((a, b) => {
      const aTokens = tokenize(a);
      const bTokens = tokenize(b);
      const aOverlap = requestedTokens.filter((token) =>
        aTokens.includes(token)
      ).length;
      const bOverlap = requestedTokens.filter((token) =>
        bTokens.includes(token)
      ).length;
      if (aOverlap !== bOverlap) {
        return bOverlap - aOverlap;
      }
      return a.localeCompare(b);
    })
    .slice(0, 5);
}

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
  if (status === 401 || status === 403) {
    return "PERMISSION_DENIED";
  }
  if (status === 404) {
    return "BOARD_NOT_FOUND";
  }
  if (status >= 500) {
    return "SERVICE_UNAVAILABLE";
  }
  if (status >= 400) {
    return "INVALID_REQUEST";
  }
  return "UNKNOWN_ERROR";
}

// Map error codes to safe, actionable user messages
const SAFE_ERROR_MESSAGES: Record<SafeErrorCode, string> = {
  BOARD_NOT_FOUND:
    "The requested board could not be found. It may have been deleted or you may not have access.",
  BOARD_UNAVAILABLE: "The board is temporarily unavailable. Please try again.",
  CONFLICT_CHECK_FAILED:
    "Conflict detection could not be completed. Other operations can still proceed.",
  COMMAND_FAILED:
    "The requested action could not be completed. Please try again.",
  INVALID_REQUEST:
    "The request format was invalid. Please rephrase and try again.",
  PERMISSION_DENIED: "You do not have permission to perform this action.",
  SERVICE_UNAVAILABLE:
    "The service is temporarily unavailable. Please try again in a moment.",
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
    return {
      code: "SERVICE_UNAVAILABLE",
      message: SAFE_ERROR_MESSAGES.SERVICE_UNAVAILABLE,
    };
  }

  // If message contains UUIDs or looks like internal IDs, sanitize
  if (
    UUID_REGEX.test(rawMessage) ||
    rawMessage.includes("tenant_") ||
    rawMessage.includes("id:")
  ) {
    return { code: fallbackCode, message: SAFE_ERROR_MESSAGES[fallbackCode] };
  }

  // For known safe patterns, pass through
  const knownSafePatterns = [
    /^boardId is required$/i,
    /^board .* not found$/i,
    /^unsupported manifest command route/i,
    /^not supported by current route surface$/i,
    /^unknown tool:/i,
  ];

  if (knownSafePatterns.some((pattern) => pattern.test(rawMessage))) {
    return { code: fallbackCode, message: rawMessage };
  }

  // Validation error patterns - these are safe to pass through as they only reference
  // field names and don't expose internal IDs, queries, or sensitive data
  const validationPatterns = [
    /^missing required (field|parameter|property)[:.]?\s*\w+$/i,
    /^field\s+['"]?\w+['"]?\s+(is required|cannot be empty|must be provided)/i,
    /^invalid\s+(value|type|format)\s+(for\s+)?['"]?\w+['"]?/i,
    /^['"]?\w+['"]?\s+(is required|cannot be null|must be a valid)/i,
    /^required\s+(field|parameter|property)\s+['"]?\w+['"]?\s+is\s+missing$/i,
    /^property\s+['"]?\w+['"]?\s+is\s+required$/i,
  ];

  // Only allow validation messages if they don't contain sensitive data
  const containsSensitiveData =
    UUID_REGEX.test(rawMessage) ||
    /\btenant[_-]?id\b/i.test(rawMessage) ||
    /\buser[_-]?id\b/i.test(rawMessage) ||
    /\borganization[_-]?id\b/i.test(rawMessage) ||
    rawMessage.includes("tenant_") ||
    rawMessage.includes("auth_");

  if (
    !containsSensitiveData &&
    validationPatterns.some((pattern) => pattern.test(rawMessage))
  ) {
    return { code: fallbackCode, message: rawMessage };
  }

  // Default: use safe generic message
  return { code: fallbackCode, message: SAFE_ERROR_MESSAGES[fallbackCode] };
}

// Extract a candidate error message from a parsed response body or raw text
function extractErrorMessage(parsed: unknown, raw: string): string {
  if (parsed !== null && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.error === "string" && obj.error.length > 0) {
      return obj.error;
    }
    if (typeof obj.message === "string" && obj.message.length > 0) {
      return obj.message;
    }
  }
  return raw;
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
    const sanitized = sanitizeErrorMessage(
      "Board not found",
      "BOARD_NOT_FOUND"
    );
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

  const response = await fetch(`${getApiBaseUrl()}/api/conflicts/detect`, {
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
    const candidate = extractErrorMessage(parsedBody, responseBody);
    const sanitized = sanitizeErrorMessage(candidate, errorCode);
    return {
      ok: false,
      summary: sanitized.message,
      error: sanitized.message,
      data: { status: response.status, errorCode },
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
  const commandCatalog = loadCommandCatalog();
  const canonicalPair = resolveCanonicalEntityCommandPair(
    commandCatalog,
    entityName,
    commandName
  );
  const key = canonicalPair ?? `${entityName}.${commandName}`;
  const commandRoute = canonicalPair
    ? commandCatalog.byEntityCommand.get(canonicalPair)
    : null;

  if (!commandRoute) {
    const notSupportedMessage = "Not supported by current route surface";
    const closestSequence = closestSupportedSequence(
      entityName,
      commandName,
      commandCatalog.canonicalEntityCommandPairs
    );
    return {
      ok: false,
      summary: notSupportedMessage,
      error: notSupportedMessage,
      data: {
        requested: key,
        closestSupportedSequence: closestSequence,
        supported: commandCatalog.canonicalEntityCommandPairs,
        suggestedManifestCommand:
          entityName.length > 0 && commandName.length > 0
            ? {
                entityName,
                commandName,
                hint: `Add '${commandName}' command to '${entityName}' in manifest to enable this action.`,
              }
            : null,
      },
    };
  }

  return executeManifestCommandRoute(
    commandRoute.path,
    key,
    args,
    context,
    callId
  );
}

async function executeManifestCommandRoute(
  routePath: string,
  key: string,
  args: Record<string, unknown>,
  context: ManifestAgentContext,
  callId: string
): Promise<AgentToolResult> {
  const idempotencyKey =
    typeof args.idempotencyKey === "string" && args.idempotencyKey.length > 0
      ? args.idempotencyKey
      : deterministicIdempotencyKey(context.correlationId, callId, key, args);

  const bodyArgs =
    args.args && typeof args.args === "object" && !Array.isArray(args.args)
      ? { ...(args.args as Record<string, unknown>) }
      : Object.fromEntries(
          Object.entries(args).filter(
            ([name]) =>
              name !== "args" &&
              name !== "entityName" &&
              name !== "commandName" &&
              name !== "instanceId" &&
              name !== "idempotencyKey"
          )
        );

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

  const endpoint = `${getApiBaseUrl()}${routePath}`;

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
    const candidate = extractErrorMessage(parsedResponse, responseText);
    const sanitized = sanitizeErrorMessage(candidate, errorCode);
    captureException(new Error(`manifest command failed: ${key}`), {
      tags: { route: "command-board-chat", manifestKey: key },
      extra: {
        status: response.status,
        routePath,
        responseText,
        correlationId: context.correlationId,
      },
    });
    return {
      ok: false,
      summary: sanitized.message,
      error: sanitized.message,
      data: { status: response.status, routePath, errorCode },
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

async function suggestManifestPlanTool(
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

  // Extract the plan input from args (AI provides all fields except planId and scope.entities)
  const parseResult = suggestManifestPlanInputSchema.safeParse(args);
  if (!parseResult.success) {
    return {
      ok: false,
      summary: "Invalid plan input",
      error: `Invalid plan input: ${parseResult.error.issues.map((i: { message: string }) => i.message).join(", ")}`,
    };
  }

  const planInput = parseResult.data;

  // Query boardProjection to populate scope.entities from current board state
  const projections = await database.boardProjection.findMany({
    where: {
      tenantId: context.tenantId,
      boardId,
      deletedAt: null,
    },
    select: {
      entityType: true,
      entityId: true,
    },
  });

  // Build entities array from projections
  const entities = projections.map((p) => ({
    entityType: p.entityType as
      | "event"
      | "client"
      | "prep_task"
      | "kitchen_task"
      | "employee"
      | "inventory_item"
      | "recipe"
      | "dish"
      | "proposal"
      | "shipment"
      | "note"
      | "risk"
      | "financial_projection",
    entityId: p.entityId,
  }));

  // Generate planId
  const planId = randomUUID();

  // Construct full SuggestedManifestPlan
  const fullPlan = {
    planId,
    title: planInput.title,
    summary: planInput.summary,
    confidence: planInput.confidence,
    scope: {
      boardId,
      tenantId: context.tenantId,
      entities:
        planInput.scope.entities.length > 0
          ? planInput.scope.entities
          : entities,
    },
    prerequisites: planInput.prerequisites ?? [],
    boardPreview: planInput.boardPreview ?? [],
    domainPlan: planInput.domainPlan ?? [],
    execution: planInput.execution,
    trace: planInput.trace,
    executionStrategy: planInput.executionStrategy,
    rollbackStrategy: planInput.rollbackStrategy,
    riskAssessment: planInput.riskAssessment,
    costImpact: planInput.costImpact,
  };

  // Persist to outboxEvent BEFORE returning
  try {
    await createPendingManifestPlan({
      tenantId: context.tenantId,
      boardId,
      plan: fullPlan,
      requestedBy: context.userId,
    });
  } catch (error) {
    const rawMessage =
      error instanceof Error
        ? error.message
        : "Failed to persist manifest plan";
    captureException(error, {
      tags: { route: "command-board-chat", toolName: "suggest_manifest_plan" },
      extra: { planId, boardId, correlationId: context.correlationId },
    });
    const sanitized = sanitizeErrorMessage(rawMessage, "COMMAND_FAILED");
    return {
      ok: false,
      summary: sanitized.message,
      error: sanitized.message,
    };
  }

  return {
    ok: true,
    summary: `Manifest plan created with ${fullPlan.scope.entities.length} entities`,
    data: redactSensitiveFields({
      planId,
      title: fullPlan.title,
      entityCount: fullPlan.scope.entities.length,
    }),
  };
}

const BASE_TOOL_DEFINITIONS: ToolDefinition[] = [
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
  {
    type: "function",
    name: "suggest_manifest_plan",
    description:
      "Suggest a manifest execution plan based on AI analysis. The plan is persisted to the database for approval and tracking. Use this to propose structured, executable changes to the board.",
    parameters: {
      type: "object",
      properties: {
        boardId: { type: "string" },
        title: { type: "string" },
        summary: { type: "string" },
        confidence: { type: "number" },
        prerequisites: {
          type: "array",
          items: {
            type: "object",
            properties: {
              questionId: { type: "string" },
              prompt: { type: "string" },
              type: {
                type: "string",
                enum: ["string", "enum", "date", "number", "select"],
              },
              options: { type: "array", items: { type: "string" } },
              required: { type: "boolean" },
            },
            required: ["questionId", "prompt", "type"],
          },
        },
        boardPreview: {
          type: "array",
          items: { type: "object", additionalProperties: true },
        },
        domainPlan: {
          type: "array",
          items: {
            type: "object",
            properties: {
              stepId: { type: "string" },
              entityType: { type: "string" },
              entityId: { type: "string" },
              commandName: { type: "string" },
              args: { type: "object", additionalProperties: true },
              expectedEvents: { type: "array", items: { type: "string" } },
              failureModes: { type: "array", items: { type: "string" } },
            },
            required: ["stepId", "commandName"],
          },
        },
        execution: {
          type: "object",
          properties: {
            mode: { type: "string", enum: ["dry_run", "execute"] },
            idempotencyKey: { type: "string" },
          },
          required: ["mode", "idempotencyKey"],
        },
        trace: {
          type: "object",
          properties: {
            reasoningSummary: { type: "string" },
            citations: { type: "array", items: { type: "string" } },
          },
          required: ["reasoningSummary"],
        },
        scope: {
          type: "object",
          properties: {
            entities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  entityType: { type: "string" },
                  entityId: { type: "string" },
                },
                required: ["entityType", "entityId"],
              },
            },
          },
        },
        executionStrategy: { type: "object", additionalProperties: true },
        rollbackStrategy: { type: "object", additionalProperties: true },
        riskAssessment: { type: "object", additionalProperties: true },
        costImpact: { type: "object", additionalProperties: true },
      },
      required: ["title", "summary", "confidence", "execution", "trace"],
      additionalProperties: false,
    },
  },
];

export function createManifestToolRegistry(context: ManifestAgentContext) {
  const commandCatalog = loadCommandCatalog();
  const commandToolDefinitions = commandCatalog.toolDefinitions.map(
    (definition) => ({ ...definition })
  );
  const definitions = [...BASE_TOOL_DEFINITIONS, ...commandToolDefinitions];

  return {
    definitions,
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

        if (call.name === "suggest_manifest_plan") {
          return await suggestManifestPlanTool(parsedArgs, context);
        }

        const entityCommand = commandCatalog.toolToEntityCommand.get(call.name);
        if (entityCommand) {
          const commandRoute =
            commandCatalog.byEntityCommand.get(entityCommand);
          if (!commandRoute) {
            return {
              ok: false,
              summary: "Not supported by current route surface",
              error: "Not supported by current route surface",
            };
          }

          return await executeManifestCommandRoute(
            commandRoute.path,
            entityCommand,
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
