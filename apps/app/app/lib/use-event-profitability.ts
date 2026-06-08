/**
 * @module useEventProfitability
 * @intent Client-side helpers for fetching and mutating event profitability data
 * @responsibility Provide types, API functions, and utility helpers for the Event Profitability page
 * @domain Events
 * @tags profitability, events, finance, api
 * @canonical true
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";
import { listEventProfitabilities, getEventProfitability } from "@/app/lib/manifest-client.generated";

// ---------------------------------------------------------------------------
// Types — mirrors the EventProfitability Prisma model in tenant_events schema
// ---------------------------------------------------------------------------

export interface EventProfitabilityRecord {
  id: string;
  tenantId: string;
  eventId: string;
  budgetedRevenue: number;
  budgetedFoodCost: number;
  budgetedLaborCost: number;
  budgetedOverhead: number;
  budgetedTotalCost: number;
  budgetedGrossMargin: number;
  budgetedGrossMarginPct: number;
  actualRevenue: number;
  actualFoodCost: number;
  actualLaborCost: number;
  actualOverhead: number;
  actualTotalCost: number;
  actualGrossMargin: number;
  actualGrossMarginPct: number;
  revenueVariance: number;
  foodCostVariance: number;
  laborCostVariance: number;
  totalCostVariance: number;
  marginVariancePct: number;
  calculatedAt: string;
  calculationMethod: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  event?: {
    id: string;
    title: string;
    eventDate: string | null;
  } | null;
}

export interface ProfitabilitySummary {
  totalActualRevenue: number;
  totalBudgetedRevenue: number;
  totalActualCost: number;
  totalBudgetedCost: number;
  averageMarginPct: number;
  underperformingCount: number;
  recordCount: number;
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

const API_BASE = "/api/events/profitability";

export async function fetchProfitabilities(): Promise<
  EventProfitabilityRecord[]
> {
  const result = await listEventProfitabilities();
  return result.data as unknown as EventProfitabilityRecord[];
}

export async function fetchProfitabilityById(
  id: string
): Promise<EventProfitabilityRecord> {
  const result = await getEventProfitability(id);
  if (!result) {
    throw new Error("Failed to fetch profitability record");
  }
  return result as unknown as EventProfitabilityRecord;
}

// NOTE: Keeping apiFetch for recalculate command (no generated equivalent for custom command endpoint)
export async function recalculateProfitability(
  id: string
): Promise<{ success: boolean }> {
  const response = await apiFetch(`${API_BASE}/commands/recalculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instanceId: id }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to recalculate profitability");
  }

  return await response.json();
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

export { formatCurrencyWhole as formatCurrency } from "@repo/design-system/lib/format-currency";

const currencyFormatterDetailed = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrencyDetailed(amount: number): string {
  return currencyFormatterDetailed.format(amount);
}

export function getMarginColor(pct: number): string {
  if (pct >= 30) {
    return "text-green-600 dark:text-green-400";
  }
  if (pct >= 15) {
    return "text-yellow-600 dark:text-yellow-400";
  }
  return "text-red-600 dark:text-red-400";
}

export function getMarginBadgeClass(pct: number): string {
  if (pct >= 30) {
    return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  }
  if (pct >= 15) {
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
  }
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
}

export function getVarianceColor(variance: number): string {
  if (variance > 0) {
    return "text-green-600 dark:text-green-400";
  }
  if (variance < 0) {
    return "text-red-600 dark:text-red-400";
  }
  return "text-muted-foreground";
}

// ---------------------------------------------------------------------------
// React Hook
// ---------------------------------------------------------------------------

export function useEventProfitability() {
  const [records, setRecords] = useState<EventProfitabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProfitabilities();
      setRecords(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return {
    records,
    loading,
    error,
    refetch: fetchRecords,
  };
}
