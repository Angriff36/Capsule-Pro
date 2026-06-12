/**
 * Contract Listing & Detail API Route Tests
 *
 * Covers:
 *   GET /api/events/contracts/list           (EventContract list)
 *   GET /api/events/contracts/[id]            (EventContract detail with relations)
 *   GET /api/procurement/vendor-contracts/list (VendorContract list)
 *   GET /api/procurement/vendor-contracts/[id] (VendorContract detail)
 *   Cross-tenant isolation
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_A = "a0000000-0000-4000-a000-000000000001";
const TENANT_B = "b0000000-0000-4000-b000-000000000002";
const USER_ID = "user_contracts_test";
const ORG_ID = "org_contracts_test";
const CONTRACT_ID = "c0000000-0000-4000-c000-000000000003";
const EVENT_ID = "e0000000-0000-4000-e000-000000000004";
const CLIENT_ID = "d0000000-0000-4000-d000-000000000005";

const mocks = vi.hoisted(() => ({
  ecFindMany: vi.fn(),
  ecFindFirst: vi.fn(),
  vcFindMany: vi.fn(),
  vcFindUnique: vi.fn(),
  vcFindFirst: vi.fn(),
  eventFindFirst: vi.fn(),
  clientFindFirst: vi.fn(),
  auth: vi.fn(),
  tenant: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({ auth: mocks.auth }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: mocks.tenant,
  requireTenantId: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@/lib/database", () => ({
  database: {
    eventContract: { findMany: mocks.ecFindMany, findFirst: mocks.ecFindFirst },
    vendorContract: {
      findMany: mocks.vcFindMany,
      findUnique: mocks.vcFindUnique,
      findFirst: mocks.vcFindFirst,
    },
    event: { findFirst: mocks.eventFindFirst },
    client: { findFirst: mocks.clientFindFirst },
  },
}));
vi.mock("@repo/database", () => ({
  database: {
    eventContract: { findMany: mocks.ecFindMany, findFirst: mocks.ecFindFirst },
    vendorContract: {
      findMany: mocks.vcFindMany,
      findUnique: mocks.vcFindUnique,
      findFirst: mocks.vcFindFirst,
    },
    event: { findFirst: mocks.eventFindFirst },
    client: { findFirst: mocks.clientFindFirst },
  },
}));
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class InvariantError extends Error {},
  invariant: (condition: unknown, message: string) => {
    if (!condition) {
      throw new Error(message);
    }
  },
}));

vi.mock("@repo/notifications", () => ({}));
vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@/lib/manifest-response", () => ({
  manifestSuccessResponse: (...args: any[]) =>
    Response.json(
      { success: true, ...args[0] },
      { status: args[1]?.status ?? 200 }
    ),
  manifestErrorResponse: (...args: any[]) =>
    Response.json(
      { success: false, error: args[0] },
      { status: args[1]?.status ?? 500 }
    ),
}));
vi.mock("@repo/observability/log", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { GET as ecDetailGET } from "@/app/api/events/contracts/[id]/route";
import { GET as ecListGET } from "@/app/api/events/contracts/list/route";
import { GET as vcDetailGET } from "@/app/api/procurement/vendor-contracts/[id]/route";
import { GET as vcListGET } from "@/app/api/procurement/vendor-contracts/list/route";

function setAuth(tenantId: string | null = TENANT_A) {
  mocks.auth.mockResolvedValue({ orgId: ORG_ID, userId: USER_ID });
  mocks.tenant.mockResolvedValue(tenantId);
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("Contract Listing & Detail API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  // ---- EventContract list ----

  it("EventContract list returns contracts for the correct tenant", async () => {
    setAuth();
    mocks.ecFindMany.mockResolvedValue([
      { id: CONTRACT_ID, tenantId: TENANT_A, status: "draft" },
    ]);
    const res = await ecListGET(new NextRequest("http://localhost"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      success: boolean;
      eventContracts: unknown[];
    };
    expect(json.success).toBe(true);
    expect(json.eventContracts).toHaveLength(1);
    expect(mocks.ecFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_A, deletedAt: null },
      })
    );
  });

  // ---- VendorContract list ----

  it("VendorContract list returns contracts for the correct tenant", async () => {
    setAuth();
    mocks.vcFindMany.mockResolvedValue([
      { id: "vc-1", tenantId: TENANT_A, status: "active" },
    ]);
    const res = await vcListGET(new NextRequest("http://localhost"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      success: boolean;
      vendorContracts: unknown[];
    };
    expect(json.success).toBe(true);
    expect(json.vendorContracts).toHaveLength(1);
    expect(mocks.vcFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_A, deletedAt: null },
      })
    );
  });

  // ---- EventContract detail ----

  it("EventContract detail returns contract with event and client relations", async () => {
    setAuth();
    const contract = {
      id: CONTRACT_ID,
      tenantId: TENANT_A,
      eventId: EVENT_ID,
      clientId: CLIENT_ID,
      status: "sent",
    };
    mocks.ecFindFirst.mockResolvedValue(contract);
    mocks.eventFindFirst.mockResolvedValue({
      id: EVENT_ID,
      title: "Annual Gala",
      eventDate: "2026-08-01",
    });
    mocks.clientFindFirst.mockResolvedValue({
      id: CLIENT_ID,
      company_name: "Acme Corp",
      first_name: "Jane",
      last_name: "Doe",
    });

    const res = await ecDetailGET(
      new NextRequest("http://localhost"),
      params(CONTRACT_ID)
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      contract: { event: unknown; client: unknown };
    };
    expect(json.contract.event).toEqual(
      expect.objectContaining({ id: EVENT_ID, title: "Annual Gala" })
    );
    expect(json.contract.client).toEqual(
      expect.objectContaining({ id: CLIENT_ID, company_name: "Acme Corp" })
    );
    expect(mocks.ecFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { tenantId: TENANT_A },
            { id: CONTRACT_ID },
            { deletedAt: null },
          ],
        },
      })
    );
  });

  // ---- VendorContract detail ----

  it("VendorContract detail returns a single contract", async () => {
    setAuth();
    mocks.vcFindFirst.mockResolvedValue({
      id: CONTRACT_ID,
      tenantId: TENANT_A,
      status: "active",
    });
    const res = await vcDetailGET(
      new NextRequest("http://localhost"),
      params(CONTRACT_ID)
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      success: boolean;
      vendorContract: { id: string };
    };
    expect(json.success).toBe(true);
    expect(json.vendorContract.id).toBe(CONTRACT_ID);
    expect(mocks.vcFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CONTRACT_ID, tenantId: TENANT_A, deletedAt: null },
      })
    );
  });

  // ---- Cross-tenant isolation ----

  it("EventContract detail returns 404 for a different tenant", async () => {
    setAuth();
    mocks.ecFindFirst.mockResolvedValue(null);
    const res = await ecDetailGET(
      new NextRequest("http://localhost"),
      params(CONTRACT_ID)
    );
    expect(res.status).toBe(404);
  });

  it("VendorContract list returns empty when no contracts belong to tenant", async () => {
    setAuth(TENANT_B);
    mocks.vcFindMany.mockResolvedValue([]);
    const res = await vcListGET(new NextRequest("http://localhost"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { vendorContracts: unknown[] };
    expect(json.vendorContracts).toHaveLength(0);
    expect(mocks.vcFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_B, deletedAt: null },
      })
    );
  });
});
