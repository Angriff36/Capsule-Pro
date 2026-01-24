/**
 * Stock Adjustment API Endpoint
 *
 * POST   /api/inventory/stock-levels/adjust      - Create a manual stock adjustment
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { getTenantIdForOrg } from "@/app/lib/tenant";
import type { CreateAdjustmentResponse } from "../types";
import { validateCreateAdjustmentRequest } from "../validation";

/**
 * POST /api/inventory/stock-levels/adjust - Create a manual stock adjustment
 */
export async function POST(request: Request) {
  try {
    const { orgId, userId } = await auth();
    if (!(orgId && userId)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getTenantIdForOrg(orgId);
    if (!tenantId) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    validateCreateAdjustmentRequest(body);

    const {
      inventoryItemId,
      storageLocationId,
      quantity,
      adjustmentType,
      reason,
      notes,
      referenceId,
    } = body;

    // Verify the inventory item exists
    const item = await database.inventoryItem.findUnique({
      where: {
        tenantId_id: {
          tenantId,
          id: inventoryItemId,
        },
        deletedAt: null,
      },
    });

    if (!item) {
      return NextResponse.json(
        { message: "Inventory item not found" },
        { status: 404 }
      );
    }

    // If location is provided, verify it exists
    if (storageLocationId) {
      const location = await database.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM tenant_inventory.storage_locations
        WHERE tenant_id = ${tenantId}
          AND id = ${storageLocationId}
          AND deleted_at IS NULL
          AND is_active = true
      `;

      if (!location || location.length === 0) {
        return NextResponse.json(
          { message: "Storage location not found" },
          { status: 404 }
        );
      }
    }

    const previousQuantity = Number(item.quantityOnHand);
    const adjustmentAmount =
      adjustmentType === "increase" ? quantity : -quantity;
    const newQuantity = previousQuantity + adjustmentAmount;

    // Validate new quantity is not negative
    if (newQuantity < 0) {
      return NextResponse.json(
        {
          message:
            "Adjustment would result in negative stock. Please provide a reason for negative stock.",
        },
        { status: 400 }
      );
    }

    // Use a transaction to update item and create transaction record
    const result = await database.$transaction(async (tx) => {
      // Update inventory item quantity
      await tx.$executeRawUnsafe(`
        UPDATE tenant_inventory.inventory_items
        SET quantity_on_hand = ${newQuantity},
            updated_at = NOW()
        WHERE tenant_id = '${tenantId}'
          AND id = '${inventoryItemId}'
          AND deleted_at IS NULL
      `);

      // Create inventory transaction record
      const transactionResult = await tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO tenant_inventory.inventory_transactions (
          tenant_id,
          id,
          item_id,
          transaction_type,
          quantity,
          unit_cost,
          storage_location_id,
          reason,
          notes,
          reference,
          employee_id,
          created_at
        )
        VALUES (
          ${tenantId},
          gen_random_uuid(),
          ${inventoryItemId},
          'adjustment',
          ${adjustmentAmount},
          ${item.unitCost},
          ${storageLocationId ?? "00000000-0000-0000-0000-000000000000"},
          ${reason},
          ${notes ?? null},
          ${referenceId ?? null},
          ${userId},
          NOW()
        )
        RETURNING id
      `;

      return {
        transactionId: transactionResult[0]?.id,
        previousQuantity,
        newQuantity,
        adjustmentAmount: Math.abs(adjustmentAmount),
      };
    });

    // Calculate new stock status
    const reorderLevel = Number(item.reorder_level);
    let reorderStatus: "below_par" | "at_par" | "above_par";
    if (newQuantity <= 0) {
      reorderStatus = "below_par";
    } else if (newQuantity <= reorderLevel) {
      reorderStatus = "below_par";
    } else {
      const parLevel = reorderLevel;
      const tolerance = Math.max(parLevel * 0.05, 1);
      const diff = Math.abs(newQuantity - parLevel);
      reorderStatus = diff <= tolerance ? "at_par" : "above_par";
    }

    const parStatus =
      reorderLevel > 0
        ? newQuantity < reorderLevel
          ? "below_par"
          : Math.abs(newQuantity - reorderLevel) <=
              Math.max(reorderLevel * 0.05, 1)
            ? "at_par"
            : "above_par"
        : "no_par_set";

    const response: CreateAdjustmentResponse = {
      success: true,
      message: `Stock ${adjustmentType === "increase" ? "increased" : "decreased"} by ${quantity} ${item.item_number}`,
      adjustment: {
        id: result.transactionId,
        previousQuantity: result.previousQuantity,
        newQuantity: result.newQuantity,
        adjustmentAmount: result.adjustmentAmount,
        transactionId: result.transactionId,
      },
      stockLevel: {
        tenantId: item.tenantId,
        id: item.id,
        inventoryItemId: item.id,
        storageLocationId,
        quantityOnHand: result.newQuantity,
        reorderLevel,
        parLevel: item.reorder_level ? Number(item.reorder_level) : null,
        lastCountedAt: null,
        createdAt: item.createdAt,
        updatedAt: new Date(),
        item: {
          id: item.id,
          itemNumber: item.item_number,
          name: item.name,
          category: item.category,
          unitCost: Number(item.unitCost),
          unit: null,
        },
        storageLocation: storageLocationId
          ? { id: storageLocationId, name: "" }
          : null,
        reorderStatus,
        totalValue: result.newQuantity * Number(item.unitCost),
        parStatus,
        stockOutRisk:
          result.newQuantity <= reorderLevel && result.newQuantity > 0,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    console.error("Failed to create stock adjustment:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
