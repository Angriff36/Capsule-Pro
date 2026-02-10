import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import { type NextRequest, NextResponse } from "next/server";
import {
  analyzeWastedItems,
  analyzeWasteReasons,
  calculatePeriodTotals,
  calculateReductionOpportunities,
  calculateStartDate,
  fetchWasteEntries,
  groupWasteEntriesByPeriod,
  validateQueryParams,
} from "./helpers";

/**
 * GET /api/kitchen/waste/trends
 * View waste trends over time with analytics
 */
export async function GET(request: NextRequest) {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const tenantId = await getTenantIdForOrg(orgId);
  const { searchParams } = request.nextUrl;

  // Validate and extract query parameters
  const { period, groupBy, locationId, inventoryItemId } =
    validateQueryParams(searchParams);

  // Calculate date range based on period
  const startDate = calculateStartDate(period);
  const now = new Date();

  // Get waste entries for the period
  const entries = await fetchWasteEntries(
    tenantId,
    startDate,
    locationId,
    inventoryItemId
  );

  // Group data by time period
  const trends = groupWasteEntriesByPeriod(
    entries as unknown as Array<{
      loggedAt: Date;
      totalCost: { toNumber: () => number } | null;
      quantity: { toNumber: () => number };
      inventoryItem: { name: string };
    }>,
    groupBy
  );

  // Calculate period totals
  const periodTotals = calculatePeriodTotals(trends);

  // Analyze waste reasons
  const { topReasons, reasonCounts } = await analyzeWasteReasons(
    entries as unknown as Array<{
      reasonId: number;
      totalCost: { toNumber: () => number } | null;
    }>
  );

  // Analyze wasted items
  const topItems = analyzeWastedItems(
    entries as unknown as Array<{
      totalCost: { toNumber: () => number } | null;
      inventoryItem: { name: string };
    }>
  );

  // Calculate reduction opportunities
  const reductionOpportunities = await calculateReductionOpportunities(
    topItems,
    reasonCounts,
    periodTotals.totalCost
  );

  return NextResponse.json({
    trends: {
      summary: {
        totalCost: periodTotals.totalCost,
        totalQuantity: periodTotals.totalQuantity,
        totalEntries: periodTotals.totalEntries,
        avgCostPerEntry: periodTotals.avgCostPerEntry,
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
