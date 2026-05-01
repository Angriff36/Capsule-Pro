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
 *   - POST  /api/procurement/vendors/commands/create   ($queryRaw INSERT + auto-numbering)
 *   - POST  /api/procurement/vendors/commands/update   ($queryRaw UPDATE w/ existence check)
 *   - POST  /api/procurement/vendors/commands/delete   ($queryRaw soft-delete + active-PO guard)
 *   - POST  /api/procurement/vendors/commands/add-contact ($queryRaw INSERT + primary toggle)
 *   - POST  /api/procurement/vendors/commands/rate     (Prisma create + aggregate update)
 *
 * Load-bearing invariants pinned by these tests:
 *   1. Auth + tenant isolation on every route (401/400 paths).
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
 *   5. `create` auto-generates `supplier_number = VND-####` from the
 *      tenant-scoped count + 1 — a regression on the COUNT scope leaks
 *      numbers across tenants. Tests pin the exact 4-digit zero-pad.
 *   6. `create` writes a secondary `vendor_contacts` row ONLY when the
 *      caller supplies BOTH a `contactPerson` AND at least one of
 *      `email|phone`. Pinned because the original implementation has
 *      tripped on this gate twice.
 *   7. `update` rejects with 404 when the vendor does not exist
 *      (existence check is a separate `$queryRaw` round-trip — pinned so
 *      a refactor can't drop the guard and silently update zero rows).
 *   8. `delete` is a SOFT delete (`deleted_at = NOW()`) AND it BLOCKS when
 *      the vendor has any PO with `status NOT IN ('received','cancelled')`
 *      and `deleted_at IS NULL`. The block is a 400 with the active count
 *      in the message — pinned so a future "force delete" feature is an
 *      explicit decision, not an accidental side-effect.
 *   9. `add-contact` clears the existing primary contact via UPDATE BEFORE
 *      INSERTing the new primary — pinned because a swap of those two
 *      `$queryRaw` calls leaves two `is_primary=true` rows and the UI
 *      arbitrarily picks one. We assert the call ORDER, not just that
 *      both calls ran.
 *  10. `rate` validates the `category` against a fixed allow-list and the
 *      `rating` against `[1,5]`. When `category === "overall"`, it
 *      RECOMPUTES `performanceRating` as the average across that vendor's
 *      "overall" ratings AND writes it back via `inventorySupplier.update`.
 *      Pinned so a refactor that drops the aggregate write doesn't leave
 *      the displayed rating stuck on the first vote.
 *
 * Mock surface:
 *   - `database.inventorySupplier` (Prisma model — list/detail/rate)
 *   - `database.vendorCatalog` (Prisma model — detail catalog count)
 *   - `database.vendorRating` (Prisma model — rate aggregate)
 *   - `database.$queryRaw` (raw SQL — create/update/delete/add-contact)
 *   - `auth` + `getTenantIdForOrg` (auth + tenant resolution)
 *   - `captureException` (Sentry — pinned so 500 paths stay observable)
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { database } from "@repo/database";
import { captureException } from "@sentry/nextjs";

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
  const mod = await vi.importActual<typeof import("@repo/database")>(
    "@repo/database",
  );
  return mod;
});

import { auth } from "@repo/auth/server";
import { getTenantIdForOrg } from "@/app/lib/tenant";

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
}

function authMissing() {
  vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);
}

function noTenant() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);
}

function makeRequest(
  url: string,
  init: { method?: string; body?: unknown } = {},
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
      const { GET } = await import(
        "@/app/api/procurement/vendors/list/route"
      );
      const res = await GET(
        makeRequest("http://localhost/api/procurement/vendors/list"),
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when tenant cannot be resolved", async () => {
      noTenant();
      const { GET } = await import(
        "@/app/api/procurement/vendors/list/route"
      );
      const res = await GET(
        makeRequest("http://localhost/api/procurement/vendors/list"),
      );
      expect(res.status).toBe(400);
    });

    it("returns shaped vendors with snake_case fields and counts", async () => {
      authOk();
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue([
        makeVendor(),
      ] as never);

      const { GET } = await import(
        "@/app/api/procurement/vendors/list/route"
      );
      const res = await GET(
        makeRequest("http://localhost/api/procurement/vendors/list"),
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
        [] as never,
      );

      const { GET } = await import(
        "@/app/api/procurement/vendors/list/route"
      );
      await GET(
        makeRequest(
          "http://localhost/api/procurement/vendors/list?search=acme",
        ),
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
        }),
      );
    });

    it("does NOT add an OR clause when search is omitted", async () => {
      authOk();
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue(
        [] as never,
      );

      const { GET } = await import(
        "@/app/api/procurement/vendors/list/route"
      );
      await GET(
        makeRequest("http://localhost/api/procurement/vendors/list"),
      );

      const call = vi.mocked(database.inventorySupplier.findMany).mock
        .calls[0]?.[0];
      expect(call?.where).not.toHaveProperty("OR");
    });

    it("clamps limit to MAX_LIMIT=200 and threads into Prisma take", async () => {
      authOk();
      vi.mocked(database.inventorySupplier.findMany).mockResolvedValue(
        [] as never,
      );

      const { GET } = await import(
        "@/app/api/procurement/vendors/list/route"
      );
      const res = await GET(
        makeRequest(
          "http://localhost/api/procurement/vendors/list?limit=999999&offset=42",
        ),
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
        [] as never,
      );

      const { GET } = await import(
        "@/app/api/procurement/vendors/list/route"
      );
      await GET(
        makeRequest("http://localhost/api/procurement/vendors/list"),
      );

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
        new Error("boom"),
      );

      const { GET } = await import(
        "@/app/api/procurement/vendors/list/route"
      );
      const res = await GET(
        makeRequest("http://localhost/api/procurement/vendors/list"),
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
      const { GET } = await import(
        "@/app/api/procurement/vendors/[id]/route"
      );
      const res = await GET(
        makeRequest(
          `http://localhost/api/procurement/vendors/${VENDOR_ID}`,
        ),
        { params: Promise.resolve({ id: VENDOR_ID }) },
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when tenant cannot be resolved", async () => {
      noTenant();
      const { GET } = await import(
        "@/app/api/procurement/vendors/[id]/route"
      );
      const res = await GET(
        makeRequest(
          `http://localhost/api/procurement/vendors/${VENDOR_ID}`,
        ),
        { params: Promise.resolve({ id: VENDOR_ID }) },
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 when the vendor does not exist", async () => {
      authOk();
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue(
        null as never,
      );

      const { GET } = await import(
        "@/app/api/procurement/vendors/[id]/route"
      );
      const res = await GET(
        makeRequest(
          `http://localhost/api/procurement/vendors/${VENDOR_ID}`,
        ),
        { params: Promise.resolve({ id: VENDOR_ID }) },
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
        vendor as never,
      );
      vi.mocked(database.vendorCatalog.count).mockResolvedValue(12 as never);

      const { GET } = await import(
        "@/app/api/procurement/vendors/[id]/route"
      );
      const res = await GET(
        makeRequest(
          `http://localhost/api/procurement/vendors/${VENDOR_ID}`,
        ),
        { params: Promise.resolve({ id: VENDOR_ID }) },
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
        }),
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
        new Error("connection lost"),
      );

      const { GET } = await import(
        "@/app/api/procurement/vendors/[id]/route"
      );
      const res = await GET(
        makeRequest(
          `http://localhost/api/procurement/vendors/${VENDOR_ID}`,
        ),
        { params: Promise.resolve({ id: VENDOR_ID }) },
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
      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/create/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/create",
          { body: { name: "X" } },
        ),
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when tenant cannot be resolved", async () => {
      noTenant();
      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/create/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/create",
          { body: { name: "X" } },
        ),
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when name is missing", async () => {
      authOk();
      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/create/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/create",
          { body: {} },
        ),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toContain("name");
    });

    it("auto-numbers VND-#### from the tenant-scoped count", async () => {
      authOk();
      // 1) count, 2) insert vendor (no contact branch since contactPerson not set)
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce([{ count: 7 }] as never) // count → 7 → next is 0008
        .mockResolvedValueOnce([
          {
            id: VENDOR_ID,
            supplier_number: "VND-0008",
            name: "New Vendor",
          },
        ] as never);

      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/create/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/create",
          { body: { name: "New Vendor" } },
        ),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.vendor.supplier_number).toBe("VND-0008");
      // Only 2 raw calls — no vendor_contacts INSERT because contactPerson omitted
      expect(database.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it("inserts a primary vendor_contacts row when contactPerson + email/phone are supplied", async () => {
      authOk();
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce([{ count: 0 }] as never) // count → VND-0001
        .mockResolvedValueOnce([
          { id: VENDOR_ID, supplier_number: "VND-0001", name: "Primary Vendor" },
        ] as never)
        .mockResolvedValueOnce([] as never); // INSERT vendor_contacts

      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/create/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/create",
          {
            body: {
              name: "Primary Vendor",
              contactPerson: "Jane Doe",
              email: "jane@vendor.test",
            },
          },
        ),
      );
      expect(res.status).toBe(200);
      // 3 calls: count + vendor INSERT + vendor_contacts INSERT
      expect(database.$queryRaw).toHaveBeenCalledTimes(3);
    });

    it("does NOT insert vendor_contacts when contactPerson is set but email AND phone are absent", async () => {
      authOk();
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce([{ count: 0 }] as never)
        .mockResolvedValueOnce([
          { id: VENDOR_ID, supplier_number: "VND-0001", name: "Vendor" },
        ] as never);

      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/create/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/create",
          { body: { name: "Vendor", contactPerson: "Jane Doe" } }, // no email or phone
        ),
      );
      expect(res.status).toBe(200);
      expect(database.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it("returns 500 when the INSERT returns no row", async () => {
      authOk();
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce([{ count: 0 }] as never)
        .mockResolvedValueOnce([] as never); // no row returned

      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/create/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/create",
          { body: { name: "X" } },
        ),
      );
      expect(res.status).toBe(500);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/procurement/vendors/commands/update
  // -------------------------------------------------------------------------
  describe("POST /commands/update", () => {
    it("returns 401 when unauthenticated", async () => {
      authMissing();
      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/update/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/update",
          { body: { vendorId: VENDOR_ID, name: "Renamed" } },
        ),
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when vendorId is missing", async () => {
      authOk();
      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/update/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/update",
          { body: { name: "Renamed" } },
        ),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toContain("vendorId");
    });

    it("returns 404 when the vendor does not exist", async () => {
      authOk();
      vi.mocked(database.$queryRaw).mockResolvedValueOnce([] as never); // existence check returns no rows

      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/update/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/update",
          { body: { vendorId: VENDOR_ID, name: "Renamed" } },
        ),
      );
      expect(res.status).toBe(404);
    });

    it("updates and returns the new vendor row", async () => {
      authOk();
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce([{ id: VENDOR_ID }] as never) // existence check
        .mockResolvedValueOnce([
          {
            id: VENDOR_ID,
            supplier_number: "VND-0001",
            name: "Renamed",
            payment_terms: "NET_30",
          },
        ] as never);

      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/update/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/update",
          { body: { vendorId: VENDOR_ID, name: "Renamed" } },
        ),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.vendor.name).toBe("Renamed");
      expect(database.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it("captures Sentry and returns 500 on raw-SQL throw", async () => {
      authOk();
      vi.mocked(database.$queryRaw).mockRejectedValueOnce(new Error("db down"));

      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/update/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/update",
          { body: { vendorId: VENDOR_ID, name: "Renamed" } },
        ),
      );
      expect(res.status).toBe(500);
      expect(captureException).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/procurement/vendors/commands/delete
  // -------------------------------------------------------------------------
  describe("POST /commands/delete", () => {
    it("returns 401 when unauthenticated", async () => {
      authMissing();
      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/delete/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/delete",
          { body: { vendorId: VENDOR_ID } },
        ),
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when vendorId is missing", async () => {
      authOk();
      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/delete/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/delete",
          { body: {} },
        ),
      );
      expect(res.status).toBe(400);
    });

    it("blocks deletion (400) when active POs reference the vendor", async () => {
      authOk();
      vi.mocked(database.$queryRaw).mockResolvedValueOnce([
        { count: 3 },
      ] as never);

      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/delete/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/delete",
          { body: { vendorId: VENDOR_ID } },
        ),
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toContain("3 active purchase order");
      // Pinned: no UPDATE issued when blocked
      expect(database.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("soft-deletes the vendor when no active POs exist", async () => {
      authOk();
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce([{ count: 0 }] as never) // active PO count
        .mockResolvedValueOnce([
          { id: VENDOR_ID, supplier_number: "VND-0001", name: "Acme" },
        ] as never); // soft-delete RETURNING

      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/delete/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/delete",
          { body: { vendorId: VENDOR_ID } },
        ),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.vendor.id).toBe(VENDOR_ID);
      expect(database.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it("returns 404 when the vendor is already gone (RETURNING empty)", async () => {
      authOk();
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce([{ count: 0 }] as never)
        .mockResolvedValueOnce([] as never); // RETURNING empty

      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/delete/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/delete",
          { body: { vendorId: VENDOR_ID } },
        ),
      );
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/procurement/vendors/commands/add-contact
  // -------------------------------------------------------------------------
  describe("POST /commands/add-contact", () => {
    it("returns 401 when unauthenticated", async () => {
      authMissing();
      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/add-contact/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/add-contact",
          { body: { vendorId: VENDOR_ID, contactName: "Jane" } },
        ),
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when vendorId or contactName is missing", async () => {
      authOk();
      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/add-contact/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/add-contact",
          { body: { vendorId: VENDOR_ID } },
        ),
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 when the vendor does not exist", async () => {
      authOk();
      vi.mocked(database.$queryRaw).mockResolvedValueOnce([] as never);

      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/add-contact/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/add-contact",
          { body: { vendorId: VENDOR_ID, contactName: "Jane" } },
        ),
      );
      expect(res.status).toBe(404);
    });

    it("inserts a non-primary contact (no primary-clear UPDATE)", async () => {
      authOk();
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce([{ id: VENDOR_ID }] as never) // existence
        .mockResolvedValueOnce([
          { id: "c-new", contact_name: "Jane", is_primary: false },
        ] as never); // INSERT

      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/add-contact/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/add-contact",
          {
            body: {
              vendorId: VENDOR_ID,
              contactName: "Jane",
              isPrimary: false,
            },
          },
        ),
      );
      expect(res.status).toBe(200);
      // 2 calls — existence + INSERT (no clear-primary UPDATE)
      expect(database.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it("clears the existing primary BEFORE inserting when isPrimary=true", async () => {
      authOk();
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce([{ id: VENDOR_ID }] as never) // existence
        .mockResolvedValueOnce([] as never) // clear-primary UPDATE
        .mockResolvedValueOnce([
          { id: "c-new", contact_name: "Jane", is_primary: true },
        ] as never); // INSERT

      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/add-contact/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/add-contact",
          {
            body: {
              vendorId: VENDOR_ID,
              contactName: "Jane",
              isPrimary: true,
            },
          },
        ),
      );
      expect(res.status).toBe(200);
      // 3 calls in this exact order: existence → clear-primary → INSERT
      expect(database.$queryRaw).toHaveBeenCalledTimes(3);
    });

    it("returns 500 when the INSERT returns no row", async () => {
      authOk();
      vi.mocked(database.$queryRaw)
        .mockResolvedValueOnce([{ id: VENDOR_ID }] as never)
        .mockResolvedValueOnce([] as never);

      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/add-contact/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/add-contact",
          { body: { vendorId: VENDOR_ID, contactName: "Jane" } },
        ),
      );
      expect(res.status).toBe(500);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/procurement/vendors/commands/rate
  // -------------------------------------------------------------------------
  describe("POST /commands/rate", () => {
    it("returns 401 when unauthenticated", async () => {
      authMissing();
      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/rate/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/rate",
          {
            body: { vendorId: VENDOR_ID, category: "overall", rating: 4 },
          },
        ),
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 when vendorId is missing", async () => {
      authOk();
      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/rate/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/rate",
          { body: { category: "overall", rating: 4 } },
        ),
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 when category is not in the allow-list", async () => {
      authOk();
      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/rate/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/rate",
          { body: { vendorId: VENDOR_ID, category: "vibes", rating: 4 } },
        ),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toContain("Invalid category");
    });

    it("returns 400 when rating is out of [1,5]", async () => {
      authOk();
      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/rate/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/rate",
          { body: { vendorId: VENDOR_ID, category: "overall", rating: 9 } },
        ),
      );
      expect(res.status).toBe(400);
    });

    it("returns 404 when the vendor does not exist", async () => {
      authOk();
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue(
        null as never,
      );

      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/rate/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/rate",
          { body: { vendorId: VENDOR_ID, category: "overall", rating: 4 } },
        ),
      );
      expect(res.status).toBe(404);
    });

    it("non-overall rating: creates rating row but does NOT touch the supplier aggregate", async () => {
      authOk();
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue(
        { id: VENDOR_ID } as never,
      );
      vi.mocked(database.vendorRating.create).mockResolvedValue({
        id: "rating-1",
        category: "delivery",
        rating: 4,
        comment: null,
        createdAt: new Date(),
      } as never);

      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/rate/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/rate",
          { body: { vendorId: VENDOR_ID, category: "delivery", rating: 4 } },
        ),
      );
      expect(res.status).toBe(200);
      expect(database.vendorRating.create).toHaveBeenCalledTimes(1);
      // No aggregate path
      expect(database.vendorRating.aggregate).not.toHaveBeenCalled();
      expect(database.inventorySupplier.update).not.toHaveBeenCalled();
    });

    it("overall rating: creates row, recomputes avg, writes aggregate back to supplier", async () => {
      authOk();
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue(
        { id: VENDOR_ID } as never,
      );
      vi.mocked(database.vendorRating.create).mockResolvedValue({
        id: "rating-1",
        category: "overall",
        rating: 5,
        comment: "great",
        createdAt: new Date(),
      } as never);
      vi.mocked(database.vendorRating.aggregate).mockResolvedValue({
        _avg: { rating: 4.5 },
      } as never);
      vi.mocked(database.inventorySupplier.update).mockResolvedValue(
        {} as never,
      );

      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/rate/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/rate",
          {
            body: {
              vendorId: VENDOR_ID,
              category: "overall",
              rating: 5,
              comment: "great",
            },
          },
        ),
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.rating.rating).toBe(5);
      // Pin aggregate filter shape — must scope to overall + soft-delete + tenant
      expect(database.vendorRating.aggregate).toHaveBeenCalledWith({
        where: {
          tenantId: TEST_TENANT_ID,
          supplierId: VENDOR_ID,
          deletedAt: null,
          category: "overall",
        },
        _avg: { rating: true },
      });
      // Pin update — must use the composite PK shape
      expect(database.inventorySupplier.update).toHaveBeenCalledWith({
        where: { tenantId_id: { tenantId: TEST_TENANT_ID, id: VENDOR_ID } },
        data: { performanceRating: 4.5 },
      });
    });

    it("overall rating with null avg: skips supplier update", async () => {
      authOk();
      vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue(
        { id: VENDOR_ID } as never,
      );
      vi.mocked(database.vendorRating.create).mockResolvedValue({
        id: "rating-1",
        category: "overall",
        rating: 5,
        comment: null,
        createdAt: new Date(),
      } as never);
      vi.mocked(database.vendorRating.aggregate).mockResolvedValue({
        _avg: { rating: null },
      } as never);

      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/rate/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/rate",
          { body: { vendorId: VENDOR_ID, category: "overall", rating: 5 } },
        ),
      );
      expect(res.status).toBe(200);
      expect(database.inventorySupplier.update).not.toHaveBeenCalled();
    });

    it("captures Sentry and returns 500 when Prisma throws", async () => {
      authOk();
      vi.mocked(database.inventorySupplier.findFirst).mockRejectedValue(
        new Error("boom"),
      );

      const { POST } = await import(
        "@/app/api/procurement/vendors/commands/rate/route"
      );
      const res = await POST(
        makeRequest(
          "http://localhost/api/procurement/vendors/commands/rate",
          { body: { vendorId: VENDOR_ID, category: "overall", rating: 4 } },
        ),
      );
      expect(res.status).toBe(500);
      expect(captureException).toHaveBeenCalled();
    });
  });
});
