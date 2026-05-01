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
    `http://localhost:3000/api/documents/versions/list?${qs}`,
  );
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
  // POST /api/documents/versions/commands/create
  // =========================================================================

  describe("POST /api/documents/versions/commands/create", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValue({
        orgId: null,
        userId: null,
      } as never);

      const { POST } = await import(
        "@/app/api/documents/versions/commands/create/route"
      );
      const res = await POST(
        makePostRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
          content: { title: "Test" },
        }),
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

      const { POST } = await import(
        "@/app/api/documents/versions/commands/create/route"
      );
      const res = await POST(
        makePostRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
          content: { title: "Test" },
        }),
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Tenant not found");
    });

    it("returns 400 when documentType is missing", async () => {
      mockAuthenticated();

      const { POST } = await import(
        "@/app/api/documents/versions/commands/create/route"
      );
      const res = await POST(
        makePostRequest({
          documentId: TEST_DOC_ID,
          content: { title: "Test" },
        }),
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("documentType");
    });

    it("returns 400 when documentId is missing", async () => {
      mockAuthenticated();

      const { POST } = await import(
        "@/app/api/documents/versions/commands/create/route"
      );
      const res = await POST(
        makePostRequest({
          documentType: "recipe",
          content: { title: "Test" },
        }),
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("documentId");
    });

    it("returns 400 when content is missing", async () => {
      mockAuthenticated();

      const { POST } = await import(
        "@/app/api/documents/versions/commands/create/route"
      );
      const res = await POST(
        makePostRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
        }),
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("content");
    });

    it("creates version with auto-incremented version number (first version)", async () => {
      mockAuthenticated();

      // No existing versions -> findFirst returns null
      mockDocumentVersion.findFirst.mockResolvedValue(null);
      mockDocumentVersion.create.mockResolvedValue(
        createMockVersion({ versionNumber: 1 }),
      );

      const { POST } = await import(
        "@/app/api/documents/versions/commands/create/route"
      );
      const res = await POST(
        makePostRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
          content: { title: "Test" },
        }),
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.version.versionNumber).toBe(1);

      // Verify findFirst was called to determine latest version
      expect(mockDocumentVersion.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: TEST_TENANT_ID,
          documentType: "recipe",
          documentId: TEST_DOC_ID,
        },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      });

      // Verify create was called with versionNumber = 1
      expect(mockDocumentVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ versionNumber: 1 }),
        }),
      );
    });

    it("auto-increments version number when prior versions exist", async () => {
      mockAuthenticated();

      // Existing version at number 3
      mockDocumentVersion.findFirst.mockResolvedValue({
        versionNumber: 3,
      });
      mockDocumentVersion.create.mockResolvedValue(
        createMockVersion({ versionNumber: 4 }),
      );

      const { POST } = await import(
        "@/app/api/documents/versions/commands/create/route"
      );
      const res = await POST(
        makePostRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
          content: { title: "Updated" },
          changeSummary: "Major revision",
        }),
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(mockDocumentVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            versionNumber: 4,
            changeSummary: "Major revision",
          }),
        }),
      );
    });

    it("uses default changeSummary when not provided", async () => {
      mockAuthenticated();

      mockDocumentVersion.findFirst.mockResolvedValue({
        versionNumber: 2,
      });
      mockDocumentVersion.create.mockResolvedValue(
        createMockVersion({ versionNumber: 3 }),
      );

      const { POST } = await import(
        "@/app/api/documents/versions/commands/create/route"
      );
      const res = await POST(
        makePostRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
          content: { title: "Updated" },
        }),
      );

      expect(res.status).toBe(200);
      expect(mockDocumentVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changeSummary: "Version 3",
          }),
        }),
      );
    });

    it("includes createdBy relation in response", async () => {
      mockAuthenticated();

      mockDocumentVersion.findFirst.mockResolvedValue(null);
      mockDocumentVersion.create.mockResolvedValue(createMockVersion());

      const { POST } = await import(
        "@/app/api/documents/versions/commands/create/route"
      );
      const res = await POST(
        makePostRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
          content: { title: "Test" },
        }),
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(mockDocumentVersion.create).toHaveBeenCalledWith(
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
        }),
      );
      expect(data.version.createdBy).toBeDefined();
    });

    it("returns 500 on unexpected database error", async () => {
      mockAuthenticated();

      mockDocumentVersion.findFirst.mockRejectedValue(
        new Error("Connection refused"),
      );

      const { POST } = await import(
        "@/app/api/documents/versions/commands/create/route"
      );
      const res = await POST(
        makePostRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
          content: { title: "Test" },
        }),
      );
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe("Failed to create document version");
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

      const { POST } = await import(
        "@/app/api/documents/versions/commands/restore/route"
      );
      const res = await POST(makePostRequest({ versionId: TEST_VERSION_ID }));
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 400 when versionId is missing", async () => {
      mockAuthenticated();

      const { POST } = await import(
        "@/app/api/documents/versions/commands/restore/route"
      );
      const res = await POST(makePostRequest({}));
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("versionId");
    });

    it("returns 404 when version does not exist", async () => {
      mockAuthenticated();

      mockDocumentVersion.findFirst.mockResolvedValue(null);

      const { POST } = await import(
        "@/app/api/documents/versions/commands/restore/route"
      );
      const res = await POST(
        makePostRequest({ versionId: "nonexistent-id" }),
      );
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe("Version not found");
    });

    it("creates a new version with the old content on restore", async () => {
      mockAuthenticated();

      const oldVersion = createMockVersion({
        id: "ver-old",
        versionNumber: 2,
        content: { title: "Old Title", body: "Old content" },
      });

      // First findFirst: look up the version to restore
      mockDocumentVersion.findFirst
        .mockResolvedValueOnce(oldVersion)
        // Second findFirst: get latest version number for this document
        .mockResolvedValueOnce({ versionNumber: 5 });

      mockDocumentVersion.create.mockResolvedValue(
        createMockVersion({
          id: "ver-new",
          versionNumber: 6,
          content: { title: "Old Title", body: "Old content" },
          changeSummary: "Restored from version 2",
        }),
      );

      const { POST } = await import(
        "@/app/api/documents/versions/commands/restore/route"
      );
      const res = await POST(makePostRequest({ versionId: "ver-old" }));
      const data = await res.json();

      expect(res.status).toBe(200);

      // Verify the version was looked up with tenant scoping
      expect(mockDocumentVersion.findFirst).toHaveBeenNthCalledWith(1, {
        where: {
          id: "ver-old",
          tenantId: TEST_TENANT_ID,
        },
      });

      // Verify the new version uses old content and incremented number
      expect(mockDocumentVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            versionNumber: 6,
            content: { title: "Old Title", body: "Old content" },
            changeSummary: "Restored from version 2",
            documentType: "recipe",
            documentId: TEST_DOC_ID,
            createdById: TEST_USER_ID,
          }),
        }),
      );

      expect(data.version.versionNumber).toBe(6);
    });

    it("handles restore when no prior versions exist for numbering", async () => {
      mockAuthenticated();

      const oldVersion = createMockVersion({
        id: "ver-old",
        versionNumber: 1,
        content: { title: "Original" },
      });

      mockDocumentVersion.findFirst
        .mockResolvedValueOnce(oldVersion)
        .mockResolvedValueOnce(null); // no latest version found

      mockDocumentVersion.create.mockResolvedValue(
        createMockVersion({
          versionNumber: 1,
          content: { title: "Original" },
          changeSummary: "Restored from version 1",
        }),
      );

      const { POST } = await import(
        "@/app/api/documents/versions/commands/restore/route"
      );
      const res = await POST(makePostRequest({ versionId: "ver-old" }));

      expect(res.status).toBe(200);
      expect(mockDocumentVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            versionNumber: 1,
          }),
        }),
      );
    });

    it("returns 500 on unexpected database error during restore", async () => {
      mockAuthenticated();

      mockDocumentVersion.findFirst.mockRejectedValue(
        new Error("Database timeout"),
      );

      const { POST } = await import(
        "@/app/api/documents/versions/commands/restore/route"
      );
      const res = await POST(
        makePostRequest({ versionId: TEST_VERSION_ID }),
      );
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe("Failed to restore document version");
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

      const { GET } = await import(
        "@/app/api/documents/versions/list/route"
      );
      const res = await GET(
        makeGetRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
        }),
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

      const { GET } = await import(
        "@/app/api/documents/versions/list/route"
      );
      const res = await GET(
        makeGetRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
        }),
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Tenant not found");
    });

    it("returns 400 when documentType is missing", async () => {
      mockAuthenticated();

      const { GET } = await import(
        "@/app/api/documents/versions/list/route"
      );
      const res = await GET(
        makeGetRequest({ documentId: TEST_DOC_ID }),
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("documentType");
    });

    it("returns 400 when documentId is missing", async () => {
      mockAuthenticated();

      const { GET } = await import(
        "@/app/api/documents/versions/list/route"
      );
      const res = await GET(
        makeGetRequest({ documentType: "recipe" }),
      );
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

      const { GET } = await import(
        "@/app/api/documents/versions/list/route"
      );
      const res = await GET(
        makeGetRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
        }),
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
        }),
      );
    });

    it("applies default pagination when no limit/offset provided", async () => {
      mockAuthenticated();

      mockDocumentVersion.findMany.mockResolvedValue([]);

      const { GET } = await import(
        "@/app/api/documents/versions/list/route"
      );
      const res = await GET(
        makeGetRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
        }),
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.limit).toBe(50); // DEFAULT_LIMIT
      expect(data.offset).toBe(0);

      expect(mockDocumentVersion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        }),
      );
    });

    it("applies custom pagination with limit and offset", async () => {
      mockAuthenticated();

      mockDocumentVersion.findMany.mockResolvedValue([]);

      const { GET } = await import(
        "@/app/api/documents/versions/list/route"
      );
      const res = await GET(
        makeGetRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
          limit: "10",
          offset: "20",
        }),
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.limit).toBe(10);
      expect(data.offset).toBe(20);

      expect(mockDocumentVersion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it("includes createdBy relation in list results", async () => {
      mockAuthenticated();

      mockDocumentVersion.findMany.mockResolvedValue([createMockVersion()]);

      const { GET } = await import(
        "@/app/api/documents/versions/list/route"
      );
      const res = await GET(
        makeGetRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
        }),
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
        }),
      );
    });

    it("returns empty array when no versions exist", async () => {
      mockAuthenticated();

      mockDocumentVersion.findMany.mockResolvedValue([]);

      const { GET } = await import(
        "@/app/api/documents/versions/list/route"
      );
      const res = await GET(
        makeGetRequest({
          documentType: "menu",
          documentId: "menu-9999",
        }),
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.versions).toEqual([]);
    });

    it("returns 500 on unexpected database error", async () => {
      mockAuthenticated();

      mockDocumentVersion.findMany.mockRejectedValue(
        new Error("Connection pool exhausted"),
      );

      const { GET } = await import(
        "@/app/api/documents/versions/list/route"
      );
      const res = await GET(
        makeGetRequest({
          documentType: "recipe",
          documentId: TEST_DOC_ID,
        }),
      );
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error).toBe("Failed to list document versions");
    });
  });
});
