/**
 * Expense Reports API
 *
 * GET  /api/accounting/expense-reports       - List expense reports
 * POST /api/accounting/expense-reports       - Create new expense report
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

export async function GET(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId || !userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const employeeId = searchParams.get("employeeId");
    const eventId = searchParams.get("eventId");

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;
    if (eventId) where.eventId = eventId;

    const reports = await database.expenseReport.findMany({
      where,
      include: {
        receipts: true,
        exports: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: reports });
  } catch (error) {
    console.error("Error listing expense reports:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId || !userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    const body = await request.json();

    const { title, notes, eventId, eventName, employeeName } = body;

    if (!title?.trim()) {
      return NextResponse.json(
        { message: "Report title is required" },
        { status: 400 }
      );
    }

    const report = await database.expenseReport.create({
      data: {
        tenantId,
        employeeId: userId,
        employeeName: employeeName ?? "",
        title: title.trim(),
        notes: notes ?? null,
        eventId: eventId || null,
        eventName: eventName ?? "",
        status: "draft",
        totalAmount: 0,
      },
    });

    return NextResponse.json({ data: report }, { status: 201 });
  } catch (error) {
    console.error("Error creating expense report:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
