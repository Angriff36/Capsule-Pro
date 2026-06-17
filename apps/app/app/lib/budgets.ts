"use client";

import {
  getEventBudget as _getEventBudget,
  listBudgetLineItems as _listBudgetLineItems,
  listEventBudgets as _listEventBudgets,
  budgetLineItemCreate,
  budgetLineItemRemove,
  budgetLineItemUpdate,
  eventBudgetCreate,
  eventBudgetSoftDelete,
  eventBudgetUpdate,
} from "@/app/lib/manifest-client.generated";
import type {
  BudgetLineItem as GeneratedBudgetLineItem,
  EventBudget as GeneratedEventBudget,
} from "@/app/lib/manifest-types.generated";
// Type definitions matching the API response
export type EventBudgetStatus = "draft" | "approved" | "locked";
export type BudgetCategory = "food" | "labor" | "rentals" | "miscellaneous";

export interface BudgetLineItem {
  actual_amount: number;
  budget_id: string;
  budgeted_amount: number;
  category: BudgetCategory;
  created_at: Date;
  deleted_at: Date | null;
  description: string | null;
  id: string;
  name: string;
  notes: string | null;
  sort_order: number;
  tenant_id: string;
  updated_at: Date;
  variance_amount: number;
}

export interface EventBudget {
  created_at: Date;
  deleted_at: Date | null;
  event?: {
    id: string;
    title: string;
    event_date: Date;
    client_name?: string;
  };
  event_id: string;
  id: string;
  line_items?: BudgetLineItem[];
  notes: string | null;
  status: EventBudgetStatus;
  tenant_id: string;
  total_actual_amount: number;
  total_budget_amount: number;
  updated_at: Date;
  variance_amount: number;
  variance_percentage: number;
  version: number;
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
  lineItems?: CreateBudgetLineItemRequest[];
  notes?: string;
  status?: EventBudgetStatus;
  version?: number;
}

export interface CreateBudgetLineItemRequest {
  actualAmount?: number;
  budgetedAmount: number;
  category: BudgetCategory;
  description?: string;
  name: string;
  notes?: string;
  sortOrder?: number;
}

export interface UpdateBudgetRequest {
  notes?: string;
  status?: EventBudgetStatus;
  version?: number;
}

export interface CreateLineItemRequest {
  actualAmount?: number;
  budgetedAmount: number;
  budgetId: string;
  category: BudgetCategory;
  description?: string;
  name: string;
  notes?: string;
  sortOrder?: number;
}

export interface UpdateLineItemRequest {
  actualAmount?: number;
  budgetedAmount?: number;
  category?: BudgetCategory;
  description?: string;
  name?: string;
  notes?: string;
  sortOrder?: number;
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
  const query: Record<string, string | number> = {};
  if (params.eventId) {
    query.eventId = params.eventId;
  }
  if (params.status) {
    query.status = params.status;
  }
  if (params.page) {
    query.page = params.page;
  }
  if (params.limit) {
    query.limit = params.limit;
  }

  return _listEventBudgets(query) as unknown as Promise<BudgetListResponse>;
}

// Get a single budget by ID
export async function getBudget(budgetId: string): Promise<EventBudget> {
  const result = await _getEventBudget(budgetId);
  if (!result) {
    throw new Error("Failed to get budget");
  }
  return result as unknown as EventBudget;
}

// Create a new budget
export async function createBudget(
  request: CreateBudgetRequest
): Promise<GeneratedEventBudget> {
  const result = await eventBudgetCreate({
    eventId: request.eventId,
    notes: request.notes,
  });
  if (!result) {
    throw new Error("Failed to create budget");
  }
  return result;
}

// Update a budget
export async function updateBudget(
  budgetId: string,
  request: UpdateBudgetRequest
): Promise<GeneratedEventBudget> {
  const result = await eventBudgetUpdate({
    id: budgetId,
    notes: request.notes,
  });
  if (!result) {
    throw new Error("Failed to update budget");
  }
  return result;
}

// Delete a budget
export async function deleteBudget(budgetId: string): Promise<void> {
  const result = await eventBudgetSoftDelete({ id: budgetId });
  if (!result) {
    throw new Error("Failed to delete budget");
  }
}

// Get line items for a budget
export async function getLineItems(
  budgetId: string
): Promise<BudgetLineItem[]> {
  const result = await _listBudgetLineItems({ budgetId });
  return result.data as unknown as BudgetLineItem[];
}

// Create a line item
export async function createLineItem(
  request: CreateLineItemRequest
): Promise<GeneratedBudgetLineItem> {
  const result = await budgetLineItemCreate({
    budgetId: request.budgetId,
    category: request.category,
    name: request.name,
    description: request.description,
    budgetedAmount: request.budgetedAmount,
    sortOrder: request.sortOrder,
    notes: request.notes,
  });
  if (!result) {
    throw new Error("Failed to create line item");
  }
  return result;
}

// Update a line item
export async function updateLineItem(
  _budgetId: string,
  lineItemId: string,
  request: UpdateLineItemRequest
): Promise<GeneratedBudgetLineItem> {
  const result = await budgetLineItemUpdate({
    id: lineItemId,
    budgetedAmount: request.budgetedAmount,
    actualAmount: request.actualAmount,
    description: request.description,
    notes: request.notes,
  });
  if (!result) {
    throw new Error("Failed to update line item");
  }
  return result;
}

// Delete a line item
export async function deleteLineItem(
  _budgetId: string,
  lineItemId: string
): Promise<void> {
  await budgetLineItemRemove({ id: lineItemId });
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
