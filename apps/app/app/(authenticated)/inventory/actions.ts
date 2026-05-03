"use server";

import { type InventoryItem, tenantDatabase } from "@repo/database";
import { revalidatePath } from "next/cache";
import { requireTenantId } from "@/app/lib/tenant";

// ============================================================================
// Helper Functions
// ============================================================================

const getString = (formData: FormData, key: string): string | undefined => {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getOptionalString = (
  formData: FormData,
  key: string
): string | null | undefined => {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getDecimal = (formData: FormData, key: string): number | undefined => {
  const value = getString(formData, key);
  if (!value) {
    return;
  }
  const num = Number.parseFloat(value);
  return Number.isNaN(num) ? undefined : num;
};

const getTags = (formData: FormData, key: string): string[] => {
  const value = getOptionalString(formData, key);
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
};

const getBoolean = (formData: FormData, key: string): boolean | undefined => {
  const value = getString(formData, key);
  if (!value) {
    return undefined;
  }
  return value === "true" || value === "1" || value === "on";
};

// ============================================================================
// Query Operations
// ============================================================================

/**
 * List all inventory items with optional filters
 */
export const getInventoryItems = async (filters?: {
  category?: string;
  search?: string;
}): Promise<InventoryItem[]> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  return client.inventoryItem.findMany({
    where: {
      ...(filters?.category && { category: filters.category }),
      ...(filters?.search && {
        OR: [
          { name: { contains: filters.search, mode: "insensitive" } },
          { item_number: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { createdAt: "desc" },
  });
};

/**
 * Get a single inventory item by ID
 */
export const getInventoryItemById = async (
  itemId: string
): Promise<InventoryItem | null> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  return client.inventoryItem.findFirst({
    where: { id: itemId },
  });
};

// ============================================================================
// Create Operation
// ============================================================================

/**
 * Create a new inventory item
 */
export const createInventoryItem = async (
  formData: FormData
): Promise<InventoryItem> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  const item_number = getString(formData, "item_number");
  if (!item_number) {
    throw new Error("Item number is required.");
  }

  const name = getString(formData, "name");
  if (!name) {
    throw new Error("Item name is required.");
  }

  const category = getString(formData, "category");
  if (!category) {
    throw new Error("Category is required.");
  }

  const description = getOptionalString(formData, "description");
  const unitOfMeasure = getString(formData, "unitOfMeasure") || "each";
  const unitCost = getDecimal(formData, "unitCost") ?? 0;
  const quantityOnHand = getDecimal(formData, "quantityOnHand") ?? 0;
  const parLevel = getDecimal(formData, "parLevel") ?? 0;
  const reorder_level = getDecimal(formData, "reorder_level") ?? 0;
  const supplierId = getOptionalString(formData, "supplierId");
  const tags = getTags(formData, "tags");
  const fsa_status = getOptionalString(formData, "fsa_status") || "unknown";
  const fsa_temp_logged = getBoolean(formData, "fsa_temp_logged") ?? false;
  const fsa_allergen_info = getBoolean(formData, "fsa_allergen_info") ?? false;
  const fsa_traceable = getBoolean(formData, "fsa_traceable") ?? false;

  const item = await client.$transaction(async (tx) => {
    const created = await tx.inventoryItem.create({
      data: {
        tenantId,
        item_number,
        name,
        description,
        category,
        unitOfMeasure,
        unitCost,
        quantityOnHand,
        parLevel,
        reorder_level,
        supplierId,
        tags,
        fsa_status,
        fsa_temp_logged,
        fsa_allergen_info,
        fsa_traceable,
      },
    });

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "inventory.item",
        aggregateId: created.id,
        eventType: "inventory.item.created",
        payload: {
          itemId: created.id,
          item_number: created.item_number,
          name: created.name,
          category: created.category,
        },
        status: "pending" as const,
      },
    });

    return created;
  });

  revalidatePath("/inventory");

  return item;
};

// ============================================================================
// Update Operation
// ============================================================================

/**
 * Update an inventory item
 */
export const updateInventoryItem = async (
  formData: FormData
): Promise<InventoryItem> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  const itemId = getString(formData, "itemId");
  if (!itemId) {
    throw new Error("Item ID is required.");
  }

  const item_number = getString(formData, "item_number");
  const name = getString(formData, "name");
  const description = getOptionalString(formData, "description");
  const category = getString(formData, "category");
  const unitOfMeasure = getString(formData, "unitOfMeasure");
  const unitCost = getDecimal(formData, "unitCost");
  const quantityOnHand = getDecimal(formData, "quantityOnHand");
  const parLevel = getDecimal(formData, "parLevel");
  const reorder_level = getDecimal(formData, "reorder_level");
  const supplierId = getOptionalString(formData, "supplierId");
  const tags = getTags(formData, "tags");
  const fsa_status = getOptionalString(formData, "fsa_status");

  const item = await client.$transaction(async (tx) => {
    const updated = await tx.inventoryItem.update({
      where: { tenantId_id: { tenantId, id: itemId } },
      data: {
        ...(item_number !== undefined && { item_number }),
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(category !== undefined && { category }),
        ...(unitOfMeasure !== undefined && { unitOfMeasure }),
        ...(unitCost !== undefined && { unitCost }),
        ...(quantityOnHand !== undefined && { quantityOnHand }),
        ...(parLevel !== undefined && { parLevel }),
        ...(reorder_level !== undefined && { reorder_level }),
        ...(supplierId !== undefined && { supplierId: supplierId || null }),
        ...(tags !== undefined && { tags }),
        ...(fsa_status !== undefined && { fsa_status: fsa_status || null }),
      },
    });

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "inventory.item",
        aggregateId: updated.id,
        eventType: "inventory.item.updated",
        payload: {
          itemId: updated.id,
          item_number: updated.item_number,
          name: updated.name,
        },
        status: "pending" as const,
      },
    });

    return updated;
  });

  revalidatePath("/inventory");

  return item;
};

// ============================================================================
// Delete Operation
// ============================================================================

/**
 * Delete an inventory item (soft delete)
 */
export const deleteInventoryItem = async (itemId: string): Promise<void> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  if (!itemId) {
    throw new Error("Item ID is required.");
  }

  await client.$transaction(async (tx) => {
    await tx.inventoryItem.delete({
      where: { tenantId_id: { tenantId, id: itemId } },
    });

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "inventory.item",
        aggregateId: itemId,
        eventType: "inventory.item.deleted",
        payload: {
          itemId,
        },
        status: "pending" as const,
      },
    });
  });

  revalidatePath("/inventory");
};
