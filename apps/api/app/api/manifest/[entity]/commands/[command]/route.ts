// @generated — Generated from Manifest IR. DO NOT EDIT.
// Singular dynamic command dispatcher.
// All domain command POSTs route through here → guards, policies, constraints, actions, events.

import type { NextRequest } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; command: string }> }
): Promise<Response> {
  const { entity, command } = await params;

  // ── Auth / tenant / user resolution ──
  const currentUser = await requireCurrentUser();

  // ── Parse request body ──
  const body = await request.json().catch(() => ({}));

  // ── Delegate to shared helper (IR validation, runtime, execution) ──
  return runManifestCommand({
    entity,
    command,
    body,
    user: {
      id: currentUser.id,
      tenantId: currentUser.tenantId,
      role: currentUser.role,
    },
  });
}
