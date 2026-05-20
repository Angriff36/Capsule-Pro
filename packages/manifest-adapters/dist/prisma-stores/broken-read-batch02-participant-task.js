/**
 * Prisma stores for BROKEN_PRISMA_READ batch 02
 * (AdminChatParticipant, AdminTask).
 *
 * Pattern mirrors AlertsConfigPrismaStore in `../prisma-store.ts`.
 */
import { asNullableDate, asNullableString, asString, reportOp, } from "./shared";
// ---------------------------------------------------------------------------
// AdminChatParticipant (tenant_admin.admin_chat_participants)
// ---------------------------------------------------------------------------
export class AdminChatParticipantPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.adminChatParticipant.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.adminChatParticipant.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.adminChatParticipant.create({
            data: {
                tenantId: this.tenantId,
                id,
                threadId: asString(data.threadId),
                userId: asString(data.userId),
                archivedAt: asNullableDate(data.archivedAt),
                clearedAt: asNullableDate(data.clearedAt),
                lastReadAt: asNullableDate(data.lastReadAt),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.threadId !== undefined)
                patch.threadId = asString(data.threadId);
            if (data.userId !== undefined)
                patch.userId = asString(data.userId);
            if (data.archivedAt !== undefined)
                patch.archivedAt = asNullableDate(data.archivedAt);
            if (data.clearedAt !== undefined)
                patch.clearedAt = asNullableDate(data.clearedAt);
            if (data.lastReadAt !== undefined)
                patch.lastReadAt = asNullableDate(data.lastReadAt);
            const row = await this.prisma.adminChatParticipant.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: patch,
            });
            return this.mapToManifestEntity(row);
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.adminChatParticipant.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.adminChatParticipant.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            threadId: r.threadId ?? "",
            userId: r.userId ?? "",
            archivedAt: r.archivedAt ?? null,
            clearedAt: r.clearedAt ?? null,
            lastReadAt: r.lastReadAt ?? null,
        };
    }
}
// ---------------------------------------------------------------------------
// AdminTask (tenant_admin.admin_tasks)
// ---------------------------------------------------------------------------
export class AdminTaskPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.adminTask.findMany({
            where: { tenantId: this.tenantId, deletedAt: null },
            orderBy: { id: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.adminTask.findFirst({
            where: { tenantId: this.tenantId, id, deletedAt: null },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.adminTask.create({
            data: {
                tenantId: this.tenantId,
                id,
                title: asString(data.title),
                description: asNullableString(data.description),
                status: asString(data.status) || "backlog",
                priority: asString(data.priority) || "medium",
                category: asNullableString(data.category),
                dueDate: asNullableDate(data.dueDate),
                assignedTo: asNullableString(data.assignedTo),
                createdBy: asNullableString(data.createdBy),
                sourceType: asNullableString(data.sourceType),
                sourceId: asNullableString(data.sourceId),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.title !== undefined)
                patch.title = asString(data.title);
            if (data.description !== undefined)
                patch.description = asNullableString(data.description);
            if (data.status !== undefined)
                patch.status = asString(data.status);
            if (data.priority !== undefined)
                patch.priority = asString(data.priority);
            if (data.category !== undefined)
                patch.category = asNullableString(data.category);
            if (data.dueDate !== undefined)
                patch.dueDate = asNullableDate(data.dueDate);
            if (data.assignedTo !== undefined)
                patch.assignedTo = asNullableString(data.assignedTo);
            if (data.createdBy !== undefined)
                patch.createdBy = asNullableString(data.createdBy);
            if (data.sourceType !== undefined)
                patch.sourceType = asNullableString(data.sourceType);
            if (data.sourceId !== undefined)
                patch.sourceId = asNullableString(data.sourceId);
            const row = await this.prisma.adminTask.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: patch,
            });
            return this.mapToManifestEntity(row);
        }
        catch (error) {
            reportOp(this, "update", error);
            return undefined;
        }
    }
    async delete(id) {
        try {
            await this.prisma.adminTask.update({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
                data: { deletedAt: new Date() },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.adminTask.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            title: r.title ?? "",
            description: r.description ?? null,
            status: r.status ?? "backlog",
            priority: r.priority ?? "medium",
            category: r.category ?? null,
            dueDate: r.dueDate ?? null,
            assignedTo: r.assignedTo ?? null,
            createdBy: r.createdBy ?? null,
            sourceType: r.sourceType ?? null,
            sourceId: r.sourceId ?? null,
        };
    }
}
