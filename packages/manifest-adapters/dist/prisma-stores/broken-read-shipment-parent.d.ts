/**
 * BROKEN_RAW_SQL parent workflow — Shipment Prisma store.
 *
 * Shipment — tenant_inventory.shipments
 *   - CamelCase Prisma fields with @map to snake_case DB columns
 *   - Composite key: tenantId_id
 *   - Nullable Decimals: shippingCost, totalValue
 *   - Multiple DateTime fields (scheduled, shipped, estimated delivery, actual delivery)
 *     stored as DateTime @db.Timestamptz(6), manifest uses number (ms epoch)
 *   - Status lifecycle: draft → scheduled → preparing → in_transit → delivered / cancelled
 *   - Soft-delete via deletedAt
 */
import type { Store } from "@angriff36/manifest";
import type { PrismaClient } from "@repo/database/standalone";
import { type EntityInstance } from "./shared";
export declare class ShipmentPrismaStore implements Store<EntityInstance> {
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
//# sourceMappingURL=broken-read-shipment-parent.d.ts.map