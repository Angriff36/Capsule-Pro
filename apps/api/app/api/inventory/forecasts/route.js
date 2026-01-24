Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const database_1 = require("@repo/database");
const server_1 = require("next/server");
// GET /api/inventory/forecasts?sku={sku}&from={date}&to={date}
// Returns: array of ForecastPoint for the SKU and window
async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sku = searchParams.get("sku");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!(sku && from && to)) {
    return server_1.NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }
  try {
    // TODO: Call forecasting service or read from DB
    const forecasts = await database_1.database.inventoryForecast.findMany({
      where: {
        sku,
        date: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      orderBy: { date: "asc" },
    });
    return server_1.NextResponse.json(forecasts);
  } catch (error) {
    return server_1.NextResponse.json(
      { error: "Failed to fetch forecasts" },
      { status: 500 }
    );
  }
}
