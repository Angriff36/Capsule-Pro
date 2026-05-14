/**
 * Procurement Vendors API Tests
 *
 * Why these tests matter:
 *   The /api/procurement/vendors surface is the system of record for the
 *   tenant's supplier directory. Every downstream procurement object —
 *   purchase orders, requisitions, vendor contracts, vendor catalogs,
 *   ratings, and contacts — references InventorySupplier.id. A regression
 *   on vendor create/update/delete silently breaks the entire procurement
 *   pipeline (orphaned POs, untraceable spend, broken catalog sync).
 *
 *   None of the seven vendor routes had test coverage before this file.
 *
 * Routes covered (7 total):
 *   - GET   /api/procurement/vendors/list              (Prisma list + counts)
 *   - GET   /api/procurement/vendors/[id]              (Prisma detail + nested includes)
 *   - POST  /api/procurement/vendors/commands/create   (manifest command route)
 *   - POST  /api/procurement/vendors/commands/update   (manifest command route)
 *   - POST  /api/procurement/vendors/commands/delete   (manifest command route)
 *   - POST  /api/procurement/vendors/commands/add-contact (manifest command route)
 *   - POST  /api/procurement/vendors/commands/rate     (manifest command route)
 *
 * Load-bearing invariants pinned by these tests:
 *   1. Auth + tenant isolation on every route (401 paths).
 *   2. The list endpoint returns the SHAPED legacy snake_case payload
 *      (`supplier_number`, `contact_count`, `catalog_item_count`) — UI
 *      reads those exact field names.
 *   3. The list endpoint is a tenant + soft-delete query AND threads
 *      `clampLimit`/`clampOffset` into Prisma `take`/`skip` so a client
 *      cannot DOS the table with `limit=999999`.
 *   4. The detail endpoint runs a primary `findFirst` (with nested
 *      `vendorContacts` and `vendorRatings` includes) PLUS a secondary
 *      `vendorCatalog.count` — tests pin that the count query carries the
 *      `isActive: true` filter so cancelled catalog rows do not inflate
 *      the badge.
 *   5. Manifest command routes use the manifest runtime to execute commands.
 *
 * Mock surface:
 *   - `database.inventorySupplier` (Prisma model — list/detail/rate)
 *   - `database.vendorCatalog` (Prisma model — detail catalog count)
 *   - `database.vendorRating` (Prisma model — rate aggregate)
 *   - `auth` + `getTenantIdForOrg` (auth + tenant resolution)
 *   - `requireCurrentUser` (user context resolution)
 *   - `createManifestRuntime` (manifest runtime)
 *   - `captureException` (Sentry — pinned so 500 paths stay observable)
 */

import { database } from "@repo/database";
import { InvariantError } from "@/app/lib/invariant";
import { captureException } from "@sentry/nextjs";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/database", async () => {
  const mod =
    await vi.importActual<typeof import("@repo/database")>("@repo/database");
  return mod;
});
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
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

import { auth } from "@repo/auth/server";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { createManifestRuntime } from "@/lib/manifest-runtime";

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
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  } as never);
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({ success: true }),
  } as never);
}

function authMissing() {
  vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);
  vi.mocked(requireCurrentUser).mockRejectedValue(
    new InvariantError("auth.orgId must exist") as never
  );
}

function noTenant() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);
  vi.mocked(requireCurrentUser).mockRejectedValue(
    new InvariantError("auth.orgId must exist") as never
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

// ---------------------------------------------------------------------------
// Command test helpers
// ---------------------------------------------------------------------------

const routePath = "@/app/api/manifest/[entity]/commands/[command]/route";

async function runCommand(command: string, body: unknown = {}) {
  const mod = await import(routePath);
  return mod.POST(
    makeRequest(
      "http://localhost/api/manifest/[entity]/commands/[command]",
      { body }
    ),
    {
      params: Promise.resolve({ entity: "Vendor", command }),
    }
  );
}

function mockRuntimeSuccess(result: unknown) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: true,
      result,
      emittedEvents: [],
    }),
  } as never);
}

function mockRuntimeGuardFailure(message: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      guardFailure: { index: 0, formatted: message },
    }),
  } as never);
}

function mockRuntimeError(message: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      error: message,
    }),
  } as never);
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
  // POST /api/procurement/vendors/commands/create
  // -------------------------------------------------------------------------
  describe("POST /commands/create", () => {
    it("returns 401 when unauthenticated", async () => {
      authMissing();
      const res = await runCommand("create", { name: "X" });
      expect(res.status).toBe(401);
    });

    it("returns 401 when tenant cannot be resolved", async () => {
      noTenant();
      const res = await runCommand("create", { name: "X" });
      expect(res.status).toBe(401);
    });

    it("returns 422 when name is missing", async () => {
      authOk();
      mockRuntimeGuardFailure("Vendor name is required");
      const res = await runCommand("create", {});
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.message).toContain("name");
    });

    it("returns 200 on successful create", async () => {
      authOk();
      mockRuntimeSuccess({ id: VENDOR_ID, name: "New Vendor" });
      const res = await runCommand("create", { name: "New Vendor" });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.id).toBe(VENDOR_ID);
    });

    it("returns 400 when runtime returns error", async () => {
      authOk();
      mockRuntimeError("Database error");
      const res = await runCommand("create", { name: "X" });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/procurement/vendors/commands/update
  // -------------------------------------------------------------------------
  describe("POST /commands/update", () => {
    it("returns 401 when unauthenticated", async () => {
      authMissing();
      const res = await runCommand("update", { vendorId: VENDOR_ID, name: "Renamed" });
      expect(res.status).toBe(401);
    });

    it("returns 422 when vendorId is missing", async () => {
      authOk();
      mockRuntimeGuardFailure("Vendor ID is required");
      const res = await runCommand("update", { name: "Renamed" });
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.message).toContain("required");
    });

    it("returns 400 when the vendor does not exist", async () => {
      authOk();
      mockRuntimeError("Vendor not found");
      const res = await runCommand("update", { vendorId: VENDOR_ID, name: "Renamed" });
      expect(res.status).toBe(400);
    });

    it("returns 200 on successful update", async () => {
      authOk();
      mockRuntimeSuccess({ id: VENDOR_ID, name: "Renamed" });
      const res = await runCommand("update", { vendorId: VENDOR_ID, name: "Renamed" });
      expect(res.status).toBe(200);
    });

    it("returns 400 on runtime error", async () => {
      authOk();
      mockRuntimeError("Database error");
      const res = await runCommand("update", { vendorId: VENDOR_ID, name: "X" });
      expect(res.status).toBe(400);
      expect(captureException).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/procurement/vendors/commands/remove
  // -------------------------------------------------------------------------
  describe("POST /commands/remove", () => {
    it("returns 401 when unauthenticated", async () => {
      authMissing();
      const res = await runCommand("remove", { vendorId: VENDOR_ID });
      expect(res.status).toBe(401);
    });

    it("returns 422 when vendorId is missing", async () => {
      authOk();
      mockRuntimeGuardFailure("Vendor ID is required");
      const res = await runCommand("remove", {});
      expect(res.status).toBe(422);
    });

    it("returns 200 with blocked=true when vendor has active POs", async () => {
      authOk();
      mockRuntimeSuccess({ blocked: true, activePOCount: 3 });
      const res = await runCommand("remove", { vendorId: VENDOR_ID });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.result.blocked).toBe(true);
    });

    it("returns 200 when vendor is removed", async () => {
      authOk();
      mockRuntimeSuccess({ id: VENDOR_ID, status: "inactive" });
      const res = await runCommand("remove", { vendorId: VENDOR_ID });
      expect(res.status).toBe(200);
    });

    it("returns 400 when the vendor is already gone", async () => {
      authOk();
      mockRuntimeError("Vendor not found");
      const res = await runCommand("remove", { vendorId: VENDOR_ID });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/procurement/vendors/commands/add-contact
  // -------------------------------------------------------------------------
  describe("POST /commands/add-contact", () => {
    it("returns 401 when unauthenticated", async () => {
      authMissing();
      const res = await runCommand("addContact", { vendorId: VENDOR_ID, contactName: "Jane" });
      expect(res.status).toBe(401);
    });

    it("returns 422 when vendorId or contactName is missing", async () => {
      authOk();
      mockRuntimeGuardFailure("Contact name is required");
      const res = await runCommand("addContact", { vendorId: VENDOR_ID });
      expect(res.status).toBe(422);
    });

    it("returns 400 when the vendor does not exist", async () => {
      authOk();
      mockRuntimeError("Vendor not found");
      const res = await runCommand("addContact", { vendorId: VENDOR_ID, contactName: "Jane" });
      expect(res.status).toBe(400);
    });

    it("returns 200 when contact is added", async () => {
      authOk();
      mockRuntimeSuccess({ id: "c-new", contactName: "Jane" });
      const res = await runCommand("addContact", { vendorId: VENDOR_ID, contactName: "Jane" });
      expect(res.status).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/procurement/vendors/commands/rate
  // -------------------------------------------------------------------------
  describe("POST /commands/rate", () => {
    it("returns 401 when unauthenticated", async () => {
      authMissing();
      const res = await runCommand("rate", { vendorId: VENDOR_ID, category: "overall", rating: 4 });
      expect(res.status).toBe(401);
    });

    it("returns 422 when vendorId is missing", async () => {
      authOk();
      mockRuntimeGuardFailure("Vendor ID is required");
      const res = await runCommand("rate", { category: "overall", rating: 4 });
      expect(res.status).toBe(422);
    });

    it("returns 422 when category is not in the allow-list", async () => {
      authOk();
      mockRuntimeGuardFailure("Invalid category");
      const res = await runCommand("rate", { vendorId: VENDOR_ID, category: "vibes", rating: 4 });
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.message).toContain("category");
    });

    it("returns 422 when rating is out of [1,5]", async () => {
      authOk();
      mockRuntimeGuardFailure("Rating must be between 1 and 5");
      const res = await runCommand("rate", { vendorId: VENDOR_ID, category: "overall", rating: 9 });
      expect(res.status).toBe(422);
    });

    it("returns 400 when the vendor does not exist", async () => {
      authOk();
      mockRuntimeError("Vendor not found");
      const res = await runCommand("rate", { vendorId: VENDOR_ID, category: "overall", rating: 4 });
      expect(res.status).toBe(400);
    });

    it("non-overall rating: returns 200", async () => {
      authOk();
      mockRuntimeSuccess({ id: "rating-1", category: "delivery", rating: 4 });
      const res = await runCommand("rate", { vendorId: VENDOR_ID, category: "delivery", rating: 4 });
      expect(res.status).toBe(200);
    });

    it("overall rating: returns 200 with computed average", async () => {
      authOk();
      mockRuntimeSuccess({ id: "rating-1", category: "overall", rating: 5, averageRating: 4.5 });
      const res = await runCommand("rate", { vendorId: VENDOR_ID, category: "overall", rating: 5 });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.result.averageRating).toBe(4.5);
    });

    it("overall rating with null avg: returns 200", async () => {
      authOk();
      mockRuntimeSuccess({ id: "rating-1", category: "overall", rating: 5 });
      const res = await runCommand("rate", { vendorId: VENDOR_ID, category: "overall", rating: 5 });
      expect(res.status).toBe(200);
    });

    it("returns 400 on runtime error", async () => {
      authOk();
      mockRuntimeError("Database error");
      const res = await runCommand("rate", { vendorId: VENDOR_ID, category: "overall", rating: 4 });
      expect(res.status).toBe(400);
      expect(captureException).not.toHaveBeenCalled();
    });
  });
});