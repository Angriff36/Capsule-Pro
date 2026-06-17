import {
  listCateringOrders,
  listEvents,
  listEventProfitabilities,
  listInventoryItems,
  listInventoryStocks,
  listStorageLocations,
  listWasteEntries,
} from "@/app/lib/manifest-client.generated";
import { serverListEntity } from "@/app/lib/convex/server-reads";
import { auth } from "@repo/auth/server";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../lib/tenant";
import { MultiLocationDashboardClient } from "./multi-location-dashboard-client";

function getDateRange(period: "7d" | "30d" | "90d" | "12m"): {
  startDate: Date;
  endDate: Date;
  previousStartDate: Date;
  previousEndDate: Date;
} {
  const now = new Date();
  const endDate = now;
  let startDate: Date;
  let previousStartDate: Date;
  let previousEndDate: Date;

  switch (period) {
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      previousEndDate = startDate;
      previousStartDate = new Date(
        startDate.getTime() - 7 * 24 * 60 * 60 * 1000
      );
      break;
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      previousEndDate = startDate;
      previousStartDate = new Date(
        startDate.getTime() - 90 * 24 * 60 * 60 * 1000
      );
      break;
    case "12m":
      startDate = new Date(
        now.getFullYear() - 1,
        now.getMonth(),
        now.getDate()
      );
      previousEndDate = startDate;
      previousStartDate = new Date(
        startDate.getFullYear() - 1,
        startDate.getMonth(),
        startDate.getDate()
      );
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      previousEndDate = startDate;
      previousStartDate = new Date(
        startDate.getTime() - 30 * 24 * 60 * 60 * 1000
      );
      break;
  }

  return { startDate, endDate, previousStartDate, previousEndDate };
}

interface PageProps {
  searchParams: Promise<{
    locationIds?: string;
    period?: "7d" | "30d" | "90d" | "12m";
    startDate?: string;
    endDate?: string;
  }>;
}

function toDateRange(period: "7d" | "30d" | "90d" | "12m") {
  return getDateRange(period);
}

const inRange = (value: Date, start: Date, end: Date) =>
  value >= start && value <= end;

const MultiLocationDashboardPage = async ({ searchParams }: PageProps) => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  try {
    await getTenantIdForOrg(orgId);
  } catch {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <h1 className="font-bold text-2xl">Analytics Unavailable</h1>
        <p className="text-muted-foreground">
          Unable to load analytics data. Please try again later.
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const period = params.period || "30d";
  const { startDate, endDate, previousStartDate, previousEndDate } =
    toDateRange(period);

  const effectiveStartDate = params.startDate
    ? new Date(params.startDate)
    : startDate;
  const effectiveEndDate = params.endDate ? new Date(params.endDate) : endDate;

  const requestedLocationIds = params.locationIds?.split(",").filter(Boolean) ?? [];

  const [
    locationDocs,
    employeeLocationDocs,
    cateringOrders,
    eventProfitabilities,
    events,
    wasteEntries,
    inventoryStocks,
    inventoryItems,
    storageLocations,
  ] = await Promise.all([
    serverListEntity("Location"),
    serverListEntity("EmployeeLocation"),
    (await listCateringOrders()).data,
    (await listEventProfitabilities()).data,
    (await listEvents()).data,
    (await listWasteEntries()).data,
    (await listInventoryStocks()).data,
    (await listInventoryItems()).data,
    (await listStorageLocations()).data,
  ]);

  const locations = locationDocs
    .filter((location) => location.deletedAt == null && Boolean(location.isActive))
    .filter((location) =>
      requestedLocationIds.length === 0
        ? true
        : requestedLocationIds.includes(String(location._id))
    )
    .map((location) => ({
      id: String(location._id),
      name: String(location.name ?? "Unknown"),
      isPrimary: Boolean(location.isPrimary),
      timezone: String(location.timezone ?? "UTC"),
    }))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.name.localeCompare(b.name));

  if (locations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <h1 className="font-bold text-2xl">No Locations Found</h1>
        <p className="text-muted-foreground">
          Add locations to your organization to view the multi-location
          dashboard.
        </p>
      </div>
    );
  }

  const eventsById = new Map(events.map((event) => [event.id, event]));
  const inventoryItemById = new Map(
    inventoryItems.map((item) => [item.id, item])
  );
  const storageLocationById = new Map(
    storageLocations.map((storage) => [storage.id, storage])
  );

  const currentRevenueRows = locations.map((location) => ({
    locationId: location.id,
    locationName: location.name,
    revenue: cateringOrders
      .filter((order) => inRange(order.orderDate, effectiveStartDate, effectiveEndDate))
      .filter((order) => eventsById.get(order.eventId)?.locationId === location.id)
      .reduce((sum, order) => sum + Number(order.totalAmount ?? 0), 0),
  }));
  const laborUtilizationRows = locations.map((location) => {
    const rows = eventProfitabilities
      .filter((profitability) =>
        inRange(profitability.calculatedAt, effectiveStartDate, effectiveEndDate)
      )
      .filter(
        (profitability) =>
          eventsById.get(profitability.eventId)?.locationId === location.id
      );
    return {
      locationId: location.id,
      budgetedLabor: rows.reduce(
        (sum, row) => sum + Number(row.budgetedLaborCost ?? 0),
        0
      ),
      actualLabor: rows.reduce(
        (sum, row) => sum + Number(row.actualLaborCost ?? 0),
        0
      ),
    };
  });
  const wasteCostRows = locations.map((location) => ({
    locationId: location.id,
    wasteCost: wasteEntries
      .filter((entry) => inRange(entry.loggedAt, effectiveStartDate, effectiveEndDate))
      .filter((entry) => entry.locationId === location.id)
      .reduce((sum, entry) => sum + Number(entry.totalCost ?? 0), 0),
  }));
  const marginRows = locations.map((location) => {
    const rows = eventProfitabilities.filter(
      (profitability) =>
        inRange(profitability.calculatedAt, effectiveStartDate, effectiveEndDate) &&
        eventsById.get(profitability.eventId)?.locationId === location.id
    );
    const totalRevenue = rows.reduce(
      (sum, row) => sum + Number(row.actualRevenue ?? 0),
      0
    );
    const totalMarginPct = rows.reduce(
      (sum, row) => sum + Number(row.actualGrossMarginPct ?? 0),
      0
    );
    return {
      locationId: location.id,
      avgMargin: rows.length > 0 ? totalMarginPct / rows.length : 0,
      totalRevenue,
    };
  });
  const eventCompletionRows = locations.map((location) => {
    const rows = events.filter(
      (event) =>
        event.locationId === location.id &&
        inRange(event.eventDate, effectiveStartDate, effectiveEndDate)
    );
    return {
      locationId: location.id,
      eventCount: rows.length,
      completedCount: rows.filter((event) => event.status === "completed").length,
    };
  });
  const inventoryValueRows = locations.map((location) => {
    const stocksForLocation = inventoryStocks.filter((stock) => {
      const storageLocation = storageLocationById.get(stock.storageLocationId);
      return storageLocation?.locationId === location.id;
    });
    const uniqueItemIds = new Set(stocksForLocation.map((stock) => stock.itemId));
    const inventoryValue = stocksForLocation.reduce((sum, stock) => {
      const item = inventoryItemById.get(stock.itemId);
      return (
        sum +
        Number(stock.quantityOnHand ?? 0) * Number(item?.unitCost ?? 0)
      );
    }, 0);
    return {
      locationId: location.id,
      inventoryValue,
      itemCount: uniqueItemIds.size,
    };
  });
  const staffingRows = locations.map((location) => ({
    locationId: location.id,
    staffCount: employeeLocationDocs.filter(
      (row) => String(row.locationId) === location.id && row.deletedAt == null
    ).length,
  }));

  const locationMetrics = new Map<
    string,
    {
      revenue: number;
      budgetedLabor: number;
      actualLabor: number;
      wasteCost: number;
      avgMargin: number;
      totalRevenueForMargin: number;
      eventCount: number;
      completedCount: number;
      inventoryValue: number;
      itemCount: number;
      staffCount: number;
    }
  >();

  locations.forEach((location) => {
    locationMetrics.set(location.id, {
      revenue: 0,
      budgetedLabor: 0,
      actualLabor: 0,
      wasteCost: 0,
      avgMargin: 0,
      totalRevenueForMargin: 0,
      eventCount: 0,
      completedCount: 0,
      inventoryValue: 0,
      itemCount: 0,
      staffCount: 0,
    });
  });

  currentRevenueRows.forEach((item) => {
    const metrics = locationMetrics.get(item.locationId);
    if (metrics) {
      metrics.revenue = item.revenue;
    }
  });

  laborUtilizationRows.forEach((item) => {
    const metrics = locationMetrics.get(item.locationId);
    if (metrics) {
      metrics.budgetedLabor = item.budgetedLabor;
      metrics.actualLabor = item.actualLabor;
    }
  });

  wasteCostRows.forEach((item) => {
    const metrics = locationMetrics.get(item.locationId);
    if (metrics) {
      metrics.wasteCost = item.wasteCost;
    }
  });

  marginRows.forEach((item) => {
    const metrics = locationMetrics.get(item.locationId);
    if (metrics) {
      metrics.avgMargin = item.avgMargin;
      metrics.totalRevenueForMargin = item.totalRevenue;
    }
  });

  eventCompletionRows.forEach((item) => {
    const metrics = locationMetrics.get(item.locationId);
    if (metrics) {
      metrics.eventCount = item.eventCount;
      metrics.completedCount = item.completedCount;
    }
  });

  inventoryValueRows.forEach((item) => {
    const metrics = locationMetrics.get(item.locationId);
    if (metrics) {
      metrics.inventoryValue = item.inventoryValue;
      metrics.itemCount = item.itemCount;
    }
  });

  staffingRows.forEach((item) => {
    const metrics = locationMetrics.get(item.locationId);
    if (metrics) {
      metrics.staffCount = item.staffCount;
    }
  });

  const totalRevenue = Array.from(locationMetrics.values()).reduce(
    (sum, m) => sum + m.revenue,
    0
  );
  const totalBudgetedLabor = Array.from(locationMetrics.values()).reduce(
    (sum, m) => sum + m.budgetedLabor,
    0
  );
  const totalActualLabor = Array.from(locationMetrics.values()).reduce(
    (sum, m) => sum + m.actualLabor,
    0
  );
  const totalWaste = Array.from(locationMetrics.values()).reduce(
    (sum, m) => sum + m.wasteCost,
    0
  );
  const totalEvents = Array.from(locationMetrics.values()).reduce(
    (sum, m) => sum + m.eventCount,
    0
  );
  const completedEvents = Array.from(locationMetrics.values()).reduce(
    (sum, m) => sum + m.completedCount,
    0
  );
  const totalInventoryValue = Array.from(locationMetrics.values()).reduce(
    (sum, m) => sum + m.inventoryValue,
    0
  );
  const totalStaffCount = Array.from(locationMetrics.values()).reduce(
    (sum, m) => sum + m.staffCount,
    0
  );

  let totalRevenueForMargin = 0;
  let weightedMarginSum = 0;
  Array.from(locationMetrics.entries()).forEach(([, metrics]) => {
    if (metrics.totalRevenueForMargin > 0) {
      totalRevenueForMargin += metrics.totalRevenueForMargin;
      weightedMarginSum += metrics.avgMargin * metrics.totalRevenueForMargin;
    }
  });
  const avgMarginPct =
    totalRevenueForMargin > 0 ? weightedMarginSum / totalRevenueForMargin : 0;

  const kpis = [
    {
      id: "total-revenue",
      title: "Total Revenue",
      value: totalRevenue,
      formatted: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(totalRevenue),
      change: 0,
      changeFormatted: "current period",
      trend: "neutral" as const,
      category: "financial",
      locationBreakdown: Array.from(locationMetrics.entries()).map(
        ([locationId, metrics]) => {
          const location = locations.find((l) => l.id === locationId);
          return {
            locationId,
            locationName: location?.name || "Unknown",
            value: metrics.revenue,
            formatted: new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            }).format(metrics.revenue),
          };
        }
      ),
    },
    {
      id: "labor-utilization",
      title: "Labor Utilization",
      value:
        totalBudgetedLabor > 0
          ? (totalActualLabor / totalBudgetedLabor) * 100
          : 0,
      formatted: `${totalBudgetedLabor > 0 ? ((totalActualLabor / totalBudgetedLabor) * 100).toFixed(1) : 0}%`,
      change: 0,
      changeFormatted: "vs budget",
      trend:
        (totalBudgetedLabor > 0
          ? (totalActualLabor / totalBudgetedLabor) * 100
          : 0) <= 100
          ? ("up" as const)
          : ("down" as const),
      category: "operational",
      locationBreakdown: Array.from(locationMetrics.entries()).map(
        ([locationId, metrics]) => {
          const location = locations.find((l) => l.id === locationId);
          const utilization =
            metrics.budgetedLabor > 0
              ? (metrics.actualLabor / metrics.budgetedLabor) * 100
              : 0;
          return {
            locationId,
            locationName: location?.name || "Unknown",
            value: utilization,
            formatted: `${utilization.toFixed(1)}%`,
            budgeted: metrics.budgetedLabor,
            actual: metrics.actualLabor,
          };
        }
      ),
    },
    {
      id: "waste-cost",
      title: "Waste Cost",
      value: totalWaste,
      formatted: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(totalWaste),
      change: 0,
      changeFormatted: "current period",
      trend: "neutral" as const,
      category: "operational",
      locationBreakdown: Array.from(locationMetrics.entries()).map(
        ([locationId, metrics]) => {
          const location = locations.find((l) => l.id === locationId);
          return {
            locationId,
            locationName: location?.name || "Unknown",
            value: metrics.wasteCost,
            formatted: new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            }).format(metrics.wasteCost),
          };
        }
      ),
    },
    {
      id: "profit-margin",
      title: "Profit Margin",
      value: avgMarginPct,
      formatted: `${avgMarginPct.toFixed(1)}%`,
      change: 0,
      changeFormatted: "average",
      trend:
        avgMarginPct >= 20
          ? ("up" as const)
          : avgMarginPct >= 10
            ? ("neutral" as const)
            : ("down" as const),
      category: "financial",
      locationBreakdown: Array.from(locationMetrics.entries()).map(
        ([locationId, metrics]) => {
          const location = locations.find((l) => l.id === locationId);
          return {
            locationId,
            locationName: location?.name || "Unknown",
            value: metrics.avgMargin,
            formatted: `${metrics.avgMargin.toFixed(1)}%`,
          };
        }
      ),
    },
    {
      id: "event-completion",
      title: "Event Completion Rate",
      value: totalEvents > 0 ? completedEvents / totalEvents : 0,
      formatted: new Intl.NumberFormat("en-US", {
        style: "percent",
        maximumFractionDigits: 0,
      }).format(totalEvents > 0 ? completedEvents / totalEvents : 0),
      change: 0,
      changeFormatted: "completion rate",
      trend:
        (totalEvents > 0 ? completedEvents / totalEvents : 0) >= 0.9
          ? ("up" as const)
          : (totalEvents > 0 ? completedEvents / totalEvents : 0) >= 0.75
            ? ("neutral" as const)
            : ("down" as const),
      category: "operational",
      locationBreakdown: Array.from(locationMetrics.entries()).map(
        ([locationId, metrics]) => {
          const location = locations.find((l) => l.id === locationId);
          const rate =
            metrics.eventCount > 0
              ? metrics.completedCount / metrics.eventCount
              : 0;
          return {
            locationId,
            locationName: location?.name || "Unknown",
            value: rate,
            formatted: new Intl.NumberFormat("en-US", {
              style: "percent",
              maximumFractionDigits: 0,
            }).format(rate),
            total: metrics.eventCount,
            completed: metrics.completedCount,
          };
        }
      ),
    },
    {
      id: "inventory-value",
      title: "Inventory Value",
      value: totalInventoryValue,
      formatted: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(totalInventoryValue),
      change: 0,
      changeFormatted: "current value",
      trend: "neutral" as const,
      category: "inventory",
      locationBreakdown: Array.from(locationMetrics.entries()).map(
        ([locationId, metrics]) => {
          const location = locations.find((l) => l.id === locationId);
          return {
            locationId,
            locationName: location?.name || "Unknown",
            value: metrics.inventoryValue,
            formatted: new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            }).format(metrics.inventoryValue),
            itemCount: metrics.itemCount,
          };
        }
      ),
    },
  ];

  const benchmarks = [
    {
      id: "revenue-per-staff",
      title: "Revenue per Staff Member",
      currentValue: totalStaffCount > 0 ? totalRevenue / totalStaffCount : 0,
      target: 75_000,
      formatted: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(totalStaffCount > 0 ? totalRevenue / totalStaffCount : 0),
      targetFormatted: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(75_000),
      status:
        totalStaffCount > 0 && totalRevenue / totalStaffCount >= 75_000
          ? ("above" as const)
          : ("below" as const),
      category: "productivity",
    },
    {
      id: "waste-percentage",
      title: "Waste as % of Revenue",
      currentValue: totalRevenue > 0 ? (totalWaste / totalRevenue) * 100 : 0,
      target: 3,
      formatted: `${(totalRevenue > 0 ? (totalWaste / totalRevenue) * 100 : 0).toFixed(1)}%`,
      targetFormatted: "< 3%",
      status:
        totalRevenue > 0 && (totalWaste / totalRevenue) * 100 <= 3
          ? ("above" as const)
          : ("below" as const),
      category: "operational",
    },
    {
      id: "labor-percentage",
      title: "Labor as % of Revenue",
      currentValue:
        totalRevenue > 0 ? (totalActualLabor / totalRevenue) * 100 : 0,
      target: 30,
      formatted: `${(totalRevenue > 0 ? (totalActualLabor / totalRevenue) * 100 : 0).toFixed(1)}%`,
      targetFormatted: "< 30%",
      status:
        totalRevenue > 0 && (totalActualLabor / totalRevenue) * 100 <= 30
          ? ("above" as const)
          : ("below" as const),
      category: "financial",
    },
    {
      id: "margin-target",
      title: "Gross Margin vs Target",
      currentValue: avgMarginPct,
      target: 25,
      formatted: `${avgMarginPct.toFixed(1)}%`,
      targetFormatted: "≥ 25%",
      status:
        avgMarginPct >= 25
          ? ("above" as const)
          : avgMarginPct >= 15
            ? ("near" as const)
            : ("below" as const),
      category: "financial",
    },
  ];

  const locationComparison = locations.map((location) => {
    const metrics = locationMetrics.get(location.id) || {
      revenue: 0,
      budgetedLabor: 0,
      actualLabor: 0,
      wasteCost: 0,
      avgMargin: 0,
      eventCount: 0,
      completedCount: 0,
      inventoryValue: 0,
      itemCount: 0,
      staffCount: 0,
    };

    const laborUtilization =
      metrics.budgetedLabor > 0
        ? (metrics.actualLabor / metrics.budgetedLabor) * 100
        : 0;
    const completionRate =
      metrics.eventCount > 0 ? metrics.completedCount / metrics.eventCount : 0;
    const wastePercent =
      metrics.revenue > 0 ? (metrics.wasteCost / metrics.revenue) * 100 : 0;

    return {
      locationId: location.id,
      locationName: location.name,
      isPrimary: location.isPrimary,
      metrics: {
        revenue: metrics.revenue,
        revenueFormatted: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(metrics.revenue),
        laborUtilization,
        laborUtilizationFormatted: `${laborUtilization.toFixed(1)}%`,
        wasteCost: metrics.wasteCost,
        wasteCostFormatted: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(metrics.wasteCost),
        wastePercent,
        wastePercentFormatted: `${wastePercent.toFixed(1)}%`,
        margin: metrics.avgMargin,
        marginFormatted: `${metrics.avgMargin.toFixed(1)}%`,
        eventCount: metrics.eventCount,
        completionRate,
        completionRateFormatted: new Intl.NumberFormat("en-US", {
          style: "percent",
          maximumFractionDigits: 0,
        }).format(completionRate),
        inventoryValue: metrics.inventoryValue,
        inventoryValueFormatted: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(metrics.inventoryValue),
        staffCount: metrics.staffCount,
        revenuePerStaff:
          metrics.staffCount > 0 ? metrics.revenue / metrics.staffCount : 0,
      },
    };
  });

  const rankings = {
    topRevenue: [...locationComparison]
      .sort((a, b) => b.metrics.revenue - a.metrics.revenue)
      .slice(0, 3),
    topMargin: [...locationComparison]
      .sort((a, b) => b.metrics.margin - a.metrics.margin)
      .slice(0, 3),
    topCompletion: [...locationComparison]
      .sort((a, b) => b.metrics.completionRate - a.metrics.completionRate)
      .slice(0, 3),
    lowestWaste: [...locationComparison]
      .sort((a, b) => a.metrics.wastePercent - b.metrics.wastePercent)
      .slice(0, 3),
  };

  const data = {
    locations,
    summary: {
      totalLocations: locations.length,
      totalRevenue,
      totalRevenueFormatted: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(totalRevenue),
      totalStaff: totalStaffCount,
      reportPeriod: {
        start: effectiveStartDate.toISOString(),
        end: effectiveEndDate.toISOString(),
        previousStart: previousStartDate.toISOString(),
        previousEnd: previousEndDate.toISOString(),
      },
    },
    kpis,
    benchmarks,
    locationComparison,
    rankings,
  };

  return <MultiLocationDashboardClient initialData={data as never} />;
};

export default MultiLocationDashboardPage;
