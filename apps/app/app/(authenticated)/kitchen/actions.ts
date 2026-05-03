"use server";

import { tenantDatabase, type WasteEntry } from "@repo/database";
import { revalidatePath } from "next/cache";
import { requireCurrentUser, requireTenantId } from "@/app/lib/tenant";

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
// Query Operations
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
  const client = tenantDatabase(tenantId);

  return client.wasteEntry.findMany({
    where: {
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
  const client = tenantDatabase(tenantId);

  return client.wasteEntry.findFirst({
    where: { id: entryId },
    include: {
      inventoryItem: true,
      reason: true,
    },
  });
};

// ============================================================================
// Create Operation
// ============================================================================

/**
 * Create a new waste entry
 */
export const createWasteEntry = async (
  formData: FormData
): Promise<WasteEntry> => {
  const tenantId = await requireTenantId();
  const currentUser = await requireCurrentUser();
  const client = tenantDatabase(tenantId);

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

  const unitId = getInt(formData, "unitId");
  const locationId = getOptionalString(formData, "locationId");
  const eventId = getOptionalString(formData, "eventId");
  const unitCost = getDecimal(formData, "unitCost");
  const totalCost = getDecimal(formData, "totalCost");
  const notes = getOptionalString(formData, "notes");

  const entry = await client.$transaction(async (tx) => {
    const created = await tx.wasteEntry.create({
      data: {
        tenantId,
        inventoryItemId,
        reasonId,
        quantity,
        unitId,
        locationId,
        eventId,
        loggedBy: currentUser.id,
        unitCost,
        totalCost,
        notes,
      },
      include: {
        inventoryItem: true,
        reason: true,
      },
    });

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "kitchen.waste",
        aggregateId: created.id,
        eventType: "kitchen.waste.created",
        payload: {
          wasteEntryId: created.id,
          inventoryItemId: created.inventoryItemId,
          reasonId: created.reasonId,
          quantity: Number(created.quantity),
          loggedBy: created.loggedBy,
        },
        status: "pending" as const,
      },
    });

    return created;
  });

  revalidatePath("/kitchen/waste");

  return entry;
};

// ============================================================================
// Update Operation
// ============================================================================

/**
 * Update a waste entry
 */
export const updateWasteEntry = async (
  formData: FormData
): Promise<WasteEntry> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  const entryId = getString(formData, "entryId");
  if (!entryId) {
    throw new Error("Entry ID is required.");
  }

  const quantity = getDecimal(formData, "quantity");
  const reasonIdStr = getString(formData, "reasonId");
  const reasonId = reasonIdStr ? Number.parseInt(reasonIdStr, 10) : undefined;
  const unitId = getInt(formData, "unitId");
  const locationId = getOptionalString(formData, "locationId");
  const unitCost = getDecimal(formData, "unitCost");
  const totalCost = getDecimal(formData, "totalCost");
  const notes = getOptionalString(formData, "notes");

  const entry = await client.$transaction(async (tx) => {
    const updated = await tx.wasteEntry.update({
      where: { tenantId_id: { tenantId, id: entryId } },
      data: {
        ...(quantity !== undefined && { quantity }),
        ...(reasonId !== undefined && !Number.isNaN(reasonId) && { reasonId }),
        ...(unitId !== undefined && { unitId }),
        ...(locationId !== undefined && {
          locationId: locationId || null,
        }),
        ...(unitCost !== undefined && { unitCost }),
        ...(totalCost !== undefined && { totalCost }),
        ...(notes !== undefined && { notes: notes || null }),
      },
      include: {
        inventoryItem: true,
        reason: true,
      },
    });

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "kitchen.waste",
        aggregateId: updated.id,
        eventType: "kitchen.waste.updated",
        payload: {
          wasteEntryId: updated.id,
          inventoryItemId: updated.inventoryItemId,
          reasonId: updated.reasonId,
          quantity: Number(updated.quantity),
        },
        status: "pending" as const,
      },
    });

    return updated;
  });

  revalidatePath("/kitchen/waste");

  return entry;
};

// ============================================================================
// Delete Operation
// ============================================================================

/**
 * Delete a waste entry
 */
export const deleteWasteEntry = async (entryId: string): Promise<void> => {
  const tenantId = await requireTenantId();
  const client = tenantDatabase(tenantId);

  if (!entryId) {
    throw new Error("Entry ID is required.");
  }

  await client.$transaction(async (tx) => {
    await tx.wasteEntry.delete({
      where: { tenantId_id: { tenantId, id: entryId } },
    });

    await tx.outboxEvent.create({
      data: {
        tenantId,
        aggregateType: "kitchen.waste",
        aggregateId: entryId,
        eventType: "kitchen.waste.deleted",
        payload: {
          wasteEntryId: entryId,
        },
        status: "pending" as const,
      },
    });
  });

  revalidatePath("/kitchen/waste");
};
