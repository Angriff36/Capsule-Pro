/**
 * Route Handler Response Helpers for Manifest Integration
 *
 * This module provides reusable response utilities for Next.js App Router route handlers
 * that integrate with the Manifest runtime. These are pure response formatting utilities
 * with no dependencies on auth or tenant resolution.
 *
 * Auth and context setup should be handled at the app level, not in shared packages.
 */

// ============ Route Handler Response Helpers ============

/**
 * Create a standard error response
 */
export function manifestErrorResponse(
  error: Error | string,
  statusCode = 500,
  details?: Record<string, unknown>
): Response {
  const { NextResponse } = require("next/server");
  const message = typeof error === "string" ? error : error.message;

  const body = {
    success: false,
    message,
    ...(details && { details }),
  };

  return NextResponse.json(body, { status: statusCode });
}

/**
 * Create a standard success response
 */
export function manifestSuccessResponse<T>(data: T): Response {
  const { NextResponse } = require("next/server");

  const body = {
    success: true,
    data,
  };

  return NextResponse.json(body);
}

/**
 * Standard 401 Unauthorized response
 */
export function unauthorizedResponse(message = "Unauthorized"): Response {
  return manifestErrorResponse(new Error(message), 401);
}

/**
 * Standard 400 Bad Request response
 */
export function badRequestResponse(
  message: string,
  details?: Record<string, unknown>
): Response {
  return manifestErrorResponse(new Error(message), 400, details);
}

/**
 * Standard 403 Forbidden response
 */
export function forbiddenResponse(message = "Forbidden"): Response {
  return manifestErrorResponse(new Error(message), 403);
}

/**
 * Standard 404 Not Found response
 */
export function notFoundResponse(message = "Not found"): Response {
  return manifestErrorResponse(new Error(message), 404);
}

/**
 * Standard 500 Internal Server Error response
 */
export function serverErrorResponse(error: unknown): Response {
  if (error instanceof Error) {
    return manifestErrorResponse(error, 500);
  }
  return manifestErrorResponse(new Error(String(error)), 500);
}

// ============ Request Parsing Helpers ============

/**
 * Safely parse JSON from request with error handling
 */
export async function parseRequestBody<T = unknown>(
  request: Request
): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Get a required field from request body
 */
export function requireField<T>(
  body: Record<string, unknown>,
  fieldName: string,
  validator?: (value: unknown) => value is T
): T | null {
  const value = body[fieldName];

  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (validator && !validator(value)) {
    return null;
  }

  return value as T;
}

/**
 * Get an optional field from request body with default
 */
export function optionalField<T>(
  body: Record<string, unknown>,
  fieldName: string,
  defaultValue: T,
  validator?: (value: unknown) => value is T
): T {
  const value = body[fieldName];

  if (value === undefined || value === null) {
    return defaultValue;
  }

  if (validator && !validator(value)) {
    return defaultValue;
  }

  return value as T;
}

// ============ Validation Helpers ============

/**
 * String field validator
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Number field validator
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

/**
 * Array field validator
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Trimmed non-empty string validator
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// ============ Entity Operation Helpers ============

/**
 * Check if entity creation succeeded (constraint validation passed)
 */
export function checkEntityCreation<T>(
  entity: T | undefined,
  constraintDiagnostics?: unknown
): T {
  if (!entity) {
    const error = new Error("Constraint validation failed");
    throw error;
  }
  return entity;
}

/**
 * Check command result for blocking constraints
 */
export function checkCommandResult(result: {
  success: boolean;
  constraintOutcomes?: unknown[];
}): void {
  if (!result.success) {
    throw new Error("Command execution failed");
  }

  // Check for blocking constraints
  const blockingConstraints = result.constraintOutcomes?.filter(
    (outcome: unknown) => {
      const o = outcome as {
        passed?: boolean;
        severity?: string;
        overridden?: boolean;
      };
      return (
        !o.passed &&
        (o.severity === "block" || o.severity === "error") &&
        !o.overridden
      );
    }
  );

  if (blockingConstraints && blockingConstraints.length > 0) {
    throw new Error("Command blocked by constraint");
  }
}
