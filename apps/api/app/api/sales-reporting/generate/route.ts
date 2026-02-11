import { generateSalesReport } from "@capsule-pro/sales-reporting";
import { auth } from "@repo/auth/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const ReportConfigSchema = z.object({
  reportType: z.enum(["weekly", "monthly", "quarterly"]),
  dateRange: z.object({
    start: z.string().min(1),
    end: z.string().min(1),
  }),
  companyName: z.string().trim().min(1).optional(),
  dateColumn: z.string().trim().min(1).optional(),
});

const getFileType = (fileName: string): "csv" | "xlsx" | null => {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".csv")) {
    return "csv";
  }
  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    return "xlsx";
  }
  return null;
};

export async function POST(request: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const configRaw = formData.get("config");
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "At least one CSV or XLSX file is required" },
        { status: 400 }
      );
    }

    if (typeof configRaw !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid report config payload" },
        { status: 400 }
      );
    }

    let configValue: unknown;
    try {
      configValue = JSON.parse(configRaw);
    } catch {
      return NextResponse.json(
        { error: "Config must be valid JSON" },
        { status: 400 }
      );
    }

    const parsedConfig = ReportConfigSchema.safeParse(configValue);
    if (!parsedConfig.success) {
      return NextResponse.json(
        {
          error: "Invalid report config",
          issues: parsedConfig.error.issues,
        },
        { status: 400 }
      );
    }

    const unsupportedFile = files.find(
      (file) => getFileType(file.name) === null
    );
    if (unsupportedFile) {
      return NextResponse.json(
        {
          error: `Unsupported file type for "${unsupportedFile.name}". Only CSV/XLSX are allowed.`,
        },
        { status: 400 }
      );
    }

    const reportFiles = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        data: Buffer.from(await file.arrayBuffer()),
        type: getFileType(file.name) as "csv" | "xlsx",
      }))
    );

    const pdfBuffer = await generateSalesReport({
      files: reportFiles,
      config: parsedConfig.data,
    });

    const now = new Date().toISOString().slice(0, 10);
    const fileName = `sales-report-${parsedConfig.data.reportType}-${now}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
