"use server";

import { database } from "@repo/database";
import { runManifestCommand } from "@/lib/manifest-command";
import { requireCurrentUser, requireTenantId } from "../../../lib/tenant";
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
    const user = await requireCurrentUser();

    const result = await runManifestCommand({
      entity: "CycleCountSession",
      command: "create",
      body: {
        locationId: input.locationId,
        sessionId: crypto.randomUUID(),
        sessionName: input.sessionName,
        countType: input.countType,
        scheduledDate: input.scheduledDate || "",
        notes: input.notes || "",
        userId: user.id,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!result.ok) {
      return { success: false, error: result.message || "Failed to create session" };
    }

    // Post-command read to materialize return shape (constitution §10)
    const created = await database.cycleCountSession.findUnique({
      where: {
        tenantId_id: { tenantId: user.tenantId, id: (result.result as { id?: string })?.id ?? "" },
      },
    });

    if (!created) {
      return { success: false, error: "Created session not found" };
    }

    return {
      success: true,
      session: {
        id: created.id,
        tenantId: created.tenantId,
        locationId: created.locationId,
        sessionId: created.sessionId,
        sessionName: created.sessionName,
        countType: created.countType as
          | "ad_hoc"
          | "scheduled_daily"
          | "scheduled_weekly"
          | "scheduled_monthly",
        scheduledDate: created.scheduledDate,
        startedAt: created.startedAt,
        completedAt: created.completedAt,
        finalizedAt: created.finalizedAt,
        status: created.status as
          | "draft"
          | "in_progress"
          | "completed"
          | "finalized"
          | "cancelled",
        totalItems: created.totalItems,
        countedItems: created.countedItems,
        totalVariance: created.totalVariance.toNumber(),
        variancePercentage: created.variancePercentage.toNumber(),
        notes: created.notes,
        createdById: created.createdById,
        approvedById: created.approvedById,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        deletedAt: created.deletedAt,
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

/**
 * Update a cycle count session.
 *
 * Status transitions are governed via Manifest commands:
 *   - "in_progress" -> CycleCountSession.start
 *   - "completed"   -> CycleCountSession.complete
 *   - "finalized"   -> CycleCountSession.finalize
 *   - "cancelled"   -> CycleCountSession.cancel
 *
 * Field-only edits (sessionName, notes) without a status change remain as
 * direct Prisma because no generic `update` command exists in the IR.
 */
export async function updateCycleCountSession(
  input: UpdateSessionInput
): Promise<SessionResult> {
  try {
    const user = await requireCurrentUser();
    const tenantId = user.tenantId;

    // Status transitions go through governed commands
    if (input.status !== undefined) {
      const commandMap: Record<string, string> = {
        in_progress: "start",
        completed: "complete",
        finalized: "finalize",
        cancelled: "cancel",
      };

      const command = commandMap[input.status];
      if (!command) {
        return { success: false, error: `Unsupported status transition: ${input.status}` };
      }

      const body: Record<string, unknown> = {
        userId: user.id,
      };

      // cancel command takes a reason param; use notes if provided
      if (command === "cancel" && input.notes !== undefined) {
        body.reason = input.notes;
      }

      const result = await runManifestCommand({
        entity: "CycleCountSession",
        command,
        instanceId: input.id,
        body,
        user: { id: user.id, tenantId: user.tenantId, role: user.role },
      });

      if (!result.ok) {
        return { success: false, error: result.message || `Failed to ${command} session` };
      }
    }

    // Field-only edits (sessionName, notes) without status change stay as direct Prisma
    if (input.status === undefined && (input.sessionName !== undefined || input.notes !== undefined)) {
      await database.cycleCountSession.update({
        where: {
          tenantId_id: { tenantId, id: input.id },
        },
        data: {
          ...(input.sessionName !== undefined && { sessionName: input.sessionName }),
          ...(input.notes !== undefined && { notes: input.notes }),
        },
      });
    }

    // Post-command read to materialize return shape
    const session = await database.cycleCountSession.findUnique({
      where: {
        tenantId_id: { tenantId, id: input.id },
      },
    });

    if (!session) {
      return { success: false, error: "Session not found after update" };
    }

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

/**
 * Soft-delete a cycle count session.
 *
 * No governed `remove`/`softDelete` command exists in the IR for
 * CycleCountSession, so this remains a direct Prisma write. The business
 * guard (no deleting finalized sessions) is enforced locally.
 */
export async function deleteCycleCountSession(
  sessionId: string
): Promise<SessionResult> {
  try {
    const tenantId = await requireTenantId();

    const session = await database.cycleCountSession.findUnique({
      where: {
        tenantId_id: { tenantId, id: sessionId },
      },
      select: { status: true, id: true },
    });

    if (!session) {
      return { success: false, error: "Session not found" };
    }

    if (session.status === "finalized") {
      return {
        success: false,
        error:
          "Cannot delete a finalized cycle count session. Adjustments have already been applied to inventory.",
      };
    }

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
