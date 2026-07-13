/**
 * GET /api/command-board (list) — parallelization + pagination guard.
 *
 * Pins item #23: the route's `findMany` + `count` run CONCURRENTLY in one
 * `Promise.all` (2 serial round-trips → 1 batch), not serially.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@repo/database", () => ({
  database: {
    commandBoard: { findMany: vi.fn(), count: vi.fn() },
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
import { GET } from "@/app/api/command-board/route";
import { getTenantIdForOrg } from "@/app/lib/tenant";

describe("GET /api/command-board (list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue("tenant_test");
  });

  it("runs findMany + count concurrently, not serially", async () => {
    let resolveFindMany!: (v: unknown) => void;
    const pending = new Promise((r) => {
      resolveFindMany = r;
    });
    vi.mocked(database.commandBoard.findMany).mockReturnValue(pending as never);
    vi.mocked(database.commandBoard.count).mockResolvedValue(9);

    const p = GET(new Request("http://x/api/command-board?page=1&limit=10"));

    await vi.waitFor(() => {
      expect(database.commandBoard.findMany).toHaveBeenCalledTimes(1);
    });

    expect(database.commandBoard.count).toHaveBeenCalledTimes(1);
    expect(database.commandBoard.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ tenantId: "tenant_test" }),
    });

    resolveFindMany([]);
    const res = await p;
    expect(res.status).toBe(200);
  });

  it("returns the paginated shape with correct totalPages math", async () => {
    vi.mocked(database.commandBoard.findMany).mockResolvedValue([
      {
        id: "b1",
        tenantId: "tenant_test",
        eventId: null,
        name: "Board 1",
        description: null,
        status: "active",
        isTemplate: false,
        tags: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        _count: { commandBoardCards: 3 },
      },
      {
        id: "b2",
        tenantId: "tenant_test",
        eventId: null,
        name: "Board 2",
        description: null,
        status: "draft",
        isTemplate: false,
        tags: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        _count: { commandBoardCards: 1 },
      },
    ] as never);
    vi.mocked(database.commandBoard.count).mockResolvedValue(25);

    const res = await GET(
      new Request("http://x/api/command-board?page=2&limit=10")
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it("rejects unauthenticated requests with 401 before any DB read", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(new Request("http://x/api/command-board"));
    expect(res.status).toBe(401);
    expect(database.commandBoard.findMany).not.toHaveBeenCalled();
    expect(database.commandBoard.count).not.toHaveBeenCalled();
  });
});
