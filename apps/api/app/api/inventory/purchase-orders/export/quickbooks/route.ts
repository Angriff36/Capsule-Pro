/**
 * @module PurchaseOrdersExportQuickBooks
 * @intent Export purchase orders as bills to QuickBooks format
 * @responsibility Generate QuickBooks-compatible bill exports for purchase orders
 * @domain Inventory, Finance
 * @tags inventory, purchase-orders, export, quickbooks, bills
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
  type BillLineItem,
  type BillRecord,
  exportBills,
  type QBBillExportOptions,
} from "@/app/lib/quickbooks-bill-export";
import { getTenantIdForOrg } from "@/app/lib/tenant";

/**
 * Request schema for QuickBooks bill export
 */
const QuickBooksBillExportRequestSchema = z.object({
  /** Filter by start date */
  startDate: z.string().optional(),
  /** Filter by end date */
  endDate: z.string().optional(),
  /** Filter by purchase order status */
  status: z.string().optional(),
  /** Filter by vendor ID */
  vendorId: z.uuid().optional(),
  /** Export format */
  format: z.enum(["qbOnlineCsv", "iif"]).default("qbOnlineCsv"),
  /** Date format */
  dateFormat: z.enum(["us", "iso"]).default("us"),
  /** Payment terms in days */
  paymentTerms: z.number().min(0).max(365).default(30),
  /** Account mappings */
  accountMappings: z
    .object({
      expenseAccount: z.string().optional(),
      accountsPayable: z.string().optional(),
      taxCode: z.string().optional(),
      nonTaxCode: z.string().optional(),
      inventoryItem: z.string().optional(),
      shippingItem: z.string().optional(),
    })
    .optional(),
});

/** Regex to extract payment terms days from strings like "NET_30", "Net 30", "30" */
const PAYMENT_TERMS_REGEX = /(\d+)/;

/**
 * Parse payment terms string to days
 */
function parsePaymentTerms(terms: string | null): number {
  if (!terms) {
    return 30;
  }
  const match = terms.match(PAYMENT_TERMS_REGEX);
  return match?.[1] ? Number.parseInt(match[1], 10) : 30;
}

/**
 * Convert purchase order data to bill record
 */
function purchaseOrderToBill(
  po: {
    id: string;
    poNumber: string;
    orderDate: Date;
    expectedDeliveryDate: Date | null;
    subtotal: number;
    taxAmount: number;
    shippingAmount: number;
    total: number;
    notes: string | null;
    vendor: {
      id: string;
      name: string;
      email: string | null;
      paymentTerms: string | null;
    } | null;
    items: Array<{
      itemId: string;
      itemName: string;
      quantityOrdered: number;
      unitCost: number;
      totalCost: number;
      notes: string | null;
    }>;
  },
  defaultPaymentTerms: number
): BillRecord {
  const vendorName =
    po.vendor?.name || `Vendor-${po.vendor?.id?.slice(0, 8) || "Unknown"}`;
  const billNumber = `BILL-${po.poNumber}`;
  const billDate = new Date(po.orderDate);
  const dueDate = new Date(billDate);

  // Calculate due date based on vendor payment terms
  const termsDays = po.vendor?.paymentTerms
    ? parsePaymentTerms(po.vendor.paymentTerms)
    : defaultPaymentTerms;
  dueDate.setDate(dueDate.getDate() + termsDays);

  // Build line items from PO items
  const lineItems: BillLineItem[] = po.items.map((item) => ({
    item: item.itemName || "Inventory Item",
    description: item.notes || item.itemName || "Inventory purchase",
    quantity: item.quantityOrdered,
    unitCost: item.unitCost,
    amount: item.totalCost,
    taxable: true,
    serviceDate: po.orderDate,
  }));

  // If no items, create a single line item from subtotal
  if (lineItems.length === 0 && po.subtotal > 0) {
    lineItems.push({
      item: "Inventory Purchase",
      description: `Purchase Order ${po.poNumber}`,
      quantity: 1,
      unitCost: po.subtotal,
      amount: po.subtotal,
      taxable: true,
      serviceDate: po.orderDate,
    });
  }

  return {
    billNumber,
    vendorName,
    billDate,
    dueDate,
    lineItems,
    subtotal: po.subtotal,
    taxAmount: po.taxAmount,
    shippingAmount: po.shippingAmount,
    totalAmount: po.total,
    memo: po.notes || `Purchase Order: ${po.poNumber}`,
    currency: "USD",
    terms: po.vendor?.paymentTerms || `Net ${defaultPaymentTerms}`,
  };
}

/**
 * POST /api/inventory/purchase-orders/export/quickbooks
 *
 * Export purchase orders as bills to QuickBooks format.
 *
 * Request body:
 * {
 *   startDate?: string,        // Filter POs from this date (YYYY-MM-DD)
 *   endDate?: string,          // Filter POs until this date (YYYY-MM-DD)
 *   status?: string,           // Filter by PO status
 *   vendorId?: string,         // Filter by vendor ID
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
 *   purchaseOrdersExported: number,
 *   totalAmount: number
 * }
 *
 * @example
 * // Export all approved/received POs in January 2024
 * POST /api/inventory/purchase-orders/export/quickbooks
 * {
 *   "startDate": "2024-01-01",
 *   "endDate": "2024-01-31",
 *   "status": "received"
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
    const parseResult = QuickBooksBillExportRequestSchema.safeParse(body);

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
      vendorId,
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
      const orderDateFilter: Record<string, Date> = {};
      if (startDate) {
        orderDateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        orderDateFilter.lte = new Date(endDate);
      }
      where.orderDate = orderDateFilter;
    }

    if (status) {
      where.status = status;
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    // Fetch purchase orders with items via Prisma ORM.
    // ponytail: top-level select narrows to exactly the consumed fields —
    // select is a column projection, so the strict-subset map below is byte-identical;
    // Prisma narrows the return type so a dropped consumed field is a compile error.
    const rawPOs = await database.purchaseOrder.findMany({
      where,
      select: {
        id: true,
        poNumber: true,
        orderDate: true,
        expectedDeliveryDate: true,
        subtotal: true,
        taxAmount: true,
        shippingAmount: true,
        total: true,
        notes: true,
        status: true,
        vendorId: true,
        items: {
          where: { deletedAt: null },
          select: {
            itemId: true,
            quantityOrdered: true,
            unitCost: true,
            totalCost: true,
            notes: true,
          },
        },
      },
      orderBy: { orderDate: "desc" },
      take: 1000,
    });

    // Collect unique vendor IDs and item IDs for batch lookup
    const vendorIds = [...new Set(rawPOs.map((po) => po.vendorId))];
    const itemIds = [
      ...new Set(rawPOs.flatMap((po) => po.items.map((item) => item.itemId))),
    ];

    // Batch-fetch vendors and inventory items
    const [vendors, inventoryItems] = await Promise.all([
      vendorIds.length > 0
        ? database.inventorySupplier.findMany({
            where: {
              id: { in: vendorIds },
              deletedAt: null,
            },
            select: {
              id: true,
              name: true,
              email: true,
              payment_terms: true,
            },
          })
        : [],
      itemIds.length > 0
        ? database.inventoryItem.findMany({
            where: { id: { in: itemIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);

    const vendorMap = new Map(vendors.map((v) => [v.id, v]));
    const itemMap = new Map(inventoryItems.map((i) => [i.id, i.name]));

    // Map to the shape expected by purchaseOrderToBill
    const purchaseOrders = rawPOs.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      orderDate: po.orderDate,
      expectedDeliveryDate: po.expectedDeliveryDate,
      subtotal: Number(po.subtotal),
      taxAmount: Number(po.taxAmount),
      shippingAmount: Number(po.shippingAmount),
      total: Number(po.total),
      notes: po.notes,
      status: po.status,
      vendor: (() => {
        const v = vendorMap.get(po.vendorId);
        return v
          ? {
              id: v.id,
              name: v.name,
              email: v.email,
              paymentTerms: v.payment_terms,
            }
          : null;
      })(),
      items: po.items.map((item) => ({
        itemId: item.itemId,
        itemName: itemMap.get(item.itemId) || "Item",
        quantityOrdered: Number(item.quantityOrdered),
        unitCost: Number(item.unitCost),
        totalCost: Number(item.totalCost),
        notes: item.notes,
      })),
    }));

    if (purchaseOrders.length === 0) {
      return NextResponse.json(
        { error: "No purchase orders found matching criteria" },
        { status: 404 }
      );
    }

    // Convert purchase orders to bill records
    const bills: BillRecord[] = purchaseOrders.map((po) =>
      purchaseOrderToBill(po, paymentTerms)
    );

    // Export options
    const exportOptions: QBBillExportOptions = {
      dateFormat,
      paymentTerms,
      accountMappings,
    };

    // Generate export
    const result = exportBills(bills, format, exportOptions);

    // Calculate total amount
    const totalAmount = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);

    // Upload to object storage and return download URL
    const storageResult = await uploadFile({
      tenantId,
      path: `exports/purchase-orders/${result.filename}`,
      body: Buffer.from(result.content),
      contentType: result.mimeType,
    });

    return NextResponse.json({
      filename: result.filename,
      fileUrl: storageResult.url,
      contentType: result.mimeType,
      format: result.format,
      purchaseOrdersExported: purchaseOrders.length,
      totalAmount,
      filters: {
        startDate,
        endDate,
        status,
        vendorId,
      },
    });
  } catch (error) {
    captureException(error);
    log.error("QuickBooks bill export error:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      {
        error: "Failed to export bills to QuickBooks",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
