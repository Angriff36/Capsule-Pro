"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientLTVMetrics = getClientLTVMetrics;
exports.getClientList = getClientList;
require("server-only");
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const tenant_1 = require("../../../../lib/tenant");
async function getClientLTVMetrics() {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const clientLTVResult = await database_1.database.$queryRawUnsafe(
    `
    SELECT 
      c.id,
      COALESCE(c.company_name, CONCAT(c.first_name, ' ', c.last_name)) as name,
      c.email,
      COALESCE(SUM(co.total_amount), 0)::decimal as lifetimeValue,
      COUNT(co.id) as orderCount,
      MAX(co.order_date) as lastOrderDate,
      COALESCE(AVG(co.total_amount), 0)::decimal as averageOrderValue,
      c.created_at as createdAt
    FROM tenant_crm.clients c
    LEFT JOIN tenant_events.catering_orders co 
      ON c.tenant_id = co.tenant_id AND c.id = co.customer_id AND co.deleted_at IS NULL
    WHERE c.tenant_id = $1 AND c.deleted_at IS NULL
    GROUP BY c.id, c.company_name, c.first_name, c.last_name, c.email, c.created_at
    ORDER BY lifetimeValue DESC
    `,
    tenantId
  );
  const revenueByMonthRaw = await database_1.database.$queryRawUnsafe(
    `
    SELECT 
      TO_CHAR(DATE_TRUNC('month', co.order_date), 'YYYY-MM') as month,
      COALESCE(SUM(co.total_amount), 0)::decimal as total_revenue,
      COUNT(co.id) as order_count,
      COUNT(DISTINCT co.customer_id) as client_count
    FROM tenant_events.catering_orders co
    WHERE co.tenant_id = $1 
      AND co.deleted_at IS NULL
      AND co.order_date >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', co.order_date)
    ORDER BY month ASC
    `,
    tenantId
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
function calculateRevenueByMonth(revenueData) {
  const now = new Date();
  const months = [];
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
function calculateCohortAnalysis(clientData) {
  const cohorts = new Map();
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
    const retentionByMonth = new Array(12).fill(0);
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
function calculatePredictiveLTV(clientData) {
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
        if (c.lifetimeValue === 0 || c.lastOrderDate === null) return false;
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
  let confidence;
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
async function getClientList(sortBy = "ltv", limit = 50) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    throw new Error("Unauthorized");
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  let orderClause = "lifetimeValue DESC";
  if (sortBy === "orders") {
    orderClause = "orderCount DESC";
  } else if (sortBy === "recent") {
    orderClause = "lastOrderDate DESC NULLS LAST";
  }
  const result = await database_1.database.$queryRawUnsafe(
    `
    SELECT 
      c.id,
      COALESCE(c.company_name, CONCAT(c.first_name, ' ', c.last_name)) as name,
      c.email,
      COALESCE(SUM(co.total_amount), 0)::decimal as lifetimeValue,
      COUNT(co.id) as orderCount,
      MAX(co.order_date) as lastOrderDate,
      COALESCE(AVG(co.total_amount), 0)::decimal as averageOrderValue,
      c.created_at as createdAt
    FROM tenant_crm.clients c
    LEFT JOIN tenant_events.catering_orders co 
      ON c.tenant_id = co.tenant_id AND c.id = co.customer_id AND co.deleted_at IS NULL
    WHERE c.tenant_id = $1 AND c.deleted_at IS NULL
    GROUP BY c.id, c.company_name, c.first_name, c.last_name, c.email, c.created_at
    ORDER BY ${orderClause}
    LIMIT $2
    `,
    tenantId,
    limit
  );
  return result.map((client) => ({
    ...client,
    lifetimeValue: Number(client.lifetimeValue),
    averageOrderValue: Number(client.averageOrderValue),
  }));
}
