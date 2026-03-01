import type { NextRequest } from "next/server";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

/**
 * POST /api/inventory/alerts/subscribe
 * Create an alert subscription via manifest runtime.
 * Body: { channel: "email"|"slack"|"webhook", destination: string }
 */
export function POST(request: NextRequest) {
  return executeManifestCommand(request, {
    entityName: "AlertsConfig",
    commandName: "create",
    transformBody: (body, ctx) => ({
      ...body,
      tenantId: ctx.tenantId,
    }),
  });
}
