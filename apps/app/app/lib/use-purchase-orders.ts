"use client";

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

export type POItem = {
  id: string;
  tenant_id: string;
  purchase_order_id: string;
  item_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_id: number;
  unit_cost: number;
  total_cost: number;
  quality_status: QualityStatus;
  discrepancy_type: DiscrepancyType | null;
  discrepancy_amount: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export interface POItemWithDetails extends POItem {
  item_number?: string;
  item_name?: string;
}

export type PurchaseOrder = {
  id: string;
  tenant_id: string;
  po_number: string;
  vendor_id: string;
  location_id: string;
  order_date: Date;
  expected_delivery_date: Date | null;
  actual_delivery_date: Date | null;
  status: POStatus;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total: number;
  notes: string | null;
  submitted_by: string | null;
  submitted_at: Date | null;
  received_by: string | null;
  received_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export interface PurchaseOrderWithDetails extends PurchaseOrder {
  items: POItemWithDetails[];
  vendor_name?: string;
  location_name?: string;
  progress?: {
    total_items: number;
    received_items: number;
    percentage: number;
  };
}

export type PurchaseOrderListFilters = {
  search?: string;
  status?: POStatus;
  vendor_id?: string;
  location_id?: string;
  po_number?: string;
};

export type UpdateQuantityReceivedRequest = {
  quantity_received: number;
};

export type UpdateQualityStatusRequest = {
  quality_status: QualityStatus;
  discrepancy_type?: DiscrepancyType;
  discrepancy_amount?: number;
  notes?: string;
};

export type CompleteReceivingRequest = {
  items: Array<{
    id: string;
    quantity_received: number;
    quality_status: QualityStatus;
    discrepancy_type?: DiscrepancyType;
    discrepancy_amount?: number;
    notes?: string;
  }>;
  notes?: string;
};

export type PurchaseOrderListResponse = {
  data: PurchaseOrderWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/**
 * Client-side functions for purchase order operations
 */

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
  const searchParams = new URLSearchParams();
  if (params.search) {
    searchParams.set("search", params.search);
  }
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (params.vendor_id) {
    searchParams.set("vendor_id", params.vendor_id);
  }
  if (params.location_id) {
    searchParams.set("location_id", params.location_id);
  }
  if (params.po_number) {
    searchParams.set("po_number", params.po_number);
  }
  if (params.page) {
    searchParams.set("page", params.page.toString());
  }
  if (params.limit) {
    searchParams.set("limit", params.limit.toString());
  }

  const response = await fetch(
    `/api/inventory/purchase-orders?${searchParams.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to list purchase orders");
  }

  return response.json();
}

// Get a single purchase order by ID
export async function getPurchaseOrder(
  poId: string
): Promise<PurchaseOrderWithDetails> {
  const response = await fetch(`/api/inventory/purchase-orders/${poId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to get purchase order");
  }

  return response.json();
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

// Update quantity received for a purchase order item
export async function updatePurchaseOrderItemQuantity(
  poId: string,
  itemId: string,
  request: UpdateQuantityReceivedRequest
): Promise<POItemWithDetails> {
  const response = await fetch(
    `/api/inventory/purchase-orders/${poId}/items/${itemId}/quantity`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update quantity received");
  }

  return response.json();
}

// Update quality status for a purchase order item
export async function updatePurchaseOrderItemQuality(
  poId: string,
  itemId: string,
  request: UpdateQualityStatusRequest
): Promise<POItemWithDetails> {
  const response = await fetch(
    `/api/inventory/purchase-orders/${poId}/items/${itemId}/quality`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update quality status");
  }

  return response.json();
}

// Complete receiving for a purchase order
export async function completePurchaseOrderReceiving(
  poId: string,
  request: CompleteReceivingRequest
): Promise<PurchaseOrderWithDetails> {
  const response = await fetch(
    `/api/inventory/purchase-orders/${poId}/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to complete receiving");
  }

  return response.json();
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
