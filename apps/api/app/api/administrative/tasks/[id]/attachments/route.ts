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

  const attachments = await database.adminTaskAttachment.findMany({
    where: {
      AND: [{ tenantId }, { taskId: id }, { deletedAt: null }],
    },
  });

  return NextResponse.json({ data: attachments });
}

/**
 * POST /api/administrative/tasks/[id]/attachments
 * Create an attachment via the governed AdminTaskAttachment.create command.
 * Uploader identity is server-resolved, never trusted from the client.
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
    entity: "AdminTaskAttachment",
    command: "create",
    body: {
      fileName: rawBody.fileName,
      fileUrl: rawBody.fileUrl,
      fileSize: rawBody.fileSize ?? 0,
      mimeType: rawBody.mimeType ?? "",
      taskId: id,
      uploadedBy: user.id,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });
}
