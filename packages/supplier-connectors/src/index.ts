/**
 * @repo/supplier-connectors
 *
 * Supplier connector interfaces and implementations for
 * integrating with food service distributors (US Foods, Charlie's Produce, etc.)
 */

export { charliesProduceConnector } from "./connectors/charlies-produce.js";
// Connectors
export { usFoodsConnector } from "./connectors/us-foods.js";
// Registry
export { ConnectorRegistry, connectorRegistry } from "./registry.js";
export type { SupplierSyncDb } from "./sync-service.js";
// Sync Service
export { SupplierSyncService } from "./sync-service.js";
// Types
export type {
  SupplierConnector,
  SupplierConnectorConfig,
  SupplierProduct,
  SupplierSyncResult,
} from "./types.js";
