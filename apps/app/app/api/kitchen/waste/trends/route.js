Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * GET /api/kitchen/waste/trends
 * View waste trends over time with analytics
 */
async function GET(request) {
  const { orgId } = await (0, server_1.auth)();
  if (!orgId) {
    return server_2.NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }
  const tenantId = await (0, tenant_1.getTenantIdForOrg)(orgId);
  const { searchParams } = request.nextUrl;
  // Trend parameters
  const period = searchParams.get("period") || "30d"; // 7d, 30d, 90d, 12m
  const groupBy = searchParams.get("groupBy") || "day"; // day, week, month
  const locationId = searchParams.get("locationId");
  const inventoryItemId = searchParams.get("inventoryItemId");
  // Calculate date range based on period
  const now = new Date();
  const startDate = new Date();
  switch (period) {
    case "7d":
      startDate.setDate(now.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(now.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(now.getDate() - 90);
      break;
    case "12m":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }
  // Get waste entries for the period
  const entries = await database_1.database.wasteEntry.findMany({
    where: {
      AND: [
        { tenantId },
        { deletedAt: null },
        { loggedAt: { gte: startDate } },
        ...(locationId ? [{ locationId }] : []),
        ...(inventoryItemId ? [{ inventoryItemId }] : []),
      ],
    },
    include: {
      inventoryItem: {
        select: {
          id: true,
          name: true,
          item_number: true,
        },
      },
    },
    orderBy: { loggedAt: "asc" },
  });
  // Group data by time period
  const trendData = {};
  for (const entry of entries) {
    const date = new Date(entry.loggedAt);
    let key = "";
    switch (groupBy) {
      case "day":
        key = date.toISOString().split("T")[0];
        break;
      case "week": {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
        break;
      }
      case "month":
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        break;
      default:
        key = date.toISOString().split("T")[0];
    }
    if (!trendData[key]) {
      trendData[key] = {
        period: key,
        totalCost: 0,
        totalQuantity: 0,
        count: 0,
        entries: [],
      };
    }
    trendData[key].totalCost += Number(entry.totalCost || 0);
    trendData[key].totalQuantity += Number(entry.quantity);
    trendData[key].count += 1;
    trendData[key].entries.push(entry);
  }
  // Convert to array and calculate averages
  const trends = Object.values(trendData).map((trend) => ({
    ...trend,
    avgCostPerEntry: trend.count > 0 ? trend.totalCost / trend.count : 0,
    avgQuantityPerEntry:
      trend.count > 0 ? trend.totalQuantity / trend.count : 0,
  }));
  // Calculate period-over-period comparison
  const totalPeriodCost = trends.reduce((sum, t) => sum + t.totalCost, 0);
  const totalPeriodQuantity = trends.reduce(
    (sum, t) => sum + t.totalQuantity,
    0
  );
  const totalPeriodEntries = trends.reduce((sum, t) => sum + t.count, 0);
  // Get top waste reasons for the period
  const reasonCounts = {};
  for (const entry of entries) {
    if (!reasonCounts[entry.reasonId]) {
      reasonCounts[entry.reasonId] = { count: 0, cost: 0 };
    }
    reasonCounts[entry.reasonId].count += 1;
    reasonCounts[entry.reasonId].cost += Number(entry.totalCost || 0);
  }
  const topReasons = await Promise.all(
    Object.entries(reasonCounts)
      .sort((a, b) => b[1].cost - a[1].cost)
      .slice(0, 5)
      .map(async ([reasonId, data]) => {
        const reason = await database_1.database.wasteReason.findUnique({
          where: { id: Number.parseInt(reasonId, 10) },
        });
        return {
          reason,
          count: data.count,
          cost: data.cost,
        };
      })
  );
  // Get top wasted items for the period
  const itemCounts = {};
  for (const entry of entries) {
    const itemName = entry.inventoryItem.name;
    if (!itemCounts[itemName]) {
      itemCounts[itemName] = {
        name: itemName,
        count: 0,
        cost: 0,
      };
    }
    itemCounts[itemName].count += 1;
    itemCounts[itemName].cost += Number(entry.totalCost || 0);
  }
  const topItems = Object.values(itemCounts)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10);
  // Calculate reduction opportunities
  const reductionOpportunities = [];
  if (topItems.length > 0) {
    const topItemCost = topItems[0].cost;
    const potentialSavings = topItemCost * 0.5; // Assume 50% could be prevented
    reductionOpportunities.push({
      type: "top_item_prevention",
      description: `Prevent waste of ${topItems[0].name}`,
      potentialSavings,
      priority: "high",
    });
  }
  // Check if any single reason accounts for >30% of waste
  const maxReasonCost = Math.max(
    ...Object.values(reasonCounts).map((r) => r.cost)
  );
  if (maxReasonCost > totalPeriodCost * 0.3) {
    const topReasonId = Object.keys(reasonCounts).reduce((a, b) => {
      const aNum = Number(a);
      const bNum = Number(b);
      return reasonCounts[aNum].cost > reasonCounts[bNum].cost ? a : b;
    });
    const topReason = await database_1.database.wasteReason.findUnique({
      where: {
        id: Number.parseInt(topReasonId, 10),
      },
    });
    reductionOpportunities.push({
      type: "reason_focus",
      description: `Focus on reducing ${topReason?.name || "top waste reason"}`,
      potentialSavings: maxReasonCost * 0.3,
      priority: "medium",
    });
  }
  return server_2.NextResponse.json({
    trends: {
      summary: {
        totalCost: totalPeriodCost,
        totalQuantity: totalPeriodQuantity,
        totalEntries: totalPeriodEntries,
        avgCostPerEntry:
          totalPeriodEntries > 0 ? totalPeriodCost / totalPeriodEntries : 0,
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      },
      data: trends,
      topReasons,
      topItems,
      reductionOpportunities,
    },
  });
}
