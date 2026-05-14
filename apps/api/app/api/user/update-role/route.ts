import type { NextRequest } from "next/server";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { requireCurrentUser } from "@/app/lib/tenant";

/**
 * User update-role command handler.
 * Routes to the User.updateRole manifest command.
 *
 * POST /api/user/update-role
 * Body: { userId: string, newRole: string }
 */
export async function POST(request: NextRequest): Promise<Response> {
  const currentUser = await requireCurrentUser();
  const body = await request.json().catch(() => ({}));

  return runManifestCommand({
    entity: "User",
    command: "updateRole",
    body: {
      userId: body.userId,
      newRole: body.newRole,
    },
    user: {
      id: currentUser.id,
      tenantId: currentUser.tenantId,
      role: currentUser.role,
    },
    instanceId: body.userId ?? undefined,
  });
}