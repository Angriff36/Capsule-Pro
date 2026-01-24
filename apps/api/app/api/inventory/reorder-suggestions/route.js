Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const database_1 = require("@repo/database");
const server_1 = require("next/server");
// GET /api/inventory/reorder-suggestions?sku={sku}
// Returns: ReorderSuggestion for the SKU
async function GET(request) {
  const { searchParams } = new URL(request.url);
  const sku = searchParams.get("sku");
  if (!sku) {
    return server_1.NextResponse.json(
      { error: "Missing sku parameter" },
      { status: 400 }
    );
  }
  try {
    const suggestion = await database_1.database.reorderSuggestion.findFirst({
      where: { sku },
      orderBy: { created_at: "desc" },
    });
    if (!suggestion) {
      return server_1.NextResponse.json(
        { error: "No reorder suggestion found" },
        { status: 404 }
      );
    }
    return server_1.NextResponse.json(suggestion);
  } catch (error) {
    return server_1.NextResponse.json(
      { error: "Failed to fetch reorder suggestion" },
      { status: 500 }
    );
  }
}
// POST /api/inventory/reorder-suggestions
// Body: array of {sku, quantity, reason}
// Action: enqueue reorder requests to suppliers; idempotent
async function POST(request) {
  try {
    const body = await request.json();
    // TODO: Implement reorder logic, queue to suppliers
    return server_1.NextResponse.json({ success: true });
  } catch (error) {
    return server_1.NextResponse.json(
      { error: "Failed to process reorder" },
      { status: 500 }
    );
  }
}
