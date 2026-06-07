/**
 * Role Policy Update API Endpoint
 * GENERATED ROUTE - DO NOT EDIT OR DELETE THIS MARKER
 * POST /api/rolepolicy/update - Update a role policy
 *
 * @version generated-commands v1.0.0
 */

import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

/**
 * POST /api/rolepolicy/update
 * Update a role policy's properties
 *
 * Body: { id: string, roleName?: string, permissions?: string, description?: string, isActive?: boolean }
 */
export async function POST(request: NextRequest) {
  log.info("[RolePolicy/update] Delegating to manifest update command");

  const user = await resolveCurrentUser(request);
  const rawBody = await request.json().catch(() => ({})) as Record<string, unknown>;

  return runManifestCommand({
    entity: "RolePolicy",
    command: "update",
    body: {
      id: rawBody.id,
      roleName: rawBody.roleName,
      permissions: rawBody.permissions,
      description: rawBody.description,
      isActive: rawBody.isActive,
    },
    user: {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
    },
  });
}
