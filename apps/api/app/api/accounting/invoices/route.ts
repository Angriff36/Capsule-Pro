/**
 * Invoices API Routes
 *
 * Handles invoice creation, management, and payment tracking
 * POST delegates to Manifest runtime for governed writes (Task 8.2)
 */

import { database, type Prisma } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { translatePrismaError } from "@/lib/prisma-error";
import {
  calculateInvoiceTotals,
  generateInvoiceNumber,
  type InvoiceListResponse,
  type InvoiceResponse,
  parseInvoiceFilters,
  parsePaginationParams,
  validateCreateInvoiceRequest,
} from "./validation";

export const runtime = "nodejs";

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
              companyName: true,
              firstName: true,
              lastName: true,
            },
          },
          linkedEvent: {
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
        // Column no longer exists in the truthful schema; kept for response shape.
        voidedAt: null,
        clientName:
          inv.client?.companyName ||
          [inv.client?.firstName, inv.client?.lastName]
            .filter(Boolean)
            .join(" ") ||
          "",
        eventName: inv.linkedEvent?.title || null,
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    captureException(error);
    const prismaResult = translatePrismaError(error);
    if (prismaResult.mapped) {
      return NextResponse.json(
        { error: prismaResult.message },
        { status: prismaResult.status }
      );
    }
    log.error("Error listing invoices:", error);
    return NextResponse.json(
      { error: "Failed to list invoices" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/invoices
 * Create a new invoice via Manifest runtime.
 *
 * Pre-validation reads (event/client existence, totals, due date) happen before
 * the governed write. The Manifest command handles the actual create + RBAC + audit + events.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await resolveCurrentUser(request);
    const body = await request.json();

    validateCreateInvoiceRequest(body);

    // --- Pre-validation reads (bypass Manifest per constitution §10) ---

    // Verify event exists and belongs to tenant
    const event = await database.event.findFirst({
      where: {
        tenantId: user.tenantId,
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
        tenantId: user.tenantId,
        id: clientId,
        deletedAt: null,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // --- Pre-computation (pure, no writes) ---

    const lineItems = body.lineItems || [];
    const { subtotal, taxAmount, total } = calculateInvoiceTotals(lineItems);

    const paymentTerms = body.paymentTerms ?? client.defaultPaymentTerms ?? 30;
    const issuedAt = new Date();
    const dueDate = body.dueDate
      ? new Date(body.dueDate)
      : new Date(issuedAt.getTime() + paymentTerms * 24 * 60 * 60 * 1000);

    const invoiceNumber = generateInvoiceNumber(user.tenantId);

    let depositRequired: number | null = null;
    if (body.depositPercentage && body.invoiceType === "DEPOSIT") {
      depositRequired = (total * body.depositPercentage) / 100;
    }

    // --- Governed write via Manifest runtime ---

    return runManifestCommand({
      entity: "Invoice",
      command: "create",
      body: {
        tenantId: user.tenantId,
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
        depositPaid: null,
        issuedAt,
        notes: body.notes ?? "",
        internalNotes: body.internalNotes ?? "",
        lineItems: lineItems.length > 0 ? JSON.stringify(lineItems) : "[]",
        metadata: body.metadata ? JSON.stringify(body.metadata) : "{}",
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  } catch (error) {
    captureException(error);
    const prismaResult = translatePrismaError(error);
    if (prismaResult.mapped) {
      return NextResponse.json(
        { error: prismaResult.message },
        { status: prismaResult.status }
      );
    }
    log.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
