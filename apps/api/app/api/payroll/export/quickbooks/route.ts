import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { PayrollService, PrismaPayrollDataSource } from "@repo/payroll-engine";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const ExportQuickBooksRequestSchema = z.object({
  periodId: z.string().min(1),
  target: z.enum(["qbxml", "qbOnlineCsv"]),
});

/**
 * POST /api/payroll/export/quickbooks
 * Export payroll to QuickBooks format
 *
 * Body:
 * {
 *   periodId: string,
 *   target: "qbxml" | "qbOnlineCsv"
 * }
 *
 * Response:
 * {
 *   exportId: string,
 *   fileUrl: string,
 *   format: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    const body = await request.json();

    // Validate request body
    const parseResult = ExportQuickBooksRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { periodId, target } = parseResult.data;

    // Create payroll service with Prisma data source
    const dataSource = new PrismaPayrollDataSource(database);
    const payrollService = new PayrollService({
      dataSource,
      defaultJurisdiction: "US",
      enableAuditLog: true,
    });

    // Export to QuickBooks
    const result = await payrollService.exportToQuickBooks(
      tenantId,
      periodId,
      target,
      userId
    );

    // Determine file extension and MIME type
    const fileExtension = target === "qbxml" ? "qbxml" : "csv";
    const mimeType = target === "qbxml" ? "application/xml" : "text/csv";

    // In a production system, you might:
    // 1. Store the file in object storage (S3, GCS, etc.)
    // 2. Return a signed URL for download
    // For now, we'll return the content as a base64-encoded data URL

    const base64Content = Buffer.from(result.content).toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Content}`;

    return NextResponse.json({
      exportId: result.exportId,
      fileUrl: dataUrl,
      format: result.format,
      filename: `payroll-${periodId}.${fileExtension}`,
    });
  } catch (error) {
    console.error("QuickBooks export error:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to export to QuickBooks" },
      { status: 500 }
    );
  }
}
