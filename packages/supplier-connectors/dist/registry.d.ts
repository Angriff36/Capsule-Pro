/**
 * Supplier Connector Registry
 *
 * Central registry for all available supplier connectors.
 * Connectors register themselves here and can be looked up by ID.
 *
 * Usage:
 * ```typescript
 * import { connectorRegistry } from "@repo/supplier-connectors";
 *
 * // Get a specific connector
 * const usFoods = connectorRegistry.get("us-foods");
 *
 * // List all available connectors
 * const allConnectors = connectorRegistry.list();
 * ```
 */
import type { SupplierConnector } from "./types.js";
/**
 * Registry for supplier connectors.
 *
 * Maintains a map of connector instances keyed by their unique ID.
 */
export declare class ConnectorRegistry {
    private connectors;
    /**
     * Register a new supplier connector.
     *
     * @param connector - The connector instance to register
     * @throws Error if a connector with the same ID is already registered
     */
    register(connector: SupplierConnector): void;
    /**
     * Get a connector by its ID.
     *
     * @param id - The connector ID to look up
     * @returns The connector instance, or undefined if not found
     */
    get(id: string): SupplierConnector | undefined;
    /**
     * Check if a connector is registered.
     *
     * @param id - The connector ID to check
     * @returns true if the connector is registered
     */
    has(id: string): boolean;
    /**
     * List all registered connectors.
     *
     * @returns Array of all connector instances
     */
    list(): SupplierConnector[];
    /**
     * List connector metadata (without implementation details).
     *
     * Useful for API responses that need to show available connectors
     * without exposing the full connector implementation.
     *
     * @returns Array of connector metadata
     */
    listMetadata(): Array<{
        id: string;
        name: string;
        isStub: boolean;
    }>;
    /**
     * Remove a connector from the registry.
     *
     * @param id - The connector ID to remove
     * @returns true if the connector was removed
     */
    remove(id: string): boolean;
    /**
     * Clear all connectors from the registry.
     *
     * Useful for testing or reinitializing.
     */
    clear(): void;
}
/**
 * Singleton registry instance.
 *
 * Pre-registered with all built-in connectors.
 */
export declare const connectorRegistry: ConnectorRegistry;
//# sourceMappingURL=registry.d.ts.map