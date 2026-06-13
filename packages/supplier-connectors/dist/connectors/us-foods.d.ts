/**
 * US Foods Supplier Connector
 *
 * US Foods uses EDI (Electronic Data Interchange) via their FoodServices portal
 * for catalog and ordering integration. There is no public REST API.
 *
 * INTEGRATION PATH:
 * 1. Contact US Foods to enable EDI integration for your account
 * 2. Obtain EDI trading partner ID and communication credentials
 * 3. Set up AS2 or FTP connection for document exchange
 * 4. Configure transaction sets:
 *    - X12 832 (Price/Sales Catalog) for product catalog
 *    - X12 846 (Inventory Inquiry) for availability
 *    - X12 850 (Purchase Order) for ordering
 *    - X12 810 (Invoice) for billing
 *
 * EDI DOCUMENT EXCHANGE:
 * US Foods typically exchanges EDI documents via:
 * - AS2 (Applicability Statement 2) over HTTPS
 * - FTP/SFTP file transfer
 * - Value-Added Network (VAN) providers
 *
 * CREDENTIALS NEEDED:
 * - apiBaseUrl: EDI endpoint URL or AS2 server
 * - apiKey: Trading partner ID
 * - apiSecret: AS2 authentication credentials or FTP password
 */
import type { SupplierConnector, SupplierConnectorConfig, SupplierProduct } from "../types.js";
/**
 * US Foods connector implementation.
 *
 * This is a stub implementation that documents the integration
 * requirements. Live implementation requires EDI infrastructure.
 */
export declare class UsFoodsConnector implements SupplierConnector {
    readonly id = "us-foods";
    readonly name = "US Foods";
    readonly isStub = true;
    /**
     * Test connection to US Foods EDI system.
     *
     * LIVE IMPLEMENTATION:
     * - For AS2: Send a test MDN (Message Disposition Notification)
     * - For FTP: Attempt to connect and list the inbound directory
     *
     * @param config - Must contain apiBaseUrl, apiKey (trading partner ID), apiSecret
     */
    testConnection(config: SupplierConnectorConfig): Promise<boolean>;
    /**
     * Fetch product catalog from US Foods.
     *
     * LIVE IMPLEMENTATION:
     * 1. Request X12 832 (Price/Sales Catalog) document
     * 2. Parse the 832 document using parseEdi832Catalog()
     * 3. Map to SupplierProduct format
     *
     * The 832 document may be delivered:
     * - On-demand via EDI request
     * - Scheduled (e.g., nightly file delivery)
     * - Triggered by catalog changes
     */
    fetchCatalog(_config: SupplierConnectorConfig): Promise<SupplierProduct[]>;
    /**
     * Check real-time availability for SKUs.
     *
     * LIVE IMPLEMENTATION:
     * Send X12 846 (Inventory Inquiry) transaction and parse response.
     * The 846 document returns stock levels by warehouse location.
     */
    checkAvailability(_config: SupplierConnectorConfig, skus: string[]): Promise<Record<string, {
        available: boolean;
        quantity?: number;
    }>>;
    /**
     * Fetch current pricing for SKUs.
     *
     * LIVE IMPLEMENTATION:
     * Request updated pricing via X12 832 or retrieve from
     * cached catalog data. US Foods pricing may be contract-specific.
     */
    fetchPricing(_config: SupplierConnectorConfig, _skus: string[]): Promise<Record<string, {
        unitCost: number;
        currency: string;
        effectiveFrom?: Date;
    }>>;
}
/**
 * Parse an X12 832 (Price/Sales Catalog) document.
 *
 * The 832 transaction set is used to transmit:
 * - Product information and descriptions
 * - Pricing (contract and list prices)
 * - Unit of measure
 * - Packaging information
 * - Effective dates for pricing
 *
 * X12 832 STRUCTURE (simplified):
 * - ST (Transaction Set Header) - 832
 * - BCT (Beginning Segment for Price Catalog)
 * - N1 (Name) - Vendor/Supplier identification
 * - LIN (Item Identification) - Product SKU
 * - PID (Product Item Description) - Name, description
 * - CTP (Pricing Information) - Unit price, currency
 * - DTM (Date/Time Reference) - Effective dates
 * - SE (Transaction Set Trailer)
 *
 * @param ediContent - Raw EDI X12 832 document content
 * @returns Parsed supplier products
 *
 * BLOCKER: EDI infrastructure not yet available. Implement full 832 parsing with proper segment handling.
 * Tracked as capsule-pro/TODO:us-foods-edi-integration
 */
export declare function parseEdi832Catalog(_ediContent: string): SupplierProduct[];
/**
 * Singleton instance of the US Foods connector.
 */
export declare const usFoodsConnector: UsFoodsConnector;
//# sourceMappingURL=us-foods.d.ts.map