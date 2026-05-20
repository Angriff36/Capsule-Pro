/**
 * BROKEN_PRISMA_READ batch 08 — EventGuest + EventImport stores.
 *
 * EventGuest → tenant_events.event_guests
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - String[] arrays: dietaryRestrictions, allergenRestrictions
 *   - Boolean fields: isPrimaryContact, specialMealRequired
 *
 * EventImport (manifest entity "EventImportWorkflow") → tenant_events.event_imports
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Json field: extractedData
 *   - String[] array: parseErrors
 *   - Bytes? field: content (not mapped to manifest entity)
 *   - Nullable eventId
 *
 * Both soft-delete via deletedAt.
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class EventGuestPrismaStore implements Store<EntityInstance> {
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
export declare class EventImportPrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-batch08-event-guest-import.d.ts.map