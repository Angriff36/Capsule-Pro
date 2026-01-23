"use client";

// Type definitions matching the API response
export type EventBudgetStatus = "draft" | "approved" | "locked";
export type BudgetCategory = "food" | "labor" | "rentals" | "miscellaneous";

export interface BudgetLineItem {
  id: string;
  tenant_id: string;
  budget_id: string;
  category: BudgetCategory;
  name: string;
  description: string | null;
  budgeted_amount: number;
  actual_amount: number;
  variance_amount: number;
  sort_order: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface EventBudget {
  id: string;
  tenant_id: string;
  event_id: string;
  version: number;
  status: EventBudgetStatus;
  total_budget_amount: number;
  total_actual_amount: number;
  variance_amount: number;
  variance_percentage: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  line_items?: BudgetLineItem[];
  event?: {
    id: string;
    title: string;
    event_date: Date;
    client_name?: string;
  };
}

export interface BudgetListResponse {
  data: EventBudget[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateBudgetRequest {
  eventId: string;
  version?: number;
  status?: EventBudgetStatus;
  notes?: string;
  lineItems?: CreateBudgetLineItemRequest[];
}

export interface CreateBudgetLineItemRequest {
  category: BudgetCategory;
  name: string;
  description?: string;
  budgetedAmount: number;
  actualAmount?: number;
  sortOrder?: number;
  notes?: string;
}

export interface UpdateBudgetRequest {
  version?: number;
  status?: EventBudgetStatus;
  notes?: string;
}

export interface CreateLineItemRequest {
  budgetId: string;
  category: BudgetCategory;
  name: string;
  description?: string;
  budgetedAmount: number;
  actualAmount?: number;
  sortOrder?: number;
  notes?: string;
}

export interface UpdateLineItemRequest {
  category?: BudgetCategory;
  name?: string;
  description?: string;
  budgetedAmount?: number;
  actualAmount?: number;
  sortOrder?: number;
  notes?: string;
}

/**
 * Client-side hooks for budget operations
 */

// List budgets with pagination and filters
export async function listBudgets(params: {
  eventId?: string;
  status?: EventBudgetStatus;
  page?: number;
  limit?: number;
}): Promise<BudgetListResponse> {
  const searchParams = new URLSearchParams();
  if (params.eventId) searchParams.set("eventId", params.eventId);
  if (params.status) searchParams.set("status", params.status);
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.limit) searchParams.set("limit", params.limit.toString());

  const response = await fetch(
    `/api/events/budgets?${searchParams.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to list budgets");
  }

  return response.json();
}

// Get a single budget by ID
export async function getBudget(budgetId: string): Promise<EventBudget> {
  const response = await fetch(`/api/events/budgets/${budgetId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to get budget");
  }

  const data = await response.json();
  return data.data;
}

// Create a new budget
export async function createBudget(
  request: CreateBudgetRequest
): Promise<EventBudget> {
  const response = await fetch("/api/events/budgets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create budget");
  }

  const data = await response.json();
  return data.data;
}

// Update a budget
export async function updateBudget(
  budgetId: string,
  request: UpdateBudgetRequest
): Promise<EventBudget> {
  const response = await fetch(`/api/events/budgets/${budgetId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update budget");
  }

  const data = await response.json();
  return data.data;
}

// Delete a budget
export async function deleteBudget(budgetId: string): Promise<void> {
  const response = await fetch(`/api/events/budgets/${budgetId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete budget");
  }
}

// Get line items for a budget
export async function getLineItems(
  budgetId: string
): Promise<BudgetLineItem[]> {
  const response = await fetch(`/api/events/budgets/${budgetId}/line-items`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to get line items");
  }

  const data = await response.json();
  return data.data;
}

// Create a line item
export async function createLineItem(
  request: CreateLineItemRequest
): Promise<BudgetLineItem> {
  const response = await fetch(
    `/api/events/budgets/${request.budgetId}/line-items`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create line item");
  }

  const data = await response.json();
  return data.data;
}

// Update a line item
export async function updateLineItem(
  budgetId: string,
  lineItemId: string,
  request: UpdateLineItemRequest
): Promise<BudgetLineItem> {
  const response = await fetch(
    `/api/events/budgets/${budgetId}/line-items/${lineItemId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update line item");
  }

  const data = await response.json();
  return data.data;
}

// Delete a line item
export async function deleteLineItem(
  budgetId: string,
  lineItemId: string
): Promise<void> {
  const response = await fetch(
    `/api/events/budgets/${budgetId}/line-items/${lineItemId}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete line item");
  }
}

// Helper to get budget status badge color
export function getBudgetStatusColor(status: EventBudgetStatus): string {
  switch (status) {
    case "draft":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "approved":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "locked":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

// Helper to get variance color
export function getVarianceColor(variance: number): string {
  if (variance < 0) {
    return "text-red-600"; // Over budget
  }
  if (variance === 0) {
    return "text-gray-600"; // On budget
  }
  return "text-green-600"; // Under budget
}

// Helper to check if budget is editable
export function isBudgetEditable(status: EventBudgetStatus): boolean {
  return status === "draft" || status === "approved";
}

// Helper to get budget status label
export function getBudgetStatusLabel(status: EventBudgetStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "approved":
      return "Approved";
    case "locked":
      return "Locked";
    default:
      return "Unknown";
  }
}

// Helper to get category label
export function getCategoryLabel(category: BudgetCategory): string {
  switch (category) {
    case "food":
      return "Food";
    case "labor":
      return "Labor";
    case "rentals":
      return "Rentals";
    case "miscellaneous":
      return "Miscellaneous";
    default:
      return "Unknown";
  }
}
