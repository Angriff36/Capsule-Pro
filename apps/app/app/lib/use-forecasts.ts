"use client";

import { toast } from "sonner";
import { apiFetch } from "@/app/lib/api";

// Types
export interface ForecastPoint {
  date: Date;
  projectedStock: number;
  usage: number;
  eventId?: string;
  eventName?: string;
}

export interface DepletionForecast {
  sku: string;
  currentStock: number;
  depletionDate: Date | null;
  daysUntilDepletion: number | null;
  confidence: "high" | "medium" | "low";
  forecast: ForecastPoint[];
}

export interface ReorderSuggestion {
  sku: string;
  currentStock: number;
  reorderPoint: number;
  recommendedOrderQty: number;
  leadTimeDays: number;
  justification: string;
  urgency: "critical" | "warning" | "info";
}

export interface ForecastAlert {
  sku: string;
  name: string;
  currentStock: number;
  depletionDate: Date;
  daysUntilDepletion: number;
  confidence: "high" | "medium" | "low";
  urgency: "critical" | "warning" | "info";
}

export interface SavedForecast {
  id: string;
  tenantId: string;
  sku: string;
  date: Date;
  forecast: number;
  lower_bound: number;
  upper_bound: number;
  confidence: number;
  horizon_days: number;
  last_updated: Date;
}

// API Functions

/**
 * Get depletion forecast for a specific SKU
 */
export async function getDepletionForecast(
  sku: string,
  horizonDays = 30,
  save = false
): Promise<DepletionForecast> {
  const params = new URLSearchParams({
    sku,
    horizon: horizonDays.toString(),
    save: save.toString(),
  });

  const response = await apiFetch(`/api/inventory/forecasts?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || "Failed to fetch forecast");
  }

  return response.json();
}

/**
 * Get saved forecasts from database for a date range
 */
export async function getSavedForecasts(
  sku: string,
  fromDate: Date,
  toDate: Date
): Promise<SavedForecast[]> {
  const params = new URLSearchParams({
    sku,
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
  });

  const response = await apiFetch(`/api/inventory/forecasts?${params}`);

  if (!response.ok) {
    throw new Error("Failed to fetch saved forecasts");
  }

  const data = await response.json();
  return data.map((f: SavedForecast) => ({
    ...f,
    date: new Date(f.date),
    last_updated: new Date(f.last_updated),
  }));
}

/**
 * Get batch forecasts for multiple SKUs
 */
export async function getBatchForecasts(
  skuList: string[],
  fromDate: Date,
  toDate: Date
): Promise<Record<string, SavedForecast[]>> {
  const params = new URLSearchParams({
    skuList: skuList.join(","),
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
  });

  const response = await apiFetch(`/api/inventory/forecasts/batch?${params}`);

  if (!response.ok) {
    throw new Error("Failed to fetch batch forecasts");
  }

  const data = await response.json();
  // Convert date strings to Date objects
  const result: Record<string, SavedForecast[]> = {};
  for (const [sku, forecasts] of Object.entries(data)) {
    result[sku] = (forecasts as SavedForecast[]).map((f) => ({
      ...f,
      date: new Date(f.date),
      last_updated: new Date(f.last_updated),
    }));
  }
  return result;
}

/**
 * Get reorder suggestions
 */
export async function getReorderSuggestions(
  sku?: string,
  leadTimeDays = 7,
  safetyStockDays = 3
): Promise<ReorderSuggestion[]> {
  const params = new URLSearchParams();
  if (sku) {
    params.set("sku", sku);
  }
  params.set("leadTimeDays", leadTimeDays.toString());
  params.set("safetyStockDays", safetyStockDays.toString());

  const response = await apiFetch(
    `/api/inventory/reorder-suggestions?${params}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch reorder suggestions");
  }

  return response.json();
}

/**
 * Generate and save reorder suggestions
 */
export async function generateReorderSuggestions(
  sku?: string,
  leadTimeDays = 7,
  safetyStockDays = 3,
  save = false
): Promise<{
  success: boolean;
  count: number;
  suggestions: ReorderSuggestion[];
}> {
  const response = await apiFetch("/api/inventory/reorder-suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku, leadTimeDays, safetyStockDays, save }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate reorder suggestions");
  }

  return response.json();
}

/**
 * Get forecast alerts for items depleting within specified days
 */
export async function getForecastAlerts(
  criticalThresholdDays = 7,
  warningThresholdDays = 14
): Promise<ForecastAlert[]> {
  const params = new URLSearchParams({
    criticalThreshold: criticalThresholdDays.toString(),
    warningThreshold: warningThresholdDays.toString(),
  });

  const response = await apiFetch(`/api/inventory/forecasts/alerts?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.details || error.error || "Failed to fetch alerts");
  }

  const data = await response.json();
  // Convert date strings to Date objects
  return data.alerts.map((alert: ForecastAlert) => ({
    ...alert,
    depletionDate: new Date(alert.depletionDate),
  }));
}

// Helper Functions

/**
 * Get confidence color for badge
 */
export function getConfidenceColor(
  confidence: "high" | "medium" | "low"
): "default" | "secondary" | "destructive" | "outline" {
  switch (confidence) {
    case "high":
      return "default";
    case "medium":
      return "secondary";
    case "low":
      return "outline";
  }
}

/**
 * Get urgency color for badge
 */
export function getUrgencyColor(
  urgency: "critical" | "warning" | "info"
): "default" | "destructive" | "secondary" | "outline" {
  switch (urgency) {
    case "critical":
      return "destructive";
    case "warning":
      return "secondary";
    case "info":
      return "outline";
  }
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format date with time for display
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Calculate days until depletion with friendly text
 */
export function getDepletionText(daysUntilDepletion: number | null): string {
  if (daysUntilDepletion === null) {
    return "Not depleting soon";
  }
  if (daysUntilDepletion <= 0) {
    return "Depleted";
  }
  if (daysUntilDepletion === 1) {
    return "1 day";
  }
  return `${daysUntilDepletion} days`;
}

// ============================================================================
// TanStack Query Hooks
// ============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const forecastKeys = {
  all: ["forecasts"] as const,
  depletion: (sku: string, horizonDays: number) =>
    [...forecastKeys.all, "depletion", sku, horizonDays] as const,
  saved: (sku: string) => [...forecastKeys.all, "saved", sku] as const,
  batch: (skuList: string[]) =>
    [...forecastKeys.all, "batch", ...skuList.sort()] as const,
  suggestions: () => [...forecastKeys.all, "suggestions"] as const,
  alerts: () => [...forecastKeys.all, "alerts"] as const,
};

/** Get depletion forecast for a SKU */
export function useDepletionForecast(
  sku: string,
  horizonDays = 30,
  save = false
) {
  return useQuery({
    queryKey: forecastKeys.depletion(sku, horizonDays),
    queryFn: () => getDepletionForecast(sku, horizonDays, save),
    enabled: !!sku,
    staleTime: 5 * 60_000, // Forecasts are compute-heavy, cache 5 min
  });
}

/** Get saved forecasts for a date range */
export function useSavedForecasts(
  sku: string,
  fromDate: Date,
  toDate: Date
) {
  return useQuery({
    queryKey: [...forecastKeys.saved(sku), fromDate.toISOString(), toDate.toISOString()],
    queryFn: () => getSavedForecasts(sku, fromDate, toDate),
    enabled: !!sku,
    staleTime: 5 * 60_000,
  });
}

/** Get reorder suggestions */
export function useReorderSuggestions(
  sku?: string,
  leadTimeDays = 7,
  safetyStockDays = 3
) {
  return useQuery({
    queryKey: [...forecastKeys.suggestions(), sku, leadTimeDays, safetyStockDays],
    queryFn: () => getReorderSuggestions(sku, leadTimeDays, safetyStockDays),
    staleTime: 5 * 60_000,
  });
}

/** Get forecast alerts */
export function useForecastAlerts(
  criticalThresholdDays = 7,
  warningThresholdDays = 14
) {
  return useQuery({
    queryKey: [...forecastKeys.alerts(), criticalThresholdDays, warningThresholdDays],
    queryFn: () => getForecastAlerts(criticalThresholdDays, warningThresholdDays),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // Auto-refresh every 5 min
  });
}

/** Generate reorder suggestions */
export function useGenerateReorderSuggestions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sku,
      leadTimeDays,
      safetyStockDays,
      save,
    }: {
      sku?: string;
      leadTimeDays?: number;
      safetyStockDays?: number;
      save?: boolean;
    }) => generateReorderSuggestions(sku, leadTimeDays, safetyStockDays, save),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: forecastKeys.suggestions() });
    },
  });
}

// ============================================================================
// Legacy compatibility wrapper
// ============================================================================

interface UseForecastsOptions {
  sku?: string;
  horizonDays?: number;
  leadTimeDays?: number;
  safetyStockDays?: number;
  autoFetch?: boolean;
}

/** @deprecated Use useDepletionForecast + useReorderSuggestions instead */
export function useForecasts(options: UseForecastsOptions = {}) {
  const {
    sku,
    horizonDays = 30,
    leadTimeDays = 7,
    safetyStockDays = 3,
  } = options;

  const forecastQuery = useDepletionForecast(sku ?? "", horizonDays);
  const suggestionsQuery = useReorderSuggestions(sku, leadTimeDays, safetyStockDays);
  const generateMutation = useGenerateReorderSuggestions();

  return {
    forecast: forecastQuery.data ?? null,
    suggestions: suggestionsQuery.data ?? [],
    isLoading: forecastQuery.isLoading || suggestionsQuery.isLoading,
    error: (forecastQuery.error || suggestionsQuery.error)?.message ?? null,
    fetchForecast: async (skuToFetch: string) => {
      // Changing SKU refetches automatically via query key change in useDepletionForecast
      // This is a no-op wrapper for backward compat
    },
    fetchSuggestions: async (_skuToFetch?: string) => {
      await suggestionsQuery.refetch();
    },
    generateSuggestions: async (skuToGenerate?: string, save = false) => {
      return generateMutation.mutateAsync({
        sku: skuToGenerate,
        leadTimeDays,
        safetyStockDays,
        save,
      });
    },
  };
}
