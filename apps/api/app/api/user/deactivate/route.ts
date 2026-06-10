import type { NextRequest } from "next/server";
import { captureException } from "@sentry/nextjs";
import { requireCurrentUser } from "@/app/lib/tenant";
import { manifestErrorResponse } from "@/lib/manifest-response";
import { runManifestCommand } from "@/lib/manifest/execute-command";

/**
 * User deactivate command handler.
 * Routes to the User.deactivate manifest command.
 *
 * Includes self-deactivation prevention: a user cannot deactivate their own
 * account. This prevents accidental lockout where the last admin loses access.
 *
 * POST /api/user/deactivate
 * Body: { userId: string, reason: string }
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const currentUser = await requireCurrentUser();
    const body = await request.json().catch(() => ({}));

    // Self-deactivation prevention — if the caller targets their own userId,
    // refuse to process. This prevents lockout when the caller is the only admin.
    if (body.userId && body.userId === currentUser.id) {
      return manifestErrorResponse("Cannot deactivate your own account", 403);
    }

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
  } catch (error) {
    // Auth/tenant resolution errors from requireCurrentUser should return 401.
    if (error instanceof Error && error.name === "InvariantError") {
      return manifestErrorResponse(error.message, 401);
    }
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
