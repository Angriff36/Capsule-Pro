/**
 * GET /api/crm/clients/[id]/interactions (list) — parallelization guard (#23).
 * findMany-first route: `findMany` pending + `count` still fires => concurrent.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    clientInteraction: { findMany: vi.fn(), count: vi.fn() },
    client: { findFirst: vi.fn() },
  },
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class InvariantError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InvariantError";
    }
  },
  invariant: (condition: unknown, message: string) => {
    if (!condition) {
      const err = new Error(message);
      err.name = "InvariantError";
      throw err;
    }
  },
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
import { GET } from "@/app/api/crm/clients/[id]/interactions/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

const ctx = () => ({ params: Promise.resolve({ id: "c1" }) });

describe("GET /api/crm/clients/[id]/interactions (list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
    vi.mocked(database.client.findFirst).mockResolvedValue({ id: "c1" } as never);
  });

  it("runs findMany + count concurrently, not serially", async () => {
    let resolveFindMany!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveFindMany = r;
    });
    vi.mocked(database.clientInteraction.findMany).mockReturnValue(
      pending as never
    );
    vi.mocked(database.clientInteraction.count).mockResolvedValue(0 as never);

    const p = GET(
      new Request("http://x/api/crm/clients/c1/interactions"),
      ctx() as never
    );

    await vi.waitFor(() => {
      expect(database.clientInteraction.findMany).toHaveBeenCalledTimes(1);
    });
    // count fires while findMany is still pending — impossible in serial.
    expect(database.clientInteraction.count).toHaveBeenCalledTimes(1);

    resolveFindMany([]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("returns the paginated shape with correct total", async () => {
    vi.mocked(database.clientInteraction.findMany).mockResolvedValue([
      { id: "i1", clientId: "c1" },
    ] as never);
    vi.mocked(database.clientInteraction.count).mockResolvedValue(5 as never);

    const res = await GET(
      new Request(
        "http://x/api/crm/clients/c1/interactions?limit=10&offset=20"
      ),
      ctx() as never
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toEqual({ limit: 10, offset: 20, total: 5 });
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(
      new Request("http://x/api/crm/clients/c1/interactions"),
      ctx() as never
    );
    expect(res.status).toBe(401);
    expect(database.clientInteraction.findMany).not.toHaveBeenCalled();
    expect(database.clientInteraction.count).not.toHaveBeenCalled();
  });
});
