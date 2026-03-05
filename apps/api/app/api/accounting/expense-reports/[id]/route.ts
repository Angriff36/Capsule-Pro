/**
 * Expense Report by ID
 *
 * GET    /api/accounting/expense-reports/[id]  - Get single report
 * PATCH  /api/accounting/expense-reports/[id]  - Update report
 * DELETE /api/accounting/expense-reports/[id]  - Delete draft report
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const tenantId = await getTenantIdForOrg(orgId);
    const { id } = await params;

    const report = await database.expenseReport.findFirst({
      where: { tenantId, id },
      include: {
        receipts: { orderBy: { transactionDate: "desc" } },
        exports: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!report) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: report });
  } catch (error) {
    console.error("Error fetching expense report:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const tenantId = await getTenantIdForOrg(orgId);
    const { id } = await params;
    const body = await request.json();

    const existing = await database.expenseReport.findFirst({
      where: { tenantId, id },
    });
    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    if (!["draft", "rejected"].includes(existing.status)) {
      return NextResponse.json(
        { message: `Cannot edit report in '${existing.status}' status` },
        { status: 400 }
      );
    }

    const { title, notes, eventId, eventName } = body;

    if (title !== undefined && !title?.trim()) {
      return NextResponse.json(
        { message: "Report title cannot be empty" },
        { status: 400 }
      );
    }

    const updated = await database.expenseReport.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(notes !== undefined && { notes }),
        ...(eventId !== undefined && { eventId: eventId || null }),
        ...(eventName !== undefined && { eventName }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Error updating expense report:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const tenantId = await getTenantIdForOrg(orgId);
    const { id } = await params;

    const existing = await database.expenseReport.findFirst({
      where: { tenantId, id },
    });
    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    if (existing.status !== "draft") {
      return NextResponse.json(
        { message: "Only draft reports can be deleted" },
        { status: 400 }
      );
    }

    // Delete receipts first, then the report
    await database.expenseReceipt.deleteMany({ where: { expenseReportId: id } });
    await database.expenseReport.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting expense report:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
