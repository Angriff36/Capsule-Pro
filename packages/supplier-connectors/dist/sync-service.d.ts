/**
 * Supplier Sync Service
 *
 * Handles synchronization of supplier catalogs to the VendorCatalog model.
 * Supports full catalog sync and incremental updates.
 *
 * Writes go through the Manifest runtime (governed) via VendorCatalogCommandFn.
 * Reads bypass Manifest per constitution §10 (direct Prisma).
 */
import type { SupplierConnector, SupplierConnectorConfig, SupplierSyncResult } from "./types.js";
/**
 * Minimal read-only interface for database queries needed by the sync service.
 * Reads bypass Manifest per constitution §10.
 */
export interface SupplierSyncDb {
    vendorCatalog: {
        findMany: (args: {
            where: {
                tenantId: string;
                supplierId: string;
                deletedAt?: null;
            };
            select: {
                id: true;
                itemNumber: true;
            };
        }) => Promise<Array<{
            id: string;
            itemNumber: string;
        }>>;
        findFirst: (args: {
            where: {
                tenantId: string;
                supplierId: string;
                itemNumber: string;
            };
        }) => Promise<{
            id: string;
        } | null>;
    };
}
/**
 * Command callback for governed VendorCatalog writes via Manifest runtime.
 * The caller provides this by wrapping `runManifestCommand` / `runManifestCommandCore`.
 */
export type VendorCatalogCommandFn = (params: {
    command: "create" | "update" | "deactivate";
    body: Record<string, unknown>;
}) => Promise<{
    ok: boolean;
    message?: string;
}>;
/**
 * Service for syncing supplier catalogs to the local database.
 *
 * @param prisma - Read-only Prisma access for catalog lookups (reads bypass Manifest).
 * @param runCommand - Governed write callback that executes Manifest commands.
 */
export declare class SupplierSyncService {
    private prisma;
    private runCommand;
    constructor(prisma: SupplierSyncDb, runCommand: VendorCatalogCommandFn);
    /**
     * Perform a full catalog sync from a supplier.
     */
    syncCatalog(connector: SupplierConnector, config: SupplierConnectorConfig): Promise<SupplierSyncResult>;
    /**
     * Perform an incremental sync.
     */
    syncChanges(connector: SupplierConnector, config: SupplierConnectorConfig, since: Date): Promise<SupplierSyncResult>;
    /**
     * Map a SupplierProduct to a Manifest command body for VendorCatalog.
     * Matches the field names expected by VendorCatalog create/update commands.
     */
    private mapToCommandBody;
}
//# sourceMappingURL=sync-service.d.ts.map