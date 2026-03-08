/**
 * Role Policy Revoke Permission API Endpoint
 * GENERATED ROUTE - DO NOT EDIT OR DELETE THIS MARKER
 * POST /api/rolepolicy/revoke - Revoke a permission from a role policy
 *
 * @version generated-commands v1.0.0
 */

import type { NextRequest } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

export const runtime = "nodejs";

/**
 * POST /api/rolepolicy/revoke
 * Revoke a permission from a role policy
 *
 * Body: { id: string, permission: string, revokedBy: string }
 */
export async function POST(request: NextRequest) {
  console.log("[RolePolicy/revoke] Delegating to manifest revoke command");

  return executeManifestCommand(request, {
    entityName: "RolePolicy",
    commandName: "revoke",
    params: {},
    transformBody: (body, ctx) => ({
      id: body.id,
      permission: body.permission,
      revokedBy: ctx.userId,
    }),
  });
}
