import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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

  const activity = await database.adminTaskActivity.findMany({
    where: {
      AND: [{ tenantId }, { taskId: id }, { deletedAt: null }],
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: activity });
}
