/**
 * Barcode Lookup API Endpoint
 *
 * GET /api/inventory/barcode-lookup?barcode=<value>
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

interface BarcodeLookupResult {
  barcode: string | null;
  category: string;
  created_at: Date;
  description: string | null;
  fsa_status: string | null;
  id: string;
  item_number: string;
  name: string;
  par_level: number;
  quantity_on_hand: number;
  reorder_level: number;
  supplier_id: string | null;
  tags: string[];
  tenant_id: string;
  unit_cost: number;
  unit_of_measure: string;
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
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
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
        ii.id,
        ii.tenant_id,
        ii.item_number,
        ii.name,
        ii.description,
        ii.category,
        ii.unit_of_measure,
        ii.unit_cost,
        ii.quantity_on_hand,
        ii.par_level,
        ii.reorder_level,
        ii.supplier_id,
        ii.tags,
        ii.fsa_status,
        ccr.barcode,
        ii.created_at,
        ii.updated_at
      FROM tenant_inventory.cycle_count_records ccr
      JOIN tenant_inventory.inventory_items ii ON ii.id = ccr.item_id AND ii.tenant_id = ccr.tenant_id
      WHERE ccr.tenant_id = ${tenantId}
        AND ccr.barcode = ${barcode.trim()}
        AND ccr.deleted_at IS NULL
        AND ii.deleted_at IS NULL
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
    captureException(error);
    log.error("Failed to lookup barcode:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
