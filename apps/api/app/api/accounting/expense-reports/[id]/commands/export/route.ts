/**
 * POST /api/accounting/expense-reports/[id]/commands/export
 *
 * Generates a CSV or XLSX export of the expense report.
 * Returns the file inline for download.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

type Params = { params: Promise<{ id: string }> };

const ALLOWED_FORMATS = ["CSV", "XLSX", "QBO"] as const;
type ExportFormat = (typeof ALLOWED_FORMATS)[number];

function toCSV(report: Awaited<ReturnType<typeof fetchReport>>): string {
  const header = [
    "Report Title",
    "Employee",
    "Event",
    "Status",
    "Vendor",
    "Amount",
    "Transaction Date",
    "GL Account #",
    "GL Account Name",
    "Category",
    "Business Purpose",
    "Receipt Attached",
    "Notes",
  ].join(",");

  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const rows = (report?.receipts ?? []).map((r) =>
    [
      escape(report?.title),
      escape(report?.employeeName),
      escape(report?.eventName),
      escape(report?.status),
      escape(r.vendorName),
      r.amount,
      escape(new Date(r.transactionDate).toISOString().split("T")[0]),
      escape(r.glAccountNumber),
      escape(r.glAccountName),
      escape(r.category),
      escape(r.businessPurpose),
      r.receiptUrl ? "Yes" : "No",
      escape(r.notes),
    ].join(",")
  );

  return [header, ...rows].join("\n");
}

async function fetchReport(tenantId: string, id: string) {
  return database.expenseReport.findFirst({
    where: { tenantId, id },
    include: { receipts: { orderBy: { transactionDate: "asc" } } },
  });
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId || !userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const tenantId = await getTenantIdForOrg(orgId);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const format: ExportFormat =
      ALLOWED_FORMATS.includes(body.format) ? body.format : "CSV";

    const report = await fetchReport(tenantId, id);
    if (!report) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    if (report.status !== "approved") {
      return NextResponse.json(
        { message: "Only approved reports can be exported" },
        { status: 400 }
      );
    }

    if (format === "CSV") {
      const csv = toCSV(report);
      const filename = `expense-report-${id.slice(0, 8)}.csv`;

      // Mark report as exported
      await database.expenseReport.update({
        where: { id },
        data: { status: "exported", exportedAt: new Date(), exportFormat: "CSV" },
      });

      // Log the export record
      await database.expenseExport.create({
        data: {
          tenantId,
          expenseReportId: id,
          format: "CSV",
          status: "ready",
          recordCount: report.receipts.length,
          requestedBy: userId,
          generatedAt: new Date(),
        },
      });

      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // For XLSX and QBO: return a 202 indicating async generation needed
    // (wire up a background job / storage provider when ready)
    const exportRecord = await database.expenseExport.create({
      data: {
        tenantId,
        expenseReportId: id,
        format: format as "XLSX" | "QBO",
        status: "pending",
        requestedBy: userId,
      },
    });

    return NextResponse.json(
      {
        message: `${format} export queued`,
        data: exportRecord,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Error exporting expense report:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
