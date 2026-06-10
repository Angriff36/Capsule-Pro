/**
 * Procurement Vendors API Tests
 *
 * Why these tests matter:
 *   The /api/procurement/vendors surface is the system of record for the
 *   tenant's supplier directory. Every downstream procurement object --
 *   purchase orders, requisitions, vendor contracts, vendor catalogs,
 *   ratings, and contacts -- references InventorySupplier.id. A regression
 *   on vendor create/update/delete silently breaks the entire procurement
 *   pipeline (orphaned POs, untraceable spend, broken catalog sync).
 *
 * Routes covered (7 total):
 *   - GET   /api/procurement/vendors/list              (Prisma list + counts)
 *   - GET   /api/procurement/vendors/[id]              (Prisma detail + nested includes)
 *   - POST  /api/procurement/vendors/commands/create   (via manifest dispatcher)
 *   - POST  /api/procurement/vendors/commands/update   (via manifest dispatcher)
 *   - POST  /api/procurement/vendors/commands/delete   (via manifest dispatcher)
 *   - POST  /api/procurement/vendors/commands/add-contact (via manifest dispatcher)
 *   - POST  /api/procurement/vendors/commands/rate     (via manifest dispatcher)
 *
 * Architecture note:
 *   Vendor command routes were consolidated into the singular manifest
 *   dispatcher at /api/manifest/[entity]/commands/[command]. Command
 *   tests verify that the dispatcher correctly resolves auth, tenant, and
 *   delegates to runManifestCommand with the right entity/command/body.
 *
 * Load-bearing invariants pinned by these tests:
 *   1. Auth + tenant isolation on every route (401/400 paths).
 *   2. The list endpoint returns the SHAPED legacy snake_case payload
 *      (`supplier_number`, `contact_count`, `catalog_item_count`) -- UI
 *      reads those exact field names.
 *   3. The list endpoint is a tenant + soft-delete query AND threads
 *      `clampLimit`/`clampOffset` into Prisma `take`/`skip` so a client
 *      cannot DOS the table with `limit=999999`.
 *   4. The detail endpoint runs a primary `findFirst` (with nested
 *      `vendorContacts` and `vendorRatings` includes) PLUS a secondary
 *      `vendorCatalog.count` -- tests pin that the count query carries the
 *      `isActive: true` filter so cancelled catalog rows do not inflate
 *      the badge.
 *   5. Command dispatcher tests pin auth gating and correct delegation
 *      to runManifestCommand with entity="InventorySupplier".
 *
 * Mock surface:
 *   - `database.inventorySupplier` (Prisma model -- list/detail)
 *   - `database.vendorCatalog` (Prisma model -- detail catalog count)
 *   - `auth` + `getTenantIdForOrg` (auth + tenant resolution)
 *   - `requireCurrentUser` (dispatcher auth)
 *   - `runManifestCommand` (manifest command execution)
 *   - `captureException` (Sentry -- pinned so 500 paths stay observable)
 */

import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@repo/database", () => ({
  database: {
    inventorySupplier: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    vendorCatalog: {
      count: vi.fn(),
    },
    vendorRating: {
      create: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    vendorContact: {
      findFirst: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
  requireTenantId: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("@/lib/manifest-response", async () => {
  const { NextResponse } = await import("next/server");
  return {
    manifestSuccessResponse: (data: unknown, status = 200) =>
      NextResponse.json(
        {
          success: true,
          ...(typeof data === "object" && data !== null ? data : { data }),
        },
        { status }
      ),
    manifestErrorResponse: (message: string, status: number) =>
      NextResponse.json({ success: false, message }, { status }),
  };
});

vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InvariantError";
    }
  },
}));

vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@repo/notifications", () => ({}));

vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));

vi.mock("@/lib/manifest/issue-log", () => ({
  logManifestIssue: vi.fn(),
}));

vi.mock("@/lib/database", async () => {
  const { database } = await import("@repo/database");
  return { database };
});

vi.mock("@/lib/pagination", () => ({
  clampLimit: (raw: string | null) => {
    const parsed = Number.parseInt(raw ?? "", 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return 50;
    return Math.min(parsed, 200);
  },
  clampOffset: (raw: string | null) => {
    const parsed = Number.parseInt(raw ?? "", 10);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
  },
}));

vi.mock("@repo/observability/log", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { auth } from "@repo/auth/server";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";
import { POST as manifestDispatch } from "@/app/api/manifest/[entity]/commands/[command]/route";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000010";
const TEST_ORG_ID = "org_proc_vendors_test";
const TEST_USER_ID = "user_proc_vendors_test";
const VENDOR_ID = "00000000-0000-0000-0000-000000000b01";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a dispatch helper for a specific InventorySupplier command */
const dispatch = (command: string) => (req: NextRequest) =>
  manifestDispatch(req, {
    params: Promise.resolve({ entity: "InventorySupplier", command }),
  });

const createVendor = dispatch("create");
const updateVendor = dispatch("update");
const deleteVendor = dispatch("delete");
const addContact = dispatch("addContact");
const rateVendor = dispatch("rate");

function authOk() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    email: "test@test.com",
    firstName: "Test",
    lastName: "User",
  } as never);
}

function authMissing() {
  vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);
  vi.mocked(requireCurrentUser).mockRejectedValue(
    (() => {
      const err = new Error("Unauthorized");
      err.name = "InvariantError";
      return err;
    })()
  );
}

function noTenant() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);
  vi.mocked(requireCurrentUser).mockRejectedValue(
    (() => {
      const err = new Error("Tenant not found");
      err.name = "InvariantError";
      return err;
    })()
  );
}

function makeRequest(
  url: string,
  init: { method?: string; body?: unknown } = {}
): NextRequest {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: init.method ?? (body ? "POST" : "GET"),
    headers,
    body,
  } as ConstructorParameters<typeof NextRequest>[1]);
}

function makeVendor(overrides: Record<string, unknown> = {}) {
  return {
    id: VENDOR_ID,
    tenantId: TEST_TENANT_ID,
    supplier_number: "VND-0001",
    name: "Acme Foods",
    contact_person: "Jane Doe",
    email: "jane@acme.test",
    phone: "555-0100",
    payment_terms: "NET_30",
    addressLine1: "1 Acme Way",
    addressLine2: null,
    city: "Townsville",
    state: "CA",
    postalCode: "90210",
    country: "US",
    taxId: "12-3456789",
    website: "https://acme.test",
    performanceRating: 4.5,
    notes: null,
    tags: ["preferred"],
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-01-15"),
    deletedAt: null,
    _count: { vendorContacts: 2, vendorCatalogs: 7 },
    ...overrides,
  };
}

/** Simulate a successful runManifestCommand response */
function dispatchSuccess(
  result: Record<string, unknown> = { id: VENDOR_ID }
): Response {
  return new Response(
    JSON.stringify({ success: true, result, events: [] }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

/** Simulate a failed runManifestCommand response */
function dispatchFailure(
  message: string,
  status: number
): Response {
  return new Response(
    JSON.stringify({ success: false, message }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Procurement Vendors API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // -------------------------------------------------------------------------
  // GET /api/procurement/vendors/list
  // -------------------------------------------------------------------------
  describe("GET /list", () => {
    it("returns 401 when unauthenticated", async () => {
      authMissing();
      const { GET } = await import("@/app/api/procurement/vendors/list/route");
      const res = await GET(
        makeRequest("http://localhost/api/procurement/vendors/list")
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when tenant cannot be resolved", async () => {
      noTenant();
      const { GET } = await import("@/app/api/procurement/vendors/list/route");
      const res = await GET(
        makeRequest("http://localhost/api/procurement/vendors/list")
      );
      expect(res.status).toBe(400);
    });

    it("returns shaped vendors with snake_case fields and counts", async () => {
      authOk();
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue([
        makeVendor(),
      ] as never);

      const { GET } = await import("@/app/api/procurement/vendors/list/route");
      const res = await GET(
        makeRequest("http://localhost/api/procurement/vendors/list")
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.vendors).toHaveLength(1);
      expect(body.vendors[0]).toMatchObject({
        id: VENDOR_ID,
        supplier_number: "VND-0001",
        name: "Acme Foods",
        contact_person: "Jane Doe",
        email: "jane@acme.test",
        phone: "555-0100",
        payment_terms: "NET_30",
        address_line1: "1 Acme Way",
        address_line2: null,
        city: "Townsville",
        state: "CA",
        postal_code: "90210",
        country: "US",
        tax_id: "12-3456789",
        website: "https://acme.test",
        performance_rating: 4.5,
        contact_count: 2,
        catalog_item_count: 7,
      });
      // limit/offset round-trip in the response envelope
      expect(body.limit).toBe(50);
      expect(body.offset).toBe(0);
    });

    it("threads search filter into a tenant-scoped OR clause", async () => {
      authOk();
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue(
        [] as never
      );

      const { GET } = await import("@/app/api/procurement/vendors/list/route");
      await GET(
        makeRequest("http://localhost/api/procurement/vendors/list?search=acme")
      );

      const call = vi.mocked(database.inventorySupplier.findMany).mock
        .calls[0]?.[0];
      expect(call?.where).toEqual(
        expect.objectContaining({
          tenantId: TEST_TENANT_ID,
          deletedAt: null,
          OR: [
            { name: { contains: "acme", mode: "insensitive" } },
            { contact_person: { contains: "acme", mode: "insensitive" } },
            { email: { contains: "acme", mode: "insensitive" } },
            { supplier_number: { contains: "acme", mode: "insensitive" } },
          ],
        })
      );
    });

    it("does NOT add an OR clause when search is omitted", async () => {
      authOk();
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue(
        [] as never
      );

      const { GET } = await import("@/app/api/procurement/vendors/list/route");
      await GET(makeRequest("http://localhost/api/procurement/vendors/list"));

      const call = vi.mocked(database.inventorySupplier.findMany).mock
        .calls[0]?.[0];
      expect(call?.where).not.toHaveProperty("OR");
    });

    it("clamps limit to MAX_LIMIT=200 and threads into Prisma take", async () => {
      authOk();
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue(
        [] as never
      );

      const { GET } = await import("@/app/api/procurement/vendors/list/route");
      const res = await GET(
        makeRequest(
          "http://localhost/api/procurement/vendors/list?limit=999999&offset=42"
        )
      );
      const body = await res.json();

      expect(body.limit).toBe(200);
      expect(body.offset).toBe(42);
      const call = vi.mocked(database.inventorySupplier.findMany).mock
        .calls[0]?.[0];
      expect(call?.take).toBe(200);
      expect(call?.skip).toBe(42);
    });

    it("orders by name asc and includes the soft-delete-aware count selects", async () => {
      authOk();
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue(
        [] as never
      );

      const { GET } = await import("@/app/api/procurement/vendors/list/route");
      await GET(makeRequest("http://localhost/api/procurement/vendors/list"));

      const call = vi.mocked(database.inventorySupplier.findMany).mock
        .calls[0]?.[0];
      expect(call?.orderBy).toEqual({ name: "asc" });
      expect(call?.include).toEqual({
        _count: {
          select: {
            vendorContacts: { where: { deletedAt: null } },
            vendorCatalogs: {
              where: { deletedAt: null, isActive: true },
            },
          },
        },
      });
    });

    it("captures Sentry and returns 500 on database error", async () => {
      authOk();
      vi.mocked(database.inventorySupplier.findMany).mockRejectedValue(
        new Error("boom")
      );

      const { GET } = await import("@/app/api/procurement/vendors/list/route");
      const res = await GET(
        makeRequest("http://localhost/api/procurement/vendors/list")
      );

      expect(res.status).toBe(500);
      expect(captureException).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/procurement/vendors/[id]
  // -------------------------------------------------------------------------
  describe("GET /[id]", () => {
    it("returns 401 when unauthenticated", async () => {
      authMissing();
      const { GET } = await import("@/app/api/procurement/vendors/[id]/route");
      const res = await GET(
        makeRequest(`http://localhost/api/procurement/vendors/${VENDOR_ID}`),
        { params: Promise.resolve({ id: VENDOR_ID }) }
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when tenant cannot be resolved", async () => {
      noTenant();
      const { GET } = await import("@/app/api/procurement/vendors/[id]/route");
      const res = await GET(
        makeRequest(`http://localhost/api/procurement/vendors/${VENDOR_ID}`),
        { params: Promise.resolve({ id: VENDOR_ID }) }
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 when the vendor does not exist", async () => {
      authOk();
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue(
        null as never
      );

      const { GET } = await import("@/app/api/procurement/vendors/[id]/route");
      const res = await GET(
        makeRequest(`http://localhost/api/procurement/vendors/${VENDOR_ID}`),
        { params: Promise.resolve({ id: VENDOR_ID }) }
      );
      expect(res.status).toBe(404);
    });

    it("returns vendor + contacts + ratings + catalogItemCount", async () => {
      authOk();
      const vendor = {
        ...makeVendor(),
        vendorContacts: [
          { id: "c1", contactName: "Primary", isPrimary: true },
          { id: "c2", contactName: "Other", isPrimary: false },
        ],
        vendorRatings: [
          { id: "r1", category: "overall", rating: 5, createdAt: new Date() },
        ],
      };
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue(
        vendor as never
      );
      vi.mocked(database.vendorCatalog.count).mockResolvedValue(12 as never);

      const { GET } = await import("@/app/api/procurement/vendors/[id]/route");
      const res = await GET(
        makeRequest(`http://localhost/api/procurement/vendors/${VENDOR_ID}`),
        { params: Promise.resolve({ id: VENDOR_ID }) }
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.vendor.id).toBe(VENDOR_ID);
      expect(body.contacts).toHaveLength(2);
      expect(body.ratings).toHaveLength(1);
      expect(body.catalogItemCount).toBe(12);

      // Pin the findFirst guard: tenant + soft-delete + id
      expect(database.inventorySupplier.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TEST_TENANT_ID, id: VENDOR_ID, deletedAt: null },
        })
      );

      // Pin the catalog count guard: includes isActive=true
      expect(database.vendorCatalog.count).toHaveBeenCalledWith({
        where: {
          tenantId: TEST_TENANT_ID,
          supplierId: VENDOR_ID,
          deletedAt: null,
          isActive: true,
        },
      });
    });

    it("captures Sentry and returns 500 on Prisma throw", async () => {
      authOk();
      vi.mocked(database.inventorySupplier.findFirst).mockRejectedValue(
        new Error("connection lost")
      );

      const { GET } = await import("@/app/api/procurement/vendors/[id]/route");
      const res = await GET(
        makeRequest(`http://localhost/api/procurement/vendors/${VENDOR_ID}`),
        { params: Promise.resolve({ id: VENDOR_ID }) }
      );

      expect(res.status).toBe(500);
      expect(captureException).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // POST commands via manifest dispatcher
  // -------------------------------------------------------------------------
  describe("POST commands (manifest dispatcher)", () => {
    beforeEach(() => {
      authOk();
      vi.mocked(runManifestCommand).mockResolvedValue(dispatchSuccess());
    });

    // --- Auth gating (applies to all commands) ---

    it("create: returns 401 when requireCurrentUser throws InvariantError", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        (() => {
          const err = new Error("Unauthorized");
          err.name = "InvariantError";
          return err;
        })()
      );
      const res = await createVendor(
        makeRequest("http://localhost/api/test", { body: { name: "X" } })
      );
      expect(res.status).toBe(401);
    });

    it("update: returns 401 when requireCurrentUser throws InvariantError", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        (() => {
          const err = new Error("Unauthorized");
          err.name = "InvariantError";
          return err;
        })()
      );
      const res = await updateVendor(
        makeRequest("http://localhost/api/test", {
          body: { vendorId: VENDOR_ID, name: "Renamed" },
        })
      );
      expect(res.status).toBe(401);
    });

    it("delete: returns 401 when requireCurrentUser throws InvariantError", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        (() => {
          const err = new Error("Unauthorized");
          err.name = "InvariantError";
          return err;
        })()
      );
      const res = await deleteVendor(
        makeRequest("http://localhost/api/test", { body: { vendorId: VENDOR_ID } })
      );
      expect(res.status).toBe(401);
    });

    it("addContact: returns 401 when requireCurrentUser throws InvariantError", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        (() => {
          const err = new Error("Unauthorized");
          err.name = "InvariantError";
          return err;
        })()
      );
      const res = await addContact(
        makeRequest("http://localhost/api/test", {
          body: { vendorId: VENDOR_ID, contactName: "Jane" },
        })
      );
      expect(res.status).toBe(401);
    });

    it("rate: returns 401 when requireCurrentUser throws InvariantError", async () => {
      vi.mocked(requireCurrentUser).mockRejectedValue(
        (() => {
          const err = new Error("Unauthorized");
          err.name = "InvariantError";
          return err;
        })()
      );
      const res = await rateVendor(
        makeRequest("http://localhost/api/test", {
          body: { vendorId: VENDOR_ID, category: "overall", rating: 4 },
        })
      );
      expect(res.status).toBe(401);
    });

    // --- Delegation to runManifestCommand ---

    it("create: delegates to runManifestCommand with InventorySupplier + create", async () => {
      const res = await createVendor(
        makeRequest("http://localhost/api/test", {
          body: { name: "New Vendor" },
        })
      );
      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "InventorySupplier",
          command: "create",
          body: { name: "New Vendor" },
        })
      );
    });

    it("update: delegates to runManifestCommand with InventorySupplier + update", async () => {
      const res = await updateVendor(
        makeRequest("http://localhost/api/test", {
          body: { vendorId: VENDOR_ID, name: "Renamed" },
        })
      );
      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "InventorySupplier",
          command: "update",
          body: { vendorId: VENDOR_ID, name: "Renamed" },
        })
      );
    });

    it("delete: delegates to runManifestCommand with InventorySupplier + delete", async () => {
      const res = await deleteVendor(
        makeRequest("http://localhost/api/test", {
          body: { vendorId: VENDOR_ID },
        })
      );
      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "InventorySupplier",
          command: "delete",
          body: { vendorId: VENDOR_ID },
        })
      );
    });

    it("addContact: delegates to runManifestCommand with InventorySupplier + addContact", async () => {
      const res = await addContact(
        makeRequest("http://localhost/api/test", {
          body: { vendorId: VENDOR_ID, contactName: "Jane" },
        })
      );
      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "InventorySupplier",
          command: "addContact",
          body: { vendorId: VENDOR_ID, contactName: "Jane" },
        })
      );
    });

    it("rate: delegates to runManifestCommand with InventorySupplier + rate", async () => {
      const res = await rateVendor(
        makeRequest("http://localhost/api/test", {
          body: { vendorId: VENDOR_ID, category: "overall", rating: 4 },
        })
      );
      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "InventorySupplier",
          command: "rate",
          body: { vendorId: VENDOR_ID, category: "overall", rating: 4 },
        })
      );
    });

    // --- runManifestCommand error propagation ---

    it("create: propagates 400 from runManifestCommand (missing name)", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        dispatchFailure("name is required", 400)
      );
      const res = await createVendor(
        makeRequest("http://localhost/api/test", { body: {} })
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toContain("name");
    });

    it("update: propagates 404 from runManifestCommand (vendor not found)", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        dispatchFailure("Vendor not found", 404)
      );
      const res = await updateVendor(
        makeRequest("http://localhost/api/test", {
          body: { vendorId: VENDOR_ID, name: "Renamed" },
        })
      );
      expect(res.status).toBe(404);
    });

    it("delete: propagates 400 from runManifestCommand (active POs)", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        dispatchFailure("3 active purchase orders", 400)
      );
      const res = await deleteVendor(
        makeRequest("http://localhost/api/test", {
          body: { vendorId: VENDOR_ID },
        })
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toContain("3 active purchase order");
    });

    it("delete: propagates 404 from runManifestCommand (already gone)", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        dispatchFailure("Vendor not found", 404)
      );
      const res = await deleteVendor(
        makeRequest("http://localhost/api/test", {
          body: { vendorId: VENDOR_ID },
        })
      );
      expect(res.status).toBe(404);
    });

    it("addContact: propagates 400 from runManifestCommand (missing fields)", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        dispatchFailure("contactName is required", 400)
      );
      const res = await addContact(
        makeRequest("http://localhost/api/test", {
          body: { vendorId: VENDOR_ID },
        })
      );
      expect(res.status).toBe(400);
    });

    it("addContact: propagates 404 from runManifestCommand (vendor not found)", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        dispatchFailure("Vendor not found", 404)
      );
      const res = await addContact(
        makeRequest("http://localhost/api/test", {
          body: { vendorId: VENDOR_ID, contactName: "Jane" },
        })
      );
      expect(res.status).toBe(404);
    });

    it("rate: propagates 400 from runManifestCommand (bad category)", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        dispatchFailure("Invalid category", 400)
      );
      const res = await rateVendor(
        makeRequest("http://localhost/api/test", {
          body: { vendorId: VENDOR_ID, category: "vibes", rating: 4 },
        })
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toContain("Invalid category");
    });

    it("rate: propagates 400 from runManifestCommand (rating out of range)", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        dispatchFailure("rating must be between 1 and 5", 400)
      );
      const res = await rateVendor(
        makeRequest("http://localhost/api/test", {
          body: { vendorId: VENDOR_ID, category: "overall", rating: 9 },
        })
      );
      expect(res.status).toBe(400);
    });

    it("rate: propagates 404 from runManifestCommand (vendor not found)", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        dispatchFailure("Vendor not found", 404)
      );
      const res = await rateVendor(
        makeRequest("http://localhost/api/test", {
          body: { vendorId: VENDOR_ID, category: "overall", rating: 4 },
        })
      );
      expect(res.status).toBe(404);
    });

    // --- Successful command results ---

    it("create: returns success with created vendor data", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        dispatchSuccess({
          id: VENDOR_ID,
          supplier_number: "VND-0001",
          name: "New Vendor",
        })
      );
      const res = await createVendor(
        makeRequest("http://localhost/api/test", {
          body: { name: "New Vendor" },
        })
      );
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.result.supplier_number).toBe("VND-0001");
    });

    it("update: returns success with updated vendor data", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        dispatchSuccess({
          id: VENDOR_ID,
          name: "Renamed",
          payment_terms: "NET_30",
        })
      );
      const res = await updateVendor(
        makeRequest("http://localhost/api/test", {
          body: { vendorId: VENDOR_ID, name: "Renamed" },
        })
      );
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.result.name).toBe("Renamed");
    });

    it("delete: returns success with soft-deleted vendor data", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        dispatchSuccess({ id: VENDOR_ID, name: "Acme" })
      );
      const res = await deleteVendor(
        makeRequest("http://localhost/api/test", {
          body: { vendorId: VENDOR_ID },
        })
      );
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.result.id).toBe(VENDOR_ID);
    });

    it("addContact: returns success with new contact data", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        dispatchSuccess({
          id: "c-new",
          contactName: "Jane",
          isPrimary: true,
        })
      );
      const res = await addContact(
        makeRequest("http://localhost/api/test", {
          body: { vendorId: VENDOR_ID, contactName: "Jane", isPrimary: true },
        })
      );
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.result.contactName).toBe("Jane");
    });

    it("rate: returns success with rating data", async () => {
      vi.mocked(runManifestCommand).mockResolvedValue(
        dispatchSuccess({
          id: "rating-1",
          category: "overall",
          rating: 5,
        })
      );
      const res = await rateVendor(
        makeRequest("http://localhost/api/test", {
          body: { vendorId: VENDOR_ID, category: "overall", rating: 5 },
        })
      );
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.result.rating).toBe(5);
    });

    // --- Dispatcher-level error (not from runManifestCommand) ---

    it("returns 500 when runManifestCommand throws an unhandled error", async () => {
      vi.mocked(runManifestCommand).mockRejectedValue(new Error("db down"));
      const res = await createVendor(
        makeRequest("http://localhost/api/test", {
          body: { name: "X" },
        })
      );
      expect(res.status).toBe(500);
      expect(captureException).toHaveBeenCalled();
    });

    // --- User context passed correctly ---

    it("passes correct user context (id, tenantId, role) to runManifestCommand", async () => {
      await createVendor(
        makeRequest("http://localhost/api/test", {
          body: { name: "X" },
        })
      );
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          user: {
            id: TEST_USER_ID,
            tenantId: TEST_TENANT_ID,
            role: "admin",
          },
        })
      );
    });
  });
});
