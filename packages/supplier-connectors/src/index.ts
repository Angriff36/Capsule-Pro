/**
 * @repo/supplier-connectors
 *
 * Supplier connector interfaces and implementations for
 * integrating with food service distributors (US Foods, Charlie's Produce, etc.)
 */

// Types
export type {
  SupplierConnector,
  SupplierConnectorConfig,
  SupplierProduct,
  SupplierSyncResult,
} from "./types.js";

// Registry
export { connectorRegistry, ConnectorRegistry } from "./registry.js";

// Sync Service
export { SupplierSyncService } from "./sync-service.js";
export type { SupplierSyncDb } from "./sync-service.js";

// Connectors
export { usFoodsConnector } from "./connectors/us-foods.js";
export { charliesProduceConnector } from "./connectors/charlies-produce.js";
