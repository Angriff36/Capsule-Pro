/**
 * Cycle Count Finalization API Endpoint
 *
 * POST /api/inventory/cycle-count/sessions/[sessionId]/finalize - Finalize a session
 *
 * All mutations run through governed Manifest runtime (constitution §3/§9):
 * - VarianceReport.create (per record)
 * - InventoryTransaction.create (for variance adjustments)
 * - InventoryItem.adjust (quantity correction)
 * - VarianceReport.review + approve (state machine: pending→reviewed→approved)
 * - CycleCountSession.finalize (expanded command with summary fields)
 * Reads (session/record/item lookups) bypass Manifest per constitution §10.
 * CycleCountAuditLog.create remains direct Prisma — no Manifest entity exists.
 */

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { log } from "@repo/observability/log";
import { captureException } from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { InvariantError } from "@/app/lib/invariant";
import { resolveCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

function toNumber(value: { toNumber: () => number }): number {
  return value.toNumber();
}

function getAdjustmentType(variance: number): "increase" | "decrease" | "none" {
  if (variance > 0) {
    return "increase";
  }
  if (variance < 0) {
    return "decrease";
  }
  return "none";
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/inventory/cycle-count/sessions/[sessionId]/finalize - Finalize a session
 *
 * Governed flow:
 * 1. Generate variance reports via VarianceReport.create (per record)
 * 2. Create inventory adjustments via InventoryTransaction.create
 * 3. Adjust inventory quantities via InventoryItem.adjust
 * 4. Review + approve variance reports (state machine: pending→reviewed→approved)
 * 5. Finalize session via CycleCountSession.finalize (status + summary fields)
 * 6. Append audit log (direct Prisma — no Manifest entity)
 */

export const runtime = "nodejs";

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await resolveCurrentUser(request);

    const { id: sessionId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    // Find the session by sessionId (not id) — read, constitution §10
    const session = await database.cycleCountSession.findFirst({
      where: {
        tenantId: user.tenantId,
        sessionId,
        deletedAt: null,
      },
    });

    if (!session) {
      return NextResponse.json(
        { message: "Session not found" },
        { status: 404 }
      );
    }

    if (session.status === "finalized") {
      return NextResponse.json(
        { message: "Session already finalized" },
        { status: 400 }
      );
    }

    // Fetch all records for this session — read, constitution §10
    const records = await database.cycleCountRecord.findMany({
      where: {
        tenantId: user.tenantId,
        sessionId: session.id,
        deletedAt: null,
      },
    });

    // Calculate total variance
    let totalVariance = 0;
    let totalExpected = 0;

    for (const record of records) {
      totalVariance += toNumber(record.variance);
      totalExpected += toNumber(record.expectedQuantity);
    }

    const variancePercentage =
      totalExpected > 0 ? Math.abs((totalVariance / totalExpected) * 100) : 0;

    // Governed: VarianceReport.create per record (constitution §3/§9)
    for (const record of records) {
      const expectedQuantity = toNumber(record.expectedQuantity);
      const countedQuantity = toNumber(record.countedQuantity);
      const variance = countedQuantity - expectedQuantity;
      const variancePct =
        expectedQuantity > 0
          ? Math.abs((variance / expectedQuantity) * 100)
          : 0;
      const accuracyScore =
        expectedQuantity > 0 ? Math.max(0, 100 - variancePct) : 100;

      const vrResult = await runManifestCommandCore(
        {
          createRuntime: ({ user: u, entityName }) =>
            createManifestRuntime({
              user: { id: u.id, tenantId: u.tenantId, role: u.role },
              entityName,
            }),
        },
        {
          entity: "VarianceReport",
          command: "create",
          body: {
            sessionId: session.id,
            reportType: "item_variance",
            itemId: record.itemId,
            itemNumber: record.itemNumber ?? "",
            itemName: record.itemName ?? "",
            expectedQuantity,
            countedQuantity,
            variance,
            variancePct,
            accuracyScore,
            notes: "",
          },
          user: { id: user.id, tenantId: user.tenantId, role: user.role },
        }
      );

      if (!vrResult.ok) {
        log.error("Failed to create variance report", {
          itemId: record.itemId,
          error: vrResult.message,
        });
      }
    }

    // Governed: inventory adjustments for records with variance (constitution §3/§9)
    for (const record of records) {
      const expectedQuantity = toNumber(record.expectedQuantity);
      const countedQuantity = toNumber(record.countedQuantity);
      const variance = countedQuantity - expectedQuantity;

      if (variance === 0) {
        continue;
      }

      // Read inventory item — constitution §10
      const inventoryItem = await database.inventoryItem.findFirst({
        where: {
          tenantId: user.tenantId,
          id: record.itemId,
          deletedAt: null,
        },
      });

      if (!inventoryItem) {
        continue;
      }

      // Governed: InventoryTransaction.create (constitution §3/§9)
      const txResult = await runManifestCommandCore(
        {
          createRuntime: ({ user: u, entityName }) =>
            createManifestRuntime({
              user: { id: u.id, tenantId: u.tenantId, role: u.role },
              entityName,
            }),
        },
        {
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
            storageLocationId: record.storageLocationId || "",
          },
          user: { id: user.id, tenantId: user.tenantId, role: user.role },
        }
      );

      if (!txResult.ok) {
        log.error("Failed to create inventory transaction", {
          itemId: record.itemId,
          error: txResult.message,
        });
      }

      // Governed: InventoryItem.adjust (constitution §3/§9)
      const currentOnHand = toNumber(inventoryItem.quantityOnHand);
      const adjustmentDelta = countedQuantity - currentOnHand;

      const adjustResult = await runManifestCommandCore(
        {
          createRuntime: ({ user: u, entityName }) =>
            createManifestRuntime({
              user: { id: u.id, tenantId: u.tenantId, role: u.role },
              entityName,
            }),
        },
        {
          entity: "InventoryItem",
          command: "adjust",
          body: {
            quantity: adjustmentDelta,
            reason: `Cycle count adjustment for session ${session.sessionId}`,
            userId: user.id,
          },
          user: { id: user.id, tenantId: user.tenantId, role: user.role },
          instanceId: record.itemId,
        }
      );

      if (!adjustResult.ok) {
        log.error("Failed to adjust inventory item", {
          itemId: record.itemId,
          error: adjustResult.message,
        });
      }

      // Governed: VarianceReport review + approve (state machine, constitution §3/§9)
      const pendingReports = await database.varianceReport.findMany({
        where: {
          tenantId: user.tenantId,
          sessionId: session.id,
          itemId: record.itemId,
          deletedAt: null,
        },
        select: { id: true, status: true },
      });

      const adjustmentType = getAdjustmentType(variance);

      for (const report of pendingReports) {
        if (report.status === "pending") {
          const reviewResult = await runManifestCommandCore(
            {
              createRuntime: ({ user: u, entityName }) =>
                createManifestRuntime({
                  user: { id: u.id, tenantId: u.tenantId, role: u.role },
                  entityName,
                }),
            },
            {
              entity: "VarianceReport",
              command: "review",
              body: {
                userId: user.id,
                notes: "",
              },
              user: { id: user.id, tenantId: user.tenantId, role: user.role },
              instanceId: report.id,
            }
          );

          if (!reviewResult.ok) {
            log.error("Failed to review variance report", {
              reportId: report.id,
              error: reviewResult.message,
            });
            continue;
          }
        }

        if (report.status === "reviewed" || report.status === "pending") {
          const approveResult = await runManifestCommandCore(
            {
              createRuntime: ({ user: u, entityName }) =>
                createManifestRuntime({
                  user: { id: u.id, tenantId: u.tenantId, role: u.role },
                  entityName,
                }),
            },
            {
              entity: "VarianceReport",
              command: "approve",
              body: {
                userId: user.id,
                adjustmentType,
                adjustmentAmount: Math.abs(variance),
              },
              user: { id: user.id, tenantId: user.tenantId, role: user.role },
              instanceId: report.id,
            }
          );

          if (!approveResult.ok) {
            log.error("Failed to approve variance report", {
              reportId: report.id,
              error: approveResult.message,
            });
          }
        }
      }
    }

    // Governed: CycleCountSession.finalize with summary fields (constitution §3/§9).
    // The expanded finalize command now handles status + finalizedAt + approvedById +
    // notes + totalVariance + variancePercentage + countedItems + totalItems.
    const manifestResult = await runManifestCommandCore(
      {
        createRuntime: ({ user: u, entityName }) =>
          createManifestRuntime({
            user: { id: u.id, tenantId: u.tenantId, role: u.role },
            entityName,
          }),
      },
      {
        entity: "CycleCountSession",
        command: "finalize",
        body: {
          userId: user.id,
          notes: (body.notes as string) || session.notes || "",
          totalVariance,
          variancePercentage,
          countedItems: records.length,
          totalItems: records.length,
        },
        user: { id: user.id, tenantId: user.tenantId, role: user.role },
        instanceId: session.id,
      }
    );

    // If manifest command returned an error, forward it
    if (!manifestResult.ok) {
      return NextResponse.json(
        { message: manifestResult.message },
        { status: manifestResult.httpStatus }
      );
    }

    // CycleCountAuditLog has no Manifest entity — direct Prisma append-only.
    // Low governance gap: no state transitions to enforce (infrastructure audit trail).
    await database.cycleCountAuditLog.create({
      data: {
        tenantId: user.tenantId,
        sessionId: session.id,
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
        performedById: user.id,
        ipAddress: null,
        userAgent: null,
      },
    });

    return NextResponse.json({
      id: session.id,
      session_id: session.sessionId,
      status: "finalized",
      total_variance: totalVariance,
      variance_percentage: variancePercentage,
      finalized_at: new Date(),
    });
  } catch (error) {
    captureException(error);
    if (error instanceof InvariantError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    log.error("Failed to finalize cycle count session:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
