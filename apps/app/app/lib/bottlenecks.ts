"use client";

import { useCallback, useEffect, useState } from "react";
// NOTE: Keeping apiFetch for custom analytics bottleneck endpoint (no generated equivalent)
import { apiFetch } from "@/app/lib/api";
import { invariant } from "@/app/lib/invariant";

export interface BottleneckSuggestion {
  id: string;
  type: string;
  priority: string;
  title: string;
  description: string;
  reasoning: string;
  estimatedImpact: {
    area: string;
    improvement: string;
    confidence: string;
  };
  implementation: {
    effort: string;
    timeframe: string;
  };
  steps?: string[];
  aiGenerated: boolean;
}

export interface BottleneckItem {
  id: string;
  category: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  affectedEntity: {
    type: string;
    id: string;
    name: string;
  } | null;
  metrics: {
    currentValue: number;
    thresholdValue: number;
    percentOverThreshold: number;
    trend: string;
  };
  suggestion: BottleneckSuggestion | null;
  detectedAt: string;
}

export interface BottleneckAnalysis {
  meta: {
    period: string;
    startDate: string;
    endDate: string;
    locationId: string | null;
  };
  healthScore: {
    overall: number;
    byCategory: Record<string, number>;
  };
  summary: {
    total: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
  };
  bottlenecks: BottleneckItem[];
  analyzedAt: string;
}

export interface UseBottlenecksOptions {
  period?: string;
  category?: string;
  locationId?: string;
  useAi?: boolean;
  enabled?: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const expectRecord = (value: unknown, path: string): Record<string, unknown> => {
  invariant(isRecord(value), `${path} must be an object`);
  return value;
};

const expectString = (value: unknown, path: string): string => {
  invariant(typeof value === "string", `${path} must be a string`);
  return value;
};

const expectNumber = (value: unknown, path: string): number => {
  invariant(typeof value === "number" && Number.isFinite(value), `${path} must be a number`);
  return value;
};

const expectStringOrNull = (value: unknown, path: string): string | null => {
  if (value === null) return null;
  return expectString(value, path);
};

export function parseBottleneckAnalysis(payload: unknown): BottleneckAnalysis {
  const root = expectRecord(payload, "payload");
  const meta = expectRecord(root.meta, "meta");
  const healthScore = expectRecord(root.healthScore, "healthScore");
  const summary = expectRecord(root.summary, "summary");
  const byCategory = expectRecord(summary.byCategory ?? {}, "summary.byCategory");
  const bySeverity = expectRecord(summary.bySeverity ?? {}, "summary.bySeverity");

  const bottlenecks = Array.isArray(root.bottlenecks) ? root.bottlenecks : [];

  return {
    meta: {
      period: expectString(meta.period, "meta.period"),
      startDate: expectString(meta.startDate, "meta.startDate"),
      endDate: expectString(meta.endDate, "meta.endDate"),
      locationId: expectStringOrNull(meta.locationId, "meta.locationId"),
    },
    healthScore: {
      overall: expectNumber(healthScore.overall, "healthScore.overall"),
      byCategory: Object.fromEntries(
        Object.entries(byCategory).map(([key, value]) => [
          key,
          expectNumber(value, `healthScore.byCategory.${key}`),
        ])
      ),
    },
    summary: {
      total: expectNumber(summary.total, "summary.total"),
      bySeverity: Object.fromEntries(
        Object.entries(bySeverity).map(([key, value]) => [
          key,
          expectNumber(value, `summary.bySeverity.${key}`),
        ])
      ),
      byCategory: Object.fromEntries(
        Object.entries(byCategory).map(([key, value]) => [
          key,
          expectNumber(value, `summary.byCategory.${key}`),
        ])
      ),
    },
    bottlenecks: bottlenecks.map((item, index) => {
      const record = expectRecord(item, `bottlenecks[${index}]`);
      const metrics = expectRecord(record.metrics, `bottlenecks[${index}].metrics`);
      const suggestionRaw = record.suggestion;
      let suggestion: BottleneckSuggestion | null = null;

      if (suggestionRaw !== null && suggestionRaw !== undefined) {
        const s = expectRecord(suggestionRaw, `bottlenecks[${index}].suggestion`);
        const impact = expectRecord(s.estimatedImpact, `bottlenecks[${index}].suggestion.estimatedImpact`);
        const implementation = expectRecord(s.implementation, `bottlenecks[${index}].suggestion.implementation`);
        suggestion = {
          id: expectString(s.id, `bottlenecks[${index}].suggestion.id`),
          type: expectString(s.type, `bottlenecks[${index}].suggestion.type`),
          priority: expectString(s.priority, `bottlenecks[${index}].suggestion.priority`),
          title: expectString(s.title, `bottlenecks[${index}].suggestion.title`),
          description: expectString(s.description, `bottlenecks[${index}].suggestion.description`),
          reasoning: expectString(s.reasoning, `bottlenecks[${index}].suggestion.reasoning`),
          estimatedImpact: {
            area: expectString(impact.area, `bottlenecks[${index}].suggestion.estimatedImpact.area`),
            improvement: expectString(impact.improvement, `bottlenecks[${index}].suggestion.estimatedImpact.improvement`),
            confidence: expectString(impact.confidence, `bottlenecks[${index}].suggestion.estimatedImpact.confidence`),
          },
          implementation: {
            effort: expectString(implementation.effort, `bottlenecks[${index}].suggestion.implementation.effort`),
            timeframe: expectString(implementation.timeframe, `bottlenecks[${index}].suggestion.implementation.timeframe`),
          },
          steps: Array.isArray(s.steps)
            ? s.steps.map((step, stepIndex) =>
                expectString(step, `bottlenecks[${index}].suggestion.steps[${stepIndex}]`)
              )
            : undefined,
          aiGenerated: s.aiGenerated === true,
        };
      }

      const affectedRaw = record.affectedEntity;
      let affectedEntity: BottleneckItem["affectedEntity"] = null;
      if (affectedRaw !== null && affectedRaw !== undefined) {
        const affected = expectRecord(affectedRaw, `bottlenecks[${index}].affectedEntity`);
        affectedEntity = {
          type: expectString(affected.type, `bottlenecks[${index}].affectedEntity.type`),
          id: expectString(affected.id, `bottlenecks[${index}].affectedEntity.id`),
          name: expectString(affected.name, `bottlenecks[${index}].affectedEntity.name`),
        };
      }

      return {
        id: expectString(record.id, `bottlenecks[${index}].id`),
        category: expectString(record.category, `bottlenecks[${index}].category`),
        type: expectString(record.type, `bottlenecks[${index}].type`),
        severity: expectString(record.severity, `bottlenecks[${index}].severity`),
        title: expectString(record.title, `bottlenecks[${index}].title`),
        description: expectString(record.description, `bottlenecks[${index}].description`),
        affectedEntity,
        metrics: {
          currentValue: expectNumber(metrics.currentValue, `bottlenecks[${index}].metrics.currentValue`),
          thresholdValue: expectNumber(metrics.thresholdValue, `bottlenecks[${index}].metrics.thresholdValue`),
          percentOverThreshold: expectNumber(
            metrics.percentOverThreshold,
            `bottlenecks[${index}].metrics.percentOverThreshold`
          ),
          trend: expectString(metrics.trend, `bottlenecks[${index}].metrics.trend`),
        },
        suggestion,
        detectedAt: expectString(record.detectedAt, `bottlenecks[${index}].detectedAt`),
      };
    }),
    analyzedAt: expectString(root.analyzedAt, "analyzedAt"),
  };
}

export async function fetchBottleneckAnalysis(
  options: UseBottlenecksOptions = {}
): Promise<BottleneckAnalysis> {
  const { period = "30d", category, locationId, useAi = true } = options;
  const params = new URLSearchParams({ period, useAi: String(useAi) });
  if (category && category !== "all") params.set("category", category);
  if (locationId) params.set("locationId", locationId);

  const response = await apiFetch(`/api/analytics/bottlenecks?${params.toString()}`);
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to fetch bottleneck analysis" }));
    throw new Error(
      typeof error.message === "string" ? error.message : "Failed to fetch bottleneck analysis"
    );
  }

  return parseBottleneckAnalysis(await response.json());
}

export function useBottlenecks(options: UseBottlenecksOptions = {}) {
  const {
    period = "30d",
    category = "all",
    locationId,
    useAi = true,
    enabled = true,
  } = options;

  const [data, setData] = useState<BottleneckAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchBottleneckAnalysis({ period, category, locationId, useAi })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period, category, locationId, useAi, enabled, tick]);

  return { data, isLoading, error, refetch };
}
