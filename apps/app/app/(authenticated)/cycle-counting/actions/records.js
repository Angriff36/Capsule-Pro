"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.listCycleCountRecords = listCycleCountRecords;
exports.getCycleCountRecord = getCycleCountRecord;
exports.createCycleCountRecord = createCycleCountRecord;
exports.updateCycleCountRecord = updateCycleCountRecord;
exports.syncCycleCountRecords = syncCycleCountRecords;
const database_1 = require("@repo/database");
const tenant_1 = require("../../../lib/tenant");
function toNumber(value) {
  return value.toNumber();
}
async function listCycleCountRecords(sessionId) {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const records = await database_1.database.cycleCountRecord.findMany({
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
    syncStatus: record.syncStatus,
    offlineId: record.offlineId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
  }));
}
async function getCycleCountRecord(recordId) {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const record = await database_1.database.cycleCountRecord.findFirst({
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
    syncStatus: record.syncStatus,
    offlineId: record.offlineId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
  };
}
async function createCycleCountRecord(input) {
  try {
    const tenantId = await (0, tenant_1.requireTenantId)();
    const user = await database_1.database.user.findFirst({
      where: {
        tenantId,
        authUserId: await (0, tenant_1.requireTenantId)(),
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
    const record = await database_1.database.cycleCountRecord.create({
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
        syncStatus: record.syncStatus,
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
async function updateCycleCountRecord(input) {
  try {
    const tenantId = await (0, tenant_1.requireTenantId)();
    const existing = await database_1.database.cycleCountRecord.findFirst({
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
    const updatedData = {};
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
    const record = await database_1.database.cycleCountRecord.update({
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
        syncStatus: record.syncStatus,
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
async function syncCycleCountRecords(input) {
  try {
    const tenantId = await (0, tenant_1.requireTenantId)();
    const user = await database_1.database.user.findFirst({
      where: {
        tenantId,
        authUserId: await (0, tenant_1.requireTenantId)(),
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
        const record = await database_1.database.cycleCountRecord.create({
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
          syncStatus: record.syncStatus,
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
