/**
 * Supplier Sync Service
 *
 * Handles synchronization of supplier catalogs to the VendorCatalog model.
 * Supports full catalog sync and incremental updates.
 */
import type { SupplierConnector, SupplierConnectorConfig, SupplierSyncResult } from "./types.js";
/**
 * Minimal interface for database operations needed by the sync service.
 * Uses the actual Prisma client from @repo/database.
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
        create: (args: {
            data: Record<string, unknown>;
        }) => Promise<unknown>;
        update: (args: {
            where: {
                id: string;
            };
            data: Record<string, unknown>;
        }) => Promise<unknown>;
        updateMany: (args: {
            where: {
                id: {
                    in: string[];
                };
            };
            data: Record<string, unknown>;
        }) => Promise<{
            count: number;
        }>;
    };
    $transaction: (operations: unknown[]) => Promise<unknown[]>;
}
/**
 * Service for syncing supplier catalogs to the local database.
 */
export declare class SupplierSyncService {
    private prisma;
    constructor(prisma: SupplierSyncDb);
    /**
     * Perform a full catalog sync from a supplier.
     */
    syncCatalog(connector: SupplierConnector, config: SupplierConnectorConfig): Promise<SupplierSyncResult>;
    /**
     * Perform an incremental sync.
     */
    syncChanges(connector: SupplierConnector, config: SupplierConnectorConfig, since: Date): Promise<SupplierSyncResult>;
    /**
     * Map a SupplierProduct to VendorCatalog data.
     */
    private mapToVendorCatalog;
}
//# sourceMappingURL=sync-service.d.ts.map