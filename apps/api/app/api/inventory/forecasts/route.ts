import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/inventory/forecasts?sku={sku}&from={date}&to={date}
// Returns: array of ForecastPoint for the SKU and window
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sku = searchParams.get("sku");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!(sku && from && to)) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    // TODO: Call forecasting service or read from DB
    const forecasts = await database.inventoryForecast.findMany({
      where: {
        sku,
        date: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json(forecasts);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch forecasts" },
      { status: 500 }
    );
  }
}
