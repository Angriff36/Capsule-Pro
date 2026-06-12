/**
 * @module EventsExportQuickBooks
 * @intent Export events as invoices to QuickBooks format
 * @responsibility Generate QuickBooks-compatible invoice exports for events
 * @domain Events, Finance
 * @tags events, export, quickbooks, invoices
 * @canonical true
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { uploadFile } from "@repo/storage";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  exportInvoices,
  type InvoiceLineItem,
  type InvoiceRecord,
  type QBInvoiceExportOptions,
} from "@/app/lib/quickbooks-invoice-export";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * Request schema for QuickBooks invoice export
 */
const QuickBooksExportRequestSchema = z.object({
  /** Filter by start date */
  startDate: z.string().optional(),
  /** Filter by end date */
  endDate: z.string().optional(),
  /** Filter by event status */
  status: z.string().optional(),
  /** Export format */
  format: z.enum(["qbOnlineCsv", "iif"]).default("qbOnlineCsv"),
  /** Date format */
  dateFormat: z.enum(["us", "iso"]).default("us"),
  /** Payment terms in days */
  paymentTerms: z.number().min(0).max(365).default(30),
  /** Account mappings */
  accountMappings: z
    .object({
      incomeAccount: z.string().optional(),
      taxCode: z.string().optional(),
      nonTaxCode: z.string().optional(),
      cateringItem: z.string().optional(),
      serviceChargeItem: z.string().optional(),
      discountItem: z.string().optional(),
    })
    .optional(),
});

/**
 * Convert event data to invoice record
 */
function eventToInvoice(
  event: {
    id: string;
    eventNumber: string | null;
    title: string;
    eventDate: Date;
    guestCount: number;
    budget: number | null;
    client: {
      id: string;
      companyName: string | null;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
      defaultPaymentTerms: number | null;
    } | null;
    budgetItems: Array<{
      category: string;
      description: string | null;
      budgetedAmount: number | null;
      actualAmount: number | null;
    }>;
  },
  paymentTerms: number
): InvoiceRecord {
  const customerName =
    event.client?.companyName ||
    (event.client?.firstName && event.client?.lastName
      ? `${event.client.firstName} ${event.client.lastName}`
      : `Customer-${event.id.slice(0, 8)}`);

  const invoiceNumber = `INV-${event.eventNumber || event.id.slice(0, 8)}`;
  const invoiceDate = new Date(event.eventDate);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(
    dueDate.getDate() + (event.client?.defaultPaymentTerms || paymentTerms)
  );

  // Build line items from budget items
  const lineItems: InvoiceLineItem[] = [];

  if (event.budgetItems && event.budgetItems.length > 0) {
    // Group budget items by category
    const groupedItems = new Map<
      string,
      { total: number; description: string }
    >();

    for (const item of event.budgetItems) {
      const amount = item.actualAmount || item.budgetedAmount || 0;
      if (amount > 0) {
        const existing = groupedItems.get(item.category) || {
          total: 0,
          description: "",
        };
        existing.total += amount;
        existing.description = item.description || item.category;
        groupedItems.set(item.category, existing);
      }
    }

    // Convert to line items
    for (const [category, data] of groupedItems) {
      lineItems.push({
        item: category,
        description: data.description,
        quantity: 1,
        rate: data.total,
        amount: data.total,
        taxable: true,
        serviceDate: event.eventDate,
      });
    }
  }

  // If no budget items, use overall budget as single line item
  if (lineItems.length === 0 && event.budget && event.budget > 0) {
    lineItems.push({
      item: "Catering Services",
      description: `${event.title} - ${event.guestCount} guests`,
      quantity: 1,
      rate: event.budget,
      amount: event.budget,
      taxable: true,
      serviceDate: event.eventDate,
    });
  }

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = 0; // Tax would be calculated based on jurisdiction
  const discountAmount = 0;
  const totalAmount = subtotal + taxAmount - discountAmount;

  return {
    invoiceNumber,
    customerName,
    customerEmail: event.client?.email,
    invoiceDate,
    dueDate,
    lineItems,
    subtotal,
    taxAmount,
    discountAmount,
    totalAmount,
    memo: `Event: ${event.title}`,
    currency: "USD",
  };
}

/**
 * POST /api/events/export/quickbooks
 *
 * Export events as invoices to QuickBooks format.
 *
 * Request body:
 * {
 *   startDate?: string,        // Filter events from this date (YYYY-MM-DD)
 *   endDate?: string,          // Filter events until this date (YYYY-MM-DD)
 *   status?: string,           // Filter by event status
 *   format?: "qbOnlineCsv" | "iif",  // Export format (default: qbOnlineCsv)
 *   dateFormat?: "us" | "iso", // Date format (default: us)
 *   paymentTerms?: number,     // Payment terms in days (default: 30)
 *   accountMappings?: { ... }  // Optional QuickBooks account mappings
 * }
 *
 * Response:
 * {
 *   filename: string,
 *   content: string,           // Base64-encoded file content
 *   contentType: string,
 *   eventsExported: number,
 *   totalAmount: number
 * }
 *
 * @example
 * // Export all completed events in January 2024
 * POST /api/events/export/quickbooks
 * {
 *   "startDate": "2024-01-01",
 *   "endDate": "2024-01-31",
 *   "status": "completed"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await auth();

    if (!(orgId && userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);

    // Parse and validate request body
    const body = await request.json();
    const parseResult = QuickBooksExportRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    const {
      startDate,
      endDate,
      status,
      format,
      dateFormat,
      paymentTerms,
      accountMappings,
    } = parseResult.data;

    // Build Prisma where clause
    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (startDate || endDate) {
      const eventDateFilter: Record<string, Date> = {};
      if (startDate) {
        eventDateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        eventDateFilter.lte = new Date(endDate);
      }
      where.eventDate = eventDateFilter;
    }

    if (status) {
      where.status = status;
    }

    // Fetch events with client and budget data via Prisma ORM
    const rawEvents = await database.event.findMany({
      where,
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
        budgets: {
          where: { deletedAt: null },
          include: {
            lineItems: true,
          },
        },
      },
      orderBy: { eventDate: "desc" },
      take: 1000,
    });

    // Map Prisma result to the shape expected by eventToInvoice
    const events = rawEvents.map((e) => ({
      id: e.id,
      eventNumber: e.eventNumber,
      title: e.title,
      eventDate: e.eventDate,
      guestCount: e.guestCount,
      budget: e.budget ? Number(e.budget) : null,
      status: e.status,
      client: e.client
        ? {
            id: e.client.id,
            companyName: e.client.company_name,
            firstName: e.client.first_name,
            lastName: e.client.last_name,
            email: e.client.email,
            defaultPaymentTerms: e.client.defaultPaymentTerms,
          }
        : null,
      budgetItems: e.budgets.flatMap((b) =>
        b.lineItems.map((li) => ({
          category: li.category,
          description: li.description,
          budgetedAmount: li.budgetedAmount ? Number(li.budgetedAmount) : null,
          actualAmount: li.actualAmount ? Number(li.actualAmount) : null,
        }))
      ),
    }));

    if (events.length === 0) {
      return NextResponse.json(
        { error: "No events found matching criteria" },
        { status: 404 }
      );
    }

    // Convert events to invoice records
    const invoices: InvoiceRecord[] = events.map((event) =>
      eventToInvoice(event, paymentTerms)
    );

    // Export options
    const exportOptions: QBInvoiceExportOptions = {
      dateFormat,
      paymentTerms,
      accountMappings,
    };

    // Generate export
    const result = exportInvoices(invoices, format, exportOptions);

    // Calculate total amount
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    // Upload to object storage and return download URL
    const storageResult = await uploadFile({
      tenantId,
      path: `exports/events/${result.filename}`,
      body: Buffer.from(result.content),
      contentType: result.mimeType,
    });

    return NextResponse.json({
      filename: result.filename,
      fileUrl: storageResult.url,
      contentType: result.mimeType,
      format: result.format,
      eventsExported: events.length,
      totalAmount,
      filters: {
        startDate,
        endDate,
        status,
      },
    });
  } catch (error) {
    captureException(error);
    log.error("QuickBooks invoice export error:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: "Failed to export invoices to QuickBooks",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
