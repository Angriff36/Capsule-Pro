/**
 * Operations API Test Suite
 *
 * Tests five untested API domains:
 * - GET /api/search — global search across events, clients, contacts, venues,
 *   inventory, knowledge base
 * - POST /api/documents/versions/commands/create — create document version
 * - POST /api/documents/versions/commands/restore — restore a prior version
 * - GET  /api/documents/versions/list — list versions with pagination
 * - POST /api/workflow/{create,update,activate,deactivate} — manifest commands
 * - POST /api/workforceoptimization/{create,start,complete,fail} — manifest commands
 * - POST /api/kitchentask/{create,cancel,claim,complete,start,release,reassign,
 *        add-tag,remove-tag,update-complexity,update-priority} — manifest commands
 *
 * Covers: 401 auth, 400 validation, success, 500 error, tenant isolation.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireTenantId: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

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

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
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

vi.mock("@/lib/database", async () => {
  const mod =
    await vi.importActual<typeof import("@repo/database")>("@repo/database");
  return mod;
});

// --- Import mocked modules ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");

// --- Route imports ---

// Documents
import { POST as docVersionCreate } from "@/app/api/manifest/[entity]/commands/[command]/route";
import { POST as docVersionRestore } from "@/app/api/manifest/[entity]/commands/[command]/route";
import { GET as docVersionList } from "@/app/api/documents/versions/list/route";
import { POST as ktAddTag } from "@/app/api/kitchentask/add-tag/route";
import { POST as ktCancel } from "@/app/api/kitchentask/cancel/route";
import { POST as ktClaim } from "@/app/api/kitchentask/claim/route";
import { POST as ktComplete } from "@/app/api/kitchentask/complete/route";
// Kitchen Tasks (manifest)
import { POST as ktCreate } from "@/app/api/kitchentask/create/route";
import { POST as ktReassign } from "@/app/api/kitchentask/reassign/route";
import { POST as ktRelease } from "@/app/api/kitchentask/release/route";
import { POST as ktRemoveTag } from "@/app/api/kitchentask/remove-tag/route";
import { POST as ktStart } from "@/app/api/kitchentask/start/route";
import { POST as ktUpdateComplexity } from "@/app/api/kitchentask/update-complexity/route";
import { POST as ktUpdatePriority } from "@/app/api/kitchentask/update-priority/route";
// Search
import { GET as searchGet } from "@/app/api/search/route";
import { POST as workflowActivate } from "@/app/api/workflow/activate/route";
// Workflow (manifest)
import { POST as workflowCreate } from "@/app/api/workflow/create/route";
import { POST as workflowDeactivate } from "@/app/api/workflow/deactivate/route";
import { POST as workflowUpdate } from "@/app/api/workflow/update/route";
import { POST as wfOptComplete } from "@/app/api/workforceoptimization/complete/route";
// Workforce Optimization (manifest)
import { POST as wfOptCreate } from "@/app/api/workforceoptimization/create/route";
import { POST as wfOptFail } from "@/app/api/workforceoptimization/fail/route";
import { POST as wfOptStart } from "@/app/api/workforceoptimization/start/route";

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000060";
const OTHER_TENANT_ID = "00000000-0000-0000-0000-000000000099";
const TEST_USER_ID = "user_operations_test";
const TEST_ORG_ID = "org_operations_test";

// --- Helpers ---

function createMockRequest(
  url: string,
  options: RequestInit = {}
): NextRequest {
  if (options.body && !options.headers) {
    options.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(
    new URL(url, "http://localhost:3000"),
    options as ConstructorParameters<typeof NextRequest>[1]
  );
}

function mockAuth() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as Awaited<ReturnType<typeof auth>>);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
}

function mockUnauthed() {
  vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);
}

function mockNoTenant() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as Awaited<ReturnType<typeof auth>>);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);
}

function mockSuccessfulRunCommand(
  result: unknown = { id: "test-id" },
  emittedEvents: unknown[] = []
) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: true,
      result,
      emittedEvents,
    }),
  } as never);
}

function mockFailedRunCommand(error: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      error,
    }),
  } as never);
}

function mockPolicyDenialRunCommand(policyName: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      policyDenial: { policyName },
    }),
  } as never);
}

function mockGuardFailureRunCommand(index: number, formatted: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      guardFailure: { index, formatted },
    }),
  } as never);
}

async function parseJson(response: Response) {
  return response.json();
}

// ============================================================
// SEARCH ROUTES
// ============================================================

describe("Search API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockUnauthed();
    const req = createMockRequest("http://localhost:3000/api/search?q=test");
    const res = await searchGet(req);
    expect(res.status).toBe(401);
    const body = await parseJson(res);
    expect(body.success).toBe(false);
  });

  it("returns empty groups when query is empty", async () => {
    mockAuth();
    const req = createMockRequest("http://localhost:3000/api/search");
    const res = await searchGet(req);
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.success).toBe(true);
    expect(body.groups).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("returns empty groups when q param is whitespace only", async () => {
    mockAuth();
    const req = createMockRequest("http://localhost:3000/api/search?q=%20%20");
    const res = await searchGet(req);
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.success).toBe(true);
    expect(body.groups).toEqual([]);
  });

  it("searches across all entity types by default", async () => {
    mockAuth();

    // Mock all 6 entity searches to return empty arrays
    const emptyResult = [[], 0] as [unknown[], number];
    vi.mocked(database.event.findMany).mockResolvedValue([]);
    vi.mocked(database.event.count).mockResolvedValue(0);
    vi.mocked(database.client.findMany).mockResolvedValue([]);
    vi.mocked(database.client.count).mockResolvedValue(0);
    vi.mocked(database.clientContact.findMany).mockResolvedValue([]);
    vi.mocked(database.clientContact.count).mockResolvedValue(0);
    vi.mocked(database.venue.findMany).mockResolvedValue([]);
    vi.mocked(database.venue.count).mockResolvedValue(0);
    vi.mocked(database.inventoryItem.findMany).mockResolvedValue([]);
    vi.mocked(database.inventoryItem.count).mockResolvedValue(0);
    vi.mocked(database.knowledgeBaseEntry.findMany).mockResolvedValue([]);
    vi.mocked(database.knowledgeBaseEntry.count).mockResolvedValue(0);
    vi.mocked(database.kitchenTask.findMany).mockResolvedValue([]);
    vi.mocked(database.kitchenTask.count).mockResolvedValue(0);
    vi.mocked(database.recipe.findMany).mockResolvedValue([]);
    vi.mocked(database.recipe.count).mockResolvedValue(0);
    vi.mocked(database.dish.findMany).mockResolvedValue([]);
    vi.mocked(database.dish.count).mockResolvedValue(0);
    vi.mocked(database.equipment.findMany).mockResolvedValue([]);
    vi.mocked(database.equipment.count).mockResolvedValue(0);
    vi.mocked(database.ingredient.findMany).mockResolvedValue([]);
    vi.mocked(database.ingredient.count).mockResolvedValue(0);
    vi.mocked(database.menu.findMany).mockResolvedValue([]);
    vi.mocked(database.menu.count).mockResolvedValue(0);
    vi.mocked(database.lead.findMany).mockResolvedValue([]);
    vi.mocked(database.lead.count).mockResolvedValue(0);
    vi.mocked(database.proposal.findMany).mockResolvedValue([]);
    vi.mocked(database.proposal.count).mockResolvedValue(0);
    vi.mocked(database.invoice.findMany).mockResolvedValue([]);
    vi.mocked(database.invoice.count).mockResolvedValue(0);

    const req = createMockRequest(
      "http://localhost:3000/api/search?q=acme&page=1&limit=10"
    );
    const res = await searchGet(req);
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.success).toBe(true);
    expect(body.groups).toHaveProperty("events");
    expect(body.groups).toHaveProperty("clients");
    expect(body.groups).toHaveProperty("contacts");
    expect(body.groups).toHaveProperty("venues");
    expect(body.groups).toHaveProperty("inventory");
    expect(body.groups).toHaveProperty("knowledge");
    expect(body.groups).toHaveProperty("tasks");
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(10);
  });

  it("filters by type parameter to search only one entity", async () => {
    mockAuth();

    vi.mocked(database.event.findMany).mockResolvedValue([
      {
        id: "evt-1",
        tenantId: TEST_TENANT_ID,
        title: "ACME Gala",
        eventNumber: "E-001",
        eventDate: new Date("2026-06-01"),
        venueName: "Main Hall",
        status: "confirmed",
      },
    ] as never);
    vi.mocked(database.event.count).mockResolvedValue(1);

    const req = createMockRequest(
      "http://localhost:3000/api/search?q=acme&type=events"
    );
    const res = await searchGet(req);
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.success).toBe(true);
    expect(body.groups).toHaveProperty("events");
    expect(body.groups.events.total).toBe(1);
    // Only events should be searched when type=events
    expect(body.groups).not.toHaveProperty("clients");
    expect(body.groups).not.toHaveProperty("contacts");
  });

  it("passes tenant ID to filter for tenant isolation", async () => {
    mockAuth();

    vi.mocked(database.event.findMany).mockResolvedValue([]);
    vi.mocked(database.event.count).mockResolvedValue(0);

    const req = createMockRequest(
      "http://localhost:3000/api/search?q=test&type=events"
    );
    await searchGet(req);

    // Verify the findMany call uses tenantId in the where clause
    const findManyCall = vi.mocked(database.event.findMany).mock
      .calls[0][0] as {
      where: { tenantId: string; deletedAt: unknown };
    };
    expect(findManyCall.where.tenantId).toBe(TEST_TENANT_ID);
  });

  it("clamps limit to max 50", async () => {
    mockAuth();

    vi.mocked(database.event.findMany).mockResolvedValue([]);
    vi.mocked(database.event.count).mockResolvedValue(0);

    const req = createMockRequest(
      "http://localhost:3000/api/search?q=test&type=events&limit=999"
    );
    await searchGet(req);

    const findManyCall = vi.mocked(database.event.findMany).mock
      .calls[0][0] as {
      take: number;
    };
    expect(findManyCall.take).toBe(50);
  });

  it("returns 500 when database throws an error", async () => {
    mockAuth();
    vi.mocked(database.event.findMany).mockRejectedValue(
      new Error("DB connection lost")
    );

    const req = createMockRequest(
      "http://localhost:3000/api/search?q=test&type=events"
    );
    const res = await searchGet(req);
    expect(res.status).toBe(500);
    const body = await parseJson(res);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Search failed");
  });
});

// ============================================================
// DOCUMENT VERSIONS
// ============================================================

describe("Document Versions - Create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockUnauthed();
    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/commands/create",
      {
        method: "POST",
        body: JSON.stringify({
          documentType: "contract",
          documentId: "doc-1",
          content: "test content",
        }),
      }
    );
    const res = await docVersionCreate(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when tenant not found", async () => {
    mockNoTenant();
    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/commands/create",
      {
        method: "POST",
        body: JSON.stringify({
          documentType: "contract",
          documentId: "doc-1",
          content: "test",
        }),
      }
    );
    const res = await docVersionCreate(req);
    expect(res.status).toBe(400);
    const body = await parseJson(res);
    expect(body.error).toBe("Tenant not found");
  });

  it("returns 400 when required fields are missing", async () => {
    mockAuth();
    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/commands/create",
      {
        method: "POST",
        body: JSON.stringify({ documentType: "contract" }),
      }
    );
    const res = await docVersionCreate(req);
    expect(res.status).toBe(400);
    const body = await parseJson(res);
    expect(body.error).toContain("required");
  });

  it("creates a new document version successfully", async () => {
    mockAuth();

    const versionData = {
      id: "ver-1",
      tenantId: TEST_TENANT_ID,
      documentType: "contract",
      documentId: "doc-1",
      versionNumber: 1,
      content: "Initial content",
      changeSummary: "Version 1",
      createdById: TEST_USER_ID,
      createdBy: {
        id: TEST_USER_ID,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
      },
    };

    vi.mocked(database.documentVersion.findFirst).mockResolvedValue(null);
    vi.mocked(database.documentVersion.create).mockResolvedValue(
      versionData as never
    );

    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/commands/create",
      {
        method: "POST",
        body: JSON.stringify({
          documentType: "contract",
          documentId: "doc-1",
          content: "Initial content",
        }),
      }
    );
    const res = await docVersionCreate(req);
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.version.versionNumber).toBe(1);
    expect(body.version.tenantId).toBe(TEST_TENANT_ID);

    // Verify create was called with tenantId
    const createCall = vi.mocked(database.documentVersion.create).mock
      .calls[0][0] as { data: { tenantId: string; versionNumber: number } };
    expect(createCall.data.tenantId).toBe(TEST_TENANT_ID);
    expect(createCall.data.versionNumber).toBe(1);
  });

  it("increments version number from latest", async () => {
    mockAuth();

    vi.mocked(database.documentVersion.findFirst).mockResolvedValue({
      versionNumber: 3,
    } as never);
    vi.mocked(database.documentVersion.create).mockResolvedValue({
      id: "ver-4",
      versionNumber: 4,
    } as never);

    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/commands/create",
      {
        method: "POST",
        body: JSON.stringify({
          documentType: "contract",
          documentId: "doc-1",
          content: "Updated",
          changeSummary: "Fourth version",
        }),
      }
    );
    await docVersionCreate(req);

    const createCall = vi.mocked(database.documentVersion.create).mock
      .calls[0][0] as { data: { versionNumber: number } };
    expect(createCall.data.versionNumber).toBe(4);
  });

  it("returns 500 on database error", async () => {
    mockAuth();
    vi.mocked(database.documentVersion.findFirst).mockRejectedValue(
      new Error("DB error")
    );

    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/commands/create",
      {
        method: "POST",
        body: JSON.stringify({
          documentType: "contract",
          documentId: "doc-1",
          content: "test",
        }),
      }
    );
    const res = await docVersionCreate(req);
    expect(res.status).toBe(500);
    const body = await parseJson(res);
    expect(body.error).toContain("Failed");
  });

  it("uses tenant ID for isolation in create", async () => {
    mockAuth();

    vi.mocked(database.documentVersion.findFirst).mockResolvedValue(null);
    vi.mocked(database.documentVersion.create).mockResolvedValue({} as never);

    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/commands/create",
      {
        method: "POST",
        body: JSON.stringify({
          documentType: "contract",
          documentId: "doc-1",
          content: "test",
        }),
      }
    );
    await docVersionCreate(req);

    // findFirst should filter by tenantId
    const findFirstCall = vi.mocked(database.documentVersion.findFirst).mock
      .calls[0][0] as { where: { tenantId: string } };
    expect(findFirstCall.where.tenantId).toBe(TEST_TENANT_ID);

    // create should include tenantId
    const createCall = vi.mocked(database.documentVersion.create).mock
      .calls[0][0] as { data: { tenantId: string } };
    expect(createCall.data.tenantId).toBe(TEST_TENANT_ID);
  });
});

describe("Document Versions - Restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockUnauthed();
    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/commands/restore",
      {
        method: "POST",
        body: JSON.stringify({ versionId: "ver-1" }),
      }
    );
    const res = await docVersionRestore(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when versionId is missing", async () => {
    mockAuth();
    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/commands/restore",
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );
    const res = await docVersionRestore(req);
    expect(res.status).toBe(400);
    const body = await parseJson(res);
    expect(body.error).toContain("versionId");
  });

  it("returns 404 when version not found", async () => {
    mockAuth();
    vi.mocked(database.documentVersion.findFirst).mockResolvedValue(null);

    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/commands/restore",
      {
        method: "POST",
        body: JSON.stringify({ versionId: "nonexistent" }),
      }
    );
    const res = await docVersionRestore(req);
    expect(res.status).toBe(404);
    const body = await parseJson(res);
    expect(body.error).toContain("not found");
  });

  it("restores a previous version successfully", async () => {
    mockAuth();

    const originalVersion = {
      id: "ver-2",
      tenantId: TEST_TENANT_ID,
      documentType: "contract",
      documentId: "doc-1",
      versionNumber: 2,
      content: "Original content v2",
    };

    const restoredVersion = {
      id: "ver-4",
      tenantId: TEST_TENANT_ID,
      documentType: "contract",
      documentId: "doc-1",
      versionNumber: 4,
      content: "Original content v2",
      changeSummary: "Restored from version 2",
      createdById: TEST_USER_ID,
      createdBy: {
        id: TEST_USER_ID,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
      },
    };

    // First findFirst call gets the version to restore
    // Second findFirst call gets the latest version number
    vi.mocked(database.documentVersion.findFirst)
      .mockResolvedValueOnce(originalVersion as never)
      .mockResolvedValueOnce({ versionNumber: 3 } as never);
    vi.mocked(database.documentVersion.create).mockResolvedValue(
      restoredVersion as never
    );

    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/commands/restore",
      {
        method: "POST",
        body: JSON.stringify({ versionId: "ver-2" }),
      }
    );
    const res = await docVersionRestore(req);
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.version.versionNumber).toBe(4);
    expect(body.version.content).toBe("Original content v2");

    // Verify create was called with restore data
    const createCall = vi.mocked(database.documentVersion.create).mock
      .calls[0][0] as { data: { tenantId: string; content: string } };
    expect(createCall.data.tenantId).toBe(TEST_TENANT_ID);
    expect(createCall.data.content).toBe("Original content v2");
  });

  it("returns 500 on database error", async () => {
    mockAuth();
    vi.mocked(database.documentVersion.findFirst).mockRejectedValue(
      new Error("DB error")
    );

    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/commands/restore",
      {
        method: "POST",
        body: JSON.stringify({ versionId: "ver-1" }),
      }
    );
    const res = await docVersionRestore(req);
    expect(res.status).toBe(500);
  });

  it("scopes version lookup to tenant for isolation", async () => {
    mockAuth();
    vi.mocked(database.documentVersion.findFirst).mockResolvedValue(null);

    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/commands/restore",
      {
        method: "POST",
        body: JSON.stringify({ versionId: "ver-1" }),
      }
    );
    await docVersionRestore(req);

    const findFirstCall = vi.mocked(database.documentVersion.findFirst).mock
      .calls[0][0] as { where: { id: string; tenantId: string } };
    expect(findFirstCall.where.tenantId).toBe(TEST_TENANT_ID);
  });
});

describe("Document Versions - List", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockUnauthed();
    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/list?documentType=contract&documentId=doc-1"
    );
    const res = await docVersionList(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when documentType or documentId missing", async () => {
    mockAuth();
    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/list?documentType=contract"
    );
    const res = await docVersionList(req);
    expect(res.status).toBe(400);
    const body = await parseJson(res);
    expect(body.error).toContain("required");
  });

  it("lists versions with pagination", async () => {
    mockAuth();

    const versions = [
      {
        id: "ver-3",
        versionNumber: 3,
        content: "v3",
        createdBy: {
          id: TEST_USER_ID,
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
        },
      },
      {
        id: "ver-2",
        versionNumber: 2,
        content: "v2",
        createdBy: {
          id: TEST_USER_ID,
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
        },
      },
    ];

    vi.mocked(database.documentVersion.findMany).mockResolvedValue(
      versions as never
    );

    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/list?documentType=contract&documentId=doc-1&limit=10&offset=0"
    );
    const res = await docVersionList(req);
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.versions).toHaveLength(2);
    expect(body.limit).toBe(10);
    expect(body.offset).toBe(0);
  });

  it("scopes list query to tenant for isolation", async () => {
    mockAuth();
    vi.mocked(database.documentVersion.findMany).mockResolvedValue([]);

    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/list?documentType=contract&documentId=doc-1"
    );
    await docVersionList(req);

    const findManyCall = vi.mocked(database.documentVersion.findMany).mock
      .calls[0][0] as { where: { tenantId: string } };
    expect(findManyCall.where.tenantId).toBe(TEST_TENANT_ID);
  });

  it("returns 500 on database error", async () => {
    mockAuth();
    vi.mocked(database.documentVersion.findMany).mockRejectedValue(
      new Error("DB error")
    );

    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/list?documentType=contract&documentId=doc-1"
    );
    const res = await docVersionList(req);
    expect(res.status).toBe(500);
  });
});

// ============================================================
// WORKFLOW COMMANDS (manifest)
// ============================================================

describe("Workflow Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const workflowCommands = [
    {
      name: "create" as const,
      handler: workflowCreate,
      command: "create",
      url: "/api/workflow/create",
    },
    {
      name: "update" as const,
      handler: workflowUpdate,
      command: "update",
      url: "/api/workflow/update",
    },
    {
      name: "activate" as const,
      handler: workflowActivate,
      command: "activate",
      url: "/api/workflow/activate",
    },
    {
      name: "deactivate" as const,
      handler: workflowDeactivate,
      command: "deactivate",
      url: "/api/workflow/deactivate",
    },
  ];

  for (const cmd of workflowCommands) {
    describe(`Workflow.${cmd.name}`, () => {
      it("returns 401 when unauthenticated", async () => {
        mockUnauthed();
        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(401);
        const body = await parseJson(res);
        expect(body.success).toBe(false);
      });

      it("returns 400 when tenant not found", async () => {
        mockNoTenant();
        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(400);
        const body = await parseJson(res);
        expect(body.success).toBe(false);
        expect(body.message).toContain("Tenant not found");
      });

      it("executes command successfully", async () => {
        mockAuth();
        const commandResult = { id: "wf-1", status: "active" };
        mockSuccessfulRunCommand(commandResult, [
          { type: "WorkflowCreated", payload: { id: "wf-1" } },
        ]);

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({ name: "Test Workflow" }),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(200);
        const body = await parseJson(res);
        expect(body.success).toBe(true);
        expect(body.result).toEqual(commandResult);
        expect(body.events).toHaveLength(1);
      });

      it("returns 403 on policy denial", async () => {
        mockAuth();
        mockPolicyDenialRunCommand("AdminOnly");

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(403);
        const body = await parseJson(res);
        expect(body.message).toContain("AdminOnly");
      });

      it("returns 422 on guard failure", async () => {
        mockAuth();
        mockGuardFailureRunCommand(1, "Name is required");

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(422);
        const body = await parseJson(res);
        expect(body.message).toContain("Guard 1 failed");
      });

      it("returns 400 on command failure", async () => {
        mockAuth();
        mockFailedRunCommand("Invalid state transition");

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(400);
        const body = await parseJson(res);
        expect(body.message).toBe("Invalid state transition");
      });

      it("returns 500 on unexpected error", async () => {
        mockAuth();
        vi.mocked(createManifestRuntime).mockRejectedValue(
          new Error("DB connection lost")
        );

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(500);
      });

      it("passes tenant ID to runtime for isolation", async () => {
        mockAuth();
        mockSuccessfulRunCommand({ id: "wf-1" });

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({ name: "test" }),
        });
        await cmd.handler(req);

        const runtimeCall = vi.mocked(createManifestRuntime).mock
          .calls[0][0] as {
          user: { id: string; tenantId: string };
        };
        expect(runtimeCall.user.tenantId).toBe(TEST_TENANT_ID);
        expect(runtimeCall.user.id).toBe(TEST_USER_ID);
      });
    });
  }
});

// ============================================================
// WORKFORCE OPTIMIZATION COMMANDS (manifest)
// ============================================================

describe("Workforce Optimization Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const wfOptCommands = [
    {
      name: "create" as const,
      handler: wfOptCreate,
      url: "/api/workforceoptimization/create",
    },
    {
      name: "start" as const,
      handler: wfOptStart,
      url: "/api/workforceoptimization/start",
    },
    {
      name: "complete" as const,
      handler: wfOptComplete,
      url: "/api/workforceoptimization/complete",
    },
    {
      name: "fail" as const,
      handler: wfOptFail,
      url: "/api/workforceoptimization/fail",
    },
  ];

  for (const cmd of wfOptCommands) {
    describe(`WorkforceOptimization.${cmd.name}`, () => {
      it("returns 401 when unauthenticated", async () => {
        mockUnauthed();
        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(401);
      });

      it("returns 400 when tenant not found", async () => {
        mockNoTenant();
        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(400);
      });

      it("executes command successfully", async () => {
        mockAuth();
        const commandResult = {
          id: "wfo-1",
          status: cmd.name === "create" ? "pending" : cmd.name,
        };
        mockSuccessfulRunCommand(commandResult);

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({ name: "Optimization run" }),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(200);
        const body = await parseJson(res);
        expect(body.success).toBe(true);
        expect(body.result).toEqual(commandResult);
      });

      it("returns 403 on policy denial", async () => {
        mockAuth();
        mockPolicyDenialRunCommand("ManagerOnly");

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(403);
      });

      it("returns 422 on guard failure", async () => {
        mockAuth();
        mockGuardFailureRunCommand(0, "instanceId required");

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(422);
      });

      it("returns 400 on command failure", async () => {
        mockAuth();
        mockFailedRunCommand("Already completed");

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(400);
      });

      it("returns 500 on unexpected error", async () => {
        mockAuth();
        vi.mocked(createManifestRuntime).mockRejectedValue(
          new Error("Runtime exploded")
        );

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(500);
      });

      it("passes tenant ID to runtime for isolation", async () => {
        mockAuth();
        mockSuccessfulRunCommand({ id: "wfo-1" });

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        await cmd.handler(req);

        const runtimeCall = vi.mocked(createManifestRuntime).mock
          .calls[0][0] as {
          user: { tenantId: string };
        };
        expect(runtimeCall.user.tenantId).toBe(TEST_TENANT_ID);
      });
    });
  }
});

// ============================================================
// KITCHEN TASK COMMANDS (manifest)
// ============================================================

describe("Kitchen Task Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const ktCommands = [
    {
      name: "create" as const,
      handler: ktCreate,
      url: "/api/kitchentask/create",
    },
    {
      name: "cancel" as const,
      handler: ktCancel,
      url: "/api/kitchentask/cancel",
    },
    {
      name: "claim" as const,
      handler: ktClaim,
      url: "/api/kitchentask/claim",
    },
    {
      name: "complete" as const,
      handler: ktComplete,
      url: "/api/kitchentask/complete",
    },
    {
      name: "start" as const,
      handler: ktStart,
      url: "/api/kitchentask/start",
    },
    {
      name: "release" as const,
      handler: ktRelease,
      url: "/api/kitchentask/release",
    },
    {
      name: "reassign" as const,
      handler: ktReassign,
      url: "/api/kitchentask/reassign",
    },
    {
      name: "add-tag" as const,
      handler: ktAddTag,
      url: "/api/kitchentask/add-tag",
    },
    {
      name: "remove-tag" as const,
      handler: ktRemoveTag,
      url: "/api/kitchentask/remove-tag",
    },
    {
      name: "update-complexity" as const,
      handler: ktUpdateComplexity,
      url: "/api/kitchentask/update-complexity",
    },
    {
      name: "update-priority" as const,
      handler: ktUpdatePriority,
      url: "/api/kitchentask/update-priority",
    },
  ];

  for (const cmd of ktCommands) {
    describe(`KitchenTask.${cmd.name}`, () => {
      it("returns 401 when unauthenticated", async () => {
        mockUnauthed();
        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(401);
      });

      it("returns 400 when tenant not found", async () => {
        mockNoTenant();
        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(400);
      });

      it("executes command successfully", async () => {
        mockAuth();
        const commandResult = { id: "kt-1", status: "created" };
        mockSuccessfulRunCommand(commandResult, []);

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({
            instanceId: "kt-1",
            title: "Prep vegetables",
          }),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(200);
        const body = await parseJson(res);
        expect(body.success).toBe(true);
        expect(body.result).toEqual(commandResult);
      });

      it("returns 403 on policy denial", async () => {
        mockAuth();
        mockPolicyDenialRunCommand("KitchenStaffOnly");

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(403);
        const body = await parseJson(res);
        expect(body.message).toContain("KitchenStaffOnly");
      });

      it("returns 422 on guard failure", async () => {
        mockAuth();
        mockGuardFailureRunCommand(2, "Task must be in pending state");

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(422);
        const body = await parseJson(res);
        expect(body.message).toContain("Guard 2 failed");
      });

      it("returns 400 on command failure", async () => {
        mockAuth();
        mockFailedRunCommand("Task not found");

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(400);
        const body = await parseJson(res);
        expect(body.message).toBe("Task not found");
      });

      it("returns 500 on unexpected error", async () => {
        mockAuth();
        vi.mocked(createManifestRuntime).mockRejectedValue(
          new Error("Unexpected")
        );

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(500);
      });

      it("passes tenant ID to runtime for isolation", async () => {
        mockAuth();
        mockSuccessfulRunCommand({ id: "kt-1" });

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        await cmd.handler(req);

        const runtimeCall = vi.mocked(createManifestRuntime).mock
          .calls[0][0] as {
          user: { id: string; tenantId: string };
        };
        expect(runtimeCall.user.tenantId).toBe(TEST_TENANT_ID);
        expect(runtimeCall.user.id).toBe(TEST_USER_ID);
      });
    });
  }
});

// ============================================================
// CROSS-DOMAIN TENANT ISOLATION
// ============================================================

describe("Tenant Isolation Across Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("search never queries without tenant filter", async () => {
    mockAuth();
    vi.mocked(database.event.findMany).mockResolvedValue([]);
    vi.mocked(database.event.count).mockResolvedValue(0);

    const req = createMockRequest(
      "http://localhost:3000/api/search?q=test&type=events"
    );
    await searchGet(req);

    const call = vi.mocked(database.event.findMany).mock.calls[0][0] as {
      where: { tenantId: string };
    };
    expect(call.where.tenantId).toBe(TEST_TENANT_ID);
    expect(call.where.tenantId).not.toBe(OTHER_TENANT_ID);
  });

  it("document version create includes tenantId in data", async () => {
    mockAuth();
    vi.mocked(database.documentVersion.findFirst).mockResolvedValue(null);
    vi.mocked(database.documentVersion.create).mockResolvedValue({} as never);

    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/commands/create",
      {
        method: "POST",
        body: JSON.stringify({
          documentType: "contract",
          documentId: "doc-1",
          content: "test",
        }),
      }
    );
    await docVersionCreate(req);

    const createCall = vi.mocked(database.documentVersion.create).mock
      .calls[0][0] as { data: { tenantId: string } };
    expect(createCall.data.tenantId).toBe(TEST_TENANT_ID);
    expect(createCall.data.tenantId).not.toBe(OTHER_TENANT_ID);
  });

  it("manifest runtime receives tenant ID for workflow commands", async () => {
    mockAuth();
    mockSuccessfulRunCommand({ id: "wf-1" });

    const req = createMockRequest("http://localhost:3000/api/workflow/create", {
      method: "POST",
      body: JSON.stringify({ name: "test" }),
    });
    await workflowCreate(req);

    const runtimeCall = vi.mocked(createManifestRuntime).mock.calls[0][0] as {
      user: { tenantId: string };
    };
    expect(runtimeCall.user.tenantId).toBe(TEST_TENANT_ID);
  });

  it("manifest runtime receives tenant ID for kitchen task commands", async () => {
    mockAuth();
    mockSuccessfulRunCommand({ id: "kt-1" });

    const req = createMockRequest(
      "http://localhost:3000/api/kitchentask/create",
      {
        method: "POST",
        body: JSON.stringify({ title: "prep" }),
      }
    );
    await ktCreate(req);

    const runtimeCall = vi.mocked(createManifestRuntime).mock.calls[0][0] as {
      user: { tenantId: string };
    };
    expect(runtimeCall.user.tenantId).toBe(TEST_TENANT_ID);
  });

  it("manifest runtime receives tenant ID for workforce optimization commands", async () => {
    mockAuth();
    mockSuccessfulRunCommand({ id: "wfo-1" });

    const req = createMockRequest(
      "http://localhost:3000/api/workforceoptimization/create",
      {
        method: "POST",
        body: JSON.stringify({ name: "opt-run" }),
      }
    );
    await wfOptCreate(req);

    const runtimeCall = vi.mocked(createManifestRuntime).mock.calls[0][0] as {
      user: { tenantId: string };
    };
    expect(runtimeCall.user.tenantId).toBe(TEST_TENANT_ID);
  });
});
