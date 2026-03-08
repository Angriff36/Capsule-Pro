/**
 * API Key Authentication Middleware
 *
 * Validates API keys from the Authorization header (Bearer token format).
 * Keys are looked up by prefix and validated using timing-safe hash comparison.
 *
 * Usage:
 *   import { authenticateApiKey, withApiKeyAuth } from "@/middleware/api-key-auth";
 *
 *   // Direct authentication
 *   const result = await authenticateApiKey(request);
 *   if (!result.success) {
 *     return result.error; // Response object
 *   }
 *   const apiKey = result.apiKey;
 *
 *   // Higher-order function wrapper
 *   export const GET = withApiKeyAuth(async (request, context) => {
 *     const apiKey = context.apiKey; // Authenticated API key
 *     // ...
 *   });
 */

import { database } from "@repo/database";
import { NextResponse } from "next/server";
import {
  extractKeyPrefix,
  isValidKeyFormat,
  validateKey,
} from "@/app/lib/api-key-service";

// ============================================================================
// Types
// ============================================================================

/**
 * API Key record as returned from authentication.
 * Contains the key information needed for downstream processing.
 */
export interface ApiKeyContext {
  tenantId: string;
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdByUserId: string;
  createdAt: Date;
}

/**
 * Result of API key authentication.
 * On success: { success: true, apiKey: ApiKeyContext }
 * On failure: { success: false, error: Response }
 */
export type AuthenticateResult =
  | { success: true; apiKey: ApiKeyContext }
  | { success: false; error: Response };

/**
 * Request with API key context attached.
 * Extends the standard Request interface with the authenticated API key.
 */
export interface RequestWithApiKey extends Request {
  apiKey?: ApiKeyContext;
}

/**
 * Context passed to handlers wrapped with withApiKeyAuth.
 */
export interface ApiKeyHandlerContext {
  apiKey: ApiKeyContext;
  params?: Record<string, string | string[]>;
}

// ============================================================================
// Constants
// ============================================================================

const BEARER_PREFIX = "Bearer ";

// ============================================================================
// Authentication Functions
// ============================================================================

/**
 * Authenticates an API key from the Authorization header.
 *
 * @param request - The incoming request
 * @returns Authentication result with either the API key or an error response
 *
 * @example
 * const result = await authenticateApiKey(request);
 * if (!result.success) {
 *   return result.error; // 401 or 403 Response
 * }
 * const { tenantId, scopes } = result.apiKey;
 */
export async function authenticateApiKey(
  request: Request
): Promise<AuthenticateResult> {
  // 1. Extract Authorization header
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return {
      success: false,
      error: NextResponse.json(
        { message: "Missing Authorization header" },
        { status: 401 }
      ),
    };
  }

  // 2. Validate Bearer token format
  if (!authHeader.startsWith(BEARER_PREFIX)) {
    return {
      success: false,
      error: NextResponse.json(
        {
          message:
            "Invalid Authorization header format. Expected: Bearer <token>",
        },
        { status: 401 }
      ),
    };
  }

  const plainKey = authHeader.slice(BEARER_PREFIX.length);

  // 3. Validate key format
  if (!isValidKeyFormat(plainKey)) {
    return {
      success: false,
      error: NextResponse.json(
        { message: "Invalid API key format" },
        { status: 401 }
      ),
    };
  }

  // 4. Extract prefix for lookup
  const keyPrefix = extractKeyPrefix(plainKey);

  // 5. Look up the key by prefix (keys are indexed by tenantId + keyPrefix)
  const apiKeyRecord = await database.apiKey.findFirst({
    where: {
      keyPrefix,
      deletedAt: null,
    },
    select: {
      tenantId: true,
      id: true,
      name: true,
      keyPrefix: true,
      hashedKey: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      deletedAt: true,
      createdByUserId: true,
      createdAt: true,
    },
  });

  // 6. Key not found in database
  if (!apiKeyRecord) {
    return {
      success: false,
      error: NextResponse.json({ message: "Invalid API key" }, { status: 401 }),
    };
  }

  // 7. Timing-safe hash comparison
  if (!validateKey(plainKey, apiKeyRecord.hashedKey)) {
    return {
      success: false,
      error: NextResponse.json({ message: "Invalid API key" }, { status: 401 }),
    };
  }

  // 8. Check if key is revoked
  if (apiKeyRecord.revokedAt) {
    return {
      success: false,
      error: NextResponse.json(
        { message: "API key has been revoked" },
        { status: 403 }
      ),
    };
  }

  // 9. Check if key is expired
  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
    return {
      success: false,
      error: NextResponse.json(
        { message: "API key has expired" },
        { status: 403 }
      ),
    };
  }

  // 10. Update lastUsedAt (non-blocking, fire-and-forget)
  const now = new Date();
  database.apiKey
    .update({
      where: {
        tenantId_id: {
          tenantId: apiKeyRecord.tenantId,
          id: apiKeyRecord.id,
        },
      },
      data: {
        lastUsedAt: now,
      },
    })
    .catch((error) => {
      console.error("[api-key-auth] Failed to update lastUsedAt:", error);
    });

  // 11. Return success with API key context
  const apiKeyContext: ApiKeyContext = {
    tenantId: apiKeyRecord.tenantId,
    id: apiKeyRecord.id,
    name: apiKeyRecord.name,
    keyPrefix: apiKeyRecord.keyPrefix,
    scopes: apiKeyRecord.scopes,
    lastUsedAt: apiKeyRecord.lastUsedAt,
    expiresAt: apiKeyRecord.expiresAt,
    createdByUserId: apiKeyRecord.createdByUserId,
    createdAt: apiKeyRecord.createdAt,
  };

  return {
    success: true,
    apiKey: apiKeyContext,
  };
}

// ============================================================================
// Higher-Order Function
// ============================================================================

/**
 * Wraps an API route handler with API key authentication.
 *
 * @param handler - The route handler to wrap
 * @returns A wrapped handler that authenticates before calling the original
 *
 * @example
 * export const GET = withApiKeyAuth(async (request, context) => {
 *   const { tenantId, scopes } = context.apiKey;
 *
 *   // Check scopes if needed
 *   if (!scopes.includes("read:events")) {
 *     return NextResponse.json({ message: "Insufficient permissions" }, { status: 403 });
 *   }
 *
 *   // Your handler logic here
 *   return NextResponse.json({ data: "..." });
 * });
 */
export function withApiKeyAuth<TParams = Record<string, string | string[]>>(
  handler: (
    request: Request,
    context: ApiKeyHandlerContext & { params?: TParams }
  ) => Promise<Response>
): (request: Request, context?: { params?: TParams }) => Promise<Response> {
  return async (
    request: Request,
    context?: { params?: TParams }
  ): Promise<Response> => {
    const result = await authenticateApiKey(request);

    if (!result.success) {
      return result.error;
    }

    return handler(request, {
      apiKey: result.apiKey,
      params: context?.params,
    } as ApiKeyHandlerContext & { params?: TParams });
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if an API key has a specific scope.
 *
 * @param apiKey - The authenticated API key context
 * @param scope - The scope to check for
 * @returns True if the key has the scope
 */
export function hasScope(apiKey: ApiKeyContext, scope: string): boolean {
  return apiKey.scopes.includes(scope);
}

/**
 * Checks if an API key has any of the specified scopes.
 *
 * @param apiKey - The authenticated API key context
 * @param scopes - The scopes to check for
 * @returns True if the key has any of the scopes
 */
export function hasAnyScope(apiKey: ApiKeyContext, scopes: string[]): boolean {
  return scopes.some((scope) => apiKey.scopes.includes(scope));
}

/**
 * Checks if an API key has all of the specified scopes.
 *
 * @param apiKey - The authenticated API key context
 * @param scopes - The scopes to check for
 * @returns True if the key has all of the scopes
 */
export function hasAllScopes(apiKey: ApiKeyContext, scopes: string[]): boolean {
  return scopes.every((scope) => apiKey.scopes.includes(scope));
}

/**
 * Creates a 403 Forbidden response for insufficient permissions.
 *
 * @param requiredScope - The scope that was required
 * @returns A 403 Response
 */
export function insufficientPermissions(requiredScope: string): Response {
  return NextResponse.json(
    { message: `Insufficient permissions. Required scope: ${requiredScope}` },
    { status: 403 }
  );
}
