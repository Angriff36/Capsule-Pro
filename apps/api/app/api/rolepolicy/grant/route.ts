/**
 * Role Policy Grant Permission API Endpoint
 * GENERATED ROUTE - DO NOT EDIT OR DELETE THIS MARKER
 * POST /api/rolepolicy/grant - Grant a permission to a role policy
 *
 * @version generated-commands v1.0.0
 * @generated
 */

import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

/**
 * POST /api/rolepolicy/grant
 * Grant a permission to a role policy
 *
 * Body: { id: string, permission: string, grantedBy: string }
 */
export async function POST(request: NextRequest) {
  log.info("[RolePolicy/grant] Delegating to manifest grant command");

  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  return runManifestCommand({
    entity: "RolePolicy",
    command: "grant",
    body: {
      id: rawBody.id,
      permission: rawBody.permission,
      grantedBy: user.id,
    },
    user: {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
    },
  });
}
