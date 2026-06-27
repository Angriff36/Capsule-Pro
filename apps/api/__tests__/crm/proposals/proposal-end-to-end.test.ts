/**
 * Proposal End-to-End API Tests
 *
 * Covers:
 *   - GET /api/crm/proposals               (root route list)
 *   - GET /api/crm/proposals/[id]           (detail route)
 *   - POST /api/crm/proposals               (create via runManifestCommand)
 *   - PUT /api/crm/proposals/[id]           (update via runManifestCommand)
 *   - DELETE /api/crm/proposals/[id]        (withdraw via runManifestCommand)
 *   - POST via dispatcher for Proposal commands
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockProposalFindMany = vi.fn();
const mockProposalCount = vi.fn();
const mockProposalFindFirst = vi.fn();
const mockClientFindMany = vi.fn();
const mockClientFindFirst = vi.fn();
const mockLeadFindMany = vi.fn();
const mockLeadFindFirst = vi.fn();
const mockEventFindFirst = vi.fn();
const mockLineItemFindMany = vi.fn();

vi.mock("@repo/database", () => ({
  database: {
    proposal: {
      findMany: (...args: unknown[]) => mockProposalFindMany(...args),
      count: (...args: unknown[]) => mockProposalCount(...args),
      findFirst: (...args: unknown[]) => mockProposalFindFirst(...args),
    },
    client: {
      findMany: (...args: unknown[]) => mockClientFindMany(...args),
      findFirst: (...args: unknown[]) => mockClientFindFirst(...args),
    },
    lead: {
      findMany: (...args: unknown[]) => mockLeadFindMany(...args),
      findFirst: (...args: unknown[]) => mockLeadFindFirst(...args),
    },
    event: {
      findFirst: (...args: unknown[]) => mockEventFindFirst(...args),
    },
    proposalLineItem: {
      findMany: (...args: unknown[]) => mockLineItemFindMany(...args),
    },
  },
}));
vi.mock("@/lib/database", () => ({
  database: {
    proposal: {
      findMany: (...args: unknown[]) => mockProposalFindMany(...args),
      count: (...args: unknown[]) => mockProposalCount(...args),
      findFirst: (...args: unknown[]) => mockProposalFindFirst(...args),
    },
    client: {
      findMany: (...args: unknown[]) => mockClientFindMany(...args),
      findFirst: (...args: unknown[]) => mockClientFindFirst(...args),
    },
    lead: {
      findMany: (...args: unknown[]) => mockLeadFindMany(...args),
      findFirst: (...args: unknown[]) => mockLeadFindFirst(...args),
    },
    event: {
      findFirst: (...args: unknown[]) => mockEventFindFirst(...args),
    },
    proposalLineItem: {
      findMany: (...args: unknown[]) => mockLineItemFindMany(...args),
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

const TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const ORG_ID = "org-prop-test";
const USER_ID = "u0000000-0000-4000-a000-000000000001";
const CLERK_ID = "clerk_prop_test";
const PROPOSAL_ID = "prop-001";

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

function makeProposal(overrides: Record<string, unknown> = {}) {
  return {
    id: PROPOSAL_ID,
    tenantId: TENANT_ID,
    proposalNumber: "PROP-001",
    title: "Corporate Lunch Proposal",
    status: "draft",
    clientId: null,
    leadId: null,
    eventId: null,
    total: 5000,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    ...overrides,
  };
}

function setupListMocks(proposals: unknown[] = []) {
  mockProposalFindMany.mockResolvedValue(proposals);
  mockProposalCount.mockResolvedValue(proposals.length);
  mockClientFindMany.mockResolvedValue([]);
  mockLeadFindMany.mockResolvedValue([]);
  mockLineItemFindMany.mockResolvedValue([]);
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
// GET /api/crm/proposals (root route list)
// ===========================================================================

describe("GET /api/crm/proposals (list)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedOrg();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 for unauthenticated requests", async () => {
    unauthed();
    const { GET } = await import("@/app/api/crm/proposals/route");
    const res = await GET(getRequest("/api/crm/proposals"));
    expect(res.status).toBe(401);
  });

  it("returns proposals with pagination", async () => {
    const proposals = [makeProposal()];
    setupListMocks(proposals);

    const { GET } = await import("@/app/api/crm/proposals/route");
    const res = await GET(getRequest("/api/crm/proposals"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(PROPOSAL_ID);
    expect(body.pagination.total).toBe(1);
  });

  it("filters by tenantId and excludes soft-deleted", async () => {
    setupListMocks([]);

    const { GET } = await import("@/app/api/crm/proposals/route");
    await GET(getRequest("/api/crm/proposals"));

    expect(mockProposalFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ tenantId: TENANT_ID }),
            expect.objectContaining({ deletedAt: null }),
          ]),
        }),
      })
    );
  });

  it("applies status filter", async () => {
    setupListMocks([]);

    const { GET } = await import("@/app/api/crm/proposals/route");
    await GET(getRequest("/api/crm/proposals?status=draft"));

    expect(mockProposalFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ status: "draft" }),
          ]),
        }),
      })
    );
  });

  it("applies search filter", async () => {
    setupListMocks([]);

    const { GET } = await import("@/app/api/crm/proposals/route");
    await GET(getRequest("/api/crm/proposals?search=lunch"));

    const call = mockProposalFindMany.mock.calls[0]![0] as any;
    const andClause = call.where.AND as any[];
    // One of the AND clauses should contain an OR with title/proposalNumber/venueName
    const orClause = andClause.find((c: any) => c.OR);
    expect(orClause).toBeDefined();
    expect(orClause.OR[0].title.contains).toBe("lunch");
  });

  it("returns 500 on database error", async () => {
    mockProposalFindMany.mockRejectedValue(new Error("DB down") as never);

    const { GET } = await import("@/app/api/crm/proposals/route");
    const res = await GET(getRequest("/api/crm/proposals"));
    expect(res.status).toBe(500);
  });

  it("returns empty data when no proposals", async () => {
    setupListMocks([]);

    const { GET } = await import("@/app/api/crm/proposals/route");
    const res = await GET(getRequest("/api/crm/proposals"));
    const body = await res.json();

    expect(body.data).toHaveLength(0);
    expect(body.pagination.total).toBe(0);
  });
});

// ===========================================================================
// GET /api/crm/proposals/[id] (detail)
// ===========================================================================

describe("GET /api/crm/proposals/[id] (detail)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedOrg();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns proposal with line items on success", async () => {
    const proposal = makeProposal({
      clientId: "client-001",
      leadId: "lead-001",
    });
    mockProposalFindFirst.mockResolvedValue(proposal);
    mockClientFindFirst.mockResolvedValue({
      id: "client-001",
      company_name: "Acme",
    });
    mockLeadFindFirst.mockResolvedValue({
      id: "lead-001",
      companyName: "LeadCo",
    });
    mockLineItemFindMany.mockResolvedValue([
      {
        id: "li-001",
        proposalId: PROPOSAL_ID,
        category: "food",
        description: "Catering",
        sortOrder: 0,
      },
    ]);

    const { GET } = await import("@/app/api/crm/proposals/[id]/route");
    const res = await GET(getRequest(`/api/crm/proposals/${PROPOSAL_ID}`), {
      params: Promise.resolve({ id: PROPOSAL_ID }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(PROPOSAL_ID);
    expect(body.data.lineItems).toHaveLength(1);
  });

  it("returns 404 for non-existent proposal", async () => {
    mockProposalFindFirst.mockResolvedValue(null);

    const { GET } = await import("@/app/api/crm/proposals/[id]/route");
    const res = await GET(getRequest("/api/crm/proposals/nonexistent"), {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 401 for unauthenticated requests", async () => {
    unauthed();
    const { GET } = await import("@/app/api/crm/proposals/[id]/route");
    const res = await GET(getRequest(`/api/crm/proposals/${PROPOSAL_ID}`), {
      params: Promise.resolve({ id: PROPOSAL_ID }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 500 on database error", async () => {
    mockProposalFindFirst.mockRejectedValue(new Error("DB error") as never);

    const { GET } = await import("@/app/api/crm/proposals/[id]/route");
    const res = await GET(getRequest(`/api/crm/proposals/${PROPOSAL_ID}`), {
      params: Promise.resolve({ id: PROPOSAL_ID }),
    });

    expect(res.status).toBe(500);
  });
});

// ===========================================================================
// POST /api/crm/proposals (create via runManifestCommand)
// ===========================================================================

describe("POST /api/crm/proposals (create)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveCurrentUser).mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "admin",
    } as never);
    vi.mocked(runManifestCommand).mockResolvedValue(
      mockSuccessResponse({ id: PROPOSAL_ID, status: "draft" })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("delegates to runManifestCommand with Proposal/create", async () => {
    const { POST } = await import("@/app/api/crm/proposals/route");
    const res = await POST(
      postRequest("/api/crm/proposals", { title: "New Proposal" })
    );

    expect(res.status).toBe(200);
    expect(runManifestCommand).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "Proposal", command: "create" })
    );
  });

  it("passes user context to runManifestCommand", async () => {
    const { POST } = await import("@/app/api/crm/proposals/route");
    await POST(postRequest("/api/crm/proposals", { title: "Test" }));

    expect(runManifestCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { id: USER_ID, tenantId: TENANT_ID, role: "admin" },
      })
    );
  });
});

// ===========================================================================
// PUT /api/crm/proposals/[id] (update via runManifestCommand)
// ===========================================================================

describe("PUT /api/crm/proposals/[id] (update)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveCurrentUser).mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "admin",
    } as never);
    vi.mocked(runManifestCommand).mockResolvedValue(
      mockSuccessResponse({ id: PROPOSAL_ID, status: "draft" })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("delegates to runManifestCommand with Proposal/update and includes id", async () => {
    const { PUT } = await import("@/app/api/crm/proposals/[id]/route");
    const req = new NextRequest(
      new URL(`/api/crm/proposals/${PROPOSAL_ID}`, "http://localhost:3000"),
      {
        method: "PUT",
        body: JSON.stringify({ title: "Updated" }),
        headers: { "Content-Type": "application/json" },
      }
    );

    const res = await PUT(req, {
      params: Promise.resolve({ id: PROPOSAL_ID }),
    });

    expect(res.status).toBe(200);
    expect(runManifestCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "Proposal",
        command: "update",
        body: expect.objectContaining({ id: PROPOSAL_ID, title: "Updated" }),
      })
    );
  });
});

// ===========================================================================
// DELETE /api/crm/proposals/[id] (withdraw via runManifestCommand)
// ===========================================================================

describe("DELETE /api/crm/proposals/[id] (withdraw)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveCurrentUser).mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "admin",
    } as never);
    vi.mocked(runManifestCommand).mockResolvedValue(
      mockSuccessResponse({ id: PROPOSAL_ID, status: "withdrawn" })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("delegates to runManifestCommand with Proposal/withdraw", async () => {
    const { DELETE } = await import("@/app/api/crm/proposals/[id]/route");
    const req = new NextRequest(
      new URL(`/api/crm/proposals/${PROPOSAL_ID}`, "http://localhost:3000"),
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    );

    const res = await DELETE(req, {
      params: Promise.resolve({ id: PROPOSAL_ID }),
    });

    expect(res.status).toBe(200);
    expect(runManifestCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "Proposal",
        command: "withdraw",
        body: { id: PROPOSAL_ID },
      })
    );
  });
});

// ===========================================================================
// POST via dispatcher — Proposal commands
// ===========================================================================

const CURRENT_USER = { id: USER_ID, tenantId: TENANT_ID, role: "admin" };

describe("POST via dispatcher — Proposal commands", () => {
  let POST_dispatch: typeof import("@/app/api/manifest/[entity]/commands/[command]/route")["POST"];

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(requireCurrentUser).mockResolvedValue(CURRENT_USER as never);
    vi.mocked(runManifestCommand).mockResolvedValue(
      mockSuccessResponse({ id: PROPOSAL_ID, status: "draft" })
    );
    const mod = await import(
      "@/app/api/manifest/[entity]/commands/[command]/route"
    );
    POST_dispatch = mod.POST;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const dispatchProposal = (
    command: string,
    body: Record<string, unknown> = {}
  ) =>
    POST_dispatch(postRequest(`/api/crm/proposals/commands/${command}`, body), {
      params: Promise.resolve({ entity: "Proposal", command }),
    });

  it("returns 200 on create success", async () => {
    const res = await dispatchProposal("create", { title: "New Proposal" });
    expect(res.status).toBe(200);
    expect(runManifestCommand).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "Proposal", command: "create" })
    );
  });

  it("returns 401 when requireCurrentUser throws InvariantError", async () => {
    const err = new Error("Unauthenticated");
    err.name = "InvariantError";
    vi.mocked(requireCurrentUser).mockRejectedValue(err);

    const res = await dispatchProposal("create");
    expect(res.status).toBe(401);
  });

  it("returns 403 on policy denial", async () => {
    vi.mocked(runManifestCommand).mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, message: "Access denied" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const res = await dispatchProposal("create");
    expect(res.status).toBe(403);
  });

  it("returns 500 on unexpected error", async () => {
    vi.mocked(runManifestCommand).mockRejectedValue(new Error("Runtime crash"));
    const res = await dispatchProposal("create");
    expect(res.status).toBe(500);
  });
});
