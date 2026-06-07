/**
 * API Key Rotate Endpoint
 *
 * POST /api/settings/api-keys/:id/rotate - Rotate (regenerate) an API key (Manifest runtime)
 */

import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { generateApiKey } from "@/app/lib/api-key-service";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { withRateLimit } from "@/middleware/rate-limiter";

export const runtime = "nodejs";

/**
 * POST /api/settings/api-keys/:id/rotate
 * Rotate (regenerate) an API key — delegated to Manifest runtime
 *
 * Generates a new key and updates the hashed key and prefix.
 * Returns the new plain key (only time it's shown).
 * Useful for key rotation without changing other properties.
 */
export const POST = withRateLimit(
  async (_request, context) => {
    try {
      const currentUser = await requireCurrentUser();
      const params = await context.params;
      if (!params) {
        return NextResponse.json(
          { message: "Invalid request" },
          { status: 400 }
        );
      }
      const id = String(params.id);

      // Check if key exists and belongs to tenant
      const existing = await database.apiKey.findUnique({
        where: {
          tenantId_id: {
            tenantId: currentUser.tenantId,
            id,
          },
        },
      });

      if (!existing || existing.deletedAt) {
        return NextResponse.json(
          { message: "API key not found" },
          { status: 404 }
        );
      }

      if (existing.revokedAt) {
        return NextResponse.json(
          { message: "Cannot rotate a revoked API key" },
          { status: 400 }
        );
      }

      // Generate a new API key (crypto — must happen outside Manifest)
      const { plainKey, hashedKey, keyPrefix } = generateApiKey();

      // Delegate rotation to Manifest runtime
      const result = await runManifestCommand({
        entity: "ApiKey",
        command: "rotate",
        body: {
          id,
          hashedKey,
          keyPrefix,
          tenantId: currentUser.tenantId,
        },
        user: {
          id: currentUser.id,
          tenantId: currentUser.tenantId,
          role: currentUser.role,
        },
      });

      // Merge plainKey into the response so the caller sees it once
      if (result.status === 200) {
        const responseData = (await result.json()) as Record<string, unknown>;
        const record = (responseData.result ?? responseData) as Record<
          string,
          unknown
        >;
        return NextResponse.json({ ...record, plainKey });
      }

      return result;
    } catch (error) {
      captureException(error);
      log.error("[ApiKeys/rotate] Error:", error);
      return NextResponse.json(
        { message: "Failed to rotate API key" },
        { status: 500 }
      );
    }
  },
  { limit: 10, window: "1m" }
);
