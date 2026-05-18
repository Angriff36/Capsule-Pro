/**
 * BROKEN_PRISMA_READ batch 08 — EventDish store.
 *
 * EventDish → tenant_events.event_dishes
 *   - Snake_case Prisma model name AND field names (no @map annotations)
 *   - Composite key: tenant_id_id (tenant_id + id)
 *   - No Decimal fields, no String[] arrays
 *   - Soft-delete via deleted_at
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class EventDishPrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-batch08-event-dish.d.ts.map