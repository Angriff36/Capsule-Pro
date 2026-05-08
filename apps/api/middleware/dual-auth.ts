/**
 * Dual Authentication Middleware
 *
 * Supports both API key (Bearer token) and session (Clerk) authentication.
 * Routes can require either auth method, with optional scope enforcement
 * when API key auth is used.
 *
 * Flow:
 *   1. Check Authorization header for Bearer token (sk_live_*)
 *   2. If present, authenticate via API key and optionally validate scope
 *   3. If absent, fall back to Clerk session auth
 *   4. Return unified auth result
 */

import { auth } from "@repo/auth/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import {
  type ApiKeyContext,
  authenticateApiKey,
  hasScope,
  insufficientPermissions,
} from "./api-key-auth";

// ============================================================================
// Types
// ============================================================================

export interface DualAuthResult {
  authenticated: boolean;
  authMethod: "session" | "api_key" | "none";
  tenantId: string | null;
  userId: string | null;
  apiKeyContext?: ApiKeyContext;
  error?: Response;
}

// ============================================================================
// Constants
// ============================================================================

const BEARER_PREFIX = "Bearer ";

// ============================================================================
// Main Function
// ============================================================================

/**
 * Authenticate a request using either API key or session auth.
 *
 * @param request - The incoming request
 * @param requiredScope - Optional scope required when using API key auth.
 *   Session auth always satisfies scope requirements (UI users have full access).
 * @returns DualAuthResult with authentication details and optional error response
 */
export async function requireDualAuth(
  request: Request,
  requiredScope?: string
): Promise<DualAuthResult> {
  const authHeader = request.headers.get("authorization");

  // Path 1: API key authentication
  if (authHeader?.startsWith(BEARER_PREFIX)) {
    const result = await authenticateApiKey(request);

    if (!result.success) {
      return {
        authenticated: false,
        authMethod: "api_key",
        tenantId: null,
        userId: null,
        error: result.error,
      };
    }

    const apiKey = result.apiKey;

    // Scope enforcement (only for API key auth — session auth has full access)
    if (requiredScope && !hasScope(apiKey, requiredScope)) {
      return {
        authenticated: false,
        authMethod: "api_key",
        tenantId: apiKey.tenantId,
        userId: null,
        apiKeyContext: apiKey,
        error: insufficientPermissions(requiredScope),
      };
    }

    return {
      authenticated: true,
      authMethod: "api_key",
      tenantId: apiKey.tenantId,
      userId: apiKey.createdByUserId,
      apiKeyContext: apiKey,
    };
  }

  // Path 2: Session (Clerk) authentication
  const { userId, orgId } = await auth();

  if (!(userId && orgId)) {
    return {
      authenticated: false,
      authMethod: "none",
      tenantId: null,
      userId: null,
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  const tenantId = await getTenantIdForOrg(orgId);

  if (!tenantId) {
    return {
      authenticated: false,
      authMethod: "none",
      tenantId: null,
      userId: null,
      error: NextResponse.json({ message: "No tenant found" }, { status: 401 }),
    };
  }

  // Session auth grants full access — no scope check needed
  return {
    authenticated: true,
    authMethod: "session",
    tenantId,
    userId,
  };
}
