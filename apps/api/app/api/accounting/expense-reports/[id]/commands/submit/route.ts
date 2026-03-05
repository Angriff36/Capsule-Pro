import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId || !userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const tenantId = await getTenantIdForOrg(orgId);
    const { id } = await params;

    const report = await database.expenseReport.findFirst({
      where: { tenantId, id },
      include: { receipts: true },
    });

    if (!report) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    if (!["draft", "rejected"].includes(report.status)) {
      return NextResponse.json(
        { message: `Cannot submit report in '${report.status}' status` },
        { status: 400 }
      );
    }
    if (!report.receipts.length) {
      return NextResponse.json(
        { message: "Cannot submit report with no receipts" },
        { status: 400 }
      );
    }

    const updated = await database.expenseReport.update({
      where: { id },
      data: { status: "submitted", submittedAt: new Date() },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error submitting expense report:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
