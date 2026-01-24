"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVarianceReports = generateVarianceReports;
exports.finalizeCycleCountSession = finalizeCycleCountSession;
exports.getAuditLogs = getAuditLogs;
const database_1 = require("@repo/database");
const tenant_1 = require("../../../lib/tenant");
function toNumber(value) {
  return value.toNumber();
}
async function generateVarianceReports(sessionId) {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const records = await database_1.database.cycleCountRecord.findMany({
    where: {
      tenantId,
      sessionId,
      deletedAt: null,
    },
  });
  const reports = records.map((record) => {
    const expectedQuantity = toNumber(record.expectedQuantity);
    const countedQuantity = toNumber(record.countedQuantity);
    const variance = countedQuantity - expectedQuantity;
    const variancePct =
      expectedQuantity > 0 ? Math.abs((variance / expectedQuantity) * 100) : 0;
    const accuracyScore =
      expectedQuantity > 0 ? Math.max(0, 100 - variancePct) : 100;
    return {
      id: crypto.randomUUID(),
      tenantId: record.tenantId,
      sessionId: record.sessionId,
      reportType: "item_variance",
      itemId: record.itemId,
      itemNumber: record.itemNumber,
      itemName: record.itemName,
      expectedQuantity,
      countedQuantity,
      variance,
      variancePct,
      accuracyScore,
      status: "pending",
      adjustmentType: null,
      adjustmentAmount: null,
      adjustmentDate: null,
      notes: null,
      generatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
  });
  await database_1.database.varianceReport.createMany({
    data: reports,
  });
  return reports;
}
async function finalizeCycleCountSession(input) {
  try {
    const tenantId = await (0, tenant_1.requireTenantId)();
    const session = await database_1.database.cycleCountSession.findFirst({
      where: {
        tenantId,
        id: input.sessionId,
        deletedAt: null,
      },
    });
    if (!session) {
      return {
        success: false,
        error: "Session not found",
      };
    }
    if (session.status === "finalized") {
      return {
        success: false,
        error: "Session already finalized",
      };
    }
    // Fetch records separately since there's no relation
    const records = await database_1.database.cycleCountRecord.findMany({
      where: {
        tenantId,
        sessionId: input.sessionId,
        deletedAt: null,
      },
    });
    let totalVariance = 0;
    let totalExpected = 0;
    for (const record of records) {
      totalVariance += toNumber(record.variance);
      totalExpected += toNumber(record.expectedQuantity);
    }
    const variancePercentage =
      totalExpected > 0 ? Math.abs((totalVariance / totalExpected) * 100) : 0;
    const updatedSession = await database_1.database.cycleCountSession.update({
      where: {
        tenantId_id: {
          tenantId,
          id: input.sessionId,
        },
      },
      data: {
        status: "finalized",
        finalizedAt: new Date(),
        approvedById: input.approvedById,
        notes: input.notes || session.notes,
        totalVariance,
        variancePercentage,
        countedItems: records.length,
        totalItems: records.length,
      },
    });
    for (const record of records) {
      const expectedQuantity = toNumber(record.expectedQuantity);
      const countedQuantity = toNumber(record.countedQuantity);
      const variance = countedQuantity - expectedQuantity;
      if (variance !== 0) {
        const inventoryItem = await database_1.database.inventoryItem.findFirst(
          {
            where: {
              tenantId,
              id: record.itemId,
              deletedAt: null,
            },
          }
        );
        if (inventoryItem) {
          await database_1.database.inventoryTransaction.create({
            data: {
              tenantId,
              itemId: record.itemId,
              transactionType: "adjustment",
              quantity: variance,
              unit_cost: inventoryItem.unitCost,
              reason: `Cycle count session ${session.sessionId}`,
              reference: session.sessionId,
              referenceType: "cycle_count",
              referenceId: session.id,
              storage_location_id: "00000000-0000-0000-0000-000000000000",
            },
          });
          await database_1.database.inventoryItem.update({
            where: {
              tenantId_id: {
                tenantId,
                id: record.itemId,
              },
            },
            data: {
              quantityOnHand: countedQuantity,
            },
          });
        }
        await database_1.database.varianceReport.updateMany({
          where: {
            tenantId,
            sessionId: input.sessionId,
            itemId: record.itemId,
            deletedAt: null,
          },
          data: {
            status: "approved",
            adjustmentType:
              variance > 0 ? "increase" : variance < 0 ? "decrease" : "none",
            adjustmentAmount: Math.abs(variance),
            adjustmentDate: new Date(),
          },
        });
      }
    }
    await database_1.database.cycleCountAuditLog.create({
      data: {
        tenantId,
        sessionId: input.sessionId,
        action: "finalize",
        entityType: "CycleCountSession",
        entityId: session.id,
        oldValue: {
          status: session.status,
          totalVariance: toNumber(session.totalVariance),
        },
        newValue: {
          status: "finalized",
          totalVariance,
          variancePercentage,
        },
        performedById: input.approvedById,
        ipAddress: null,
        userAgent: null,
      },
    });
    return {
      success: true,
      sessionId: updatedSession.id,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to finalize session",
    };
  }
}
async function getAuditLogs(sessionId) {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const logs = await database_1.database.cycleCountAuditLog.findMany({
    where: {
      tenantId,
      sessionId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return logs.map((log) => ({
    id: log.id,
    tenantId: log.tenantId,
    sessionId: log.sessionId,
    recordId: log.recordId,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    oldValue: log.oldValue,
    newValue: log.newValue,
    performedById: log.performedById,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
  }));
}
