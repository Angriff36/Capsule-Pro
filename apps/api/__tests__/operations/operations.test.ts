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

import { database as databaseFromLib } from "@/lib/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@repo/database", () => ({
  database: {
    client: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    clientContact: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    dish: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    documentVersion: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    equipment: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    event: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    ingredient: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    inventoryItem: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    invoice: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    kitchenTask: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    knowledgeBaseEntry: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    lead: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    menu: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    proposal: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    recipe: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    venue: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn((fn) => fn({})),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}));
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireTenantId: vi.fn(),
  requireCurrentUser: vi.fn(),
  resolveCurrentUser: vi.fn(),
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
    manifestErrorResponse: (
      message:
        | string
        | ({ error: string; diagnostics?: unknown[] } & Record<string, unknown>),
      status: number
    ) => {
      const body =
        typeof message === "string"
          ? { success: false, message }
          : {
              success: false,
              diagnostics: message.diagnostics ?? [],
              ...message,
              error: message.error,
            };
      return NextResponse.json(body, { status });
    },
  };
});

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));
vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "InvariantError";
    }
  },
}));
vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@repo/notifications", () => ({}));
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));
vi.mock("@/lib/manifest/issue-log", () => ({
  logManifestIssue: vi.fn(),
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

vi.mock("@/lib/database", () => ({
  database: {
    client: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    clientContact: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    dish: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    documentVersion: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    equipment: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    event: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    ingredient: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    inventoryItem: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    invoice: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    kitchenTask: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    knowledgeBaseEntry: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    lead: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    menu: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    proposal: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    recipe: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    venue: { count: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn((fn) => fn({})),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}));

// --- Import mocked modules ---

const { auth } = await import("@repo/auth/server");
const tenantModule = await import("@/app/lib/tenant");
const { getTenantIdForOrg } = tenantModule;
const { runManifestCommand } = await import("@/lib/manifest/execute-command");

// Reference to the already-loaded tenant module for use in helpers
const _tenantModule = tenantModule;

// --- Route imports ---

import { GET as docVersionList } from "@/app/api/documents/versions/list/route";
// Dispatcher
import { POST as manifestDispatch } from "@/app/api/manifest/[entity]/commands/[command]/route";

const dispatch =
  (entity: string, command: string) => (req: NextRequest, _ctx?: unknown) =>
    manifestDispatch(req, { params: Promise.resolve({ entity, command }) });

// Kitchen Tasks (manifest)
const ktAddTag = dispatch("KitchenTask", "addTag");
const ktCancel = dispatch("KitchenTask", "cancel");
const ktClaim = dispatch("KitchenTask", "claim");
const ktComplete = dispatch("KitchenTask", "complete");
const ktCreate = dispatch("KitchenTask", "create");
const ktReassign = dispatch("KitchenTask", "reassign");
const ktRelease = dispatch("KitchenTask", "release");
const ktRemoveTag = dispatch("KitchenTask", "removeTag");
const ktStart = dispatch("KitchenTask", "start");
const ktUpdateComplexity = dispatch("KitchenTask", "updateComplexity");
const ktUpdatePriority = dispatch("KitchenTask", "updatePriority");
// Documents
const docVersionCreate = dispatch("DocumentVersion", "create");
const docVersionRestore = dispatch("DocumentVersion", "restore");

// Search
import { GET as searchGet } from "@/app/api/search/route";

// Workflow (manifest)
const workflowActivate = dispatch("Workflow", "activate");
const workflowCreate = dispatch("Workflow", "create");
const workflowDeactivate = dispatch("Workflow", "deactivate");
const workflowUpdate = dispatch("Workflow", "update");
// Workforce Optimization (manifest)
const wfOptComplete = dispatch("WorkforceOptimization", "complete");
const wfOptCreate = dispatch("WorkforceOptimization", "create");
const wfOptFail = dispatch("WorkforceOptimization", "fail");
const wfOptStart = dispatch("WorkforceOptimization", "start");

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

/** Mock requireCurrentUser for authenticated dispatcher calls */
function mockRequireCurrentUser() {
  const { requireCurrentUser } = _tenantModule as typeof import("@/app/lib/tenant");
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    email: "test@test.com",
    firstName: "Test",
    lastName: "User",
  });
}

/** Mock requireCurrentUser to throw InvariantError for unauthenticated (synchronous) */
function mockRequireCurrentUserUnauthed() {
  const { requireCurrentUser } = _tenantModule as typeof import("@/app/lib/tenant");
  const error = new Error("Unauthorized") as Error & { name: "InvariantError" };
  error.name = "InvariantError";
  vi.mocked(requireCurrentUser).mockRejectedValue(error);
}

/** Program runManifestCommand for success */
function mockRunCommandSuccess(result: unknown = { id: "test-id" }, events: unknown[] = []) {
  vi.mocked(runManifestCommand).mockResolvedValue(
    new Response(JSON.stringify({ success: true, result, events }), { status: 200 })
  );
}

/** Program runManifestCommand for policy denial */
function mockRunCommandPolicyDenial(policyName: string) {
  vi.mocked(runManifestCommand).mockResolvedValue(
    new Response(JSON.stringify({ success: false, error: "Access denied", kind: "policy_denied", policyDenial: { policyName } }), { status: 403 })
  );
}

/** Program runManifestCommand for guard failure */
function mockRunCommandGuardFailure(index: number, formatted: string) {
  vi.mocked(runManifestCommand).mockResolvedValue(
    new Response(JSON.stringify({ success: false, error: `Guard ${index} failed: ${formatted}`, kind: "guard_failed", guardFailure: { index, formatted } }), { status: 422 })
  );
}

/** Program runManifestCommand for command failure */
function mockRunCommandFailure(error: string) {
  vi.mocked(runManifestCommand).mockResolvedValue(
    new Response(JSON.stringify({ success: false, error, kind: "command_failed" }), { status: 400 })
  );
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
    expect(body.message).toBe("Unauthorized");
  });

  it("returns empty groups when query is empty", async () => {
    mockAuth();
    const req = createMockRequest("http://localhost:3000/api/search");
    const res = await searchGet(req);
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.groups).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("returns empty groups when q param is whitespace only", async () => {
    mockAuth();
    const req = createMockRequest("http://localhost:3000/api/search?q=%20%20");
    const res = await searchGet(req);
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.groups).toEqual([]);
  });

  it("searches across all entity types by default", async () => {
    mockAuth();

    vi.mocked(databaseFromLib.event.findMany).mockResolvedValue([]);
    vi.mocked(databaseFromLib.event.count).mockResolvedValue(0);
    vi.mocked(databaseFromLib.client.findMany).mockResolvedValue([]);
    vi.mocked(databaseFromLib.client.count).mockResolvedValue(0);
    vi.mocked(databaseFromLib.clientContact.findMany).mockResolvedValue([]);
    vi.mocked(databaseFromLib.clientContact.count).mockResolvedValue(0);
    vi.mocked(databaseFromLib.venue.findMany).mockResolvedValue([]);
    vi.mocked(databaseFromLib.venue.count).mockResolvedValue(0);
    vi.mocked(databaseFromLib.inventoryItem.findMany).mockResolvedValue([]);
    vi.mocked(databaseFromLib.inventoryItem.count).mockResolvedValue(0);
    vi.mocked(databaseFromLib.knowledgeBaseEntry.findMany).mockResolvedValue([]);
    vi.mocked(databaseFromLib.knowledgeBaseEntry.count).mockResolvedValue(0);
    vi.mocked(databaseFromLib.kitchenTask.findMany).mockResolvedValue([]);
    vi.mocked(databaseFromLib.kitchenTask.count).mockResolvedValue(0);
    vi.mocked(databaseFromLib.recipe.findMany).mockResolvedValue([]);
    vi.mocked(databaseFromLib.recipe.count).mockResolvedValue(0);
    vi.mocked(databaseFromLib.dish.findMany).mockResolvedValue([]);
    vi.mocked(databaseFromLib.dish.count).mockResolvedValue(0);
    vi.mocked(databaseFromLib.equipment.findMany).mockResolvedValue([]);
    vi.mocked(databaseFromLib.equipment.count).mockResolvedValue(0);
    vi.mocked(databaseFromLib.ingredient.findMany).mockResolvedValue([]);
    vi.mocked(databaseFromLib.ingredient.count).mockResolvedValue(0);
    vi.mocked(databaseFromLib.menu.findMany).mockResolvedValue([]);
    vi.mocked(databaseFromLib.menu.count).mockResolvedValue(0);
    vi.mocked(databaseFromLib.lead.findMany).mockResolvedValue([]);
    vi.mocked(databaseFromLib.lead.count).mockResolvedValue(0);
    vi.mocked(databaseFromLib.proposal.findMany).mockResolvedValue([]);
    vi.mocked(databaseFromLib.proposal.count).mockResolvedValue(0);
    vi.mocked(databaseFromLib.invoice.findMany).mockResolvedValue([]);
    vi.mocked(databaseFromLib.invoice.count).mockResolvedValue(0);

    const req = createMockRequest(
      "http://localhost:3000/api/search?q=acme&page=1&limit=10"
    );
    const res = await searchGet(req);
    expect(res.status).toBe(200);
    const body = await parseJson(res);
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

    vi.mocked(databaseFromLib.event.findMany).mockResolvedValue([
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
    vi.mocked(databaseFromLib.event.count).mockResolvedValue(1);

    const req = createMockRequest(
      "http://localhost:3000/api/search?q=acme&type=events"
    );
    const res = await searchGet(req);
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.groups).toHaveProperty("events");
    expect(body.groups.events.total).toBe(1);
    expect(body.groups).not.toHaveProperty("clients");
    expect(body.groups).not.toHaveProperty("contacts");
  });

  it("passes tenant ID to filter for tenant isolation", async () => {
    mockAuth();

    vi.mocked(databaseFromLib.event.findMany).mockResolvedValue([]);
    vi.mocked(databaseFromLib.event.count).mockResolvedValue(0);

    const req = createMockRequest(
      "http://localhost:3000/api/search?q=test&type=events"
    );
    await searchGet(req);

    const findManyCall = vi.mocked(databaseFromLib.event.findMany).mock
      .calls[0][0] as {
      where: { tenantId: string; deletedAt: unknown };
    };
    expect(findManyCall.where.tenantId).toBe(TEST_TENANT_ID);
  });

  it("clamps limit to max 50", async () => {
    mockAuth();

    vi.mocked(databaseFromLib.event.findMany).mockResolvedValue([]);
    vi.mocked(databaseFromLib.event.count).mockResolvedValue(0);

    const req = createMockRequest(
      "http://localhost:3000/api/search?q=test&type=events&limit=999"
    );
    await searchGet(req);

    const findManyCall = vi.mocked(databaseFromLib.event.findMany).mock
      .calls[0][0] as {
      take: number;
    };
    expect(findManyCall.take).toBe(50);
  });

  it("returns 500 when database throws an error", async () => {
    mockAuth();
    vi.mocked(databaseFromLib.event.findMany).mockRejectedValue(
      new Error("DB connection lost")
    );

    const req = createMockRequest(
      "http://localhost:3000/api/search?q=test&type=events"
    );
    const res = await searchGet(req);
    expect(res.status).toBe(500);
    const body = await parseJson(res);
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
    mockRequireCurrentUserUnauthed();
    mockRunCommandSuccess();

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
    const res = await docVersionCreate(req, {
      params: Promise.resolve({ entity: "DocumentVersion", command: "create" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 when tenant not found (InvariantError)", async () => {
    mockRequireCurrentUserUnauthed();
    mockRunCommandSuccess();

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
    const res = await docVersionCreate(req, {
      params: Promise.resolve({ entity: "DocumentVersion", command: "create" }),
    });
    // Dispatcher catches InvariantError → 401
    expect(res.status).toBe(401);
  });

  it("returns 400 when required fields are missing", async () => {
    mockRequireCurrentUser();
    mockRunCommandFailure("required fields missing");

    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/commands/create",
      {
        method: "POST",
        body: JSON.stringify({ documentType: "contract" }),
      }
    );
    const res = await docVersionCreate(req, {
      params: Promise.resolve({ entity: "DocumentVersion", command: "create" }),
    });
    expect(res.status).toBe(400);
  });

  it("creates a new document version successfully", async () => {
    mockRequireCurrentUser();

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

    mockRunCommandSuccess(versionData);

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
    const res = await docVersionCreate(req, {
      params: Promise.resolve({ entity: "DocumentVersion", command: "create" }),
    });
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.success).toBe(true);
    expect(body.result).toEqual(versionData);
  });

  it("returns 500 on database error", async () => {
    mockRequireCurrentUser();
    vi.mocked(runManifestCommand).mockRejectedValue(new Error("DB error"));

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
    const res = await docVersionCreate(req, {
      params: Promise.resolve({ entity: "DocumentVersion", command: "create" }),
    });
    expect(res.status).toBe(500);
  });
});

describe("Document Versions - Restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockRequireCurrentUserUnauthed();
    mockRunCommandSuccess();

    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/commands/restore",
      {
        method: "POST",
        body: JSON.stringify({ versionId: "ver-1" }),
      }
    );
    const res = await docVersionRestore(req, {
      params: Promise.resolve({
        entity: "DocumentVersion",
        command: "restore",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when versionId is missing", async () => {
    mockRequireCurrentUser();
    mockRunCommandFailure("versionId required");

    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/commands/restore",
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );
    const res = await docVersionRestore(req, {
      params: Promise.resolve({
        entity: "DocumentVersion",
        command: "restore",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("restores a previous version successfully", async () => {
    mockRequireCurrentUser();

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

    mockRunCommandSuccess(restoredVersion);

    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/commands/restore",
      {
        method: "POST",
        body: JSON.stringify({ versionId: "ver-2" }),
      }
    );
    const res = await docVersionRestore(req, {
      params: Promise.resolve({
        entity: "DocumentVersion",
        command: "restore",
      }),
    });
    expect(res.status).toBe(200);
    const body = await parseJson(res);
    expect(body.result.versionNumber).toBe(4);
    expect(body.result.content).toBe("Original content v2");
  });

  it("returns 500 on database error", async () => {
    mockRequireCurrentUser();
    vi.mocked(runManifestCommand).mockRejectedValue(new Error("DB error"));

    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/commands/restore",
      {
        method: "POST",
        body: JSON.stringify({ versionId: "ver-1" }),
      }
    );
    const res = await docVersionRestore(req, {
      params: Promise.resolve({
        entity: "DocumentVersion",
        command: "restore",
      }),
    });
    expect(res.status).toBe(500);
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

    vi.mocked(databaseFromLib.documentVersion.findMany).mockResolvedValue(
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
    vi.mocked(databaseFromLib.documentVersion.findMany).mockResolvedValue([]);

    const req = createMockRequest(
      "http://localhost:3000/api/documents/versions/list?documentType=contract&documentId=doc-1"
    );
    await docVersionList(req);

    const findManyCall = vi.mocked(databaseFromLib.documentVersion.findMany).mock
      .calls[0][0] as { where: { tenantId: string } };
    expect(findManyCall.where.tenantId).toBe(TEST_TENANT_ID);
  });

  it("returns 500 on database error", async () => {
    mockAuth();
    vi.mocked(databaseFromLib.documentVersion.findMany).mockRejectedValue(
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
        mockRequireCurrentUserUnauthed();
        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(401);
      });

      it("returns 401 when tenant not found (InvariantError)", async () => {
        mockRequireCurrentUserUnauthed();
        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(401);
      });

      it("executes command successfully", async () => {
        mockRequireCurrentUser();
        const commandResult = { id: "wf-1", status: "active" };
        mockRunCommandSuccess(commandResult, [
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
        mockRequireCurrentUser();
        mockRunCommandPolicyDenial("AdminOnly");

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(403);
        const body = await parseJson(res);
        expect(body.policyDenial.policyName).toContain("AdminOnly");
      });

      it("returns 422 on guard failure", async () => {
        mockRequireCurrentUser();
        mockRunCommandGuardFailure(1, "Name is required");

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(422);
        const body = await parseJson(res);
        expect(body.error).toContain("Guard 1 failed");
      });

      it("returns 400 on command failure", async () => {
        mockRequireCurrentUser();
        mockRunCommandFailure("Invalid state transition");

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(400);
        const body = await parseJson(res);
        expect(body.error).toBe("Invalid state transition");
      });

      it("returns 500 on unexpected error", async () => {
        mockRequireCurrentUser();
        vi.mocked(runManifestCommand).mockRejectedValue(
          new Error("DB connection lost")
        );

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(500);
      });

      it("passes tenant ID to runManifestCommand for isolation", async () => {
        mockRequireCurrentUser();
        mockRunCommandSuccess({ id: "wf-1" });

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({ name: "test" }),
        });
        await cmd.handler(req);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            user: expect.objectContaining({
              tenantId: TEST_TENANT_ID,
              id: TEST_USER_ID,
            }),
          })
        );
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
        mockRequireCurrentUserUnauthed();
        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(401);
      });

      it("returns 401 when tenant not found (InvariantError)", async () => {
        mockRequireCurrentUserUnauthed();
        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(401);
      });

      it("executes command successfully", async () => {
        mockRequireCurrentUser();
        const commandResult = {
          id: "wfo-1",
          status: cmd.name === "create" ? "pending" : cmd.name,
        };
        mockRunCommandSuccess(commandResult);

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
        mockRequireCurrentUser();
        mockRunCommandPolicyDenial("ManagerOnly");

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(403);
      });

      it("returns 422 on guard failure", async () => {
        mockRequireCurrentUser();
        mockRunCommandGuardFailure(0, "instanceId required");

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(422);
      });

      it("returns 400 on command failure", async () => {
        mockRequireCurrentUser();
        mockRunCommandFailure("Already completed");

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(400);
      });

      it("returns 500 on unexpected error", async () => {
        mockRequireCurrentUser();
        vi.mocked(runManifestCommand).mockRejectedValue(
          new Error("Runtime exploded")
        );

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(500);
      });

      it("passes tenant ID to runManifestCommand for isolation", async () => {
        mockRequireCurrentUser();
        mockRunCommandSuccess({ id: "wfo-1" });

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        await cmd.handler(req);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            user: expect.objectContaining({
              tenantId: TEST_TENANT_ID,
            }),
          })
        );
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
        mockRequireCurrentUserUnauthed();
        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(401);
      });

      it("returns 401 when tenant not found (InvariantError)", async () => {
        mockRequireCurrentUserUnauthed();
        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(401);
      });

      it("executes command successfully", async () => {
        mockRequireCurrentUser();
        const commandResult = { id: "kt-1", status: "created" };
        mockRunCommandSuccess(commandResult, []);

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
        mockRequireCurrentUser();
        mockRunCommandPolicyDenial("KitchenStaffOnly");

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(403);
        const body = await parseJson(res);
        expect(body.policyDenial.policyName).toContain("KitchenStaffOnly");
      });

      it("returns 422 on guard failure", async () => {
        mockRequireCurrentUser();
        mockRunCommandGuardFailure(2, "Task must be in pending state");

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(422);
        const body = await parseJson(res);
        expect(body.error).toContain("Guard 2 failed");
      });

      it("returns 400 on command failure", async () => {
        mockRequireCurrentUser();
        mockRunCommandFailure("Task not found");

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(400);
        const body = await parseJson(res);
        expect(body.error).toBe("Task not found");
      });

      it("returns 500 on unexpected error", async () => {
        mockRequireCurrentUser();
        vi.mocked(runManifestCommand).mockRejectedValue(
          new Error("Unexpected")
        );

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        const res = await cmd.handler(req);
        expect(res.status).toBe(500);
      });

      it("passes tenant ID to runManifestCommand for isolation", async () => {
        mockRequireCurrentUser();
        mockRunCommandSuccess({ id: "kt-1" });

        const req = createMockRequest(`http://localhost:3000${cmd.url}`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        await cmd.handler(req);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            user: expect.objectContaining({
              id: TEST_USER_ID,
              tenantId: TEST_TENANT_ID,
            }),
          })
        );
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
    vi.mocked(databaseFromLib.event.findMany).mockResolvedValue([]);
    vi.mocked(databaseFromLib.event.count).mockResolvedValue(0);

    const req = createMockRequest(
      "http://localhost:3000/api/search?q=test&type=events"
    );
    await searchGet(req);

    const call = vi.mocked(databaseFromLib.event.findMany).mock.calls[0][0] as {
      where: { tenantId: string };
    };
    expect(call.where.tenantId).toBe(TEST_TENANT_ID);
    expect(call.where.tenantId).not.toBe(OTHER_TENANT_ID);
  });

  it("runManifestCommand receives tenant ID for workflow commands", async () => {
    mockRequireCurrentUser();
    mockRunCommandSuccess({ id: "wf-1" });

    const req = createMockRequest("http://localhost:3000/api/workflow/create", {
      method: "POST",
      body: JSON.stringify({ name: "test" }),
    });
    await workflowCreate(req);

    expect(runManifestCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          tenantId: TEST_TENANT_ID,
        }),
      })
    );
  });

  it("runManifestCommand receives tenant ID for kitchen task commands", async () => {
    mockRequireCurrentUser();
    mockRunCommandSuccess({ id: "kt-1" });

    const req = createMockRequest(
      "http://localhost:3000/api/kitchentask/create",
      {
        method: "POST",
        body: JSON.stringify({ title: "prep" }),
      }
    );
    await ktCreate(req);

    expect(runManifestCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          tenantId: TEST_TENANT_ID,
        }),
      })
    );
  });

  it("runManifestCommand receives tenant ID for workforce optimization commands", async () => {
    mockRequireCurrentUser();
    mockRunCommandSuccess({ id: "wfo-1" });

    const req = createMockRequest(
      "http://localhost:3000/api/workforceoptimization/create",
      {
        method: "POST",
        body: JSON.stringify({ name: "opt-run" }),
      }
    );
    await wfOptCreate(req);

    expect(runManifestCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          tenantId: TEST_TENANT_ID,
        }),
      })
    );
  });
});
