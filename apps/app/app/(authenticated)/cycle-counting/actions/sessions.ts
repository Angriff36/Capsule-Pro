"use server";

import { database } from "@repo/database";
import { requireTenantId } from "../../../lib/tenant";
import type {
  CreateSessionInput,
  CycleCountSession,
  SessionResult,
  UpdateSessionInput,
} from "../types";

function toNumber(value: { toNumber: () => number }): number {
  return value.toNumber();
}

export async function listCycleCountSessions(): Promise<CycleCountSession[]> {
  const tenantId = await requireTenantId();

  const sessions = await database.cycleCountSession.findMany({
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
    countType: session.countType as
      | "ad_hoc"
      | "scheduled_daily"
      | "scheduled_weekly"
      | "scheduled_monthly",
    scheduledDate: session.scheduledDate,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    finalizedAt: session.finalizedAt,
    status: session.status as
      | "draft"
      | "in_progress"
      | "completed"
      | "finalized"
      | "cancelled",
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

export async function getCycleCountSession(
  sessionId: string
): Promise<CycleCountSession | null> {
  const tenantId = await requireTenantId();

  const session = await database.cycleCountSession.findFirst({
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
    countType: session.countType as
      | "ad_hoc"
      | "scheduled_daily"
      | "scheduled_weekly"
      | "scheduled_monthly",
    scheduledDate: session.scheduledDate,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    finalizedAt: session.finalizedAt,
    status: session.status as
      | "draft"
      | "in_progress"
      | "completed"
      | "finalized"
      | "cancelled",
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

export async function createCycleCountSession(
  input: CreateSessionInput
): Promise<SessionResult> {
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

    const session = await database.cycleCountSession.create({
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
        countType: session.countType as
          | "ad_hoc"
          | "scheduled_daily"
          | "scheduled_weekly"
          | "scheduled_monthly",
        scheduledDate: session.scheduledDate,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        finalizedAt: session.finalizedAt,
        status: session.status as
          | "draft"
          | "in_progress"
          | "completed"
          | "finalized"
          | "cancelled",
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

export async function updateCycleCountSession(
  input: UpdateSessionInput
): Promise<SessionResult> {
  try {
    const tenantId = await requireTenantId();

    const session = await database.cycleCountSession.update({
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
        countType: session.countType as
          | "ad_hoc"
          | "scheduled_daily"
          | "scheduled_weekly"
          | "scheduled_monthly",
        scheduledDate: session.scheduledDate,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        finalizedAt: session.finalizedAt,
        status: session.status as
          | "draft"
          | "in_progress"
          | "completed"
          | "finalized"
          | "cancelled",
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

export async function deleteCycleCountSession(
  sessionId: string
): Promise<SessionResult> {
  try {
    const tenantId = await requireTenantId();

    await database.cycleCountSession.update({
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
