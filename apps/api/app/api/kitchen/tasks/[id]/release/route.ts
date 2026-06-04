import { log } from "@repo/observability/log";
import type { NextRequest } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Release a task claim via manifest runtime.
 *
 * Delegates to the KitchenTask.release manifest command which handles
 * claim lookup, release, status transitions, progress tracking, and
 * event emission through guards and policies.
 *
 * POST /api/kitchen/tasks/:id/release
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const user = await resolveCurrentUser(request);
  const rawBody = await request.json().catch(() => ({})) as Record<string, unknown>;

  log.info("[KitchenTask/release] Delegating to manifest release command", {
    taskId: id,
  });

  return runManifestCommand({
    entity: "KitchenTask",
    command: "release",
    body: {
      ...rawBody,
      id,
      userId: user.id,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
