"use client";

import { useState, useEffect, useCallback } from "react";

export interface MenuItemAnalysis {
  dishId: string;
  dishName: string;
  category: string | null;
  pricePerPerson: string | null;
  costPerPerson: string | null;
  totalOrders: number;
  totalGuestsServed: number;
  totalRevenue: number;
  totalCost: number;
  contributionMargin: number;
  marginPercent: number;
  popularityScore: number;
  quadrant: "star" | "plowhorse" | "puzzle" | "dog";
}

export interface CategoryAnalysis {
  category: string;
  totalDishes: number;
  totalOrders: number;
  totalRevenue: number;
  totalContributionMargin: number;
  averageMarginPercent: number;
  topDish: string | null;
}

export interface MenuEngineeringData {
  summary: {
    period: string;
    startDate: string;
    endDate: string;
    locationId: string | null;
    totalDishes: number;
    totalOrders: number;
    totalRevenue: number;
    totalCost: number;
    totalContributionMargin: number;
    averageMarginPercent: number;
    topPerformingDish: { id: string; name: string; contribution_margin: number } | null;
    lowPerformingDish: { id: string; name: string; contribution_margin: number } | null;
  };
  menuItems: MenuItemAnalysis[];
  categoryAnalysis: CategoryAnalysis[];
  recommendations: string[];
  quadrantDistribution: {
    star: number;
    plowhorse: number;
    puzzle: number;
    dog: number;
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getQuadrantInfo(quadrant: string): {
  name: string;
  color: string;
  bgColor: string;
} {
  switch (quadrant) {
    case "star":
      return { name: "Star", color: "text-emerald-700", bgColor: "bg-emerald-100" };
    case "plowhorse":
      return { name: "Plowhorse", color: "text-blue-700", bgColor: "bg-blue-100" };
    case "puzzle":
      return { name: "Puzzle", color: "text-amber-700", bgColor: "bg-amber-100" };
    case "dog":
      return { name: "Dog", color: "text-red-700", bgColor: "bg-red-100" };
    default:
      return { name: "Unknown", color: "text-muted-foreground", bgColor: "bg-muted" };
  }
}

interface UseMenuEngineeringOptions {
  period: string;
  enabled?: boolean;
  locationId?: string;
}

interface UseMenuEngineeringResult {
  data: MenuEngineeringData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMenuEngineering({
  period,
  enabled = true,
  locationId,
}: UseMenuEngineeringOptions): UseMenuEngineeringResult {
  const [data, setData] = useState<MenuEngineeringData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({ period });
    if (locationId) params.set("locationId", locationId);

    fetch(`/api/analytics/menu-engineering?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json() as Promise<MenuEngineeringData>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [period, locationId, enabled, tick]);

  return { data, isLoading, error, refetch };
}
