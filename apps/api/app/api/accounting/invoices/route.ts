/**
 * Invoices API Routes
 *
 * Handles invoice creation, management, and payment tracking
 */

import { database, type Prisma } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";
import {
  calculateInvoiceTotals,
  generateInvoiceNumber,
  type InvoiceListResponse,
  type InvoiceResponse,
  parseInvoiceFilters,
  parsePaginationParams,
  validateCreateInvoiceRequest,
} from "./validation";

/**
 * GET /api/accounting/invoices
 * List all invoices with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(request.url);

    const filters = parseInvoiceFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDirection = searchParams.get("sortDirection") || "desc";

    const skip = (page - 1) * limit;

    // Build where clause with proper typing
    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.invoiceType) {
      where.invoiceType = filters.invoiceType;
    }

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters.eventId) {
      where.eventId = filters.eventId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.issuedAt = {};
      if (filters.dateFrom) {
        (where.issuedAt as Prisma.DateTimeFilter<"Invoice">).gte = new Date(
          filters.dateFrom
        );
      }
      if (filters.dateTo) {
        (where.issuedAt as Prisma.DateTimeFilter<"Invoice">).lte = new Date(
          filters.dateTo
        );
      }
    }

    if (filters.dueFrom || filters.dueTo) {
      where.dueDate = {};
      if (filters.dueFrom) {
        (where.dueDate as Prisma.DateTimeFilter<"Invoice">).gte = new Date(
          filters.dueFrom
        );
      }
      if (filters.dueTo) {
        (where.dueDate as Prisma.DateTimeFilter<"Invoice">).lte = new Date(
          filters.dueTo
        );
      }
    }

    if (filters.overdue) {
      where.status = { in: ["SENT", "VIEWED", "PARTIALLY_PAID"] };
      where.dueDate = { lt: new Date() };
    }

    if (filters.isPaidInFull) {
      where.amountDue = { lte: 0.01 };
    }

    // Get invoices with related data
    const [invoices, totalCount] = await Promise.all([
      database.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDirection },
        include: {
          client: {
            select: {
              id: true,
              company_name: true,
              first_name: true,
              last_name: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      database.invoice.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json<InvoiceListResponse>({
      data: invoices.map((inv) => ({
        ...inv,
        subtotal: inv.subtotal.toString(),
        taxAmount: inv.taxAmount.toString(),
        discountAmount: inv.discountAmount.toString(),
        total: inv.total.toString(),
        amountPaid: inv.amountPaid.toString(),
        amountDue: inv.amountDue.toString(),
        depositPercentage: inv.depositPercentage?.toString() ?? null,
        depositRequired: inv.depositRequired?.toString() ?? null,
        depositPaid: inv.depositPaid?.toString() ?? null,
        lineItems: inv.lineItems as InvoiceResponse["lineItems"],
        metadata: inv.metadata as Record<string, unknown>,
        clientName:
          inv.client?.company_name ||
          [inv.client?.first_name, inv.client?.last_name]
            .filter(Boolean)
            .join(" ") ||
          "",
        eventName: inv.event?.title || null,
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error listing invoices:", error);
    return NextResponse.json(
      { error: "Failed to list invoices" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/invoices
 * Create a new invoice
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const body = await request.json();

    validateCreateInvoiceRequest(body);

    // Verify event exists and belongs to tenant
    const event = await database.event.findFirst({
      where: {
        tenantId,
        id: body.eventId,
        deletedAt: null,
      },
      include: {
        client: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Use event's client if not specified
    const clientId = body.clientId || event.clientId;

    if (!clientId) {
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 }
      );
    }

    // Verify client exists and belongs to tenant
    const client = await database.client.findFirst({
      where: {
        tenantId,
        id: clientId,
        deletedAt: null,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Calculate totals from line items
    const lineItems = body.lineItems || [];
    const { subtotal, taxAmount, total } = calculateInvoiceTotals(lineItems);

    // Calculate due date
    const paymentTerms = body.paymentTerms ?? client.defaultPaymentTerms ?? 30;
    const issuedAt = new Date();
    const dueDate = body.dueDate
      ? new Date(body.dueDate)
      : new Date(issuedAt.getTime() + paymentTerms * 24 * 60 * 60 * 1000);

    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber(tenantId);

    // Calculate deposit if applicable
    let depositRequired: number | null = null;
    const depositPaid = null;
    if (body.depositPercentage && body.invoiceType === "DEPOSIT") {
      depositRequired = (total * body.depositPercentage) / 100;
    }

    // Create invoice
    const invoice = await database.invoice.create({
      data: {
        tenantId,
        invoiceNumber,
        invoiceType: body.invoiceType || "FINAL_PAYMENT",
        status: "DRAFT",
        clientId,
        eventId: body.eventId,
        subtotal,
        taxAmount,
        discountAmount: 0,
        total,
        amountPaid: 0,
        amountDue: total,
        paymentTerms,
        dueDate,
        depositPercentage: body.depositPercentage ?? null,
        depositRequired,
        depositPaid,
        issuedAt,
        notes: body.notes ?? undefined,
        internalNotes: body.internalNotes ?? undefined,
        lineItems:
          lineItems.length > 0
            ? (lineItems as Prisma.InputJsonValue)
            : undefined,
        metadata: (body.metadata as Prisma.InputJsonValue) ?? {},
      },
      include: {
        client: {
          select: {
            id: true,
            company_name: true,
            first_name: true,
            last_name: true,
            email: true,
            defaultPaymentTerms: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            eventDate: true,
          },
        },
      },
    });

    return NextResponse.json<InvoiceResponse>(
      {
        ...invoice,
        subtotal: invoice.subtotal.toString(),
        taxAmount: invoice.taxAmount.toString(),
        discountAmount: invoice.discountAmount.toString(),
        total: invoice.total.toString(),
        amountPaid: invoice.amountPaid.toString(),
        amountDue: invoice.amountDue.toString(),
        depositPercentage: invoice.depositPercentage?.toString() ?? null,
        depositRequired: invoice.depositRequired?.toString() ?? null,
        depositPaid: invoice.depositPaid?.toString() ?? null,
        lineItems: invoice.lineItems as InvoiceResponse["lineItems"],
        metadata: invoice.metadata as Record<string, unknown>,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
