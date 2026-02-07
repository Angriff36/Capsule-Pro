/**
 * Route Handler Helpers for Manifest Integration
 *
 * This module provides reusable utilities for Next.js App Router route handlers
 * that integrate with the Manifest runtime. It extracts common patterns from
 * manual integration into reusable helper functions.
 *
 * These helpers are used by both manually-written and generated route handlers.
 */
import type { PrismaClient } from "@repo/database";
import type { KitchenOpsContext } from "@repo/kitchen-ops";
/**
 * Result of route handler setup
 */
export interface RouteHandlerContext {
    /** Tenant ID for the current organization */
    tenantId: string;
    /** Current user from database */
    user: {
        id: string;
        role: string;
        authUserId: string;
    };
    /** Manifest runtime context */
    runtimeContext: KitchenOpsContext;
    /** Prisma client for direct queries */
    prisma: PrismaClient;
}
/**
 * Options for creating a runtime context
 */
export interface RuntimeContextOptions {
    /** Custom store provider (optional) */
    storeProvider?: KitchenOpsContext["storeProvider"];
}
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
export declare function setupRouteContext(options?: RuntimeContextOptions): Promise<RouteHandlerContext | null>;
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
export declare function withRouteHandler(handler: (context: RouteHandlerContext) => Promise<Response>): Promise<Response>;
/**
 * Check if entity creation succeeded (constraint validation passed)
 */
export declare function checkEntityCreation<T>(entity: T | undefined, constraintDiagnostics?: unknown): T;
/**
 * Check command result for blocking constraints
 */
export declare function checkCommandResult(result: {
    success: boolean;
    constraintOutcomes?: unknown[];
}): void;
//# sourceMappingURL=route-helpers.d.ts.map