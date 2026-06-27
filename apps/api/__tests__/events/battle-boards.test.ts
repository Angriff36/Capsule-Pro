/**
 * Battle Boards API Test Suite
 *
 * Covers:
 *   - GET  /api/events/battle-boards         (root route list)
 *   - GET  /api/events/battle-boards/list     (generated list route)
 *   - GET  /api/events/battle-boards/[id]     (generated detail route)
 *   - POST /api/events/battle-boards          (delegates to runManifestCommand)
 *   - POST via dispatcher (manifest/[entity]/commands/[command]/route)
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockBbFindMany = vi.fn();
const mockBbCount = vi.fn();
const mockBbFindFirst = vi.fn();

vi.mock("@repo/database", () => ({
  database: {
    battleBoard: {
      findMany: (...args: unknown[]) => mockBbFindMany(...args),
      count: (...args: unknown[]) => mockBbCount(...args),
      findFirst: (...args: unknown[]) => mockBbFindFirst(...args),
    },
  },
}));
vi.mock("@/lib/database", () => ({
  database: {
    battleBoard: {
      findMany: (...args: unknown[]) => mockBbFindMany(...args),
      count: (...args: unknown[]) => mockBbCount(...args),
      findFirst: (...args: unknown[]) => mockBbFindFirst(...args),
    },
  },
}));

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireTenantId: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@repo/observability/log", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/app/lib/invariant", () => {
  class InvariantError extends Error {
    override name = "InvariantError" as const;
  }
  return { invariant: vi.fn(), InvariantError };
});
vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@repo/notifications", () => ({}));

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
    manifestErrorResponse: (
      message: string | { error: string; diagnostics?: unknown[] },
      status: number
    ) => {
      const body =
        typeof message === "string"
          ? { success: false, message }
          : {
              success: false,
              error: message.error,
              diagnostics: message.diagnostics ?? [],
            };
      return NextResponse.json(body, { status });
    },
  };
});

// ---------------------------------------------------------------------------
// Imported mocks
// ---------------------------------------------------------------------------

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, resolveCurrentUser, requireCurrentUser } =
  await import("@/app/lib/tenant");
const { runManifestCommand } = await import("@/lib/manifest/execute-command");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TENANT_ID = "00000000-0000-0000-0000-000000000500";
const ORG_ID = "org_bb_test";
const CLERK_ID = "clerk_bb_test";
const USER_ID = "user_bb_test";
const BOARD_ID = "55555555-5555-4555-a555-555555555555";
const EVENT_ID = "55555555-5555-4555-a555-555555555eee";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authedOrg() {
  vi.mocked(auth).mockResolvedValue({
    orgId: ORG_ID,
    userId: CLERK_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TENANT_ID as never);
}

function unauthed() {
  vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);
}

function getRequest(url: string) {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

function postRequest(url: string, body: unknown = {}) {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeBoard(overrides: Record<string, unknown> = {}) {
  return {
    id: BOARD_ID,
    tenantId: TENANT_ID,
    eventId: EVENT_ID,
    title: "Battle Royale",
    status: "draft",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    ...overrides,
  };
}

function mockSuccessResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({ success: true, result: data, events: [] }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// ===========================================================================
// GET /api/events/battle-boards (root route)
// ===========================================================================

describe("GET /api/events/battle-boards (root route)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedOrg();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    unauthed();
    const { GET } = await import("@/app/api/events/battle-boards/route");
    const res = await GET(getRequest("/api/events/battle-boards"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe("Unauthorized");
  });

  it("returns boards with pagination", async () => {
    const boards = [makeBoard()];
    mockBbFindMany.mockResolvedValue(boards);
    mockBbCount.mockResolvedValue(1);

    const { GET } = await import("@/app/api/events/battle-boards/route");
    const res = await GET(getRequest("/api/events/battle-boards"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(BOARD_ID);
    expect(body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it("applies eventId filter", async () => {
    mockBbFindMany.mockResolvedValue([]);
    mockBbCount.mockResolvedValue(0);

    const { GET } = await import("@/app/api/events/battle-boards/route");
    await GET(getRequest(`/api/events/battle-boards?eventId=${EVENT_ID}`));

    expect(mockBbFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ eventId: EVENT_ID }),
      })
    );
  });

  it("applies status filter", async () => {
    mockBbFindMany.mockResolvedValue([]);
    mockBbCount.mockResolvedValue(0);

    const { GET } = await import("@/app/api/events/battle-boards/route");
    await GET(getRequest("/api/events/battle-boards?status=voting"));

    expect(mockBbFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "voting" }),
      })
    );
  });

  it("computes pagination from page+limit", async () => {
    mockBbFindMany.mockResolvedValue([]);
    mockBbCount.mockResolvedValue(45);

    const { GET } = await import("@/app/api/events/battle-boards/route");
    const res = await GET(
      getRequest("/api/events/battle-boards?page=3&limit=10")
    );
    const body = await res.json();

    expect(body.pagination).toEqual({
      page: 3,
      limit: 10,
      total: 45,
      totalPages: 5,
    });
    expect(mockBbFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 20 })
    );
  });

  it("clamps limit to max 100", async () => {
    mockBbFindMany.mockResolvedValue([]);
    mockBbCount.mockResolvedValue(0);

    const { GET } = await import("@/app/api/events/battle-boards/route");
    await GET(getRequest("/api/events/battle-boards?limit=500"));

    expect(mockBbFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it("clamps limit to min 1", async () => {
    mockBbFindMany.mockResolvedValue([]);
    mockBbCount.mockResolvedValue(0);

    const { GET } = await import("@/app/api/events/battle-boards/route");
    await GET(getRequest("/api/events/battle-boards?limit=0"));

    expect(mockBbFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1 })
    );
  });

  it("returns 500 when Prisma throws", async () => {
    mockBbFindMany.mockRejectedValue(new Error("DB explosion") as never);

    const { GET } = await import("@/app/api/events/battle-boards/route");
    const res = await GET(getRequest("/api/events/battle-boards"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.message).toBe("Internal server error");
  });
});

// ===========================================================================
// GET /api/events/battle-boards/list (generated route)
// ===========================================================================

describe("GET /api/events/battle-boards/list (generated)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedOrg();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    unauthed();
    const { GET } = await import("@/app/api/events/battle-boards/list/route");
    const res = await GET(getRequest("/api/events/battle-boards/list"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when tenant not found", async () => {
    vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);
    const { GET } = await import("@/app/api/events/battle-boards/list/route");
    const res = await GET(getRequest("/api/events/battle-boards/list"));
    expect(res.status).toBe(400);
  });

  it("returns battleBoards on success", async () => {
    const boards = [makeBoard()];
    mockBbFindMany.mockResolvedValue(boards);

    const { GET } = await import("@/app/api/events/battle-boards/list/route");
    const res = await GET(getRequest("/api/events/battle-boards/list"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.battleBoards).toHaveLength(1);
    expect(body.battleBoards[0].id).toBe(BOARD_ID);
  });

  it("returns 500 on database error", async () => {
    mockBbFindMany.mockRejectedValue(new Error("DB down") as never);

    const { GET } = await import("@/app/api/events/battle-boards/list/route");
    const res = await GET(getRequest("/api/events/battle-boards/list"));
    expect(res.status).toBe(500);
  });
});

// ===========================================================================
// GET /api/events/battle-boards/[id] (generated detail route)
// ===========================================================================

describe("GET /api/events/battle-boards/[id] (generated detail)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedOrg();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    unauthed();
    const { GET } = await import("@/app/api/events/battle-boards/[id]/route");
    const res = await GET(getRequest(`/api/events/battle-boards/${BOARD_ID}`), {
      params: Promise.resolve({ id: BOARD_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns battleBoard on success", async () => {
    const board = makeBoard();
    mockBbFindFirst.mockResolvedValue(board);

    const { GET } = await import("@/app/api/events/battle-boards/[id]/route");
    const res = await GET(getRequest(`/api/events/battle-boards/${BOARD_ID}`), {
      params: Promise.resolve({ id: BOARD_ID }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.battleBoard.id).toBe(BOARD_ID);
  });

  it("returns 404 when not found", async () => {
    mockBbFindFirst.mockResolvedValue(null);

    const { GET } = await import("@/app/api/events/battle-boards/[id]/route");
    const res = await GET(getRequest("/api/events/battle-boards/nonexistent"), {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 500 on database error", async () => {
    mockBbFindFirst.mockRejectedValue(new Error("DB error") as never);

    const { GET } = await import("@/app/api/events/battle-boards/[id]/route");
    const res = await GET(getRequest(`/api/events/battle-boards/${BOARD_ID}`), {
      params: Promise.resolve({ id: BOARD_ID }),
    });

    expect(res.status).toBe(500);
  });
});

// ===========================================================================
// POST /api/events/battle-boards (delegates to runManifestCommand)
// ===========================================================================

describe("POST /api/events/battle-boards (delegated create)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveCurrentUser).mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "admin",
    } as never);
    vi.mocked(runManifestCommand).mockResolvedValue(
      mockSuccessResponse({ id: BOARD_ID })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("delegates to runManifestCommand with BattleBoard/create", async () => {
    const { POST } = await import("@/app/api/events/battle-boards/route");
    const res = await POST(
      postRequest("/api/events/battle-boards", { eventId: EVENT_ID })
    );

    expect(res.status).toBe(200);
    expect(runManifestCommand).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "BattleBoard", command: "create" })
    );
  });

  it("throws when resolveCurrentUser rejects (no error boundary in route)", async () => {
    const err = new Error("Unauthenticated");
    err.name = "InvariantError";
    vi.mocked(resolveCurrentUser).mockRejectedValue(err);

    const { POST } = await import("@/app/api/events/battle-boards/route");
    await expect(
      POST(postRequest("/api/events/battle-boards", {}))
    ).rejects.toThrow("Unauthenticated");
  });
});

// ===========================================================================
// POST via dispatcher — BattleBoard commands
// ===========================================================================

const CURRENT_USER = { id: USER_ID, tenantId: TENANT_ID, role: "admin" };

describe("POST via dispatcher — BattleBoard commands", () => {
  let POST_dispatch: typeof import("@/app/api/manifest/[entity]/commands/[command]/route")["POST"];

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(CURRENT_USER as never);
    vi.mocked(runManifestCommand).mockResolvedValue(
      mockSuccessResponse({ id: BOARD_ID })
    );
    const mod = await import(
      "@/app/api/manifest/[entity]/commands/[command]/route"
    );
    POST_dispatch = mod.POST;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const dispatchBb = (command: string, body: Record<string, unknown> = {}) =>
    POST_dispatch(
      postRequest("/api/events/battle-boards/commands/create", body),
      {
        params: Promise.resolve({ entity: "BattleBoard", command }),
      }
    );

  it("returns 200 on create success", async () => {
    const res = await dispatchBb("create", {
      eventId: EVENT_ID,
      title: "Test",
    });
    expect(res.status).toBe(200);
    expect(runManifestCommand).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "BattleBoard", command: "create" })
    );
  });

  it("returns 401 when requireCurrentUser throws InvariantError", async () => {
    const err = new Error("Unauthenticated");
    err.name = "InvariantError";
    vi.mocked(requireCurrentUser).mockRejectedValue(err);

    const res = await dispatchBb("create");
    expect(res.status).toBe(401);
  });

  it("returns 403 on policy denial", async () => {
    vi.mocked(runManifestCommand).mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, message: "Access denied: adminOnly" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const res = await dispatchBb("create");
    expect(res.status).toBe(403);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(runManifestCommand).mockRejectedValue(new Error("Runtime crash"));

    const res = await dispatchBb("create");
    expect(res.status).toBe(500);
  });

  it("returns 400 when params are missing", async () => {
    const res = await POST_dispatch(
      postRequest("/api/test", {}),
      undefined as any
    );
    expect(res.status).toBe(400);
  });
});
