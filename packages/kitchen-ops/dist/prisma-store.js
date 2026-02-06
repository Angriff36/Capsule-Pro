/**
 * Prisma-backed store for Manifest entities
 *
 * This module provides Store implementations that persist Manifest entities
 * using the existing Prisma schema. It bridges the gap between Manifest's entity
 * model and the Prisma database tables.
 */
/**
 * Prisma-backed store for PrepTask entities
 *
 * Maps Manifest PrepTask entities to the Prisma PrepTask and KitchenTaskClaim tables.
 * The Manifest entity has inline claimedBy/claimedAt fields, while Prisma uses a
 * separate KitchenTaskClaim table for tracking claims.
 */
export class PrepTaskPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const tasks = (await this.prisma.prepTask.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
        }));
        // Fetch claims separately and map them
        const taskIds = tasks.map((t) => t.id);
        const claims = taskIds.length > 0
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
        const claimsByTaskId = new Map();
        for (const claim of claims) {
            const existing = claimsByTaskId.get(claim.taskId) || [];
            existing.push(claim);
            claimsByTaskId.set(claim.taskId, existing);
        }
        return tasks.map((task) => this.mapToManifestEntity(task, claimsByTaskId.get(task.id) || []));
    }
    async getById(id) {
        const task = await this.prisma.prepTask.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        if (!task)
            return undefined;
        // Fetch active claims
        const claims = await this.prisma.kitchenTaskClaim.findMany({
            where: { tenantId: this.tenantId, taskId: id, releasedAt: null },
            orderBy: { claimedAt: "desc" },
            take: 1,
        });
        return this.mapToManifestEntity(task, claims);
    }
    async create(data) {
        const task = await this.prisma.prepTask.create({
            data: {
                tenantId: this.tenantId,
                id: data.id,
                eventId: data.eventId,
                name: data.name,
                taskType: data.taskType || "prep",
                status: data.status || "pending",
                priority: data.priority || 5,
                quantityTotal: data.quantityTotal,
                quantityUnitId: data.quantityUnitId,
                quantityCompleted: data.quantityCompleted || 0,
                servingsTotal: data.servingsTotal,
                startByDate: data.startByDate
                    ? new Date(data.startByDate)
                    : new Date(),
                dueByDate: data.dueByDate
                    ? new Date(data.dueByDate)
                    : new Date(),
                locationId: data.locationId,
                dishId: data.dishId,
                recipeVersionId: data.recipeVersionId,
                methodId: data.methodId,
                containerId: data.containerId,
                estimatedMinutes: data.estimatedMinutes,
                notes: data.notes,
            },
        });
        // If task has claim info, create a claim record
        if (data.claimedBy && data.claimedAt) {
            await this.prisma.kitchenTaskClaim.create({
                data: {
                    tenantId: this.tenantId,
                    taskId: task.id,
                    employeeId: data.claimedBy,
                    claimedAt: new Date(data.claimedAt),
                },
            });
        }
        return this.mapToManifestEntity(task, []);
    }
    async update(id, data) {
        // First, get the existing task
        const existing = await this.prisma.prepTask.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        if (!existing)
            return undefined;
        // Update the task
        const updated = await this.prisma.prepTask.update({
            where: { tenantId_id: { tenantId: this.tenantId, id } },
            data: {
                status: data.status,
                priority: data.priority,
                quantityCompleted: data.quantityCompleted,
                quantityTotal: data.quantityTotal,
                actualMinutes: data.actualMinutes,
                notes: data.notes,
                updatedAt: new Date(),
            },
        });
        // Handle claim changes
        const activeClaim = await this.prisma.kitchenTaskClaim.findFirst({
            where: { tenantId: this.tenantId, taskId: id, releasedAt: null },
        });
        const newClaimedBy = data.claimedBy;
        if (newClaimedBy && !activeClaim) {
            // Create new claim
            await this.prisma.kitchenTaskClaim.create({
                data: {
                    tenantId: this.tenantId,
                    taskId: id,
                    employeeId: newClaimedBy,
                    claimedAt: data.claimedAt
                        ? new Date(data.claimedAt)
                        : new Date(),
                },
            });
        }
        else if (!newClaimedBy && activeClaim && data.status === "open") {
            // Release existing claim - use compound unique key
            await this.prisma.kitchenTaskClaim.update({
                where: { tenantId_id: { tenantId: this.tenantId, id: activeClaim.id } },
                data: {
                    releasedAt: new Date(),
                    releaseReason: data.releaseReason,
                },
            });
        }
        else if (newClaimedBy &&
            activeClaim &&
            newClaimedBy !== activeClaim.employeeId) {
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
                        ? new Date(data.claimedAt)
                        : new Date(),
                },
            });
        }
        return this.mapToManifestEntity(updated, []);
    }
    async delete(id) {
        try {
            await this.prisma.prepTask.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch {
            return false;
        }
    }
    async clear() {
        await this.prisma.prepTask.updateMany({
            where: { tenantId: this.tenantId },
            data: { deletedAt: new Date() },
        });
    }
    /**
     * Map Prisma PrepTask to Manifest PrepTask entity
     */
    mapToManifestEntity(task, claims) {
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
    mapStatus(status) {
        const statusMap = {
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
export function createPrismaStoreProvider(prisma, tenantId) {
    return (entityName) => {
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
export async function loadPrepTaskFromPrisma(prisma, tenantId, taskId) {
    const store = new PrepTaskPrismaStore(prisma, tenantId);
    return store.getById(taskId);
}
/**
 * Sync a PrepTask from Manifest state to Prisma
 *
 * Called after Manifest commands execute to persist the updated state.
 */
export async function syncPrepTaskToPrisma(prisma, tenantId, entity) {
    const store = new PrepTaskPrismaStore(prisma, tenantId);
    // Check if task exists
    const existing = await prisma.prepTask.findFirst({
        where: { tenantId, id: entity.id, deletedAt: null },
    });
    if (existing) {
        await store.update(entity.id, entity);
    }
    else {
        await store.create(entity);
    }
}
