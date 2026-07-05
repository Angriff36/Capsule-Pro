/**
 * API Keys Management Endpoint
 *
 * GET /api/settings/api-keys - List all API keys for the tenant
 * POST /api/settings/api-keys - Create a new API key (Manifest runtime)
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { generateApiKey } from "@/app/lib/api-key-service";
import { requireCurrentUser } from "@/app/lib/tenant";
import { API_SCOPES, VALID_SCOPES } from "@/lib/api-scopes";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { requireDualAuth } from "@/middleware/dual-auth";
import { withRateLimit } from "@/middleware/rate-limiter";

export const runtime = "nodejs";

/**
 * GET /api/settings/api-keys
 * List all API keys for the tenant (excluding hashed keys for security)
 */
export const GET = withRateLimit(
  async (request: Request) => {
    try {
      const authResult = await requireDualAuth(request, API_SCOPES.ADMIN);
      if (!(authResult.authenticated && authResult.tenantId)) {
        return authResult.error!;
      }

      const keys = await database.apiKey.findMany({
        where: {
          tenantId: authResult.tenantId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          scopes: true,
          lastUsedAt: true,
          expiresAt: true,
          revokedAt: true,
          createdByUserId: true,
          createdAt: true,
          updatedAt: true,
          // Explicitly exclude hashedKey for security
        },
        orderBy: [{ createdAt: "desc" }],
      });

      return NextResponse.json({ keys });
    } catch (error) {
      captureException(error);
      log.error("[ApiKeys/list] Error:", error);
      return NextResponse.json(
        { message: "Failed to fetch API keys" },
        { status: 500 }
      );
    }
  },
  { limit: 60, window: "1m" }
);

/**
 * POST /api/settings/api-keys
 * Create a new API key (delegated to Manifest runtime)
 *
 * Body: { name: string, scopes?: string[], expiresAt?: string }
 */
export const POST = withRateLimit(
  async (request: Request) => {
    try {
      const authResult = await requireDualAuth(request, API_SCOPES.ADMIN);
      if (!(authResult.authenticated && authResult.tenantId)) {
        return authResult.error!;
      }

      let body: Record<string, unknown> = {};
      try {
        body = await request.json();
      } catch {
        // Empty body
      }

      const { name, scopes, expiresAt } = body;

      if (!name || typeof name !== "string") {
        return NextResponse.json(
          { message: "Name is required" },
          { status: 400 }
        );
      }

      // Validate requested scopes against the canonical list
      const requestedScopes = Array.isArray(scopes) ? (scopes as string[]) : [];
      const invalidScopes = requestedScopes.filter(
        (s) => !VALID_SCOPES.includes(s)
      );
      if (invalidScopes.length > 0) {
        return NextResponse.json(
          {
            message: `Invalid scopes: ${invalidScopes.join(", ")}`,
            validScopes: VALID_SCOPES,
          },
          { status: 400 }
        );
      }

      // Check for duplicate name within tenant
      const existing = await database.apiKey.findFirst({
        where: {
          tenantId: authResult.tenantId,
          name,
          deletedAt: null,
        },
      });

      if (existing) {
        return NextResponse.json(
          { message: "An API key with this name already exists" },
          { status: 409 }
        );
      }

      // Generate the API key (crypto — must happen outside Manifest)
      const { plainKey, hashedKey, keyPrefix } = generateApiKey();

      // On the session (Clerk) path, authResult.userId is the raw Clerk id
      // ("user_…"). createdByUserId is a User.id uuid FK and the Manifest actor
      // context expects the internal employee id, so resolve the Clerk id to the
      // employee record. On the api-key path authResult.userId is already the
      // creator's employee uuid.
      const createdBy =
        authResult.authMethod === "session"
          ? (await requireCurrentUser()).id
          : authResult.userId!;

      // Delegate creation to Manifest runtime
      const result = await runManifestCommand({
        entity: "ApiKey",
        command: "create",
        body: {
          name,
          keyPrefix,
          hashedKey,
          scopes: requestedScopes,
          expiresAt: expiresAt ? new Date(expiresAt as string) : null,
          createdByUserId: createdBy,
          tenantId: authResult.tenantId,
        },
        user: {
          id: createdBy,
          tenantId: authResult.tenantId!,
          role: "admin",
        },
      });

      // Merge plainKey into the response so the caller sees it once
      if (result.status === 200 || result.status === 201) {
        const responseData = (await result.json()) as Record<string, unknown>;
        const record = (responseData.result ?? responseData) as Record<
          string,
          unknown
        >;
        return NextResponse.json({ ...record, plainKey }, { status: 201 });
      }

      return result;
    } catch (error) {
      captureException(error);
      log.error("[ApiKeys/create] Error:", error);
      return NextResponse.json(
        { message: "Failed to create API key" },
        { status: 500 }
      );
    }
  },
  { limit: 10, window: "1m" }
);
