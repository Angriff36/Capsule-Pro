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

async function verifyInventoryItemExists(
  tenantId: string,
  inventoryItemId: string
) {
  const item = await database.inventoryItem.findUnique({
    where: {
      tenantId_id: {
        tenantId,
        id: inventoryItemId,
      },
      deletedAt: null,
    },
  });
  return item;
}

async function verifyStorageLocationExists(
  tenantId: string,
  storageLocationId: string
): Promise<boolean> {
  const location = await database.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM tenant_inventory.storage_locations
    WHERE tenant_id = ${tenantId}
      AND id = ${storageLocationId}
      AND deleted_at IS NULL
      AND is_active = true
  `;
  return !!(location && location.length > 0);
}

function calculateNewQuantity(
  previousQuantity: number,
  quantity: number,
  adjustmentType: string
): { newQuantity: number; adjustmentAmount: number } {
  const adjustmentAmount = adjustmentType === "increase" ? quantity : -quantity;
  return {
    newQuantity: previousQuantity + adjustmentAmount,
    adjustmentAmount,
  };
}

async function executeStockAdjustmentTransaction(
  tenantId: string,
  inventoryItemId: string,
  newQuantity: number,
  adjustmentAmount: number,
  storageLocationId: string | undefined,
  reason: string,
  notes: string | undefined,
  referenceId: string | undefined,
  userId: string,
  itemUnitCost: number,
  previousQuantity: number
) {
  return await database.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE tenant_inventory.inventory_items
      SET quantity_on_hand = ${newQuantity},
          updated_at = NOW()
      WHERE tenant_id = ${tenantId}
        AND id = ${inventoryItemId}
        AND deleted_at IS NULL
    `;

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
        ${itemUnitCost},
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
}

function calculateReorderStatus(
  newQuantity: number,
  reorderLevel: number
): "below_par" | "at_par" | "above_par" {
  if (newQuantity <= 0 || newQuantity <= reorderLevel) {
    return "below_par";
  }
  const parLevel = reorderLevel;
  const tolerance = Math.max(parLevel * 0.05, 1);
  const diff = Math.abs(newQuantity - parLevel);
  return diff <= tolerance ? "at_par" : "above_par";
}

function calculateParStatus(
  newQuantity: number,
  reorderLevel: number
): "below_par" | "at_par" | "above_par" | "no_par_set" {
  if (reorderLevel <= 0) {
    return "no_par_set";
  }
  if (newQuantity < reorderLevel) {
    return "below_par";
  }
  const tolerance = Math.max(reorderLevel * 0.05, 1);
  return Math.abs(newQuantity - reorderLevel) <= tolerance
    ? "at_par"
    : "above_par";
}

function buildAdjustmentResponse(
  item: {
    tenantId: string;
    id: string;
    item_number: string;
    name: string;
    category: string;
    unitCost: { toNumber: () => number } | number;
    reorder_level: { toNumber: () => number } | number | null;
    createdAt: Date;
  },
  result: {
    transactionId: string;
    previousQuantity: number;
    newQuantity: number;
    adjustmentAmount: number;
  },
  storageLocationId: string | undefined | null,
  quantity: number,
  adjustmentType: string,
  reorderLevel: number,
  reorderStatus: "below_par" | "at_par" | "above_par",
  parStatus: "below_par" | "at_par" | "above_par" | "no_par_set"
): CreateAdjustmentResponse {
  const toNum = (val: { toNumber?: () => number } | number | null): number => {
    if (val === null) {
      return 0;
    }
    if (typeof val === "number") {
      return val;
    }
    if (val && typeof val === "object" && "toNumber" in val && val.toNumber) {
      return val.toNumber();
    }
    return Number(val);
  };

  const unitCost = toNum(item.unitCost);
  const parLevel = toNum(item.reorder_level);

  return {
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
      storageLocationId: storageLocationId ?? null,
      quantityOnHand: result.newQuantity,
      reorderLevel,
      parLevel: parLevel > 0 ? parLevel : null,
      lastCountedAt: null,
      createdAt: item.createdAt,
      updatedAt: new Date(),
      item: {
        id: item.id,
        itemNumber: item.item_number,
        name: item.name,
        category: item.category,
        unitCost,
        unit: null,
      },
      storageLocation: storageLocationId
        ? { id: storageLocationId, name: "" }
        : null,
      reorderStatus,
      totalValue: result.newQuantity * unitCost,
      parStatus,
      stockOutRisk:
        result.newQuantity <= reorderLevel && result.newQuantity > 0,
    },
  };
}

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

    const item = await verifyInventoryItemExists(tenantId, inventoryItemId);

    if (!item) {
      return NextResponse.json(
        { message: "Inventory item not found" },
        { status: 404 }
      );
    }

    if (storageLocationId) {
      const locationExists = await verifyStorageLocationExists(
        tenantId,
        storageLocationId
      );
      if (!locationExists) {
        return NextResponse.json(
          { message: "Storage location not found" },
          { status: 404 }
        );
      }
    }

    const previousQuantity = Number(item.quantityOnHand);
    const { newQuantity, adjustmentAmount } = calculateNewQuantity(
      previousQuantity,
      quantity,
      adjustmentType
    );

    if (newQuantity < 0) {
      return NextResponse.json(
        {
          message:
            "Adjustment would result in negative stock. Please provide a reason for negative stock.",
        },
        { status: 400 }
      );
    }

    const result = await executeStockAdjustmentTransaction(
      tenantId,
      inventoryItemId,
      newQuantity,
      adjustmentAmount,
      storageLocationId ?? undefined,
      reason,
      notes,
      referenceId,
      userId,
      Number(item.unitCost),
      previousQuantity
    );

    const reorderLevel = Number(item.reorder_level);
    const reorderStatus = calculateReorderStatus(newQuantity, reorderLevel);
    const parStatus = calculateParStatus(newQuantity, reorderLevel);

    const response = buildAdjustmentResponse(
      item,
      result,
      storageLocationId,
      quantity,
      adjustmentType,
      reorderLevel,
      reorderStatus,
      parStatus
    );

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
