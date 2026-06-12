import type { NextRequest } from "next/server";
import { captureException } from "@sentry/nextjs";
import { requireCurrentUser } from "@/app/lib/tenant";
import { manifestErrorResponse } from "@/lib/manifest-response";
import { runManifestSaga } from "@/lib/manifest/execute-saga";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context?: { params?: Promise<{ saga: string }> }
): Promise<Response> {
  try {
    if (!context?.params) {
      return manifestErrorResponse("Missing route params", 400);
    }

    const { saga } = await context.params;
    const currentUser = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as {
      steps?: Record<
        string,
        { instanceId?: string; input?: Record<string, unknown> }
      >;
      correlationId?: string;
    };

    return await runManifestSaga({
      saga,
      steps: body.steps ?? {},
      correlationId: body.correlationId,
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "InvariantError") {
      return manifestErrorResponse(error.message, 401);
    }
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
