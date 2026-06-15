/**
 * Prisma-backed store for Manifest entities
 *
 * This module provides Store implementations that persist Manifest entities
 * using the existing Prisma schema. It bridges the gap between Manifest's entity
 * model and the Prisma database tables.
 */

import type { Store } from "@angriff36/manifest";
import type {
  KitchenTask,
  KitchenTaskClaim,
  PrepTask,
  PrepTaskPlanWorkflow,
  Prisma,
  PrismaClient,
  Station,
} from "@repo/database/standalone";
import {
  createGenericPrismaStore,
  type PrismaClientLike,
} from "./generated/prisma-store-registry.generated";
import { EventPrismaStore } from "./prisma-stores/event-prisma-store";
import { InventoryTransferPrismaStore } from "./prisma-stores/inventory-transfer-prisma-store";

// Re-export stores that are used internally AND re-exported from index.ts

/**
 * Report a silent store error to Sentry without blocking the return path.
 * Uses dynamic import so this module doesn't hard-depend on @sentry/nextjs.
 */
function reportStoreError(error: unknown, store: string, op: string): void {
  import("@sentry/node")
    .then(({ captureException }) => {
      captureException(error, {
        tags: { source: "prisma-store", store, op },
      });
    })
    .catch(() => {
      // Sentry not available — swallow to avoid infinite loops
    });
}

/** Shorthand used inside Store classes — derives the store name from the class name. */
function reportOp(
  self: { constructor: { name: string } },
  op: string,
  error: unknown
): void {
  reportStoreError(error, self.constructor.name, op);
}

export interface EntityInstance {
  id: string;
  [key: string]: unknown;
}

interface PrepTaskWithClaims extends PrepTask {
  claims: KitchenTaskClaim[];
}

/**
 * Prisma-backed store for PrepTask entities
 *
 * Maps Manifest PrepTask entities to the Prisma PrepTask and KitchenTaskClaim tables.
 * The Manifest entity has inline claimedBy/claimedAt fields, while Prisma uses a
 * separate KitchenTaskClaim table for tracking claims.
 */
export class PrepTaskPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    // Fetch all prep tasks for this tenant
    const tasks = await this.prisma.prepTask.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
    });

    // Return mapped entities (claims will be fetched on-demand if needed)
    return tasks.map((task) => this.mapToManifestEntity(task as PrepTask, []));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const task = await this.prisma.prepTask.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });

    if (!task) {
      return;
    }

    // Fetch active claims
    const claims = await this.prisma.kitchenTaskClaim.findMany({
      where: { tenantId: this.tenantId, taskId: id, releasedAt: null },
      orderBy: { claimedAt: "desc" },
      take: 1,
    });

    return this.mapToManifestEntity(task, claims);
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const task = await this.prisma.prepTask.create({
      data: {
        tenantId: this.tenantId,
        id: data.id as string,
        eventId: data.eventId as string,
        locationId: (data.locationId as string) || "",
        name: data.name as string,
        taskType: (data.taskType as string) || "prep",
        status: (data.status as string) || "pending",
        priority: (data.priority as number) || 5,
        quantityTotal: data.quantityTotal as number,
        quantityUnitId: (data.quantityUnitId as number) || null,
        quantityCompleted: (data.quantityCompleted as number) || 0,
        servingsTotal: data.servingsTotal as number | null,
        startByDate: data.startByDate
          ? new Date(data.startByDate as number)
          : new Date(),
        dueByDate: data.dueByDate
          ? new Date(data.dueByDate as number)
          : new Date(),
        notes: data.notes as string | null,
      },
    });

    // If task has claim info, create a claim record
    if (data.claimedBy && data.claimedAt) {
      await this.prisma.kitchenTaskClaim.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: this.tenantId,
          taskId: task.id,
          employeeId: data.claimedBy as string,
          claimedAt: new Date(data.claimedAt as number),
        },
      });
    }

    return this.mapToManifestEntity(task, []);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    // First, get the existing task
    const existing = await this.prisma.prepTask.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });

    if (!existing) {
      return;
    }

    // Update the task
    const updated = await this.prisma.prepTask.update({
      where: { tenantId_id: { tenantId: this.tenantId, id } },
      data: {
        status: data.status as string | undefined,
        priority: data.priority as number | undefined,
        quantityCompleted: data.quantityCompleted as number | undefined,
        quantityTotal: data.quantityTotal as number | undefined,
        actualMinutes: data.actualMinutes as number | undefined,
        notes: data.notes as string | undefined,
        updatedAt: new Date(),
      },
    });

    // Handle claim changes
    const activeClaim = await this.prisma.kitchenTaskClaim.findFirst({
      where: { tenantId: this.tenantId, taskId: id, releasedAt: null },
    });

    const newClaimedBy = data.claimedBy as string | undefined;

    if (newClaimedBy && !activeClaim) {
      // Create new claim
      await this.prisma.kitchenTaskClaim.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: this.tenantId,
          taskId: id,
          employeeId: newClaimedBy,
          claimedAt: data.claimedAt
            ? new Date(data.claimedAt as number)
            : new Date(),
        },
      });
    } else if (!newClaimedBy && activeClaim && data.status === "open") {
      // Release existing claim - use compound unique key
      await this.prisma.kitchenTaskClaim.update({
        where: { tenantId_id: { tenantId: this.tenantId, id: activeClaim.id } },
        data: {
          releasedAt: new Date(),
          releaseReason: data.releaseReason as string | undefined,
        },
      });
    } else if (
      newClaimedBy &&
      activeClaim &&
      newClaimedBy !== activeClaim.employeeId
    ) {
      // Reassign: release old claim, create new one
      await this.prisma.kitchenTaskClaim.update({
        where: { tenantId_id: { tenantId: this.tenantId, id: activeClaim.id } },
        data: { releasedAt: new Date() },
      });

      await this.prisma.kitchenTaskClaim.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: this.tenantId,
          taskId: id,
          employeeId: newClaimedBy,
          claimedAt: data.claimedAt
            ? new Date(data.claimedAt as number)
            : new Date(),
        },
      });
    }

    return this.mapToManifestEntity(updated, []);
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.prepTask.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { deletedAt: new Date() },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.prepTask.updateMany({
      where: { tenantId: this.tenantId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Map Prisma PrepTask to Manifest PrepTask entity
   */
  private mapToManifestEntity(
    task: PrepTask,
    claims: KitchenTaskClaim[]
  ): EntityInstance {
    const activeClaim = claims[0];

    return {
      id: task.id,
      tenantId: task.tenantId,
      eventId: task.eventId,
      name: task.name,
      taskType: task.taskType,
      status: this.mapStatus(task.status),
      priority: task.priority,
      quantityTotal: Number(task.quantityTotal),
      quantityUnitId: task.quantityUnitId ?? 0,
      quantityCompleted: Number(task.quantityCompleted),
      servingsTotal: task.servingsTotal ?? 0,
      startByDate: task.startByDate ? task.startByDate.getTime() : 0,
      dueByDate: task.dueByDate ? task.dueByDate.getTime() : 0,
      notes: task.notes ?? "",
      stationId: "",
      claimedBy: activeClaim?.employeeId ?? "",
      claimedAt: activeClaim?.claimedAt ? activeClaim.claimedAt.getTime() : 0,
      createdAt: task.createdAt?.getTime() ?? 0,
      updatedAt: task.updatedAt?.getTime() ?? 0,
    };
  }

  /**
   * Map Prisma status to Manifest status
   */
  private mapStatus(status: string): string {
    const statusMap: Record<string, string> = {
      pending: "open",
      in_progress: "in_progress",
      done: "done",
      completed: "done",
      canceled: "canceled",
    };
    return statusMap[status] ?? status;
  }
}

/**
 * Prisma-backed store for KitchenTask entities
 *
 * Maps Manifest KitchenTask entities to the Prisma KitchenTask table.
 * Unlike PrepTask, KitchenTask is a general-purpose task (not event-driven).
 * Status values pass through directly (no remapping) since the manifest
 * uses the same values as the DB: pending, in_progress, done, cancelled.
 */
export class KitchenTaskPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const tasks = (await this.prisma.kitchenTask.findMany({
      where: { tenantId: this.tenantId },
    })) as KitchenTask[];

    // Fetch claims in batch (not N+1 - uses single IN query)
    const taskIds = tasks.map((t) => t.id);
    const claims =
      taskIds.length > 0
        ? await this.prisma.kitchenTaskClaim.findMany({
            where: {
              tenantId: this.tenantId,
              taskId: { in: taskIds },
              releasedAt: null,
            },
            orderBy: { claimedAt: "desc" },
          })
        : [];

    const claimsByTaskId = new Map<string, KitchenTaskClaim[]>();
    for (const claim of claims) {
      const existing = claimsByTaskId.get(claim.taskId) || [];
      existing.push(claim);
      claimsByTaskId.set(claim.taskId, existing);
    }

    return tasks.map((task) =>
      this.mapToManifestEntity(task, claimsByTaskId.get(task.id) || [])
    );
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const task = await this.prisma.kitchenTask.findFirst({
      where: { tenantId: this.tenantId, id },
    });

    if (!task) {
      console.error(
        `[KitchenTaskPrismaStore] getById(${id}) returned null for tenant ${this.tenantId}`
      );
      return;
    }

    const claims = await this.prisma.kitchenTaskClaim.findMany({
      where: { tenantId: this.tenantId, taskId: id, releasedAt: null },
      orderBy: { claimedAt: "desc" },
      take: 1,
    });

    return this.mapToManifestEntity(task, claims);
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const task = await this.prisma.kitchenTask.create({
      data: {
        tenantId: this.tenantId,
        id: data.id as string,
        title: (data.title as string) || "",
        summary: (data.summary as string) || "",
        status: (data.status as string) || "pending",
        priority: (data.priority as number) || 5,
        complexity: (data.complexity as number) || 5,
        tags: toStringArray(data.tags),
        dueDate: data.dueDate ? new Date(data.dueDate as number) : undefined,
        completedAt: data.completedAt
          ? new Date(data.completedAt as number)
          : undefined,
      },
    });

    if (data.claimedBy && data.claimedAt) {
      await this.prisma.kitchenTaskClaim.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: this.tenantId,
          taskId: task.id,
          employeeId: data.claimedBy as string,
          claimedAt: new Date(data.claimedAt as number),
        },
      });
    }

    return this.mapToManifestEntity(task, []);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    const existing = await this.prisma.kitchenTask.findFirst({
      where: { tenantId: this.tenantId, id },
    });

    if (!existing) {
      console.error(
        `[KitchenTaskPrismaStore] update(${id}) — task not found for tenant ${this.tenantId}`
      );
      return;
    }

    const updated = await this.prisma.kitchenTask.update({
      where: { tenantId_id: { tenantId: this.tenantId, id } },
      data: {
        status: data.status as string | undefined,
        priority: data.priority as number | undefined,
        complexity: data.complexity as number | undefined,
        title: data.title as string | undefined,
        summary: data.summary as string | undefined,
        tags: toStringArrayOrUndefined(data.tags),
        dueDate: data.dueDate ? new Date(data.dueDate as number) : undefined,
        completedAt: data.completedAt
          ? new Date(data.completedAt as number)
          : undefined,
        updatedAt: new Date(),
      },
    });

    const activeClaim = await this.prisma.kitchenTaskClaim.findFirst({
      where: { tenantId: this.tenantId, taskId: id, releasedAt: null },
    });

    const newClaimedBy = data.claimedBy as string | undefined;

    if (newClaimedBy && !activeClaim) {
      await this.prisma.kitchenTaskClaim.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: this.tenantId,
          taskId: id,
          employeeId: newClaimedBy,
          claimedAt: data.claimedAt
            ? new Date(data.claimedAt as number)
            : new Date(),
        },
      });
    } else if (!newClaimedBy && activeClaim) {
      await this.prisma.kitchenTaskClaim.update({
        where: { tenantId_id: { tenantId: this.tenantId, id: activeClaim.id } },
        data: {
          releasedAt: new Date(),
          releaseReason: data.releaseReason as string | undefined,
        },
      });
    } else if (
      newClaimedBy &&
      activeClaim &&
      newClaimedBy !== activeClaim.employeeId
    ) {
      await this.prisma.kitchenTaskClaim.update({
        where: { tenantId_id: { tenantId: this.tenantId, id: activeClaim.id } },
        data: { releasedAt: new Date() },
      });

      await this.prisma.kitchenTaskClaim.create({
        data: {
          id: crypto.randomUUID(),
          tenantId: this.tenantId,
          taskId: id,
          employeeId: newClaimedBy,
          claimedAt: data.claimedAt
            ? new Date(data.claimedAt as number)
            : new Date(),
        },
      });
    }

    const claims = await this.prisma.kitchenTaskClaim.findMany({
      where: { tenantId: this.tenantId, taskId: id, releasedAt: null },
      orderBy: { claimedAt: "desc" },
      take: 1,
    });

    return this.mapToManifestEntity(updated, claims);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.prisma.kitchenTask.findFirst({
      where: { tenantId: this.tenantId, id },
    });

    if (!existing) {
      return false;
    }

    await this.prisma.kitchenTask.delete({
      where: { tenantId_id: { tenantId: this.tenantId, id } },
    });

    return true;
  }

  async clear(): Promise<void> {
    // No-op for Prisma stores — we don't bulk-delete production data
  }

  private mapToManifestEntity(
    task: KitchenTask,
    claims: KitchenTaskClaim[] = []
  ): EntityInstance {
    const activeClaim = claims[0];

    return {
      id: task.id,
      tenantId: task.tenantId,
      title: task.title,
      summary: task.summary,
      status: task.status, // No remapping — manifest uses same values as DB
      priority: task.priority,
      complexity: task.complexity,
      tags: typeof task.tags === "string" ? task.tags : "",
      dueDate: task.dueDate ? task.dueDate.getTime() : 0,
      completedAt: task.completedAt ? task.completedAt.getTime() : 0,
      claimedBy: activeClaim?.employeeId ?? "",
      claimedAt: activeClaim?.claimedAt.getTime() ?? 0,
      createdAt: task.createdAt?.getTime() ?? 0,
      updatedAt: task.updatedAt?.getTime() ?? 0,
    };
  }
}

/**
 * Prisma-backed store for PrepTaskPlanWorkflow entities
 *
 * Backs the 16 lifecycle command routes for the prep-task plan pipeline
 * (generate -> review -> approve -> instantiate tasks -> schedule windows).
 *
 * Why this exists: prior to this store, command routes wrote workflow state
 * via `PrismaJsonStore` (the generic `manifest_entities` JSON blob table),
 * but read routes (`/api/kitchen/prep-task-plan-workflows/*`) queried the
 * dedicated `tenant_kitchen.prep_task_plan_workflows` table. Writes and
 * reads never connected — every workflow created via a command was invisible
 * to the UI. This store closes that mismatch.
 *
 * Field mapping: every manifest property is stored 1:1 (same name) in the
 * dedicated table; JSON-shaped properties (generatedTasks, scheduledWindows,
 * errors, etc.) are typed as `string` in the manifest and stored as TEXT in
 * Postgres holding serialized JSON payloads (e.g. `"[]"`, `"{}"`).
 */
export class PrepTaskPlanWorkflowPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const rows = await this.prisma.prepTaskPlanWorkflow.findMany({
      where: { tenantId: this.tenantId },
    });
    return rows.map((r) => this.mapToManifestEntity(r));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const row = await this.prisma.prepTaskPlanWorkflow.findFirst({
      where: { tenantId: this.tenantId, id },
    });
    return row ? this.mapToManifestEntity(row) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const id = (data.id as string | undefined) ?? crypto.randomUUID();
    const now = new Date();
    const created = await this.prisma.prepTaskPlanWorkflow.create({
      data: {
        tenantId: this.tenantId,
        id,
        eventId: (data.eventId as string) ?? "",
        idempotencyKey: (data.idempotencyKey as string) ?? id,
        status: (data.status as string) ?? "created",
        currentStep: (data.currentStep as number) ?? 0,
        totalSteps: (data.totalSteps as number) ?? 5,
        generationOptions: (data.generationOptions as string) ?? "{}",
        generatedTasks: (data.generatedTasks as string) ?? "[]",
        reviewedTasks: (data.reviewedTasks as string) ?? "[]",
        approvedTaskIds: (data.approvedTaskIds as string) ?? "[]",
        rejectedTaskIds: (data.rejectedTaskIds as string) ?? "[]",
        instantiatedTaskIds: (data.instantiatedTaskIds as string) ?? "[]",
        scheduledWindows: (data.scheduledWindows as string) ?? "{}",
        constraintOutcomes: (data.constraintOutcomes as string) ?? "[]",
        errors: (data.errors as string) ?? "[]",
        warnings: (data.warnings as string) ?? "[]",
        generatedCount: (data.generatedCount as number) ?? 0,
        approvedCount: (data.approvedCount as number) ?? 0,
        instantiatedCount: (data.instantiatedCount as number) ?? 0,
        reviewedBy: (data.reviewedBy as string) || null,
        reviewedAt: timestampToDate(data.reviewedAt),
        approvedBy: (data.approvedBy as string) || null,
        approvedAt: timestampToDate(data.approvedAt),
        startedAt: timestampToDate(data.startedAt),
        completedAt: timestampToDate(data.completedAt),
        createdAt: timestampToDate(data.createdAt) ?? now,
        updatedAt: timestampToDate(data.updatedAt) ?? now,
      },
    });
    return this.mapToManifestEntity(created);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      // Build update payload — only set fields the caller actually provided
      // so we never clobber existing workflow state with stale defaults.
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      const stringFields = [
        "eventId",
        "idempotencyKey",
        "status",
        "generationOptions",
        "generatedTasks",
        "reviewedTasks",
        "approvedTaskIds",
        "rejectedTaskIds",
        "instantiatedTaskIds",
        "scheduledWindows",
        "constraintOutcomes",
        "errors",
        "warnings",
        "reviewedBy",
        "approvedBy",
      ] as const;
      for (const f of stringFields) {
        if (data[f] !== undefined) {
          // reviewedBy / approvedBy are nullable strings — empty string -> null
          if ((f === "reviewedBy" || f === "approvedBy") && data[f] === "") {
            updateData[f] = null;
          } else {
            updateData[f] = data[f] as string;
          }
        }
      }
      const numberFields = [
        "currentStep",
        "totalSteps",
        "generatedCount",
        "approvedCount",
        "instantiatedCount",
      ] as const;
      for (const f of numberFields) {
        if (data[f] !== undefined) {
          updateData[f] = data[f] as number;
        }
      }
      const dateFields = [
        "reviewedAt",
        "approvedAt",
        "startedAt",
        "completedAt",
      ] as const;
      for (const f of dateFields) {
        if (data[f] !== undefined) {
          updateData[f] = timestampToDate(data[f]);
        }
      }

      const updated = await this.prisma.prepTaskPlanWorkflow.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: updateData,
      });
      return this.mapToManifestEntity(updated);
    } catch (error) {
      reportOp(this, "update", error);
      return;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // PrepTaskPlanWorkflow has no deletedAt — mark status as "deleted"
      await this.prisma.prepTaskPlanWorkflow.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { status: "deleted" },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.prepTaskPlanWorkflow.updateMany({
      where: { tenantId: this.tenantId },
      data: { status: "deleted" },
    });
  }

  /**
   * Map the Prisma row to a Manifest EntityInstance.
   * Timestamps become epoch-millis numbers (manifest contract); nullable
   * scalars get manifest-default empty strings/zero numbers so guards like
   * `self.status == ""` behave consistently.
   */
  private mapToManifestEntity(w: PrepTaskPlanWorkflow): EntityInstance {
    return {
      id: w.id,
      tenantId: w.tenantId,
      eventId: w.eventId ?? "",
      idempotencyKey: w.idempotencyKey ?? "",
      status: w.status ?? "created",
      currentStep: w.currentStep ?? 0,
      totalSteps: w.totalSteps ?? 5,
      generationOptions: w.generationOptions ?? "{}",
      generatedTasks: w.generatedTasks ?? "[]",
      reviewedTasks: w.reviewedTasks ?? "[]",
      approvedTaskIds: w.approvedTaskIds ?? "[]",
      rejectedTaskIds: w.rejectedTaskIds ?? "[]",
      instantiatedTaskIds: w.instantiatedTaskIds ?? "[]",
      scheduledWindows: w.scheduledWindows ?? "{}",
      constraintOutcomes: w.constraintOutcomes ?? "[]",
      errors: w.errors ?? "[]",
      warnings: w.warnings ?? "[]",
      generatedCount: w.generatedCount ?? 0,
      approvedCount: w.approvedCount ?? 0,
      instantiatedCount: w.instantiatedCount ?? 0,
      reviewedBy: w.reviewedBy ?? "",
      reviewedAt: w.reviewedAt ? w.reviewedAt.getTime() : 0,
      approvedBy: w.approvedBy ?? "",
      approvedAt: w.approvedAt ? w.approvedAt.getTime() : 0,
      startedAt: w.startedAt ? w.startedAt.getTime() : 0,
      completedAt: w.completedAt ? w.completedAt.getTime() : 0,
      createdAt: w.createdAt ? w.createdAt.getTime() : 0,
      updatedAt: w.updatedAt ? w.updatedAt.getTime() : 0,
      isDeleted: w.status === "deleted",
    };
  }
}

/**
 * Convert a manifest timestamp (epoch millis number) to a Prisma `Date | null`.
 * Treats `0`, `undefined`, and `null` as "no value" since the manifest uses
 * `0` as the default for unset timestamps.
 */
function timestampToDate(value: unknown): Date | null {
  if (value === undefined || value === null) {
    return null;
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return new Date(n);
}

/**
 * Create a Prisma store provider for Kitchen-Ops entities
 *
 * This returns a function that provides the appropriate Store implementation
 * for each entity type, backed by Prisma.
 */
const _loggedMissingStoreEntities = new Set<string>();

export type ManifestStoreIssueKind = "missing";

export type ManifestStoreIssueReporter = (
  entityName: string,
  kind: ManifestStoreIssueKind
) => void;

let _manifestStoreIssueReporter: ManifestStoreIssueReporter | undefined;

/** Optional hook for apps to persist missing-store diagnostics. */
export function registerManifestStoreIssueReporter(
  reporter: ManifestStoreIssueReporter
): void {
  _manifestStoreIssueReporter = reporter;
}

export function createPrismaStoreProvider(
  prisma: PrismaClient,
  tenantId: string,
  /** RuntimeContext.user.id, plumbed by manifest-runtime-factory.ts.
   * Used by entity stores that audit-derive a "who initiated" field
   * (e.g. InventoryTransfer.requestedBy) rather than capturing it from
   * the command body. Most stores ignore this arg. */
  userId = ""
): (entityName: string) => Store<EntityInstance> | undefined {
  return (entityName: string) => {
    switch (entityName) {
      // ── Custom stores with genuine business logic ──────────────────────────
      // These stores have cross-table queries, custom computed fields, special
      // delete semantics, or other logic that GenericPrismaStore cannot express.
      // All other entities fall through to GenericPrismaStore (line ~2942).
      case "PrepTask":
        return new PrepTaskPrismaStore(prisma, tenantId);
      case "KitchenTask":
        return new KitchenTaskPrismaStore(prisma, tenantId);
      case "PrepTaskPlanWorkflow":
        return new PrepTaskPlanWorkflowPrismaStore(prisma, tenantId);
      case "Station":
        return new StationPrismaStore(prisma, tenantId);
      case "InventoryTransfer":
        return new InventoryTransferPrismaStore(prisma, tenantId, userId);
      case "Event":
        return new EventPrismaStore(prisma, tenantId);
      default: {
        return;
      }
    }
  };
}

/**
 * Prisma-backed store for Station entities
 *
 * Maps Manifest Station entities to the Prisma Station table.
 */
export class StationPrismaStore implements Store<EntityInstance> {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const stations = await this.prisma.station.findMany({
      where: { tenantId: this.tenantId, isActive: true },
    });
    return stations.map((station) => this.mapToManifestEntity(station));
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    const station = await this.prisma.station.findFirst({
      where: { tenantId: this.tenantId, id },
    });
    return station ? this.mapToManifestEntity(station) : undefined;
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    const station = await this.prisma.station.create({
      data: {
        tenantId: this.tenantId,
        id: data.id as string,
        locationId: data.locationId as string,
        name: data.name as string,
        stationType: (data.stationType as string) || "prep-station",
        capacitySimultaneousTasks:
          (data.capacitySimultaneousTasks as number) || 1,
        // equipmentList is a Postgres String[] column.
        equipmentList: toStringArray(data.equipmentList),
        isActive: (data.isActive as boolean) ?? true,
        notes: (data.notes as string) || null,
      },
    });
    return this.mapToManifestEntity(station);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    try {
      const updated = await this.prisma.station.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: {
          name: data.name as string | undefined,
          stationType: data.stationType as string | undefined,
          capacitySimultaneousTasks: data.capacitySimultaneousTasks as
            | number
            | undefined,
          equipmentList: toStringArrayOrUndefined(data.equipmentList),
          isActive: data.isActive as boolean | undefined,
          notes: data.notes as string | null | undefined,
          updatedAt: new Date(),
        },
      });
      return this.mapToManifestEntity(updated);
    } catch (error) {
      reportOp(this, "update", error);
      return;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      // Station has no deletedAt — deactivate instead
      await this.prisma.station.update({
        where: { tenantId_id: { tenantId: this.tenantId, id } },
        data: { isActive: false },
      });
      return true;
    } catch (error) {
      reportOp(this, "delete", error);
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.prisma.station.updateMany({
      where: { tenantId: this.tenantId },
      data: { isActive: false },
    });
  }

  private mapToManifestEntity(station: Station): EntityInstance {
    return {
      id: station.id,
      tenantId: station.tenantId,
      locationId: station.locationId,
      name: station.name,
      stationType: station.stationType ?? "prep-station",
      capacitySimultaneousTasks: station.capacitySimultaneousTasks ?? 1,
      // equipmentList is String? scalar — pass through as-is
      equipmentList: station.equipmentList ?? "",
      isActive: station.isActive ?? true,
      currentTaskCount: 0, // Not persisted in Prisma - computed at runtime
      notes: station.notes ?? "",
      createdAt: station.createdAt?.getTime() ?? 0,
      updatedAt: station.updatedAt?.getTime() ?? 0,
    };
  }
}

/**
 * Configuration for PrismaStore
 */
export interface PrismaStoreConfig {
  entityName: string;
  prisma: PrismaClient;
  tenantId: string;
  /** RuntimeContext.user.id — threaded through to per-entity stores that
   * audit-derive caller identity (e.g. InventoryTransfer.requestedBy). */
  userId?: string;
}

/**
 * Generic PrismaStore class that wraps entity-specific stores
 *
 * This class provides a unified interface for working with different entity types
 * through their Prisma-backed store implementations.
 */
export class PrismaStore implements Store<EntityInstance> {
  private readonly store: Store<EntityInstance>;

  constructor(config: PrismaStoreConfig) {
    // Resolve a bespoke per-entity store from the switch; if none exists for
    // this entity (the switch returns undefined), fall back to the generic
    // metadata-driven store so a memory→durable flip needs only an
    // ENTITIES_WITH_SPECIFIC_STORES entry — no new switch case. Existing
    // entities all have a case, so this fallback never changes their behavior.
    this.store =
      (createPrismaStoreProvider(
        config.prisma,
        config.tenantId,
        config.userId ?? ""
      )(config.entityName) as Store<EntityInstance> | undefined) ??
      createGenericPrismaStore(
        config.prisma as unknown as PrismaClientLike,
        config.entityName,
        config.tenantId
      );
  }

  async getAll(): Promise<EntityInstance[]> {
    return this.store.getAll();
  }

  async getById(id: string): Promise<EntityInstance | undefined> {
    return this.store.getById(id);
  }

  async create(data: Partial<EntityInstance>): Promise<EntityInstance> {
    return this.store.create(data);
  }

  async update(
    id: string,
    data: Partial<EntityInstance>
  ): Promise<EntityInstance | undefined> {
    return this.store.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async clear(): Promise<void> {
    return this.store.clear();
  }
}

// ---------------------------------------------------------------------------
// Shared array coercion (module-level so every *PrismaStore class can use it).
// Schema array columns are Postgres String[]; manifest values may arrive as an
// array OR a legacy comma-string. These normalize to a real string[].
// ---------------------------------------------------------------------------
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v));
  }
  if (typeof value === "string" && value.length > 0) {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

// For updates: leave the column untouched when the field wasn't provided.
function toStringArrayOrUndefined(value: unknown): string[] | undefined {
  return value === undefined ? undefined : toStringArray(value);
}
