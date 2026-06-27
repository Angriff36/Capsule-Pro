/**
 * Individual Inventory Item API Endpoints
 *
 * GET    /api/inventory/items/[id]      - Get a single inventory item
 * PUT    /api/inventory/items/[id]      - Update an inventory item (Manifest runtime)
 * DELETE /api/inventory/items/[id]      - Delete an inventory item (Manifest softDelete)
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { recalculateRecipeCostsForInventoryItem } from "@/app/lib/recipe-costing";
import { getTenantIdForOrg, resolveCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import type { FSAStatus, InventoryItemWithStatus } from "../types";
import { validateUpdateInventoryItemRequest } from "../validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * Calculate stock status based on quantity and reorder level
 */
function calculateStockStatus(
  quantityOnHand: number,
  reorderLevel: number
): "in_stock" | "low_stock" | "out_of_stock" {
  if (quantityOnHand <= 0) {
    return "out_of_stock";
  }
  if (quantityOnHand <= reorderLevel) {
    return "low_stock";
  }
  return "in_stock";
}

/**
 * Build inventory item response with status
 */
function buildItemResponse(
  item: {
    id: string;
    tenantId: string;
    item_number: string;
    name: string;
    description: string | null;
    category: string;
    unitOfMeasure: string;
    unitCost: { toString: () => string };
    quantityOnHand: { toNumber: () => number };
    parLevel: { toNumber: () => number };
    reorder_level: { toNumber: () => number };
    supplierId: string | null;
    tags: string[];
    fsa_status: string | null;
    fsa_temp_logged: boolean | null;
    fsa_allergen_info: boolean | null;
    fsa_traceable: boolean | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  },
  stockStatus: "in_stock" | "low_stock" | "out_of_stock"
): InventoryItemWithStatus {
  const quantityOnHand = Number(item.quantityOnHand);
  const unitCost = Number(item.unitCost);

  return {
    id: item.id,
    tenant_id: item.tenantId,
    item_number: item.item_number,
    name: item.name,
    description: item.description,
    category: item.category,
    unit_of_measure: item.unitOfMeasure,
    unit_cost: unitCost,
    quantity_on_hand: quantityOnHand,
    par_level: Number(item.parLevel),
    reorder_level: Number(item.reorder_level),
    supplier_id: item.supplierId,
    tags: item.tags,
    fsa_status: (item.fsa_status ?? "unknown") as FSAStatus,
    fsa_temp_logged: item.fsa_temp_logged ?? false,
    fsa_allergen_info: item.fsa_allergen_info ?? false,
    fsa_traceable: item.fsa_traceable ?? false,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    deleted_at: item.deletedAt,
    stock_status: stockStatus,
    total_value: quantityOnHand * unitCost,
  };
}

/**
 * Check if item number already exists for a different item
 */
async function checkDuplicateItemNumber(
  tenantId: string,
  itemId: string,
  itemNumber: string
): Promise<boolean> {
  const duplicate = await database.inventoryItem.findFirst({
    where: {
      tenantId,
      item_number: itemNumber,
      deletedAt: null,
    },
  });
  return duplicate !== null && duplicate.id !== itemId;
}

/**
 * Handle recipe cost recalculation if unit cost changed
 */
async function handleRecipeCostRecalculation(
  tenantId: string,
  itemId: string,
  itemName: string,
  unitCostChanged: boolean
): Promise<{ updatedRecipes: number; updatedIngredients: number } | null> {
  if (!unitCostChanged) {
    return null;
  }

  try {
    return await recalculateRecipeCostsForInventoryItem(
      tenantId,
      itemId,
      itemName
    );
  } catch (error) {
    log.error("Failed to recalculate recipe costs", { error });
    return null;
  }
}

/**
 * GET /api/inventory/items/[id] - Get a single inventory item
 */
export async function GET(_request: Request, context: RouteContext) {
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

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { message: "Item ID is required" },
        { status: 400 }
      );
    }

    const item = await database.inventoryItem.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!item) {
      return NextResponse.json(
        { message: "Inventory item not found" },
        { status: 404 }
      );
    }

    const quantityOnHand = Number(item.quantityOnHand);
    const reorderLevel = Number(item.reorder_level);
    const stockStatus = calculateStockStatus(quantityOnHand, reorderLevel);

    return NextResponse.json(buildItemResponse(item, stockStatus));
  } catch (error) {
    captureException(error);
    log.error("Failed to get inventory item", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/inventory/items/[id] - Update an inventory item via Manifest runtime.
 *
 * The Manifest `update` command takes all fields (not a partial patch), so this
 * handler reads the current state, merges incoming changes on top, maps API
 * snake_case to manifest camelCase, and delegates to runManifestCommand.
 * Recipe cost recalculation runs as a post-command side effect.
 */
export async function PUT(request: Request, context: RouteContext) {
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

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { message: "Item ID is required" },
        { status: 400 }
      );
    }

    const existing = await database.inventoryItem.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Inventory item not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    validateUpdateInventoryItemRequest(body);

    if (
      body.item_number &&
      body.item_number !== existing.item_number &&
      (await checkDuplicateItemNumber(tenantId, id, body.item_number))
    ) {
      return NextResponse.json(
        { message: "Item number already exists" },
        { status: 409 }
      );
    }

    // Track if unit_cost is being updated for recipe cost recalculation
    const unitCostChanged =
      body.unit_cost !== undefined &&
      Number(body.unit_cost) !== Number(existing.unitCost);

    // Merge current values with incoming changes and map to manifest camelCase
    const mergedBody: Record<string, unknown> = {
      id,
      name: body.name ?? existing.name,
      description: body.description ?? existing.description ?? "",
      category: body.category ?? existing.category,
      unitOfMeasure: body.unit_of_measure ?? existing.unitOfMeasure,
      unitCost: body.unit_cost ?? Number(existing.unitCost),
      quantityOnHand: body.quantity_on_hand ?? Number(existing.quantityOnHand),
      parLevel: body.par_level ?? Number(existing.parLevel),
      reorder_level: body.reorder_level ?? Number(existing.reorder_level),
      supplierId: body.supplier_id ?? existing.supplierId ?? "",
      tags: body.tags ?? existing.tags ?? "",
      fsa_status: body.fsa_status ?? existing.fsa_status ?? "unknown",
      fsa_temp_logged:
        body.fsa_temp_logged ?? existing.fsa_temp_logged ?? false,
      fsa_allergen_info:
        body.fsa_allergen_info ?? existing.fsa_allergen_info ?? false,
      fsa_traceable: body.fsa_traceable ?? existing.fsa_traceable ?? false,
    };

    const user = await resolveCurrentUser(request);
    const manifestResult = await runManifestCommand({
      entity: "InventoryItem",
      command: "update",
      body: mergedBody,
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    // If the manifest command failed, return its error response directly
    if (manifestResult.status >= 400) {
      return manifestResult;
    }

    // Read back the updated item for the response shape + side effects
    const updatedItem = await database.inventoryItem.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!updatedItem) {
      return NextResponse.json(
        { message: "Inventory item not found after update" },
        { status: 404 }
      );
    }

    // Trigger recipe cost recalculation if unit_cost changed
    const recipeCostUpdate = await handleRecipeCostRecalculation(
      tenantId,
      id,
      updatedItem.name,
      unitCostChanged
    );

    const quantityOnHand = Number(updatedItem.quantityOnHand);
    const reorderLevel = Number(updatedItem.reorder_level);
    const stockStatus = calculateStockStatus(quantityOnHand, reorderLevel);

    const response = buildItemResponse(updatedItem, stockStatus);

    // Include recipe update info in response if costs were recalculated
    if (recipeCostUpdate && recipeCostUpdate.updatedRecipes > 0) {
      return NextResponse.json({
        ...response,
        _recipeCostUpdate: {
          updatedRecipes: recipeCostUpdate.updatedRecipes,
          updatedIngredients: recipeCostUpdate.updatedIngredients,
        },
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    captureException(error);
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    log.error("Failed to update inventory item", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/items/[id] - Soft delete an inventory item via Manifest runtime.
 *
 * Pre-validates 7 dependency tables before delegating to the Manifest softDelete
 * command (per constitution §10 — reads bypass Manifest).
 */
export async function DELETE(request: Request, context: RouteContext) {
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

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { message: "Item ID is required" },
        { status: 400 }
      );
    }

    // Verify item exists and belongs to tenant
    const existing = await database.inventoryItem.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Inventory item not found" },
        { status: 404 }
      );
    }

    // Check for dependencies before deletion (pre-validation reads per §10)
    // An item cannot be deleted if it has dependencies in:
    // - WasteEntry (waste_entries table via inventory_item_id)
    // - ShipmentItem (shipment_items table via item_id)
    // - InventoryStock (inventory_stock table via item_id)
    // - InventoryTransaction (inventory_transactions table via item_id)
    // - InventoryAlert (inventory_alerts table via item_id)
    // - CycleCountRecord (cycle_count_records table via item_id)
    // - PurchaseOrderItem (purchase_order_items table via item_id)

    const dependencies: string[] = [];

    // Check for waste entries
    const wasteEntryCount = await database.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "tenant_kitchen".waste_entries
      WHERE tenant_id = ${tenantId}
        AND inventory_item_id = ${id}
        AND deleted_at IS NULL
    `;
    if ((wasteEntryCount[0]?.count ?? 0n) > 0) {
      dependencies.push("waste entries");
    }

    // Check for shipment items
    const shipmentItemCount = await database.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "tenant_inventory".shipment_items
      WHERE tenant_id = ${tenantId}
        AND item_id = ${id}
    `;
    if ((shipmentItemCount[0]?.count ?? 0n) > 0) {
      dependencies.push("shipment items");
    }

    // Check for inventory stock records
    const inventoryStockCount = await database.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "tenant_inventory".inventory_stock
      WHERE tenant_id = ${tenantId}
        AND item_id = ${id}
    `;
    if ((inventoryStockCount[0]?.count ?? 0n) > 0) {
      dependencies.push("inventory stock records");
    }

    // Check for inventory transactions
    const inventoryTransactionCount = await database.$queryRaw<
      { count: bigint }[]
    >`
      SELECT COUNT(*) as count
      FROM "tenant_inventory".inventory_transactions
      WHERE tenant_id = ${tenantId}
        AND item_id = ${id}
    `;
    if ((inventoryTransactionCount[0]?.count ?? 0n) > 0) {
      dependencies.push("inventory transactions");
    }

    // Check for inventory alerts
    const inventoryAlertCount = await database.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "tenant_inventory".inventory_alerts
      WHERE tenant_id = ${tenantId}
        AND item_id = ${id}
        AND deleted_at IS NULL
    `;
    if ((inventoryAlertCount[0]?.count ?? 0n) > 0) {
      dependencies.push("inventory alerts");
    }

    // Check for cycle count records
    const cycleCountRecordCount = await database.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "tenant_inventory".cycle_count_records
      WHERE tenant_id = ${tenantId}
        AND item_id = ${id}
    `;
    if ((cycleCountRecordCount[0]?.count ?? 0n) > 0) {
      dependencies.push("cycle count records");
    }

    // Check for purchase order items
    const purchaseOrderItemCount = await database.$queryRaw<
      { count: bigint }[]
    >`
      SELECT COUNT(*) as count
      FROM "tenant_inventory".purchase_order_items
      WHERE tenant_id = ${tenantId}
        AND item_id = ${id}
        AND deleted_at IS NULL
    `;
    if ((purchaseOrderItemCount[0]?.count ?? 0n) > 0) {
      dependencies.push("purchase order items");
    }

    // If there are any dependencies, return an error
    if (dependencies.length > 0) {
      const dependencyList = dependencies.join(", ");
      return NextResponse.json(
        {
          message: `Cannot delete inventory item. It is referenced by ${dependencyList}. Please remove these references before deleting.`,
          dependencies,
        },
        { status: 409 }
      );
    }

    // Delegate soft-delete to Manifest runtime
    const user = await resolveCurrentUser(request);
    return runManifestCommand({
      entity: "InventoryItem",
      command: "softDelete",
      body: { id },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });
  } catch (error) {
    captureException(error);
    log.error("Failed to delete inventory item", { error });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
