/**
 * API Key Revoke Endpoint
 *
 * POST /api/settings/api-keys/:id/revoke - Revoke an API key
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { API_SCOPES } from "@/lib/api-scopes";
import { requireDualAuth } from "@/middleware/dual-auth";
import { withRateLimit } from "@/middleware/rate-limiter";

export const runtime = "nodejs";

/**
 * POST /api/settings/api-keys/:id/revoke
 * Revoke an API key (sets revokedAt timestamp)
 *
 * Unlike soft delete, revocation is for security purposes (compromised key).
 * A revoked key cannot be used for authentication.
 */
export const POST = withRateLimit(
  async (request: Request, context) => {
    try {
      const authResult = await requireDualAuth(request, API_SCOPES.ADMIN);
      if (!(authResult.authenticated && authResult.tenantId)) {
        return authResult.error!;
      }

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
            tenantId: authResult.tenantId!,
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
          { message: "API key is already revoked" },
          { status: 400 }
        );
      }

      // Self-revocation prevention.
      // Why: (1) revoking the key currently being used would terminate the
      // request session and could leave automated callers without recovery;
      // (2) revoking a key you created should be intentional via a different
      // identity to avoid lockout / accidental self-DoS. Both branches return
      // 403 so the UI can surface a clear error.
      if (
        authResult.authMethod === "api_key" &&
        authResult.apiKeyContext?.id === id
      ) {
        return NextResponse.json(
          { message: "Cannot revoke the API key currently in use" },
          { status: 403 }
        );
      }

      let currentInternalUserId: string | null = null;
      if (authResult.authMethod === "api_key") {
        currentInternalUserId = authResult.userId;
      } else {
        let clerkId: string | null = null;
        try {
          const authData = await auth();
          clerkId = authData?.userId ?? null;
        } catch {
          clerkId = null;
        }
        if (clerkId) {
          const u = await database.user.findFirst({
            where: {
              AND: [{ tenantId: authResult.tenantId! }, { authUserId: clerkId }],
            },
            select: { id: true },
          });
          currentInternalUserId = u?.id ?? null;
        }
      }

      if (
        currentInternalUserId &&
        existing.createdByUserId === currentInternalUserId
      ) {
        return NextResponse.json(
          { message: "Cannot revoke an API key you created" },
          { status: 403 }
        );
      }

      // Revoke the key
      const revoked = await database.apiKey.update({
        where: {
          tenantId_id: {
            tenantId: authResult.tenantId!,
            id,
          },
        },
        data: {
          revokedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          revokedAt: true,
        },
      });

      log.info("[ApiKeys/revoke] Revoked API key", {
        tenantId: authResult.tenantId,
        keyId: id,
        userId: authResult.userId,
      });

      return NextResponse.json(revoked);
    } catch (error) {
      captureException(error);
      log.error("[ApiKeys/revoke] Error:", error);
      return NextResponse.json(
        { message: "Failed to revoke API key" },
        { status: 500 }
      );
    }
  },
  { limit: 10, window: "1m" }
);
