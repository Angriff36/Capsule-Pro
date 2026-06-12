import type { NextRequest } from "next/server";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

export async function POST(request: NextRequest) {
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  return runManifestCommand({
    entity: "AllergenWarning",
    command: "acknowledge",
    body: rawBody,
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
