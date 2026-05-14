"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/app/lib/api";

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

// ============================================================================
// Query Key Factory
// ============================================================================

export const altBudgetKeys = {
  all: ["budgets"] as const,
  lists: () => [...altBudgetKeys.all, "list"] as const,
  list: (filters: Record<string, unknown>) =>
    [...altBudgetKeys.lists(), filters] as const,
  details: () => [...altBudgetKeys.all, "detail"] as const,
  detail: (id: string) => [...altBudgetKeys.details(), id] as const,
  lineItems: (budgetId: string) =>
    [...altBudgetKeys.detail(budgetId), "line-items"] as const,
};

// ============================================================================
// Plain API Functions (kept for backwards compat)
// ============================================================================

// List budgets with pagination and filters
export async function listBudgets(params: {
  eventId?: string;
  status?: EventBudgetStatus;
  page?: number;
  limit?: number;
}): Promise<BudgetListResponse> {
  const searchParams = new URLSearchParams();
  if (params.eventId) {
    searchParams.set("eventId", params.eventId);
  }
  if (params.status) {
    searchParams.set("status", params.status);
  }
  if (params.page) {
    searchParams.set("page", params.page.toString());
  }
  if (params.limit) {
    searchParams.set("limit", params.limit.toString());
  }

  const response = await apiFetch(
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
  const response = await apiFetch(`/api/events/budgets/${budgetId}`);

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
  const response = await apiFetch("/api/events/budgets", {
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
  const response = await apiFetch(`/api/events/budgets/${budgetId}`, {
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
  const response = await apiFetch(`/api/events/budgets/${budgetId}`, {
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
  const response = await apiFetch(`/api/events/budgets/${budgetId}/line-items`);

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
  const response = await apiFetch(
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
  const response = await apiFetch(
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
  const response = await apiFetch(
    `/api/events/budgets/${budgetId}/line-items/${lineItemId}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete line item");
  }
}

// ============================================================================
// TanStack Query Hooks
// ============================================================================

/** List budgets with caching */
export function useListBudgets(params: {
  eventId?: string;
  status?: EventBudgetStatus;
  page?: number;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: altBudgetKeys.list(params),
    queryFn: () => listBudgets(params),
    staleTime: 30_000,
  });
}

/** Get a single budget */
export function useGetBudget(budgetId: string) {
  return useQuery({
    queryKey: altBudgetKeys.detail(budgetId),
    queryFn: () => getBudget(budgetId),
    enabled: !!budgetId,
  });
}

/** Get line items for a budget */
export function useGetLineItems(budgetId: string) {
  return useQuery({
    queryKey: altBudgetKeys.lineItems(budgetId),
    queryFn: () => getLineItems(budgetId),
    enabled: !!budgetId,
  });
}

/** Create a budget */
export function useCreateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateBudgetRequest) => createBudget(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: altBudgetKeys.lists() });
    },
    onError: (error: Error) => {
      // Error handling via return value; caller can toast
    },
  });
}

/** Update a budget */
export function useUpdateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      budgetId,
      request,
    }: {
      budgetId: string;
      request: UpdateBudgetRequest;
    }) => updateBudget(budgetId, request),
    onSuccess: (_data, { budgetId }) => {
      queryClient.invalidateQueries({ queryKey: altBudgetKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: altBudgetKeys.detail(budgetId),
      });
    },
  });
}

/** Delete a budget */
export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (budgetId: string) => deleteBudget(budgetId),
    onSuccess: (_data, budgetId) => {
      queryClient.invalidateQueries({ queryKey: altBudgetKeys.lists() });
      queryClient.removeQueries({ queryKey: altBudgetKeys.detail(budgetId) });
    },
  });
}

/** Create a line item */
export function useCreateLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateLineItemRequest) => createLineItem(request),
    onSuccess: (_data, { budgetId }) => {
      queryClient.invalidateQueries({
        queryKey: altBudgetKeys.lineItems(budgetId),
      });
      queryClient.invalidateQueries({
        queryKey: altBudgetKeys.detail(budgetId),
      });
    },
  });
}

/** Update a line item */
export function useUpdateLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      budgetId,
      lineItemId,
      request,
    }: {
      budgetId: string;
      lineItemId: string;
      request: UpdateLineItemRequest;
    }) => updateLineItem(budgetId, lineItemId, request),
    onSuccess: (_data, { budgetId }) => {
      queryClient.invalidateQueries({
        queryKey: altBudgetKeys.lineItems(budgetId),
      });
      queryClient.invalidateQueries({
        queryKey: altBudgetKeys.detail(budgetId),
      });
    },
  });
}

/** Delete a line item */
export function useDeleteLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      budgetId,
      lineItemId,
    }: {
      budgetId: string;
      lineItemId: string;
    }) => deleteLineItem(budgetId, lineItemId),
    onSuccess: (_data, { budgetId }) => {
      queryClient.invalidateQueries({
        queryKey: altBudgetKeys.lineItems(budgetId),
      });
      queryClient.invalidateQueries({
        queryKey: altBudgetKeys.detail(budgetId),
      });
    },
  });
}

// ============================================================================
// Helper functions (unchanged)
// ============================================================================

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

export function getVarianceColor(variance: number): string {
  if (variance < 0) {
    return "text-red-600";
  }
  if (variance === 0) {
    return "text-gray-600";
  }
  return "text-green-600";
}

export function isBudgetEditable(status: EventBudgetStatus): boolean {
  return status === "draft" || status === "approved";
}

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
