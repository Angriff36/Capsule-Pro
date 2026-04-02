/**
 * Supplier Sync Service
 *
 * Handles synchronization of supplier catalogs to the VendorCatalog model.
 * Supports full catalog sync and incremental updates.
 */

import type { SupplierConnector, SupplierConnectorConfig, SupplierProduct, SupplierSyncResult } from "./types.js";

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
      select: { id: true; itemNumber: true };
    }) => Promise<Array<{ id: string; itemNumber: string }>>;
    findFirst: (args: {
      where: {
        tenantId: string;
        supplierId: string;
        itemNumber: string;
      };
    }) => Promise<{ id: string } | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
    update: (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => Promise<unknown>;
    updateMany: (args: {
      where: { id: { in: string[] } };
      data: Record<string, unknown>;
    }) => Promise<{ count: number }>;
  };
  $transaction: (operations: unknown[]) => Promise<unknown[]>;
}

/**
 * Service for syncing supplier catalogs to the local database.
 */
export class SupplierSyncService {
  constructor(private prisma: SupplierSyncDb) {}

  /**
   * Perform a full catalog sync from a supplier.
   */
  async syncCatalog(
    connector: SupplierConnector,
    config: SupplierConnectorConfig
  ): Promise<SupplierSyncResult> {
    const startTime = Date.now();
    const errors: Array<{ sku: string; error: string }> = [];
    let productsSynced = 0;
    let productsCreated = 0;
    let productsUpdated = 0;
    let productsDeactivated = 0;

    try {
      // Fetch catalog from supplier
      const products = await connector.fetchCatalog(config);
      productsSynced = products.length;

      // Get existing catalog entries
      const existingEntries = await this.prisma.vendorCatalog.findMany({
        where: {
          tenantId: config.tenantId,
          supplierId: config.supplierId,
        },
        select: { id: true, itemNumber: true },
      });

      const existingBySku = new Map(
        existingEntries.map((e) => [e.itemNumber, e.id])
      );

      // Process each product
      const createOps: unknown[] = [];
      const updateOps: unknown[] = [];

      for (const product of products) {
        try {
          const data = this.mapToVendorCatalog(product, config.supplierId, config.tenantId);
          const existingId = existingBySku.get(product.sku);

          if (existingId) {
            updateOps.push(
              this.prisma.vendorCatalog.update({
                where: { id: existingId },
                data,
              })
            );
            productsUpdated++;
            existingBySku.delete(product.sku);
          } else {
            createOps.push(
              this.prisma.vendorCatalog.create({
                data: {
                  ...data,
                  tenantId: config.tenantId,
                  supplierId: config.supplierId,
                },
              })
            );
            productsCreated++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({ sku: product.sku, error: errorMessage });
        }
      }

      // Execute batch operations
      const batchSize = 100;
      for (let i = 0; i < createOps.length; i += batchSize) {
        await this.prisma.$transaction(createOps.slice(i, i + batchSize));
      }
      for (let i = 0; i < updateOps.length; i += batchSize) {
        await this.prisma.$transaction(updateOps.slice(i, i + batchSize));
      }

      // Deactivate products no longer in catalog
      if (config.options?.syncFullCatalog !== false && existingBySku.size > 0) {
        const idsToDeactivate = Array.from(existingBySku.values());
        const result = await this.prisma.vendorCatalog.updateMany({
          where: { id: { in: idsToDeactivate } },
          data: { isActive: false },
        });
        productsDeactivated = result.count;
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
    } catch (error) {
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
  async syncChanges(
    connector: SupplierConnector,
    config: SupplierConnectorConfig,
    since: Date
  ): Promise<SupplierSyncResult> {
    const startTime = Date.now();
    const errors: Array<{ sku: string; error: string }> = [];
    let productsSynced = 0;
    let productsCreated = 0;
    let productsUpdated = 0;

    try {
      const products = await connector.fetchCatalog(config);

      // Filter to changed products
      const changedProducts = products.filter((p) => {
        if (!p.effectiveFrom) return true;
        return new Date(p.effectiveFrom) >= since;
      });

      productsSynced = changedProducts.length;

      for (const product of changedProducts) {
        try {
          const data = this.mapToVendorCatalog(product, config.supplierId, config.tenantId);
          const existing = await this.prisma.vendorCatalog.findFirst({
            where: {
              tenantId: config.tenantId,
              supplierId: config.supplierId,
              itemNumber: product.sku,
            },
          });

          if (existing) {
            await this.prisma.vendorCatalog.update({
              where: { id: existing.id },
              data,
            });
            productsUpdated++;
          } else {
            await this.prisma.vendorCatalog.create({
              data: { ...data, tenantId: config.tenantId, supplierId: config.supplierId },
            });
            productsCreated++;
          }
        } catch (error) {
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
    } catch (error) {
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
   * Map a SupplierProduct to VendorCatalog data.
   */
  private mapToVendorCatalog(
    product: SupplierProduct,
    supplierId: string,
    tenantId: string
  ): Record<string, unknown> {
    return {
      itemNumber: product.sku,
      itemName: product.name,
      description: product.description ?? null,
      category: product.category ?? null,
      baseUnitCost: product.unitCost,
      currency: product.currency,
      unitOfMeasure: product.unitOfMeasure,
      leadTimeDays: product.leadTimeDays ?? null,
      minimumOrderQuantity: product.minimumOrderQuantity ?? null,
      orderMultiple: product.orderMultiple ?? null,
      supplierSku: product.sku,
      effectiveFrom: product.effectiveFrom ?? null,
      effectiveTo: product.effectiveTo ?? null,
      tags: product.tags ?? [],
      isActive: product.available,
    };
  }
}
