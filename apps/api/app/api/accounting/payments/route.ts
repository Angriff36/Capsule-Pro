/**
 * Payments API Routes
 *
 * Handles payment processing, refunds, and fraud detection
 */

import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/app/lib/tenant";
import {
  generatePaymentNumber,
  type PaymentListResponse,
  type PaymentResponse,
  parsePaginationParams,
  parsePaymentFilters,
  validateCreatePaymentRequest,
} from "./validation";

/**
 * GET /api/accounting/payments
 * List all payments with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(request.url);

    const filters = parsePaymentFilters(searchParams);
    const { page, limit } = parsePaginationParams(searchParams);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortDirection = searchParams.get("sortDirection") || "desc";

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.methodType) {
      where.methodType = filters.methodType;
    }

    if (filters.fraudStatus) {
      where.fraudStatus = filters.fraudStatus;
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
        where.processedAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.processedAt.lte = new Date(filters.dateTo);
      }
    }

    if (filters.amountFrom || filters.amountTo) {
      where.amount = {};
      if (filters.amountFrom) {
        where.amount.gte = filters.amountFrom;
      }
      if (filters.amountTo) {
        where.amount.lte = filters.amountTo;
      }
    }

    // Get payments with related data
    const [payments, totalCount] = await Promise.all([
      database.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDirection },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              total: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              eventDate: true,
            },
          },
          client: {
            select: {
              id: true,
              company_name: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
      }),
      database.payment.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json<PaymentListResponse>({
      data: payments.map((p) => ({
        ...p,
        clientName:
          p.client?.company_name ||
          [p.client?.first_name, p.client?.last_name]
            .filter(Boolean)
            .join(" ") ||
          null,
        eventName: p.event?.title || null,
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error listing payments:", error);
    return NextResponse.json(
      { error: "Failed to list payments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/payments
 * Create a new payment
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const body = await request.json();

    validateCreatePaymentRequest(body);

    // Verify invoice exists and belongs to tenant
    const invoice = await database.invoice.findFirst({
      where: {
        tenantId,
        id: body.invoiceId,
        deletedAt: null,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Verify event exists and belongs to tenant
    const event = await database.event.findFirst({
      where: {
        tenantId,
        id: body.eventId,
        deletedAt: null,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Generate payment reference
    const paymentNumber = generatePaymentNumber(tenantId);

    // Create payment
    const payment = await database.payment.create({
      data: {
        tenantId,
        invoiceId: body.invoiceId,
        eventId: body.eventId,
        clientId: invoice.clientId,
        amount: body.amount,
        currency: body.currency || "USD",
        methodType: body.methodType,
        gatewayPaymentMethodId: body.paymentMethodId,
        description: body.description,
        metadata: body.metadata || {},
        externalReference: paymentNumber,
        processedAt: new Date(),
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            eventDate: true,
          },
        },
        client: {
          select: {
            id: true,
            company_name: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json<PaymentResponse>(payment, { status: 201 });
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
