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
// ============ Type Guards ============
/**
 * Check if a constraint outcome is blocking (not passed, block severity, not overridden)
 */
function isBlockingConstraint(outcome) {
    return !outcome.passed && outcome.severity === "block" && !outcome.overridden;
}
/**
 * Check if a constraint outcome is a warning (not passed, warn severity)
 */
function isWarningConstraint(outcome) {
    return !outcome.passed && outcome.severity === "warn";
}
/**
 * Check if a constraint outcome failed (not passed)
 */
function isFailedConstraint(outcome) {
    return !outcome.passed;
}
// ============ Response Builders ============
/**
 * Convert a ConstraintOutcome to API format
 */
function toApiConstraintOutcome(outcome) {
    return {
        code: outcome.code,
        constraintName: outcome.constraintName,
        severity: outcome.severity,
        message: outcome.message || outcome.formatted,
        formatted: outcome.formatted,
        details: outcome.details,
        passed: outcome.passed,
        overridden: outcome.overridden,
        overriddenBy: outcome.overriddenBy,
        resolved: outcome.resolved,
    };
}
/**
 * Determine HTTP status code based on CommandResult
 */
export function getStatusCodeForResult(result) {
    // Success with data
    if (result.success) {
        return 200;
    }
    // Concurrency conflict
    if (result.concurrencyConflict) {
        return 409;
    }
    // Policy denial (authorization failure)
    if (result.policyDenial || result.deniedBy) {
        return 403;
    }
    // Guard failure (validation error)
    if (result.guardFailure) {
        return 400;
    }
    // Blocking constraints
    const blockingConstraints = result.constraintOutcomes?.filter(isBlockingConstraint);
    if (blockingConstraints && blockingConstraints.length > 0) {
        return 400;
    }
    // Generic error
    return 500;
}
/**
 * Create a success API response
 */
export function apiSuccess(data, result) {
    const response = {
        success: true,
        data,
    };
    // Include constraint outcomes if present
    if (result?.constraintOutcomes && result.constraintOutcomes.length > 0) {
        // Only include actionable constraints (warnings, info)
        const actionable = result.constraintOutcomes.filter(isFailedConstraint);
        if (actionable.length > 0) {
            response.constraintOutcomes = actionable.map(toApiConstraintOutcome);
        }
    }
    // Include emitted events
    if (result?.emittedEvents && result.emittedEvents.length > 0) {
        response.emittedEvents = result.emittedEvents;
    }
    return response;
}
/**
 * Create an error API response
 */
export function apiError(message, result, additionalContext) {
    const response = {
        success: false,
        message,
    };
    // Add detailed error if available
    if (result?.error) {
        response.error = result.error;
    }
    // Add error code based on failure type
    if (result?.policyDenial || result?.deniedBy) {
        response.errorCode = "POLICY_DENIED";
    }
    else if (result?.concurrencyConflict) {
        response.errorCode = "CONCURRENCY_CONFLICT";
    }
    else if (result?.guardFailure) {
        response.errorCode = "GUARD_FAILED";
    }
    else if (result?.constraintOutcomes?.some(isBlockingConstraint)) {
        response.errorCode = "CONSTRAINT_VIOLATION";
    }
    // Include constraint outcomes
    if (result?.constraintOutcomes && result.constraintOutcomes.length > 0) {
        const failed = result.constraintOutcomes.filter(isFailedConstraint);
        if (failed.length > 0) {
            response.constraintOutcomes = failed.map(toApiConstraintOutcome);
        }
    }
    // Add additional context
    if (additionalContext) {
        response.details = additionalContext;
    }
    // Add concurrency conflict details
    if (result?.concurrencyConflict) {
        response.details = {
            ...response.details,
            conflict: result.concurrencyConflict,
        };
    }
    // Add guard failure details
    if (result?.guardFailure) {
        response.details = {
            ...response.details,
            guardFailure: {
                index: result.guardFailure.index,
                expression: result.guardFailure.expression,
                formatted: result.guardFailure.formatted,
                resolved: result.guardFailure.resolved,
            },
        };
    }
    // Add policy denial details
    if (result?.policyDenial) {
        response.details = {
            ...response.details,
            policyDenial: {
                policyName: result.policyDenial.policyName,
                message: result.policyDenial.message,
                resolved: result.policyDenial.resolved,
            },
        };
    }
    return response;
}
/**
 * Format a CommandResult into an API response with status code
 *
 * @param result - The CommandResult from Manifest runtime
 * @param data - The data to return on success
 * @param successMessage - Message to return on success
 * @param errorMessagePrefix - Prefix for error messages
 * @returns Tuple of [response, statusCode]
 */
export function formatCommandResult(result, data, successMessage, errorMessagePrefix) {
    const statusCode = getStatusCodeForResult(result);
    if (result.success) {
        const response = apiSuccess(data, result);
        if (successMessage && typeof response.data === "object") {
            return [
                {
                    ...response,
                    data: { ...response.data, message: successMessage },
                },
                statusCode,
            ];
        }
        return [response, statusCode];
    }
    // Build error message
    let errorMessage = errorMessagePrefix || "Operation failed";
    // Check for constraint violations
    const blockingConstraints = result.constraintOutcomes?.filter(isBlockingConstraint);
    if (blockingConstraints && blockingConstraints.length > 0) {
        const messages = blockingConstraints
            .map((c) => c.formatted || c.message)
            .join("; ");
        errorMessage = `${errorMessagePrefix || "Operation"} blocked: ${messages}`;
    }
    // Check for policy denial
    if (result.policyDenial) {
        errorMessage =
            result.policyDenial.message ||
                "You don't have permission to perform this action";
    }
    // Check for guard failure
    if (result.guardFailure) {
        errorMessage = `Validation failed: ${result.guardFailure.formatted}`;
    }
    // Check for concurrency conflict
    if (result.concurrencyConflict) {
        errorMessage = `Concurrency conflict: ${result.concurrencyConflict.conflictCode}`;
    }
    // Use result error if available
    if (result.error) {
        errorMessage = result.error;
    }
    const errorResponse = apiError(errorMessage, result);
    return [errorResponse, statusCode];
}
/**
 * Check if a CommandResult has blocking constraints
 */
export function hasBlockingConstraints(result) {
    return result.constraintOutcomes?.some(isBlockingConstraint) ?? false;
}
/**
 * Check if a CommandResult has warning constraints
 */
export function hasWarningConstraints(result) {
    return result.constraintOutcomes?.some(isWarningConstraint) ?? false;
}
/**
 * Get only blocking constraints from result
 */
export function getBlockingConstraintOutcomes(result) {
    return (result.constraintOutcomes
        ?.filter(isBlockingConstraint)
        .map(toApiConstraintOutcome) ?? []);
}
/**
 * Get only warning constraints from result
 */
export function getWarningConstraintOutcomes(result) {
    return (result.constraintOutcomes
        ?.filter(isWarningConstraint)
        .map(toApiConstraintOutcome) ?? []);
}
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
export function createNextResponse(responseClass, result, data, options) {
    const [body, statusCode] = formatCommandResult(result, data, options?.successMessage, options?.errorMessagePrefix);
    return responseClass.json(body, { status: statusCode });
}
// ============ Error Types ============
/**
 * Manifest constraint violation error
 */
export class ManifestConstraintError extends Error {
    constraintOutcomes;
    details;
    constructor(message, constraintOutcomes, details) {
        super(message);
        this.constraintOutcomes = constraintOutcomes;
        this.details = details;
        this.name = "ManifestConstraintError";
    }
}
/**
 * Manifest policy denial error
 */
export class ManifestPolicyError extends Error {
    policyName;
    details;
    constructor(message, policyName, details) {
        super(message);
        this.policyName = policyName;
        this.details = details;
        this.name = "ManifestPolicyError";
    }
}
/**
 * Manifest concurrency conflict error
 */
export class ManifestConflictError extends Error {
    conflict;
    constructor(message, conflict) {
        super(message);
        this.conflict = conflict;
        this.name = "ManifestConflictError";
    }
}
/**
 * Convert CommandResult to appropriate error type
 *
 * Throws if result is not successful, otherwise returns void
 */
export function throwIfNotSuccessful(result) {
    if (result.success) {
        return;
    }
    // Concurrency conflict
    if (result.concurrencyConflict) {
        throw new ManifestConflictError(`Concurrency conflict: ${result.concurrencyConflict.conflictCode}`, result.concurrencyConflict);
    }
    // Policy denial
    if (result.policyDenial) {
        throw new ManifestPolicyError(result.policyDenial.message || "Access denied", result.policyDenial.policyName, { resolved: result.policyDenial.resolved });
    }
    // Guard failure
    if (result.guardFailure) {
        throw new ManifestPolicyError(result.guardFailure.formatted, `Guard ${result.guardFailure.index}`, { resolved: result.guardFailure.resolved });
    }
    // Blocking constraints
    const blockingConstraints = getBlockingConstraintOutcomes(result);
    if (blockingConstraints.length > 0) {
        const messages = blockingConstraints.map((c) => c.formatted).join("; ");
        throw new ManifestConstraintError(`Constraint violation: ${messages}`, blockingConstraints, { error: result.error });
    }
    // Generic error
    throw new Error(result.error || "Unknown Manifest error");
}
