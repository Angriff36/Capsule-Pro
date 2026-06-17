"use server";
import { listCycleCountSessions } from "@/app/lib/manifest-client.generated";

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

  const sessions = (await listCycleCountSessions()).data;

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

  const session = (await listCycleCountSessions()).data[0] ?? null;

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
      return {
        success: false,
        error: result.message || "Failed to create session",
      };
    }

    // Post-command read to materialize return shape (constitution §10)
    const created = (await listCycleCountSessions()).data[0] ?? null;

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
 * All mutations go through Manifest runtime governance:
 *   - Status transitions: CycleCountSession.start / complete / finalize / cancel
 *   - Field edits (sessionName, notes): CycleCountSession.update
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
        return {
          success: false,
          error: `Unsupported status transition: ${input.status}`,
        };
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
        return {
          success: false,
          error: result.message || `Failed to ${command} session`,
        };
      }
    }

    // Field-only edits (sessionName, notes) without status change — governed via update command
    if (
      input.status === undefined &&
      (input.sessionName !== undefined || input.notes !== undefined)
    ) {
      const updateResult = await runManifestCommand({
        entity: "CycleCountSession",
        command: "update",
        instanceId: input.id,
        body: {
          sessionName: input.sessionName ?? "",
          notes: input.notes ?? "",
          userId: user.id,
        },
        user: { id: user.id, tenantId: user.tenantId, role: user.role },
      });

      if (!updateResult.ok) {
        return {
          success: false,
          error: updateResult.message || "Failed to update session",
        };
      }
    }

    // Post-command read to materialize return shape
    const session = (await listCycleCountSessions()).data[0] ?? null;

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
 * Governed via Manifest runtime (CycleCountSession.softDelete).
 * Pre-validation read (existence + finalized check) kept as direct Prisma
 * for user-friendly error messages (constitution §10).
 */
export async function deleteCycleCountSession(
  sessionId: string
): Promise<SessionResult> {
  try {
    const user = await requireCurrentUser();

    // Pre-validation read — constitution §10 allows reads to bypass runtime
    const session = (await listCycleCountSessions()).data[0] ?? null;

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

    const result = await runManifestCommand({
      entity: "CycleCountSession",
      command: "softDelete",
      instanceId: sessionId,
      body: {
        userId: user.id,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!result.ok) {
      return {
        success: false,
        error: result.message || "Failed to delete session",
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete session",
    };
  }
}
