"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { invariant } from "@/app/lib/invariant";

export interface MenuEngineeringSummary {
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
  topPerformingDish: {
    id: string;
    name: string;
    contributionMargin: number;
  } | null;
  lowPerformingDish: {
    id: string;
    name: string;
    contributionMargin: number;
  } | null;
}

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

export interface QuadrantDistribution {
  star: number;
  plowhorse: number;
  puzzle: number;
  dog: number;
}

export interface MenuEngineeringData {
  summary: MenuEngineeringSummary;
  menuItems: MenuItemAnalysis[];
  categoryAnalysis: CategoryAnalysis[];
  recommendations: string[];
  quadrantDistribution: QuadrantDistribution;
}

export interface UseMenuEngineeringOptions {
  period?: "7d" | "30d" | "90d" | "12m";
  locationId?: string;
  enabled?: boolean;
}

export interface UseMenuEngineeringReturn {
  data: MenuEngineeringData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
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
  if (value === null) return null;
  invariant(typeof value === "string", `${path} must be a string or null`);
  return value;
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
    `menuItems[${index}].quadrant must be one of: star, plowhorse, puzzle, dog`
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
    quadrant: quadrantValue as MenuItemAnalysis["quadrant"],
  };
}

function parseMenuEngineeringSummary(summary: unknown): MenuEngineeringSummary {
  const record = expectRecord(summary, "summary");

  const topDish = record.topPerformingDish;
  const lowDish = record.lowPerformingDish;

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
    topPerformingDish:
      topDish !== null
        ? {
            id: expectString(topDish.id, "summary.topPerformingDish.id"),
            name: expectString(topDish.name, "summary.topPerformingDish.name"),
            contributionMargin: expectNumber(
              topDish.contributionMargin,
              "summary.topPerformingDish.contributionMargin"
            ),
          }
        : null,
    lowPerformingDish:
      lowDish !== null
        ? {
            id: expectString(lowDish.id, "summary.lowPerformingDish.id"),
            name: expectString(lowDish.name, "summary.lowPerformingDish.name"),
            contributionMargin: expectNumber(
              lowDish.contributionMargin,
              "summary.lowPerformingDish.contributionMargin"
            ),
          }
        : null,
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

export const parseMenuEngineeringResponse = (
  payload: unknown
): MenuEngineeringData => {
  invariant(isRecord(payload), "payload must be an object");

  const summary = parseMenuEngineeringSummary(payload.summary);
  const menuItems = expectArray(payload.menuItems, "payload.menuItems").map(
    parseMenuItemAnalysis
  );
  const categoryAnalysis = expectArray(
    payload.categoryAnalysis,
    "payload.categoryAnalysis"
  ).map(parseCategoryAnalysis);
  const recommendations = expectArray(
    payload.recommendations,
    "payload.recommendations"
  ).map((rec, index) => expectString(rec, `payload.recommendations[${index}]`));

  const quadrantDistribution = expectRecord(
    payload.quadrantDistribution,
    "payload.quadrantDistribution"
  );

  return {
    summary,
    menuItems,
    categoryAnalysis,
    recommendations,
    quadrantDistribution: {
      star: expectNumber(
        quadrantDistribution.star,
        "payload.quadrantDistribution.star"
      ),
      plowhorse: expectNumber(
        quadrantDistribution.plowhorse,
        "payload.quadrantDistribution.plowhorse"
      ),
      puzzle: expectNumber(
        quadrantDistribution.puzzle,
        "payload.quadrantDistribution.puzzle"
      ),
      dog: expectNumber(
        quadrantDistribution.dog,
        "payload.quadrantDistribution.dog"
      ),
    },
  };
};

export async function fetchMenuEngineering(
  options: UseMenuEngineeringOptions = {}
): Promise<MenuEngineeringData> {
  const { period = "30d", locationId } = options;

  const params = new URLSearchParams();
  params.set("period", period);
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
      error.message || "Failed to fetch menu engineering analytics"
    );
  }

  const payload = await response.json();
  return parseMenuEngineeringResponse(payload);
}

export function useMenuEngineering(
  options: UseMenuEngineeringOptions = {}
): UseMenuEngineeringReturn {
  const { enabled = true, ...fetchOptions } = options;
  const [data, setData] = useState<MenuEngineeringData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    if (!enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchMenuEngineering(fetchOptions);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to fetch menu engineering analytics")
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
        recommendation: "Keep promoting - these are your best performers",
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
