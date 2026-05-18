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
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class NotificationPrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    constructor(prisma: PrismaClient, tenantId: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private mapToManifestEntity;
}
//# sourceMappingURL=broken-read-notification-parent.d.ts.map