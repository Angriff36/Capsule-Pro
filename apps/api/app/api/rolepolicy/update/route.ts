/**
 * Role Policy Update API Endpoint
 * GENERATED ROUTE - DO NOT EDIT OR DELETE THIS MARKER
 * POST /api/rolepolicy/update - Update a role policy
 *
 * @version generated-commands v1.0.0
 */

import type { NextRequest } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";
import { log } from "@repo/observability/log";

export const runtime = "nodejs";

/**
 * POST /api/rolepolicy/update
 * Update a role policy's properties
 *
 * Body: { id: string, roleName?: string, permissions?: string, description?: string, isActive?: boolean }
 */
export async function POST(request: NextRequest) {
  log.info("[RolePolicy/update] Delegating to manifest update command");

  return executeManifestCommand(request, {
    entityName: "RolePolicy",
    commandName: "update",
    params: {},
    transformBody: (body) => ({
      id: body.id,
      roleName: body.roleName,
      permissions: body.permissions,
      description: body.description,
      isActive: body.isActive,
    }),
  });
}
