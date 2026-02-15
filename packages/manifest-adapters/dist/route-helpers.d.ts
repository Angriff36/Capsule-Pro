/**
 * Route Handler Response Helpers for Manifest Integration
 *
 * This module provides reusable response utilities for Next.js App Router route handlers
 * that integrate with the Manifest runtime. These are pure response formatting utilities
 * with no dependencies on auth or tenant resolution.
 *
 * Auth and context setup should be handled at the app level, not in shared packages.
 */
/**
 * Create a standard error response
 */
export declare function manifestErrorResponse(error: Error | string, statusCode?: number, details?: Record<string, unknown>): Response;
/**
 * Create a standard success response
 */
export declare function manifestSuccessResponse<T>(data: T): Response;
/**
 * Standard 401 Unauthorized response
 */
export declare function unauthorizedResponse(message?: string): Response;
/**
 * Standard 400 Bad Request response
 */
export declare function badRequestResponse(message: string, details?: Record<string, unknown>): Response;
/**
 * Standard 403 Forbidden response
 */
export declare function forbiddenResponse(message?: string): Response;
/**
 * Standard 404 Not Found response
 */
export declare function notFoundResponse(message?: string): Response;
/**
 * Standard 500 Internal Server Error response
 */
export declare function serverErrorResponse(error: unknown): Response;
/**
 * Safely parse JSON from request with error handling
 */
export declare function parseRequestBody<T = unknown>(request: Request): Promise<T | null>;
/**
 * Get a required field from request body
 */
export declare function requireField<T>(body: Record<string, unknown>, fieldName: string, validator?: (value: unknown) => value is T): T | null;
/**
 * Get an optional field from request body with default
 */
export declare function optionalField<T>(body: Record<string, unknown>, fieldName: string, defaultValue: T, validator?: (value: unknown) => value is T): T;
/**
 * String field validator
 */
export declare function isString(value: unknown): value is string;
/**
 * Number field validator
 */
export declare function isNumber(value: unknown): value is number;
/**
 * Array field validator
 */
export declare function isArray(value: unknown): value is unknown[];
/**
 * Trimmed non-empty string validator
 */
export declare function isNonEmptyString(value: unknown): value is string;
/**
 * Check if entity creation succeeded (constraint validation passed)
 */
export declare function checkEntityCreation<T>(entity: T | undefined, _constraintDiagnostics?: unknown): T;
/**
 * Check command result for blocking constraints
 */
export declare function checkCommandResult(result: {
    success: boolean;
    constraintOutcomes?: unknown[];
}): void;
//# sourceMappingURL=route-helpers.d.ts.map