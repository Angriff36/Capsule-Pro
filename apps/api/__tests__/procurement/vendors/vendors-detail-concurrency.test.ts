/**
 * procurement/vendors/[id] GET — concurrency regression guard (DB-perf plan: the
 * #23 read-parallelization sweep extended to detail routes).
 *
 * The vendor detail handler ran the existence-guard findFirst and the catalog
 * count SERIALLY. The count keys off route id/tenantId only (never the vendor
 * row), so the two are independent — collapsing them into one Promise.all
 * removes 1 serial round-trip per detail load.
 *
 * This test pins the parallelization: both reads must FIRE before the first one
 * RESOLVES. A regression back to `await findFirst; ...; await count` makes the
 * count block on findFirst — the held-pending gate then never sees it and
 * vi.waitFor times out.
 */
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/database", () => {
  const database = {
    inventorySupplier: { findFirst: vi.fn() },
    vendorCatalog: { count: vi.fn() },
  };
  return { database };
});
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { database } = await import("@/lib/database");

import { GET } from "@/app/api/procurement/vendors/[id]/route";

const TENANT_ID = "00000000-0000-0000-0000-000000000080";
const ORG_ID = "org_procurement_vendors";
const VENDOR_ID = "00000000-0000-0000-0000-000000000081";

const vendorFixture = {
  tenantId: TENANT_ID,
  id: VENDOR_ID,
  supplierName: "Acme Supply",
  contacts: [],
  ratings: [],
};

function makeAuthed() {
  vi.mocked(auth).mockResolvedValue({
    orgId: ORG_ID,
    userId: "user-1",
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TENANT_ID);
}

function makeRequest() {
  return new NextRequest(
    new URL(`/api/procurement/vendors/${VENDOR_ID}`, "http://localhost:3000")
  );
}

describe("GET /api/procurement/vendors/[id] — read parallelization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    makeAuthed();
    vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue(
      vendorFixture as never
    );
    vi.mocked(database.vendorCatalog.count).mockResolvedValue(0 as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("fires vendor findFirst + catalog count together (not serial)", async () => {
    // Hold the findFirst (guard) pending; the count must still fire.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.mocked(database.inventorySupplier.findFirst).mockImplementation(
      (() => gate.then(() => vendorFixture)) as never
    );
    const countSpy = vi.mocked(database.vendorCatalog.count);

    const responsePromise = GET(makeRequest(), {
      params: Promise.resolve({ id: VENDOR_ID }),
    });

    await vi.waitFor(
      () => {
        expect(countSpy).toHaveBeenCalledTimes(1);
      },
      { timeout: 500 }
    );
    release();
    const res = await responsePromise;
    expect(res.status).toBe(200);
  });

  it("returns 404 when the vendor is missing", async () => {
    // The count fires in parallel with the guard (accepted tradeoff — it is
    // keyed off route params, not the vendor row), so assert the status only.
    vi.mocked(database.inventorySupplier.findFirst).mockResolvedValue(
      null as never
    );

    const res = await GET(makeRequest(), {
      params: Promise.resolve({ id: VENDOR_ID }),
    });
    expect(res.status).toBe(404);
  });
});
