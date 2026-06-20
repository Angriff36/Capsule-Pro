// Batch command transport. Executes an ordered array of governed commands in a
// single database transaction (all-or-nothing) via the canonical wrapper.
// Thin: resolves auth + body, then delegates to runManifestBatch — no business
// logic here (constitution §4a/§5).

import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";
import {
  type ManifestBatchOperation,
  runManifestBatch,
} from "@/lib/manifest/execute-command";
import { manifestErrorResponse } from "@/lib/manifest-response";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const currentUser = await requireCurrentUser();
    const body = (await request.json().catch(() => ({}))) as {
      operations?: ManifestBatchOperation[];
    };

    return await runManifestBatch({
      operations: body.operations ?? [],
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
    });
  } catch (error) {
    // Auth/tenant resolution errors from requireCurrentUser → 401 (mirrors the
    // singular command dispatcher).
    if (error instanceof Error && error.name === "InvariantError") {
      return manifestErrorResponse(error.message, 401);
    }
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
