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
    const body = await request.json();
    const { reason } = body;

    if (!reason?.trim()) {
      return NextResponse.json(
        { message: "Rejection reason is required" },
        { status: 400 }
      );
    }

    const report = await database.expenseReport.findFirst({ where: { tenantId, id } });
    if (!report) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    if (report.status !== "submitted") {
      return NextResponse.json(
        { message: "Can only reject submitted reports" },
        { status: 400 }
      );
    }

    const updated = await database.expenseReport.update({
      where: { id },
      data: {
        status: "rejected",
        rejectedAt: new Date(),
        rejectedBy: userId,
        rejectionReason: reason.trim(),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error rejecting expense report:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
