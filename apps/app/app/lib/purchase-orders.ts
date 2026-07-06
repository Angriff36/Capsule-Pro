"use client";

import { apiFetch } from "@/app/lib/api";
import { getPurchaseOrder as _getPurchaseOrder } from "@/app/lib/manifest-client.generated";
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
  // NOTE: Keeping apiFetch — generated client returns PurchaseOrder[] without joined items/details
  const queryParams = new URLSearchParams();
  if (params.search) {
    queryParams.set("search", params.search);
  }
  if (params.status) {
    queryParams.set("status", params.status);
  }
  if (params.vendor_id) {
    queryParams.set("vendor_id", params.vendor_id);
  }
  if (params.location_id) {
    queryParams.set("location_id", params.location_id);
  }
  if (params.po_number) {
    queryParams.set("po_number", params.po_number);
  }
  if (params.page) {
    queryParams.set("page", String(params.page));
  }
  if (params.limit) {
    queryParams.set("limit", String(params.limit));
  }

  const response = await apiFetch(
    `/api/inventory/purchase-orders?${queryParams.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch purchase orders");
  }

  return response.json();
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
  return result.data[0] ?? null;
}

// Update quantity received for a purchase order item
// NOTE: Keeping apiFetch — no generated equivalent for item quantity update sub-route
export async function updatePurchaseOrderItemQuantity(
  poId: string,
  itemId: string,
  request: UpdateQuantityReceivedRequest
): Promise<POItemWithDetails> {
  const response = await apiFetch(
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
// NOTE: Keeping apiFetch — no generated equivalent for item quality update sub-route
export async function updatePurchaseOrderItemQuality(
  poId: string,
  itemId: string,
  request: UpdateQualityStatusRequest
): Promise<POItemWithDetails> {
  const response = await apiFetch(
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
// NOTE: Keeping apiFetch — no generated equivalent for complete receiving sub-route
export async function completePurchaseOrderReceiving(
  poId: string,
  request: CompleteReceivingRequest
): Promise<PurchaseOrderWithDetails> {
  const response = await apiFetch(
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
