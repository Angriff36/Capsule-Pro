import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runCommand } from "@/lib/manifest/execute-command";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { id } = await params;

  const fileRefs = await database.adminTaskFileRef.findMany({
    where: {
      AND: [{ tenantId }, { taskId: id }, { deletedAt: null }],
    },
  });

  return NextResponse.json({ data: fileRefs });
}

/**
 * POST /api/administrative/tasks/[id]/file-refs
 * Link an existing file via the governed AdminTaskFileRef.create command.
 * Linker identity is server-resolved, never trusted from the client.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await resolveCurrentUser(request);
  const rawBody = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  return runCommand({
    entity: "AdminTaskFileRef",
    command: "create",
    body: {
      refType: rawBody.refType,
      refId: rawBody.refId,
      refLabel: rawBody.refLabel ?? "",
      taskId: id,
      linkedBy: user.id,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
