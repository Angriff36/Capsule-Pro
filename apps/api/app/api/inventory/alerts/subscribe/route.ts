import type { NextRequest } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

/**
 * POST /api/inventory/alerts/subscribe
 * Create an alert subscription via manifest runtime.
 * Body: { channel: "email"|"slack"|"webhook", destination: string }
 */
export async function POST(request: NextRequest) {
  const user = await resolveCurrentUser(request);
  const rawBody = await request.json().catch(() => ({})) as Record<string, unknown>;
  return runManifestCommand({
    entity: "AlertsConfig",
    command: "create",
    body: {
      ...rawBody,
      tenantId: user.tenantId,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
