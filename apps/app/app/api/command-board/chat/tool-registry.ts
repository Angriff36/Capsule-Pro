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

// ── Event Setup Tools (Phase 1) ────────────────────────────────────

async function createEventDraftTool(
  args: Record<string, unknown>,
  context: ManifestAgentContext,
  callId: string
): Promise<AgentToolResult> {
  // Validate required fields
  const title = typeof args.title === "string" ? args.title : "";
  const eventType = typeof args.eventType === "string" ? args.eventType : "general";
  const guestCount = typeof args.guestCount === "number" ? args.guestCount : 0;

  if (!title) {
    return {
      ok: false,
      summary: "Event title is required",
      error: "Event title is required",
    };
  }

  if (guestCount <= 0) {
    return {
      ok: false,
      summary: "Guest count must be greater than 0",
      error: "Guest count must be greater than 0",
    };
  }

  // Build the event payload
  const eventPayload: Record<string, unknown> = {
    title,
    eventType,
    guestCount,
    status: "draft",
  };

  if (typeof args.eventDate === "number" && args.eventDate > 0) {
    eventPayload.eventDate = args.eventDate;
  }

  if (typeof args.clientId === "string" && args.clientId.length > 0) {
    eventPayload.clientId = args.clientId;
  }

  if (typeof args.notes === "string") {
    eventPayload.notes = args.notes;
  }

  if (Array.isArray(args.tags)) {
    eventPayload.tags = args.tags;
  }

  // Execute via manifest command
  const result = await executeManifestCommandRoute(
    "/api/events/event/commands/create",
    "Event.create",
    { entityName: "Event", commandName: "create", args: eventPayload },
    context,
    callId
  );

  if (!result.ok) {
    return result;
  }

  const responseData = result.data as { response?: { id?: string; eventNumber?: string } };
  const eventId = responseData?.response?.id;
  const eventNumber = responseData?.response?.eventNumber;

  return {
    ok: true,
    summary: `Created event draft "${title}" (${eventNumber ?? "pending number"})`,
    data: {
      eventId,
      eventNumber,
      title,
      eventType,
      guestCount,
      status: "draft",
    },
  };
}

async function setEventMenuTool(
  args: Record<string, unknown>,
  context: ManifestAgentContext,
  callId: string
): Promise<AgentToolResult> {
  const eventId = typeof args.eventId === "string" ? args.eventId : "";
  const dishes = Array.isArray(args.dishes) ? args.dishes : [];

  if (!eventId) {
    return {
      ok: false,
      summary: "Event ID is required",
      error: "Event ID is required",
    };
  }

  if (dishes.length === 0) {
    return {
      ok: false,
      summary: "At least one dish is required",
      error: "At least one dish is required",
    };
  }

  // First, create a menu for the event
  const menuResult = await executeManifestCommandRoute(
    "/api/menus/commands/create",
    "Menu.create",
    {
      entityName: "Menu",
      commandName: "create",
      args: {
        name: args.menuName ?? `Event Menu`,
        eventId,
        status: "draft",
      },
    },
    context,
    callId
  );

  if (!menuResult.ok) {
    return {
      ok: false,
      summary: `Failed to create menu: ${menuResult.error}`,
      error: menuResult.error,
    };
  }

  const menuData = menuResult.data as { response?: { id?: string } };
  const menuId = menuData?.response?.id;

  if (!menuId) {
    return {
      ok: false,
      summary: "Failed to get menu ID from creation",
      error: "Failed to get menu ID from creation",
    };
  }

  // Create event dishes
  const createdDishes: Array<{ name: string; category?: string; dietary?: string[] }> = [];
  const errors: string[] = [];

  for (const dish of dishes) {
    if (typeof dish === "object" && dish !== null) {
      const dishObj = dish as Record<string, unknown>;
      const dishName = typeof dishObj.name === "string" ? dishObj.name : "";

      if (!dishName) {
        errors.push("Dish name is required");
        continue;
      }

      const dishResult = await executeManifestCommandRoute(
        "/api/events/dish/commands/create",
        "EventDish.create",
        {
          entityName: "EventDish",
          commandName: "create",
          args: {
            eventId,
            menuId,
            dishName,
            category: typeof dishObj.category === "string" ? dishObj.category : undefined,
            dietary: Array.isArray(dishObj.dietary) ? dishObj.dietary : undefined,
          },
        },
        context,
        callId
      );

      if (dishResult.ok) {
        createdDishes.push({
          name: dishName,
          category: typeof dishObj.category === "string" ? dishObj.category : undefined,
          dietary: Array.isArray(dishObj.dietary) ? dishObj.dietary : undefined,
        });
      } else {
        errors.push(`Failed to add dish "${dishName}": ${dishResult.error}`);
      }
    }
  }

  if (createdDishes.length === 0) {
    return {
      ok: false,
      summary: "No dishes were successfully added to the menu",
      error: errors.length > 0 ? errors.join("; ") : "No valid dishes provided",
    };
  }

  return {
    ok: true,
    summary: `Added ${createdDishes.length} dishes to event menu`,
    data: {
      eventId,
      menuId,
      dishCount: createdDishes.length,
      dishes: createdDishes,
      errors: errors.length > 0 ? errors : undefined,
    },
  };
}

async function assignEventStaffTool(
  args: Record<string, unknown>,
  context: ManifestAgentContext,
  callId: string
): Promise<AgentToolResult> {
  const eventId = typeof args.eventId === "string" ? args.eventId : "";
  const staffAssignments = Array.isArray(args.staffAssignments) ? args.staffAssignments : [];

  if (!eventId) {
    return {
      ok: false,
      summary: "Event ID is required",
      error: "Event ID is required",
    };
  }

  if (staffAssignments.length === 0) {
    return {
      ok: false,
      summary: "At least one staff assignment is required",
      error: "At least one staff assignment is required",
    };
  }

  const createdAssignments: Array<{ role: string; count: number; employeeId?: string }> = [];
  const errors: string[] = [];

  for (const assignment of staffAssignments) {
    if (typeof assignment === "object" && assignment !== null) {
      const assignObj = assignment as Record<string, unknown>;
      const role = typeof assignObj.role === "string" ? assignObj.role : "";
      const count = typeof assignObj.count === "number" ? assignObj.count : 1;
      const employeeId = typeof assignObj.employeeId === "string" ? assignObj.employeeId : undefined;

      if (!role) {
        errors.push("Staff role is required");
        continue;
      }

      const assignResult = await executeManifestCommandRoute(
        "/api/events/staff/commands/assign",
        "EventStaff.assign",
        {
          entityName: "EventStaff",
          commandName: "assign",
          args: {
            eventId,
            role,
            count,
            employeeId,
            status: "pending",
          },
        },
        context,
        callId
      );

      if (assignResult.ok) {
        createdAssignments.push({ role, count, employeeId });
      } else {
        errors.push(`Failed to assign ${count} ${role}(s): ${assignResult.error}`);
      }
    }
  }

  if (createdAssignments.length === 0) {
    return {
      ok: false,
      summary: "No staff assignments were successfully created",
      error: errors.length > 0 ? errors.join("; ") : "No valid assignments provided",
    };
  }

  const totalStaff = createdAssignments.reduce((sum, a) => sum + a.count, 0);

  return {
    ok: true,
    summary: `Assigned ${totalStaff} staff members across ${createdAssignments.length} roles`,
    data: {
      eventId,
      assignmentCount: createdAssignments.length,
      totalStaff,
      assignments: createdAssignments,
      errors: errors.length > 0 ? errors : undefined,
    },
  };
}

async function setEventVenueTool(
  args: Record<string, unknown>,
  context: ManifestAgentContext,
  callId: string
): Promise<AgentToolResult> {
  const eventId = typeof args.eventId === "string" ? args.eventId : "";
  const venueName = typeof args.venueName === "string" ? args.venueName : "";
  const venueAddress = typeof args.venueAddress === "string" ? args.venueAddress : "";

  if (!eventId) {
    return {
      ok: false,
      summary: "Event ID is required",
      error: "Event ID is required",
    };
  }

  if (!venueName && !venueAddress) {
    return {
      ok: false,
      summary: "At least venue name or address is required",
      error: "At least venue name or address is required",
    };
  }

  const updatePayload: Record<string, unknown> = { id: eventId };

  if (venueName) {
    updatePayload.venueName = venueName;
  }

  if (venueAddress) {
    updatePayload.venueAddress = venueAddress;
  }

  const result = await executeManifestCommandRoute(
    "/api/events/event/commands/update",
    "Event.update",
    { entityName: "Event", commandName: "update", args: updatePayload },
    context,
    callId
  );

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    summary: `Set venue "${venueName}" for event`,
    data: {
      eventId,
      venueName,
      venueAddress,
    },
  };
}

async function generatePrepListTool(
  args: Record<string, unknown>,
  context: ManifestAgentContext
): Promise<AgentToolResult> {
  const eventId = typeof args.eventId === "string" ? args.eventId : "";

  if (!eventId) {
    return {
      ok: false,
      summary: "Event ID is required",
      error: "Event ID is required",
    };
  }

  // Fetch event dishes to generate prep list from
  const eventDishes = await database.eventDish.findMany({
    where: {
      tenantId: context.tenantId,
      eventId,
      deletedAt: null,
    },
    select: {
      id: true,
      dishName: true,
      category: true,
      dietary: true,
    },
  });

  if (eventDishes.length === 0) {
    return {
      ok: false,
      summary: "No dishes found for this event. Add dishes to the menu first.",
      error: "No dishes found for this event",
    };
  }

  // Get event details for context
  const event = await database.event.findFirst({
    where: {
      id: eventId,
      tenantId: context.tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      guestCount: true,
      eventDate: true,
    },
  });

  if (!event) {
    return {
      ok: false,
      summary: "Event not found",
      error: "Event not found",
    };
  }

  // Generate prep list items from dishes
  // Group by category for organized prep list
  const categoryGroups: Record<string, typeof eventDishes> = {};

  for (const dish of eventDishes) {
    const category = dish.category ?? "General";
    if (!categoryGroups[category]) {
      categoryGroups[category] = [];
    }
    categoryGroups[category].push(dish);
  }

  // Build prep list items
  const prepListItems: Array<{
    category: string;
    dishName: string;
    quantity: number;
    unit: string;
    prepNotes: string;
    dietary: string[];
  }> = [];

  const guestCount = event.guestCount ?? 1;

  for (const [category, dishes] of Object.entries(categoryGroups)) {
    for (const dish of dishes) {
      // Estimate quantity based on guest count (simple heuristic)
      const quantity = Math.ceil(guestCount * 1.1); // 10% buffer

      prepListItems.push({
        category,
        dishName: dish.dishName,
        quantity,
        unit: "servings",
        prepNotes: `Prepare for ${guestCount} guests`,
        dietary: dish.dietary ?? [],
      });
    }
  }

  // Apply optional filters
  let filteredItems = prepListItems;

  if (Array.isArray(args.categories) && args.categories.length > 0) {
    const categories = args.categories as string[];
    filteredItems = filteredItems.filter((item) =>
      categories.some((c) => c.toLowerCase() === item.category.toLowerCase())
    );
  }

  if (typeof args.includeDietary === "boolean" && !args.includeDietary) {
    filteredItems = filteredItems.map((item) => ({
      ...item,
      dietary: [],
    }));
  }

  return {
    ok: true,
    summary: `Generated prep list with ${filteredItems.length} items from ${eventDishes.length} dishes`,
    data: {
      eventId,
      eventTitle: event.title,
      guestCount,
      eventDate: event.eventDate,
      totalItems: filteredItems.length,
      categories: Object.keys(categoryGroups),
      prepList: filteredItems,
    },
  };
}

const BASE_TOOL_DEFINITIONS: ToolDefinition[] = [
  // ── Event Setup Tools ─────────────────────────────────────────────
  {
    type: "function",
    name: "create_event_draft",
    description:
      "Create a new event with basic details in draft status. Use this when the user wants to start planning a new event. The event will be created with status 'draft' so it can be modified before confirmation. Requires title and guestCount at minimum.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "The event title or name (e.g., 'Smith Wedding Reception', 'TechCorp Q4 Gala')",
        },
        eventType: {
          type: "string",
          description: "Type of event (e.g., 'wedding', 'corporate', 'birthday', 'catering', 'gala', 'party')",
        },
        eventDate: {
          type: "number",
          description: "Unix timestamp of the event date",
        },
        guestCount: {
          type: "number",
          description: "Expected number of guests/attendees",
        },
        clientId: {
          type: "string",
          description: "UUID of the client if already exists in the system",
        },
        notes: {
          type: "string",
          description: "Additional notes about the event",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags for categorizing the event",
        },
      },
      required: ["title", "guestCount"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "set_event_menu",
    description:
      "Link dishes to an event by creating a menu and adding event dishes. Use this after creating an event draft when the user specifies menu items. Creates a menu associated with the event and adds each dish with optional category and dietary info.",
    parameters: {
      type: "object",
      properties: {
        eventId: {
          type: "string",
          description: "UUID of the event to add the menu to",
        },
        menuName: {
          type: "string",
          description: "Optional name for the menu (defaults to 'Event Menu')",
        },
        dishes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Name of the dish (e.g., 'Grilled Salmon', 'Caesar Salad')",
              },
              category: {
                type: "string",
                description: "Category of dish (e.g., 'appetizer', 'main', 'dessert', 'beverage')",
              },
              dietary: {
                type: "array",
                items: { type: "string" },
                description: "Dietary labels (e.g., 'vegetarian', 'vegan', 'gluten-free', 'kosher')",
              },
            },
            required: ["name"],
          },
          description: "Array of dishes to add to the event menu",
        },
      },
      required: ["eventId", "dishes"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "assign_event_staff",
    description:
      "Assign staff members to an event by role. Use this when the user specifies staffing needs (e.g., 'I need 4 servers and 2 bartenders'). Creates staff assignments that can later be linked to specific employees.",
    parameters: {
      type: "object",
      properties: {
        eventId: {
          type: "string",
          description: "UUID of the event to assign staff to",
        },
        staffAssignments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              role: {
                type: "string",
                description: "Staff role (e.g., 'server', 'bartender', 'chef', 'event_manager', 'dishwasher')",
              },
              count: {
                type: "number",
                description: "Number of staff needed for this role",
              },
              employeeId: {
                type: "string",
                description: "Optional UUID of a specific employee to assign",
              },
            },
            required: ["role"],
          },
          description: "Array of staff assignments with roles and counts",
        },
      },
      required: ["eventId", "staffAssignments"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "set_event_venue",
    description:
      "Set or update the venue for an event. Use this when the user specifies where the event will be held. Can set venue name and/or address independently.",
    parameters: {
      type: "object",
      properties: {
        eventId: {
          type: "string",
          description: "UUID of the event to update",
        },
        venueName: {
          type: "string",
          description: "Name of the venue (e.g., 'Grand Ballroom', 'The Ritz Hotel', 'Client Home')",
        },
        venueAddress: {
          type: "string",
          description: "Full address of the venue",
        },
      },
      required: ["eventId"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "generate_prep_list",
    description:
      "Auto-generate a prep list from the event menu. Use this when the user wants to see what needs to be prepared for an event. Analyzes all dishes linked to the event and generates a categorized prep list with quantities based on guest count.",
    parameters: {
      type: "object",
      properties: {
        eventId: {
          type: "string",
          description: "UUID of the event to generate prep list for",
        },
        categories: {
          type: "array",
          items: { type: "string" },
          description: "Optional filter to include only specific categories",
        },
        includeDietary: {
          type: "boolean",
          description: "Whether to include dietary labels in the output (default: true)",
        },
      },
      required: ["eventId"],
      additionalProperties: false,
    },
  },
  // ── Core Tools ─────────────────────────────────────────────────────
  {
    type: "function",
    name: "parse_natural_language_event",
    description:
      "Parse natural language into structured event data. Extracts title, date, guest count, venue, and other event details from casual text like 'Create an event for 50 people at Venue X on March 25th'. Returns structured data ready for Event.create.",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description:
            "Natural language description of the event to create. Examples: 'Catering for 100 guests at the Grand Ballroom next Friday', 'Birthday party for 50 people at home on March 15th 2024'.",
        },
        referenceDate: {
          type: "string",
          description:
            "ISO date string to use as reference for relative dates like 'next Friday'. Defaults to current date.",
        },
      },
      required: ["text"],
      additionalProperties: false,
    },
  },
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

// ── Natural Language Event Parsing ─────────────────────────────────

interface ParsedEventData {
  title: string;
  eventType: string;
  eventDate: number | null;
  guestCount: number;
  venueName: string;
  venueAddress: string;
  notes: string;
  tags: string;
  confidence: number;
  missingFields: string[];
  suggestions: string[];
}

const EVENT_TYPE_PATTERNS: Array<{
  pattern: RegExp;
  eventType: string;
  keywords: string[];
}> = [
  {
    pattern: /\b(wedding|marriage|bride|groom)\b/i,
    eventType: "wedding",
    keywords: ["wedding", "marriage"],
  },
  {
    pattern: /\b(corporate|business|company|conference|meeting)\b/i,
    eventType: "corporate",
    keywords: ["corporate", "business"],
  },
  {
    pattern: /\b(birthday|b-day|bday)\b/i,
    eventType: "birthday",
    keywords: ["birthday"],
  },
  {
    pattern: /\b(anniversary)\b/i,
    eventType: "anniversary",
    keywords: ["anniversary"],
  },
  {
    pattern: /\b(graduation|graduate)\b/i,
    eventType: "graduation",
    keywords: ["graduation"],
  },
  {
    pattern: /\b(holiday|christmas|thanksgiving|easter|hanukkah)\b/i,
    eventType: "holiday",
    keywords: ["holiday"],
  },
  {
    pattern: /\b(gala|fundraiser|charity)\b/i,
    eventType: "gala",
    keywords: ["gala", "charity"],
  },
  {
    pattern: /\b(catering|catered)\b/i,
    eventType: "catering",
    keywords: ["catering"],
  },
  {
    pattern: /\b(party|celebration|celebrate)\b/i,
    eventType: "party",
    keywords: ["party", "celebration"],
  },
];

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const MONTH_ABBREVIATIONS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "sept",
  "oct",
  "nov",
  "dec",
];

function parseMonth(text: string): number | null {
  const lower = text.toLowerCase();
  
  // Try full month names first
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (lower.includes(MONTH_NAMES[i])) {
      return i;
    }
  }
  
  // Try abbreviations as whole words
  for (let i = 0; i < MONTH_ABBREVIATIONS.length; i++) {
    const regex = new RegExp(`\\b${MONTH_ABBREVIATIONS[i]}\\.?\\b`, "i");
    if (regex.test(lower)) {
      return i;
    }
  }
  
  return null;
}

function parseDayOfMonth(text: string): number | null {
  // Look for day patterns that are likely dates, not guest counts
  // Prioritize patterns near month names or after "on"
  
  // Pattern 1: Day immediately after month name (e.g., "March 25th")
  const monthDayPattern = /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;
  const monthDayMatch = text.match(monthDayPattern);
  if (monthDayMatch) {
    const day = parseInt(monthDayMatch[1], 10);
    if (day >= 1 && day <= 31) {
      return day;
    }
  }
  
  // Pattern 2: Day after "on" (e.g., "on the 25th", "on 25th")
  const onDayPattern = /\bon\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b/i;
  const onDayMatch = text.match(onDayPattern);
  if (onDayMatch) {
    const day = parseInt(onDayMatch[1], 10);
    if (day >= 1 && day <= 31) {
      return day;
    }
  }
  
  // Pattern 3: Standalone day with ordinal (e.g., "25th")
  // Only use this if not preceded by "for" (which indicates guest count)
  const standalonePattern = /(?<!\bfor\s+)(\d{1,2})(?:st|nd|rd|th)\b/i;
  const standaloneMatch = text.match(standalonePattern);
  if (standaloneMatch) {
    const day = parseInt(standaloneMatch[1], 10);
    if (day >= 1 && day <= 31) {
      return day;
    }
  }
  
  return null;
}

function parseYear(text: string, referenceYear: number): number | null {
  const yearMatch = text.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10);
  }
  return null;
}

function parseRelativeDate(
  text: string,
  referenceDate: Date
): { date: Date; confidence: number } | null {
  const lower = text.toLowerCase();

  // "tomorrow"
  if (/\btomorrow\b/.test(lower)) {
    const tomorrow = new Date(referenceDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return { date: tomorrow, confidence: 0.95 };
  }

  // "next week"
  if (/\bnext\s+week\b/.test(lower)) {
    const nextWeek = new Date(referenceDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return { date: nextWeek, confidence: 0.7 };
  }

  // "in X weeks" - check this before "next [day]" to avoid conflicts
  const inWeeksMatch = lower.match(/\bin\s+(\d+)\s+weeks?\b/);
  if (inWeeksMatch) {
    const weeks = parseInt(inWeeksMatch[1], 10);
    const result = new Date(referenceDate);
    result.setDate(result.getDate() + weeks * 7);
    return { date: result, confidence: 0.95 };
  }

  // "next [day of week]"
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const nextDayMatch = lower.match(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
  if (nextDayMatch) {
    const targetDay = dayNames.indexOf(nextDayMatch[1].toLowerCase());
    const result = new Date(referenceDate);
    const currentDay = result.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) {
      daysUntil += 7;
    }
    daysUntil += 7; // "next" means the following week
    result.setDate(result.getDate() + daysUntil);
    return { date: result, confidence: 0.9 };
  }

  // "this [day of week]"
  const thisDayMatch = lower.match(/\bthis\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
  if (thisDayMatch) {
    const targetDay = dayNames.indexOf(thisDayMatch[1].toLowerCase());
    const result = new Date(referenceDate);
    const currentDay = result.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) {
      daysUntil += 7;
    }
    result.setDate(result.getDate() + daysUntil);
    return { date: result, confidence: 0.9 };
  }

  // "in X days"
  const inDaysMatch = lower.match(/\bin\s+(\d+)\s+days?\b/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10);
    const result = new Date(referenceDate);
    result.setDate(result.getDate() + days);
    return { date: result, confidence: 0.95 };
  }

  return null;
}

function parseAbsoluteDate(
  text: string,
  referenceDate: Date
): { date: Date; confidence: number } | null {
  const month = parseMonth(text);
  if (month === null) {
    return null;
  }

  const day = parseDayOfMonth(text);
  if (day === null) {
    return null;
  }

  let year = parseYear(text, referenceDate.getFullYear());
  if (year === null) {
    // Default to current year or next year if the date has passed
    year = referenceDate.getFullYear();
    const candidateDate = new Date(year, month, day);
    if (candidateDate < referenceDate) {
      year++;
    }
  }

  const date = new Date(year, month, day);
  // Validate the date is reasonable
  if (date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }

  return { date, confidence: 0.95 };
}

function parseEventDate(
  text: string,
  referenceDate: Date
): { timestamp: number; confidence: number } | null {
  // Try relative date first
  const relative = parseRelativeDate(text, referenceDate);
  if (relative) {
    return {
      timestamp: Math.floor(relative.date.getTime() / 1000),
      confidence: relative.confidence,
    };
  }

  // Try absolute date
  const absolute = parseAbsoluteDate(text, referenceDate);
  if (absolute) {
    return {
      timestamp: Math.floor(absolute.date.getTime() / 1000),
      confidence: absolute.confidence,
    };
  }

  return null;
}

function parseGuestCount(text: string): number | null {
  // Match patterns like "50 people", "100 guests", "for 75", "200 pax"
  const patterns = [
    /(?:for\s+)?(\d+)\s*(?:people|guests?|pax|persons?|attendees?)\b/i,
    /(\d+)\s*(?:people|guests?|pax|persons?|attendees?)\b/i,
    /\bfor\s+(\d+)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const count = parseInt(match[1], 10);
      if (count > 0 && count <= 100000) {
        return count;
      }
    }
  }

  return null;
}

function parseVenue(text: string): { name: string; address: string } {
  // Look for patterns like "at Venue X", "at the Grand Ballroom", "venue: X"
  // Be careful to stop at prepositions, date indicators, and numbers
  
  const stopWords = [
    "on", "in", "for", "with", "by", "from", "to", "next", "this", 
    "tomorrow", "today", "january", "february", "march", "april", "may", 
    "june", "july", "august", "september", "october", "november", "december"
  ];
  
  // Pattern 1: "at [Venue Name]" - capture words after 'at' until we hit a stop word or date pattern
  const atMatch = text.match(/\b(?:at|@)\s+(?:the\s+)?([A-Z][A-Za-z]+(?:\s+[A-Za-z]+)*)/i);
  if (atMatch) {
    let venueName = atMatch[1].trim();
    
    // Split into words and filter out stop words and anything after them
    const words = venueName.split(/\s+/);
    const filteredWords: string[] = [];
    for (const word of words) {
      const lowerWord = word.toLowerCase();
      // Stop if we hit a stop word or a number (likely a date)
      if (stopWords.includes(lowerWord) || /^\d/.test(word)) {
        break;
      }
      filteredWords.push(word);
    }
    
    venueName = filteredWords.join(" ");
    if (venueName.length > 2 && !/^\d/.test(venueName)) {
      return { name: venueName, address: "" };
    }
  }
  
  // Pattern 2: "venue: [Venue Name]"
  const venueColonMatch = text.match(/\bvenue[:\s]+["']?([A-Za-z\s]+?)["']?(?:\s|$)/i);
  if (venueColonMatch) {
    const venueName = venueColonMatch[1].trim();
    if (venueName.length > 2) {
      return { name: venueName, address: "" };
    }
  }
  
  // Pattern 3: "at [location]" where location is a known venue type
  const venueTypes = ["ballroom", "hall", "hotel", "center", "centre", "house", "home", "restaurant", "venue", "garden", "park"];
  const venueTypeRegex = new RegExp(`\\b(?:at|@)\\s+(?:the\\s+)?([A-Za-z]+\\s+(?:${venueTypes.join("|")}))`, "i");
  const venueTypeMatch = text.match(venueTypeRegex);
  if (venueTypeMatch) {
    return { name: venueTypeMatch[1].trim(), address: "" };
  }

  return { name: "", address: "" };
}

function inferEventType(text: string): { eventType: string; confidence: number } {
  for (const { pattern, eventType } of EVENT_TYPE_PATTERNS) {
    if (pattern.test(text)) {
      return { eventType, confidence: 0.9 };
    }
  }

  // Default to "catering" if food-related keywords are present
  if (/\b(food|menu|catering|dinner|lunch|breakfast|meal|buffet)\b/i.test(text)) {
    return { eventType: "catering", confidence: 0.7 };
  }

  return { eventType: "general", confidence: 0.5 };
}

function generateTitle(
  text: string,
  eventType: string,
  guestCount: number | null,
  venueName: string
): string {
  // Try to extract a descriptive title from the text
  // Remove common filler words and date/guest patterns
  let cleaned = text
    .replace(/^(create|plan|schedule|set up|organize|need|want)\s+(an?\s+)?/i, "")
    .replace(/\bfor\s+\d+\s*(people|guests?|pax)?\b/gi, "")
    .replace(/\bon\s+\w+\s+\d{1,2}(?:st|nd|rd|th)?/gi, "")
    .replace(/\bat\s+\d+\s*(pm|am)?/gi, "")
    .trim();

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // Build a title
  const parts: string[] = [];

  if (eventType && eventType !== "general") {
    parts.push(eventType.charAt(0).toUpperCase() + eventType.slice(1));
  }

  if (venueName) {
    parts.push(`at ${venueName}`);
  }

  if (guestCount && guestCount > 0) {
    parts.push(`(${guestCount} guests)`);
  }

  const generatedTitle = parts.join(" ");
  return generatedTitle || cleaned || "New Event";
}

function parseNaturalLanguageEvent(
  text: string,
  referenceDate: Date = new Date()
): ParsedEventData {
  const missingFields: string[] = [];
  const suggestions: string[] = [];

  // Parse guest count
  const guestCount = parseGuestCount(text) ?? 0;
  if (guestCount === 0) {
    missingFields.push("guestCount");
    suggestions.push("How many guests will attend?");
  }

  // Parse event date
  const dateResult = parseEventDate(text, referenceDate);
  const eventDate = dateResult?.timestamp ?? null;
  if (!eventDate) {
    missingFields.push("eventDate");
    suggestions.push("When is the event? (e.g., 'March 25th', 'next Friday')");
  }

  // Parse venue
  const venue = parseVenue(text);
  if (!venue.name) {
    missingFields.push("venueName");
    suggestions.push("Where will the event be held?");
  }

  // Infer event type
  const typeResult = inferEventType(text);

  // Generate title
  const title = generateTitle(text, typeResult.eventType, guestCount, venue.name);

  // Calculate overall confidence
  let confidence = 0.5;
  if (guestCount > 0) confidence += 0.15;
  if (eventDate) confidence += 0.2;
  if (venue.name) confidence += 0.1;
  if (typeResult.confidence > 0.7) confidence += 0.05;
  confidence = Math.min(confidence, 1);

  return {
    title,
    eventType: typeResult.eventType,
    eventDate,
    guestCount: guestCount > 0 ? guestCount : 1,
    venueName: venue.name,
    venueAddress: venue.address,
    notes: "",
    tags: typeResult.eventType !== "general" ? typeResult.eventType : "",
    confidence,
    missingFields,
    suggestions,
  };
}

async function parseNaturalLanguageEventTool(
  args: Record<string, unknown>,
  context: ManifestAgentContext,
  callId: string
): Promise<AgentToolResult> {
  const text = typeof args.text === "string" ? args.text : "";
  
  if (!text || text.trim().length === 0) {
    return {
      ok: false,
      summary: "Text input is required",
      error: "Text input is required",
    };
  }

  // Call the AiEventSetupSession.parse manifest command route
  // This centralizes parsing logic and enables session tracking
  const result = await executeManifestCommandRoute(
    "/api/ai-event-setup/parse",
    "AiEventSetupSession.parse",
    {
      entityName: "AiEventSetupSession",
      commandName: "parse",
      args: {
        originalInput: text,
        referenceDate: typeof args.referenceDate === "string" ? args.referenceDate : new Date().toISOString(),
      },
    },
    context,
    callId
  );

  if (!result.ok) {
    return result;
  }

  // Extract the parsed data from the response
  // executeManifestCommandRoute returns: { routePath, response: { success, result, events } }
  const responseData = result.data as { 
    response?: {
      success?: boolean;
      result?: {
        sessionId?: string;
        parsedTitle?: string;
        parsedEventType?: string;
        parsedEventDate?: number | null;
        parsedGuestCount?: number;
        parsedVenueName?: string;
        parsedVenueAddress?: string;
        parsedNotes?: string;
        parsedTags?: string;
        confidence?: number;
        missingFields?: string[];
        suggestions?: string[];
        readyToCreate?: boolean;
      };
    };
  };
  
  const parsed = responseData?.response?.result;

  if (!parsed) {
    return {
      ok: false,
      summary: "Failed to parse event data from response",
      error: "Failed to parse event data from response",
    };
  }

  return {
    ok: true,
    summary: `Parsed event: "${parsed.parsedTitle}" for ${parsed.parsedGuestCount} guests with ${((parsed.confidence ?? 0) * 100).toFixed(0)}% confidence`,
    data: {
      sessionId: parsed.sessionId,
      title: parsed.parsedTitle,
      eventType: parsed.parsedEventType,
      eventDate: parsed.parsedEventDate,
      guestCount: parsed.parsedGuestCount,
      venueName: parsed.parsedVenueName,
      venueAddress: parsed.parsedVenueAddress,
      notes: parsed.parsedNotes,
      tags: parsed.parsedTags,
      confidence: parsed.confidence,
      missingFields: parsed.missingFields,
      suggestions: parsed.suggestions,
      readyToCreate: parsed.readyToCreate,
    },
  };
}

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
        // Event Setup Tools (Phase 1)
        if (call.name === "create_event_draft") {
          return await createEventDraftTool(parsedArgs, context, call.callId);
        }

        if (call.name === "set_event_menu") {
          return await setEventMenuTool(parsedArgs, context, call.callId);
        }

        if (call.name === "assign_event_staff") {
          return await assignEventStaffTool(parsedArgs, context, call.callId);
        }

        if (call.name === "set_event_venue") {
          return await setEventVenueTool(parsedArgs, context, call.callId);
        }

        if (call.name === "generate_prep_list") {
          return await generatePrepListTool(parsedArgs, context);
        }

        // Core Tools
        if (call.name === "parse_natural_language_event") {
          return await parseNaturalLanguageEventTool(parsedArgs, context, call.callId);
        }

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
