import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface StationMetrics {
  station_id: string;
  station_name: string;
  total_items: string;
  completed_items: string;
  avg_completion_minutes: string;
}

interface PrepListsSync {
  total: string;
  completed: string;
}

interface TimeToCompletion {
  avg_minutes: string;
}

interface StationTrend {
  date: string;
  station_name: string;
  completed: string;
  total: string;
}

interface TopPerformer {
  employee_id: string;
  first_name: string;
  last_name: string;
  completed_tasks: string;
  avg_minutes: string;
}

interface DateRange {
  now: Date;
  startDate: Date;
}

interface StationThroughputData {
  stationId: string;
  stationName: string;
  load: number;
  completed: number;
  avgTime: string;
  totalItems: number;
  completedItems: number;
  pendingItems: number;
}

interface KitchenHealthData {
  prepListsSync: {
    rate: number;
    total: number;
    completed: number;
  };
  allergenWarnings: number;
  wasteAlerts: number;
  timeToCompletion: string;
  avgMinutes: number;
}

interface TrendData {
  date: string;
  stations: Array<{
    stationName: string;
    total: number;
    completed: number;
    completionRate: number;
  }>;
}

interface TopPerformerData {
  employeeId: string;
  firstName: string;
  lastName: string;
  completedTasks: number;
  avgMinutes: number;
}

function calculateDateRange(period: string): DateRange {
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

  return { now, startDate };
}

async function fetchStationMetrics(
  tenantId: string,
  startDate: Date,
  locationId: string | null
) {
  return await database.$queryRawUnsafe<StationMetrics[]>(
    `
    SELECT
      pli.station_id as station_id,
      pli.station_name as station_name,
      COUNT(*)::int as total_items,
      COUNT(CASE WHEN pli.is_completed = true THEN 1 END)::int as completed_items,
      COALESCE(AVG(
        CASE
          WHEN pli.completed_at IS NOT NULL AND pli.created_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (pli.completed_at - pli.created_at)) / 60
          ELSE NULL
        END
      ), 0)::numeric as avg_completion_minutes
    FROM tenant_kitchen.prep_list_items pli
    WHERE pli.tenant_id = $1
      AND pli.created_at >= $2
      AND pli.deleted_at IS NULL
      AND pli.station_id IS NOT NULL
      AND pli.station_name IS NOT NULL
      ${locationId ? "AND pli.station_id = $3" : ""}
    GROUP BY pli.station_id, pli.station_name
    ORDER BY pli.station_name
    `,
    locationId ? [tenantId, startDate, locationId] : [tenantId, startDate]
  );
}

async function fetchKitchenHealthMetrics(
  tenantId: string,
  startDate: Date,
  locationId: string | null
) {
  const [prepListsSync, allergenWarnings, wasteAlerts, timeToCompletion] =
    await Promise.all([
      database.$queryRawUnsafe<PrepListsSync[]>(
        `
        SELECT
          COUNT(*)::int as total,
          COUNT(CASE WHEN status = 'finalized' THEN 1 END)::int as completed
        FROM tenant_kitchen.prep_lists
        WHERE tenant_id = $1
          AND generated_at >= $2
          AND deleted_at IS NULL
        `,
        [tenantId, startDate]
      ),

      database.allergenWarning.count({
        where: {
          tenantId,
          isAcknowledged: false,
          deletedAt: null,
        },
      }),

      database.wasteEntry.count({
        where: {
          tenantId,
          deletedAt: null,
          loggedAt: { gte: startDate },
          ...(locationId ? { locationId } : {}),
        },
      }),

      database.$queryRawUnsafe<TimeToCompletion[]>(
        `
        SELECT COALESCE(AVG(
          CASE
            WHEN pt.actual_minutes IS NOT NULL THEN pt.actual_minutes
            WHEN pt.completed_at IS NOT NULL AND pt.created_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (pt.completed_at - pt.created_at)) / 60
            ELSE NULL
          END
        ), 0)::numeric as avg_minutes
        FROM tenant_kitchen.prep_tasks pt
        WHERE pt.tenant_id = $1
          AND pt.created_at >= $2
          AND pt.status = 'completed'
          AND pt.deleted_at IS NULL
        `,
        [tenantId, startDate]
      ),
    ]);

  return { prepListsSync, allergenWarnings, wasteAlerts, timeToCompletion };
}

async function fetchStationTrends(
  tenantId: string,
  startDate: Date,
  locationId: string | null
) {
  return await database.$queryRawUnsafe<StationTrend[]>(
    `
    SELECT
      DATE(pli.created_at)::text as date,
      pli.station_name as station_name,
      COUNT(*)::int as total,
      COUNT(CASE WHEN pli.is_completed = true THEN 1 END)::int as completed
    FROM tenant_kitchen.prep_list_items pli
    WHERE pli.tenant_id = $1
      AND pli.created_at >= $2
      AND pli.deleted_at IS NULL
      AND pli.station_name IS NOT NULL
      ${locationId ? "AND pli.station_id = $3" : ""}
    GROUP BY DATE(pli.created_at), pli.station_name
    ORDER BY date DESC, station_name
    LIMIT 500
    `,
    locationId ? [tenantId, startDate, locationId] : [tenantId, startDate]
  );
}

async function fetchTopPerformers(
  tenantId: string,
  startDate: Date,
  locationId: string | null
) {
  return await database.$queryRawUnsafe<TopPerformer[]>(
    `
    SELECT
      u.id as employee_id,
      u.first_name,
      u.last_name,
      COUNT(DISTINCT pt.id)::int as completed_tasks,
      COALESCE(AVG(
        CASE
          WHEN pt.actual_minutes IS NOT NULL THEN pt.actual_minutes
          WHEN pt.completed_at IS NOT NULL AND pt.created_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (pt.completed_at - pt.created_at)) / 60
          ELSE NULL
        END
      ), 0)::numeric as avg_minutes
    FROM tenant_kitchen.prep_tasks pt
    JOIN platform.users u ON pt.tenant_id = u.tenant_id AND pt.location_id = ANY(u.location_ids)
    WHERE pt.tenant_id = $1
      AND pt.created_at >= $2
      AND pt.status = 'completed'
      AND pt.deleted_at IS NULL
      AND u.deleted_at IS NULL
      ${locationId ? "AND pt.location_id = $3" : ""}
    GROUP BY u.id, u.first_name, u.last_name
    ORDER BY completed_tasks DESC
    LIMIT 5
    `,
    locationId ? [tenantId, startDate, locationId] : [tenantId, startDate]
  );
}

function formatAvgTime(minutes: number): string {
  if (minutes <= 0) {
    return "N/A";
  }
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}

function calculateStationThroughput(
  stationMetrics: StationMetrics[]
): StationThroughputData[] {
  return stationMetrics.map((station) => {
    const totalItems = Number(station.total_items);
    const completedItems = Number(station.completed_items);
    const completionRate =
      totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
    const avgMinutes = Number(station.avg_completion_minutes);
    const avgTime = formatAvgTime(avgMinutes);

    const pendingItems = totalItems - completedItems;
    const load =
      totalItems > 0
        ? Math.min(
            100,
            ((pendingItems + completedItems) / Math.max(1, completedItems)) * 50
          )
        : 0;

    return {
      stationId: station.station_id,
      stationName: station.station_name,
      load: Math.round(load),
      completed: Math.round(completionRate),
      avgTime,
      totalItems,
      completedItems,
      pendingItems,
    };
  });
}

function calculateKitchenHealth(
  healthMetrics: Awaited<ReturnType<typeof fetchKitchenHealthMetrics>>
): KitchenHealthData {
  const prepListsData = healthMetrics.prepListsSync[0] || {
    total: "0",
    completed: "0",
  };
  const totalPrepLists = Number(prepListsData.total);
  const completedPrepLists = Number(prepListsData.completed);
  const prepListsSyncRate =
    totalPrepLists > 0 ? (completedPrepLists / totalPrepLists) * 100 : 100;

  const avgCompletionMinutes = Number(
    healthMetrics.timeToCompletion[0]?.avg_minutes || 0
  );
  const avgCompletionTime = formatAvgTime(avgCompletionMinutes);

  return {
    prepListsSync: {
      rate: Math.round(prepListsSyncRate),
      total: totalPrepLists,
      completed: completedPrepLists,
    },
    allergenWarnings: healthMetrics.allergenWarnings || 0,
    wasteAlerts: healthMetrics.wasteAlerts || 0,
    timeToCompletion: avgCompletionTime,
    avgMinutes: avgCompletionMinutes,
  };
}

function processStationTrends(stationTrends: StationTrend[]): TrendData[] {
  const trendsByDate: Record<
    string,
    Record<string, { total: number; completed: number }>
  > = {};

  for (const trend of stationTrends) {
    const date = trend.date;
    const station = trend.station_name;
    const total = Number(trend.total);
    const completed = Number(trend.completed);

    if (!trendsByDate[date]) {
      trendsByDate[date] = {};
    }
    if (!trendsByDate[date][station]) {
      trendsByDate[date][station] = { total: 0, completed: 0 };
    }
    trendsByDate[date][station].total += total;
    trendsByDate[date][station].completed += completed;
  }

  return Object.entries(trendsByDate).map(([date, stations]) => ({
    date,
    stations: Object.entries(stations).map(([stationName, data]) => ({
      stationName,
      total: data.total,
      completed: data.completed,
      completionRate:
        data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    })),
  }));
}

function processTopPerformers(
  topPerformers: TopPerformer[]
): TopPerformerData[] {
  return topPerformers.map((perf) => ({
    employeeId: perf.employee_id,
    firstName: perf.first_name,
    lastName: perf.last_name,
    completedTasks: Number(perf.completed_tasks),
    avgMinutes: Number(perf.avg_minutes),
  }));
}

/**
 * GET /api/analytics/kitchen
 * Get kitchen performance analytics including station throughput and kitchen health metrics
 */
export async function GET(request: Request) {
  const { orgId } = await auth();

  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "30d";
  const locationId = searchParams.get("locationId");

  const dateRange = calculateDateRange(period);

  try {
    const [stationMetrics, kitchenHealthMetrics, stationTrends, topPerformers] =
      await Promise.all([
        fetchStationMetrics(tenantId, dateRange.startDate, locationId),
        fetchKitchenHealthMetrics(tenantId, dateRange.startDate, locationId),
        fetchStationTrends(tenantId, dateRange.startDate, locationId),
        fetchTopPerformers(tenantId, dateRange.startDate, locationId),
      ]);

    const stationThroughput = calculateStationThroughput(stationMetrics);
    const kitchenHealth = calculateKitchenHealth(kitchenHealthMetrics);
    const trends = processStationTrends(stationTrends);
    const processedTopPerformers = processTopPerformers(topPerformers);

    return NextResponse.json({
      summary: {
        period,
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.now.toISOString(),
        locationId: locationId || null,
      },
      stationThroughput,
      kitchenHealth,
      trends,
      topPerformers: processedTopPerformers,
    });
  } catch (error) {
    console.error("Error fetching kitchen analytics:", error);
    return NextResponse.json(
      { message: "Failed to fetch kitchen analytics" },
      { status: 500 }
    );
  }
}
