/**
 * Prep Lists API Test Suite
 *
 * Tests prep list endpoints:
 * - GET    /api/kitchen/prep-lists           (list with filters + pagination)
 * - GET    /api/kitchen/prep-lists/[id]      (detail, station grouping)
 * - PATCH  /api/kitchen/prep-lists/[id]      (delegates to PrepList.update via executeManifestCommand)
 * - DELETE /api/kitchen/prep-lists/[id]      (delegates to PrepList.cancel via executeManifestCommand)
 * - POST   /api/kitchen/prep-lists           (delegates to PrepList.create via executeManifestCommand)
 *
 * And the 10 command routes under /commands/* (each direct manifest runtime):
 *   activate, cancel, create, create-from-seed, deactivate, finalize,
 *   mark-completed, reopen, update, update-batch-multiplier
 *
 * Each command route is exercised against the menus.test.ts pattern:
 *   401 unauth, 400 tenant-missing, 200 success, 403 policy denial,
 *   422 guard failure, 400 generic failure, 500 internal error.
 *
 * @vitest-environment node
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/notifications", () => ({
  triggerPrepListPublishedSms: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/app/lib/webhook-dispatch", () => ({
  dispatchWebhooks: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

vi.mock("@/lib/manifest-command-handler", () => ({
  executeManifestCommand: vi.fn(),
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
    manifestErrorResponse: (message: string, status: number) =>
      NextResponse.json({ success: false, message }, { status }),
  };
});

// --- Module imports (after mocks) ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");
const { executeManifestCommand } = await import(
  "@/lib/manifest-command-handler"
);

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000200";
const TEST_USER_ID = "user_prep_list_test";
const TEST_ORG_ID = "org_prep_list_test";
const TEST_PREP_LIST_ID = "11111111-1111-4111-a111-111111111111";
const TEST_EVENT_ID = "22222222-2222-4222-a222-222222222222";

// --- Helpers ---

function authed() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID as never);
}

function unauthed() {
  vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);
}

function makeRequest(url: string, init?: RequestInit): NextRequest {
  const opts: RequestInit = { ...init };
  if (opts.body && !opts.headers) {
    opts.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), opts as never);
}

function postRequest(url: string, body: unknown = {}): NextRequest {
  return makeRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * Extracts the AND clauses from the first call to `database.prepList.findMany`
 * with type-safe non-null assertions for the test environment.
 */
function findManyAndClauses(): unknown[] {
  const call = vi.mocked(database.prepList.findMany).mock.calls[0];
  if (!call) {
    throw new Error("prepList.findMany was not called");
  }
  const arg = call[0] as { where?: { AND: unknown[] } };
  if (!arg?.where?.AND) {
    throw new Error("prepList.findMany was not called with a where.AND clause");
  }
  return arg.where.AND;
}

function samplePrepList(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_PREP_LIST_ID,
    tenantId: TEST_TENANT_ID,
    eventId: TEST_EVENT_ID,
    name: "Wedding Prep List",
    batchMultiplier: 1.0,
    dietaryRestrictions: [],
    status: "draft",
    totalItems: 0,
    totalEstimatedTime: 0,
    notes: null,
    generatedAt: new Date("2026-04-01"),
    finalizedAt: null,
    deletedAt: null,
    createdAt: new Date("2026-04-01"),
    updatedAt: new Date("2026-04-01"),
    tenant: { id: TEST_TENANT_ID },
    ...overrides,
  } as Record<string, unknown>;
}

function samplePrepListItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "item-1",
    tenantId: TEST_TENANT_ID,
    prepListId: TEST_PREP_LIST_ID,
    stationId: "station-1",
    stationName: "Pastry",
    ingredientId: "ingredient-1",
    ingredientName: "Flour",
    category: "dry",
    baseQuantity: 100,
    baseUnit: "g",
    scaledQuantity: 100,
    scaledUnit: "g",
    isOptional: false,
    preparationNotes: null,
    allergens: ["gluten"],
    dietarySubstitutions: [],
    dishId: null,
    dishName: null,
    recipeVersionId: null,
    sortOrder: 0,
    isCompleted: false,
    completedAt: null,
    completedBy: null,
    deletedAt: null,
    ...overrides,
  } as Record<string, unknown>;
}

function mockRuntimeSuccess(
  result: Record<string, unknown> = { id: TEST_PREP_LIST_ID }
) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: true,
      result,
      emittedEvents: [{ type: "PrepListEvent", entityId: result.id }],
    }),
  } as never);
}

function mockRuntimeFailure(error: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      error,
    }),
  } as never);
}

function mockRuntimePolicyDenial(policyName: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      policyDenial: { policyName },
    }),
  } as never);
}

function mockRuntimeGuardFailure(index: number, formatted: string) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: false,
      guardFailure: { index, formatted },
    }),
  } as never);
}

// --- Test Suite ---

describe("Prep Lists API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authed();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========================================================== GET LIST
  describe("GET /api/kitchen/prep-lists", () => {
    it("returns 401 when unauthenticated", async () => {
      unauthed();
      const { GET } = await import("@/app/api/kitchen/prep-lists/route");
      const res = await GET(makeRequest("/api/kitchen/prep-lists"));

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Unauthorized");
    });

    it("returns paginated prep lists with default pagination", async () => {
      vi.mocked(database.prepList.findMany).mockResolvedValue([
        samplePrepList(),
      ] as never);
      vi.mocked(database.prepList.count).mockResolvedValue(1 as never);
      vi.mocked(database.event.findMany).mockResolvedValue([
        {
          id: TEST_EVENT_ID,
          title: "Wedding",
          eventDate: new Date("2026-05-01"),
        },
      ] as never);

      const { GET } = await import("@/app/api/kitchen/prep-lists/route");
      const res = await GET(makeRequest("/api/kitchen/prep-lists"));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(TEST_PREP_LIST_ID);
      expect(body.data[0].batchMultiplier).toBe(1);
      expect(body.data[0].event).toEqual({
        title: "Wedding",
        eventDate: expect.any(String),
      });
      expect(body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it("applies eventId filter", async () => {
      vi.mocked(database.prepList.findMany).mockResolvedValue([] as never);
      vi.mocked(database.prepList.count).mockResolvedValue(0 as never);
      vi.mocked(database.event.findMany).mockResolvedValue([] as never);

      const { GET } = await import("@/app/api/kitchen/prep-lists/route");
      await GET(
        makeRequest(`/api/kitchen/prep-lists?eventId=${TEST_EVENT_ID}`)
      );

      const ands = findManyAndClauses();
      expect(
        ands.some(
          (c) => (c as Record<string, unknown>).eventId === TEST_EVENT_ID
        )
      ).toBe(true);
    });

    it("applies status filter", async () => {
      vi.mocked(database.prepList.findMany).mockResolvedValue([] as never);
      vi.mocked(database.prepList.count).mockResolvedValue(0 as never);
      vi.mocked(database.event.findMany).mockResolvedValue([] as never);

      const { GET } = await import("@/app/api/kitchen/prep-lists/route");
      await GET(makeRequest("/api/kitchen/prep-lists?status=active"));

      const ands = findManyAndClauses();
      expect(
        ands.some((c) => (c as Record<string, unknown>).status === "active")
      ).toBe(true);
    });

    it("applies search filter as case-insensitive contains", async () => {
      vi.mocked(database.prepList.findMany).mockResolvedValue([] as never);
      vi.mocked(database.prepList.count).mockResolvedValue(0 as never);
      vi.mocked(database.event.findMany).mockResolvedValue([] as never);

      const { GET } = await import("@/app/api/kitchen/prep-lists/route");
      await GET(makeRequest("/api/kitchen/prep-lists?search=Wedding"));

      const ands = findManyAndClauses();
      expect(
        ands.some((c) => {
          const name = (c as Record<string, unknown>).name as
            | { contains: string; mode: string }
            | undefined;
          return name?.contains === "wedding" && name?.mode === "insensitive";
        })
      ).toBe(true);
    });

    it("filters by station via prepListItem lookup", async () => {
      vi.mocked(database.prepListItem.findMany).mockResolvedValue([
        { prepListId: TEST_PREP_LIST_ID },
      ] as never);
      vi.mocked(database.prepList.findMany).mockResolvedValue([
        samplePrepList(),
      ] as never);
      vi.mocked(database.prepList.count).mockResolvedValue(1 as never);
      vi.mocked(database.event.findMany).mockResolvedValue([] as never);

      const { GET } = await import("@/app/api/kitchen/prep-lists/route");
      const res = await GET(
        makeRequest("/api/kitchen/prep-lists?station=station-1")
      );

      expect(res.status).toBe(200);
      // Verify station filter was added via id-in clause
      const ands = findManyAndClauses();
      expect(
        ands.some((c) => {
          const id = (c as Record<string, unknown>).id as
            | { in: string[] }
            | undefined;
          return id?.in?.includes(TEST_PREP_LIST_ID);
        })
      ).toBe(true);
    });

    it("returns empty result when station has no prep lists", async () => {
      vi.mocked(database.prepListItem.findMany).mockResolvedValue([] as never);

      const { GET } = await import("@/app/api/kitchen/prep-lists/route");
      const res = await GET(
        makeRequest("/api/kitchen/prep-lists?station=empty-station")
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual([]);
      expect(body.pagination.total).toBe(0);
      expect(body.pagination.totalPages).toBe(0);
      // prepList.findMany must NOT have been called when station was empty
      expect(database.prepList.findMany).not.toHaveBeenCalled();
    });

    it("respects custom page and limit", async () => {
      vi.mocked(database.prepList.findMany).mockResolvedValue([] as never);
      vi.mocked(database.prepList.count).mockResolvedValue(45 as never);
      vi.mocked(database.event.findMany).mockResolvedValue([] as never);

      const { GET } = await import("@/app/api/kitchen/prep-lists/route");
      const res = await GET(
        makeRequest("/api/kitchen/prep-lists?page=2&limit=10")
      );
      const body = await res.json();

      expect(body.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 45,
        totalPages: 5,
      });
      expect(database.prepList.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 10 })
      );
    });

    it("clamps limit to max 100", async () => {
      vi.mocked(database.prepList.findMany).mockResolvedValue([] as never);
      vi.mocked(database.prepList.count).mockResolvedValue(0 as never);
      vi.mocked(database.event.findMany).mockResolvedValue([] as never);

      const { GET } = await import("@/app/api/kitchen/prep-lists/route");
      await GET(makeRequest("/api/kitchen/prep-lists?limit=999"));

      expect(database.prepList.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });

    it("returns 500 on unexpected database error", async () => {
      vi.mocked(database.prepList.findMany).mockRejectedValue(
        new Error("DB down") as never
      );

      const { GET } = await import("@/app/api/kitchen/prep-lists/route");
      const res = await GET(makeRequest("/api/kitchen/prep-lists"));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });
  });

  // ========================================================== POST CREATE (root)
  describe("POST /api/kitchen/prep-lists", () => {
    it("delegates to executeManifestCommand with PrepList.create", async () => {
      const { NextResponse } = await import("next/server");
      vi.mocked(executeManifestCommand).mockResolvedValue(
        NextResponse.json({ success: true, result: { id: TEST_PREP_LIST_ID } })
      );

      const { POST } = await import("@/app/api/kitchen/prep-lists/route");
      const req = postRequest("/api/kitchen/prep-lists", {
        eventId: TEST_EVENT_ID,
      });
      await POST(req);

      expect(executeManifestCommand).toHaveBeenCalledWith(req, {
        entityName: "PrepList",
        commandName: "create",
      });
    });
  });

  // ========================================================== GET DETAIL
  describe("GET /api/kitchen/prep-lists/[id]", () => {
    it("returns 401 when unauthenticated", async () => {
      unauthed();
      const { GET } = await import("@/app/api/kitchen/prep-lists/[id]/route");
      const res = await GET(
        makeRequest(`/api/kitchen/prep-lists/${TEST_PREP_LIST_ID}`),
        { params: Promise.resolve({ id: TEST_PREP_LIST_ID }) }
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 404 when prep list not found", async () => {
      vi.mocked(database.prepList.findFirst).mockResolvedValue(null as never);

      const { GET } = await import("@/app/api/kitchen/prep-lists/[id]/route");
      const res = await GET(
        makeRequest(`/api/kitchen/prep-lists/${TEST_PREP_LIST_ID}`),
        { params: Promise.resolve({ id: TEST_PREP_LIST_ID }) }
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe("Prep list not found");
    });

    it("returns prep list with grouped station items", async () => {
      vi.mocked(database.prepList.findFirst).mockResolvedValue(
        samplePrepList() as never
      );
      vi.mocked(database.event.findFirst).mockResolvedValue({
        title: "Wedding",
        eventDate: new Date("2026-05-01"),
      } as never);
      vi.mocked(database.prepListItem.findMany).mockResolvedValue([
        samplePrepListItem({
          id: "item-1",
          stationId: "s1",
          stationName: "Pastry",
          sortOrder: 0,
        }),
        samplePrepListItem({
          id: "item-2",
          stationId: "s1",
          stationName: "Pastry",
          sortOrder: 1,
        }),
        samplePrepListItem({
          id: "item-3",
          stationId: "s2",
          stationName: "Grill",
          sortOrder: 0,
        }),
      ] as never);

      const { GET } = await import("@/app/api/kitchen/prep-lists/[id]/route");
      const res = await GET(
        makeRequest(`/api/kitchen/prep-lists/${TEST_PREP_LIST_ID}`),
        { params: Promise.resolve({ id: TEST_PREP_LIST_ID }) }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBe(TEST_PREP_LIST_ID);
      expect(body.eventTitle).toBe("Wedding");
      expect(body.stations).toHaveLength(2);
      expect(body.stations[0].stationName).toBe("Pastry");
      expect(body.stations[0].items).toHaveLength(2);
      expect(body.stations[1].stationName).toBe("Grill");
      expect(body.stations[1].items).toHaveLength(1);
    });

    it("groups items by stationName when stationId is null", async () => {
      vi.mocked(database.prepList.findFirst).mockResolvedValue(
        samplePrepList() as never
      );
      vi.mocked(database.event.findFirst).mockResolvedValue(null as never);
      vi.mocked(database.prepListItem.findMany).mockResolvedValue([
        samplePrepListItem({
          id: "item-a",
          stationId: null,
          stationName: "Cold Line",
        }),
        samplePrepListItem({
          id: "item-b",
          stationId: null,
          stationName: "Cold Line",
        }),
      ] as never);

      const { GET } = await import("@/app/api/kitchen/prep-lists/[id]/route");
      const res = await GET(
        makeRequest(`/api/kitchen/prep-lists/${TEST_PREP_LIST_ID}`),
        { params: Promise.resolve({ id: TEST_PREP_LIST_ID }) }
      );

      const body = await res.json();
      expect(body.stations).toHaveLength(1);
      expect(body.stations[0].stationId).toBe("Cold Line");
      expect(body.stations[0].items).toHaveLength(2);
      expect(body.eventTitle).toBeNull();
    });

    it("returns 500 on unexpected error", async () => {
      vi.mocked(database.prepList.findFirst).mockRejectedValue(
        new Error("Boom") as never
      );

      const { GET } = await import("@/app/api/kitchen/prep-lists/[id]/route");
      const res = await GET(
        makeRequest(`/api/kitchen/prep-lists/${TEST_PREP_LIST_ID}`),
        { params: Promise.resolve({ id: TEST_PREP_LIST_ID }) }
      );

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Failed to get prep list");
    });
  });

  // ========================================================== PATCH
  describe("PATCH /api/kitchen/prep-lists/[id]", () => {
    it("delegates to executeManifestCommand with PrepList.update", async () => {
      const { NextResponse } = await import("next/server");
      vi.mocked(executeManifestCommand).mockResolvedValue(
        NextResponse.json({ success: true, result: { id: TEST_PREP_LIST_ID } })
      );

      const { PATCH } = await import("@/app/api/kitchen/prep-lists/[id]/route");
      const req = postRequest(`/api/kitchen/prep-lists/${TEST_PREP_LIST_ID}`, {
        name: "Updated",
      });
      await PATCH(req, { params: Promise.resolve({ id: TEST_PREP_LIST_ID }) });

      expect(executeManifestCommand).toHaveBeenCalledWith(
        req,
        expect.objectContaining({
          entityName: "PrepList",
          commandName: "update",
          params: { id: TEST_PREP_LIST_ID },
        })
      );

      // Validate transformBody injects id into body
      const callArg = vi.mocked(executeManifestCommand).mock.calls[0][1];
      const transformed = callArg.transformBody?.(
        { name: "Updated" },
        { userId: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" }
      );
      expect(transformed).toEqual({ name: "Updated", id: TEST_PREP_LIST_ID });
    });
  });

  // ========================================================== DELETE
  describe("DELETE /api/kitchen/prep-lists/[id]", () => {
    it("delegates to executeManifestCommand with PrepList.cancel", async () => {
      const { NextResponse } = await import("next/server");
      vi.mocked(executeManifestCommand).mockResolvedValue(
        NextResponse.json({ success: true, result: { id: TEST_PREP_LIST_ID } })
      );

      const { DELETE } = await import(
        "@/app/api/kitchen/prep-lists/[id]/route"
      );
      const req = makeRequest(`/api/kitchen/prep-lists/${TEST_PREP_LIST_ID}`, {
        method: "DELETE",
      });
      await DELETE(req, {
        params: Promise.resolve({ id: TEST_PREP_LIST_ID }),
      });

      expect(executeManifestCommand).toHaveBeenCalledWith(
        req,
        expect.objectContaining({
          entityName: "PrepList",
          commandName: "cancel",
          params: { id: TEST_PREP_LIST_ID },
        })
      );

      // Validate transformBody synthesizes cancel payload using user context
      const callArg = vi.mocked(executeManifestCommand).mock.calls[0][1];
      const transformed = callArg.transformBody?.(
        {},
        { userId: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: "admin" }
      );
      expect(transformed).toEqual({
        id: TEST_PREP_LIST_ID,
        reason: "Deleted via API",
        canceledBy: TEST_USER_ID,
      });
    });
  });

  // ========================================================== COMMAND ROUTES
  // All 10 command routes follow the same auth/tenant/runtime pattern.
  // We exercise each path: 401, 400 (no tenant), 200, 403 (policy), 422 (guard),
  // 400 (generic), 500 (exception).

  type CommandSpec = {
    /** URL path slug (kebab-case) */
    name: string;
    /** Manifest command name as invoked at runtime (camelCase per IR) */
    runtimeName: string;
    path: string;
    routePath: string;
    sampleBody: Record<string, unknown>;
  };

  const COMMANDS: CommandSpec[] = [
    {
      name: "activate",
      runtimeName: "activate",
      path: "/api/kitchen/prep-lists/commands/activate",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_PREP_LIST_ID },
    },
    {
      name: "cancel",
      runtimeName: "cancel",
      path: "/api/kitchen/prep-lists/commands/cancel",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_PREP_LIST_ID, reason: "Test cancel" },
    },
    {
      name: "create",
      runtimeName: "create",
      path: "/api/kitchen/prep-lists/commands/create",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: {
        eventId: TEST_EVENT_ID,
        name: "Test Prep List",
        batchMultiplier: 1,
      },
    },
    {
      name: "create-from-seed",
      runtimeName: "createFromSeed",
      path: "/api/kitchen/prep-lists/commands/create-from-seed",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { eventId: TEST_EVENT_ID, seedId: "seed-1" },
    },
    {
      name: "deactivate",
      runtimeName: "deactivate",
      path: "/api/kitchen/prep-lists/commands/deactivate",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_PREP_LIST_ID },
    },
    {
      name: "finalize",
      runtimeName: "finalize",
      path: "/api/kitchen/prep-lists/commands/finalize",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_PREP_LIST_ID },
    },
    {
      name: "mark-completed",
      runtimeName: "markCompleted",
      path: "/api/kitchen/prep-lists/commands/mark-completed",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_PREP_LIST_ID },
    },
    {
      name: "reopen",
      runtimeName: "reopen",
      path: "/api/kitchen/prep-lists/commands/reopen",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_PREP_LIST_ID },
    },
    {
      name: "update",
      runtimeName: "update",
      path: "/api/kitchen/prep-lists/commands/update",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_PREP_LIST_ID, name: "Renamed" },
    },
    {
      name: "update-batch-multiplier",
      runtimeName: "updateBatchMultiplier",
      path: "/api/kitchen/prep-lists/commands/update-batch-multiplier",
      routePath:
        "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_PREP_LIST_ID, batchMultiplier: 2.5 },
    },
  ];

  describe.each(COMMANDS)("POST $path", ({
    name,
    runtimeName,
    path,
    routePath,
    sampleBody,
  }) => {
    it(`returns 401 when unauthenticated [${name}]`, async () => {
      unauthed();
      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody));

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Unauthorized");
    });

    it(`returns 400 when tenant cannot be resolved [${name}]`, async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Tenant not found");
    });

    it(`returns 200 with result and events on success [${name}]`, async () => {
      mockRuntimeSuccess({
        id: TEST_PREP_LIST_ID,
        status: name === "deactivate" ? "draft" : "active",
      });

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.id).toBe(TEST_PREP_LIST_ID);
      expect(body.events).toHaveLength(1);

      // Verify runtime was invoked with the right command + entity
      const runtimeCall = vi.mocked(createManifestRuntime).mock.calls[0][0];
      expect(runtimeCall).toEqual({
        user: { id: TEST_USER_ID, tenantId: TEST_TENANT_ID },
      });
    });

    it(`returns 403 on policy denial [${name}]`, async () => {
      mockRuntimePolicyDenial("adminOnly");

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody));

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toContain("Access denied");
      expect(body.message).toContain("adminOnly");
    });

    it(`returns 422 on guard failure [${name}]`, async () => {
      mockRuntimeGuardFailure(0, "id is required");

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody));

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.message).toContain("Guard 0 failed");
      expect(body.message).toContain("id is required");
    });

    it(`returns 400 on generic command failure [${name}]`, async () => {
      mockRuntimeFailure("State transition not allowed");

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("State transition not allowed");
    });

    it(`returns 500 when runtime throws [${name}]`, async () => {
      vi.mocked(createManifestRuntime).mockRejectedValue(
        new Error("Runtime explosion") as never
      );

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });

    it(`passes correct command name + entity to runtime [${name}]`, async () => {
      const runCommand = vi.fn().mockResolvedValue({
        success: true,
        result: { id: TEST_PREP_LIST_ID },
        emittedEvents: [],
      });
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand,
      } as never);

      const mod = await import(routePath);
      await mod.POST(postRequest(path, sampleBody));

      expect(runCommand).toHaveBeenCalledWith(runtimeName, sampleBody, {
        entityName: "PrepList",
      });
    });
  });
});
