import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(request.url);

    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    const status = searchParams.get("status");
    if (status) {
      where.status = status;
    }

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        (where.createdAt as Record<string, string>).gte = dateFrom;
      }
      if (dateTo) {
        (where.createdAt as Record<string, string>).lte = dateTo;
      }
    }

    const payments = await database.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        methodType: true,
        processor: true,
        createdAt: true,
        completedAt: true,
        invoice: { select: { invoiceNumber: true } },
        client: {
          select: { companyName: true, firstName: true, lastName: true },
        },
      },
    });

    const csvHeader =
      "Payment ID,Invoice,Client,Amount,Currency,Status,Method,Processor,Created,Completed\n";
    const csvRows = payments
      .map((p) => {
        const client =
          p.client?.companyName ||
          [p.client?.firstName, p.client?.lastName]
            .filter(Boolean)
            .join(" ") ||
          "";
        return [
          p.id,
          p.invoice?.invoiceNumber || "",
          `"${client}"`,
          p.amount.toString(),
          p.currency,
          p.status,
          p.methodType,
          p.processor || "",
          p.createdAt.toISOString(),
          p.completedAt?.toISOString() || "",
        ].join(",");
      })
      .join("\n");

    const csv = csvHeader + csvRows;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="payments-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    log.error("Error exporting payments:", error);
    return NextResponse.json(
      { error: "Failed to export payments" },
      { status: 500 }
    );
  }
}
