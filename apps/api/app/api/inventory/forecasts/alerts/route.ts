import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { batchCalculateForecasts } from "@/app/lib/inventory-forecasting";
import { requireTenantId } from "@/app/lib/tenant";

// GET /api/inventory/forecasts/alerts?criticalThreshold={7}&warningThreshold={14}
// Returns: Items forecasted to run out within the threshold days
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const criticalThresholdParam = searchParams.get("criticalThreshold");
  const warningThresholdParam = searchParams.get("warningThreshold");

  const criticalThreshold = criticalThresholdParam
    ? Number.parseInt(criticalThresholdParam, 10)
    : 7;
  const warningThreshold = warningThresholdParam
    ? Number.parseInt(warningThresholdParam, 10)
    : 14;

  try {
    const tenantId = await requireTenantId();

    // Get all inventory items for the tenant
    const inventoryItems = await database.inventoryItem.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      select: {
        item_number: true,
        name: true,
        quantityOnHand: true,
      },
    });

    if (inventoryItems.length === 0) {
      return NextResponse.json({ alerts: [] });
    }

    // Get SKUs to forecast
    const skus = inventoryItems.map((item) => item.item_number);

    // Batch calculate forecasts for all items
    const forecasts = await batchCalculateForecasts(
      tenantId,
      skus,
      warningThreshold
    );

    // Build alerts from forecasts
    const alerts: Array<{
      sku: string;
      name: string;
      currentStock: number;
      depletionDate: Date | null;
      daysUntilDepletion: number | null;
      confidence: "high" | "medium" | "low";
      urgency: "critical" | "warning" | "info";
    }> = [];

    for (const [sku, forecast] of forecasts.entries()) {
      // Only include items that will deplete within the warning threshold
      if (
        forecast.daysUntilDepletion !== null &&
        forecast.daysUntilDepletion <= warningThreshold
      ) {
        const item = inventoryItems.find((i) => i.item_number === sku);
        const urgency =
          forecast.daysUntilDepletion <= criticalThreshold
            ? ("critical" as const)
            : ("warning" as const);

        alerts.push({
          sku: forecast.sku,
          name: item?.name || sku,
          currentStock: forecast.currentStock,
          depletionDate: forecast.depletionDate,
          daysUntilDepletion: forecast.daysUntilDepletion,
          confidence: forecast.confidence,
          urgency,
        });
      }
    }

    // Sort by urgency (critical first) and then by days until depletion
    alerts.sort((a, b) => {
      const urgencyOrder = { critical: 0, warning: 1, info: 2 };
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (urgencyDiff !== 0) {
        return urgencyDiff;
      }
      return (a.daysUntilDepletion ?? 999) - (b.daysUntilDepletion ?? 999);
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Failed to fetch forecast alerts:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch forecast alerts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
