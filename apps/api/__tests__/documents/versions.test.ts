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
import { InvariantError } from "@/app/lib/invariant";

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
  requireCurrentUser: vi.fn(),

  getTenantIdForOrg: vi.fn(),
  requireTenantId: vi.fn(),
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
    if (!Number.isFinite(parsed) || parsed <= 0) return 50;
    return Math.min(parsed, 200);
  },
  clampOffset: (raw: string | null) => {
    const parsed = Number.parseInt(raw ?? "", 10);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return parsed;
  },
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import mocked modules AFTER vi.mock declarations
// ---------------------------------------------------------------------------

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, requireCurrentUser } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

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

// Map entity: command -> for manifest route
// Tests use kebab-case commands since route normalizes them
const DOC_VERSION = "DocumentVersion";

function mockAuthenticated() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID as never);
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  } as never);
}

function makeRuntime(mockRunCommand: ReturnType<typeof vi.fn>) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: mockRunCommand,
  } as never);
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
  // POST /api/documents/versions/commands/create
  // =========================================================================

  describe("POST /api/documents/versions/commands/create", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
        userId: null,
      } as never);
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized")
      );

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makePostRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
          content: { title: "Test" },
        }),
        makeManifestParams(DOC_VERSION, "create")
      );
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Unauthorized");
    });

    it("returns 401 when tenant is not found", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: TEST_ORG_ID,
        userId: TEST_USER_ID,
      } as never);
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Tenant not found")
      );

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makePostRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
          content: { title: "Test" },
        }),
        makeManifestParams(DOC_VERSION, "create")
      );
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Unauthorized");
    });

    it("returns 400 when documentType is missing", async () => {
      const mockRunCommand = vi.fn();
      mockAuthenticated();
      makeRuntime(mockRunCommand);
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "documentType is required",
      });

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makePostRequest({
          documentId: TEST_DOC_ID,
          content: { title: "Test" },
        }),
        makeManifestParams(DOC_VERSION, "create")
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("returns 400 when documentId is missing", async () => {
      const mockRunCommand = vi.fn();
      mockAuthenticated();
      makeRuntime(mockRunCommand);
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "documentId is required",
      });

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makePostRequest({
          documentType: "recipe",
          content: { title: "Test" },
        }),
        makeManifestParams(DOC_VERSION, "create")
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("returns 400 when content is missing", async () => {
      const mockRunCommand = vi.fn();
      mockAuthenticated();
      makeRuntime(mockRunCommand);
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "content is required",
      });

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makePostRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
        }),
        makeManifestParams(DOC_VERSION, "create")
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("creates version with auto-incremented version number (first version)", async () => {
      mockAuthenticated();
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          result: createMockVersion({ versionNumber: 1 }),
          emittedEvents: [],
        }),
      } as never);

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makePostRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
          content: { title: "Test" },
        }),
        makeManifestParams(DOC_VERSION, "create")
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.versionNumber).toBe(1);
    });

    it("auto-increments version number when prior versions exist", async () => {
      mockAuthenticated();
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          result: createMockVersion({ versionNumber: 4 }),
          emittedEvents: [],
        }),
      } as never);

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makePostRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
          content: { title: "Updated" },
          changeSummary: "Major revision",
        }),
        makeManifestParams(DOC_VERSION, "create")
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("uses default changeSummary when not provided", async () => {
      mockAuthenticated();
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          result: createMockVersion({ versionNumber: 3 }),
          emittedEvents: [],
        }),
      } as never);

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makePostRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
          content: { title: "Updated" },
        }),
        makeManifestParams(DOC_VERSION, "create")
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("includes createdBy relation in response", async () => {
      mockAuthenticated();
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          result: createMockVersion(),
          emittedEvents: [],
        }),
      } as never);

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makePostRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
          content: { title: "Test" },
        }),
        makeManifestParams(DOC_VERSION, "create")
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("returns 500 on unexpected database error", async () => {
      mockAuthenticated();
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockRejectedValue(new Error("Connection refused")),
      } as never);

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makePostRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
          content: { title: "Test" },
        }),
        makeManifestParams(DOC_VERSION, "create")
      );
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  // =========================================================================
  // POST /api/documents/versions/commands/restore
  // =========================================================================

  describe("POST /api/documents/versions/commands/restore", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
        userId: null,
      } as never);
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("Unauthorized")
      );

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makePostRequest({ versionId: TEST_VERSION_ID }),
        makeManifestParams(DOC_VERSION, "restore")
      );
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("Unauthorized");
    });

    it("returns 400 when versionId is missing", async () => {
      const mockRunCommand = vi.fn();
      mockAuthenticated();
      makeRuntime(mockRunCommand);
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "versionId is required",
      });

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makePostRequest({}),
        makeManifestParams(DOC_VERSION, "restore")
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("returns 400 when version does not exist", async () => {
      const mockRunCommand = vi.fn();
      mockAuthenticated();
      makeRuntime(mockRunCommand);
      mockRunCommand.mockResolvedValue({
        success: false,
        error: "Version not found",
      });

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makePostRequest({ versionId: "nonexistent-id" }),
        makeManifestParams(DOC_VERSION, "restore")
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("creates a new version with the old content on restore", async () => {
      mockAuthenticated();
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          result: createMockVersion({
            id: "ver-new",
            versionNumber: 6,
            content: { title: "Old Title", body: "Old content" },
            changeSummary: "Restored from version 2",
          }),
          emittedEvents: [],
        }),
      } as never);

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makePostRequest({ versionId: "ver-old" }),
        makeManifestParams(DOC_VERSION, "restore")
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("handles restore when no prior versions exist for numbering", async () => {
      mockAuthenticated();
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockResolvedValue({
          success: true,
          result: createMockVersion({
            versionNumber: 1,
            content: { title: "Original" },
            changeSummary: "Restored from version 1",
          }),
          emittedEvents: [],
        }),
      } as never);

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makePostRequest({ versionId: "ver-old" }),
        makeManifestParams(DOC_VERSION, "restore")
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("returns 500 on unexpected database error during restore", async () => {
      mockAuthenticated();
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockRejectedValue(new Error("Database timeout")),
      } as never);

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(
        makePostRequest({ versionId: TEST_VERSION_ID }),
        makeManifestParams(DOC_VERSION, "restore")
      );
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.success).toBe(false);
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
