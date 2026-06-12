"use client";

import { useCallback, useEffect, useState } from "react";
// NOTE: Keeping apiFetch — analytics endpoint /api/analytics/menu-engineering has no generated client equivalent
import { apiFetch } from "@/app/lib/api";
import { invariant } from "@/app/lib/invariant";

export interface MenuEngineeringSummary {
  averageMarginPercent: number;
  endDate: string;
  locationId: string | null;
  lowPerformingDish: {
    id: string;
    name: string;
    contributionMargin: number;
  } | null;
  period: string;
  startDate: string;
  topPerformingDish: {
    id: string;
    name: string;
    contributionMargin: number;
  } | null;
  totalContributionMargin: number;
  totalCost: number;
  totalDishes: number;
  totalOrders: number;
  totalRevenue: number;
}

export interface MenuItemAnalysis {
  category: string | null;
  contributionMargin: number;
  costPerPerson: string | null;
  dishId: string;
  dishName: string;
  marginPercent: number;
  popularityScore: number;
  pricePerPerson: string | null;
  quadrant: "star" | "plowhorse" | "puzzle" | "dog";
  totalCost: number;
  totalGuestsServed: number;
  totalOrders: number;
  totalRevenue: number;
}

export interface CategoryAnalysis {
  averageMarginPercent: number;
  category: string;
  topDish: string | null;
  totalContributionMargin: number;
  totalDishes: number;
  totalOrders: number;
  totalRevenue: number;
}

export interface MenuEngineeringData {
  categoryAnalysis: CategoryAnalysis[];
  menuItems: MenuItemAnalysis[];
  quadrantDistribution: {
    star: number;
    plowhorse: number;
    puzzle: number;
    dog: number;
  };
  recommendations: string[];
  summary: MenuEngineeringSummary;
}

export interface UseMenuEngineeringOptions {
  enabled?: boolean;
  locationId?: string;
  period?: "7d" | "30d" | "90d" | "12m" | string;
}

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

const expectStringOrNull = (value: unknown, path: string): string | null => {
  if (value === null) {
    return null;
  }
  return expectString(value, path);
};

const readContributionMargin = (
  record: Record<string, unknown>,
  path: string
): number => {
  if ("contributionMargin" in record) {
    return expectNumber(
      record.contributionMargin,
      `${path}.contributionMargin`
    );
  }
  return expectNumber(
    record.contribution_margin,
    `${path}.contribution_margin`
  );
};

function parseMenuItemAnalysis(item: unknown, index: number): MenuItemAnalysis {
  const record = expectRecord(item, `menuItems[${index}]`);
  const quadrantValue = expectString(
    record.quadrant,
    `menuItems[${index}].quadrant`
  );
  invariant(
    quadrantValue === "star" ||
      quadrantValue === "plowhorse" ||
      quadrantValue === "puzzle" ||
      quadrantValue === "dog",
    `menuItems[${index}].quadrant must be star, plowhorse, puzzle, or dog`
  );

  return {
    dishId: expectString(record.dishId, `menuItems[${index}].dishId`),
    dishName: expectString(record.dishName, `menuItems[${index}].dishName`),
    category: expectStringOrNull(
      record.category,
      `menuItems[${index}].category`
    ),
    pricePerPerson: expectStringOrNull(
      record.pricePerPerson,
      `menuItems[${index}].pricePerPerson`
    ),
    costPerPerson: expectStringOrNull(
      record.costPerPerson,
      `menuItems[${index}].costPerPerson`
    ),
    totalOrders: expectNumber(
      record.totalOrders,
      `menuItems[${index}].totalOrders`
    ),
    totalGuestsServed: expectNumber(
      record.totalGuestsServed,
      `menuItems[${index}].totalGuestsServed`
    ),
    totalRevenue: expectNumber(
      record.totalRevenue,
      `menuItems[${index}].totalRevenue`
    ),
    totalCost: expectNumber(record.totalCost, `menuItems[${index}].totalCost`),
    contributionMargin: expectNumber(
      record.contributionMargin,
      `menuItems[${index}].contributionMargin`
    ),
    marginPercent: expectNumber(
      record.marginPercent,
      `menuItems[${index}].marginPercent`
    ),
    popularityScore: expectNumber(
      record.popularityScore,
      `menuItems[${index}].popularityScore`
    ),
    quadrant: quadrantValue,
  };
}

function parseDishSummary(
  dish: unknown,
  path: string
): MenuEngineeringSummary["topPerformingDish"] {
  if (dish === null) {
    return null;
  }
  const record = expectRecord(dish, path);
  return {
    id: expectString(record.id, `${path}.id`),
    name: expectString(record.name, `${path}.name`),
    contributionMargin: readContributionMargin(record, path),
  };
}

function parseMenuEngineeringSummary(summary: unknown): MenuEngineeringSummary {
  const record = expectRecord(summary, "summary");
  return {
    period: expectString(record.period, "summary.period"),
    startDate: expectString(record.startDate, "summary.startDate"),
    endDate: expectString(record.endDate, "summary.endDate"),
    locationId: expectStringOrNull(record.locationId, "summary.locationId"),
    totalDishes: expectNumber(record.totalDishes, "summary.totalDishes"),
    totalOrders: expectNumber(record.totalOrders, "summary.totalOrders"),
    totalRevenue: expectNumber(record.totalRevenue, "summary.totalRevenue"),
    totalCost: expectNumber(record.totalCost, "summary.totalCost"),
    totalContributionMargin: expectNumber(
      record.totalContributionMargin,
      "summary.totalContributionMargin"
    ),
    averageMarginPercent: expectNumber(
      record.averageMarginPercent,
      "summary.averageMarginPercent"
    ),
    topPerformingDish: parseDishSummary(
      record.topPerformingDish,
      "summary.topPerformingDish"
    ),
    lowPerformingDish: parseDishSummary(
      record.lowPerformingDish,
      "summary.lowPerformingDish"
    ),
  };
}

function parseCategoryAnalysis(
  category: unknown,
  index: number
): CategoryAnalysis {
  const record = expectRecord(category, `categoryAnalysis[${index}]`);
  return {
    category: expectString(
      record.category,
      `categoryAnalysis[${index}].category`
    ),
    totalDishes: expectNumber(
      record.totalDishes,
      `categoryAnalysis[${index}].totalDishes`
    ),
    totalOrders: expectNumber(
      record.totalOrders,
      `categoryAnalysis[${index}].totalOrders`
    ),
    totalRevenue: expectNumber(
      record.totalRevenue,
      `categoryAnalysis[${index}].totalRevenue`
    ),
    totalContributionMargin: expectNumber(
      record.totalContributionMargin,
      `categoryAnalysis[${index}].totalContributionMargin`
    ),
    averageMarginPercent: expectNumber(
      record.averageMarginPercent,
      `categoryAnalysis[${index}].averageMarginPercent`
    ),
    topDish: expectStringOrNull(
      record.topDish,
      `categoryAnalysis[${index}].topDish`
    ),
  };
}

export function parseMenuEngineeringResponse(
  payload: unknown
): MenuEngineeringData {
  const root = expectRecord(payload, "payload");
  const quadrantDistribution = expectRecord(
    root.quadrantDistribution,
    "quadrantDistribution"
  );

  return {
    summary: parseMenuEngineeringSummary(root.summary),
    menuItems: expectArray(root.menuItems, "menuItems").map(
      parseMenuItemAnalysis
    ),
    categoryAnalysis: expectArray(
      root.categoryAnalysis,
      "categoryAnalysis"
    ).map(parseCategoryAnalysis),
    recommendations: expectArray(root.recommendations, "recommendations").map(
      (item, index) => expectString(item, `recommendations[${index}]`)
    ),
    quadrantDistribution: {
      star: expectNumber(
        quadrantDistribution.star,
        "quadrantDistribution.star"
      ),
      plowhorse: expectNumber(
        quadrantDistribution.plowhorse,
        "quadrantDistribution.plowhorse"
      ),
      puzzle: expectNumber(
        quadrantDistribution.puzzle,
        "quadrantDistribution.puzzle"
      ),
      dog: expectNumber(quadrantDistribution.dog, "quadrantDistribution.dog"),
    },
  };
}

export async function fetchMenuEngineering(
  options: UseMenuEngineeringOptions = {}
): Promise<MenuEngineeringData> {
  const { period = "30d", locationId } = options;
  const params = new URLSearchParams({ period });
  if (locationId) {
    params.set("locationId", locationId);
  }

  const response = await apiFetch(
    `/api/analytics/menu-engineering?${params.toString()}`
  );
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Failed to fetch menu engineering analytics" }));
    throw new Error(
      typeof error.message === "string"
        ? error.message
        : "Failed to fetch menu engineering analytics"
    );
  }

  return parseMenuEngineeringResponse(await response.json());
}

export function useMenuEngineering(options: UseMenuEngineeringOptions = {}) {
  const { enabled = true, period = "30d", locationId } = options;
  const [data, setData] = useState<MenuEngineeringData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchMenuEngineering({ period, locationId })
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [period, locationId, enabled, tick]);

  return { data, isLoading, error, refetch };
}

export function getQuadrantInfo(quadrant: MenuItemAnalysis["quadrant"]): {
  name: string;
  description: string;
  color: string;
  bgColor: string;
  recommendation: string;
} {
  switch (quadrant) {
    case "star":
      return {
        name: "Star",
        description: "High popularity, high margin",
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
        recommendation: "Keep promoting — these are your best performers",
      };
    case "plowhorse":
      return {
        name: "Plowhorse",
        description: "High popularity, low margin",
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-950/30",
        recommendation: "Consider price increases or cost optimization",
      };
    case "puzzle":
      return {
        name: "Puzzle",
        description: "Low popularity, high margin",
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-50 dark:bg-amber-950/30",
        recommendation: "Feature more prominently to boost sales",
      };
    case "dog":
      return {
        name: "Dog",
        description: "Low popularity, low margin",
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-950/30",
        recommendation: "Consider removing or reformulating",
      };
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
