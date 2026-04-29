/**
 * BROKEN_RAW_SQL parent workflow — Schedule Prisma store.
 *
 * Schedule — tenant_staff.schedules
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - schedule_date stored as DateTime @db.Date, manifest uses number (ms epoch)
 *   - published_at / published_by nullable
 *   - Status lifecycle: draft → published → closed
 *   - Soft-delete via deletedAt
 *
 * Note: The manifest declares `notes` and `shiftCount` properties that have no
 * corresponding column in the Prisma model. These fields are accepted on write
 * but silently dropped (not persisted). They are returned as defaults on read.
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared.js";
export declare class SchedulePrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-schedule-parent.d.ts.map