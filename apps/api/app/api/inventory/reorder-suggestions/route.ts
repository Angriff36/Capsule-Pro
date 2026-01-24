import { database } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";
import { requireTenantId } from "@/lib/tenant";
import {
  generateReorderSuggestions,
  saveReorderSuggestionToDatabase,
} from "@/lib/inventory-forecasting";

// GET /api/inventory/reorder-suggestions?sku={sku}&leadTimeDays={7}&safetyStockDays={3}
// Returns: Array of ReorderSuggestionResult for the SKU or all low-stock items
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sku = searchParams.get("sku");
  const leadTimeDays = searchParams.get("leadTimeDays")
    ? parseInt(searchParams.get("leadTimeDays")!)
    : undefined;
  const safetyStockDays = searchParams.get("safetyStockDays")
    ? parseInt(searchParams.get("safetyStockDays")!)
    : undefined;

  try {
    const tenantId = await requireTenantId();

    // Try to get existing suggestion from database first
    if (sku) {
      const existingSuggestion = await database.reorderSuggestion.findFirst({
        where: {
          tenantId,
          sku,
        },
        orderBy: { created_at: "desc" },
      });

      if (existingSuggestion && existingSuggestion.created_at > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
        // Return existing suggestion if it's less than 24 hours old
        return NextResponse.json(existingSuggestion);
      }
    }

    // Generate new suggestions using forecasting service
    const suggestions = await generateReorderSuggestions({
      tenantId,
      sku: sku || undefined,
      leadTimeDays: leadTimeDays || 7,
      safetyStockDays: safetyStockDays || 3,
    });

    if (sku && suggestions.length === 0) {
      return NextResponse.json(
        { error: "No reorder suggestion found for this SKU" },
        { status: 404 }
      );
    }

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Failed to fetch reorder suggestions:", error);
    return NextResponse.json(
      { error: "Failed to fetch reorder suggestions", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/inventory/reorder-suggestions
// Body: {sku?: string, leadTimeDays?: number, safetyStockDays?: number, save?: boolean}
// Action: Generate and optionally save reorder suggestions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tenantId = await requireTenantId();

    // Generate reorder suggestions
    const suggestions = await generateReorderSuggestions({
      tenantId,
      sku: body.sku,
      leadTimeDays: body.leadTimeDays || 7,
      safetyStockDays: body.safetyStockDays || 3,
    });

    // Optionally save to database
    if (body.save === true) {
      for (const suggestion of suggestions) {
        await saveReorderSuggestionToDatabase(tenantId, suggestion);
      }
    }

    return NextResponse.json({
      success: true,
      count: suggestions.length,
      suggestions,
    });
  } catch (error) {
    console.error("Failed to process reorder suggestions:", error);
    return NextResponse.json(
      { error: "Failed to process reorder suggestions", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
