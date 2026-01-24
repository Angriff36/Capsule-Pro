Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("@repo/auth/server");
const database_1 = require("@repo/database");
const server_2 = require("next/server");
const tenant_1 = require("@/app/lib/tenant");
/**
 * GET /api/kitchen/waste/reports
 * Generate waste reports with filtering options
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
  const { searchParams } = new URL(request.url);
  // Report filters
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const locationId = searchParams.get("locationId");
  const reasonId = searchParams.get("reasonId");
  const groupBy = searchParams.get("groupBy") || "reason"; // reason | item | location | date
  // Build date filter
  const dateFilter = {};
  if (startDate) {
    dateFilter.gte = new Date(startDate);
  }
  if (endDate) {
    dateFilter.lte = new Date(endDate);
  }
  // Get all waste entries matching filters
  const entries = await database_1.database.wasteEntry.findMany({
    where: {
      AND: [
        { tenantId },
        { deletedAt: null },
        ...(startDate || endDate ? [{ loggedAt: dateFilter }] : []),
        ...(locationId ? [{ locationId }] : []),
        ...(reasonId ? [{ reasonId: Number.parseInt(reasonId, 10) }] : []),
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
    orderBy: { loggedAt: "desc" },
  });
  // Calculate totals
  const totalCost = entries.reduce(
    (sum, entry) => sum + Number(entry.totalCost || 0),
    0
  );
  const totalQuantity = entries.reduce(
    (sum, entry) => sum + Number(entry.quantity),
    0
  );
  const entryCount = entries.length;
  // Group data based on groupBy parameter
  const groupedData = {};
  for (const entry of entries) {
    let key = "";
    switch (groupBy) {
      case "reason":
        key = String(entry.reasonId);
        break;
      case "item":
        key = entry.inventoryItem.name;
        break;
      case "location":
        key = entry.locationId || "unspecified";
        break;
      case "date":
        key = new Date(entry.loggedAt).toISOString().split("T")[0];
        break;
      default:
        key = "all";
    }
    if (!groupedData[key]) {
      groupedData[key] = {
        key,
        totalCost: 0,
        totalQuantity: 0,
        count: 0,
        entries: [],
      };
    }
    groupedData[key].totalCost += Number(entry.totalCost || 0);
    groupedData[key].totalQuantity += Number(entry.quantity);
    groupedData[key].count += 1;
    groupedData[key].entries.push(entry);
  }
  // Convert to array and sort by cost descending
  const reportData = Object.values(groupedData).sort(
    (a, b) => b.totalCost - a.totalCost
  );
  // Fetch waste reasons for labeling
  const wasteReasons = await database_1.database.wasteReason.findMany({
    where: { isActive: true },
  });
  const reasonMap = new Map(wasteReasons.map((r) => [String(r.id), r]));
  // Add labels to grouped data
  const labeledData = reportData.map((group) => {
    const label =
      groupBy === "reason" && reasonMap.has(group.key)
        ? reasonMap.get(group.key).name
        : group.key;
    return {
      ...group,
      label,
      avgCostPerEntry: group.totalCost / group.count,
      avgQuantityPerEntry: group.totalQuantity / group.count,
    };
  });
  // Calculate trends by month
  const monthlyTrends = {};
  for (const entry of entries) {
    const date = new Date(entry.loggedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyTrends[monthKey]) {
      monthlyTrends[monthKey] = {
        month: monthKey,
        totalCost: 0,
        totalQuantity: 0,
        count: 0,
      };
    }
    monthlyTrends[monthKey].totalCost += Number(entry.totalCost || 0);
    monthlyTrends[monthKey].totalQuantity += Number(entry.quantity);
    monthlyTrends[monthKey].count += 1;
  }
  const trends = Object.values(monthlyTrends).sort((a, b) =>
    a.month.localeCompare(b.month)
  );
  return server_2.NextResponse.json({
    report: {
      summary: {
        totalCost,
        totalQuantity,
        entryCount,
        avgCostPerEntry: entryCount > 0 ? totalCost / entryCount : 0,
      },
      groupedBy: groupBy,
      data: labeledData,
      trends,
      wasteReasons,
    },
  });
}
