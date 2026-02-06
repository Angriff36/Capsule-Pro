/**
 * Prisma-backed store for Manifest entities
 *
 * This module provides Store implementations that persist Manifest entities
 * using the existing Prisma schema. It bridges the gap between Manifest's entity
 * model and the Prisma database tables.
 */

import type { KitchenTaskClaim, PrepTask, PrismaClient } from "@repo/database";
import type { Store } from "@repo/manifest";

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
    private prisma: PrismaClient,
    private tenantId: string
  ) {}

  async getAll(): Promise<EntityInstance[]> {
    const tasks = (await this.prisma.prepTask.findMany({
      where: { tenantId: this.tenantId, deletedAt: null },
    })) as PrepTask[];

    // Fetch claims separately and map them
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

    // Group claims by taskId
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
    const task = await this.prisma.prepTask.findFirst({
      where: { tenantId: this.tenantId, id, deletedAt: null },
    });

    if (!task) return undefined;

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
        name: data.name as string,
        taskType: (data.taskType as string) || "prep",
        status: (data.status as string) || "pending",
        priority: (data.priority as number) || 5,
        quantityTotal: data.quantityTotal as number,
        quantityUnitId: data.quantityUnitId as number | null,
        quantityCompleted: (data.quantityCompleted as number) || 0,
        servingsTotal: data.servingsTotal as number | null,
        startByDate: data.startByDate
          ? new Date(data.startByDate as number)
          : new Date(),
        dueByDate: data.dueByDate
          ? new Date(data.dueByDate as number)
          : new Date(),
        locationId: data.locationId as string,
        dishId: data.dishId as string | null,
        recipeVersionId: data.recipeVersionId as string | null,
        methodId: data.methodId as string | null,
        containerId: data.containerId as string | null,
        estimatedMinutes: data.estimatedMinutes as number | null,
        notes: data.notes as string | null,
      },
    });

    // If task has claim info, create a claim record
    if (data.claimedBy && data.claimedAt) {
      await this.prisma.kitchenTaskClaim.create({
        data: {
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

    if (!existing) return undefined;

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
    } catch {
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
      quantityUnitId: task.quantityUnitId ?? "",
      quantityCompleted: Number(task.quantityCompleted),
      servingsTotal: task.servingsTotal ?? 0,
      startByDate: task.startByDate ? task.startByDate.getTime() : 0,
      dueByDate: task.dueByDate ? task.dueByDate.getTime() : 0,
      locationId: task.locationId,
      dishId: task.dishId ?? "",
      recipeVersionId: task.recipeVersionId ?? "",
      methodId: task.methodId ?? "",
      containerId: task.containerId ?? "",
      estimatedMinutes: task.estimatedMinutes ?? 0,
      actualMinutes: task.actualMinutes ?? 0,
      notes: task.notes ?? "",
      stationId: "", // Not tracked in Prisma schema
      claimedBy: activeClaim?.employeeId ?? "",
      claimedAt: activeClaim?.claimedAt.getTime() ?? 0,
      createdAt: task.createdAt.getTime(),
      updatedAt: task.updatedAt.getTime(),
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
 * Create a Prisma store provider for Kitchen-Ops entities
 *
 * This returns a function that provides the appropriate Store implementation
 * for each entity type, backed by Prisma.
 */
export function createPrismaStoreProvider(
  prisma: PrismaClient,
  tenantId: string
): (entityName: string) => Store<EntityInstance> | undefined {
  return (entityName: string) => {
    switch (entityName) {
      case "PrepTask":
        return new PrepTaskPrismaStore(prisma, tenantId);
      // TODO: Add StationPrismaStore and InventoryItemPrismaStore as needed
      default:
        return undefined;
    }
  };
}

/**
 * Load a PrepTask from Prisma into the Manifest runtime
 *
 * This ensures the Manifest runtime has the current state before executing commands.
 */
export async function loadPrepTaskFromPrisma(
  prisma: PrismaClient,
  tenantId: string,
  taskId: string
): Promise<EntityInstance | undefined> {
  const store = new PrepTaskPrismaStore(prisma, tenantId);
  return store.getById(taskId);
}

/**
 * Sync a PrepTask from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncPrepTaskToPrisma(
  prisma: PrismaClient,
  tenantId: string,
  entity: EntityInstance
): Promise<void> {
  const store = new PrepTaskPrismaStore(prisma, tenantId);

  // Check if task exists
  const existing = await prisma.prepTask.findFirst({
    where: { tenantId, id: entity.id, deletedAt: null },
  });

  if (existing) {
    await store.update(entity.id, entity);
  } else {
    await store.create(entity);
  }
}
