import { database, type Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";
import {
  captureException,
  parsePaymentFilters,
} from "../validation";

/**
 * GET /api/accounting/payments/export
 * Export payments as CSV with the same filters as the list endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(request.url);

    const filters = parsePaymentFilters(searchParams);

    const where: Prisma.PaymentWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.methodType) {
      where.methodType = filters.methodType;
    }
    if (filters.invoiceId) {
      where.invoiceId = filters.invoiceId;
    }
    if (filters.eventId) {
      where.eventId = filters.eventId;
    }
    if (filters.clientId) {
      where.clientId = filters.clientId;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.processedAt = {};
      if (filters.dateFrom) {
        (where.processedAt as Prisma.DateTimeFilter<"Payment">).gte =
          new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        (where.processedAt as Prisma.DateTimeFilter<"Payment">).lte =
          new Date(filters.dateTo);
      }
    }
    if (filters.amountFrom || filters.amountTo) {
      where.amount = {};
      if (filters.amountFrom) {
        (where.amount as Prisma.DecimalFilter<"Payment">).gte =
          filters.amountFrom;
      }
      if (filters.amountTo) {
        (where.amount as Prisma.DecimalFilter<"Payment">).lte =
          filters.amountTo;
      }
    }

    const payments = await database.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "ID",
      "Amount",
      "Currency",
      "Status",
      "Method Type",
      "Invoice ID",
      "Event ID",
      "Client ID",
      "Gateway Transaction ID",
      "Processor",
      "Processed At",
      "Completed At",
      "Refunded At",
      "Created At",
    ];

    const csvRows = [
      headers.join(","),
      ...payments.map((p) =>
        [
          p.id,
          p.amount.toString(),
          p.currency,
          p.status,
          p.methodType,
          p.invoiceId,
          p.eventId,
          p.clientId ?? "",
          p.gatewayTransactionId ?? "",
          p.processor ?? "",
          p.processedAt?.toISOString() ?? "",
          p.completedAt?.toISOString() ?? "",
          p.refundedAt?.toISOString() ?? "",
          p.createdAt.toISOString(),
        ]
          .map((val) => `"${String(val).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];

    const csv = csvRows.join("\n");
    const dateStr = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="payments-${dateStr}.csv"`,
      },
    });
  } catch (error) {
    captureException(error);
    return NextResponse.json(
      { error: "Failed to export payments" },
      { status: 500 }
    );
  }
}
