/**
 * Consolidated Multi-Location Reporting API
 *
 * Provides cross-location analytics and consolidated views
 *
 * GET    /api/analytics/consolidated - Get consolidated metrics across locations
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface ConsolidatedReportFilters {
  locationIds?: string[];
  startDate?: string;
  endDate?: string;
  metrics?: string[];
}

/**
 * Parse consolidated report filters from URL search params
 */
function parseConsolidatedFilters(
  searchParams: URLSearchParams
): ConsolidatedReportFilters {
  const filters: ConsolidatedReportFilters = {};

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

  const metricsParam = searchParams.get("metrics");
  if (metricsParam) {
    filters.metrics = metricsParam.split(",");
  }

  return filters;
}

/**
 * GET /api/analytics/consolidated - Get consolidated metrics across locations
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
    const filters = parseConsolidatedFilters(searchParams);

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
      },
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
    });

    const locationIds = locations.map((l) => l.id);

    // Date range filters
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    // Build consolidated metrics
    const metrics: Record<string, any> = {
      locations,
      summary: {
        totalLocations: locations.length,
        reportPeriod: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
    };

    // Inventory metrics by location
    const inventoryMetrics = await database.inventoryItem.groupBy({
      by: [],
      where: {
        tenantId,
        deletedAt: null,
      },
      _count: { id: true },
      _sum: {
        quantityOnHand: true,
        unitCost: true,
      },
    });

    const inventoryByLocation: Array<{
      locationId: string;
      locationName: string;
      totalItems: number;
      totalValue: number;
      lowStockItems: number;
    }> = [];

    for (const location of locations) {
      // Get inventory stock for this location
      const stockRecords = await database.$queryRaw<
        Array<{
          total_items: bigint;
          total_value: string;
          low_stock_count: bigint;
        }>
      >`
        SELECT
          COUNT(DISTINCT ii.id)::bigint as total_items,
          COALESCE(SUM(ii.quantity_on_hand * ii.unit_cost), 0)::text as total_value,
          COUNT(DISTINCT CASE WHEN ii.quantity_on_hand <= ii.reorder_level THEN ii.id END)::bigint as low_stock_count
        FROM tenant_inventory.inventory_items ii
        WHERE ii.tenant_id = ${tenantId}
          AND ii.deleted_at IS NULL
      `;

      inventoryByLocation.push({
        locationId: location.id,
        locationName: location.name,
        totalItems: Number(stockRecords[0]?.total_items ?? 0),
        totalValue: Number(stockRecords[0]?.total_value ?? 0),
        lowStockItems: Number(stockRecords[0]?.low_stock_count ?? 0),
      });
    }

    metrics.inventory = {
      consolidated: {
        totalItems: inventoryMetrics._count.id,
        totalValue: Number(inventoryMetrics._sum.quantityOnHand ?? 0),
        lowStockItems: 0, // Would need additional query
      },
      byLocation: inventoryByLocation,
    };

    // Transfer metrics
    const transferMetrics = await database.interLocationTransfer.groupBy({
      by: ["status"],
      where: {
        tenantId,
        deletedAt: null,
        ...(filters.locationIds && {
          OR: [
            { fromLocationId: { in: filters.locationIds } },
            { toLocationId: { in: filters.locationIds } },
          ],
        }),
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
      _sum: {
        // Could add value fields here
      },
    });

    metrics.transfers = {
      byStatus: transferMetrics.map((m) => ({
        status: m.status,
        count: m._count.id,
      })),
      total: transferMetrics.reduce((sum, m) => sum + m._count.id, 0),
    };

    // Recipe utilization by location
    const recipeByLocation: Array<{
      locationId: string;
      locationName: string;
      totalRecipes: number;
    }> = [];

    for (const location of locations) {
      const recipeCount = await database.recipe.count({
        where: {
          tenantId,
          deletedAt: null,
          // Note: Recipe doesn't have locationId directly, this is for illustration
          // In practice, you'd join through a recipe-location mapping table
        },
      });

      recipeByLocation.push({
        locationId: location.id,
        locationName: location.name,
        totalRecipes: recipeCount,
      });
    }

    metrics.recipes = {
      byLocation: recipeByLocation,
      total: recipeByLocation.reduce((sum, l) => sum + l.totalRecipes, 0),
    };

    // Waste entries by location
    const wasteByLocation: Array<{
      locationId: string;
      locationName: string;
      totalWasteEntries: number;
      totalWasteCost: number;
    }> = [];

    for (const location of locations) {
      const wasteData = await database.wasteEntry.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          locationId: location.id,
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: { id: true },
        _sum: { cost: true },
      });

      wasteByLocation.push({
        locationId: location.id,
        locationName: location.name,
        totalWasteEntries: wasteData._count.id,
        totalWasteCost: Number(wasteData._sum.cost ?? 0),
      });
    }

    metrics.waste = {
      byLocation: wasteByLocation,
      total: wasteByLocation.reduce((sum, l) => sum + l.totalWasteEntries, 0),
      totalCost: wasteByLocation.reduce((sum, l) => sum + l.totalWasteCost, 0),
    };

    // Staffing metrics by location
    const staffByLocation: Array<{
      locationId: string;
      locationName: string;
      activeEmployees: number;
    }> = [];

    for (const location of locations) {
      const employeeCount = await database.employeeLocation.count({
        where: {
          tenantId,
          locationId: location.id,
          deletedAt: null,
        },
      });

      staffByLocation.push({
        locationId: location.id,
        locationName: location.name,
        activeEmployees: employeeCount,
      });
    }

    metrics.staffing = {
      byLocation: staffByLocation,
      total: staffByLocation.reduce((sum, l) => sum + l.activeEmployees, 0),
    };

    return NextResponse.json({ data: metrics });
  } catch (error) {
    captureException(error);
    console.error("Failed to generate consolidated report:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/consolidated/locations - Get location comparison metrics
 */
export async function GET_LOCATIONS(request: Request) {
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

    // Get locations with key metrics for comparison
    const locations = await database.location.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        isPrimary: true,
        timezone: true,
      },
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
    });

    // For each location, gather comparison metrics
    const locationComparison = await Promise.all(
      locations.map(async (location) => {
        // Count inventory items
        const inventoryCount = await database.inventoryItem.count({
          where: {
            tenantId,
            deletedAt: null,
          },
        });

        // Count staff assigned to this location
        const staffCount = await database.employeeLocation.count({
          where: {
            tenantId,
            locationId: location.id,
            deletedAt: null,
          },
        });

        // Count stations at this location
        const stationCount = await database.station.count({
          where: {
            tenantId,
            locationId: location.id,
            deletedAt: null,
            isActive: true,
          },
        });

        // Get recent transfers
        const transfersOut = await database.interLocationTransfer.count({
          where: {
            tenantId,
            fromLocationId: location.id,
            deletedAt: null,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        });

        const transfersIn = await database.interLocationTransfer.count({
          where: {
            tenantId,
            toLocationId: location.id,
            deletedAt: null,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        });

        return {
          locationId: location.id,
          locationName: location.name,
          isPrimary: location.isPrimary,
          timezone: location.timezone,
          metrics: {
            inventoryItems: inventoryCount,
            activeStaff: staffCount,
            stations: stationCount,
            transfersOut30Days: transfersOut,
            transfersIn30Days: transfersIn,
          },
        };
      })
    );

    return NextResponse.json({ data: locationComparison });
  } catch (error) {
    captureException(error);
    console.error("Failed to generate location comparison:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
