/**
 * Barcode Lookup API Endpoint
 *
 * GET /api/inventory/barcode-lookup?barcode=<value>
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface BarcodeLookupResult {
  id: string;
  tenant_id: string;
  item_number: string;
  name: string;
  description: string | null;
  category: string;
  unit_of_measure: string;
  unit_cost: number;
  quantity_on_hand: number;
  par_level: number;
  reorder_level: number;
  supplier_id: string | null;
  tags: string[];
  fsa_status: string | null;
  barcode: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * GET /api/inventory/barcode-lookup - Lookup inventory item by barcode
 */
export async function GET(request: Request) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json({ message: "Tenant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get("barcode");

    if (!barcode || barcode.trim() === "") {
      return NextResponse.json(
        { message: "Barcode query parameter is required" },
        { status: 400 }
      );
    }

    const results = await database.$queryRaw<BarcodeLookupResult[]>`
      SELECT
        id,
        tenant_id,
        item_number,
        name,
        description,
        category,
        unit_of_measure,
        unit_cost,
        quantity_on_hand,
        par_level,
        reorder_level,
        supplier_id,
        tags,
        fsa_status,
        barcode,
        created_at,
        updated_at
      FROM tenant_inventory.inventory_items
      WHERE tenant_id = ${tenantId}
        AND barcode = ${barcode.trim()}
        AND deleted_at IS NULL
      LIMIT 1
    `;

    if (results.length === 0) {
      return NextResponse.json(
        { message: "No item found with this barcode" },
        { status: 404 }
      );
    }

    const item = results[0];
    const quantityOnHand = Number(item.quantity_on_hand);
    const reorderLevel = Number(item.reorder_level);

    let stock_status: "in_stock" | "low_stock" | "out_of_stock";
    if (quantityOnHand <= 0) {
      stock_status = "out_of_stock";
    } else if (quantityOnHand <= reorderLevel) {
      stock_status = "low_stock";
    } else {
      stock_status = "in_stock";
    }

    return NextResponse.json({
      data: {
        id: item.id,
        tenant_id: item.tenant_id,
        item_number: item.item_number,
        name: item.name,
        description: item.description,
        category: item.category,
        unit_of_measure: item.unit_of_measure,
        unit_cost: Number(item.unit_cost),
        quantity_on_hand: quantityOnHand,
        par_level: Number(item.par_level),
        reorder_level: reorderLevel,
        supplier_id: item.supplier_id,
        tags: item.tags ?? [],
        fsa_status: item.fsa_status ?? "unknown",
        barcode: item.barcode,
        created_at: item.created_at,
        updated_at: item.updated_at,
        stock_status,
        total_value: quantityOnHand * Number(item.unit_cost),
      },
    });
  } catch (error) {
    console.error("Failed to lookup barcode:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
