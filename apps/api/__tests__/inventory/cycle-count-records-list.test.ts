/**
 * GET /api/inventory/cycle-count/sessions/[id]/records (list) — parallelization guard (#23).
 * Count-first route: `count` pending + `findMany` still fires => concurrent.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    cycleCountRecord: { findMany: vi.fn(), count: vi.fn() },
    cycleCountSession: { findFirst: vi.fn() },
  },
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));

import { auth } from "@repo/auth/server";
import { database } from "@repo/database";
import { GET } from "@/app/api/inventory/cycle-count/sessions/[id]/records/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const ctx = () => ({ params: Promise.resolve({ id: "s1" }) });

describe("GET /api/inventory/cycle-count/sessions/[id]/records (list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
    vi.mocked(database.cycleCountSession.findFirst).mockResolvedValue({
      id: "sess-internal",
    } as never);
  });

  it("runs count + findMany concurrently, not serially", async () => {
    let resolveCount!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveCount = r;
    });
    vi.mocked(database.cycleCountRecord.count).mockReturnValue(
      pending as never
    );
    vi.mocked(database.cycleCountRecord.findMany).mockResolvedValue(
      [] as never
    );

    const p = GET(
      new Request("http://x/api/inventory/cycle-count/sessions/s1/records"),
      ctx() as never
    );

    await vi.waitFor(() => {
      expect(database.cycleCountRecord.count).toHaveBeenCalledTimes(1);
    });
    expect(database.cycleCountRecord.findMany).toHaveBeenCalledTimes(1);

    resolveCount(0);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("returns the paginated shape with correct total", async () => {
    vi.mocked(database.cycleCountRecord.count).mockResolvedValue(33 as never);
    vi.mocked(database.cycleCountRecord.findMany).mockResolvedValue([
      {
        id: "r1",
        expectedQuantity: { toNumber: () => 10 },
        countedQuantity: { toNumber: () => 9 },
        variance: { toNumber: () => -1 },
        variancePct: { toNumber: () => -10 },
      },
    ] as never);

    const res = await GET(
      new Request(
        "http://x/api/inventory/cycle-count/sessions/s1/records?limit=10&page=2"
      ),
      ctx() as never
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 33,
      totalPages: 4,
    });
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(
      new Request("http://x/api/inventory/cycle-count/sessions/s1/records"),
      ctx() as never
    );
    expect(res.status).toBe(401);
    expect(database.cycleCountRecord.findMany).not.toHaveBeenCalled();
    expect(database.cycleCountRecord.count).not.toHaveBeenCalled();
  });
});
