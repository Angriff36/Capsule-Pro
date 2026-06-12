/**
 * Supplier Catalog Webhook Tests
 *
 * Tests POST /api/webhooks/supplier-catalog and GET (health check).
 * POST validates payload with zod, verifies HMAC-SHA256 signature,
 * looks up the supplier, and upserts products via Manifest governance.
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSupplierFindFirst = vi.fn();
const mockUserFindFirst = vi.fn();
const mockVendorCatalogFindUnique = vi.fn();

vi.mock("@repo/database", () => ({
  database: {
    inventorySupplier: {
      findFirst: (...args: unknown[]) => mockSupplierFindFirst(...args),
    },
    user: {
      findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
    },
    vendorCatalog: {
      findUnique: (...args: unknown[]) => mockVendorCatalogFindUnique(...args),
    },
  },
}));
vi.mock("@/lib/database", () => ({
  database: {
    inventorySupplier: {
      findFirst: (...args: unknown[]) => mockSupplierFindFirst(...args),
    },
    user: {
      findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
    },
    vendorCatalog: {
      findUnique: (...args: unknown[]) => mockVendorCatalogFindUnique(...args),
    },
  },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));
vi.mock("@repo/observability/log", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@/app/lib/invariant", () => {
  class InvariantError extends Error {
    name = "InvariantError" as const;
  }
  return { invariant: vi.fn(), InvariantError };
});
vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@repo/notifications", () => ({}));

vi.mock("@repo/supplier-connectors", () => ({
  connectorRegistry: {
    get: vi.fn(),
    list: vi.fn(() => []),
    listMetadata: vi.fn(() => [
      { id: "us-foods", name: "US Foods" },
      { id: "charlies-produce", name: "Charlie's Produce" },
    ]),
  },
}));

vi.mock("node:crypto", () => ({
  createHmac: vi.fn(),
  timingSafeEqual: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imported mocks
// ---------------------------------------------------------------------------

const { connectorRegistry } = await import("@repo/supplier-connectors");
const { createHmac, timingSafeEqual } = await import("node:crypto");
const { runManifestCommand } = await import("@/lib/manifest/execute-command");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPPLIER_ID = "00000000-0000-4000-a000-000000000001";
const TENANT_ID = "00000000-0000-4000-a000-000000000030";
const WEBHOOK_SECRET = "test-webhook-secret-value";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createValidPayload(overrides: Record<string, unknown> = {}) {
  return {
    connectorId: "us-foods",
    supplierId: SUPPLIER_ID,
    event: "catalog.updated",
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
  return new Request("http://localhost/api/webhooks/supplier-catalog", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Supplier-Signature": "deadbeefcafe",
      ...headers,
    },
    body: JSON.stringify(payload),
  });
}

function setupSupplierAndUser() {
  mockSupplierFindFirst.mockResolvedValue({
    id: SUPPLIER_ID,
    tenantId: TENANT_ID,
  });
  mockUserFindFirst.mockResolvedValue({ id: "admin-user", role: "admin" });
  mockVendorCatalogFindUnique.mockResolvedValue(null); // no existing catalog entry → create
  vi.mocked(runManifestCommand).mockResolvedValue(
    new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Supplier Catalog Webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHmacSignature(true);
    mockEnvSecret("us-foods", WEBHOOK_SECRET);
    process.env.CRON_SECRET = "test-cron-secret";

    vi.mocked(connectorRegistry.get).mockReturnValue({
      id: "us-foods",
      name: "US Foods",
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SUPPLIER_US_FOODS_WEBHOOK_SECRET;
    delete process.env.SUPPLIER_CHARLIES_PRODUCE_WEBHOOK_SECRET;
    delete process.env.CRON_SECRET;
  });

  // -------------------------------------------------------- POST

  describe("POST /api/webhooks/supplier-catalog", () => {
    let POST: typeof import("@/app/api/webhooks/supplier-catalog/route").POST;
    let GET: typeof import("@/app/api/webhooks/supplier-catalog/route").GET;

    beforeEach(async () => {
      const mod = await import("@/app/api/webhooks/supplier-catalog/route");
      POST = mod.POST;
      GET = mod.GET;
    });

    it("returns 400 for invalid JSON body", async () => {
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

    it("returns 400 for payload failing zod validation", async () => {
      const request = createPostRequest({ connectorId: "" });
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Validation failed");
      expect(body.details).toBeDefined();
      expect(body.details.length).toBeGreaterThan(0);
    });

    it("returns 400 for invalid event type", async () => {
      const request = createPostRequest(
        createValidPayload({ event: "invalid.event" })
      );
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Validation failed");
    });

    it("returns 400 for empty products array", async () => {
      const request = createPostRequest(createValidPayload({ products: [] }));
      const response = await POST(request);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Validation failed");
    });

    it("returns 400 for unknown connectorId", async () => {
      vi.mocked(connectorRegistry.get).mockReturnValue(undefined);
      mockEnvSecret("unknown-connector", undefined);
      const request = createPostRequest(
        createValidPayload({ connectorId: "unknown-connector" })
      );

      const response = await POST(request);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Unknown connector: unknown-connector");
    });

    it("returns 401 when X-Supplier-Signature header is missing", async () => {
      const payload = createValidPayload();
      const request = new Request(
        "http://localhost/api/webhooks/supplier-catalog",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Missing X-Supplier-Signature header");
    });

    it("returns 500 when webhook secret is not configured", async () => {
      mockEnvSecret("us-foods", undefined);
      const request = createPostRequest(createValidPayload());
      const response = await POST(request);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Webhook secret not configured");
    });

    it("returns 401 when HMAC signature is invalid", async () => {
      mockHmacSignature(false);
      const request = createPostRequest(createValidPayload());
      const response = await POST(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Invalid signature");
    });

    it("returns 401 when signature format is invalid (non-hex)", async () => {
      vi.mocked(timingSafeEqual).mockImplementation(() => {
        throw new Error("Invalid hex string");
      });
      const request = createPostRequest(createValidPayload());
      const response = await POST(request);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("Invalid signature format");
    });

    it("returns 404 when supplier is not found", async () => {
      mockSupplierFindFirst.mockResolvedValue(null);
      const request = createPostRequest(createValidPayload());
      const response = await POST(request);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("Supplier not found");
    });

    it("upserts products and returns success", async () => {
      setupSupplierAndUser();
      const request = createPostRequest(createValidPayload());
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.received).toBe(true);
      expect(body.event).toBe("catalog.updated");
      expect(body.connector).toBe("US Foods");
      expect(body.productsProcessed).toBe(1);
      expect(body.errors).toBe(0);
    });

    it("calls runManifestCommand for new catalog entries", async () => {
      setupSupplierAndUser();
      const request = createPostRequest(createValidPayload());
      await POST(request);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "VendorCatalog",
          command: "create",
          body: expect.objectContaining({
            itemName: "Tomato Sauce",
            baseUnitCost: 12.5,
          }),
        })
      );
    });

    it("calls runManifestCommand update for existing catalog entries", async () => {
      setupSupplierAndUser();
      mockVendorCatalogFindUnique.mockResolvedValue({ id: "catalog-001" });
      const request = createPostRequest(createValidPayload());
      await POST(request);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "VendorCatalog",
          command: "update",
          body: expect.objectContaining({
            id: "catalog-001",
            itemName: "Tomato Sauce",
          }),
        })
      );
    });

    it("counts partial upsert errors but still returns 200", async () => {
      setupSupplierAndUser();
      vi.mocked(runManifestCommand)
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
        .mockResolvedValueOnce(
          new Response("error", {
            status: 500,
            headers: { "Content-Type": "application/json" },
          })
        );

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

    it("handles pricing.changed event", async () => {
      setupSupplierAndUser();
      const request = createPostRequest(
        createValidPayload({ event: "pricing.changed" })
      );
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.event).toBe("pricing.changed");
    });

    it("handles availability.changed event", async () => {
      setupSupplierAndUser();
      const request = createPostRequest(
        createValidPayload({ event: "availability.changed" })
      );
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.event).toBe("availability.changed");
    });
  });

  // -------------------------------------------------------- GET (Health Check)

  describe("GET /api/webhooks/supplier-catalog (health check)", () => {
    let GET: typeof import("@/app/api/webhooks/supplier-catalog/route").GET;

    beforeEach(async () => {
      const mod = await import("@/app/api/webhooks/supplier-catalog/route");
      GET = mod.GET;
    });

    it("returns 401 without auth", async () => {
      const request = new Request(
        "http://localhost/api/webhooks/supplier-catalog"
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("returns 200 with valid CRON_SECRET", async () => {
      const request = new Request(
        "http://localhost/api/webhooks/supplier-catalog",
        {
          headers: { authorization: "Bearer test-cron-secret" },
        }
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("ok");
    });

    it("lists connector metadata when authenticated", async () => {
      const request = new Request(
        "http://localhost/api/webhooks/supplier-catalog",
        {
          headers: { authorization: "Bearer test-cron-secret" },
        }
      );
      const response = await GET(request);
      const body = await response.json();

      expect(body.connectors).toEqual([
        { id: "us-foods", name: "US Foods" },
        { id: "charlies-produce", name: "Charlie's Produce" },
      ]);
    });

    it("lists supported events when authenticated", async () => {
      const request = new Request(
        "http://localhost/api/webhooks/supplier-catalog",
        {
          headers: { authorization: "Bearer test-cron-secret" },
        }
      );
      const response = await GET(request);
      const body = await response.json();

      expect(body.supportedEvents).toEqual([
        "catalog.updated",
        "pricing.changed",
        "availability.changed",
      ]);
    });
  });
});
