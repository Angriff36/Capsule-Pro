/**
 * Route Handler Helpers for Manifest Integration
 *
 * This module provides reusable utilities for Next.js App Router route handlers
 * that integrate with the Manifest runtime. It extracts common patterns from
 * manual integration into reusable helper functions.
 *
 * These helpers are used by both manually-written and generated route handlers.
 */
import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { createPrismaStoreProvider } from "@repo/kitchen-ops/prisma-store";
// ============ Auth & Context Helpers ============
/**
 * Set up route handler context with auth and tenant resolution
 *
 * This is the standard setup pattern for Manifest route handlers:
 * 1. Auth check
 * 2. Tenant resolution
 * 3. User lookup
 * 4. Runtime context creation
 *
 * @returns Route handler context or error response
 *
 * @example
 * ```typescript
 * export async function GET(request: Request) {
 *   const context = await setupRouteContext();
 *   if (!context) return manifestErrorResponse(new Error("Unauthorized"), 401);
 *
 *   const runtime = await createRecipeRuntime(context.runtimeContext);
 *   // ... use runtime
 * }
 * ```
 */
export async function setupRouteContext(options) {
    // 1. Auth check
    const authResult = await auth();
    const { orgId } = authResult;
    if (!orgId) {
        return null;
    }
    // 2. Tenant resolution
    const tenantId = await getTenantIdForOrg(orgId);
    // 3. Get current user
    const user = await database.user.findFirst({
        where: {
            AND: [{ tenantId }, { authUserId: authResult.userId ?? "" }],
        },
    });
    if (!user) {
        return null;
    }
    // 4. Create runtime context
    const runtimeContext = {
        tenantId,
        userId: user.id,
        userRole: user.role,
        storeProvider: options?.storeProvider ?? createPrismaStoreProvider(database, tenantId),
    };
    return {
        tenantId,
        user: {
            id: user.id,
            role: user.role,
            authUserId: user.authUserId,
        },
        runtimeContext,
        prisma: database,
    };
}
/**
 * Helper to get tenant ID from org ID
 * (Copied from app/lib/tenant.ts to avoid circular dependencies)
 */
async function getTenantIdForOrg(orgId) {
    const org = await database.organization.findFirst({
        where: { id: orgId },
        select: { tenantId: true },
    });
    if (!org?.tenantId) {
        throw new Error("Organization not found or has no tenant");
    }
    return org.tenantId;
}
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
// ============ Route Handler Wrapper ============
/**
 * Wrapper for route handlers with standard error handling
 *
 * @example
 * ```typescript
 * export const GET = withRouteHandler(async (context) => {
 *   const runtime = await createRecipeRuntime(context.runtimeContext);
 *   const recipes = await runtime.query("Recipe");
 *   return manifestSuccessResponse({ recipes });
 * });
 * ```
 */
export async function withRouteHandler(handler) {
    try {
        const context = await setupRouteContext();
        if (!context) {
            return unauthorizedResponse();
        }
        return handler(context);
    }
    catch (error) {
        return serverErrorResponse(error);
    }
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
        // @ts-expect-error - outcome shape varies
        return (!outcome.passed && outcome.severity === "block" && !outcome.overridden);
    });
    if (blockingConstraints && blockingConstraints.length > 0) {
        throw new Error("Command blocked by constraint");
    }
}
