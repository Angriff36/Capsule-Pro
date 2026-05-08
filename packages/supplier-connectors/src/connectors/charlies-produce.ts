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

import type {
  SupplierConnector,
  SupplierConnectorConfig,
  SupplierProduct,
} from "../types.js";

/**
 * Charlie's Produce connector implementation.
 *
 * This is a stub implementation that documents the integration
 * requirements. Live implementation requires API credentials from
 * Charlie's Produce.
 */
export class CharliesProduceConnector implements SupplierConnector {
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
  async testConnection(config: SupplierConnectorConfig): Promise<boolean> {
    const { apiBaseUrl, apiKey } = config.credentials;

    // Validate required credentials are present
    if (!(apiBaseUrl && apiKey)) {
      console.warn(
        "[charlies-produce] Missing required credentials: apiBaseUrl, apiKey"
      );
      return false;
    }

    // BLOCKER: API credentials from Charlie's Produce not yet obtained.
    // Example: fetch(`${apiBaseUrl}/health`, { headers: { 'Authorization': `Bearer ${apiKey}` } })
    // Tracked as capsule-pro/TODO:charlies-produce-api-integration
    console.log(
      "[charlies-produce] Connection test not implemented - API credentials required"
    );
    return false;
  }

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
  async fetchCatalog(
    config: SupplierConnectorConfig
  ): Promise<SupplierProduct[]> {
    const { apiBaseUrl, apiKey } = config.credentials;

    // BLOCKER: API credentials from Charlie's Produce not yet obtained.
    // const response = await fetch(`${apiBaseUrl}/catalog`, {
    //   headers: {
    //     'Authorization': `Bearer ${apiKey}`,
    //     'Content-Type': 'application/json',
    //   },
    // });
    // const data = await response.json();
    // return data.products.map(p => ({
    //   externalId: p.id,
    //   sku: p.sku,
    //   name: p.name,
    //   description: p.description,
    //   category: p.category,
    //   unitOfMeasure: p.unitOfMeasure,
    //   unitCost: p.unitCost,
    //   currency: p.currency || 'USD',
    //   available: p.inStock,
    //   quantityAvailable: p.quantityOnHand,
    // }));

    console.log(
      "[charlies-produce] Catalog fetch not implemented - API credentials required"
    );
    return [];
  }

  /**
   * Check real-time availability for SKUs.
   *
   * LIVE IMPLEMENTATION:
   * GET /availability endpoint with query parameter for SKUs.
   * May also be available as part of catalog response with
   * real-time flag.
   */
  async checkAvailability(
    config: SupplierConnectorConfig,
    skus: string[]
  ): Promise<Record<string, { available: boolean; quantity?: number }>> {
    // BLOCKER: API credentials from Charlie's Produce not yet obtained.
    // Tracked as capsule-pro/TODO:charlies-produce-api-integration
    // const response = await fetch(`${apiBaseUrl}/availability?skus=${skus.join(',')}`, {
    //   headers: { 'Authorization': `Bearer ${apiKey}` },
    // });
    // return response.json();

    console.log(
      "[charlies-produce] Availability check not implemented - API credentials required"
    );

    // Return unavailable for all SKUs as stub
    const result: Record<string, { available: boolean; quantity?: number }> =
      {};
    for (const sku of skus) {
      result[sku] = { available: false, quantity: 0 };
    }
    return result;
  }

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
  async fetchPricing(
    config: SupplierConnectorConfig,
    skus: string[]
  ): Promise<
    Record<string, { unitCost: number; currency: string; effectiveFrom?: Date }>
  > {
    // BLOCKER: API credentials from Charlie's Produce not yet obtained.
    // Tracked as capsule-pro/TODO:charlies-produce-api-integration
    // const response = await fetch(`${apiBaseUrl}/pricing?skus=${skus.join(',')}`, {
    //   headers: { 'Authorization': `Bearer ${apiKey}` },
    // });
    // return response.json();

    console.log(
      "[charlies-produce] Pricing fetch not implemented - API credentials required"
    );
    return {};
  }
}

/**
 * Singleton instance of the Charlie's Produce connector.
 */
export const charliesProduceConnector = new CharliesProduceConnector();
