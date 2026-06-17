"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  budgetLineItemCreate,
  budgetLineItemRemove,
  budgetLineItemUpdate,
  eventBudgetCreate,
  eventBudgetSoftDelete,
  eventBudgetUpdate,
  getEventBudget as _getEventBudget,
  listBudgetLineItems as _listBudgetLineItems,
  listEventBudgets as _listEventBudgets,
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
  actualAmount: number;
  budgetedAmount: number;
  budgetId: string;
  category: BudgetLineItemCategory;
  createdAt: Date;
  deletedAt: Date | null;
  description: string | null;
  id: string;
  name: string;
  notes: string | null;
  sortOrder: number;
  tenantId: string;
  updatedAt: Date;
  varianceAmount: number;
}

export interface EventBudget {
  createdAt: Date;
  deletedAt: Date | null;
  eventId: string;
  id: string;
  lineItems?: BudgetLineItem[];
  notes: string | null;
  status: EventBudgetStatus;
  tenantId: string;
  totalActualAmount: number;
  totalBudgetAmount: number;
  updatedAt: Date;
  varianceAmount: number;
  variancePercentage: number;
  version: number;
}

export interface CreateEventBudgetInput {
  eventId: string;
  lineItems?: CreateBudgetLineItemInput[];
  notes?: string;
  status?: EventBudgetStatus;
  totalBudgetAmount?: number;
}

export interface CreateBudgetLineItemInput {
  budgetedAmount: number;
  category: BudgetLineItemCategory;
  description?: string;
  name: string;
  notes?: string;
  sortOrder?: number;
}

export interface UpdateEventBudgetInput {
  notes?: string;
  status?: EventBudgetStatus;
  totalBudgetAmount?: number;
}

export interface UpdateBudgetLineItemInput {
  actualAmount?: number;
  budgetedAmount?: number;
  category?: BudgetLineItemCategory;
  description?: string;
  name?: string;
  notes?: string;
  sortOrder?: number;
}

export interface EventBudgetFilters {
  eventId?: string;
  limit?: number;
  page?: number;
  status?: EventBudgetStatus;
}

export interface EventBudgetListResponse {
  budgets: EventBudget[];
  limit: number;
  page: number;
  total: number;
  totalPages: number;
}

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
    if (filters.eventId) {
      query.eventId = filters.eventId;
    }
    if (filters.status) {
      query.status = filters.status;
    }
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
    if (!result) {
      throw new Error("Failed to fetch budget");
    }
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
    if (!result) {
      throw new Error("Failed to create budget");
    }
    return result as unknown as EventBudget;
  } catch (error) {
    console.error("Error creating budget:", error);
    throw error;
  }
}

export async function updateBudget(
  _budgetId: string,
  input: UpdateEventBudgetInput
): Promise<EventBudget> {
  try {
    const result = await eventBudgetUpdate({
      totalBudgetAmount: input.totalBudgetAmount,
      notes: input.notes,
    });
    if (!result) {
      throw new Error("Failed to update budget");
    }
    return result as unknown as EventBudget;
  } catch (error) {
    console.error("Error updating budget:", error);
    throw error;
  }
}

export async function deleteBudget(budgetId: string): Promise<void> {
  try {
    const result = await eventBudgetSoftDelete({ id: budgetId });
    if (!result) {
      throw new Error("Failed to delete budget");
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
    if (!result) {
      throw new Error("Failed to create line item");
    }
    return result as unknown as BudgetLineItem;
  } catch (error) {
    console.error("Error creating line item:", error);
    throw error;
  }
}

export async function updateLineItem(
  _budgetId: string,
  _lineItemId: string,
  input: UpdateBudgetLineItemInput
): Promise<BudgetLineItem> {
  try {
    const result = await budgetLineItemUpdate({
      budgetedAmount: input.budgetedAmount,
      actualAmount: input.actualAmount,
      description: input.description,
      notes: input.notes,
    });
    if (!result) {
      throw new Error("Failed to update line item");
    }
    return result as unknown as BudgetLineItem;
  } catch (error) {
    console.error("Error updating line item:", error);
    throw error;
  }
}

export async function deleteLineItem(
  _budgetId: string,
  _lineItemId: string
): Promise<void> {
  try {
    const result = await budgetLineItemRemove({});
    if (!result) {
      throw new Error("Failed to delete line item");
    }
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
