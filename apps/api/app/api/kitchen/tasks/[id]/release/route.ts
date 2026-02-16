import type { NextRequest } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

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

  console.log("[KitchenTask/release] Delegating to manifest release command", {
    taskId: id,
  });

  return executeManifestCommand(request, {
    entityName: "KitchenTask",
    commandName: "release",
    params: { id },
    transformBody: (body, ctx) => ({
      ...body,
      id,
      userId: ctx.userId,
    }),
  });
}
