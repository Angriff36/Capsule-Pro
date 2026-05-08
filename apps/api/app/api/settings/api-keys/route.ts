/**
 * API Keys Management Endpoint
 *
 * GET /api/settings/api-keys - List all API keys for the tenant
 * POST /api/settings/api-keys - Create a new API key
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { generateApiKey } from "@/app/lib/api-key-service";
import { API_SCOPES, VALID_SCOPES } from "@/lib/api-scopes";
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
 * Create a new API key
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

      // Generate the API key
      const { plainKey, hashedKey, keyPrefix } = generateApiKey();

      // Create the API key record
      const apiKey = await database.apiKey.create({
        data: {
          tenantId: authResult.tenantId,
          name,
          keyPrefix,
          hashedKey,
          scopes: requestedScopes,
          expiresAt: expiresAt ? new Date(expiresAt as string) : null,
          createdByUserId: authResult.userId!,
        },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          scopes: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      log.info("[ApiKeys/create] Created API key", {
        tenantId: authResult.tenantId,
        keyId: apiKey.id,
        name: apiKey.name,
        userId: authResult.userId,
      });

      // Return the key WITH the plain key (only time it's shown)
      return NextResponse.json(
        {
          ...apiKey,
          plainKey, // Only returned on creation
        },
        { status: 201 }
      );
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
