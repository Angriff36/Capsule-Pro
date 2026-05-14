"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

// Types
export type EventBudgetStatus =
  | "draft"
  | "approved"
  | "active"
  | "completed"
  | "exceeded";
export type BudgetLineItemCategory =
  | "venue"
  | "catering"
  | "beverages"
  | "labor"
  | "equipment"
  | "other";

export interface BudgetLineItem {
  id: string;
  tenantId: string;
  budgetId: string;
  category: BudgetLineItemCategory;
  name: string;
  description: string | null;
  budgetedAmount: number;
  actualAmount: number;
  varianceAmount: number;
  sortOrder: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface EventBudget {
  tenantId: string;
  id: string;
  eventId: string;
  version: number;
  status: EventBudgetStatus;
  totalBudgetAmount: number;
  totalActualAmount: number;
  varianceAmount: number;
  variancePercentage: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  lineItems?: BudgetLineItem[];
}

export interface CreateEventBudgetInput {
  eventId: string;
  status?: EventBudgetStatus;
  totalBudgetAmount?: number;
  notes?: string;
  lineItems?: CreateBudgetLineItemInput[];
}

export interface CreateBudgetLineItemInput {
  category: BudgetLineItemCategory;
  name: string;
  description?: string;
  budgetedAmount: number;
  sortOrder?: number;
  notes?: string;
}

export interface UpdateEventBudgetInput {
  status?: EventBudgetStatus;
  totalBudgetAmount?: number;
  notes?: string;
}

export interface UpdateBudgetLineItemInput {
  category?: BudgetLineItemCategory;
  name?: string;
  description?: string;
  budgetedAmount?: number;
  actualAmount?: number;
  sortOrder?: number;
  notes?: string;
}

export interface EventBudgetFilters {
  eventId?: string;
  status?: EventBudgetStatus;
  page?: number;
  limit?: number;
}

export interface EventBudgetListResponse {
  budgets: EventBudget[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API Base URL
const API_BASE = "/api/events/budgets";

// ============================================================================
// Query Key Factory
// ============================================================================

export const budgetKeys = {
  all: ["event-budgets"] as const,
  lists: () => [...budgetKeys.all, "list"] as const,
  list: (filters: EventBudgetFilters) =>
    [...budgetKeys.lists(), filters] as const,
  details: () => [...budgetKeys.all, "detail"] as const,
  detail: (id: string) => [...budgetKeys.details(), id] as const,
  lineItems: (budgetId: string) =>
    [...budgetKeys.detail(budgetId), "line-items"] as const,
};

// ============================================================================
// Helper functions
// ============================================================================

export function getStatusColor(status: EventBudgetStatus): string {
  const colors = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
    approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    completed:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
    exceeded: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  };
  return colors[status] || colors.draft;
}

export function getCategoryColor(category: BudgetLineItemCategory): string {
  const colors = {
    venue: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    catering:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
    beverages:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
    labor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    equipment:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
    other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
  };
  return colors[category] || colors.other;
}

export { formatCurrency } from "@repo/design-system/lib/format-currency";

export function getUtilizationColor(percentage: number): string {
  if (percentage >= 100) {
    return "text-red-600 dark:text-red-400";
  }
  if (percentage >= 90) {
    return "text-yellow-600 dark:text-yellow-400";
  }
  if (percentage >= 75) {
    return "text-blue-600 dark:text-blue-400";
  }
  return "text-green-600 dark:text-green-400";
}

// ============================================================================
// Plain API Functions (kept for server components / backwards compat)
// ============================================================================

export async function getBudgets(
  filters: EventBudgetFilters = {}
): Promise<EventBudget[]> {
  try {
    const params = new URLSearchParams();
    if (filters.eventId) {
      params.set("eventId", filters.eventId);
    }
    if (filters.status) {
      params.set("status", filters.status);
    }
    params.set("page", String(filters.page || 1));
    params.set("limit", String(filters.limit || 50));

    const response = await apiFetch(`${API_BASE}?${params.toString()}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch budgets");
    }

    const data: EventBudgetListResponse = await response.json();
    return data.budgets;
  } catch (error) {
    console.error("Error fetching budgets:", error);
    throw error;
  }
}

export async function getBudget(budgetId: string): Promise<EventBudget> {
  try {
    const response = await apiFetch(`${API_BASE}/${budgetId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch budget");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching budget:", error);
    throw error;
  }
}

export async function createBudget(
  input: CreateEventBudgetInput
): Promise<EventBudget> {
  try {
    const response = await apiFetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create budget");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating budget:", error);
    throw error;
  }
}

export async function updateBudget(
  budgetId: string,
  input: UpdateEventBudgetInput
): Promise<EventBudget> {
  try {
    const response = await apiFetch(`${API_BASE}/${budgetId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update budget");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating budget:", error);
    throw error;
  }
}

export async function deleteBudget(budgetId: string): Promise<void> {
  try {
    const response = await apiFetch(`${API_BASE}/${budgetId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete budget");
    }
  } catch (error) {
    console.error("Error deleting budget:", error);
    throw error;
  }
}

// Line Item Functions
export async function getLineItems(
  budgetId: string
): Promise<BudgetLineItem[]> {
  try {
    const response = await apiFetch(`${API_BASE}/${budgetId}/line-items`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch line items");
    }

    const data = await response.json();
    return data.lineItems;
  } catch (error) {
    console.error("Error fetching line items:", error);
    throw error;
  }
}

export async function createLineItem(
  budgetId: string,
  input: CreateBudgetLineItemInput
): Promise<BudgetLineItem> {
  try {
    const response = await apiFetch(`${API_BASE}/${budgetId}/line-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create line item");
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating line item:", error);
    throw error;
  }
}

export async function updateLineItem(
  budgetId: string,
  lineItemId: string,
  input: UpdateBudgetLineItemInput
): Promise<BudgetLineItem> {
  try {
    const response = await apiFetch(
      `${API_BASE}/${budgetId}/line-items/${lineItemId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update line item");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating line item:", error);
    throw error;
  }
}

export async function deleteLineItem(
  budgetId: string,
  lineItemId: string
): Promise<void> {
  try {
    const response = await apiFetch(
      `${API_BASE}/${budgetId}/line-items/${lineItemId}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete line item");
    }
  } catch (error) {
    console.error("Error deleting line item:", error);
    throw error;
  }
}

// ============================================================================
// TanStack Query Hooks
// ============================================================================

/** List budgets with automatic caching and refetch */
export function useBudgets(filters: EventBudgetFilters = {}) {
  return useQuery({
    queryKey: budgetKeys.list(filters),
    queryFn: () => getBudgets(filters),
    staleTime: 30_000, // Budgets change less frequently than events
  });
}

/** Get a single budget by ID */
export function useBudget(budgetId: string) {
  return useQuery({
    queryKey: budgetKeys.detail(budgetId),
    queryFn: () => getBudget(budgetId),
    enabled: !!budgetId,
  });
}

/** Get line items for a budget */
export function useBudgetLineItems(budgetId: string) {
  return useQuery({
    queryKey: budgetKeys.lineItems(budgetId),
    queryFn: () => getLineItems(budgetId),
    enabled: !!budgetId,
  });
}

/** Create a budget — invalidates the list */
export function useCreateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateEventBudgetInput) => createBudget(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
      toast.success("Budget created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/** Update a budget — invalidates the list and detail */
export function useUpdateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      budgetId,
      input,
    }: {
      budgetId: string;
      input: UpdateEventBudgetInput;
    }) => updateBudget(budgetId, input),
    onSuccess: (_data, { budgetId }) => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: budgetKeys.detail(budgetId) });
      toast.success("Budget updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/** Delete a budget — invalidates the list and removes detail */
export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (budgetId: string) => deleteBudget(budgetId),
    onSuccess: (_data, budgetId) => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.lists() });
      queryClient.removeQueries({ queryKey: budgetKeys.detail(budgetId) });
      toast.success("Budget deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/** Create a line item — invalidates the parent budget's line items */
export function useCreateLineItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      budgetId,
      input,
    }: {
      budgetId: string;
      input: CreateBudgetLineItemInput;
    }) => createLineItem(budgetId, input),
    onSuccess: (_data, { budgetId }) => {
      queryClient.invalidateQueries({
        queryKey: budgetKeys.lineItems(budgetId),
      });
      queryClient.invalidateQueries({ queryKey: budgetKeys.detail(budgetId) });
    },
    onError: (error: Error) => {
      toast.error(error.message);
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
      input,
    }: {
      budgetId: string;
      lineItemId: string;
      input: UpdateBudgetLineItemInput;
    }) => updateLineItem(budgetId, lineItemId, input),
    onSuccess: (_data, { budgetId }) => {
      queryClient.invalidateQueries({
        queryKey: budgetKeys.lineItems(budgetId),
      });
      queryClient.invalidateQueries({ queryKey: budgetKeys.detail(budgetId) });
    },
    onError: (error: Error) => {
      toast.error(error.message);
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
        queryKey: budgetKeys.lineItems(budgetId),
      });
      queryClient.invalidateQueries({ queryKey: budgetKeys.detail(budgetId) });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Legacy hook — re-exports useBudgets for backward compatibility.
// Consumers should migrate to useBudgets, useCreateBudget, etc.
export function useEventBudgets(filters?: EventBudgetFilters) {
  return useBudgets(filters);
}
