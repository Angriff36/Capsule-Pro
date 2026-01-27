"use client";

import { useEffect, useState } from "react";

// TypeScript types for Finance Analytics
export type FinanceHighlight = {
  label: string;
  value: string;
  trend: string;
  isPositive?: boolean;
};

export type LedgerEntry = {
  label: string;
  amount: string;
};

export type FinanceAlert = {
  message: string;
  severity: "High" | "Medium" | "Low";
};

export type FinanceMetrics = {
  totalEvents: number;
  budgetedRevenue: number;
  actualRevenue: number;
  budgetedFoodCost: number;
  actualFoodCost: number;
  budgetedLaborCost: number;
  actualLaborCost: number;
  budgetedOtherCost: number;
  actualOtherCost: number;
  totalCost: number;
  grossProfit: number;
  grossProfitMargin: number;
};

export type FinanceAnalyticsData = {
  summary: {
    period: string;
    startDate: string;
    endDate: string;
    locationId: string | null;
  };
  financeHighlights: FinanceHighlight[];
  ledgerSummary: LedgerEntry[];
  financeAlerts: FinanceAlert[];
  metrics: FinanceMetrics;
};

export type UseFinanceAnalyticsOptions = {
  period?: "7d" | "30d" | "90d" | "12m";
  locationId?: string;
  enabled?: boolean;
};

export type UseFinanceAnalyticsReturn = {
  data: FinanceAnalyticsData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
};

// Helper function to format currency for display
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

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

  const response = await fetch(`/api/analytics/finance?${params.toString()}`);

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
  const { enabled = true, ...fetchOptions } = options;
  const [data, setData] = useState<FinanceAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    if (!enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFinanceAnalytics(fetchOptions);
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
  };

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
