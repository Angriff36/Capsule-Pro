"use server";

import { database } from "@repo/database";
import { runManifestCommand } from "@/lib/manifest-command";
import { requireCurrentUser, requireTenantId } from "../../../lib/tenant";
import type {
  FinalizeResult,
  VarianceReport,
  VarianceReportStatus,
} from "../types";

function toNumber(value: { toNumber: () => number }): number {
  return value.toNumber();
}

export async function generateVarianceReports(
  sessionId: string
): Promise<VarianceReport[]> {
  const tenantId = await requireTenantId();
  const user = await requireCurrentUser();

  const records = await database.cycleCountRecord.findMany({
    where: {
      tenantId,
      sessionId,
      deletedAt: null,
    },
  });

  const reports: VarianceReport[] = [];

  for (const record of records) {
    const expectedQuantity = toNumber(record.expectedQuantity);
    const countedQuantity = toNumber(record.countedQuantity);
    const variance = countedQuantity - expectedQuantity;
    const variancePct =
      expectedQuantity > 0 ? Math.abs((variance / expectedQuantity) * 100) : 0;
    const accuracyScore =
      expectedQuantity > 0 ? Math.max(0, 100 - variancePct) : 100;

    // Governed write: VarianceReport.create (constitution §3/§9).
    // The manifest command auto-generates id, sets generatedAt=now(), and
    // status="pending". We read back the created record to return it.
    const result = await runManifestCommand({
      entity: "VarianceReport",
      command: "create",
      body: {
        sessionId,
        reportType: "item_variance",
        itemId: record.itemId,
        itemNumber: record.itemNumber,
        itemName: record.itemName,
        expectedQuantity,
        countedQuantity,
        variance,
        variancePct,
        accuracyScore,
        notes: "",
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
    });

    if (!result.ok) {
      throw new Error(result.message || "Failed to create variance report");
    }

    // Build the report shape expected by the caller.
    // result.result is the persisted entity (unknown-typed) from the runtime.
    const created = result.result as Record<string, unknown> | undefined;
    reports.push({
      id: (created?.id as string) || "",
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
      status: "pending" as VarianceReportStatus,
      adjustmentType: null,
      adjustmentAmount: null,
      adjustmentDate: null,
      notes: null,
      generatedAt: (created?.generatedAt as Date) || new Date(),
      createdAt: (created?.createdAt as Date) || new Date(),
      updatedAt: (created?.updatedAt as Date) || new Date(),
      deletedAt: null,
    });
  }

  return reports;
}

export async function finalizeCycleCountSession(input: {
  sessionId: string;
  approvedById: string;
  notes?: string;
}): Promise<FinalizeResult> {
  try {
    const tenantId = await requireTenantId();
    const user = await requireCurrentUser();

    const session = await database.cycleCountSession.findFirst({
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
    const records = await database.cycleCountRecord.findMany({
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

    // Governed write: CycleCountSession.finalize (constitution §3/§9).
    // The finalize command transitions status -> "finalized" and sets
    // finalizedAt/approvedById/notes/totalVariance/variancePercentage/
    // countedItems/totalItems in a single governed mutation.
    const finalizeResult = await runManifestCommand({
      entity: "CycleCountSession",
      command: "finalize",
      body: {
        userId: user.id,
        notes: input.notes || session.notes || "",
        totalVariance,
        variancePercentage,
        countedItems: records.length,
        totalItems: records.length,
      },
      user: { id: user.id, tenantId: user.tenantId, role: user.role },
      instanceId: input.sessionId,
    });

    if (!finalizeResult.ok) {
      return {
        success: false,
        error: finalizeResult.message || "Failed to finalize session",
      };
    }

    for (const record of records) {
      const expectedQuantity = toNumber(record.expectedQuantity);
      const countedQuantity = toNumber(record.countedQuantity);
      const variance = countedQuantity - expectedQuantity;

      if (variance !== 0) {
        const inventoryItem = await database.inventoryItem.findFirst({
          where: {
            tenantId,
            id: record.itemId,
            deletedAt: null,
          },
        });

        if (inventoryItem) {
          // Governed write: InventoryTransaction.create (constitution §3/§9).
          // TODO: The `reference` property (plain string) is NOT a param on the
          // manifest create command — only referenceType/referenceId are. The
          // session ID is included in `reason` as a fallback. If downstream
          // consumers need the exact `reference` field, either add it to the
          // command params or do a supplementary Prisma update.
          const txResult = await runManifestCommand({
            entity: "InventoryTransaction",
            command: "create",
            body: {
              itemId: record.itemId,
              transactionType: "adjustment",
              quantity: variance,
              unitCost: toNumber(inventoryItem.unitCost),
              referenceType: "cycle_count",
              referenceId: session.id,
              reason: `Cycle count session ${session.sessionId}`,
              notes: "",
              employeeId: "",
              storageLocationId: "",
            },
            user: { id: user.id, tenantId: user.tenantId, role: user.role },
          });

          if (!txResult.ok) {
            throw new Error(
              txResult.message || "Failed to create inventory transaction"
            );
          }

          // Governed write: InventoryItem.adjust (constitution §3/§9).
          // The adjust command takes a delta (quantity = adjustment amount) and
          // sets quantityOnHand = self.quantityOnHand + quantity. Since the
          // countedQuantity is the target absolute value and the current
          // quantityOnHand may have changed, we compute the delta as:
          // countedQuantity - current quantityOnHand.
          const currentOnHand = toNumber(inventoryItem.quantityOnHand);
          const adjustmentDelta = countedQuantity - currentOnHand;

          const adjustResult = await runManifestCommand({
            entity: "InventoryItem",
            command: "adjust",
            body: {
              quantity: adjustmentDelta,
              reason: `Cycle count adjustment for session ${session.sessionId}`,
              userId: user.id,
            },
            user: { id: user.id, tenantId: user.tenantId, role: user.role },
            instanceId: record.itemId,
          });

          if (!adjustResult.ok) {
            throw new Error(
              adjustResult.message || "Failed to adjust inventory item"
            );
          }
        }

        // Governed write: VarianceReport review + approve (constitution §3/§9).
        // The manifest requires status transitions: pending -> reviewed -> approved.
        // The current direct Prisma write skipped "reviewed" and went straight to
        // "approved". We now follow the proper state machine.
        const pendingReports = await database.varianceReport.findMany({
          where: {
            tenantId,
            sessionId: input.sessionId,
            itemId: record.itemId,
            deletedAt: null,
          },
          select: { id: true, status: true },
        });

        const adjustmentType =
          variance > 0 ? "increase" : variance < 0 ? "decrease" : "none";

        for (const report of pendingReports) {
          if (report.status === "pending") {
            const reviewResult = await runManifestCommand({
              entity: "VarianceReport",
              command: "review",
              body: {
                userId: user.id,
                notes: "",
              },
              user: { id: user.id, tenantId: user.tenantId, role: user.role },
              instanceId: report.id,
            });

            if (!reviewResult.ok) {
              // Non-fatal: log but continue approving other reports
              console.warn(
                `Failed to review variance report ${report.id}: ${reviewResult.message}`
              );
              continue;
            }
          }

          if (report.status === "reviewed" || report.status === "pending") {
            const approveResult = await runManifestCommand({
              entity: "VarianceReport",
              command: "approve",
              body: {
                userId: user.id,
                adjustmentType,
                adjustmentAmount: Math.abs(variance),
              },
              user: { id: user.id, tenantId: user.tenantId, role: user.role },
              instanceId: report.id,
            });

            if (!approveResult.ok) {
              console.warn(
                `Failed to approve variance report ${report.id}: ${approveResult.message}`
              );
            }
          }
        }
      }
    }

    // TODO: CycleCountAuditLog has no Manifest entity/commands. Keeping as
    // direct Prisma write until a CycleCountAuditLog entity is added to the
    // manifest DSL. This is an append-only audit log, so the governance gap
    // is low-risk (no state transitions to enforce).
    await database.cycleCountAuditLog.create({
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
      sessionId: input.sessionId,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to finalize session",
    };
  }
}

export async function getAuditLogs(sessionId: string): Promise<
  Array<{
    id: string;
    sessionId: string;
    recordId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    oldValue: Record<string, unknown> | null;
    newValue: Record<string, unknown> | null;
    performedById: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
  }>
> {
  const tenantId = await requireTenantId();

  const logs = await database.cycleCountAuditLog.findMany({
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
    oldValue: log.oldValue as Record<string, unknown> | null,
    newValue: log.newValue as Record<string, unknown> | null,
    performedById: log.performedById,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
  }));
}
