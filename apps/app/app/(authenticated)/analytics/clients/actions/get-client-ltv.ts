"use server";

import "server-only";

import {
  listCateringOrders,
  listClients,
} from "@/app/lib/manifest-client.generated";
import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "../../../../lib/tenant";

export interface ClientLTVMetrics {
  averageLTV: number;
  averageOrderValue: number;
  cohortData: Array<{
    cohort: string;
    month0: number;
    month1: number;
    month2: number;
    month3: number;
    month4: number;
    month5: number;
    month6: number;
    month7: number;
    month8: number;
    month9: number;
    month10: number;
    month11: number;
  }>;
  medianLTV: number;
  predictiveLTV: {
    averagePredictedLTV: number;
    confidence: number;
    clientSegments: Array<{
      segment: string;
      count: number;
      avgHistoricalLTV: number;
      avgPredictedLTV: number;
      growthRate: number;
    }>;
  };
  retentionRate: number;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    orders: number;
    clients: number;
  }>;
  topClients: Array<{
    id: string;
    name: string;
    email: string | null;
    lifetimeValue: number;
    orderCount: number;
    lastOrderDate: Date | null;
    averageOrderValue: number;
  }>;
  totalClients: number;
  totalRevenue: number;
}

interface OrderMonthData {
  client_count: string | number;
  month: string;
  order_count: string | number;
  total_revenue: string | number;
}

interface ClientLTVData {
  averageOrderValue: number;
  createdAt: Date;
  email: string | null;
  id: string;
  lastOrderDate: Date | null;
  lifetimeValue: number;
  name: string;
  orderCount: number;
}

export async function getClientLTVMetrics(): Promise<ClientLTVMetrics> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  await getTenantIdForOrg(orgId);

  const [clients, cateringOrders] = await Promise.all([
    (await listClients()).data,
    (await listCateringOrders()).data,
  ]);

  const ordersByClient = new Map<string, typeof cateringOrders>();
  for (const order of cateringOrders) {
    if (!order.customerId) continue;
    const existing = ordersByClient.get(order.customerId) ?? [];
    existing.push(order);
    ordersByClient.set(order.customerId, existing);
  }

  const clientLTVResult: ClientLTVData[] = clients
    .map((client) => {
      const clientOrders = ordersByClient.get(client.id) ?? [];
      const lifetimeValue = clientOrders.reduce(
        (sum, order) => sum + Number(order.totalAmount ?? 0),
        0
      );
      const orderCount = clientOrders.length;
      const lastOrderDate =
        clientOrders.length > 0
          ? clientOrders.reduce(
              (latest, order) =>
                order.orderDate > latest ? order.orderDate : latest,
              clientOrders[0].orderDate
            )
          : null;

      return {
        id: client.id,
        name:
          client.companyName ||
          [client.firstName, client.lastName].filter(Boolean).join(" ") ||
          "Unnamed client",
        email: client.email,
        lifetimeValue,
        orderCount,
        lastOrderDate,
        averageOrderValue: orderCount > 0 ? lifetimeValue / orderCount : 0,
        createdAt: client.createdAt,
      };
    })
    .sort((a, b) => b.lifetimeValue - a.lifetimeValue);

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const monthMap = new Map<
    string,
    { revenue: number; orders: number; clients: Set<string> }
  >();
  for (const order of cateringOrders) {
    if (order.orderDate < twelveMonthsAgo) continue;
    const month = order.orderDate.toISOString().slice(0, 7);
    const existing = monthMap.get(month) ?? { revenue: 0, orders: 0, clients: new Set<string>() };
    existing.revenue += Number(order.totalAmount ?? 0);
    existing.orders += 1;
    if (order.customerId) {
      existing.clients.add(order.customerId);
    }
    monthMap.set(month, existing);
  }
  const revenueByMonthRaw: OrderMonthData[] = Array.from(monthMap.entries()).map(
    ([month, value]) => ({
      month,
      total_revenue: value.revenue,
      order_count: value.orders,
      client_count: value.clients.size,
    })
  );

  if (clientLTVResult.length === 0) {
    return {
      totalClients: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      averageLTV: 0,
      medianLTV: 0,
      retentionRate: 0,
      topClients: [],
      revenueByMonth: [],
      cohortData: [],
      predictiveLTV: {
        averagePredictedLTV: 0,
        confidence: 0,
        clientSegments: [],
      },
    };
  }

  const clientData = clientLTVResult.map((client) => ({
    ...client,
    lifetimeValue: Number(client.lifetimeValue),
    averageOrderValue: Number(client.averageOrderValue),
  }));

  const totalRevenue = clientData.reduce((sum, c) => sum + c.lifetimeValue, 0);
  const totalOrders = clientData.reduce((sum, c) => sum + c.orderCount, 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const sortedByLTV = [...clientData].sort(
    (a, b) => a.lifetimeValue - b.lifetimeValue
  );
  const medianLTV =
    sortedByLTV.length > 0
      ? sortedByLTV[Math.floor(sortedByLTV.length / 2)].lifetimeValue
      : 0;
  const averageLTV =
    clientData.length > 0 ? totalRevenue / clientData.length : 0;

  const now = new Date();
  const oneYearAgo = new Date(
    now.getFullYear() - 1,
    now.getMonth(),
    now.getDate()
  );
  const retainedClients = clientData.filter(
    (c) =>
      c.lastOrderDate !== null &&
      new Date(c.lastOrderDate) >= oneYearAgo &&
      c.orderCount > 1
  );
  const retentionRate =
    clientData.length > 0
      ? (retainedClients.length / clientData.length) * 100
      : 0;

  const topClients = clientData.slice(0, 10);

  const revenueByMonth = calculateRevenueByMonth(revenueByMonthRaw);
  const cohortData = calculateCohortAnalysis(clientData);
  const predictiveLTV = calculatePredictiveLTV(clientData);

  return {
    totalClients: clientData.length,
    totalRevenue,
    averageOrderValue,
    averageLTV,
    medianLTV,
    retentionRate,
    topClients,
    revenueByMonth,
    cohortData,
    predictiveLTV,
  };
}

function calculateRevenueByMonth(
  revenueData: OrderMonthData[]
): Array<{ month: string; revenue: number; orders: number; clients: number }> {
  const now = new Date();
  const months: Array<{
    month: string;
    revenue: number;
    orders: number;
    clients: number;
  }> = [];

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = date.toISOString().slice(0, 7);

    const monthData = revenueData.find((r) => r.month === monthKey);

    months.push({
      month: monthKey,
      revenue: monthData ? Number(monthData.total_revenue) : 0,
      orders: monthData ? Number(monthData.order_count) : 0,
      clients: monthData ? Number(monthData.client_count) : 0,
    });
  }

  return months;
}

function calculateCohortAnalysis(clientData: ClientLTVData[]): Array<{
  cohort: string;
  month0: number;
  month1: number;
  month2: number;
  month3: number;
  month4: number;
  month5: number;
  month6: number;
  month7: number;
  month8: number;
  month9: number;
  month10: number;
  month11: number;
}> {
  const cohorts: Map<
    string,
    Array<{ value: number; monthsSinceFirst: number }>
  > = new Map();
  const now = new Date();

  for (const client of clientData) {
    const cohortMonth = new Date(client.createdAt).toISOString().slice(0, 7);
    if (!cohorts.has(cohortMonth)) {
      cohorts.set(cohortMonth, []);
    }

    const monthsSinceFirst = Math.floor(
      (now.getTime() - new Date(client.createdAt).getTime()) /
        (1000 * 60 * 60 * 24 * 30)
    );

    const cohortClients = cohorts.get(cohortMonth);
    if (cohortClients) {
      cohortClients.push({
        value: client.lifetimeValue,
        monthsSinceFirst: Math.min(monthsSinceFirst, 11),
      });
    }
  }

  const sortedCohorts = Array.from(cohorts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6);

  return sortedCohorts.map(([cohort, clients]) => {
    const retentionByMonth: number[] = new Array(12).fill(0);

    for (const { monthsSinceFirst } of clients) {
      for (let i = 0; i <= monthsSinceFirst; i++) {
        retentionByMonth[i]++;
      }
    }

    const cohortSize = clients.length;

    return {
      cohort,
      month0: cohortSize > 0 ? 100 : 0,
      month1: cohortSize > 0 ? (retentionByMonth[1] / cohortSize) * 100 : 0,
      month2: cohortSize > 0 ? (retentionByMonth[2] / cohortSize) * 100 : 0,
      month3: cohortSize > 0 ? (retentionByMonth[3] / cohortSize) * 100 : 0,
      month4: cohortSize > 0 ? (retentionByMonth[4] / cohortSize) * 100 : 0,
      month5: cohortSize > 0 ? (retentionByMonth[5] / cohortSize) * 100 : 0,
      month6: cohortSize > 0 ? (retentionByMonth[6] / cohortSize) * 100 : 0,
      month7: cohortSize > 0 ? (retentionByMonth[7] / cohortSize) * 100 : 0,
      month8: cohortSize > 0 ? (retentionByMonth[8] / cohortSize) * 100 : 0,
      month9: cohortSize > 0 ? (retentionByMonth[9] / cohortSize) * 100 : 0,
      month10: cohortSize > 0 ? (retentionByMonth[10] / cohortSize) * 100 : 0,
      month11: cohortSize > 0 ? (retentionByMonth[11] / cohortSize) * 100 : 0,
    };
  });
}

function calculatePredictiveLTV(clientData: ClientLTVData[]): {
  averagePredictedLTV: number;
  confidence: number;
  clientSegments: Array<{
    segment: string;
    count: number;
    avgHistoricalLTV: number;
    avgPredictedLTV: number;
    growthRate: number;
  }>;
} {
  if (clientData.length === 0) {
    return {
      averagePredictedLTV: 0,
      confidence: 0,
      clientSegments: [],
    };
  }

  const avgHistoricalLTV =
    clientData.reduce((sum, c) => sum + c.lifetimeValue, 0) / clientData.length;

  const segments = [
    {
      segment: "Champions",
      clients: clientData.filter(
        (c) => c.lifetimeValue > avgHistoricalLTV * 2 && c.orderCount > 3
      ),
    },
    {
      segment: "Loyal",
      clients: clientData.filter(
        (c) =>
          c.lifetimeValue > avgHistoricalLTV &&
          c.lifetimeValue <= avgHistoricalLTV * 2 &&
          c.orderCount > 1
      ),
    },
    {
      segment: "Growing",
      clients: clientData.filter(
        (c) =>
          c.lifetimeValue > avgHistoricalLTV * 0.5 &&
          c.lifetimeValue <= avgHistoricalLTV &&
          c.orderCount > 0
      ),
    },
    {
      segment: "New",
      clients: clientData.filter(
        (c) =>
          c.lifetimeValue > 0 &&
          c.lifetimeValue <= avgHistoricalLTV * 0.5 &&
          c.orderCount > 0
      ),
    },
    {
      segment: "At Risk",
      clients: clientData.filter((c) => {
        if (c.lifetimeValue === 0 || c.lastOrderDate === null) {
          return false;
        }
        const daysSinceLastOrder =
          (Date.now() - new Date(c.lastOrderDate).getTime()) /
          (1000 * 60 * 60 * 24);
        return daysSinceLastOrder > 180;
      }),
    },
  ];

  const clientSegments = segments
    .filter((s) => s.clients.length > 0)
    .map((s) => {
      const avgLTV =
        s.clients.reduce((sum, c) => sum + c.lifetimeValue, 0) /
        s.clients.length;
      const avgOrderValue =
        s.clients.reduce((sum, c) => sum + c.averageOrderValue, 0) /
        s.clients.length;
      const avgOrderCount =
        s.clients.reduce((sum, c) => sum + c.orderCount, 0) / s.clients.length;

      const predictedLTV = avgLTV * (1 + Math.max(0, avgOrderCount - 1) * 0.15);

      return {
        segment: s.segment,
        count: s.clients.length,
        avgHistoricalLTV: avgLTV,
        avgPredictedLTV: predictedLTV,
        growthRate: avgOrderValue * 0.15,
      };
    });

  let confidence: number;
  if (clientData.length >= 20) {
    confidence = 85;
  } else if (clientData.length >= 10) {
    confidence = 70;
  } else if (clientData.length >= 5) {
    confidence = 50;
  } else {
    confidence = 30;
  }

  const averagePredictedLTV =
    clientSegments.length > 0
      ? clientSegments.reduce(
          (sum, s) => sum + s.avgPredictedLTV * s.count,
          0
        ) / clientData.length
      : avgHistoricalLTV * 1.2;

  return {
    averagePredictedLTV,
    confidence,
    clientSegments,
  };
}

export async function getClientList(
  sortBy: "ltv" | "orders" | "recent" = "ltv",
  limit = 50
): Promise<ClientLTVData[]> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized");
  }

  await getTenantIdForOrg(orgId);

  const [clients, cateringOrders] = await Promise.all([
    (await listClients()).data,
    (await listCateringOrders()).data,
  ]);

  const ordersByClient = new Map<string, typeof cateringOrders>();
  for (const order of cateringOrders) {
    if (!order.customerId) continue;
    const existing = ordersByClient.get(order.customerId) ?? [];
    existing.push(order);
    ordersByClient.set(order.customerId, existing);
  }

  const result: ClientLTVData[] = clients.map((client) => {
    const clientOrders = ordersByClient.get(client.id) ?? [];
    const lifetimeValue = clientOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount ?? 0),
      0
    );
    const orderCount = clientOrders.length;
    return {
      id: client.id,
      name:
        client.companyName ||
        [client.firstName, client.lastName].filter(Boolean).join(" ") ||
        "Unnamed client",
      email: client.email,
      lifetimeValue,
      orderCount,
      lastOrderDate:
        clientOrders.length > 0
          ? clientOrders.reduce(
              (latest, order) =>
                order.orderDate > latest ? order.orderDate : latest,
              clientOrders[0].orderDate
            )
          : null,
      averageOrderValue: orderCount > 0 ? lifetimeValue / orderCount : 0,
      createdAt: client.createdAt,
    };
  });

  const sorted = [...result];
  if (sortBy === "orders") {
    sorted.sort((a, b) => b.orderCount - a.orderCount);
  } else if (sortBy === "recent") {
    sorted.sort(
      (a, b) =>
        (b.lastOrderDate?.getTime() ?? 0) - (a.lastOrderDate?.getTime() ?? 0)
    );
  } else {
    sorted.sort((a, b) => b.lifetimeValue - a.lifetimeValue);
  }
  return sorted.slice(0, limit);
}
