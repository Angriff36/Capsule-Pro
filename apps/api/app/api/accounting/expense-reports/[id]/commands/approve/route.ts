import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId || !userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const tenantId = await getTenantIdForOrg(orgId);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const approverName: string = body.approverName ?? "";

    const report = await database.expenseReport.findFirst({ where: { tenantId, id } });
    if (!report) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    if (report.status !== "submitted") {
      return NextResponse.json(
        { message: "Can only approve submitted reports" },
        { status: 400 }
      );
    }

    const updated = await database.expenseReport.update({
      where: { id },
      data: {
        status: "approved",
        approvedAt: new Date(),
        approvedBy: userId,
        approverName,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error approving expense report:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
