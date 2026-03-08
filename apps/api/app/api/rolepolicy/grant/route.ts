/**
 * Role Policy Grant Permission API Endpoint
 * GENERATED ROUTE - DO NOT EDIT OR DELETE THIS MARKER
 * POST /api/rolepolicy/grant - Grant a permission to a role policy
 *
 * @version generated-commands v1.0.0
 * @generated
 */

import type { NextRequest } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

export const runtime = "nodejs";

/**
 * POST /api/rolepolicy/grant
 * Grant a permission to a role policy
 *
 * Body: { id: string, permission: string, grantedBy: string }
 */
export async function POST(request: NextRequest) {
  console.log("[RolePolicy/grant] Delegating to manifest grant command");

  return executeManifestCommand(request, {
    entityName: "RolePolicy",
    commandName: "grant",
    params: {},
    transformBody: (body, ctx) => ({
      id: body.id,
      permission: body.permission,
      grantedBy: ctx.userId,
    }),
  });
}
