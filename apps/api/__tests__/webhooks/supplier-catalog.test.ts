/**
 * Supplier Catalog Webhook Integration Tests
 *
 * Tests POST /api/webhooks/supplier-catalog and GET (health check).
 * POST validates payload with zod, verifies HMAC-SHA256 signature,
 * looks up the supplier, and upserts products into vendorCatalog.
 *
 * Covers: payload validation, signature verification, supplier lookup,
 * product upsert, partial failures, health check, and error handling.
 */

import { database } from "@repo/database";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/database", async () => {
  const mod =
    await vi.importActual<typeof import("@repo/database")>("@repo/database");
  return mod;
});
vi.mock("@repo/supplier-connectors", () => {
  return {
    connectorRegistry: {
      get: vi.fn(),
      list: vi.fn(() => []),
      listMetadata: vi.fn(() => [
        { id: "us-foods", name: "US Foods" },
        { id: "charlies-produce", name: "Charlie's Produce" },
      ]),
    },
  };
});
vi.mock("node:crypto", () => ({
  createHmac: vi.fn(),
  timingSafeEqual: vi.fn(),
}));

// --- Import mocked modules ---

const { connectorRegistry } = await import("@repo/supplier-connectors");
const { createHmac, timingSafeEqual } = await import("node:crypto");

// --- Route import ---

import { GET, POST } from "@/app/api/webhooks/supplier-catalog/route";

// --- Constants ---

const TEST_SUPPLIER_ID = "00000000-0000-4000-a000-000000000001";
const TEST_TENANT_ID = "00000000-0000-4000-a000-000000000030";
const WEBHOOK_SECRET = "test-webhook-secret-value";

// --- Helpers ---

function createValidPayload(overrides: Record<string, unknown> = {}) {
  return {
    connectorId: "us-foods",
    supplierId: TEST_SUPPLIER_ID,
    event: "catalog.updated" as const,
    timestamp: "2026-04-29T12:00:00.000Z",
    products: [
      {
        externalId: "ext-001",
        sku: "SKU-001",
        name: "Tomato Sauce",
        unitCost: 12.5,
        currency: "USD",
        unitOfMeasure: "case",
        available: true,
        quantityAvailable: 100,
        category: "Sauces",
        description: "Premium tomato sauce",
        leadTimeDays: 3,
        minimumOrderQuantity: 1,
        orderMultiple: 6,
      },
    ],
    ...overrides,
  };
}

function mockHmacSignature(valid = true) {
  const mockDigest = vi.fn().mockReturnValue("deadbeefcafe");
  vi.mocked(createHmac).mockReturnValue({
    update: vi.fn().mockReturnValue({ digest: mockDigest }),
  } as never);
  vi.mocked(timingSafeEqual).mockReturnValue(valid);
}

function mockEnvSecret(connectorId: string, secret: string | undefined) {
  const envKey = `SUPPLIER_${connectorId.toUpperCase().replace(/-/g, "_")}_WEBHOOK_SECRET`;
  if (secret) {
    process.env[envKey] = secret;
  } else {
    delete process.env[envKey];
  }
  return envKey;
}

function createPostRequest(
  payload: unknown,
  headers: Record<string, string> = {}
) {
  const body = JSON.stringify(payload);
  return new Request("http://localhost/api/webhooks/supplier-catalog", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Supplier-Signature": "deadbeefcafe",
      ...headers,
    },
    body,
  });
}

// --- Tests ---

describe("Supplier Catalog Webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHmacSignature(true);
    mockEnvSecret("us-foods", WEBHOOK_SECRET);

    vi.mocked(connectorRegistry.get).mockReturnValue({
      id: "us-foods",
      name: "US Foods",
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up env vars
    delete process.env.SUPPLIER_US_FOODS_WEBHOOK_SECRET;
    delete process.env.SUPPLIER_CHARLIES_PRODUCE_WEBHOOK_SECRET;
  });

  // -------------------------------------------------------- POST

  describe("POST /api/webhooks/supplier-catalog", () => {
    it("should return 400 for invalid JSON body", async () => {
      const request = new Request(
        "http://localhost/api/webhooks/supplier-catalog",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "not-valid-json{{{",
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Invalid JSON");
    });

    it("should return 400 for payload failing zod validation (missing fields)", async () => {
      const invalidPayload = {
        connectorId: "",
        // missing supplierId, event, timestamp, products
      };

      const request = createPostRequest(invalidPayload);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Validation failed");
      expect(body.details).toBeDefined();
      expect(body.details.length).toBeGreaterThan(0);
    });

    it("should return 400 for invalid event type", async () => {
      const payload = createValidPayload({ event: "invalid.event" });
      const request = createPostRequest(payload);

      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Validation failed");
    });

    it("should return 400 for empty products array", async () => {
      const payload = createValidPayload({ products: [] });
      const request = createPostRequest(payload);

      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Validation failed");
    });

    it("should return 400 for unknown connectorId", async () => {
      vi.mocked(connectorRegistry.get).mockReturnValue(undefined);
      const payload = createValidPayload({ connectorId: "unknown-connector" });
      mockEnvSecret("unknown-connector", undefined);

      const request = createPostRequest(payload);
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Unknown connector: unknown-connector");
    });

    it("should return 401 when X-Supplier-Signature header is missing", async () => {
      const payload = createValidPayload();
      const body = JSON.stringify(payload);
      const request = new Request(
        "http://localhost/api/webhooks/supplier-catalog",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(401);
      const body2 = await response.json();
      expect(body2.error).toBe("Missing X-Supplier-Signature header");
    });

    it("should return 500 when webhook secret is not configured", async () => {
      mockEnvSecret("us-foods", undefined);
      const payload = createValidPayload();

      const request = createPostRequest(payload);
      const response = await POST(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Webhook secret not configured");
    });

    it("should return 401 when HMAC signature is invalid", async () => {
      mockHmacSignature(false);
      const payload = createValidPayload();

      const request = createPostRequest(payload);
      const response = await POST(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Invalid signature");
    });

    it("should return 401 when signature format is invalid (non-hex)", async () => {
      vi.mocked(timingSafeEqual).mockImplementation(() => {
        throw new Error("Invalid hex string");
      });
      const payload = createValidPayload();

      const request = createPostRequest(payload);
      const response = await POST(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Invalid signature format");
    });

    it("should return 404 when supplier is not found", async () => {
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue(null);
      const payload = createValidPayload();

      const request = createPostRequest(payload);
      const response = await POST(request);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("Supplier not found");
    });

    it("should upsert products and return success when supplier exists", async () => {
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue({
        id: TEST_SUPPLIER_ID,
        tenantId: TEST_TENANT_ID,
      } as never);
      vi.mocked(database.vendorCatalog.upsert).mockResolvedValue({} as never);

      const payload = createValidPayload();
      const request = createPostRequest(payload);
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.received).toBe(true);
      expect(body.event).toBe("catalog.updated");
      expect(body.connector).toBe("US Foods");
      expect(body.productsProcessed).toBe(1);
      expect(body.errors).toBe(0);
    });

    it("should call vendorCatalog.upsert with correct fields", async () => {
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue({
        id: TEST_SUPPLIER_ID,
        tenantId: TEST_TENANT_ID,
      } as never);
      vi.mocked(database.vendorCatalog.upsert).mockResolvedValue({} as never);

      const payload = createValidPayload();
      const request = createPostRequest(payload);
      await POST(request);

      expect(database.vendorCatalog.upsert).toHaveBeenCalledTimes(1);
      const upsertCall = vi.mocked(database.vendorCatalog.upsert).mock
        .calls[0][0];
      expect(upsertCall.where.tenantId_supplierId_itemNumber!.tenantId).toBe(
        TEST_TENANT_ID
      );
      expect(upsertCall.where.tenantId_supplierId_itemNumber!.supplierId).toBe(
        TEST_SUPPLIER_ID
      );
      expect(upsertCall.where.tenantId_supplierId_itemNumber!.itemNumber).toBe(
        "SKU-001"
      );
      expect(upsertCall.create.itemName).toBe("Tomato Sauce");
      expect(upsertCall.create.baseUnitCost).toBe(12.5);
      expect(upsertCall.update.itemName).toBe("Tomato Sauce");
    });

    it("should count partial upsert errors but still return 200", async () => {
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue({
        id: TEST_SUPPLIER_ID,
        tenantId: TEST_TENANT_ID,
      } as never);

      // First call succeeds, second fails
      vi.mocked(database.vendorCatalog.upsert)
        .mockResolvedValueOnce({} as never)
        .mockRejectedValueOnce(new Error("DB constraint violation"));

      const payload = createValidPayload({
        products: [
          {
            externalId: "ext-001",
            sku: "SKU-001",
            name: "Product A",
            unitCost: 10,
            currency: "USD",
            unitOfMeasure: "each",
            available: true,
          },
          {
            externalId: "ext-002",
            sku: "SKU-002",
            name: "Product B",
            unitCost: 20,
            currency: "USD",
            unitOfMeasure: "case",
            available: false,
          },
        ],
      });

      const request = createPostRequest(payload);
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.productsProcessed).toBe(1);
      expect(body.errors).toBe(1);
    });

    it("should handle pricing.changed event", async () => {
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue({
        id: TEST_SUPPLIER_ID,
        tenantId: TEST_TENANT_ID,
      } as never);
      vi.mocked(database.vendorCatalog.upsert).mockResolvedValue({} as never);

      const payload = createValidPayload({ event: "pricing.changed" });
      const request = createPostRequest(payload);
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.event).toBe("pricing.changed");
    });

    it("should handle availability.changed event", async () => {
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue({
        id: TEST_SUPPLIER_ID,
        tenantId: TEST_TENANT_ID,
      } as never);
      vi.mocked(database.vendorCatalog.upsert).mockResolvedValue({} as never);

      const payload = createValidPayload({ event: "availability.changed" });
      const request = createPostRequest(payload);
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.event).toBe("availability.changed");
    });

    it("should use correct env var key for charlies-produce connector", async () => {
      vi.mocked(connectorRegistry.get).mockReturnValue({
        id: "charlies-produce",
        name: "Charlie's Produce",
      } as never);
      mockEnvSecret("charlies-produce", "cp-secret-123");
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue({
        id: TEST_SUPPLIER_ID,
        tenantId: TEST_TENANT_ID,
      } as never);
      vi.mocked(database.vendorCatalog.upsert).mockResolvedValue({} as never);

      const payload = createValidPayload({ connectorId: "charlies-produce" });
      const request = createPostRequest(payload);
      const response = await POST(request);

      expect(response.status).toBe(200);
      // Verify the env key was looked up correctly
      expect(process.env.SUPPLIER_CHARLIES_PRODUCE_WEBHOOK_SECRET).toBe(
        "cp-secret-123"
      );
    });
  });

  // -------------------------------------------------------- GET (Health Check)

  describe("GET /api/webhooks/supplier-catalog (health check)", () => {
    it("should return 200 with status ok", async () => {
      const response = await GET();

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("ok");
    });

    it("should list connector metadata", async () => {
      const response = await GET();
      const body = await response.json();

      expect(body.connectors).toEqual([
        { id: "us-foods", name: "US Foods" },
        { id: "charlies-produce", name: "Charlie's Produce" },
      ]);
    });

    it("should list supported events", async () => {
      const response = await GET();
      const body = await response.json();

      expect(body.supportedEvents).toEqual([
        "catalog.updated",
        "pricing.changed",
        "availability.changed",
      ]);
    });
  });
});
