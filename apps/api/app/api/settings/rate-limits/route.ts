/**
 * Rate Limits Management Endpoint
 *
 * GET /api/settings/rate-limits - List all rate limit configurations for the tenant
 * POST /api/settings/rate-limits - Create a new rate limit configuration
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";
import {
  manifestErrorResponse,
  manifestSuccessResponse,
} from "@/lib/manifest-response";

/**
 * GET /api/settings/rate-limits
 * List all rate limit configurations for the tenant (read-only, Prisma)
 */
export async function GET() {
  try {
    const { orgId, userId: clerkId } = await auth();
    if (!(clerkId && orgId)) {
      return manifestErrorResponse("Unauthorized", 401);
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return manifestErrorResponse("Tenant not found", 400);
    }

    const configs = await database.rateLimitConfig.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    return manifestSuccessResponse({ rateLimitConfigs: configs });
  } catch (error) {
    captureException(error);
    log.error("[rate-limits/list] Error:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}

/**
 * POST /api/settings/rate-limits
 * Create a new rate limit configuration via Manifest command
 */
export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "RateLimitConfig",
    commandName: "create",
    transformBody: (body) => ({
      name: body.name || "",
      endpointPattern: body.endpointPattern || "",
      windowMs: body.windowMs ?? 60_000,
      maxRequests: body.maxRequests ?? 100,
      burstAllowance: body.burstAllowance ?? 0,
      priority: body.priority ?? 0,
      isActive: body.isActive ?? true,
    }),
  });
}
