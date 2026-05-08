import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { PayrollService, PrismaPayrollDataSource } from "@repo/payroll-engine";
import { uploadFile } from "@repo/storage";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { withRateLimit } from "@/middleware/rate-limiter";

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
export const POST = withRateLimit<Record<string, string | string[]>>(
  async (
    request: Request,
    _context?: { params?: Promise<Record<string, string | string[]>> }
  ) => {
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

      const fileExtension = target === "qbxml" ? "qbxml" : "csv";
      const mimeType = target === "qbxml" ? "application/xml" : "text/csv";

      const storageResult = await uploadFile({
        tenantId,
        path: `exports/payroll/${result.exportId}.${fileExtension}`,
        body: Buffer.from(result.content),
        contentType: mimeType,
      });

      return NextResponse.json({
        exportId: result.exportId,
        fileUrl: storageResult.url,
        format: result.format,
        filename: `payroll-${periodId}.${fileExtension}`,
      });
    } catch (error) {
      captureException(error);
      log.error("QuickBooks export error:", error);

      if (error instanceof Error && error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json(
        { error: "Failed to export to QuickBooks" },
        { status: 500 }
      );
    }
  },
  { limit: 20, window: "1m" }
);
