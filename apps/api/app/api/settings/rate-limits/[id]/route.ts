/**
 * Rate Limit Configuration Detail Endpoint
 *
 * GET /api/settings/rate-limits/[id] - Get a single rate limit configuration
 * PATCH /api/settings/rate-limits/[id] - Update a rate limit configuration
 * DELETE /api/settings/rate-limits/[id] - Soft delete a rate limit configuration
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/settings/rate-limits/[id]
 * Get a single rate limit configuration
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const { id } = await params;

    const config = await database.rateLimitConfig.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!config) {
      return manifestErrorResponse("Rate limit configuration not found", 404);
    }

    return manifestSuccessResponse({ config });
  } catch (error) {
    captureException(error);
    log.error("[rate-limits/detail] Error", { error });
    return manifestErrorResponse("Internal server error", 500);
  }
}

/**
 * PATCH /api/settings/rate-limits/[id]
 * Update a rate limit configuration via Manifest command
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  return runManifestCommand({
    entity: "RateLimitConfig",
    command: "update",
    body: {
      id,
      name: rawBody.name ?? "",
      endpointPattern: rawBody.endpointPattern ?? "",
      windowMs: rawBody.windowMs ?? 60_000,
      maxRequests: rawBody.maxRequests ?? 100,
      burstAllowance: rawBody.burstAllowance ?? 0,
      priority: rawBody.priority ?? 0,
      isActive: rawBody.isActive ?? true,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}

/**
 * DELETE /api/settings/rate-limits/[id]
 * Soft delete a rate limit configuration (via Manifest command)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const user = await resolveCurrentUser(request);

  return runManifestCommand({
    entity: "RateLimitConfig",
    command: "softDelete",
    body: { id },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
