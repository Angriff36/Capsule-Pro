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
  vendorId: z.string().uuid().optional(),
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
  return match ? Number.parseInt(match[1], 10) : 30;
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

    // Build where conditions
    const conditions: string[] = ["po.tenant_id = $1", "po.deleted_at IS NULL"];
    const queryParams: (string | Date)[] = [tenantId];
    let paramIndex = 2;

    if (startDate) {
      conditions.push(`po.order_date >= $${paramIndex++}`);
      queryParams.push(startDate);
    }

    if (endDate) {
      conditions.push(`po.order_date <= $${paramIndex++}`);
      queryParams.push(endDate);
    }

    if (status) {
      conditions.push(`po.status = $${paramIndex++}`);
      queryParams.push(status);
    }

    if (vendorId) {
      conditions.push(`po.vendor_id = $${paramIndex++}`);
      queryParams.push(vendorId);
    }

    const whereClause = conditions.join(" AND ");

    // Fetch purchase orders with vendor and item data
    const purchaseOrders = await database.$queryRawUnsafe<
      Array<{
        id: string;
        poNumber: string;
        orderDate: Date;
        expectedDeliveryDate: Date | null;
        subtotal: number;
        taxAmount: number;
        shippingAmount: number;
        total: number;
        notes: string | null;
        status: string;
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
      }>
    >(
      `
      SELECT
        po.id,
        po.po_number as "poNumber",
        po.order_date as "orderDate",
        po.expected_delivery_date as "expectedDeliveryDate",
        CAST(po.subtotal AS FLOAT) as subtotal,
        CAST(po.tax_amount AS FLOAT) as "taxAmount",
        CAST(po.shipping_amount AS FLOAT) as "shippingAmount",
        CAST(po.total AS FLOAT) as total,
        po.notes,
        po.status,
        json_build_object(
          'id', v.id,
          'name', v.name,
          'email', v.email,
          'paymentTerms', v.payment_terms
        ) as vendor,
        COALESCE(
          (
            SELECT json_agg(json_build_object(
              'itemId', poi.item_id,
              'itemName', COALESCE(ii.name, 'Item'),
              'quantityOrdered', CAST(poi.quantity_ordered AS FLOAT),
              'unitCost', CAST(poi.unit_cost AS FLOAT),
              'totalCost', CAST(poi.total_cost AS FLOAT),
              'notes', poi.notes
            ))
            FROM tenant_inventory.purchase_order_items poi
            LEFT JOIN tenant_inventory.inventory_items ii ON ii.id = poi.item_id
            WHERE poi.purchase_order_id = po.id AND poi.deleted_at IS NULL
          ),
          '[]'::json
        ) as items
      FROM tenant_inventory.purchase_orders po
      LEFT JOIN tenant_inventory.inventory_suppliers v ON v.id = po.vendor_id AND v.deleted_at IS NULL
      WHERE ${whereClause}
      ORDER BY po.order_date DESC
      LIMIT 1000
      `,
      ...queryParams
    );

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

    // Return as base64-encoded content
    const base64Content = Buffer.from(result.content).toString("base64");
    const dataUrl = `data:${result.mimeType};base64,${base64Content}`;

    return NextResponse.json({
      filename: result.filename,
      fileUrl: dataUrl,
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
    console.error("QuickBooks bill export error:", error);

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
