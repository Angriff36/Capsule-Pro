/**
 * BROKEN_RAW_SQL parent workflow — Notification Prisma store.
 *
 * Notification — tenant_admin.notifications
 *   - Mix of camelCase (@map) and snake_case (no @map) Prisma fields
 *   - Composite key: tenantId_id
 *   - No soft-delete (no deletedAt column) — delete is hard
 *   - Boolean isRead with nullable readAt timestamp
 *   - Status transitions: markRead, markDismissed, remove
 */
import { asNullableDate, asNullableString, reportOp, } from "./shared";
// ---------------------------------------------------------------------------
// NotificationPrismaStore
// ---------------------------------------------------------------------------
export class NotificationPrismaStore {
    prisma;
    tenantId;
    constructor(prisma, tenantId) {
        this.prisma = prisma;
        this.tenantId = tenantId;
    }
    async getAll() {
        const rows = await this.prisma.notification.findMany({
            where: { tenantId: this.tenantId },
            orderBy: { createdAt: "desc" },
        });
        return rows.map((r) => this.mapToManifestEntity(r));
    }
    async getById(id) {
        const row = await this.prisma.notification.findFirst({
            where: { tenantId: this.tenantId, id },
        });
        return row ? this.mapToManifestEntity(row) : undefined;
    }
    async create(data) {
        const id = data.id ?? crypto.randomUUID();
        const row = await this.prisma.notification.create({
            data: {
                tenantId: this.tenantId,
                id,
                recipient_employee_id: data.recipientEmployeeId ?? "",
                notification_type: data.notificationType ?? "info",
                title: data.title ?? "New Notification",
                body: asNullableString(data.body),
                action_url: asNullableString(data.actionUrl),
                isRead: false,
                correlation_id: asNullableString(data.correlationId),
            },
        });
        return this.mapToManifestEntity(row);
    }
    async update(id, data) {
        try {
            const patch = {};
            if (data.recipientEmployeeId !== undefined)
                patch.recipient_employee_id = data.recipientEmployeeId;
            if (data.notificationType !== undefined)
                patch.notification_type = data.notificationType;
            if (data.title !== undefined)
                patch.title = data.title;
            if (data.body !== undefined)
                patch.body = asNullableString(data.body);
            if (data.actionUrl !== undefined)
                patch.action_url = asNullableString(data.actionUrl);
            if (data.isRead !== undefined)
                patch.isRead = data.isRead;
            if (data.readAt !== undefined)
                patch.readAt = asNullableDate(data.readAt);
            if (data.correlationId !== undefined)
                patch.correlation_id = asNullableString(data.correlationId);
            const row = await this.prisma.notification.update({
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
            await this.prisma.notification.delete({
                where: { tenantId_id: { tenantId: this.tenantId, id } },
            });
            return true;
        }
        catch (error) {
            reportOp(this, "delete", error);
            return false;
        }
    }
    async clear() {
        await this.prisma.notification.deleteMany({
            where: { tenantId: this.tenantId },
        });
    }
    mapToManifestEntity(r) {
        return {
            id: r.id,
            tenantId: r.tenantId,
            recipientEmployeeId: r.recipient_employee_id ?? "",
            notificationType: r.notification_type ?? "info",
            title: r.title ?? "",
            body: r.body ?? null,
            actionUrl: r.action_url ?? null,
            isRead: r.isRead ?? false,
            readAt: r.readAt ?? null,
            correlationId: r.correlation_id ?? null,
            createdAt: r.createdAt ?? null,
        };
    }
}
