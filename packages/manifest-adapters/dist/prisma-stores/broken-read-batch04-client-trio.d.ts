/**
 * Prisma stores for BROKEN_PRISMA_READ batch 04 — CRM trio.
 *
 * Covers ClientContact, ClientInteraction, ClientPreference (all in
 * `tenant_crm.*`). All three carry a soft-delete `deletedAt` column, so
 * `getAll`/`getById` filter `deletedAt: null` and `delete` writes
 * `deletedAt = new Date()` rather than removing the row.
 *
 * Notes on schema ↔ manifest mismatches handled here (see
 * `IMPLEMENTATION_PLAN.md` and the manifest specs in
 * `packages/manifest-adapters/manifests/`):
 *
 * - `ClientContact` Prisma columns are literal snake_case (`first_name`,
 *   `last_name`) — the manifest declares them as `firstName` / `lastName`.
 *   The `create`/`update` paths accept both spellings (mirrors the Client
 *   store from batch 03).
 * - `ClientInteraction` has a literal snake_case `correlation_id` column;
 *   the manifest declares `correlationId`. Both spellings are accepted.
 * - `ClientPreference.preferenceValue` is `Json` in Prisma but `string` in
 *   the manifest. We pass the value through `asJsonInput` so any
 *   JSON-serializable input (string, number, object, array) round-trips.
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class ClientContactPrismaStore implements Store<EntityInstance> {
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
export declare class ClientInteractionPrismaStore implements Store<EntityInstance> {
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
export declare class ClientPreferencePrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-batch04-client-trio.d.ts.map