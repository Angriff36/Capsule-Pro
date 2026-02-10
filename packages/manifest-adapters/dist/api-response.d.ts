/**
 * API Response Utilities for Manifest Runtime
 *
 * This module provides standardized types and utilities for formatting
 * Manifest CommandResult objects into consistent API responses.
 *
 * Goals:
 * - Consistent error response format across all API routes
 * - Proper HTTP status codes based on constraint severity
 * - Structured constraint outcome information for frontend consumption
 * - Type-safe response builders
 */
import type { CommandResult, EmittedEvent } from "@manifest/runtime";
/**
 * Severity level for constraint classification
 */
export type ConstraintSeverity = "ok" | "warn" | "block";
/**
 * Formatted constraint outcome for API responses
 */
export interface ApiConstraintOutcome {
    /** Stable constraint identifier */
    code: string;
    /** Constraint display name */
    constraintName: string;
    /** Severity level */
    severity: ConstraintSeverity;
    /** User-friendly error message */
    message: string;
    /** Formatted expression with values */
    formatted: string;
    /** Structured details with resolved values */
    details?: Record<string, unknown>;
    /** Whether constraint passed */
    passed: boolean;
    /** Whether constraint was overridden */
    overridden?: boolean;
    /** User who authorized override */
    overriddenBy?: string;
    /** Resolved expression values for debugging */
    resolved?: Array<{
        expression: string;
        value: unknown;
    }>;
}
/**
 * Standard error response format
 */
export interface ApiErrorResponse {
    success: false;
    /** Human-readable error message */
    message: string;
    /** Detailed error message (optional) */
    error?: string;
    /** Application-specific error code */
    errorCode?: string;
    /** Constraint violations that caused the error */
    constraintOutcomes?: ApiConstraintOutcome[];
    /** Additional error context */
    details?: Record<string, unknown>;
}
/**
 * Standard success response format
 */
export interface ApiSuccessResponse<T = unknown> {
    success: true;
    /** Response data */
    data: T;
    /** Constraint outcomes (warnings, info) */
    constraintOutcomes?: ApiConstraintOutcome[];
    /** Emitted events for reactive updates */
    emittedEvents?: EmittedEvent[];
}
/**
 * Union type for all API responses
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
/**
 * HTTP status code for API responses
 */
export type ResponseStatusCode = 200 | 201 | 400 | 401 | 403 | 409 | 500;
/**
 * Determine HTTP status code based on CommandResult
 */
export declare function getStatusCodeForResult(result: CommandResult): ResponseStatusCode;
/**
 * Create a success API response
 */
export declare function apiSuccess<T>(data: T, result?: CommandResult): ApiSuccessResponse<T>;
/**
 * Create an error API response
 */
export declare function apiError(message: string, result?: CommandResult, additionalContext?: Record<string, unknown>): ApiErrorResponse;
/**
 * Format a CommandResult into an API response with status code
 *
 * @param result - The CommandResult from Manifest runtime
 * @param data - The data to return on success
 * @param successMessage - Message to return on success
 * @param errorMessagePrefix - Prefix for error messages
 * @returns Tuple of [response, statusCode]
 */
export declare function formatCommandResult<T>(result: CommandResult, data: T, successMessage?: string, errorMessagePrefix?: string): [ApiResponse<T>, ResponseStatusCode];
/**
 * Check if a CommandResult has blocking constraints
 */
export declare function hasBlockingConstraints(result: CommandResult): boolean;
/**
 * Check if a CommandResult has warning constraints
 */
export declare function hasWarningConstraints(result: CommandResult): boolean;
/**
 * Get only blocking constraints from result
 */
export declare function getBlockingConstraintOutcomes(result: CommandResult): ApiConstraintOutcome[];
/**
 * Get only warning constraints from result
 */
export declare function getWarningConstraintOutcomes(result: CommandResult): ApiConstraintOutcome[];
/**
 * Type for Next.js Response constructor (avoiding direct import)
 */
export interface NextResponseConstructor {
    json: (body: unknown, init?: {
        status?: number;
    }) => Response;
}
export type ResponseLike = Response;
/**
 * Create a Next.js response from a CommandResult
 *
 * This helper is designed for use in Next.js API route handlers.
 *
 * @example
 * ```typescript
 * import { NextResponse } from "next/server";
 * import { createNextResponse } from "@repo/manifest-adapters/api-response";
 *
 * export async function POST(request: Request) {
 *   const result = await someManifestCommand();
 *   return createNextResponse(NextResponse, result, { taskId: "123" });
 * }
 * ```
 */
export declare function createNextResponse<T>(responseClass: NextResponseConstructor, result: CommandResult, data: T, options?: {
    successMessage?: string;
    errorMessagePrefix?: string;
}): ResponseLike;
/**
 * Manifest constraint violation error
 */
export declare class ManifestConstraintError extends Error {
    readonly constraintOutcomes: ApiConstraintOutcome[];
    readonly details?: Record<string, unknown> | undefined;
    constructor(message: string, constraintOutcomes: ApiConstraintOutcome[], details?: Record<string, unknown> | undefined);
}
/**
 * Manifest policy denial error
 */
export declare class ManifestPolicyError extends Error {
    readonly policyName: string;
    readonly details?: Record<string, unknown> | undefined;
    constructor(message: string, policyName: string, details?: Record<string, unknown> | undefined);
}
/**
 * Manifest concurrency conflict error
 */
export declare class ManifestConflictError extends Error {
    readonly conflict: NonNullable<CommandResult["concurrencyConflict"]>;
    constructor(message: string, conflict: NonNullable<CommandResult["concurrencyConflict"]>);
}
/**
 * Convert CommandResult to appropriate error type
 *
 * Throws if result is not successful, otherwise returns void
 */
export declare function throwIfNotSuccessful(result: CommandResult): void;
//# sourceMappingURL=api-response.d.ts.map