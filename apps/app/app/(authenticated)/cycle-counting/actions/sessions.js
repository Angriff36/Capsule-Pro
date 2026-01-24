"use server";

Object.defineProperty(exports, "__esModule", { value: true });
exports.listCycleCountSessions = listCycleCountSessions;
exports.getCycleCountSession = getCycleCountSession;
exports.createCycleCountSession = createCycleCountSession;
exports.updateCycleCountSession = updateCycleCountSession;
exports.deleteCycleCountSession = deleteCycleCountSession;
const database_1 = require("@repo/database");
const tenant_1 = require("../../../lib/tenant");
function toNumber(value) {
  return value.toNumber();
}
async function listCycleCountSessions() {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const sessions = await database_1.database.cycleCountSession.findMany({
    where: {
      tenantId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return sessions.map((session) => ({
    id: session.id,
    tenantId: session.tenantId,
    locationId: session.locationId,
    sessionId: session.sessionId,
    sessionName: session.sessionName,
    countType: session.countType,
    scheduledDate: session.scheduledDate,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    finalizedAt: session.finalizedAt,
    status: session.status,
    totalItems: session.totalItems,
    countedItems: session.countedItems,
    totalVariance: toNumber(session.totalVariance),
    variancePercentage: toNumber(session.variancePercentage),
    notes: session.notes,
    createdById: session.createdById,
    approvedById: session.approvedById,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    deletedAt: session.deletedAt,
  }));
}
async function getCycleCountSession(sessionId) {
  const tenantId = await (0, tenant_1.requireTenantId)();
  const session = await database_1.database.cycleCountSession.findFirst({
    where: {
      tenantId,
      sessionId,
      deletedAt: null,
    },
  });
  if (!session) {
    return null;
  }
  return {
    id: session.id,
    tenantId: session.tenantId,
    locationId: session.locationId,
    sessionId: session.sessionId,
    sessionName: session.sessionName,
    countType: session.countType,
    scheduledDate: session.scheduledDate,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    finalizedAt: session.finalizedAt,
    status: session.status,
    totalItems: session.totalItems,
    countedItems: session.countedItems,
    totalVariance: toNumber(session.totalVariance),
    variancePercentage: toNumber(session.variancePercentage),
    notes: session.notes,
    createdById: session.createdById,
    approvedById: session.approvedById,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    deletedAt: session.deletedAt,
  };
}
async function createCycleCountSession(input) {
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
    const session = await database_1.database.cycleCountSession.create({
      data: {
        tenantId,
        locationId: input.locationId,
        sessionId: crypto.randomUUID(),
        sessionName: input.sessionName,
        countType: input.countType,
        scheduledDate: input.scheduledDate || null,
        notes: input.notes || null,
        createdById: user.id,
        totalItems: 0,
        countedItems: 0,
        totalVariance: 0,
        variancePercentage: 0,
      },
    });
    return {
      success: true,
      session: {
        id: session.id,
        tenantId: session.tenantId,
        locationId: session.locationId,
        sessionId: session.sessionId,
        sessionName: session.sessionName,
        countType: session.countType,
        scheduledDate: session.scheduledDate,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        finalizedAt: session.finalizedAt,
        status: session.status,
        totalItems: session.totalItems,
        countedItems: session.countedItems,
        totalVariance: session.totalVariance.toNumber(),
        variancePercentage: session.variancePercentage.toNumber(),
        notes: session.notes,
        createdById: session.createdById,
        approvedById: session.approvedById,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        deletedAt: session.deletedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create session",
    };
  }
}
async function updateCycleCountSession(input) {
  try {
    const tenantId = await (0, tenant_1.requireTenantId)();
    const session = await database_1.database.cycleCountSession.update({
      where: {
        tenantId_id: {
          tenantId,
          id: input.id,
        },
      },
      data: {
        ...(input.sessionName !== undefined && {
          sessionName: input.sessionName,
        }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.approvedById !== undefined && {
          approvedById: input.approvedById,
        }),
        ...(input.status === "in_progress" && { startedAt: new Date() }),
        ...(input.status === "completed" && { completedAt: new Date() }),
        ...(input.status === "finalized" && { finalizedAt: new Date() }),
      },
    });
    return {
      success: true,
      session: {
        id: session.id,
        tenantId: session.tenantId,
        locationId: session.locationId,
        sessionId: session.sessionId,
        sessionName: session.sessionName,
        countType: session.countType,
        scheduledDate: session.scheduledDate,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        finalizedAt: session.finalizedAt,
        status: session.status,
        totalItems: session.totalItems,
        countedItems: session.countedItems,
        totalVariance: session.totalVariance.toNumber(),
        variancePercentage: session.variancePercentage.toNumber(),
        notes: session.notes,
        createdById: session.createdById,
        approvedById: session.approvedById,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        deletedAt: session.deletedAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update session",
    };
  }
}
async function deleteCycleCountSession(sessionId) {
  try {
    const tenantId = await (0, tenant_1.requireTenantId)();
    await database_1.database.cycleCountSession.update({
      where: {
        tenantId_id: {
          tenantId,
          id: sessionId,
        },
      },
      data: {
        deletedAt: new Date(),
      },
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete session",
    };
  }
}
