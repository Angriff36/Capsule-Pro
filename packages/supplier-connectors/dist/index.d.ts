/**
 * @repo/supplier-connectors
 *
 * Supplier connector interfaces and implementations for
 * integrating with food service distributors (US Foods, Charlie's Produce, etc.)
 */
export { charliesProduceConnector } from "./connectors/charlies-produce.js";
export { usFoodsConnector } from "./connectors/us-foods.js";
export { ConnectorRegistry, connectorRegistry } from "./registry.js";
export type { SupplierSyncDb, VendorCatalogCommandFn } from "./sync-service.js";
export { SupplierSyncService } from "./sync-service.js";
export type { SupplierConnector, SupplierConnectorConfig, SupplierProduct, SupplierSyncResult, } from "./types.js";
//# sourceMappingURL=index.d.ts.map