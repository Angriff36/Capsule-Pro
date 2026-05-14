import type { NextRequest } from "next/server";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { requireCurrentUser } from "@/app/lib/tenant";

/**
 * User deactivate command handler.
 * Routes to the User.deactivate manifest command.
 *
 * POST /api/user/deactivate
 * Body: { userId: string, reason: string }
 */
export async function POST(request: NextRequest): Promise<Response> {
  const currentUser = await requireCurrentUser();
  const body = await request.json().catch(() => ({}));

  return runManifestCommand({
    entity: "User",
    command: "deactivate",
    body: {
      userId: body.userId,
      reason: body.reason,
    },
    user: {
      id: currentUser.id,
      tenantId: currentUser.tenantId,
      role: currentUser.role,
    },
    instanceId: body.userId ?? undefined,
  });
}