// @generated — Generated from Manifest IR. DO NOT EDIT.
// Singular dynamic command dispatcher.
// All domain command POSTs route through here → guards, policies, constraints, actions, events.

import type { NextRequest } from "next/server";
import { captureException } from "@sentry/nextjs";
import { requireCurrentUser } from "@/app/lib/tenant";
import { manifestErrorResponse } from "@/lib/manifest-response";
import { runManifestCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; command: string }> }
): Promise<Response> {
  try {
    const { entity, command: commandSlug } = await params;
    const currentUser = await requireCurrentUser();
    const body = await request.json().catch(() => ({}));

    return runManifestCommand({
      entity,
      command: commandSlug,
      body,
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
    });
  } catch (error) {
    captureException(error);
    return manifestErrorResponse("Internal server error", 500);
  }
}
