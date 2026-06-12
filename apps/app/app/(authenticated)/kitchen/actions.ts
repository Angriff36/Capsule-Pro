"use server";

import { database, type WasteEntry } from "@repo/database";
import { revalidatePath } from "next/cache";
import { invariant } from "@/app/lib/invariant";
import { requireCurrentUser, requireTenantId } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest-command";

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

const getInt = (formData: FormData, key: string): number | undefined => {
  const value = getString(formData, key);
  if (!value) {
    return;
  }
  const num = Number.parseInt(value, 10);
  return Number.isNaN(num) ? undefined : num;
};

const getDecimal = (formData: FormData, key: string): number | undefined => {
  const value = getString(formData, key);
  if (!value) {
    return;
  }
  const num = Number.parseFloat(value);
  return Number.isNaN(num) ? undefined : num;
};

// ============================================================================
// Query Operations (direct Prisma reads — constitution §10)
// ============================================================================

/**
 * List all waste entries with optional filters
 */
export const getWasteEntries = async (filters?: {
  itemId?: string;
  reasonId?: number;
  locationId?: string;
}): Promise<WasteEntry[]> => {
  const tenantId = await requireTenantId();

  return database.wasteEntry.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(filters?.itemId && { inventoryItemId: filters.itemId }),
      ...(filters?.reasonId && { reasonId: filters.reasonId }),
      ...(filters?.locationId && { locationId: filters.locationId }),
    },
    orderBy: { loggedAt: "desc" },
    include: {
      inventoryItem: true,
      reason: true,
    },
  });
};

/**
 * Get a single waste entry by ID
 */
export const getWasteEntryById = async (
  entryId: string
): Promise<WasteEntry | null> => {
  const tenantId = await requireTenantId();

  return database.wasteEntry.findFirst({
    where: { tenantId, id: entryId, deletedAt: null },
    include: {
      inventoryItem: true,
      reason: true,
    },
  });
};

// ============================================================================
// Create Operation (governed via Manifest runtime)
// ============================================================================

/**
 * Create a new waste entry.
 *
 * NOTE: locationId is NOT a create param — when eventId is set, location
 * is inherited from the parent Event via parent-context propagation.
 * totalCost is auto-computed (quantity × unitCost). status defaults to
 * "logged" via property default (never set explicitly — self-transition bug).
 */
export const createWasteEntry = async (
  formData: FormData
): Promise<WasteEntry> => {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;

  const inventoryItemId = getString(formData, "inventoryItemId");
  if (!inventoryItemId) {
    throw new Error("Inventory item is required.");
  }

  const reasonIdStr = getString(formData, "reasonId");
  if (!reasonIdStr) {
    throw new Error("Waste reason is required.");
  }
  const reasonId = Number.parseInt(reasonIdStr, 10);
  if (Number.isNaN(reasonId)) {
    throw new Error("Invalid waste reason ID.");
  }

  const quantity = getDecimal(formData, "quantity");
  if (!quantity || quantity <= 0) {
    throw new Error("Quantity must be greater than 0.");
  }

  const unitId = getInt(formData, "unitId") ?? 0;
  const eventId = getOptionalString(formData, "eventId") ?? "";
  const unitCost = getDecimal(formData, "unitCost") ?? 0;
  const notes = getOptionalString(formData, "notes") ?? "";

  const result = await runManifestCommand({
    entity: "WasteEntry",
    command: "create",
    body: {
      inventoryItemId,
      reasonId,
      quantity,
      unitId,
      eventId,
      loggedBy: user.id,
      unitCost,
      notes,
    },
    user: { id: user.id, tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to create waste entry");
  }

  const createdId = (result.result as { id?: string } | null)?.id;
  invariant(createdId, "WasteEntry.create did not return an id");

  const entry = await database.wasteEntry.findFirst({
    where: { tenantId, id: createdId },
    include: {
      inventoryItem: true,
      reason: true,
    },
  });
  invariant(entry, "Created waste entry could not be loaded");

  revalidatePath("/kitchen/waste");

  return entry;
};

// ============================================================================
// Update Operation (governed via Manifest runtime)
// ============================================================================

/**
 * Update a waste entry.
 *
 * The update command mutates quantity, unitId, locationId, notes, unitCost.
 * totalCost is auto-recalculated. reasonId is NOT updatable.
 */
export const updateWasteEntry = async (
  formData: FormData
): Promise<WasteEntry> => {
  const user = await requireCurrentUser();
  const tenantId = user.tenantId;

  const entryId = getString(formData, "entryId");
  if (!entryId) {
    throw new Error("Entry ID is required.");
  }

  // Read existing for merge (update is full-field mutation)
  const existing = await database.wasteEntry.findFirst({
    where: { tenantId, id: entryId, deletedAt: null },
  });
  invariant(existing, "Waste entry not found");

  const quantity = getDecimal(formData, "quantity");
  const unitId = getInt(formData, "unitId");
  const locationId = getOptionalString(formData, "locationId");
  const unitCost = getDecimal(formData, "unitCost");
  const notes = getOptionalString(formData, "notes");

  const result = await runManifestCommand({
    entity: "WasteEntry",
    command: "update",
    body: {
      id: entryId,
      quantity: quantity ?? Number(existing.quantity),
      unitId: unitId ?? existing.unitId ?? 0,
      locationId:
        locationId === undefined
          ? (existing.locationId ?? "")
          : (locationId ?? ""),
      notes: notes === undefined ? (existing.notes ?? "") : (notes ?? ""),
      unitCost: unitCost ?? Number(existing.unitCost),
    },
    user: { id: user.id, tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to update waste entry");
  }

  const entry = await database.wasteEntry.findFirst({
    where: { tenantId, id: entryId },
    include: {
      inventoryItem: true,
      reason: true,
    },
  });
  invariant(entry, "Updated waste entry could not be loaded");

  revalidatePath("/kitchen/waste");

  return entry;
};

// ============================================================================
// Delete Operation (governed via Manifest runtime — soft delete)
// ============================================================================

/**
 * Soft delete a waste entry
 */
export const deleteWasteEntry = async (entryId: string): Promise<void> => {
  const user = await requireCurrentUser();

  if (!entryId) {
    throw new Error("Entry ID is required.");
  }

  const result = await runManifestCommand({
    entity: "WasteEntry",
    command: "softDelete",
    body: {
      id: entryId,
      reason: "Deleted by user",
      userId: user.id,
    },
    user: { id: user.id, tenantId: user.tenantId, role: user.role },
  });

  if (!result.ok) {
    throw new Error(result.message || "Failed to delete waste entry");
  }

  revalidatePath("/kitchen/waste");
};
