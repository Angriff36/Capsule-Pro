// @generated — Generated from Manifest IR. DO NOT EDIT by hand; regenerate
// via the route projection. This dispatcher is the singular dynamic command
// route — all domain command POSTs route through here → guards, policies,
// constraints, actions, events.
//
// Canonical URL: POST /api/manifest/[entity]/commands/[command]
// Next.js maps the [entity] and [command] segments to the params object below.
//
// Architecture: this file is intentionally THIN. It owns:
//   - URL params + body parsing
//   - Auth/tenant resolution (via requireCurrentUser)
//   - instanceId extraction from the body
// It then delegates execution to runManifestCommand from
// @/lib/manifest/execute-command, which is the canonical shared command
// executor (resolveCommand → createManifestRuntime → runtime.runCommand →
// normalized response). The domain REST adapters under app/api/user/* and
// elsewhere already delegate through the same helper; the dispatcher must
// not duplicate that logic.

import type { NextRequest } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { manifestErrorResponse } from "@/lib/manifest-response";
import { requireCurrentUser } from "@/app/lib/tenant";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; command: string }> }
): Promise<Response> {
  try {
    const { entity, command } = await params;

    // Auth / tenant / user resolution (dispatcher-only responsibility).
    const currentUser = await requireCurrentUser();

    // Parse request body (dispatcher-only responsibility).
    const body = (await request
      .json()
      .catch(() => ({}))) as Record<string, unknown>;

    // instanceId extraction: for non-create commands, look at body.id or
    // body.<entity>Id. The shared executor uses instanceId to target the
    // correct entity instance.
    const entityCamel = entity.charAt(0).toLowerCase() + entity.slice(1);
    const rawId =
      command !== "create"
        ? (body.id ?? body[`${entityCamel}Id`])
        : undefined;
    const instanceId = rawId != null ? String(rawId) : undefined;

    return runManifestCommand({
      entity,
      command,
      body,
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
      ...(instanceId ? { instanceId } : {}),
    });
  } catch (error) {
    if (error instanceof InvariantError) {
      return manifestErrorResponse("Unauthorized", 401);
    }
    // Any other pre-execution error (e.g. params resolution). Execution
    // errors are caught inside runManifestCommand.
    console.error("[manifest/dispatcher] Pre-execution error:", error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
