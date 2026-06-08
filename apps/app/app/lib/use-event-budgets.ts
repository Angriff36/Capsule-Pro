"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import {
  listEventBudgets as _listEventBudgets,
  getEventBudget as _getEventBudget,
  listBudgetLineItems as _listBudgetLineItems,
  eventBudgetCreate,
  eventBudgetUpdate,
  budgetLineItemCreate,
  budgetLineItemUpdate,
  budgetLineItemRemove,
} from "@/app/lib/manifest-client.generated";

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

// Helper functions
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

// API Functions
export async function getBudgets(
  filters: EventBudgetFilters = {}
): Promise<EventBudget[]> {
  try {
    const query: Record<string, string | number> = {};
    if (filters.eventId) query.eventId = filters.eventId;
    if (filters.status) query.status = filters.status;
    query.page = filters.page || 1;
    query.limit = filters.limit || 50;

    const result = await _listEventBudgets(query);
    return result.data as unknown as EventBudget[];
  } catch (error) {
    console.error("Error fetching budgets:", error);
    throw error;
  }
}

export async function getBudget(budgetId: string): Promise<EventBudget> {
  try {
    const result = await _getEventBudget(budgetId);
    if (!result) throw new Error("Failed to fetch budget");
    return result as unknown as EventBudget;
  } catch (error) {
    console.error("Error fetching budget:", error);
    throw error;
  }
}

export async function createBudget(
  input: CreateEventBudgetInput
): Promise<EventBudget> {
  try {
    const result = await eventBudgetCreate({
      eventId: input.eventId,
      totalBudgetAmount: input.totalBudgetAmount,
      notes: input.notes,
    });
    if (!result) throw new Error("Failed to create budget");
    return result as unknown as EventBudget;
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
    const result = await eventBudgetUpdate({
      totalBudgetAmount: input.totalBudgetAmount,
      notes: input.notes,
    });
    if (!result) throw new Error("Failed to update budget");
    return result as unknown as EventBudget;
  } catch (error) {
    console.error("Error updating budget:", error);
    throw error;
  }
}

// NOTE: Keeping apiFetch — no generated eventBudgetDelete/eventBudgetSoftDelete command
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
    const result = await _listBudgetLineItems({ budgetId });
    return result.data as unknown as BudgetLineItem[];
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
    const result = await budgetLineItemCreate({
      budgetId,
      category: input.category,
      name: input.name,
      description: input.description,
      budgetedAmount: input.budgetedAmount,
      sortOrder: input.sortOrder,
      notes: input.notes,
    });
    if (!result) throw new Error("Failed to create line item");
    return result as unknown as BudgetLineItem;
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
    const result = await budgetLineItemUpdate({
      budgetedAmount: input.budgetedAmount,
      actualAmount: input.actualAmount,
      description: input.description,
      notes: input.notes,
    });
    if (!result) throw new Error("Failed to update line item");
    return result as unknown as BudgetLineItem;
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
    const result = await budgetLineItemRemove({});
    if (!result) throw new Error("Failed to delete line item");
  } catch (error) {
    console.error("Error deleting line item:", error);
    throw error;
  }
}

// React Hook
export function useEventBudgets(filters?: EventBudgetFilters) {
  const eventId = filters?.eventId;
  const status = filters?.status;
  const page = filters?.page;
  const limit = filters?.limit;
  const [budgets, setBudgets] = useState<EventBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBudgets({ eventId, status, page, limit });
      setBudgets(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [eventId, status, page, limit]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  return {
    budgets,
    loading,
    error,
    refetch: fetchBudgets,
  };
}
