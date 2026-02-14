"use client";

import { toast } from "sonner";

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

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

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
    const params = new URLSearchParams();
    if (filters.eventId) {
      params.set("eventId", filters.eventId);
    }
    if (filters.status) {
      params.set("status", filters.status);
    }
    params.set("page", String(filters.page || 1));
    params.set("limit", String(filters.limit || 50));

    const response = await fetch(`${API_BASE}?${params.toString()}`);
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
    const response = await fetch(`${API_BASE}/${budgetId}`);
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
    const response = await fetch(API_BASE, {
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
    const response = await fetch(`${API_BASE}/${budgetId}`, {
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
    const response = await fetch(`${API_BASE}/${budgetId}`, {
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
    const response = await fetch(`${API_BASE}/${budgetId}/line-items`);
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
    const response = await fetch(`${API_BASE}/${budgetId}/line-items`, {
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
    const response = await fetch(
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
    const response = await fetch(
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

// React Hook
export function useEventBudgets(filters?: EventBudgetFilters) {
  const [budgets, setBudgets] = useState<EventBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBudgets(filters);
      setBudgets(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

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

import { useCallback, useEffect, useState } from "react";
