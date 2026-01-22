import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";

// GET /api/inventory/reorder-suggestions?sku={sku}
// Returns: ReorderSuggestion for the SKU
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sku = searchParams.get("sku");

  if (!sku) {
    return NextResponse.json(
      { error: "Missing sku parameter" },
      { status: 400 }
    );
  }

  try {
    const suggestion = await database.reorderSuggestion.findFirst({
      where: { sku },
      orderBy: { created_at: "desc" },
    });

    if (!suggestion) {
      return NextResponse.json(
        { error: "No reorder suggestion found" },
        { status: 404 }
      );
    }

    return NextResponse.json(suggestion);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch reorder suggestion" },
      { status: 500 }
    );
  }
}

// POST /api/inventory/reorder-suggestions
// Body: array of {sku, quantity, reason}
// Action: enqueue reorder requests to suppliers; idempotent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // TODO: Implement reorder logic, queue to suppliers
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process reorder" },
      { status: 500 }
    );
  }
}
