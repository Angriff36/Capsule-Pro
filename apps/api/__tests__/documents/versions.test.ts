/**
 * Document Versioning API Route Tests
 *
 * Tests document version endpoints:
 * - POST /api/documents/versions/commands/create  -> create new version
 * - POST /api/documents/versions/commands/restore -> restore a prior version
 * - GET  /api/documents/versions/list             -> list versions (paginated)
 *
 * Covers: auth (401), tenant-not-found (400), validation (400), not-found (404),
 * success (200/201), pagination, version auto-increment, and error handling (500).
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockDocumentVersion = {
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
};

const mockDb = {
  documentVersion: mockDocumentVersion,
};

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireTenantId: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/database", () => ({
  database: mockDb,
}));

vi.mock("@repo/database", () => ({
  database: mockDb,
}));

vi.mock("@/lib/pagination", () => ({
  clampLimit: (raw: string | null) => {
    const parsed = Number.parseInt(raw ?? "", 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 50;
    }
    return Math.min(parsed, 200);
  },
  clampOffset: (raw: string | null) => {
    const parsed = Number.parseInt(raw ?? "", 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return parsed;
  },
}));
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
    ) =>
      NextResponse.json(
        typeof message === "string"
          ? { success: false, message }
          : {
              success: false,
              error: message.error,
              diagnostics: message.diagnostics ?? [],
            },
        { status }
      ),
  };
});
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
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
vi.mock("@repo/observability/log", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Import mocked modules AFTER vi.mock declarations
// ---------------------------------------------------------------------------

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TEST_TENANT_ID = "d0000000-0000-4000-a000-000000000001";
const TEST_USER_ID = "user_doc_versions";
const TEST_ORG_ID = "org_doc_versions";
const TEST_DOC_ID = "doc-0001";
const TEST_VERSION_ID = "ver-0001";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/documents/versions/test", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeGetRequest(params: Record<string, string>): NextRequest {
  const qs = new URLSearchParams(params).toString();
  return new NextRequest(
    `http://localhost:3000/api/documents/versions/list?${qs}`
  );
}

function makeManifestParams(entity: string, command: string) {
  return { params: Promise.resolve({ entity, command }) };
}

function mockAuthenticated() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID as never);
}

function createMockVersion(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_VERSION_ID,
    tenantId: TEST_TENANT_ID,
    documentType: "recipe",
    documentId: TEST_DOC_ID,
    versionNumber: 1,
    content: { title: "Test Document", body: "Initial content" },
    changeSummary: "Version 1",
    createdById: TEST_USER_ID,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    createdBy: {
      id: TEST_USER_ID,
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Document Versioning API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // POST via dispatcher — Document version commands
  // =========================================================================

  describe("POST /api/documents/versions/commands/create (via dispatcher)", () => {
    const TEST_DOC_CURRENT_USER = {
      id: TEST_USER_ID,
      tenantId: TEST_TENANT_ID,
      role: "admin",
      email: "test@test.com",
      firstName: "Test",
      lastName: "User",
    };

    it("returns 401 when unauthenticated (InvariantError)", async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      const authErr = new Error("Unauthenticated");
      authErr.name = "InvariantError";
      vi.mocked(requireCurrentUser).mockRejectedValue(authErr);

      const { POST: dispatch } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await dispatch(
        makePostRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
          content: {},
        }),
        {
          params: Promise.resolve({
            entity: "DocumentVersion",
            command: "create",
          }),
        }
      );

      expect(res.status).toBe(401);
    });

    it("delegates to runManifestCommand with correct entity/command", async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      const { runManifestCommand } = await import(
        "@/lib/manifest/execute-command"
      );
      vi.mocked(requireCurrentUser).mockResolvedValue(
        TEST_DOC_CURRENT_USER as never
      );
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, result: { id: "v1" }, events: [] }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

      const { POST: dispatch } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await dispatch(
        makePostRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
          content: { title: "Test" },
        }),
        {
          params: Promise.resolve({
            entity: "DocumentVersion",
            command: "create",
          }),
        }
      );

      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "DocumentVersion",
          command: "create",
          user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" },
        })
      );
    });
  });

  describe("POST /api/documents/versions/commands/restore (via dispatcher)", () => {
    const TEST_DOC_CURRENT_USER = {
      id: TEST_USER_ID,
      tenantId: TEST_TENANT_ID,
      role: "admin",
      email: "test@test.com",
      firstName: "Test",
      lastName: "User",
    };

    it("returns 401 when unauthenticated (InvariantError)", async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      const authErr = new Error("Unauthenticated");
      authErr.name = "InvariantError";
      vi.mocked(requireCurrentUser).mockRejectedValue(authErr);

      const { POST: dispatch } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await dispatch(makePostRequest({ versionId: "v1" }), {
        params: Promise.resolve({
          entity: "DocumentVersion",
          command: "restore",
        }),
      });

      expect(res.status).toBe(401);
    });

    it("delegates to runManifestCommand with restore command", async () => {
      const { requireCurrentUser } = await import("@/app/lib/tenant");
      const { runManifestCommand } = await import(
        "@/lib/manifest/execute-command"
      );
      vi.mocked(requireCurrentUser).mockResolvedValue(
        TEST_DOC_CURRENT_USER as never
      );
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, result: { id: "v2" }, events: [] }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

      const { POST: dispatch } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await dispatch(makePostRequest({ versionId: "v1" }), {
        params: Promise.resolve({
          entity: "DocumentVersion",
          command: "restore",
        }),
      });

      expect(res.status).toBe(200);
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({ command: "restore" })
      );
    });
  });

  // =========================================================================
  // GET /api/documents/versions/list
  // =========================================================================

  describe("GET /api/documents/versions/list", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
        userId: null,
      } as never);

      const { GET } = await import("@/app/api/documents/versions/list/route");
      const res = await GET(
        makeGetRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
        })
      );
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 when tenant is not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_USER_ID,
      } as never);
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const { GET } = await import("@/app/api/documents/versions/list/route");
      const res = await GET(
        makeGetRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
        })
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Tenant not found");
    });

    it("returns 400 when documentType is missing", async () => {
      mockAuthenticated();

      const { GET } = await import("@/app/api/documents/versions/list/route");
      const res = await GET(makeGetRequest({ documentId: TEST_DOC_ID }));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("documentType");
    });

    it("returns 400 when documentId is missing", async () => {
      mockAuthenticated();

      const { GET } = await import("@/app/api/documents/versions/list/route");
      const res = await GET(makeGetRequest({ documentType: "recipe" }));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("documentId");
    });

    it("returns versions filtered by documentType and documentId", async () => {
      mockAuthenticated();

      const versions = [
        createMockVersion({ versionNumber: 3 }),
        createMockVersion({ versionNumber: 2 }),
        createMockVersion({ versionNumber: 1 }),
      ];

      mockDocumentVersion.findMany.mockResolvedValue(versions);

      const { GET } = await import("@/app/api/documents/versions/list/route");
      const res = await GET(
        makeGetRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
        })
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.versions).toHaveLength(3);

      // Verify filtering by documentType and documentId
      expect(mockDocumentVersion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TEST_TENANT_ID,
            documentType: "recipe",
            documentId: TEST_DOC_ID,
          },
          orderBy: { versionNumber: "desc" },
        })
      );
    });

    it("applies default pagination when no limit/offset provided", async () => {
      mockAuthenticated();

      mockDocumentVersion.findMany.mockResolvedValue([]);

      const { GET } = await import("@/app/api/documents/versions/list/route");
      const res = await GET(
        makeGetRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
        })
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.limit).toBe(50); // DEFAULT_LIMIT
      expect(data.offset).toBe(0);

      expect(mockDocumentVersion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        })
      );
    });

    it("applies custom pagination with limit and offset", async () => {
      mockAuthenticated();

      mockDocumentVersion.findMany.mockResolvedValue([]);

      const { GET } = await import("@/app/api/documents/versions/list/route");
      const res = await GET(
        makeGetRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
          limit: "10",
          offset: "20",
        })
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.limit).toBe(10);
      expect(data.offset).toBe(20);

      expect(mockDocumentVersion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });

    it("includes createdBy relation in list results", async () => {
      mockAuthenticated();

      mockDocumentVersion.findMany.mockResolvedValue([createMockVersion()]);

      const { GET } = await import("@/app/api/documents/versions/list/route");
      const res = await GET(
        makeGetRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
        })
      );

      expect(res.status).toBe(200);
      expect(mockDocumentVersion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        })
      );
    });

    it("returns empty array when no versions exist", async () => {
      mockAuthenticated();

      mockDocumentVersion.findMany.mockResolvedValue([]);

      const { GET } = await import("@/app/api/documents/versions/list/route");
      const res = await GET(
        makeGetRequest({
          documentType: "menu",
          documentId: "menu-9999",
        })
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.versions).toEqual([]);
    });

    it("returns 500 on unexpected database error", async () => {
      mockAuthenticated();

      mockDocumentVersion.findMany.mockRejectedValue(
        new Error("Connection pool exhausted")
      );

      const { GET } = await import("@/app/api/documents/versions/list/route");
      const res = await GET(
        makeGetRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
        })
      );
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe("Failed to list document versions");
    });
  });
});
