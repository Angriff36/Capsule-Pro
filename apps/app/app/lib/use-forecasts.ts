"use client";

import { toast } from "sonner";

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
  horizonDays: number = 30,
  save: boolean = false
): Promise<DepletionForecast> {
  const params = new URLSearchParams({
    sku,
    horizon: horizonDays.toString(),
    save: save.toString(),
  });

  const response = await fetch(`/api/inventory/forecasts?${params}`);

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

  const response = await fetch(`/api/inventory/forecasts?${params}`);

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

  const response = await fetch(`/api/inventory/forecasts/batch?${params}`);

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
  leadTimeDays: number = 7,
  safetyStockDays: number = 3
): Promise<ReorderSuggestion[]> {
  const params = new URLSearchParams();
  if (sku) params.set("sku", sku);
  params.set("leadTimeDays", leadTimeDays.toString());
  params.set("safetyStockDays", safetyStockDays.toString());

  const response = await fetch(`/api/inventory/reorder-suggestions?${params}`);

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
  leadTimeDays: number = 7,
  safetyStockDays: number = 3,
  save: boolean = false
): Promise<{ success: boolean; count: number; suggestions: ReorderSuggestion[] }> {
  const response = await fetch("/api/inventory/reorder-suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku, leadTimeDays, safetyStockDays, save }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate reorder suggestions");
  }

  return response.json();
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

// React Hook

import { useState, useEffect, useCallback } from "react";

interface UseForecastsOptions {
  sku?: string;
  horizonDays?: number;
  leadTimeDays?: number;
  safetyStockDays?: number;
  autoFetch?: boolean;
}

export function useForecasts(options: UseForecastsOptions = {}) {
  const {
    sku,
    horizonDays = 30,
    leadTimeDays = 7,
    safetyStockDays = 3,
    autoFetch = true,
  } = options;

  const [forecast, setForecast] = useState<DepletionForecast | null>(null);
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch forecast for a SKU
  const fetchForecast = useCallback(
    async (skuToFetch: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getDepletionForecast(skuToFetch, horizonDays);
        setForecast(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch forecast";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [horizonDays]
  );

  // Fetch reorder suggestions
  const fetchSuggestions = useCallback(
    async (skuToFetch?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getReorderSuggestions(skuToFetch, leadTimeDays, safetyStockDays);
        setSuggestions(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to fetch suggestions";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [leadTimeDays, safetyStockDays]
  );

  // Generate new suggestions
  const generateSuggestions = useCallback(
    async (skuToGenerate?: string, save: boolean = false) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await generateReorderSuggestions(skuToGenerate, leadTimeDays, safetyStockDays, save);
        setSuggestions(data.suggestions);
        toast.success(`Generated ${data.count} reorder suggestions`);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to generate suggestions";
        setError(message);
        toast.error(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [leadTimeDays, safetyStockDays]
  );

  // Auto-fetch on mount if SKU provided
  useEffect(() => {
    if (autoFetch && sku) {
      fetchForecast(sku);
      fetchSuggestions(sku);
    }
  }, [autoFetch, sku, fetchForecast, fetchSuggestions]);

  return {
    forecast,
    suggestions,
    isLoading,
    error,
    fetchForecast,
    fetchSuggestions,
    generateSuggestions,
  };
}
