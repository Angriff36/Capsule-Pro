"use server";
import {
  listEvents,
  listEventProfitabilities,
  listInventoryTransactions,
  listTimeEntries,
} from "@/app/lib/manifest-client.generated";

import "server-only";

import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "../../../../lib/tenant";

export interface EventProfitabilityMetrics {
  actualFoodCost: number;
  actualGrossMargin: number;
  actualGrossMarginPct: number;
  actualLaborCost: number;
  actualOverhead: number;

  actualRevenue: number;
  actualTotalCost: number;
  budgetedFoodCost: number;
  budgetedGrossMargin: number;
  budgetedGrossMarginPct: number;
  budgetedLaborCost: number;
  budgetedOverhead: number;

  budgetedRevenue: number;
  budgetedTotalCost: number;
  eventDate: Date;
  eventId: string;
  eventTitle: string;
  foodCostVariance: number;
  guestCount: number;
  laborCostVariance: number;

  marginTrend: Array<{
    date: Date;
    marginPct: number;
  }>;
  marginVariancePct: number;

  revenueVariance: number;
  totalCostVariance: number;
}

export interface HistoricalProfitabilityData {
  averageFoodCostPct: number;
  averageGrossMarginPct: number;
  averageLaborCostPct: number;
  averageOverheadPct: number;
  period: string;
  totalCost: number;
  totalEvents: number;
  totalRevenue: number;
}

export async function calculateEventProfitability(
  eventId: string
): Promise<EventProfitabilityMetrics> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  await getTenantIdForOrg(orgId);

  const [events, inventoryTransactions, timeEntries, profitabilityRows] =
    await Promise.all([
      (await listEvents()).data,
      (await listInventoryTransactions()).data,
      (await listTimeEntries()).data,
      (await listEventProfitabilities()).data,
    ]);

  const event = events.find((row) => row.id === eventId) ?? null;

  if (!event) {
    throw new Error("Event not found");
  }

  const budgetedRevenue = Number(event.budget || 0);
  const eventStart = new Date(event.eventDate);
  eventStart.setHours(0, 0, 0, 0);
  const eventEnd = new Date(event.eventDate);
  eventEnd.setHours(23, 59, 59, 999);

  const actualFoodCost = inventoryTransactions
    .filter(
      (transaction) =>
        String(transaction.referenceType) === "event" &&
        String(transaction.referenceId) === eventId &&
        ["use", "waste"].includes(String(transaction.transactionType))
    )
    .reduce(
      (sum, transaction) =>
        sum +
        Number(transaction.quantity ?? 0) * Number(transaction.unitCost ?? 0),
      0
    );

  const totalLaborHours = timeEntries
    .filter(
      (entry) =>
        entry.locationId === event.locationId &&
        entry.clockIn >= eventStart &&
        entry.clockIn <= eventEnd
    )
    .reduce((sum, entry) => {
      if (!entry.clockOut) return sum;
      const workedMs = entry.clockOut.getTime() - entry.clockIn.getTime();
      const breakHours = Number(entry.breakMinutes ?? 0) / 60;
      return sum + workedMs / (1000 * 60 * 60) - breakHours;
    }, 0);
  const actualLaborCost = totalLaborHours * 25;

  const budgetedFoodCostPct = 0.35;
  const budgetedLaborCostPct = 0.25;
  const budgetedOverheadPct = 0.1;

  const budgetedFoodCost = budgetedRevenue * budgetedFoodCostPct;
  const budgetedLaborCost = budgetedRevenue * budgetedLaborCostPct;
  const budgetedOverhead = budgetedRevenue * budgetedOverheadPct;
  const budgetedTotalCost =
    budgetedFoodCost + budgetedLaborCost + budgetedOverhead;
  const budgetedGrossMargin = budgetedRevenue - budgetedTotalCost;
  const budgetedGrossMarginPct =
    budgetedRevenue > 0 ? (budgetedGrossMargin / budgetedRevenue) * 100 : 0;

  const actualOverhead = actualFoodCost * 0.1;
  const actualTotalCost = actualFoodCost + actualLaborCost + actualOverhead;
  const actualRevenue = budgetedRevenue;
  const actualGrossMargin = actualRevenue - actualTotalCost;
  const actualGrossMarginPct =
    actualRevenue > 0 ? (actualGrossMargin / actualRevenue) * 100 : 0;

  const revenueVariance = actualRevenue - budgetedRevenue;
  const foodCostVariance = actualFoodCost - budgetedFoodCost;
  const laborCostVariance = actualLaborCost - budgetedLaborCost;
  const totalCostVariance = actualTotalCost - budgetedTotalCost;
  const marginVariancePct = actualGrossMarginPct - budgetedGrossMarginPct;

  const marginBuckets = new Map<string, number[]>();
  for (const row of profitabilityRows) {
    const month = row.calculatedAt.toISOString().slice(0, 7);
    const values = marginBuckets.get(month) ?? [];
    values.push(Number(row.actualGrossMarginPct ?? 0));
    marginBuckets.set(month, values);
  }
  const marginTrend = Array.from(marginBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, values]) => ({
      date: new Date(`${month}-01`),
      marginPct:
        values.length > 0
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : 0,
    }));

  return {
    eventId,
    eventTitle: event.title,
    eventDate: event.eventDate,
    guestCount: event.guestCount,
    budgetedRevenue,
    budgetedFoodCost,
    budgetedLaborCost,
    budgetedOverhead,
    budgetedTotalCost,
    budgetedGrossMargin,
    budgetedGrossMarginPct,
    actualRevenue,
    actualFoodCost,
    actualLaborCost,
    actualOverhead,
    actualTotalCost,
    actualGrossMargin,
    actualGrossMarginPct,
    revenueVariance,
    foodCostVariance,
    laborCostVariance,
    totalCostVariance,
    marginVariancePct,
    marginTrend,
  };
}

export async function getHistoricalProfitability(
  months = 12
): Promise<HistoricalProfitabilityData[]> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  await getTenantIdForOrg(orgId);
  const [events, profitabilityRows] = await Promise.all([
    (await listEvents()).data,
    (await listEventProfitabilities()).data,
  ]);

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const profitByEvent = new Map(
    profitabilityRows.map((row) => [row.eventId, row])
  );
  const buckets = new Map<
    string,
    {
      totalEvents: number;
      totalRevenue: number;
      totalCost: number;
      grossMarginPct: number[];
      foodPct: number[];
      laborPct: number[];
      overheadPct: number[];
    }
  >();
  for (const event of events) {
    if (event.eventDate < startDate) continue;
    const month = event.eventDate.toISOString().slice(0, 7);
    const profit = profitByEvent.get(event.id);
    const bucket = buckets.get(month) ?? {
      totalEvents: 0,
      totalRevenue: 0,
      totalCost: 0,
      grossMarginPct: [],
      foodPct: [],
      laborPct: [],
      overheadPct: [],
    };
    bucket.totalEvents += 1;
    bucket.totalRevenue += Number(profit?.actualRevenue ?? 0);
    bucket.totalCost += Number(profit?.actualTotalCost ?? 0);
    bucket.grossMarginPct.push(Number(profit?.actualGrossMarginPct ?? 0));
    if (Number(profit?.actualRevenue ?? 0) > 0) {
      bucket.foodPct.push(
        (Number(profit?.actualFoodCost ?? 0) / Number(profit?.actualRevenue ?? 1)) *
          100
      );
      bucket.laborPct.push(
        (Number(profit?.actualLaborCost ?? 0) / Number(profit?.actualRevenue ?? 1)) *
          100
      );
      bucket.overheadPct.push(
        (Number(profit?.actualOverhead ?? 0) / Number(profit?.actualRevenue ?? 1)) *
          100
      );
    }
    buckets.set(month, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, bucket]) => ({
      period,
      totalEvents: bucket.totalEvents,
      averageGrossMarginPct:
        bucket.grossMarginPct.length > 0
          ? bucket.grossMarginPct.reduce((sum, value) => sum + value, 0) /
            bucket.grossMarginPct.length
          : 0,
      totalRevenue: bucket.totalRevenue,
      totalCost: bucket.totalCost,
      averageFoodCostPct:
        bucket.foodPct.length > 0
          ? bucket.foodPct.reduce((sum, value) => sum + value, 0) /
            bucket.foodPct.length
          : 0,
      averageLaborCostPct:
        bucket.laborPct.length > 0
          ? bucket.laborPct.reduce((sum, value) => sum + value, 0) /
            bucket.laborPct.length
          : 0,
      averageOverheadPct:
        bucket.overheadPct.length > 0
          ? bucket.overheadPct.reduce((sum, value) => sum + value, 0) /
            bucket.overheadPct.length
          : 0,
    }));
}

export async function getEventProfitabilityList(
  limit = 50
): Promise<EventProfitabilityMetrics[]> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  await getTenantIdForOrg(orgId);
  const [events, profitabilityRows] = await Promise.all([
    (await listEvents()).data,
    (await listEventProfitabilities()).data,
  ]);
  const profitabilityByEvent = new Map(
    profitabilityRows.map((row) => [row.eventId, row])
  );
  return [...events]
    .sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime())
    .slice(0, limit)
    .map((event) => {
      const profitability = profitabilityByEvent.get(event.id);
      return {
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.eventDate,
        guestCount: event.guestCount,
        budgetedRevenue: Number(profitability?.budgetedRevenue ?? event.budget ?? 0),
        budgetedFoodCost: Number(profitability?.budgetedFoodCost ?? 0),
        budgetedLaborCost: Number(profitability?.budgetedLaborCost ?? 0),
        budgetedOverhead: Number(profitability?.budgetedOverhead ?? 0),
        budgetedTotalCost: Number(profitability?.budgetedTotalCost ?? 0),
        budgetedGrossMargin: Number(profitability?.budgetedGrossMargin ?? 0),
        budgetedGrossMarginPct: Number(profitability?.budgetedGrossMarginPct ?? 0),
        actualRevenue: Number(profitability?.actualRevenue ?? 0),
        actualFoodCost: Number(profitability?.actualFoodCost ?? 0),
        actualLaborCost: Number(profitability?.actualLaborCost ?? 0),
        actualOverhead: Number(profitability?.actualOverhead ?? 0),
        actualTotalCost: Number(profitability?.actualTotalCost ?? 0),
        actualGrossMargin: Number(profitability?.actualGrossMargin ?? 0),
        actualGrossMarginPct: Number(profitability?.actualGrossMarginPct ?? 0),
        revenueVariance: Number(profitability?.revenueVariance ?? 0),
        foodCostVariance: Number(profitability?.foodCostVariance ?? 0),
        laborCostVariance: Number(profitability?.laborCostVariance ?? 0),
        totalCostVariance: Number(profitability?.totalCostVariance ?? 0),
        marginVariancePct: Number(profitability?.marginVariancePct ?? 0),
        marginTrend: [],
      };
    });
}
