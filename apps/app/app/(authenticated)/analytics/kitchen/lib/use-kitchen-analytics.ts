"use client";

import { useMemo } from "react";
import { seedKitchenAnalytics } from "../../../data/seed-data";

export function getCompletionColor(value: number) {
  if (value >= 80) return "bg-emerald-500";
  if (value >= 60) return "bg-amber-500";
  if (value >= 40) return "bg-orange-500";
  return "bg-red-500";
}

export function useKitchenAnalytics(period: string) {
  return useMemo(() => {
    const multiplier = period === "30d" ? 1 : 1;
    const data = {
      ...seedKitchenAnalytics,
      stationThroughput: seedKitchenAnalytics.stationThroughput.map(
        (station) => ({
          ...station,
          load: Math.min(100, Math.round(station.load * multiplier)),
          completed: Math.min(100, Math.round(station.completed * multiplier)),
        })
      ),
    };

    return {
      data,
      isLoading: false,
      error: null,
    };
  }, [period]);
}
