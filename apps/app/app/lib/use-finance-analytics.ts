"use client";

import { useCallback, useEffect, useState } from "react";
// NOTE: Keeping apiFetch for finance analytics endpoint (no generated equivalent for /api/analytics/*)
import { apiFetch } from "@/app/lib/api";

// TypeScript types for Finance Analytics
export interface FinanceHighlight {
  isPositive?: boolean;
  label: string;
  trend: string;
  value: string;
}

export interface LedgerEntry {
  amount: string;
  label: string;
}

export interface FinanceAlert {
  message: string;
  severity: "High" | "Medium" | "Low";
}

export interface FinanceMetrics {
  actualFoodCost: number;
  actualLaborCost: number;
  actualOtherCost: number;
  actualRevenue: number;
  budgetedFoodCost: number;
  budgetedLaborCost: number;
  budgetedOtherCost: number;
  budgetedRevenue: number;
  grossProfit: number;
  grossProfitMargin: number;
  totalCost: number;
  totalEvents: number;
}

export interface FinanceAnalyticsData {
  financeAlerts: FinanceAlert[];
  financeHighlights: FinanceHighlight[];
  ledgerSummary: LedgerEntry[];
  metrics: FinanceMetrics;
  summary: {
    period: string;
    startDate: string;
    endDate: string;
    locationId: string | null;
  };
}

export interface UseFinanceAnalyticsOptions {
  enabled?: boolean;
  locationId?: string;
  period?: "7d" | "30d" | "90d" | "12m";
}

export interface UseFinanceAnalyticsReturn {
  data: FinanceAnalyticsData | null;
  error: Error | null;
  isLoading: boolean;
  refetch: () => void;
}

export { formatCurrencyWhole as formatCurrency } from "@repo/design-system/lib/format-currency";

// Helper function to format percentage for display
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// Helper function to get severity color variant
export function getSeverityVariant(
  severity: string
): "destructive" | "outline" | "secondary" {
  switch (severity) {
    case "High":
      return "destructive";
    case "Medium":
      return "outline";
    default:
      return "secondary";
  }
}

// Client function to fetch finance analytics data
export async function fetchFinanceAnalytics(
  options: UseFinanceAnalyticsOptions = {}
): Promise<FinanceAnalyticsData> {
  const { period = "30d", locationId } = options;

  const params = new URLSearchParams();
  if (period) {
    params.set("period", period);
  }
  if (locationId) {
    params.set("locationId", locationId);
  }

  const response = await apiFetch(
    `/api/analytics/finance?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to fetch finance analytics" }));
    throw new Error(error.message || "Failed to fetch finance analytics");
  }

  return response.json();
}

// React hook for finance analytics
export function useFinanceAnalytics(
  options: UseFinanceAnalyticsOptions = {}
): UseFinanceAnalyticsReturn {
  const period = options.period ?? "30d";
  const locationId = options.locationId;
  const enabled = options.enabled ?? true;
  const [data, setData] = useState<FinanceAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFinanceAnalytics({ period, locationId });
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch finance analytics")
      );
    } finally {
      setIsLoading(false);
    }
  }, [enabled, period, locationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}
