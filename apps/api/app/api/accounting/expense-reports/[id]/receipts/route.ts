/**
 * Receipts for an Expense Report
 *
 * GET  /api/accounting/expense-reports/[id]/receipts  - List receipts
 * POST /api/accounting/expense-reports/[id]/receipts  - Add receipt
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { orgId } = await auth();
    if (!orgId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const tenantId = await getTenantIdForOrg(orgId);
    const { id: expenseReportId } = await params;

    const receipts = await database.expenseReceipt.findMany({
      where: { tenantId, expenseReportId },
      orderBy: { transactionDate: "desc" },
    });

    return NextResponse.json({ data: receipts });
  } catch (error) {
    console.error("Error listing receipts:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId } = await auth();
    if (!orgId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const tenantId = await getTenantIdForOrg(orgId);
    const { id: expenseReportId } = await params;
    const body = await request.json();

    const {
      vendorName,
      amount,
      transactionDate,
      category,
      glAccountId,
      glAccountNumber,
      glAccountName,
      businessPurpose,
      receiptUrl,
      notes,
      eventId,
      eventName,
    } = body;

    // Validation
    if (!vendorName?.trim()) {
      return NextResponse.json({ message: "Vendor name is required" }, { status: 400 });
    }
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ message: "Amount must be greater than zero" }, { status: 400 });
    }
    if (!transactionDate) {
      return NextResponse.json({ message: "Transaction date is required" }, { status: 400 });
    }
    if (!glAccountId) {
      return NextResponse.json({ message: "GL account (expense code) is required" }, { status: 400 });
    }
    if (!businessPurpose?.trim()) {
      return NextResponse.json({ message: "Specific business purpose is required" }, { status: 400 });
    }

    // Verify parent report exists and is editable
    const report = await database.expenseReport.findFirst({
      where: { tenantId, id: expenseReportId },
    });
    if (!report) {
      return NextResponse.json({ message: "Expense report not found" }, { status: 404 });
    }
    if (!["draft", "rejected"].includes(report.status)) {
      return NextResponse.json(
        { message: `Cannot add receipts to a report in '${report.status}' status` },
        { status: 400 }
      );
    }

    // Duplicate detection: same vendor + amount + date within tenant
    const potentialDuplicate = await database.expenseReceipt.findFirst({
      where: {
        tenantId,
        vendorName: { equals: vendorName.trim(), mode: "insensitive" },
        amount: Number(amount),
        transactionDate: new Date(transactionDate),
        id: { not: undefined },
      },
    });

    const receipt = await database.expenseReceipt.create({
      data: {
        tenantId,
        expenseReportId,
        vendorName: vendorName.trim(),
        amount: Number(amount),
        transactionDate: new Date(transactionDate),
        category: category ?? "",
        glAccountId,
        glAccountNumber: glAccountNumber ?? "",
        glAccountName: glAccountName ?? "",
        businessPurpose: businessPurpose.trim(),
        receiptUrl: receiptUrl ?? null,
        notes: notes ?? null,
        eventId: eventId || null,
        eventName: eventName ?? "",
        isDuplicate: !!potentialDuplicate,
        duplicateOfId: potentialDuplicate?.id ?? null,
      },
    });

    // Recalculate report total
    const allReceipts = await database.expenseReceipt.findMany({
      where: { tenantId, expenseReportId },
      select: { amount: true },
    });
    const newTotal = allReceipts.reduce((sum, r) => sum + Number(r.amount), 0);
    await database.expenseReport.update({
      where: { id: expenseReportId },
      data: { totalAmount: newTotal },
    });

    return NextResponse.json(
      { data: receipt, duplicateDetected: !!potentialDuplicate },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding receipt:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
