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

  const sessions = await database.cycle_count_sessions.findMany({
    where: {
      tenant_id: tenantId,
      deleted_at: null,
    },
    orderBy: {
      created_at: "desc",
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    tenantId: session.tenant_id,
    locationId: session.location_id,
    sessionId: session.session_id,
    sessionName: session.session_name,
    countType: session.count_type as
      | "ad_hoc"
      | "scheduled_daily"
      | "scheduled_weekly"
      | "scheduled_monthly",
    scheduledDate: session.scheduled_date,
    startedAt: session.started_at,
    completedAt: session.completed_at,
    finalizedAt: session.finalized_at,
    status: session.status as
      | "draft"
      | "in_progress"
      | "completed"
      | "finalized"
      | "cancelled",
    totalItems: session.total_items,
    countedItems: session.counted_items,
    totalVariance: toNumber(session.total_variance),
    variancePercentage: toNumber(session.variance_percentage),
    notes: session.notes,
    createdById: session.created_by_id,
    approvedById: session.approved_by_id,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    deletedAt: session.deleted_at,
  }));
}

export async function getCycleCountSession(
  sessionId: string
): Promise<CycleCountSession | null> {
  const tenantId = await requireTenantId();

  const session = await database.cycle_count_sessions.findFirst({
    where: {
      tenant_id: tenantId,
      session_id: sessionId,
      deleted_at: null,
    },
  });

  if (!session) {
    return null;
  }

  return {
    id: session.id,
    tenantId: session.tenant_id,
    locationId: session.location_id,
    sessionId: session.session_id,
    sessionName: session.session_name,
    countType: session.count_type as
      | "ad_hoc"
      | "scheduled_daily"
      | "scheduled_weekly"
      | "scheduled_monthly",
    scheduledDate: session.scheduled_date,
    startedAt: session.started_at,
    completedAt: session.completed_at,
    finalizedAt: session.finalized_at,
    status: session.status as
      | "draft"
      | "in_progress"
      | "completed"
      | "finalized"
      | "cancelled",
    totalItems: session.total_items,
    countedItems: session.counted_items,
    totalVariance: toNumber(session.total_variance),
    variancePercentage: toNumber(session.variance_percentage),
    notes: session.notes,
    createdById: session.created_by_id,
    approvedById: session.approved_by_id,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    deletedAt: session.deleted_at,
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

    const session = await database.cycle_count_sessions.create({
      data: {
        tenant_id: tenantId,
        location_id: input.locationId,
        session_id: crypto.randomUUID(),
        session_name: input.sessionName,
        count_type: input.countType,
        scheduled_date: input.scheduledDate || null,
        notes: input.notes || null,
        created_by_id: user.id,
        total_items: 0,
        counted_items: 0,
        total_variance: 0,
        variance_percentage: 0,
      },
    });

    return {
      success: true,
      session: {
        id: session.id,
        tenantId: session.tenant_id,
        locationId: session.location_id,
        sessionId: session.session_id,
        sessionName: session.session_name,
        countType: session.count_type as
          | "ad_hoc"
          | "scheduled_daily"
          | "scheduled_weekly"
          | "scheduled_monthly",
        scheduledDate: session.scheduled_date,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        finalizedAt: session.finalized_at,
        status: session.status as
          | "draft"
          | "in_progress"
          | "completed"
          | "finalized"
          | "cancelled",
        totalItems: session.total_items,
        countedItems: session.counted_items,
        totalVariance: session.total_variance.toNumber(),
        variancePercentage: session.variance_percentage.toNumber(),
        notes: session.notes,
        createdById: session.created_by_id,
        approvedById: session.approved_by_id,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        deletedAt: session.deleted_at,
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

    const session = await database.cycle_count_sessions.update({
      where: {
        tenant_id_id: {
          tenant_id: tenantId,
          id: input.id,
        },
      },
      data: {
        ...(input.sessionName !== undefined && {
          session_name: input.sessionName,
        }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.approvedById !== undefined && {
          approved_by_id: input.approvedById,
        }),
        ...(input.status === "in_progress" && { started_at: new Date() }),
        ...(input.status === "completed" && { completed_at: new Date() }),
        ...(input.status === "finalized" && { finalized_at: new Date() }),
      },
    });

    return {
      success: true,
      session: {
        id: session.id,
        tenantId: session.tenant_id,
        locationId: session.location_id,
        sessionId: session.session_id,
        sessionName: session.session_name,
        countType: session.count_type as
          | "ad_hoc"
          | "scheduled_daily"
          | "scheduled_weekly"
          | "scheduled_monthly",
        scheduledDate: session.scheduled_date,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        finalizedAt: session.finalized_at,
        status: session.status as
          | "draft"
          | "in_progress"
          | "completed"
          | "finalized"
          | "cancelled",
        totalItems: session.total_items,
        countedItems: session.counted_items,
        totalVariance: session.total_variance.toNumber(),
        variancePercentage: session.variance_percentage.toNumber(),
        notes: session.notes,
        createdById: session.created_by_id,
        approvedById: session.approved_by_id,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        deletedAt: session.deleted_at,
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

    await database.cycle_count_sessions.update({
      where: {
        tenant_id_id: {
          tenant_id: tenantId,
          id: sessionId,
        },
      },
      data: {
        deleted_at: new Date(),
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
