/**
 * BROKEN_PRISMA_READ batch 16 — InventoryTransfer Prisma store.
 *
 * Why this exists (per IMPLEMENTATION_PLAN.md "InventoryTransfer.transferNumber — deferred"):
 *
 * Before this store, InventoryTransfer fell back to the generic PrismaJsonStore,
 * which wrote a JSON blob to `manifest_instances` instead of a row to the
 * dedicated `inventory_transfers` table. The UI POSTs items in the body, and
 * those items had no destination. The manifest's `command create` declared
 * `requestedBy` as a required-but-defaulted `""` param that the UI never sent,
 * resulting in silent empty-string writes for an audit-sensitive field.
 *
 * This store:
 *   1. Persists InventoryTransfer rows in the real `inventory_transfers` table.
 *   2. Generates `transferNumber` server-side via `count() + 1` zero-padded
 *      to 6 digits (e.g. "TRF-000004"). Matches the pre-existing test fixture
 *      contract in apps/api/__tests__/inventory/transfers/transfers.quarantine.test.ts.
 *   3. Persists `items: [{ itemId, quantity, notes }]` to the
 *      `inventory_transfer_items` child table in the same `$transaction` as
 *      the parent row.
 *   4. Injects `requestedBy` from RuntimeContext.user.id (plumbed via the
 *      store provider's `userId` arg) — the manifest no longer captures it
 *      as a create param. Per IMPLEMENTATION_PLAN.md §101 and constitution
 *      §2/§14 — no silent `?? ""` fallback.
 *
 * Schema-drift allowlist entries that point at this file:
 *   - adapterDerived.InventoryTransfer.transferNumber → generated here
 *   - adapterDerived.InventoryTransfer.requestedBy    → injected here
 */
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class InventoryTransferPrismaStore implements Store<EntityInstance> {
    private readonly prisma;
    private readonly tenantId;
    /** RuntimeContext.user.id, plumbed via createPrismaStoreProvider's 3rd arg.
     * Used as InventoryTransfer.requestedBy (audit field for who initiated). */
    private readonly requestedBy;
    constructor(prisma: PrismaClient, tenantId: string, 
    /** RuntimeContext.user.id, plumbed via createPrismaStoreProvider's 3rd arg.
     * Used as InventoryTransfer.requestedBy (audit field for who initiated). */
    requestedBy: string);
    getAll(): Promise<EntityInstance[]>;
    getById(id: string): Promise<EntityInstance | undefined>;
    create(data: Partial<EntityInstance>): Promise<EntityInstance>;
    update(id: string, data: Partial<EntityInstance>): Promise<EntityInstance | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
    private mapToManifestEntity;
}
interface Store<T> {
    getAll(): Promise<T[]>;
    getById(id: string): Promise<T | undefined>;
    create(data: Partial<T>): Promise<T>;
    update(id: string, data: Partial<T>): Promise<T | undefined>;
    delete(id: string): Promise<boolean>;
    clear(): Promise<void>;
}
export {};
//# sourceMappingURL=broken-read-batch16-inventory-transfer.d.ts.map