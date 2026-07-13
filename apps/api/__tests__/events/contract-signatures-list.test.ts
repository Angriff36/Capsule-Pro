/**
 * GET /api/events/contracts/[id]/signatures (list) — parallelization + pagination guard.
 *
 * Pins item #23: the route's `findMany` + `count` run CONCURRENTLY in one
 * `Promise.all` (2 serial round-trips → 1 batch). Also verifies the redundant
 * `findFirst` for contract title was removed — the existence guard already
 * fetches `title`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    eventContract: { findFirst: vi.fn() },
    contractSignature: { findMany: vi.fn(), count: vi.fn() },
  },
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn() },
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/events/contracts/[id]/signatures/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/events/contracts/[id]/signatures (list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
    // The existence guard fetches the contract with id + title
    vi.mocked(database.eventContract.findFirst).mockResolvedValue({
      id: "contract_1",
      title: "Test Contract",
    } as never);
  });

  it("runs findMany + count concurrently, not serially", async () => {
    let resolveFindMany!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveFindMany = r;
    });
    vi.mocked(database.contractSignature.findMany).mockReturnValue(
      pending as never
    );
    vi.mocked(database.contractSignature.count).mockResolvedValue(5);

    const p = GET(
      new Request(
        "http://x/api/events/contracts/contract_1/signatures?page=1&limit=10"
      ),
      { params: Promise.resolve({ id: "contract_1" }) }
    );

    await vi.waitFor(() => {
      expect(database.contractSignature.findMany).toHaveBeenCalledTimes(1);
    });

    expect(database.contractSignature.count).toHaveBeenCalledTimes(1);
    expect(database.contractSignature.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        AND: expect.arrayContaining([
          { tenantId: "tenant_test" },
          { contractId: "contract_1" },
        ]),
      }),
    });

    resolveFindMany([]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("uses contract title from existence guard (no redundant findFirst)", async () => {
    vi.mocked(database.contractSignature.findMany).mockResolvedValue([
      {
        id: "sig_1",
        contractId: "contract_1",
        signedAt: new Date(),
        signatureData: "data",
        signerName: "Jane",
        signerEmail: "jane@test.com",
        ipAddress: "1.2.3.4",
      },
    ] as never);
    vi.mocked(database.contractSignature.count).mockResolvedValue(1);

    const res = await GET(
      new Request(
        "http://x/api/events/contracts/contract_1/signatures?page=1&limit=10"
      ),
      { params: Promise.resolve({ id: "contract_1" }) }
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    // The existence guard findFirst is called once (for existence check + title)
    expect(database.eventContract.findFirst).toHaveBeenCalledTimes(1);
    // Title comes from the existence guard, not a redundant query
    expect(body.data[0].contractTitle).toBe("Test Contract");
  });

  it("returns the paginated shape with correct totalPages math", async () => {
    vi.mocked(database.contractSignature.findMany).mockResolvedValue([
      {
        id: "sig_1",
        contractId: "contract_1",
        signedAt: new Date(),
        signatureData: "data",
        signerName: "Jane",
        signerEmail: null,
        ipAddress: null,
      },
    ] as never);
    vi.mocked(database.contractSignature.count).mockResolvedValue(7);

    const res = await GET(
      new Request(
        "http://x/api/events/contracts/contract_1/signatures?page=2&limit=3"
      ),
      { params: Promise.resolve({ id: "contract_1" }) }
    );
    const body = await res.json();

    expect(body.pagination).toEqual({
      page: 2,
      limit: 3,
      total: 7,
      totalPages: 3,
    });
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(
      new Request("http://x/api/events/contracts/contract_1/signatures"),
      { params: Promise.resolve({ id: "contract_1" }) }
    );
    expect(res.status).toBe(401);
    expect(database.contractSignature.findMany).not.toHaveBeenCalled();
    expect(database.contractSignature.count).not.toHaveBeenCalled();
  });
});
