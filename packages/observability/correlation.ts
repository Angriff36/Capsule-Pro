/**
 * Correlation ID utilities for end-to-end request tracing.
 *
 * Provides functions to generate, extract, and propagate correlation IDs
 * across API routes and service boundaries.
 */

import { randomUUID } from "node:crypto";

/** Header name for correlation ID propagation */
export const CORRELATION_ID_HEADER = "x-correlation-id";

/** Standard error codes for command-board operations */
export type CommandBoardErrorCode =
  | "AUTH_REQUIRED"
  | "TENANT_NOT_FOUND"
  | "USER_NOT_FOUND"
  | "BOARD_NOT_FOUND"
  | "BOARD_UNAVAILABLE"
  | "COMMAND_FAILED"
  | "CONFLICT_CHECK_FAILED"
  | "CONFLICT_DETECTOR_FAILED"
  | "INVALID_REQUEST"
  | "VALIDATION_ERROR"
  | "PERMISSION_DENIED"
  | "POLICY_DENIAL"
  | "GUARD_FAILURE"
  | "SERVICE_UNAVAILABLE"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

/** Map HTTP status codes to error codes */
export function httpStatusToErrorCode(status: number): CommandBoardErrorCode {
  if (status === 401) {
    return "AUTH_REQUIRED";
  }
  if (status === 403) {
    return "PERMISSION_DENIED";
  }
  if (status === 404) {
    return "BOARD_NOT_FOUND";
  }
  if (status === 422) {
    return "VALIDATION_ERROR";
  }
  if (status === 429) {
    return "RATE_LIMITED";
  }
  if (status >= 500) {
    return "SERVICE_UNAVAILABLE";
  }
  if (status >= 400) {
    return "INVALID_REQUEST";
  }
  return "INTERNAL_ERROR";
}

/**
 * Generate a new correlation ID (UUID v4).
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Extract correlation ID from request headers or generate a new one.
 * Checks both standard header variants.
 */
export function getOrCreateCorrelationId(
  headers: Headers | Record<string, string | undefined | null>
): string {
  // Handle Headers object
  if (headers instanceof Headers) {
    const existing =
      headers.get(CORRELATION_ID_HEADER) ??
      headers.get("x-request-id") ??
      headers.get("correlation-id");
    if (existing) {
      return existing;
    }
    return generateCorrelationId();
  }

  // Handle plain object
  const headerKeys = Object.keys(headers);
  const correlationKey = headerKeys.find(
    (k) => k.toLowerCase() === CORRELATION_ID_HEADER
  );
  const requestKey = headerKeys.find((k) => k.toLowerCase() === "x-request-id");
  const fallbackKey = headerKeys.find(
    (k) => k.toLowerCase() === "correlation-id"
  );

  const existing =
    (correlationKey ? headers[correlationKey] : undefined) ??
    (requestKey ? headers[requestKey] : undefined) ??
    (fallbackKey ? headers[fallbackKey] : undefined);

  if (existing) {
    return existing;
  }
  return generateCorrelationId();
}

/**
 * Create a log context object with correlation ID.
 * Useful for structured logging with consistent fields.
 */
export function createLogContext(
  correlationId: string,
  additionalContext?: Record<string, unknown>
): Record<string, unknown> {
  return {
    correlationId,
    timestamp: new Date().toISOString(),
    ...additionalContext,
  };
}

/**
 * Log entry shape for command-board operations.
 */
export interface CommandBoardLogEntry {
  correlationId: string;
  errorCode?: CommandBoardErrorCode;
  route: string;
  operation: string;
  tenantId?: string;
  userId?: string;
  boardId?: string;
  duration?: number;
  success: boolean;
  message?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a structured log entry for command-board operations.
 */
export function createCommandBoardLog(
  entry: CommandBoardLogEntry
): Record<string, unknown> {
  return {
    correlationId: entry.correlationId,
    timestamp: new Date().toISOString(),
    route: entry.route,
    operation: entry.operation,
    success: entry.success,
    ...(entry.errorCode ? { errorCode: entry.errorCode } : {}),
    ...(entry.tenantId ? { tenantId: entry.tenantId } : {}),
    ...(entry.userId ? { userId: entry.userId } : {}),
    ...(entry.boardId ? { boardId: entry.boardId } : {}),
    ...(entry.duration !== undefined ? { durationMs: entry.duration } : {}),
    ...(entry.message ? { message: entry.message } : {}),
    ...(entry.metadata ? { metadata: entry.metadata } : {}),
  };
}
