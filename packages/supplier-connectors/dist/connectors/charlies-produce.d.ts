/**
 * Charlie's Produce Supplier Connector
 *
 * Charlie's Produce is a regional produce distributor that likely uses
 * a REST API for integration (common for regional distributors).
 *
 * INTEGRATION PATH:
 * 1. Contact Charlie's Produce to obtain API credentials
 * 2. Get API base URL (likely something like https://api.charliesproduce.com)
 * 3. Obtain API key or OAuth credentials
 * 4. Review their API documentation for available endpoints
 *
 * LIKELY API STRUCTURE (based on common distributor patterns):
 * - GET /catalog - List all products
 * - GET /catalog/{sku} - Get single product details
 * - GET /availability?skus=... - Check availability
 * - GET /pricing?skus=... - Get current pricing
 * - POST /orders - Submit purchase orders
 *
 * CREDENTIALS NEEDED:
 * - apiBaseUrl: API server URL
 * - apiKey: API key for authentication
 * - (optionally) apiSecret: For HMAC signature auth
 */
import type { SupplierConnector, SupplierConnectorConfig, SupplierProduct } from "../types.js";
/**
 * Charlie's Produce connector implementation.
 *
 * This is a stub implementation that documents the integration
 * requirements. Live implementation requires API credentials from
 * Charlie's Produce.
 */
export declare class CharliesProduceConnector implements SupplierConnector {
    readonly id = "charlies-produce";
    readonly name = "Charlie's Produce";
    readonly isStub = true;
    /**
     * Test connection to Charlie's Produce API.
     *
     * LIVE IMPLEMENTATION:
     * Make a simple authenticated request to verify credentials work.
     * Common patterns:
     * - GET /health or /status endpoint
     * - GET /catalog with limit=1 to test auth
     *
     * @param config - Must contain apiBaseUrl and apiKey
     */
    testConnection(config: SupplierConnectorConfig): Promise<boolean>;
    /**
     * Fetch product catalog from Charlie's Produce.
     *
     * LIVE IMPLEMENTATION:
     * GET /catalog endpoint with optional query parameters:
     * - category: Filter by category
     * - updatedSince: Only products updated since date (for incremental sync)
     * - limit/offset: Pagination
     *
     * Response should include:
     * - Products with SKU, name, description
     * - Current pricing and unit of measure
     * - Availability status
     * - Category/classification
     */
    fetchCatalog(config: SupplierConnectorConfig): Promise<SupplierProduct[]>;
    /**
     * Check real-time availability for SKUs.
     *
     * LIVE IMPLEMENTATION:
     * GET /availability endpoint with query parameter for SKUs.
     * May also be available as part of catalog response with
     * real-time flag.
     */
    checkAvailability(_config: SupplierConnectorConfig, skus: string[]): Promise<Record<string, {
        available: boolean;
        quantity?: number;
    }>>;
    /**
     * Fetch current pricing for SKUs.
     *
     * LIVE IMPLEMENTATION:
     * GET /pricing endpoint with query parameter for SKUs.
     * May also be available as part of catalog response.
     *
     * Regional produce distributors often have:
     * - Seasonal pricing that changes frequently
     * - Volume-based discounts
     * - Contract-specific pricing
     */
    fetchPricing(_config: SupplierConnectorConfig, _skus: string[]): Promise<Record<string, {
        unitCost: number;
        currency: string;
        effectiveFrom?: Date;
    }>>;
}
/**
 * Singleton instance of the Charlie's Produce connector.
 */
export declare const charliesProduceConnector: CharliesProduceConnector;
//# sourceMappingURL=charlies-produce.d.ts.map