/**
 * Knowledge Base API Tests
 *
 * Tests for GET /api/knowledge-base/entries/list and
 * POST /api/knowledge-base/entries/commands/create
 * covering authentication, validation, filtering, pagination,
 * duplicate detection, and error handling.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/knowledge-base/entries/list/route";
import { POST } from "@/app/api/manifest/[entity]/commands/[command]/route";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockKbFindMany = vi.fn();
const mockKbCount = vi.fn();
const mockKbFindFirst = vi.fn();
const mockKbCreate = vi.fn();

vi.mock("@repo/database", () => ({
  database: {
    knowledgeBaseEntry: {
      findMany: (...args: unknown[]) => mockKbFindMany(...args),
      count: (...args: unknown[]) => mockKbCount(...args),
      findFirst: (...args: unknown[]) => mockKbFindFirst(...args),
      create: (...args: unknown[]) => mockKbCreate(...args),
    },
  },
}));

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  requireCurrentUser: vi.fn(),
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InvariantError";
    }
  },
}));
vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

// manifest-response needs to be mocked because it uses NextResponse under the
// hood but we want deterministic shape assertions in the test.
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
    manifestErrorResponse: (message: string, status: number) =>
      NextResponse.json({ success: false, message }, { status }),
  };
});

// ---------------------------------------------------------------------------
// Imported mocks
// ---------------------------------------------------------------------------

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, requireCurrentUser } = await import("@/app/lib/tenant");
const { InvariantError } = await import("@/app/lib/invariant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KB_TENANT_ID = "00000000-0000-0000-0000-000000000021";
const KB_USER_ID = "user_kb_test";
const KB_ORG_ID = "org_kb_test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAuthedUser() {
  vi.mocked(auth).mockResolvedValue({
    userId: KB_USER_ID,
    orgId: KB_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(KB_TENANT_ID);
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: KB_USER_ID,
    tenantId: KB_TENANT_ID,
    role: "admin",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  } as never);
}

function makeGetRequest(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return new NextRequest(
    `http://localhost/api/knowledge-base/entries/list?${qs}`
  );
}

function makePostRequest(body: Record<string, unknown>) {
  return new NextRequest(
    "http://localhost/api/manifest/[entity]/commands/[command]",
    {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }
  );
}

function makeKbEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "kb-entry-1",
    tenantId: KB_TENANT_ID,
    slug: "onboarding-guide",
    title: "Onboarding Guide",
    content: "Welcome to the team!",
    category: "hr",
    tags: ["onboarding", "new-hire"],
    status: "published",
    authorId: KB_USER_ID,
    createdAt: new Date("2026-01-15"),
    updatedAt: new Date("2026-02-01"),
    publishedAt: new Date("2026-01-20"),
    ...overrides,
  };
}

// ===========================================================================
// GET /api/knowledge-base/entries/list
// ===========================================================================

describe("GET /api/knowledge-base/entries/list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    makeAuthedUser();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ----- Auth -----

  it("should return 401 when userId is missing", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: null,
      orgId: KB_ORG_ID,
    } as never);

    const req = makeGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Unauthorized");
  });

  it("should return 401 when orgId is missing", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: KB_USER_ID,
      orgId: null,
    } as never);

    const req = makeGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Unauthorized");
  });

  it("should return 400 when tenant not found", async () => {
    vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

    const req = makeGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Tenant not found");
  });

  // ----- Successful list -----

  it("should return entries with hasMore and totalCount", async () => {
    const entries = [makeKbEntry(), makeKbEntry({ id: "kb-2", slug: "faq" })];
    mockKbCount.mockResolvedValue(2);
    mockKbFindMany.mockResolvedValue(entries);

    const req = makeGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.entries).toHaveLength(2);
    expect(body.totalCount).toBe(2);
    expect(body.hasMore).toBe(false);
  });

  it("should indicate hasMore when more entries exist", async () => {
    mockKbCount.mockResolvedValue(15);
    mockKbFindMany.mockResolvedValue([makeKbEntry()]);

    const req = makeGetRequest({ limit: "1", offset: "0" });
    const res = await GET(req);
    const body = await res.json();

    expect(body.hasMore).toBe(true);
  });

  it("should indicate hasMore=false when at end of list", async () => {
    mockKbCount.mockResolvedValue(1);
    mockKbFindMany.mockResolvedValue([makeKbEntry()]);

    const req = makeGetRequest({ limit: "10", offset: "0" });
    const res = await GET(req);
    const body = await res.json();

    expect(body.hasMore).toBe(false);
  });

  // ----- Filtering -----

  it("should pass category filter to findMany", async () => {
    mockKbCount.mockResolvedValue(0);
    mockKbFindMany.mockResolvedValue([]);

    const req = makeGetRequest({ category: "hr" });
    await GET(req);

    expect(mockKbFindMany).toHaveBeenCalledTimes(1);
    const where = mockKbFindMany.mock.calls[0][0].where;
    expect(where.category).toBe("hr");
    expect(where.tenantId).toBe(KB_TENANT_ID);
  });

  it("should pass status filter to findMany", async () => {
    mockKbCount.mockResolvedValue(0);
    mockKbFindMany.mockResolvedValue([]);

    const req = makeGetRequest({ status: "published" });
    await GET(req);

    const where = mockKbFindMany.mock.calls[0][0].where;
    expect(where.status).toBe("published");
  });

  it("should pass tag filter to findMany using has operator", async () => {
    mockKbCount.mockResolvedValue(0);
    mockKbFindMany.mockResolvedValue([]);

    const req = makeGetRequest({ tag: "onboarding" });
    await GET(req);

    const where = mockKbFindMany.mock.calls[0][0].where;
    expect(where.tags).toEqual({ has: "onboarding" });
  });

  it("should pass search filter with OR clause for title and content", async () => {
    mockKbCount.mockResolvedValue(0);
    mockKbFindMany.mockResolvedValue([]);

    const req = makeGetRequest({ search: "welcome" });
    await GET(req);

    const where = mockKbFindMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { title: { contains: "welcome", mode: "insensitive" } },
      { content: { contains: "welcome", mode: "insensitive" } },
    ]);
  });

  it("should combine multiple filters together", async () => {
    mockKbCount.mockResolvedValue(0);
    mockKbFindMany.mockResolvedValue([]);

    const req = makeGetRequest({
      category: "hr",
      status: "published",
      tag: "onboarding",
    });
    await GET(req);

    const where = mockKbFindMany.mock.calls[0][0].where;
    expect(where.category).toBe("hr");
    expect(where.status).toBe("published");
    expect(where.tags).toEqual({ has: "onboarding" });
  });

  it("should not include category filter when not provided", async () => {
    mockKbCount.mockResolvedValue(0);
    mockKbFindMany.mockResolvedValue([]);

    const req = makeGetRequest();
    await GET(req);

    const where = mockKbFindMany.mock.calls[0][0].where;
    expect(where.category).toBeUndefined();
  });

  // ----- Pagination -----

  it("should apply default pagination (limit=50, offset=0)", async () => {
    mockKbCount.mockResolvedValue(0);
    mockKbFindMany.mockResolvedValue([]);

    const req = makeGetRequest();
    await GET(req);

    const call = mockKbFindMany.mock.calls[0][0];
    expect(call.take).toBe(50);
    expect(call.skip).toBe(0);
  });

  it("should apply custom pagination parameters", async () => {
    mockKbCount.mockResolvedValue(100);
    mockKbFindMany.mockResolvedValue([]);

    const req = makeGetRequest({ limit: "20", offset: "40" });
    await GET(req);

    const call = mockKbFindMany.mock.calls[0][0];
    expect(call.take).toBe(20);
    expect(call.skip).toBe(40);
  });

  it("should cap limit at 200", async () => {
    mockKbCount.mockResolvedValue(0);
    mockKbFindMany.mockResolvedValue([]);

    const req = makeGetRequest({ limit: "500" });
    await GET(req);

    const call = mockKbFindMany.mock.calls[0][0];
    expect(call.take).toBe(200);
  });

  it("should order entries by updatedAt desc", async () => {
    mockKbCount.mockResolvedValue(0);
    mockKbFindMany.mockResolvedValue([]);

    const req = makeGetRequest();
    await GET(req);

    const call = mockKbFindMany.mock.calls[0][0];
    expect(call.orderBy).toEqual({ updatedAt: "desc" });
  });

  // ----- Error handling -----

  it("should return 500 on database error", async () => {
    mockKbCount.mockRejectedValue(new Error("DB down") as never);

    const req = makeGetRequest();
    const res = await GET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Internal server error");
  });

  // ----- Empty results -----

  it("should return empty entries array when no matches", async () => {
    mockKbCount.mockResolvedValue(0);
    mockKbFindMany.mockResolvedValue([]);

    const req = makeGetRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.entries).toEqual([]);
    expect(body.totalCount).toBe(0);
    expect(body.hasMore).toBe(false);
  });
});

// ===========================================================================
// POST /api/knowledge-base/entries/commands/create
// ===========================================================================

describe("POST /api/knowledge-base/entries/commands/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    makeAuthedUser();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ----- Auth -----

  it("should return 401 when userId is missing", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: null,
      orgId: KB_ORG_ID,
    } as never);
    vi.mocked(requireCurrentUser).mockRejectedValue(new InvariantError("Unauthorized"));

    const req = makePostRequest({
      slug: "test-entry",
      title: "Test Entry",
    });
    const res = await POST(req, {
      params: Promise.resolve({
        entity: "KnowledgeBaseEntry",
        command: "create",
      }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Unauthorized");
  });

  it("should return 401 when orgId is missing", async () => {
    vi.mocked(auth).mockResolvedValue({
      userId: KB_USER_ID,
      orgId: null,
    } as never);
    vi.mocked(requireCurrentUser).mockRejectedValue(new InvariantError("Unauthorized"));

    const req = makePostRequest({
      slug: "test-entry",
      title: "Test Entry",
    });
    const res = await POST(req, {
      params: Promise.resolve({
        entity: "KnowledgeBaseEntry",
        command: "create",
      }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Unauthorized");
  });

  it("should return 401 when tenant not found", async () => {
    vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);
    vi.mocked(requireCurrentUser).mockRejectedValue(new InvariantError("Unauthorized"));

    const req = makePostRequest({
      slug: "test-entry",
      title: "Test Entry",
    });
    const res = await POST(req, {
      params: Promise.resolve({
        entity: "KnowledgeBaseEntry",
        command: "create",
      }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Unauthorized");
  });

  // ----- Body validation -----

  it("should return 400 when slug is missing", async () => {
    vi.mocked(createManifestRuntime).mockResolvedValue({
      runCommand: vi.fn().mockResolvedValue({
        success: false,
        error: "Slug and title are required",
      }),
    } as never);

    const req = makePostRequest({ title: "Test Entry" });
    const res = await POST(req, {
      params: Promise.resolve({
        entity: "KnowledgeBaseEntry",
        command: "create",
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Slug and title are required");
  });

  it("should return 400 when title is missing", async () => {
    vi.mocked(createManifestRuntime).mockResolvedValue({
      runCommand: vi.fn().mockResolvedValue({
        success: false,
        error: "Slug and title are required",
      }),
    } as never);

    const req = makePostRequest({ slug: "test-entry" });
    const res = await POST(req, {
      params: Promise.resolve({
        entity: "KnowledgeBaseEntry",
        command: "create",
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Slug and title are required");
  });

  it("should return 400 when both slug and title are missing", async () => {
    vi.mocked(createManifestRuntime).mockResolvedValue({
      runCommand: vi.fn().mockResolvedValue({
        success: false,
        error: "Slug and title are required",
      }),
    } as never);

    const req = makePostRequest({});
    const res = await POST(req, {
      params: Promise.resolve({
        entity: "KnowledgeBaseEntry",
        command: "create",
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Slug and title are required");
  });

  // ----- Duplicate detection -----

  it("should return 400 on duplicate slug (via manifest error)", async () => {
    vi.mocked(createManifestRuntime).mockResolvedValue({
      runCommand: vi.fn().mockResolvedValue({
        success: false,
        error: "Entry with this slug already exists",
      }),
    } as never);

    const req = makePostRequest({
      slug: "onboarding-guide",
      title: "Duplicate",
    });
    const res = await POST(req, {
      params: Promise.resolve({
        entity: "KnowledgeBaseEntry",
        command: "create",
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Entry with this slug already exists");
  });

  it("should check for existing slug with correct tenantId", async () => {
    vi.mocked(createManifestRuntime).mockResolvedValue({
      runCommand: vi.fn().mockResolvedValue({
        success: true,
        result: { id: "new-id", tenantId: KB_TENANT_ID, slug: "new-guide" },
        emittedEvents: [],
      }),
    } as never);

    const req = makePostRequest({
      slug: "new-guide",
      title: "New Guide",
    });
    await POST(req, {
      params: Promise.resolve({
        entity: "KnowledgeBaseEntry",
        command: "create",
      }),
    });

    // Verify runtime was called with correct params
    expect(createManifestRuntime).toHaveBeenCalledTimes(1);
  });

  // ----- Successful creation -----

  it("should create entry and return it with 200", async () => {
    const created = makeKbEntry();
    vi.mocked(createManifestRuntime).mockResolvedValue({
      runCommand: vi.fn().mockResolvedValue({
        success: true,
        result: created,
        emittedEvents: [],
      }),
    } as never);

    const req = makePostRequest({
      slug: "onboarding-guide",
      title: "Onboarding Guide",
      content: "Welcome!",
      category: "hr",
      tags: ["onboarding"],
      status: "published",
    });
    const res = await POST(req, {
      params: Promise.resolve({
        entity: "KnowledgeBaseEntry",
        command: "create",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.result.id).toBe("kb-entry-1");
    expect(body.result.slug).toBe("onboarding-guide");
    expect(body.result.title).toBe("Onboarding Guide");
    expect(body.result.category).toBe("hr");
    expect(body.result.status).toBe("published");
  });

  it("should pass correct params to createManifestRuntime", async () => {
    vi.mocked(createManifestRuntime).mockResolvedValue({
      runCommand: vi.fn().mockResolvedValue({
        success: true,
        result: { id: "new-id" },
        emittedEvents: [],
      }),
    } as never);

    const req = makePostRequest({
      slug: "new-guide",
      title: "New Guide",
    });
    await POST(req, {
      params: Promise.resolve({
        entity: "KnowledgeBaseEntry",
        command: "create",
      }),
    });

    const runtimeCall = vi.mocked(createManifestRuntime).mock.calls[0][0];
    expect(runtimeCall).toEqual({
      user: {
        id: KB_USER_ID,
        tenantId: KB_TENANT_ID,
        role: "admin",
      },
      entityName: "KnowledgeBaseEntry",
    });
  });

  it("should return 400 on validation failure", async () => {
    vi.mocked(createManifestRuntime).mockResolvedValue({
      runCommand: vi.fn().mockResolvedValue({
        success: false,
        error: "Slug and title are required",
      }),
    } as never);

    const req = makePostRequest({});
    const res = await POST(req, {
      params: Promise.resolve({
        entity: "KnowledgeBaseEntry",
        command: "create",
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Slug and title are required");
  });

  it("should return 400 on duplicate slug", async () => {
    vi.mocked(createManifestRuntime).mockResolvedValue({
      runCommand: vi.fn().mockResolvedValue({
        success: false,
        error: "Entry with this slug already exists",
      }),
    } as never);

    const req = makePostRequest({
      slug: "existing",
      title: "Existing Entry",
    });
    const res = await POST(req, {
      params: Promise.resolve({
        entity: "KnowledgeBaseEntry",
        command: "create",
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Entry with this slug already exists");
  });

  it("should return 500 on database error during create", async () => {
    vi.mocked(createManifestRuntime).mockResolvedValue({
      runCommand: vi.fn().mockRejectedValue(new Error("DB crash") as never),
    } as never);

    const req = makePostRequest({
      slug: "fail-entry",
      title: "Fail Entry",
    });
    const res = await POST(req, {
      params: Promise.resolve({
        entity: "KnowledgeBaseEntry",
        command: "create",
      }),
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Internal server error");
  });

  it("should return 400 on generic command failure", async () => {
    vi.mocked(createManifestRuntime).mockResolvedValue({
      runCommand: vi.fn().mockResolvedValue({
        success: false,
        error: "Some validation error",
      }),
    } as never);

    const req = makePostRequest({
      slug: "fail-dup",
      title: "Fail Dup",
    });
    const res = await POST(req, {
      params: Promise.resolve({
        entity: "KnowledgeBaseEntry",
        command: "create",
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Some validation error");
  });
});
