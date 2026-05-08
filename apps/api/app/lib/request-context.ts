import { auth } from "@repo/auth/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { getRequiredScope } from "@/lib/scope-guard";
import {
  type ApiKeyContext,
  authenticateApiKey,
  hasScope,
} from "@/middleware/api-key-auth";

export interface AuthContext {
  tenantId: string;
  userId: string | null;
  authMethod: "session" | "api_key";
  apiKeyContext?: ApiKeyContext;
  error?: Response;
}

const BEARER_PREFIX = "Bearer ";
const API_KEY_PREFIX = "cp_";

/**
 * Resolve auth context from either API key or Clerk session.
 *
 * API key path: validates Bearer token, enforces scope based on route.
 * Session path: standard Clerk auth with full access (no scope check).
 *
 * Use this in GET/list routes to replace the pattern:
 *   const { orgId } = await auth();
 *   const tenantId = await getTenantIdForOrg(orgId);
 */
export async function getAuthContext(request: Request): Promise<AuthContext> {
  const authHeader = request.headers.get("authorization");

  // API key path
  if (authHeader?.startsWith(BEARER_PREFIX)) {
    const token = authHeader.slice(BEARER_PREFIX.length);
    if (token.startsWith(API_KEY_PREFIX)) {
      const result = await authenticateApiKey(request);

      if (!result.success) {
        return {
          tenantId: "",
          userId: null,
          authMethod: "api_key",
          error: result.error,
        };
      }

      const apiKey = result.apiKey;
      const url = new URL(request.url);
      const scope = getRequiredScope(url.pathname, request.method);

      if (scope && !hasScope(apiKey, scope)) {
        return {
          tenantId: apiKey.tenantId,
          userId: null,
          authMethod: "api_key",
          apiKeyContext: apiKey,
          error: NextResponse.json(
            {
              message: `Insufficient permissions. Required scope: ${scope}`,
            },
            { status: 403 }
          ),
        };
      }

      return {
        tenantId: apiKey.tenantId,
        userId: apiKey.createdByUserId,
        authMethod: "api_key",
        apiKeyContext: apiKey,
      };
    }
  }

  // Clerk session path
  const { userId, orgId } = await auth();

  if (!(userId && orgId)) {
    return {
      tenantId: "",
      userId: null,
      authMethod: "session",
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  const tenantId = await getTenantIdForOrg(orgId);

  return {
    tenantId,
    userId,
    authMethod: "session",
  };
}
