/**
 * Supplier Connector Types
 *
 * Core interfaces for supplier integration connectors.
 * Each supplier (US Foods, Charlie's Produce, etc.) implements
 * the SupplierConnector interface to provide catalog sync, availability,
 * and pricing data.
 */

/**
 * Represents a product from a supplier's catalog.
 */
export interface SupplierProduct {
  /** Unique identifier in the supplier's system */
  externalId: string;
  /** Stock keeping unit / product code */
  sku: string;
  /** Product name */
  name: string;
  /** Product description */
  description?: string;
  /** Product category for grouping */
  category?: string;
  /** Unit of measure (e.g., "EA", "CASE", "LB", "GAL") */
  unitOfMeasure: string;
  /** Cost per unit in the specified currency */
  unitCost: number;
  /** Currency code (ISO 4217, e.g., "USD") */
  currency: string;
  /** Whether the product is currently available */
  available: boolean;
  /** Current quantity available (if known) */
  quantityAvailable?: number;
  /** Standard lead time in days for delivery */
  leadTimeDays?: number;
  /** Minimum order quantity */
  minimumOrderQuantity?: number;
  /** Order must be in multiples of this quantity */
  orderMultiple?: number;
  /** When this pricing becomes effective */
  effectiveFrom?: Date;
  /** When this pricing expires */
  effectiveTo?: Date;
  /** Arbitrary tags for categorization */
  tags?: string[];
}

/**
 * Result of a catalog sync operation.
 */
export interface SupplierSyncResult {
  /** ID of the connector that performed the sync */
  connectorId: string;
  /** Total number of products processed */
  productsSynced: number;
  /** Number of existing products updated */
  productsUpdated: number;
  /** Number of new products created */
  productsCreated: number;
  /** Number of products deactivated (no longer in catalog) */
  productsDeactivated: number;
  /** Errors encountered during sync */
  errors: Array<{ sku: string; error: string }>;
  /** Timestamp when sync completed */
  syncedAt: Date;
  /** Duration of the sync operation in milliseconds */
  durationMs: number;
}

/**
 * Configuration for connecting to a supplier.
 */
export interface SupplierConnectorConfig {
  /** ID of the supplier in our system (InventorySupplier.id) */
  supplierId: string;
  /** Tenant ID for multi-tenancy */
  tenantId: string;
  /** Connector-specific credentials (API keys, etc.) */
  credentials: Record<string, string>;
  /** Optional sync configuration */
  options?: {
    /** Perform a full catalog sync vs. incremental */
    syncFullCatalog?: boolean;
    /** Only sync products in these categories */
    categoryFilter?: string[];
    /** Automatically activate new products */
    autoActivate?: boolean;
  };
}

/**
 * Interface that all supplier connectors must implement.
 *
 * Each supplier integration (US Foods, Charlie's Produce, etc.)
 * implements this interface to provide standardized access to
 * catalog data, availability, and pricing.
 */
export interface SupplierConnector {
  /** Unique identifier for this connector type */
  readonly id: string;

  /** Human-readable name of the supplier */
  readonly name: string;

  /**
   * Test the connection to the supplier's system.
   *
   * Should validate that credentials are correct and the API
   * is accessible. Returns true if connection is successful.
   *
   * @param config - Connection configuration with credentials
   * @returns Promise resolving to true if connection works
   */
  testConnection(config: SupplierConnectorConfig): Promise<boolean>;

  /**
   * Fetch the supplier's product catalog.
   *
   * Depending on the supplier, this may return the full catalog
   * or a filtered subset based on config.options.categoryFilter.
   *
   * @param config - Connection configuration
   * @returns Promise resolving to array of supplier products
   */
  fetchCatalog(config: SupplierConnectorConfig): Promise<SupplierProduct[]>;

  /**
   * Check real-time availability for specific SKUs.
   *
   * Some suppliers provide real-time inventory levels. For those
   * that don't, this should return the last known availability
   * from the catalog.
   *
   * @param config - Connection configuration
   * @param skus - SKUs to check availability for
   * @returns Promise resolving to map of SKU to availability info
   */
  checkAvailability(
    config: SupplierConnectorConfig,
    skus: string[]
  ): Promise<Record<string, { available: boolean; quantity?: number }>>;

  /**
   * Fetch current pricing for specific SKUs.
   *
   * Returns the current unit cost and effective date for each SKU.
   * Some suppliers may have time-based pricing that changes.
   *
   * @param config - Connection configuration
   * @param skus - SKUs to fetch pricing for
   * @returns Promise resolving to map of SKU to pricing info
   */
  fetchPricing(
    config: SupplierConnectorConfig,
    skus: string[]
  ): Promise<
    Record<string, { unitCost: number; currency: string; effectiveFrom?: Date }>
  >;
}
