"use client";

import {
  getPurchaseOrder as _getPurchaseOrder,
  getPurchaseOrderItem,
  listPurchaseOrderItems as _listPurchaseOrderItems,
  listPurchaseOrders as _listPurchaseOrders,
  purchaseOrderItemRecordQuantityReceived,
  purchaseOrderItemUpdateQualityStatus,
  purchaseOrderMarkPartiallyReceived,
  purchaseOrderMarkReceived,
} from "@/app/lib/manifest-client.generated";
import type {
  PurchaseOrder as GeneratedPurchaseOrder,
  PurchaseOrderItem as GeneratedPurchaseOrderItem,
} from "@/app/lib/manifest-types.generated";
// Type definitions matching the API response
export const PO_STATUSES = [
  "draft",
  "submitted",
  "confirmed",
  "partial",
  "received",
  "cancelled",
] as const;
export type POStatus = (typeof PO_STATUSES)[number];

export const QUALITY_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "needs_inspection",
] as const;
export type QualityStatus = (typeof QUALITY_STATUSES)[number];

export const DISCREPANCY_TYPES = [
  "none",
  "shortage",
  "overage",
  "damaged",
  "wrong_item",
] as const;
export type DiscrepancyType = (typeof DISCREPANCY_TYPES)[number];

export interface POItem {
  created_at: Date;
  deleted_at: Date | null;
  discrepancy_amount: number | null;
  discrepancy_type: DiscrepancyType | null;
  id: string;
  item_id: string;
  notes: string | null;
  purchase_order_id: string;
  quality_status: QualityStatus;
  quantity_ordered: number;
  quantity_received: number;
  tenant_id: string;
  total_cost: number;
  unit_cost: number;
  unit_id: number;
  updated_at: Date;
}

export interface POItemWithDetails extends POItem {
  item_name?: string;
  item_number?: string;
}

export interface PurchaseOrder {
  actual_delivery_date: Date | null;
  created_at: Date;
  deleted_at: Date | null;
  expected_delivery_date: Date | null;
  id: string;
  location_id: string;
  notes: string | null;
  order_date: Date;
  po_number: string;
  received_at: Date | null;
  received_by: string | null;
  shipping_amount: number;
  status: POStatus;
  submitted_at: Date | null;
  submitted_by: string | null;
  subtotal: number;
  tax_amount: number;
  tenant_id: string;
  total: number;
  updated_at: Date;
  vendor_id: string;
}

export interface PurchaseOrderWithDetails extends PurchaseOrder {
  items: POItemWithDetails[];
  location_name?: string;
  progress?: {
    total_items: number;
    received_items: number;
    percentage: number;
  };
  vendor_name?: string;
}

export interface PurchaseOrderListFilters {
  location_id?: string;
  po_number?: string;
  search?: string;
  status?: POStatus;
  vendor_id?: string;
}

export interface UpdateQuantityReceivedRequest {
  quantity_received: number;
}

export interface UpdateQualityStatusRequest {
  discrepancy_amount?: number;
  discrepancy_type?: DiscrepancyType;
  notes?: string;
  quality_status: QualityStatus;
}

export interface CompleteReceivingRequest {
  items: Array<{
    id: string;
    quantity_received: number;
    quality_status: QualityStatus;
    discrepancy_type?: DiscrepancyType;
    discrepancy_amount?: number;
    notes?: string;
  }>;
  notes?: string;
}

export interface PurchaseOrderListResponse {
  data: PurchaseOrderWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Client-side functions for purchase order operations
 */

function mapPoItem(row: GeneratedPurchaseOrderItem): POItemWithDetails {
  return {
    id: row.id,
    tenant_id: row.tenantId,
    purchase_order_id: row.purchaseOrderId,
    item_id: row.itemId,
    quantity_ordered: row.quantityOrdered ?? 0,
    quantity_received: row.quantityReceived ?? 0,
    unit_id: row.unitId ?? 0,
    unit_cost: row.unitCost ?? 0,
    total_cost: row.totalCost ?? 0,
    quality_status: (row.qualityStatus ?? "pending") as QualityStatus,
    discrepancy_type: (row.discrepancyType ?? null) as DiscrepancyType | null,
    discrepancy_amount: row.discrepancyAmount ?? null,
    notes: row.notes ?? null,
    created_at: new Date(row.createdAt),
    updated_at: new Date(row.updatedAt),
    deleted_at: row.deletedAt ? new Date(row.deletedAt) : null,
  };
}

function mapPurchaseOrder(
  row: GeneratedPurchaseOrder,
  items: POItemWithDetails[]
): PurchaseOrderWithDetails {
  const receivedItems = items.filter((i) => i.quantity_received > 0).length;
  return {
    id: row.id,
    tenant_id: row.tenantId,
    po_number: row.poNumber,
    vendor_id: row.vendorId,
    location_id: row.locationId,
    order_date: new Date(row.orderDate),
    expected_delivery_date: row.expectedDeliveryDate
      ? new Date(row.expectedDeliveryDate)
      : null,
    actual_delivery_date: row.actualDeliveryDate
      ? new Date(row.actualDeliveryDate)
      : null,
    status: (row.status ?? "draft") as POStatus,
    subtotal: row.subtotal ?? 0,
    tax_amount: row.taxAmount ?? 0,
    shipping_amount: row.shippingAmount ?? 0,
    total: row.total ?? 0,
    notes: row.notes ?? null,
    submitted_by: row.submittedBy ?? null,
    submitted_at: row.submittedAt ? new Date(row.submittedAt) : null,
    received_by: row.receivedBy ?? null,
    received_at: row.receivedAt ? new Date(row.receivedAt) : null,
    created_at: new Date(row.createdAt),
    updated_at: new Date(row.updatedAt),
    deleted_at: row.deletedAt ? new Date(row.deletedAt) : null,
    items,
    progress: {
      total_items: items.length,
      received_items: receivedItems,
      percentage:
        items.length > 0 ? Math.round((receivedItems / items.length) * 100) : 0,
    },
  };
}

// List purchase orders with pagination and filters
export async function listPurchaseOrders(params: {
  search?: string;
  status?: POStatus;
  vendor_id?: string;
  location_id?: string;
  po_number?: string;
  page?: number;
  limit?: number;
}): Promise<PurchaseOrderListResponse> {
  const [ordersResult, itemsResult] = await Promise.all([
    _listPurchaseOrders(),
    _listPurchaseOrderItems(),
  ]);

  const itemsByPo = new Map<string, POItemWithDetails[]>();
  for (const item of itemsResult.data) {
    const mapped = mapPoItem(item);
    const bucket = itemsByPo.get(mapped.purchase_order_id) ?? [];
    bucket.push(mapped);
    itemsByPo.set(mapped.purchase_order_id, bucket);
  }

  let rows = ordersResult.data.map((po) =>
    mapPurchaseOrder(po, itemsByPo.get(po.id) ?? [])
  );

  if (params.status) {
    rows = rows.filter((po) => po.status === params.status);
  }
  if (params.vendor_id) {
    rows = rows.filter((po) => po.vendor_id === params.vendor_id);
  }
  if (params.location_id) {
    rows = rows.filter((po) => po.location_id === params.location_id);
  }
  if (params.po_number) {
    rows = rows.filter((po) => po.po_number === params.po_number);
  }
  if (params.search) {
    const q = params.search.toLowerCase();
    rows = rows.filter(
      (po) =>
        po.po_number.toLowerCase().includes(q) ||
        po.notes?.toLowerCase().includes(q)
    );
  }

  const page = params.page ?? 1;
  const limit = params.limit ?? 50;
  const total = rows.length;
  const start = (page - 1) * limit;
  const data = rows.slice(start, start + limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

// Get a single purchase order by ID
export async function getPurchaseOrder(
  poId: string
): Promise<PurchaseOrderWithDetails> {
  const result = await _getPurchaseOrder(poId);
  if (!result) {
    throw new Error("Failed to get purchase order");
  }
  return result as unknown as PurchaseOrderWithDetails;
}

// Search for a purchase order by PO number
export async function searchPurchaseOrderByNumber(
  poNumber: string
): Promise<PurchaseOrderWithDetails | null> {
  const result = await listPurchaseOrders({ po_number: poNumber, limit: 1 });
  if (result.data.length === 0) {
    return null;
  }
  return result.data[0];
}

async function syncPurchaseOrderReceivingStatus(
  poId: string,
  userId = ""
): Promise<void> {
  const po = await _getPurchaseOrder(poId);
  if (!po) {
    return;
  }

  const items = (await _listPurchaseOrderItems()).data.filter(
    (item) => item.purchaseOrderId === poId && !item.deletedAt
  );
  const allFullyReceived =
    items.length > 0 &&
    items.every(
      (item) => (item.quantityReceived ?? 0) >= (item.quantityOrdered ?? 0)
    );
  const anyReceived = items.some((item) => (item.quantityReceived ?? 0) > 0);

  if (po.status !== "ordered" && po.status !== "partially_received") {
    return;
  }

  if (allFullyReceived) {
    await purchaseOrderMarkReceived({ id: poId, userId });
    return;
  }

  if (anyReceived) {
    await purchaseOrderMarkPartiallyReceived({ id: poId, userId });
  }
}

// Update quantity received for a purchase order item
export async function updatePurchaseOrderItemQuantity(
  poId: string,
  itemId: string,
  request: UpdateQuantityReceivedRequest
): Promise<POItemWithDetails> {
  const result = await purchaseOrderItemRecordQuantityReceived({
    id: itemId,
    quantityReceived: request.quantity_received,
  });
  if (!result) {
    throw new Error("Failed to update quantity received");
  }

  await syncPurchaseOrderReceivingStatus(poId);
  const refreshed = await getPurchaseOrderItem(itemId);
  if (!refreshed) {
    throw new Error("Failed to load updated purchase order item");
  }
  return mapPoItem(refreshed);
}

// Update quality status for a purchase order item
export async function updatePurchaseOrderItemQuality(
  poId: string,
  itemId: string,
  request: UpdateQualityStatusRequest
): Promise<POItemWithDetails> {
  const result = await purchaseOrderItemUpdateQualityStatus({
    id: itemId,
    qualityStatus: request.quality_status,
    discrepancyType: request.discrepancy_type ?? "",
    discrepancyAmount: request.discrepancy_amount ?? 0,
    notes: request.notes ?? "",
  });
  if (!result) {
    throw new Error("Failed to update quality status");
  }

  await syncPurchaseOrderReceivingStatus(poId);
  const refreshed = await getPurchaseOrderItem(itemId);
  if (!refreshed) {
    throw new Error("Failed to load updated purchase order item");
  }
  return mapPoItem(refreshed);
}

// Complete receiving for a purchase order
export async function completePurchaseOrderReceiving(
  poId: string,
  request: CompleteReceivingRequest
): Promise<PurchaseOrderWithDetails> {
  for (const item of request.items) {
    await purchaseOrderItemRecordQuantityReceived({
      id: item.id,
      quantityReceived: item.quantity_received,
    });
    await purchaseOrderItemUpdateQualityStatus({
      id: item.id,
      qualityStatus: item.quality_status,
      discrepancyType: item.discrepancy_type ?? "",
      discrepancyAmount: item.discrepancy_amount ?? 0,
      notes: item.notes ?? "",
    });
  }

  await purchaseOrderMarkReceived({ id: poId, userId: "" });
  return getPurchaseOrder(poId);
}

// Helper to get quality status badge color
export function getQualityStatusColor(status: QualityStatus): string {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800 border-green-200";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    case "needs_inspection":
      return "bg-orange-100 text-orange-800 border-orange-200";
    default:
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
  }
}

// Helper to get quality status label
export function getQualityStatusLabel(status: QualityStatus): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "needs_inspection":
      return "Needs Inspection";
    default:
      return "Pending Review";
  }
}

// Helper to get PO status badge color
export function getPOStatusColor(status: POStatus): string {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-800 border-gray-200";
    case "submitted":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "confirmed":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "partial":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "received":
      return "bg-green-100 text-green-800 border-green-200";
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

// Helper to get PO status label
export function getPOStatusLabel(status: POStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "submitted":
      return "Submitted";
    case "confirmed":
      return "Confirmed";
    case "partial":
      return "Partially Received";
    case "received":
      return "Received";
    case "cancelled":
      return "Cancelled";
    default:
      return "Unknown";
  }
}
