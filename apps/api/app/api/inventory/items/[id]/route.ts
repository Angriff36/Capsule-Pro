/**
 * Individual Inventory Item API Endpoints
 *
 * GET    /api/inventory/items/[id]      - Get a single inventory item
 * PUT    /api/inventory/items/[id]      - Update an inventory item
 * DELETE /api/inventory/items/[id]      - Delete an inventory item (soft delete)
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { FSAStatus, InventoryItemWithStatus } from "../types";
import { validateUpdateInventoryItemRequest } from "../validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

    const itemWithStatus: InventoryItemWithStatus = {
      id: item.id,
      tenant_id: item.tenantId,
      item_number: item.item_number,
      name: item.name,
      category: item.category,
      unit_cost: Number(item.unitCost),
      quantity_on_hand: quantityOnHand,
      reorder_level: reorderLevel,
      tags: item.tags,
      fsa_status: (item.fsa_status ?? "unknown") as FSAStatus,
      fsa_temp_logged: item.fsa_temp_logged ?? false,
      fsa_allergen_info: item.fsa_allergen_info ?? false,
      fsa_traceable: item.fsa_traceable ?? false,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
      deleted_at: item.deletedAt,
      stock_status: stockStatus,
      total_value: quantityOnHand * Number(item.unitCost),
    };

    return NextResponse.json(itemWithStatus);
  } catch (error) {
    console.error("Failed to get inventory item:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/inventory/items/[id] - Update an inventory item
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

    const body = await request.json();
    validateUpdateInventoryItemRequest(body);

    // Check if updating to a duplicate item_number
    if (body.item_number && body.item_number !== existing.item_number) {
      const duplicate = await database.inventoryItem.findFirst({
        where: {
          tenantId,
          item_number: body.item_number,
          deletedAt: null,
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { message: "Item number already exists" },
          { status: 409 }
        );
      }
    }

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      updateData.name = body.name;
    }
    if (body.category !== undefined) {
      updateData.category = body.category;
    }
    if (body.unit_cost !== undefined) {
      updateData.unitCost = body.unit_cost;
    }
    if (body.quantity_on_hand !== undefined) {
      updateData.quantityOnHand = body.quantity_on_hand;
    }
    if (body.reorder_level !== undefined) {
      updateData.reorder_level = body.reorder_level;
    }
    if (body.tags !== undefined) {
      updateData.tags = body.tags;
    }
    if (body.fsa_status !== undefined) {
      updateData.fsa_status = body.fsa_status;
    }
    if (body.fsa_temp_logged !== undefined) {
      updateData.fsa_temp_logged = body.fsa_temp_logged;
    }
    if (body.fsa_allergen_info !== undefined) {
      updateData.fsa_allergen_info = body.fsa_allergen_info;
    }
    if (body.fsa_traceable !== undefined) {
      updateData.fsa_traceable = body.fsa_traceable;
    }

    // Update inventory item using raw SQL for composite key
    await database.$executeRaw`
      UPDATE "tenant_inventory".inventory_items
      SET
        name = COALESCE(${body.name}, name),
        category = COALESCE(${body.category}, category),
        unit_cost = COALESCE(${body.unit_cost?.toString() || null}, unit_cost::text)::decimal(10,2),
        quantity_on_hand = COALESCE(${body.quantity_on_hand?.toString() || null}, quantity_on_hand::text)::decimal(12,3),
        reorder_level = COALESCE(${body.reorder_level?.toString() || null}, reorder_level::text)::decimal(12,3),
        tags = COALESCE(${body.tags ? JSON.stringify(body.tags) : null}, tags::jsonb),
        fsa_status = COALESCE(${body.fsa_status}, fsa_status),
        fsa_temp_logged = COALESCE(${body.fsa_temp_logged}, fsa_temp_logged),
        fsa_allergen_info = COALESCE(${body.fsa_allergen_info}, fsa_allergen_info),
        fsa_traceable = COALESCE(${body.fsa_traceable}, fsa_traceable),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId} AND deleted_at IS NULL
    `;

    // Fetch the updated item
    const updatedItem = await database.inventoryItem.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!updatedItem) {
      return NextResponse.json(
        { message: "Inventory item not found" },
        { status: 404 }
      );
    }

    const quantityOnHand = Number(updatedItem.quantityOnHand);
    const reorderLevel = Number(updatedItem.reorder_level);
    const stockStatus = calculateStockStatus(quantityOnHand, reorderLevel);

    const itemWithStatus: InventoryItemWithStatus = {
      id: updatedItem.id,
      tenant_id: updatedItem.tenantId,
      item_number: updatedItem.item_number,
      name: updatedItem.name,
      category: updatedItem.category,
      unit_cost: Number(updatedItem.unitCost),
      quantity_on_hand: quantityOnHand,
      reorder_level: reorderLevel,
      tags: updatedItem.tags,
      fsa_status: (updatedItem.fsa_status ?? "unknown") as FSAStatus,
      fsa_temp_logged: updatedItem.fsa_temp_logged ?? false,
      fsa_allergen_info: updatedItem.fsa_allergen_info ?? false,
      fsa_traceable: updatedItem.fsa_traceable ?? false,
      created_at: updatedItem.createdAt,
      updated_at: updatedItem.updatedAt,
      deleted_at: updatedItem.deletedAt,
      stock_status: stockStatus,
      total_value: quantityOnHand * Number(updatedItem.unitCost),
    };

    return NextResponse.json(itemWithStatus);
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to update inventory item:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/items/[id] - Soft delete an inventory item
 */
export async function DELETE(_request: Request, context: RouteContext) {
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

    // Check for dependencies before deletion
    // TODO: Add checks for recipe_ingredients, inventory_stock, etc.

    // Soft delete the item using raw SQL for composite key
    await database.$executeRaw`
      UPDATE "tenant_inventory".inventory_items
      SET deleted_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId} AND deleted_at IS NULL
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete inventory item:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
