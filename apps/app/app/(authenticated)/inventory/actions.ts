"use server";

import { revalidatePath } from "next/cache";
import {
  loadInventoryItemDetail,
  loadInventoryItemsForClient,
} from "@/app/lib/convex/domain-loaders";
import type { InventoryItemWithStatus } from "@/app/lib/inventory";
import { invariant } from "@/app/lib/invariant";
import { requireCurrentUser, requireTenantId } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";
import { serverGetEntity } from "@/app/lib/convex/server-reads";
import { mapConvexInventoryItemToUi } from "@/app/lib/inventory-convex-mapper";

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
    return;
  }
  return value === "true" || value === "1" || value === "on";
};

async function loadItemById(itemId: string): Promise<InventoryItemWithStatus | null> {
  const loaded = await loadInventoryItemDetail(itemId);
  return loaded?.item ?? null;
}

export const getInventoryItems = async (filters?: {
  category?: string;
  search?: string;
}): Promise<InventoryItemWithStatus[]> => {
  await requireTenantId();
  let items = await loadInventoryItemsForClient();

  if (filters?.category) {
    items = items.filter((i) => i.category === filters.category);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    items = items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.item_number.toLowerCase().includes(q)
    );
  }

  return items.sort(
    (a, b) => b.created_at.getTime() - a.created_at.getTime()
  );
};

export const getInventoryItemById = async (
  itemId: string
): Promise<InventoryItemWithStatus | null> => loadItemById(itemId);

export const createInventoryItem = async (
  formData: FormData
): Promise<InventoryItemWithStatus> => {
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
      tags,
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

  const createdId =
    (result.result as { id?: string; _id?: string } | null)?.id ??
    (result.result as { _id?: string } | null)?._id;
  invariant(createdId, "InventoryItem.create did not return an id");

  const doc = await serverGetEntity("InventoryItem", String(createdId));
  invariant(doc, "Created inventory item could not be loaded");

  revalidatePath("/inventory");
  return mapConvexInventoryItemToUi(doc);
};

export const updateInventoryItem = async (
  formData: FormData
): Promise<InventoryItemWithStatus> => {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;

  const itemId = getString(formData, "itemId");
  if (!itemId) {
    throw new Error("Item ID is required.");
  }

  const existing = await loadItemById(itemId);
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
      description:
        description === undefined
          ? (existing.description ?? "")
          : (description ?? ""),
      category: category ?? existing.category,
      unitOfMeasure: unitOfMeasure ?? existing.unit_of_measure,
      unitCost: unitCost ?? existing.unit_cost,
      quantityOnHand: quantityOnHand ?? existing.quantity_on_hand,
      parLevel: parLevel ?? existing.par_level,
      reorder_level: reorder_level ?? existing.reorder_level,
      supplierId:
        supplierId === undefined
          ? (existing.supplier_id ?? "")
          : (supplierId ?? ""),
      tags: tags.length > 0 ? tags : existing.tags,
      fsa_status:
        fsa_status === undefined
          ? (existing.fsa_status ?? "")
          : (fsa_status ?? ""),
      fsa_temp_logged: existing.fsa_temp_logged,
      fsa_allergen_info: existing.fsa_allergen_info,
      fsa_traceable: existing.fsa_traceable,
    },
    user: { id: user.id, tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to update inventory item");
  }

  const updated = await loadItemById(itemId);
  invariant(updated, "Updated inventory item could not be loaded");

  revalidatePath("/inventory");
  return updated;
};

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
