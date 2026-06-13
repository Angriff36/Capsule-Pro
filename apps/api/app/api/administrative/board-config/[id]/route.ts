import type { NextRequest } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

/**
 * PATCH /api/administrative/board-config/[id]
 *
 * Routes to the governed BoardConfig command matching the payload:
 * columns present → updateColumns, otherwise → updateSettings.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (rawBody.columns) {
    return runCommand({
      entity: "BoardConfig",
      command: "updateColumns",
      body: { columns: rawBody.columns },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
      instanceId: id,
    });
  }

  return runCommand({
    entity: "BoardConfig",
    command: "updateSettings",
    body: { settings: rawBody.settings ?? {} },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
    instanceId: id,
  });
}
