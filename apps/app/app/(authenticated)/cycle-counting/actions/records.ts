"use server";

/**
 * Cycle Count Record Server Actions
 *
 * Governed writes go through runManifestCommand (constitution §3/§9).
 * Reads remain direct Prisma (constitution §10).
 * Batch operations (sync) remain direct Prisma.
 */

import { database } from "@repo/database";
import { runManifestCommand } from "@/lib/manifest-command";
import { requireCurrentUser, requireTenantId } from "../../../lib/tenant";
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
  const tenantId = await requireTenantId();

  const records = await database.cycleCountRecord.findMany({
    where: {
      tenantId,
      sessionId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

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
  const tenantId = await requireTenantId();

  const record = await database.cycleCountRecord.findFirst({
    where: {
      tenantId,
      id: recordId,
      deletedAt: null,
    },
  });

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

    const tenantId = await requireTenantId();
    const record = await database.cycleCountRecord.findFirst({
      where: {
        tenantId,
        id: createdId,
        deletedAt: null,
      },
    });

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
    const tenantId = await requireTenantId();
    const user = await requireCurrentUser();

    const existing = await database.cycleCountRecord.findFirst({
      where: {
        tenantId,
        id: input.id,
        deletedAt: null,
      },
    });

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

    if (
      input.countedQuantity !== undefined ||
      input.notes !== undefined
    ) {
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

    // syncStatus is an offline-sync coordination field not governed by manifest commands.
    if (input.syncStatus !== undefined) {
      await database.cycleCountRecord.update({
        where: {
          tenantId_id: {
            tenantId,
            id: input.id,
          },
        },
        data: {
          syncStatus: input.syncStatus,
        },
      });
    }

    // Read back the updated record to preserve return shape.
    const record = await database.cycleCountRecord.findFirst({
      where: {
        tenantId,
        id: input.id,
        deletedAt: null,
      },
    });

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
    const tenantId = await requireTenantId();
    const user = await requireCurrentUser();

    const results = await Promise.all(
      input.records.map(async (recordData) => {
        const expectedQuantity = recordData.expectedQuantity;
        const countedQuantity = recordData.countedQuantity;
        const variance = countedQuantity - expectedQuantity;
        const variancePct =
          expectedQuantity > 0 ? (variance / expectedQuantity) * 100 : 0;

        const record = await database.cycleCountRecord.create({
          data: {
            tenantId,
            sessionId: recordData.sessionId,
            itemId: recordData.itemId,
            itemNumber: recordData.itemNumber,
            itemName: recordData.itemName,
            storageLocationId: recordData.storageLocationId,
            expectedQuantity,
            countedQuantity,
            variance,
            variancePct,
            countedById: user.id,
            barcode: recordData.barcode || null,
            notes: recordData.notes || null,
            syncStatus: "synced",
            offlineId: recordData.offlineId || null,
          },
        });

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
