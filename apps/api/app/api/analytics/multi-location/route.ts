/**
 * Multi-Location Executive Dashboard API
 *
 * Provides executive-level KPIs, benchmarks, and comparisons across locations
 *
 * GET /api/analytics/multi-location - Get multi-location executive metrics
 */

import { auth } from "@repo/auth/server";
import { database, Prisma } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "../../lib/tenant";

interface MultiLocationFilters {
  locationIds?: string[];
  startDate?: string;
  endDate?: string;
  period?: "7d" | "30d" | "90d" | "12m";
  kpiCategories?: string[];
}

/**
 * Parse multi-location dashboard filters from URL search params
 */
function parseMultiLocationFilters(
  searchParams: URLSearchParams
): MultiLocationFilters {
  const filters: MultiLocationFilters = {};

  const locationIdsParam = searchParams.get("locationIds");
  if (locationIdsParam) {
    filters.locationIds = locationIdsParam.split(",");
  }

  const startDate = searchParams.get("startDate");
  if (startDate) {
    filters.startDate = startDate;
  }

  const endDate = searchParams.get("endDate");
  if (endDate) {
    filters.endDate = endDate;
  }

  const period = searchParams.get("period");
  if (period && ["7d", "30d", "90d", "12m"].includes(period)) {
    filters.period = period as "7d" | "30d" | "90d" | "12m";
  }

  const kpiCategoriesParam = searchParams.get("kpiCategories");
  if (kpiCategoriesParam) {
    filters.kpiCategories = kpiCategoriesParam.split(",");
  }

  return filters;
}

/**
 * Get date range based on period
 */
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
    case "30d":
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

/**
 * GET /api/analytics/multi-location - Get multi-location executive metrics
 */
export async function GET(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!(userId && orgId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filters = parseMultiLocationFilters(searchParams);
    const period = filters.period || "30d";

    // Get date range
    const { startDate, endDate, previousStartDate, previousEndDate } =
      getDateRange(period);

    // Get all active locations for the tenant
    const locations = await database.location.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        ...(filters.locationIds && {
          id: { in: filters.locationIds },
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
      return NextResponse.json({
        data: {
          locations: [],
          summary: {
            totalLocations: 0,
            reportPeriod: {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
            },
          },
          kpis: [],
          benchmarks: [],
        },
      });
    }

    const locationIds = locations.map((l) => l.id);

    // Fetch all metrics in parallel for better performance
    const [
      // Revenue metrics
      currentRevenueRows,
      previousRevenueRows,
      // Labor metrics
      currentLaborRows,
      previousLaborRows,
      // Waste metrics
      currentWasteRows,
      previousWasteRows,
      // Margin metrics
      currentMarginRows,
      previousMarginRows,
      // Event counts
      currentEventRows,
      previousEventRows,
      // Inventory value
      currentInventoryRows,
      // Staffing counts
      staffingRows,
    ] = await Promise.all([
      // Current period revenue by location
      Promise.all(
        locations.map(async (location) => {
          const result = await database.$queryRaw<
            Array<{ total_revenue: string | null }>
          >(
            Prisma.sql`
            SELECT COALESCE(SUM(total_amount), 0)::numeric AS total_revenue
            FROM tenant_events.catering_orders
            WHERE tenant_id = ${tenantId}::uuid
              AND deleted_at IS NULL
              AND location_id = ${location.id}::uuid
              AND order_date >= ${startDate}
              AND order_date < ${endDate}
          `
          );
          return {
            locationId: location.id,
            locationName: location.name,
            revenue: Number(result[0]?.total_revenue ?? 0),
          };
        })
      ),
      // Previous period revenue by location
      Promise.all(
        locations.map(async (location) => {
          const result = await database.$queryRaw<
            Array<{ total_revenue: string | null }>
          >(
            Prisma.sql`
            SELECT COALESCE(SUM(total_amount), 0)::numeric AS total_revenue
            FROM tenant_events.catering_orders
            WHERE tenant_id = ${tenantId}::uuid
              AND deleted_at IS NULL
              AND location_id = ${location.id}::uuid
              AND order_date >= ${previousStartDate}
              AND order_date < ${previousEndDate}
          `
          );
          return {
            locationId: location.id,
            revenue: Number(result[0]?.total_revenue ?? 0),
          };
        })
      ),
      // Current period labor metrics
      Promise.all(
        locations.map(async (location) => {
          const result = await database.$queryRaw<
            Array<{
              budgeted_labor: string | null;
              actual_labor: string | null;
            }>
          >(
            Prisma.sql`
            SELECT
              COALESCE(SUM(budgeted_labor_cost), 0)::numeric AS budgeted_labor,
              COALESCE(SUM(actual_labor_cost), 0)::numeric AS actual_labor
            FROM tenant_events.event_profitability
            WHERE tenant_id = ${tenantId}::uuid
              AND deleted_at IS NULL
              AND location_id = ${location.id}::uuid
              AND calculated_at >= ${startDate}
              AND calculated_at < ${endDate}
          `
          );
          return {
            locationId: location.id,
            budgetedLabor: Number(result[0]?.budgeted_labor ?? 0),
            actualLabor: Number(result[0]?.actual_labor ?? 0),
          };
        })
      ),
      // Previous period labor metrics
      Promise.all(
        locations.map(async (location) => {
          const result = await database.$queryRaw<
            Array<{
              budgeted_labor: string | null;
              actual_labor: string | null;
            }>
          >(
            Prisma.sql`
            SELECT
              COALESCE(SUM(budgeted_labor_cost), 0)::numeric AS budgeted_labor,
              COALESCE(SUM(actual_labor_cost), 0)::numeric AS actual_labor
            FROM tenant_events.event_profitability
            WHERE tenant_id = ${tenantId}::uuid
              AND deleted_at IS NULL
              AND location_id = ${location.id}::uuid
              AND calculated_at >= ${previousStartDate}
              AND calculated_at < ${previousEndDate}
          `
          );
          return {
            locationId: location.id,
            budgetedLabor: Number(result[0]?.budgeted_labor ?? 0),
            actualLabor: Number(result[0]?.actual_labor ?? 0),
          };
        })
      ),
      // Current period waste metrics
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
              AND logged_at >= ${startDate}
              AND logged_at < ${endDate}
          `
          );
          return {
            locationId: location.id,
            wasteCost: Number(result[0]?.waste_cost ?? 0),
          };
        })
      ),
      // Previous period waste metrics
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
              AND logged_at >= ${previousStartDate}
              AND logged_at < ${previousEndDate}
          `
          );
          return {
            locationId: location.id,
            wasteCost: Number(result[0]?.waste_cost ?? 0),
          };
        })
      ),
      // Current period margin metrics
      Promise.all(
        locations.map(async (location) => {
          const result = await database.$queryRaw<
            Array<{ avg_margin: string | null; total_revenue: string | null }>
          >(
            Prisma.sql`
            SELECT
              COALESCE(AVG(actual_gross_margin_pct), 0)::numeric AS avg_margin,
              COALESCE(SUM(actual_revenue), 0)::numeric AS total_revenue
            FROM tenant_events.event_profitability
            WHERE tenant_id = ${tenantId}::uuid
              AND deleted_at IS NULL
              AND location_id = ${location.id}::uuid
              AND calculated_at >= ${startDate}
              AND calculated_at < ${endDate}
          `
          );
          return {
            locationId: location.id,
            avgMargin: Number(result[0]?.avg_margin ?? 0),
            totalRevenue: Number(result[0]?.total_revenue ?? 0),
          };
        })
      ),
      // Previous period margin metrics
      Promise.all(
        locations.map(async (location) => {
          const result = await database.$queryRaw<
            Array<{ avg_margin: string | null }>
          >(
            Prisma.sql`
            SELECT COALESCE(AVG(actual_gross_margin_pct), 0)::numeric AS avg_margin
            FROM tenant_events.event_profitability
            WHERE tenant_id = ${tenantId}::uuid
              AND deleted_at IS NULL
              AND location_id = ${location.id}::uuid
              AND calculated_at >= ${previousStartDate}
              AND calculated_at < ${previousEndDate}
          `
          );
          return {
            locationId: location.id,
            avgMargin: Number(result[0]?.avg_margin ?? 0),
          };
        })
      ),
      // Current period event counts
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
              AND event_date >= ${startDate}
              AND event_date <= ${endDate}
          `
          );
          return {
            locationId: location.id,
            eventCount: Number(result[0]?.event_count ?? 0),
            completedCount: Number(result[0]?.completed_count ?? 0),
          };
        })
      ),
      // Previous period event counts
      Promise.all(
        locations.map(async (location) => {
          const result = await database.$queryRaw<
            Array<{ event_count: bigint }>
          >(
            Prisma.sql`
            SELECT COUNT(*)::bigint AS event_count
            FROM tenant_events.events
            WHERE tenant_id = ${tenantId}::uuid
              AND deleted_at IS NULL
              AND location_id = ${location.id}::uuid
              AND event_date >= ${previousStartDate}
              AND event_date <= ${previousEndDate}
          `
          );
          return {
            locationId: location.id,
            eventCount: Number(result[0]?.event_count ?? 0),
          };
        })
      ),
      // Current inventory value by location
      Promise.all(
        locations.map(async (location) => {
          const result = await database.$queryRaw<
            Array<{ inventory_value: string | null; item_count: bigint }>
          >(
            Prisma.sql`
            SELECT
              COALESCE(SUM(quantity_on_hand * unit_cost), 0)::numeric AS inventory_value,
              COUNT(DISTINCT id)::bigint AS item_count
            FROM tenant_inventory.inventory_items
            WHERE tenant_id = ${tenantId}::uuid
              AND deleted_at IS NULL
              AND location_id = ${location.id}::uuid
          `
          );
          return {
            locationId: location.id,
            inventoryValue: Number(result[0]?.inventory_value ?? 0),
            itemCount: Number(result[0]?.item_count ?? 0),
          };
        })
      ),
      // Staffing counts by location
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

    // Build location metrics map
    const locationMetrics = new Map<
      string,
      {
        currentRevenue: number;
        previousRevenue: number;
        budgetedLabor: number;
        actualLabor: number;
        currentWasteCost: number;
        previousWasteCost: number;
        currentAvgMargin: number;
        previousAvgMargin: number;
        eventCount: number;
        previousEventCount: number;
        completedEventCount: number;
        inventoryValue: number;
        itemCount: number;
        staffCount: number;
      }
    >();

    locations.forEach((location) => {
      locationMetrics.set(location.id, {
        currentRevenue: 0,
        previousRevenue: 0,
        budgetedLabor: 0,
        actualLabor: 0,
        currentWasteCost: 0,
        previousWasteCost: 0,
        currentAvgMargin: 0,
        previousAvgMargin: 0,
        eventCount: 0,
        previousEventCount: 0,
        completedEventCount: 0,
        inventoryValue: 0,
        itemCount: 0,
        staffCount: 0,
      });
    });

    // Populate current revenue
    currentRevenueRows.forEach((item) => {
      const metrics = locationMetrics.get(item.locationId);
      if (metrics) metrics.currentRevenue = item.revenue;
    });

    // Populate previous revenue
    previousRevenueRows.forEach((item) => {
      const metrics = locationMetrics.get(item.locationId);
      if (metrics) metrics.previousRevenue = item.revenue;
    });

    // Populate labor metrics
    currentLaborRows.forEach((item) => {
      const metrics = locationMetrics.get(item.locationId);
      if (metrics) {
        metrics.budgetedLabor = item.budgetedLabor;
        metrics.actualLabor = item.actualLabor;
      }
    });

    // Populate waste metrics
    currentWasteRows.forEach((item) => {
      const metrics = locationMetrics.get(item.locationId);
      if (metrics) metrics.currentWasteCost = item.wasteCost;
    });

    previousWasteRows.forEach((item) => {
      const metrics = locationMetrics.get(item.locationId);
      if (metrics) metrics.previousWasteCost = item.wasteCost;
    });

    // Populate margin metrics
    currentMarginRows.forEach((item) => {
      const metrics = locationMetrics.get(item.locationId);
      if (metrics) metrics.currentAvgMargin = item.avgMargin;
    });

    previousMarginRows.forEach((item) => {
      const metrics = locationMetrics.get(item.locationId);
      if (metrics) metrics.previousAvgMargin = item.avgMargin;
    });

    // Populate event counts
    currentEventRows.forEach((item) => {
      const metrics = locationMetrics.get(item.locationId);
      if (metrics) {
        metrics.eventCount = item.eventCount;
        metrics.completedEventCount = item.completedCount;
      }
    });

    previousEventRows.forEach((item) => {
      const metrics = locationMetrics.get(item.locationId);
      if (metrics) metrics.previousEventCount = item.eventCount;
    });

    // Populate inventory metrics
    currentInventoryRows.forEach((item) => {
      const metrics = locationMetrics.get(item.locationId);
      if (metrics) {
        metrics.inventoryValue = item.inventoryValue;
        metrics.itemCount = item.itemCount;
      }
    });

    // Populate staffing metrics
    staffingRows.forEach((item) => {
      const metrics = locationMetrics.get(item.locationId);
      if (metrics) metrics.staffCount = item.staffCount;
    });

    // Calculate aggregates and KPIs
    const totalCurrentRevenue = Array.from(locationMetrics.values()).reduce(
      (sum, m) => sum + m.currentRevenue,
      0
    );
    const totalPreviousRevenue = Array.from(locationMetrics.values()).reduce(
      (sum, m) => sum + m.previousRevenue,
      0
    );
    const revenueChangePct =
      totalPreviousRevenue > 0
        ? ((totalCurrentRevenue - totalPreviousRevenue) /
            totalPreviousRevenue) *
          100
        : 0;

    const totalBudgetedLabor = Array.from(locationMetrics.values()).reduce(
      (sum, m) => sum + m.budgetedLabor,
      0
    );
    const totalActualLabor = Array.from(locationMetrics.values()).reduce(
      (sum, m) => sum + m.actualLabor,
      0
    );
    const laborUtilizationPct =
      totalBudgetedLabor > 0
        ? (totalActualLabor / totalBudgetedLabor) * 100
        : 0;

    const totalCurrentWaste = Array.from(locationMetrics.values()).reduce(
      (sum, m) => sum + m.currentWasteCost,
      0
    );
    const totalPreviousWaste = Array.from(locationMetrics.values()).reduce(
      (sum, m) => sum + m.previousWasteCost,
      0
    );
    const wasteChangePct =
      totalPreviousWaste > 0
        ? ((totalCurrentWaste - totalPreviousWaste) / totalPreviousWaste) * 100
        : 0;

    // Calculate weighted average margin (weighted by revenue)
    let totalRevenueForMargin = 0;
    let weightedMarginSum = 0;
    currentMarginRows.forEach((item) => {
      if (item.totalRevenue > 0) {
        totalRevenueForMargin += item.totalRevenue;
        weightedMarginSum += item.avgMargin * item.totalRevenue;
      }
    });
    const avgMarginPct =
      totalRevenueForMargin > 0 ? weightedMarginSum / totalRevenueForMargin : 0;

    const totalEvents = Array.from(locationMetrics.values()).reduce(
      (sum, m) => sum + m.eventCount,
      0
    );
    const completedEvents = Array.from(locationMetrics.values()).reduce(
      (sum, m) => sum + m.completedEventCount,
      0
    );
    const completionRate = totalEvents > 0 ? completedEvents / totalEvents : 0;

    const totalInventoryValue = Array.from(locationMetrics.values()).reduce(
      (sum, m) => sum + m.inventoryValue,
      0
    );
    const totalStaffCount = Array.from(locationMetrics.values()).reduce(
      (sum, m) => sum + m.staffCount,
      0
    );

    // Build KPIs array
    const kpis = [
      {
        id: "total-revenue",
        title: "Total Revenue",
        value: totalCurrentRevenue,
        formatted: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(totalCurrentRevenue),
        change: revenueChangePct,
        changeFormatted: `${revenueChangePct >= 0 ? "+" : ""}${revenueChangePct.toFixed(1)}%`,
        trend: revenueChangePct >= 0 ? "up" : "down",
        category: "financial",
        locationBreakdown: Array.from(locationMetrics.entries()).map(
          ([locationId, metrics]) => {
            const location = locations.find((l) => l.id === locationId);
            return {
              locationId,
              locationName: location?.name || "Unknown",
              value: metrics.currentRevenue,
              formatted: new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              }).format(metrics.currentRevenue),
              change:
                metrics.previousRevenue > 0
                  ? ((metrics.currentRevenue - metrics.previousRevenue) /
                      metrics.previousRevenue) *
                    100
                  : 0,
            };
          }
        ),
      },
      {
        id: "labor-utilization",
        title: "Labor Utilization",
        value: laborUtilizationPct,
        formatted: `${laborUtilizationPct.toFixed(1)}%`,
        change: 0, // Would need previous period for comparison
        changeFormatted: "vs budget",
        trend: laborUtilizationPct <= 100 ? "up" : "down",
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
        value: totalCurrentWaste,
        formatted: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(totalCurrentWaste),
        change: wasteChangePct,
        changeFormatted: `${wasteChangePct >= 0 ? "+" : ""}${wasteChangePct.toFixed(1)}%`,
        trend: wasteChangePct <= 0 ? "up" : "down",
        category: "operational",
        locationBreakdown: Array.from(locationMetrics.entries()).map(
          ([locationId, metrics]) => {
            const location = locations.find((l) => l.id === locationId);
            return {
              locationId,
              locationName: location?.name || "Unknown",
              value: metrics.currentWasteCost,
              formatted: new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              }).format(metrics.currentWasteCost),
              change:
                metrics.previousWasteCost > 0
                  ? ((metrics.currentWasteCost - metrics.previousWasteCost) /
                      metrics.previousWasteCost) *
                    100
                  : 0,
            };
          }
        ),
      },
      {
        id: "profit-margin",
        title: "Profit Margin",
        value: avgMarginPct,
        formatted: `${avgMarginPct.toFixed(1)}%`,
        change: 0, // Would need previous period
        changeFormatted: "average",
        trend:
          avgMarginPct >= 20 ? "up" : avgMarginPct >= 10 ? "neutral" : "down",
        category: "financial",
        locationBreakdown: Array.from(locationMetrics.entries()).map(
          ([locationId, metrics]) => {
            const location = locations.find((l) => l.id === locationId);
            return {
              locationId,
              locationName: location?.name || "Unknown",
              value: metrics.currentAvgMargin,
              formatted: `${metrics.currentAvgMargin.toFixed(1)}%`,
            };
          }
        ),
      },
      {
        id: "event-completion",
        title: "Event Completion Rate",
        value: completionRate,
        formatted: new Intl.NumberFormat("en-US", {
          style: "percent",
          maximumFractionDigits: 0,
        }).format(completionRate),
        change: 0,
        changeFormatted: "completion rate",
        trend:
          completionRate >= 0.9
            ? "up"
            : completionRate >= 0.75
              ? "neutral"
              : "down",
        category: "operational",
        locationBreakdown: Array.from(locationMetrics.entries()).map(
          ([locationId, metrics]) => {
            const location = locations.find((l) => l.id === locationId);
            const rate =
              metrics.eventCount > 0
                ? metrics.completedEventCount / metrics.eventCount
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
              completed: metrics.completedEventCount,
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
        trend: "neutral",
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

    // Build benchmarks (industry standards/targets)
    const benchmarks = [
      {
        id: "revenue-per-staff",
        title: "Revenue per Staff Member",
        currentValue:
          totalStaffCount > 0 ? totalCurrentRevenue / totalStaffCount : 0,
        target: 75_000, // Industry benchmark
        formatted: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(
          totalStaffCount > 0 ? totalCurrentRevenue / totalStaffCount : 0
        ),
        targetFormatted: new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(75_000),
        status:
          totalStaffCount > 0 && totalCurrentRevenue / totalStaffCount >= 75_000
            ? "above"
            : "below",
        category: "productivity",
      },
      {
        id: "waste-percentage",
        title: "Waste as % of Revenue",
        currentValue:
          totalCurrentRevenue > 0
            ? (totalCurrentWaste / totalCurrentRevenue) * 100
            : 0,
        target: 3, // Industry target: <3%
        formatted: `${(totalCurrentRevenue > 0 ? (totalCurrentWaste / totalCurrentRevenue) * 100 : 0).toFixed(1)}%`,
        targetFormatted: "< 3%",
        status:
          totalCurrentRevenue > 0 &&
          (totalCurrentWaste / totalCurrentRevenue) * 100 <= 3
            ? "above"
            : "below",
        category: "operational",
      },
      {
        id: "labor-percentage",
        title: "Labor as % of Revenue",
        currentValue:
          totalCurrentRevenue > 0
            ? (totalActualLabor / totalCurrentRevenue) * 100
            : 0,
        target: 30, // Industry target: <30%
        formatted: `${(totalCurrentRevenue > 0 ? (totalActualLabor / totalCurrentRevenue) * 100 : 0).toFixed(1)}%`,
        targetFormatted: "< 30%",
        status:
          totalCurrentRevenue > 0 &&
          (totalActualLabor / totalCurrentRevenue) * 100 <= 30
            ? "above"
            : "below",
        category: "financial",
      },
      {
        id: "margin-target",
        title: "Gross Margin vs Target",
        currentValue: avgMarginPct,
        target: 25, // Target: 25% gross margin
        formatted: `${avgMarginPct.toFixed(1)}%`,
        targetFormatted: "≥ 25%",
        status:
          avgMarginPct >= 25 ? "above" : avgMarginPct >= 15 ? "near" : "below",
        category: "financial",
      },
    ];

    // Build location comparison data
    const locationComparison = locations.map((location) => {
      const metrics = locationMetrics.get(location.id) || {
        currentRevenue: 0,
        budgetedLabor: 0,
        actualLabor: 0,
        currentWasteCost: 0,
        currentAvgMargin: 0,
        eventCount: 0,
        completedEventCount: 0,
        inventoryValue: 0,
        itemCount: 0,
        staffCount: 0,
      };

      const laborUtilization =
        metrics.budgetedLabor > 0
          ? (metrics.actualLabor / metrics.budgetedLabor) * 100
          : 0;
      const completionRate =
        metrics.eventCount > 0
          ? metrics.completedEventCount / metrics.eventCount
          : 0;
      const wastePercent =
        metrics.currentRevenue > 0
          ? (metrics.currentWasteCost / metrics.currentRevenue) * 100
          : 0;

      return {
        locationId: location.id,
        locationName: location.name,
        isPrimary: location.isPrimary,
        metrics: {
          revenue: metrics.currentRevenue,
          revenueFormatted: new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(metrics.currentRevenue),
          laborUtilization,
          laborUtilizationFormatted: `${laborUtilization.toFixed(1)}%`,
          wasteCost: metrics.currentWasteCost,
          wasteCostFormatted: new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(metrics.currentWasteCost),
          wastePercent,
          wastePercentFormatted: `${wastePercent.toFixed(1)}%`,
          margin: metrics.currentAvgMargin,
          marginFormatted: `${metrics.currentAvgMargin.toFixed(1)}%`,
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
            metrics.staffCount > 0
              ? metrics.currentRevenue / metrics.staffCount
              : 0,
        },
      };
    });

    // Identify top and bottom performing locations for each KPI
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

    return NextResponse.json({
      data: {
        locations,
        summary: {
          totalLocations: locations.length,
          totalRevenue: totalCurrentRevenue,
          totalRevenueFormatted: new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(totalCurrentRevenue),
          totalStaff: totalStaffCount,
          reportPeriod: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            previousStart: previousStartDate.toISOString(),
            previousEnd: previousEndDate.toISOString(),
          },
        },
        kpis,
        benchmarks,
        locationComparison,
        rankings,
      },
    });
  } catch (error) {
    captureException(error);
    console.error("Failed to generate multi-location dashboard:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
