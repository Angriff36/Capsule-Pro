"use client";

import { useQuery } from "@tanstack/react-query";

// Types for kitchen analytics data
export interface StationThroughput {
  stationId: string;
  stationName: string;
  load: number;
  completed: number;
  avgTime: string;
  totalItems: number;
  completedItems: number;
  pendingItems: number;
}

export interface KitchenHealth {
  prepListsSync: {
    rate: number;
    total: number;
    completed: number;
  };
  allergenWarnings: number;
  wasteAlerts: number;
  timeToCompletion: string;
  avgMinutes: number;
}

export interface StationTrend {
  stationName: string;
  total: number;
  completed: number;
  completionRate: number;
}

export interface DateTrend {
  date: string;
  stations: StationTrend[];
}

export interface TopPerformer {
  employeeId: string;
  firstName: string;
  lastName: string;
  completedTasks: number;
  avgMinutes: number;
}

export interface KitchenAnalyticsResponse {
  summary: {
    period: string;
    startDate: string;
    endDate: string;
    locationId: string | null;
  };
  stationThroughput: StationThroughput[];
  kitchenHealth: KitchenHealth;
  trends: DateTrend[];
  topPerformers: TopPerformer[];
}

async function fetchKitchenAnalytics(
  period?: string,
  locationId?: string
): Promise<KitchenAnalyticsResponse> {
  const params = new URLSearchParams();
  if (period) params.set("period", period);
  if (locationId) params.set("locationId", locationId);

  const response = await fetch(
    `/api/analytics/kitchen${params.toString() ? `?${params.toString()}` : ""}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch kitchen analytics");
  }

  return response.json();
}

export function useKitchenAnalytics(period?: string, locationId?: string) {
  return useQuery({
    queryKey: ["kitchen-analytics", period, locationId],
    queryFn: () => fetchKitchenAnalytics(period, locationId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Helper function to format completion time
export function formatCompletionTime(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Helper function to get load color
export function getLoadColor(load: number): string {
  if (load >= 80) return "bg-red-500";
  if (load >= 60) return "bg-orange-500";
  if (load >= 40) return "bg-yellow-500";
  return "bg-green-500";
}

// Helper function to get completion color
export function getCompletionColor(rate: number): string {
  if (rate >= 90) return "bg-emerald-500";
  if (rate >= 70) return "bg-blue-500";
  if (rate >= 50) return "bg-yellow-500";
  return "bg-red-500";
}
