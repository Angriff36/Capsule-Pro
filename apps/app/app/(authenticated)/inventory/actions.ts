"use server";

import { type InventoryItem, database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { requireCurrentUser, requireTenantId } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";
import { invariant } from "@/app/lib/invariant";

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
// Query Operations (direct Prisma reads — constitution §10)
// ============================================================================

/**
 * List all inventory items with optional filters
 */
export const getInventoryItems = async (filters?: {
  category?: string;
  search?: string;
}): Promise<InventoryItem[]> => {
  const tenantId = await requireTenantId();

  return database.inventoryItem.findMany({
    where: {
      tenantId,
      deletedAt: null,
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

  return database.inventoryItem.findFirst({
    where: { tenantId, id: itemId, deletedAt: null },
  });
};

// ============================================================================
// Create Operation (governed via Manifest runtime)
// ============================================================================

/**
 * Create a new inventory item
 */
export const createInventoryItem = async (
  formData: FormData
): Promise<InventoryItem> => {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;

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

  const result = await runManifestCommand({
    entity: "InventoryItem",
    command: "create",
    body: {
      item_number,
      name,
      category,
      description: description ?? "",
      unitOfMeasure,
      unitCost,
      quantityOnHand,
      parLevel,
      reorder_level,
      supplierId: supplierId ?? "",
      tags: tags.join(","),
      fsa_status,
      fsa_temp_logged,
      fsa_allergen_info,
      fsa_traceable,
    },
    user: { id: user.id, tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create inventory item");
  }

  const createdId = (result.result as { id?: string } | null)?.id;
  invariant(createdId, "InventoryItem.create did not return an id");

  const item = await database.inventoryItem.findFirst({
    where: { tenantId, id: createdId },
  });
  invariant(item, "Created inventory item could not be loaded");

  revalidatePath("/inventory");

  return item;
};

// ============================================================================
// Update Operation (governed via Manifest runtime)
// ============================================================================

/**
 * Update an inventory item
 */
export const updateInventoryItem = async (
  formData: FormData
): Promise<InventoryItem> => {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;

  const itemId = getString(formData, "itemId");
  if (!itemId) {
    throw new Error("Item ID is required.");
  }

  // Read existing for merge (update command is full-field mutation)
  const existing = await database.inventoryItem.findFirst({
    where: { tenantId, id: itemId, deletedAt: null },
  });
  invariant(existing, "Inventory item not found");

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

  const result = await runManifestCommand({
    entity: "InventoryItem",
    command: "update",
    body: {
      id: itemId,
      name: name ?? existing.name,
      description: description !== undefined ? (description ?? "") : (existing.description ?? ""),
      category: category ?? existing.category,
      unitOfMeasure: unitOfMeasure ?? existing.unitOfMeasure,
      unitCost: unitCost ?? Number(existing.unitCost),
      quantityOnHand: quantityOnHand ?? Number(existing.quantityOnHand),
      parLevel: parLevel ?? Number(existing.parLevel),
      reorder_level: reorder_level ?? Number(existing.reorder_level),
      supplierId: supplierId !== undefined ? (supplierId ?? "") : (existing.supplierId ?? ""),
      tags: tags.length > 0 ? tags.join(",") : (existing.tags as unknown as string ?? ""),
      fsa_status: fsa_status !== undefined ? (fsa_status ?? "") : (existing.fsa_status ?? ""),
      fsa_temp_logged: existing.fsa_temp_logged,
      fsa_allergen_info: existing.fsa_allergen_info,
      fsa_traceable: existing.fsa_traceable,
    },
    user: { id: user.id, tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to update inventory item");
  }

  const item = await database.inventoryItem.findFirst({
    where: { tenantId, id: itemId },
  });
  invariant(item, "Updated inventory item could not be loaded");

  revalidatePath("/inventory");

  return item;
};

// ============================================================================
// Delete Operation (governed via Manifest runtime — soft delete)
// ============================================================================

/**
 * Soft delete an inventory item
 */
export const deleteInventoryItem = async (itemId: string): Promise<void> => {
  const user = await requireCurrentUser();

  if (!itemId) {
    throw new Error("Item ID is required.");
  }

  const result = await runManifestCommand({
    entity: "InventoryItem",
    command: "softDelete",
    body: { id: itemId },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to delete inventory item");
  }

  revalidatePath("/inventory");
};
