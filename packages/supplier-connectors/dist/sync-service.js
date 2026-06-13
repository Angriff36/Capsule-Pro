/**
 * Supplier Sync Service
 *
 * Handles synchronization of supplier catalogs to the VendorCatalog model.
 * Supports full catalog sync and incremental updates.
 *
 * Writes go through the Manifest runtime (governed) via VendorCatalogCommandFn.
 * Reads bypass Manifest per constitution §10 (direct Prisma).
 */
/**
 * Service for syncing supplier catalogs to the local database.
 *
 * @param prisma - Read-only Prisma access for catalog lookups (reads bypass Manifest).
 * @param runCommand - Governed write callback that executes Manifest commands.
 */
export class SupplierSyncService {
    prisma;
    runCommand;
    constructor(prisma, runCommand) {
        this.prisma = prisma;
        this.runCommand = runCommand;
    }
    /**
     * Perform a full catalog sync from a supplier.
     */
    async syncCatalog(connector, config) {
        const startTime = Date.now();
        const errors = [];
        let productsSynced = 0;
        let productsCreated = 0;
        let productsUpdated = 0;
        let productsDeactivated = 0;
        try {
            // Fetch catalog from supplier
            const products = await connector.fetchCatalog(config);
            productsSynced = products.length;
            // Get existing catalog entries (read bypasses Manifest per §10)
            const existingEntries = await this.prisma.vendorCatalog.findMany({
                where: {
                    tenantId: config.tenantId,
                    supplierId: config.supplierId,
                },
                select: { id: true, itemNumber: true },
            });
            const existingBySku = new Map(existingEntries.map((e) => [e.itemNumber, e.id]));
            // Process each product via Manifest commands
            for (const product of products) {
                try {
                    const body = this.mapToCommandBody(product, config.supplierId, config.tenantId);
                    const existingId = existingBySku.get(product.sku);
                    if (existingId) {
                        const result = await this.runCommand({
                            command: "update",
                            body: { id: existingId, ...body },
                        });
                        if (!result.ok) {
                            throw new Error(result.message ?? "Manifest update failed");
                        }
                        productsUpdated++;
                        existingBySku.delete(product.sku);
                    }
                    else {
                        const result = await this.runCommand({
                            command: "create",
                            body,
                        });
                        if (!result.ok) {
                            throw new Error(result.message ?? "Manifest create failed");
                        }
                        productsCreated++;
                    }
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    errors.push({ sku: product.sku, error: errorMessage });
                }
            }
            // Deactivate products no longer in catalog (individual Manifest deactivate commands)
            if (config.options?.syncFullCatalog !== false && existingBySku.size > 0) {
                const idsToDeactivate = Array.from(existingBySku.values());
                for (const id of idsToDeactivate) {
                    try {
                        const result = await this.runCommand({
                            command: "deactivate",
                            body: { id, reason: "Removed from supplier catalog during sync" },
                        });
                        if (result.ok) {
                            productsDeactivated++;
                        }
                    }
                    catch {
                        // Individual deactivation failures are logged via the count gap
                    }
                }
            }
            return {
                connectorId: connector.id,
                productsSynced,
                productsUpdated,
                productsCreated,
                productsDeactivated,
                errors,
                syncedAt: new Date(),
                durationMs: Date.now() - startTime,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                connectorId: connector.id,
                productsSynced: 0,
                productsUpdated: 0,
                productsCreated: 0,
                productsDeactivated: 0,
                errors: [{ sku: "SYNC_ERROR", error: errorMessage }],
                syncedAt: new Date(),
                durationMs: Date.now() - startTime,
            };
        }
    }
    /**
     * Perform an incremental sync.
     */
    async syncChanges(connector, config, since) {
        const startTime = Date.now();
        const errors = [];
        let productsSynced = 0;
        let productsCreated = 0;
        let productsUpdated = 0;
        try {
            const products = await connector.fetchCatalog(config);
            // Filter to changed products
            const changedProducts = products.filter((p) => {
                if (!p.effectiveFrom) {
                    return true;
                }
                return new Date(p.effectiveFrom) >= since;
            });
            productsSynced = changedProducts.length;
            for (const product of changedProducts) {
                try {
                    const body = this.mapToCommandBody(product, config.supplierId, config.tenantId);
                    // Read bypasses Manifest per §10
                    const existing = await this.prisma.vendorCatalog.findFirst({
                        where: {
                            tenantId: config.tenantId,
                            supplierId: config.supplierId,
                            itemNumber: product.sku,
                        },
                    });
                    if (existing) {
                        const result = await this.runCommand({
                            command: "update",
                            body: { id: existing.id, ...body },
                        });
                        if (!result.ok) {
                            throw new Error(result.message ?? "Manifest update failed");
                        }
                        productsUpdated++;
                    }
                    else {
                        const result = await this.runCommand({
                            command: "create",
                            body,
                        });
                        if (!result.ok) {
                            throw new Error(result.message ?? "Manifest create failed");
                        }
                        productsCreated++;
                    }
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    errors.push({ sku: product.sku, error: errorMessage });
                }
            }
            return {
                connectorId: connector.id,
                productsSynced,
                productsUpdated,
                productsCreated,
                productsDeactivated: 0,
                errors,
                syncedAt: new Date(),
                durationMs: Date.now() - startTime,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                connectorId: connector.id,
                productsSynced: 0,
                productsUpdated: 0,
                productsCreated: 0,
                productsDeactivated: 0,
                errors: [{ sku: "SYNC_ERROR", error: errorMessage }],
                syncedAt: new Date(),
                durationMs: Date.now() - startTime,
            };
        }
    }
    /**
     * Map a SupplierProduct to a Manifest command body for VendorCatalog.
     * Matches the field names expected by VendorCatalog create/update commands.
     */
    mapToCommandBody(product, supplierId, tenantId) {
        return {
            tenantId,
            supplierId,
            itemNumber: product.sku,
            itemName: product.name,
            description: product.description ?? "",
            category: product.category ?? "",
            baseUnitCost: product.unitCost ?? 0,
            currency: product.currency ?? "USD",
            unitOfMeasure: product.unitOfMeasure ?? "",
            leadTimeDays: product.leadTimeDays ?? 0,
            leadTimeMinDays: 0,
            leadTimeMaxDays: 0,
            minimumOrderQuantity: product.minimumOrderQuantity ?? 0,
            orderMultiple: product.orderMultiple ?? 0,
            effectiveFrom: product.effectiveFrom?.getTime() ?? 0,
            effectiveTo: product.effectiveTo?.getTime() ?? 0,
            supplierSku: product.externalId ?? product.sku,
            notes: "",
            tags: product.tags ?? [],
        };
    }
}
