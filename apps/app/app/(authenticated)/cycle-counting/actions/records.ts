"use server";

import { database } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
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
    const tenantId = await requireTenantId();
    const user = await database.user.findFirst({
      where: {
        tenantId,
        authUserId: await requireTenantId(),
      },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    const variance = input.countedQuantity - input.expectedQuantity;
    const variancePct =
      input.expectedQuantity > 0
        ? (variance / input.expectedQuantity) * 100
        : 0;

    const record = await database.cycleCountRecord.create({
      data: {
        tenantId,
        sessionId: input.sessionId,
        itemId: input.itemId,
        itemNumber: input.itemNumber,
        itemName: input.itemName,
        storageLocationId: input.storageLocationId,
        expectedQuantity: input.expectedQuantity,
        countedQuantity: input.countedQuantity,
        variance,
        variancePct,
        countedById: user.id,
        barcode: input.barcode || null,
        notes: input.notes || null,
        syncStatus: input.syncStatus || "synced",
        offlineId: input.offlineId || null,
      },
    });

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

    const updatedData: Record<string, unknown> = {};

    if (input.countedQuantity !== undefined) {
      const expectedQuantity = toNumber(existing.expectedQuantity);
      const variance = input.countedQuantity - expectedQuantity;
      const variancePct =
        expectedQuantity > 0 ? (variance / expectedQuantity) * 100 : 0;
      updatedData.countedQuantity = input.countedQuantity;
      updatedData.variance = variance;
      updatedData.variancePct = variancePct;
    }

    if (input.notes !== undefined) {
      updatedData.notes = input.notes;
    }

    if (input.isVerified !== undefined) {
      updatedData.isVerified = input.isVerified;
      if (input.isVerified) {
        updatedData.verifiedAt = new Date();
      }
    }

    if (input.syncStatus !== undefined) {
      updatedData.syncStatus = input.syncStatus;
    }

    const record = await database.cycleCountRecord.update({
      where: {
        tenantId_id: {
          tenantId,
          id: input.id,
        },
      },
      data: updatedData,
    });

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
    const user = await database.user.findFirst({
      where: {
        tenantId,
        authUserId: await requireTenantId(),
      },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

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
