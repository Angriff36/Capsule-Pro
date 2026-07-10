import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { notFound } from "next/navigation";
import { getTenantIdForOrg } from "../../../../lib/tenant";
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

const MultiLocationDashboardPage = async ({ searchParams }: PageProps) => {
  const { orgId } = await auth();

  if (!orgId) {
    notFound();
  }

  let tenantId: string;
  try {
    tenantId = await getTenantIdForOrg(orgId);
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
    getDateRange(period);

  const effectiveStartDate = params.startDate
    ? new Date(params.startDate)
    : startDate;
  const effectiveEndDate = params.endDate ? new Date(params.endDate) : endDate;

  const locations = await database.location.findMany({
    where: {
      tenantId,
      deletedAt: null,
      isActive: true,
      ...(params.locationIds && {
        id: { in: params.locationIds.split(",") },
      }),
    },
    select: {
      id: true,
      name: true,
      isPrimary: true,
      timezone: true,
    },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
  });

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

  const [
    currentRevenueRows,
    laborUtilizationRows,
    wasteCostRows,
    marginRows,
    eventCompletionRows,
    inventoryValueRows,
    staffingRows,
  ] = await Promise.all([
    Promise.all(
      locations.map(async (location) => {
        const result = await database.$queryRaw<
          Array<{ total_revenue: string | null }>
        >(
          Prisma.sql`
          SELECT COALESCE(SUM(co.total_amount), 0)::numeric AS total_revenue
          FROM tenant_events.catering_orders co
          INNER JOIN tenant_events.events ev
            ON ev.tenant_id = co.tenant_id
            AND ev.id = co.event_id
          WHERE co.tenant_id = ${tenantId}::uuid
            AND co.deleted_at IS NULL
            AND ev.deleted_at IS NULL
            AND ev.location_id = ${location.id}::uuid
            AND co.order_date >= ${effectiveStartDate}
            AND co.order_date < ${effectiveEndDate}
        `
        );
        return {
          locationId: location.id,
          locationName: location.name,
          revenue: Number(result[0]?.total_revenue ?? 0),
        };
      })
    ),
    Promise.all(
      locations.map(async (location) => {
        const result = await database.$queryRaw<
          Array<{ budgeted_labor: string | null; actual_labor: string | null }>
        >(
          Prisma.sql`
          SELECT
            COALESCE(SUM(ep.budgeted_labor_cost), 0)::numeric AS budgeted_labor,
            COALESCE(SUM(ep.actual_labor_cost), 0)::numeric AS actual_labor
          FROM tenant_events.event_profitability ep
          INNER JOIN tenant_events.events ev
            ON ev.tenant_id = ep.tenant_id
            AND ev.id = ep.event_id
          WHERE ep.tenant_id = ${tenantId}::uuid
            AND ep.deleted_at IS NULL
            AND ev.deleted_at IS NULL
            AND ev.location_id = ${location.id}::uuid
            AND ep.calculated_at >= ${effectiveStartDate}
            AND ep.calculated_at < ${effectiveEndDate}
        `
        );
        return {
          locationId: location.id,
          budgetedLabor: Number(result[0]?.budgeted_labor ?? 0),
          actualLabor: Number(result[0]?.actual_labor ?? 0),
        };
      })
    ),
    Promise.all(
      locations.map(async (location) => {
        const result = await database.$queryRaw<
          Array<{ waste_cost: string | null }>
        >(
          Prisma.sql`
          SELECT COALESCE(SUM("totalCost"), 0)::numeric AS waste_cost
          FROM tenant_kitchen.waste_entries
          WHERE tenant_id = ${tenantId}::uuid
            AND deleted_at IS NULL
            AND location_id = ${location.id}::uuid
            AND logged_at >= ${effectiveStartDate}
            AND logged_at < ${effectiveEndDate}
        `
        );
        return {
          locationId: location.id,
          wasteCost: Number(result[0]?.waste_cost ?? 0),
        };
      })
    ),
    Promise.all(
      locations.map(async (location) => {
        const result = await database.$queryRaw<
          Array<{ avg_margin: string | null; total_revenue: string | null }>
        >(
          Prisma.sql`
          SELECT
            COALESCE(AVG(CASE WHEN ep.actual_revenue <> 0 THEN ep.actual_gross_margin / ep.actual_revenue * 100 ELSE 0 END), 0)::numeric AS avg_margin,
            COALESCE(SUM(ep.actual_revenue), 0)::numeric AS total_revenue
          FROM tenant_events.event_profitability ep
          INNER JOIN tenant_events.events ev
            ON ev.tenant_id = ep.tenant_id
            AND ev.id = ep.event_id
          WHERE ep.tenant_id = ${tenantId}::uuid
            AND ep.deleted_at IS NULL
            AND ev.deleted_at IS NULL
            AND ev.location_id = ${location.id}::uuid
            AND ep.calculated_at >= ${effectiveStartDate}
            AND ep.calculated_at < ${effectiveEndDate}
        `
        );
        return {
          locationId: location.id,
          avgMargin: Number(result[0]?.avg_margin ?? 0),
          totalRevenue: Number(result[0]?.total_revenue ?? 0),
        };
      })
    ),
    Promise.all(
      locations.map(async (location) => {
        const result = await database.$queryRaw<
          Array<{ event_count: bigint; completed_count: bigint }>
        >(
          Prisma.sql`
          SELECT
            COUNT(*)::bigint AS event_count,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::bigint AS completed_count
          FROM tenant_events.events
          WHERE tenant_id = ${tenantId}::uuid
            AND deleted_at IS NULL
            AND location_id = ${location.id}::uuid
            AND event_date >= ${effectiveStartDate}
            AND event_date <= ${effectiveEndDate}
        `
        );
        return {
          locationId: location.id,
          eventCount: Number(result[0]?.event_count ?? 0),
          completedCount: Number(result[0]?.completed_count ?? 0),
        };
      })
    ),
    Promise.all(
      locations.map(async (location) => {
        const result = await database.$queryRaw<
          Array<{ inventory_value: string | null; item_count: bigint }>
        >(
          Prisma.sql`
          SELECT
            COALESCE(SUM(st.quantity_on_hand * ii.unit_cost), 0)::numeric AS inventory_value,
            COUNT(DISTINCT ii.id)::bigint AS item_count
          FROM tenant_inventory.inventory_items ii
          INNER JOIN tenant_inventory.inventory_stock st
            ON st.tenant_id = ii.tenant_id
            AND st.item_id = ii.id
          INNER JOIN tenant_inventory.storage_locations sl
            ON sl.tenant_id = st.tenant_id
            AND sl.id = st.storage_location_id
          WHERE ii.tenant_id = ${tenantId}::uuid
            AND ii.deleted_at IS NULL
            AND sl.deleted_at IS NULL
            AND sl.location_id = ${location.id}::uuid
        `
        );
        return {
          locationId: location.id,
          inventoryValue: Number(result[0]?.inventory_value ?? 0),
          itemCount: Number(result[0]?.item_count ?? 0),
        };
      })
    ),
    Promise.all(
      locations.map(async (location) => {
        const count = await database.employeeLocation.count({
          where: {
            tenantId,
            locationId: location.id,
            deleted_at: null,
          },
        });
        return {
          locationId: location.id,
          staffCount: count,
        };
      })
    ),
  ]);

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
