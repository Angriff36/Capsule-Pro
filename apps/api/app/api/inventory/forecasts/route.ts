import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import {
  calculateDepletionForecast,
  saveForecastToDatabase,
} from "@/app/lib/inventory-forecasting";
import { requireTenantId } from "@/app/lib/tenant";

// GET /api/inventory/forecasts?sku={sku}&from={date}&to={date}&horizon={days}&save={true|false}
// Returns: ForecastResult for the SKU with optional date range filter or new calculation
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sku = searchParams.get("sku");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!sku) {
    return NextResponse.json(
      { error: "Missing required parameter: sku" },
      { status: 400 }
    );
  }

  try {
    const tenantId = await requireTenantId();

    // If date range provided, read from database
    if (from && to) {
      const forecasts = await database.inventoryForecast.findMany({
        where: {
          tenantId,
          sku,
          date: {
            gte: new Date(from),
            lte: new Date(to),
          },
        },
        orderBy: { date: "asc" },
      });

      return NextResponse.json(forecasts);
    }

    // If no date range, calculate new forecast using the forecasting service
    const horizonDays = searchParams.get("horizon")
      ? Number.parseInt(searchParams.get("horizon")!)
      : 30;

    const forecast = await calculateDepletionForecast({
      tenantId,
      sku,
      horizonDays,
    });

    // Optionally save to database
    const save = searchParams.get("save") === "true";
    if (save) {
      await saveForecastToDatabase(tenantId, forecast);
    }

    return NextResponse.json(forecast);
  } catch (error) {
    console.error("Failed to fetch forecasts:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch forecasts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
