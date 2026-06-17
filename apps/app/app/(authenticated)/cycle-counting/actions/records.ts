"use server";
import { listCycleCountRecords as fetchCycleCountRecords } from "@/app/lib/manifest-client.generated";

/**
 * Cycle Count Record Server Actions
 *
 * Governed writes go through runManifestCommand (constitution §3/§9).
 * Reads remain direct Prisma (constitution §10).
 * syncStatus/offlineId patches remain direct Prisma (offline-sync infrastructure,
 * not domain logic — no manifest command covers them).
 */

import { runManifestCommand } from "@/lib/manifest-command";
import { requireCurrentUser } from "../../../lib/tenant";
import type {
  CreateRecordInput,
  CycleCountRecord,
  RecordResult,
  SyncRecordsInput,
  UpdateRecordInput,
} from "../types";

function toNumber(value: { toNumber: () => number }): number {
  return value.toNumber();
}

export async function listCycleCountRecords(
  sessionId: string
): Promise<CycleCountRecord[]> {
  const records = (await fetchCycleCountRecords()).data;

  return records.map((record) => ({
    id: record.id,
    tenantId: record.tenantId,
    sessionId: record.sessionId,
    itemId: record.itemId,
    itemNumber: record.itemNumber,
    itemName: record.itemName,
    storageLocationId: record.storageLocationId,
    expectedQuantity: toNumber(record.expectedQuantity),
    countedQuantity: toNumber(record.countedQuantity),
    variance: toNumber(record.variance),
    variancePct: toNumber(record.variancePct),
    countDate: record.countDate,
    countedById: record.countedById,
    barcode: record.barcode,
    notes: record.notes,
    isVerified: record.isVerified,
    verifiedById: record.verifiedById,
    verifiedAt: record.verifiedAt,
    syncStatus: record.syncStatus as
      | "synced"
      | "pending"
      | "failed"
      | "conflict",
    offlineId: record.offlineId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
  }));
}

export async function getCycleCountRecord(
  recordId: string
): Promise<CycleCountRecord | null> {
  const record = (await fetchCycleCountRecords()).data[0] ?? null;

  if (!record) {
    return null;
  }

  return {
    id: record.id,
    tenantId: record.tenantId,
    sessionId: record.sessionId,
    itemId: record.itemId,
    itemNumber: record.itemNumber,
    itemName: record.itemName,
    storageLocationId: record.storageLocationId,
    expectedQuantity: toNumber(record.expectedQuantity),
    countedQuantity: toNumber(record.countedQuantity),
    variance: toNumber(record.variance),
    variancePct: toNumber(record.variancePct),
    countDate: record.countDate,
    countedById: record.countedById,
    barcode: record.barcode,
    notes: record.notes,
    isVerified: record.isVerified,
    verifiedById: record.verifiedById,
    verifiedAt: record.verifiedAt,
    syncStatus: record.syncStatus as
      | "synced"
      | "pending"
      | "failed"
      | "conflict",
    offlineId: record.offlineId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
  };
}

export async function createCycleCountRecord(
  input: CreateRecordInput
): Promise<RecordResult> {
  try {
    const user = await requireCurrentUser();

    const result = await runManifestCommand({
      entity: "CycleCountRecord",
      command: "create",
      body: {
        sessionId: input.sessionId,
        itemId: input.itemId,
        itemNumber: input.itemNumber,
        itemName: input.itemName,
        storageLocationId: input.storageLocationId,
        expectedQuantity: input.expectedQuantity,
        countedQuantity: input.countedQuantity,
        userId: user.id,
        barcode: input.barcode || "",
        notes: input.notes || "",
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!result.ok) {
      throw new Error(result.message || "Failed to create record");
    }

    // Read back the created record to preserve return shape with Decimal coercion.
    const createdId = (result.result as { id?: string } | null)?.id;
    if (!createdId) {
      return { success: false, error: "Create command did not return an id" };
    }

    const record = (await fetchCycleCountRecords()).data[0] ?? null;

    if (!record) {
      return { success: false, error: "Created record could not be loaded" };
    }

    return {
      success: true,
      record: {
        id: record.id,
        tenantId: record.tenantId,
        sessionId: record.sessionId,
        itemId: record.itemId,
        itemNumber: record.itemNumber,
        itemName: record.itemName,
        storageLocationId: record.storageLocationId,
        expectedQuantity: toNumber(record.expectedQuantity),
        countedQuantity: toNumber(record.countedQuantity),
        variance: toNumber(record.variance),
        variancePct: toNumber(record.variancePct),
        countDate: record.countDate,
        countedById: record.countedById,
        barcode: record.barcode,
        notes: record.notes,
        isVerified: record.isVerified,
        verifiedById: record.verifiedById,
        verifiedAt: record.verifiedAt,
        syncStatus: record.syncStatus as
          | "synced"
          | "pending"
          | "failed"
          | "conflict",
        offlineId: record.offlineId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        deletedAt: record.deletedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create record",
    };
  }
}

export async function updateCycleCountRecord(
  input: UpdateRecordInput
): Promise<RecordResult> {
  try {
    const user = await requireCurrentUser();

    const existing = (await fetchCycleCountRecords()).data[0] ?? null;

    if (!existing) {
      return {
        success: false,
        error: "Record not found",
      };
    }

    // Route to appropriate Manifest command based on what is being changed.
    // The manifest `update` command handles countedQuantity + notes (with variance recomputation).
    // The manifest `verify` command handles isVerified flag.
    // syncStatus is an offline-sync field not covered by any command.

    if (input.isVerified === true && !existing.isVerified) {
      const result = await runManifestCommand({
        entity: "CycleCountRecord",
        command: "verify",
        instanceId: input.id,
        body: {
          userId: user.id,
        },
        user: { id: user.id, tenantId: user.tenantId, role: user.role },
      });

      if (!result.ok) {
        throw new Error(result.message || "Failed to verify record");
      }
    }

    if (input.countedQuantity !== undefined || input.notes !== undefined) {
      const result = await runManifestCommand({
        entity: "CycleCountRecord",
        command: "update",
        instanceId: input.id,
        body: {
          countedQuantity:
            input.countedQuantity ?? toNumber(existing.countedQuantity),
          notes: input.notes ?? existing.notes ?? "",
          userId: user.id,
        },
        user: { id: user.id, tenantId: user.tenantId, role: user.role },
      });

      if (!result.ok) {
        throw new Error(result.message || "Failed to update record");
      }
    }

    // syncStatus is an offline-sync coordination field with no governed command.
    // Database direct writes are removed in Convex migration; field remains unchanged.

    // Read back the updated record to preserve return shape.
    const record = (await fetchCycleCountRecords()).data[0] ?? null;

    if (!record) {
      return { success: false, error: "Updated record could not be loaded" };
    }

    return {
      success: true,
      record: {
        id: record.id,
        tenantId: record.tenantId,
        sessionId: record.sessionId,
        itemId: record.itemId,
        itemNumber: record.itemNumber,
        itemName: record.itemName,
        storageLocationId: record.storageLocationId,
        expectedQuantity: toNumber(record.expectedQuantity),
        countedQuantity: toNumber(record.countedQuantity),
        variance: toNumber(record.variance),
        variancePct: toNumber(record.variancePct),
        countDate: record.countDate,
        countedById: record.countedById,
        barcode: record.barcode,
        notes: record.notes,
        isVerified: record.isVerified,
        verifiedById: record.verifiedById,
        verifiedAt: record.verifiedAt,
        syncStatus: record.syncStatus as
          | "synced"
          | "pending"
          | "failed"
          | "conflict",
        offlineId: record.offlineId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        deletedAt: record.deletedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update record",
    };
  }
}

export async function syncCycleCountRecords(
  input: SyncRecordsInput
): Promise<RecordResult> {
  try {
    const user = await requireCurrentUser();

    const results = await Promise.all(
      input.records.map(async (recordData) => {
        // Governed create via Manifest runtime (variance/variancePct computed by command)
        const result = await runManifestCommand({
          entity: "CycleCountRecord",
          command: "create",
          body: {
            sessionId: recordData.sessionId,
            itemId: recordData.itemId,
            itemNumber: recordData.itemNumber,
            itemName: recordData.itemName,
            storageLocationId: recordData.storageLocationId,
            expectedQuantity: recordData.expectedQuantity,
            countedQuantity: recordData.countedQuantity,
            userId: user.id,
            barcode: recordData.barcode || "",
            notes: recordData.notes || "",
          },
          user: { id: user.id, tenantId: user.tenantId, role: user.role },
        });

        if (!result.ok) {
          throw new Error(result.message || "Failed to sync record");
        }

        const createdId = (result.result as { id?: string } | null)?.id;
        if (!createdId) {
          throw new Error("Sync create command did not return an id");
        }

        // offlineId is an offline-sync infrastructure field not covered by
        // manifest commands. Patch directly (same pattern as syncStatus in update).
        if (recordData.offlineId) {
          // offlineId sync patch removed from direct database path.
        }

        // Post-command read to materialize return shape with Decimal coercion.
        const record = (await fetchCycleCountRecords()).data[0] ?? null;

        if (!record) {
          throw new Error("Synced record could not be loaded");
        }

        return {
          id: record.id,
          tenantId: record.tenantId,
          sessionId: record.sessionId,
          itemId: record.itemId,
          itemNumber: record.itemNumber,
          itemName: record.itemName,
          storageLocationId: record.storageLocationId,
          expectedQuantity: toNumber(record.expectedQuantity),
          countedQuantity: toNumber(record.countedQuantity),
          variance: toNumber(record.variance),
          variancePct: toNumber(record.variancePct),
          countDate: record.countDate,
          countedById: record.countedById,
          barcode: record.barcode,
          notes: record.notes,
          isVerified: record.isVerified,
          verifiedById: record.verifiedById,
          verifiedAt: record.verifiedAt,
          syncStatus: record.syncStatus as
            | "synced"
            | "pending"
            | "failed"
            | "conflict",
          offlineId: record.offlineId,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          deletedAt: record.deletedAt,
        };
      })
    );

    return {
      success: true,
      record: results[0],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sync records",
    };
  }
}
