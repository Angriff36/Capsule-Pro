Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const database_1 = require("@repo/database");
const server_1 = require("next/server");
// GET /api/inventory/forecasts/batch?skuList=sku1,sku2&from=&to=
// Returns: map of sku -> [ForecastPoint]
async function GET(request) {
  const { searchParams } = new URL(request.url);
  const skuList = searchParams.get("skuList");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!(skuList && from && to)) {
    return server_1.NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }
  const skus = skuList.split(",");
  try {
    const forecasts = await database_1.database.inventoryForecast.findMany({
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
    const grouped = forecasts.reduce((acc, forecast) => {
      if (!acc[forecast.sku]) acc[forecast.sku] = [];
      acc[forecast.sku].push(forecast);
      return acc;
    }, {});
    return server_1.NextResponse.json(grouped);
  } catch (error) {
    return server_1.NextResponse.json(
      { error: "Failed to fetch batch forecasts" },
      { status: 500 }
    );
  }
}
