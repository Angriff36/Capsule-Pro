"use client";

import { useEffect, useState } from "react";
import { invariant } from "@/app/lib/invariant";

type KitchenAnalyticsSummary = {
  period: string;
  startDate: string;
  endDate: string;
  locationId: string | null;
};

type StationThroughput = {
  stationId: string;
  stationName: string;
  load: number;
  completed: number;
  avgTime: string;
  totalItems: number;
  completedItems: number;
  pendingItems: number;
};

type KitchenHealth = {
  prepListsSync: {
    rate: number;
    total: number;
    completed: number;
  };
  allergenWarnings: number;
  wasteAlerts: number;
  timeToCompletion: string;
  avgMinutes?: number;
};

type KitchenTrendStation = {
  stationName: string;
  total: number;
  completed: number;
  completionRate: number;
};

type KitchenTrend = {
  date: string;
  stations: KitchenTrendStation[];
};

type KitchenTopPerformer = {
  employeeId: string;
  firstName: string;
  lastName: string;
  completedTasks: number;
  avgMinutes: number;
};

export type KitchenAnalyticsData = {
  summary: KitchenAnalyticsSummary;
  stationThroughput: StationThroughput[];
  kitchenHealth: KitchenHealth;
  trends: KitchenTrend[];
  topPerformers: KitchenTopPerformer[];
};

export type UseKitchenAnalyticsOptions = {
  period?: "7d" | "30d" | "90d" | "12m";
  locationId?: string;
  enabled?: boolean;
};

export type UseKitchenAnalyticsReturn = {
  data: KitchenAnalyticsData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const expectRecord = (
  value: unknown,
  path: string
): Record<string, unknown> => {
  invariant(isRecord(value), `${path} must be an object`);
  return value;
};

const expectArray = (value: unknown, path: string): unknown[] => {
  invariant(Array.isArray(value), `${path} must be an array`);
  return value;
};

const expectString = (value: unknown, path: string): string => {
  invariant(typeof value === "string", `${path} must be a string`);
  return value;
};

const expectNumber = (value: unknown, path: string): number => {
  invariant(
    typeof value === "number" && Number.isFinite(value),
    `${path} must be a number`
  );
  return value;
};

export const parseKitchenAnalyticsResponse = (
  payload: unknown
): KitchenAnalyticsData => {
  invariant(isRecord(payload), "payload must be an object");

  const summary = expectRecord(payload.summary, "payload.summary");
  const stationThroughput = expectArray(
    payload.stationThroughput,
    "payload.stationThroughput"
  ).map((station, index) => {
    const record = expectRecord(station, `payload.stationThroughput[${index}]`);
    return {
      stationId: expectString(
        record.stationId,
        `payload.stationThroughput[${index}].stationId`
      ),
      stationName: expectString(
        record.stationName,
        `payload.stationThroughput[${index}].stationName`
      ),
      load: expectNumber(
        record.load,
        `payload.stationThroughput[${index}].load`
      ),
      completed: expectNumber(
        record.completed,
        `payload.stationThroughput[${index}].completed`
      ),
      avgTime: expectString(
        record.avgTime,
        `payload.stationThroughput[${index}].avgTime`
      ),
      totalItems: expectNumber(
        record.totalItems,
        `payload.stationThroughput[${index}].totalItems`
      ),
      completedItems: expectNumber(
        record.completedItems,
        `payload.stationThroughput[${index}].completedItems`
      ),
      pendingItems: expectNumber(
        record.pendingItems,
        `payload.stationThroughput[${index}].pendingItems`
      ),
    };
  });

  const kitchenHealth = expectRecord(
    payload.kitchenHealth,
    "payload.kitchenHealth"
  );
  const prepListsSync = expectRecord(
    kitchenHealth.prepListsSync,
    "payload.kitchenHealth.prepListsSync"
  );
  const trends = expectArray(payload.trends, "payload.trends").map(
    (trend, index) => {
      const record = expectRecord(trend, `payload.trends[${index}]`);
      const stations = expectArray(
        record.stations,
        `payload.trends[${index}].stations`
      ).map((station, stationIndex) => {
        const stationRecord = expectRecord(
          station,
          `payload.trends[${index}].stations[${stationIndex}]`
        );
        return {
          stationName: expectString(
            stationRecord.stationName,
            `payload.trends[${index}].stations[${stationIndex}].stationName`
          ),
          total: expectNumber(
            stationRecord.total,
            `payload.trends[${index}].stations[${stationIndex}].total`
          ),
          completed: expectNumber(
            stationRecord.completed,
            `payload.trends[${index}].stations[${stationIndex}].completed`
          ),
          completionRate: expectNumber(
            stationRecord.completionRate,
            `payload.trends[${index}].stations[${stationIndex}].completionRate`
          ),
        };
      });
      return {
        date: expectString(record.date, `payload.trends[${index}].date`),
        stations,
      };
    }
  );

  const topPerformers = expectArray(
    payload.topPerformers,
    "payload.topPerformers"
  ).map((performer, index) => {
    const record = expectRecord(performer, `payload.topPerformers[${index}]`);
    return {
      employeeId: expectString(
        record.employeeId,
        `payload.topPerformers[${index}].employeeId`
      ),
      firstName: expectString(
        record.firstName,
        `payload.topPerformers[${index}].firstName`
      ),
      lastName: expectString(
        record.lastName,
        `payload.topPerformers[${index}].lastName`
      ),
      completedTasks: expectNumber(
        record.completedTasks,
        `payload.topPerformers[${index}].completedTasks`
      ),
      avgMinutes: expectNumber(
        record.avgMinutes,
        `payload.topPerformers[${index}].avgMinutes`
      ),
    };
  });

  const avgMinutesValue = kitchenHealth.avgMinutes;

  return {
    summary: {
      period: expectString(summary.period, "payload.summary.period"),
      startDate: expectString(summary.startDate, "payload.summary.startDate"),
      endDate: expectString(summary.endDate, "payload.summary.endDate"),
      locationId:
        summary.locationId === null
          ? null
          : expectString(summary.locationId, "payload.summary.locationId"),
    },
    stationThroughput,
    kitchenHealth: {
      prepListsSync: {
        rate: expectNumber(
          prepListsSync.rate,
          "payload.kitchenHealth.prepListsSync.rate"
        ),
        total: expectNumber(
          prepListsSync.total,
          "payload.kitchenHealth.prepListsSync.total"
        ),
        completed: expectNumber(
          prepListsSync.completed,
          "payload.kitchenHealth.prepListsSync.completed"
        ),
      },
      allergenWarnings: expectNumber(
        kitchenHealth.allergenWarnings,
        "payload.kitchenHealth.allergenWarnings"
      ),
      wasteAlerts: expectNumber(
        kitchenHealth.wasteAlerts,
        "payload.kitchenHealth.wasteAlerts"
      ),
      timeToCompletion: expectString(
        kitchenHealth.timeToCompletion,
        "payload.kitchenHealth.timeToCompletion"
      ),
      ...(avgMinutesValue === undefined
        ? {}
        : {
            avgMinutes: expectNumber(
              avgMinutesValue,
              "payload.kitchenHealth.avgMinutes"
            ),
          }),
    },
    trends,
    topPerformers,
  };
};

export function getCompletionColor(value: number) {
  if (value >= 80) return "bg-emerald-500";
  if (value >= 60) return "bg-amber-500";
  if (value >= 40) return "bg-orange-500";
  return "bg-red-500";
}

export async function fetchKitchenAnalytics(
  options: UseKitchenAnalyticsOptions = {}
): Promise<KitchenAnalyticsData> {
  const { period = "30d", locationId } = options;

  const params = new URLSearchParams();
  params.set("period", period);
  if (locationId) params.set("locationId", locationId);

  const response = await fetch(`/api/analytics/kitchen?${params.toString()}`);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to fetch kitchen analytics" }));
    throw new Error(error.message || "Failed to fetch kitchen analytics");
  }

  const payload = await response.json();
  return parseKitchenAnalyticsResponse(payload);
}

export function useKitchenAnalytics(
  options: UseKitchenAnalyticsOptions = {}
): UseKitchenAnalyticsReturn {
  const { enabled = true, ...fetchOptions } = options;
  const [data, setData] = useState<KitchenAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchKitchenAnalytics(fetchOptions);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch kitchen analytics")
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [enabled, fetchOptions.period, fetchOptions.locationId]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}
