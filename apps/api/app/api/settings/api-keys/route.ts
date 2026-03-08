/**
 * API Keys Management Endpoint
 *
 * GET /api/settings/api-keys - List all API keys for the tenant
 * POST /api/settings/api-keys - Create a new API key
 */

import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { generateApiKey } from "@/app/lib/api-key-service";
import { requireCurrentUser } from "@/app/lib/tenant";
import { withRateLimit } from "@/middleware/rate-limiter";

export const runtime = "nodejs";

/**
 * GET /api/settings/api-keys
 * List all API keys for the tenant (excluding hashed keys for security)
 */
export const GET = withRateLimit(
  async () => {
    try {
      const currentUser = await requireCurrentUser();

      const keys = await database.apiKey.findMany({
        where: {
          tenantId: currentUser.tenantId,
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
      console.error("[ApiKeys/list] Error:", error);
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
      const currentUser = await requireCurrentUser();

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

      // Check for duplicate name within tenant
      const existing = await database.apiKey.findFirst({
        where: {
          tenantId: currentUser.tenantId,
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
          tenantId: currentUser.tenantId,
          name,
          keyPrefix,
          hashedKey,
          scopes: Array.isArray(scopes) ? (scopes as string[]) : [],
          expiresAt: expiresAt ? new Date(expiresAt as string) : null,
          createdByUserId: currentUser.id,
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

      console.log("[ApiKeys/create] Created API key", {
        tenantId: currentUser.tenantId,
        keyId: apiKey.id,
        name: apiKey.name,
        userId: currentUser.id,
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
      console.error("[ApiKeys/create] Error:", error);
      return NextResponse.json(
        { message: "Failed to create API key" },
        { status: 500 }
      );
    }
  },
  { limit: 10, window: "1m" }
);
