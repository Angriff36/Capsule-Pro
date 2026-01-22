import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/inventory/forecasts/batch?skuList=sku1,sku2&from=&to=
// Returns: map of sku -> [ForecastPoint]
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const skuList = searchParams.get("skuList");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!(skuList && from && to)) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  const skus = skuList.split(",");

  try {
    const forecasts = await database.inventoryForecast.findMany({
      where: {
        sku: { in: skus },
        date: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      orderBy: { sku: "asc", date: "asc" },
    });

    // Group by sku
    const grouped = forecasts.reduce(
      (acc, forecast) => {
        if (!acc[forecast.sku]) acc[forecast.sku] = [];
        acc[forecast.sku].push(forecast);
        return acc;
      },
      {} as Record<string, typeof forecasts>
    );

    return NextResponse.json(grouped);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch batch forecasts" },
      { status: 500 }
    );
  }
}
