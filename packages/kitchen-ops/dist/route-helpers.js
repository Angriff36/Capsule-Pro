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
export function manifestErrorResponse(error, statusCode = 500, details) {
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
export function manifestSuccessResponse(data) {
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
export function unauthorizedResponse(message = "Unauthorized") {
    return manifestErrorResponse(new Error(message), 401);
}
/**
 * Standard 400 Bad Request response
 */
export function badRequestResponse(message, details) {
    return manifestErrorResponse(new Error(message), 400, details);
}
/**
 * Standard 403 Forbidden response
 */
export function forbiddenResponse(message = "Forbidden") {
    return manifestErrorResponse(new Error(message), 403);
}
/**
 * Standard 404 Not Found response
 */
export function notFoundResponse(message = "Not found") {
    return manifestErrorResponse(new Error(message), 404);
}
/**
 * Standard 500 Internal Server Error response
 */
export function serverErrorResponse(error) {
    if (error instanceof Error) {
        return manifestErrorResponse(error, 500);
    }
    return manifestErrorResponse(new Error(String(error)), 500);
}
// ============ Request Parsing Helpers ============
/**
 * Safely parse JSON from request with error handling
 */
export async function parseRequestBody(request) {
    try {
        return (await request.json());
    }
    catch {
        return null;
    }
}
/**
 * Get a required field from request body
 */
export function requireField(body, fieldName, validator) {
    const value = body[fieldName];
    if (value === undefined || value === null || value === "") {
        return null;
    }
    if (validator && !validator(value)) {
        return null;
    }
    return value;
}
/**
 * Get an optional field from request body with default
 */
export function optionalField(body, fieldName, defaultValue, validator) {
    const value = body[fieldName];
    if (value === undefined || value === null) {
        return defaultValue;
    }
    if (validator && !validator(value)) {
        return defaultValue;
    }
    return value;
}
// ============ Validation Helpers ============
/**
 * String field validator
 */
export function isString(value) {
    return typeof value === "string";
}
/**
 * Number field validator
 */
export function isNumber(value) {
    return typeof value === "number" && !isNaN(value);
}
/**
 * Array field validator
 */
export function isArray(value) {
    return Array.isArray(value);
}
/**
 * Trimmed non-empty string validator
 */
export function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}
// ============ Entity Operation Helpers ============
/**
 * Check if entity creation succeeded (constraint validation passed)
 */
export function checkEntityCreation(entity, constraintDiagnostics) {
    if (!entity) {
        const error = new Error("Constraint validation failed");
        throw error;
    }
    return entity;
}
/**
 * Check command result for blocking constraints
 */
export function checkCommandResult(result) {
    if (!result.success) {
        throw new Error("Command execution failed");
    }
    // Check for blocking constraints
    const blockingConstraints = result.constraintOutcomes?.filter((outcome) => {
        const o = outcome;
        return (!o.passed &&
            (o.severity === "block" || o.severity === "error") &&
            !o.overridden);
    });
    if (blockingConstraints && blockingConstraints.length > 0) {
        throw new Error("Command blocked by constraint");
    }
}
