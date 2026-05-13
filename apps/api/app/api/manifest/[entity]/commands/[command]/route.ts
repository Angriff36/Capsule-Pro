// @generated — Generated from Manifest IR. DO NOT EDIT.
// Singular dynamic command dispatcher.
// All domain command POSTs route through here → guards, policies, constraints, actions, events.

import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { requireCurrentUser } from "@/app/lib/tenant";
import { manifestErrorResponse } from "@/lib/manifest-response";
import { runCommand } from "@/lib/manifest/execute-command"; // runCommand = runManifestCommand alias; name required for audit-routes RUNTIME_COMMAND_RE

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; command: string }> }
): Promise<Response> {
  const { entity, command } = await params;

  // ── Auth / tenant / user resolution ──
  let currentUser: Awaited<ReturnType<typeof requireCurrentUser>>;
  try {
    currentUser = await requireCurrentUser();
  } catch (error) {
    log.error("Auth error in manifest dispatcher:", error);
    return manifestErrorResponse("Unauthorized", 401);
  }

  if (!currentUser.tenantId) {
    return manifestErrorResponse("Tenant not found", 400);
  }

  // ── Parse request body ──
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return manifestErrorResponse("Invalid JSON body", 400);
  }

  // ── Delegate to shared helper (IR validation, runtime, execution) ──
  try {
    return await runCommand({
      entity,
      command,
      body,
      user: {
        id: currentUser.id,
        tenantId: currentUser.tenantId,
        role: currentUser.role,
      },
    });
  } catch (error) {
    log.error(`Error executing ${entity}.${command}:`, error);
    return manifestErrorResponse("Internal server error", 500);
  }
}