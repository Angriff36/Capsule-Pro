/**
 * Catering Orders API Tests
 *
 * Covers:
 *   - GET /api/events/catering-orders/list     (generated list route)
 *   - GET /api/events/catering-orders/[id]     (generated detail route)
 *   - POST via dispatcher for CateringOrder commands (create, update, confirm, etc.)
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCoFindMany = vi.fn();
const mockCoFindFirst = vi.fn();

vi.mock("@repo/database", () => ({
  database: {
    cateringOrder: {
      findMany: (...args: unknown[]) => mockCoFindMany(...args),
      findFirst: (...args: unknown[]) => mockCoFindFirst(...args),
    },
  },
}));
vi.mock("@/lib/database", () => ({
  database: {
    cateringOrder: {
      findMany: (...args: unknown[]) => mockCoFindMany(...args),
      findFirst: (...args: unknown[]) => mockCoFindFirst(...args),
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
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), addBreadcrumb: vi.fn() }));
vi.mock("@/lib/manifest/execute-command", () => ({ runManifestCommand: vi.fn() }));
vi.mock("@repo/observability/log", () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock("@/app/lib/invariant", () => {
  class InvariantError extends Error { name = "InvariantError" as const; }
  return { invariant: vi.fn(), InvariantError };
});
vi.mock("@/app/lib/webhook-dispatch", () => ({ dispatchWebhooks: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@repo/notifications", () => ({}));

vi.mock("@/lib/manifest-response", async () => {
  const { NextResponse } = await import("next/server");
  return {
    manifestSuccessResponse: (data: unknown, status = 200) =>
      NextResponse.json(
        { success: true, ...(typeof data === "object" && data !== null ? data : { data }) },
        { status }
      ),
    manifestErrorResponse: (message: string | { error: string; diagnostics?: unknown[] }, status: number) => {
      const body = typeof message === "string"
        ? { success: false, message }
        : { success: false, error: message.error, diagnostics: message.diagnostics ?? [] };
      return NextResponse.json(body, { status });
    },
  };
});

// ---------------------------------------------------------------------------
// Imported mocks
// ---------------------------------------------------------------------------

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, requireCurrentUser } = await import("@/app/lib/tenant");
const { runManifestCommand } = await import("@/lib/manifest/execute-command");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const USER_ID = "user_co_test";
const CLERK_ID = "clerk_co_test";
const ORG_ID = "org_co_test";
const ORDER_ID = "c0000000-0000-4000-a000-000000000001";
const EVENT_ID = "e0000000-0000-4000-a000-000000000001";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authedOrg() {
  vi.mocked(auth).mockResolvedValue({ orgId: ORG_ID, userId: CLERK_ID } as never);
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

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    tenantId: TENANT_ID,
    eventId: EVENT_ID,
    orderNumber: "CO-001",
    clientName: "Test Client",
    status: "draft",
    guestCount: 50,
    totalAmount: 2500,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    ...overrides,
  };
}

function mockSuccessResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, result: data, events: [] }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ===========================================================================
// GET /api/events/catering-orders/list
// ===========================================================================

describe("GET /api/events/catering-orders/list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedOrg();
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it("returns 401 for unauthenticated requests", async () => {
    unauthed();
    const { GET } = await import("@/app/api/events/catering-orders/list/route");
    const res = await GET(getRequest("/api/events/catering-orders/list"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when tenant not found", async () => {
    vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);
    const { GET } = await import("@/app/api/events/catering-orders/list/route");
    const res = await GET(getRequest("/api/events/catering-orders/list"));
    expect(res.status).toBe(400);
  });

  it("returns cateringOrders on success", async () => {
    const orders = [
      makeOrder({ id: "order-001", status: "draft" }),
      makeOrder({ id: "order-002", status: "confirmed" }),
    ];
    mockCoFindMany.mockResolvedValue(orders);

    const { GET } = await import("@/app/api/events/catering-orders/list/route");
    const res = await GET(getRequest("/api/events/catering-orders/list"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.cateringOrders).toHaveLength(2);
  });

  it("filters by tenantId and excludes soft-deleted", async () => {
    mockCoFindMany.mockResolvedValue([]);

    const { GET } = await import("@/app/api/events/catering-orders/list/route");
    await GET(getRequest("/api/events/catering-orders/list"));

    expect(mockCoFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: TENANT_ID, deletedAt: null }),
      })
    );
  });

  it("returns 500 on database error", async () => {
    mockCoFindMany.mockRejectedValue(new Error("DB connection lost") as never);

    const { GET } = await import("@/app/api/events/catering-orders/list/route");
    const res = await GET(getRequest("/api/events/catering-orders/list"));
    expect(res.status).toBe(500);
  });
});

// ===========================================================================
// GET /api/events/catering-orders/[id]
// ===========================================================================

describe("GET /api/events/catering-orders/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedOrg();
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it("returns 401 for unauthenticated requests", async () => {
    unauthed();
    const { GET } = await import("@/app/api/events/catering-orders/[id]/route");
    const res = await GET(getRequest(`/api/events/catering-orders/${ORDER_ID}`), {
      params: Promise.resolve({ id: ORDER_ID }),
    });
    expect(res.status).toBe(401);
  });

  it("returns cateringOrder on success", async () => {
    const order = makeOrder();
    mockCoFindFirst.mockResolvedValue(order);

    const { GET } = await import("@/app/api/events/catering-orders/[id]/route");
    const res = await GET(getRequest(`/api/events/catering-orders/${ORDER_ID}`), {
      params: Promise.resolve({ id: ORDER_ID }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.cateringOrder.id).toBe(ORDER_ID);
  });

  it("returns 404 when order not found", async () => {
    mockCoFindFirst.mockResolvedValue(null);

    const { GET } = await import("@/app/api/events/catering-orders/[id]/route");
    const res = await GET(getRequest("/api/events/catering-orders/nonexistent"), {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(res.status).toBe(404);
  });

  it("enforces tenant isolation", async () => {
    mockCoFindFirst.mockResolvedValue(null);

    const { GET } = await import("@/app/api/events/catering-orders/[id]/route");
    await GET(getRequest(`/api/events/catering-orders/${ORDER_ID}`), {
      params: Promise.resolve({ id: ORDER_ID }),
    });

    expect(mockCoFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: ORDER_ID, tenantId: TENANT_ID }),
      })
    );
  });

  it("returns 500 on database error", async () => {
    mockCoFindFirst.mockRejectedValue(new Error("DB error") as never);

    const { GET } = await import("@/app/api/events/catering-orders/[id]/route");
    const res = await GET(getRequest(`/api/events/catering-orders/${ORDER_ID}`), {
      params: Promise.resolve({ id: ORDER_ID }),
    });
    expect(res.status).toBe(500);
  });
});

// ===========================================================================
// POST via dispatcher — CateringOrder commands
// ===========================================================================

const CURRENT_USER = { id: USER_ID, tenantId: TENANT_ID, role: "admin" };

describe("POST via dispatcher — CateringOrder commands", () => {
  let POST_dispatch: typeof import("@/app/api/manifest/[entity]/commands/[command]/route")["POST"];

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(CURRENT_USER as never);
    vi.mocked(runManifestCommand).mockResolvedValue(
      mockSuccessResponse({ id: ORDER_ID, status: "draft" })
    );
    const mod = await import("@/app/api/manifest/[entity]/commands/[command]/route");
    POST_dispatch = mod.POST;
  });

  afterEach(() => { vi.restoreAllMocks(); });

  const dispatchCo = (command: string, body: Record<string, unknown> = {}) =>
    POST_dispatch(postRequest(`/api/events/catering-orders/commands/${command}`, body), {
      params: Promise.resolve({ entity: "CateringOrder", command }),
    });

  // --- create ---
  it("returns 200 on create success", async () => {
    const res = await dispatchCo("create", { eventId: EVENT_ID, clientName: "Acme Corp" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.result.id).toBe(ORDER_ID);
  });

  it("delegates create with correct entity/command", async () => {
    await dispatchCo("create", { eventId: EVENT_ID });
    expect(runManifestCommand).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "CateringOrder", command: "create" })
    );
  });

  // --- update ---
  it("returns 200 on update success", async () => {
    vi.mocked(runManifestCommand).mockResolvedValue(
      mockSuccessResponse({ id: ORDER_ID, guestCount: 200 })
    );
    const res = await dispatchCo("update", { instanceId: ORDER_ID, guestCount: 200 });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.guestCount).toBe(200);
  });

  // --- confirm ---
  it("returns 200 on confirm success", async () => {
    vi.mocked(runManifestCommand).mockResolvedValue(
      mockSuccessResponse({ id: ORDER_ID, status: "confirmed" })
    );
    const res = await dispatchCo("confirm", { instanceId: ORDER_ID });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.status).toBe("confirmed");
  });

  // --- cancel ---
  it("returns 200 on cancel success", async () => {
    vi.mocked(runManifestCommand).mockResolvedValue(
      mockSuccessResponse({ id: ORDER_ID, status: "cancelled" })
    );
    const res = await dispatchCo("cancel", { instanceId: ORDER_ID, cancellationReason: "Client requested" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.status).toBe("cancelled");
  });

  // --- startPrep ---
  it("returns 200 on startPrep success", async () => {
    vi.mocked(runManifestCommand).mockResolvedValue(
      mockSuccessResponse({ id: ORDER_ID, status: "in_preparation" })
    );
    const res = await dispatchCo("startPrep", { instanceId: ORDER_ID });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.status).toBe("in_preparation");
  });

  // --- markComplete ---
  it("returns 200 on markComplete success", async () => {
    vi.mocked(runManifestCommand).mockResolvedValue(
      mockSuccessResponse({ id: ORDER_ID, status: "completed" })
    );
    const res = await dispatchCo("markComplete", { instanceId: ORDER_ID });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.status).toBe("completed");
  });

  // --- error cases ---
  it("returns 401 when requireCurrentUser throws InvariantError", async () => {
    const err = new Error("Unauthenticated");
    err.name = "InvariantError";
    vi.mocked(requireCurrentUser).mockRejectedValue(err);

    const res = await dispatchCo("create", { eventId: EVENT_ID });
    expect(res.status).toBe(401);
  });

  it("returns 403 on policy denial", async () => {
    vi.mocked(runManifestCommand).mockResolvedValue(
      new Response(JSON.stringify({ success: false, message: "Access denied: RequiresManagerRole" }), {
        status: 403, headers: { "Content-Type": "application/json" },
      })
    );

    const res = await dispatchCo("create", { eventId: EVENT_ID });
    expect(res.status).toBe(403);
  });

  it("returns 400 on generic command failure", async () => {
    vi.mocked(runManifestCommand).mockResolvedValue(
      new Response(JSON.stringify({ success: false, message: "Invalid payload" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      })
    );

    const res = await dispatchCo("create", { eventId: EVENT_ID });
    expect(res.status).toBe(400);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(runManifestCommand).mockRejectedValue(new Error("Runtime crash"));

    const res = await dispatchCo("create", { eventId: EVENT_ID });
    expect(res.status).toBe(500);
  });
});
