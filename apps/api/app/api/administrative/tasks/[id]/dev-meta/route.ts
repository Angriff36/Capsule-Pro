import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { executeManifestCommand } from "@/lib/manifest-command-handler";

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

  const devMeta = await database.adminTaskDevMeta.findFirst({
    where: {
      AND: [{ tenantId }, { taskId: id }],
    },
  });

  return NextResponse.json({ data: devMeta });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return executeManifestCommand(request, {
    entityName: "AdminTaskDevMeta",
    commandName: "create",
    transformBody: (body) => ({
      ...body,
      taskId: id,
    }),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);

  // Find existing dev meta by taskId
  const existingDevMeta = await database.adminTaskDevMeta.findFirst({
    where: {
      AND: [{ tenantId }, { taskId: id }],
    },
  });

  if (!existingDevMeta) {
    return NextResponse.json(
      { message: "Dev meta not found" },
      { status: 404 }
    );
  }

  return executeManifestCommand(request, {
    entityName: "AdminTaskDevMeta",
    commandName: "update",
    params: { id: existingDevMeta.id },
  });
}
