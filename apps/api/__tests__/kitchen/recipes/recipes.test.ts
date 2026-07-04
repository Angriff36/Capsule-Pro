/**
 * Recipes API Test Suite
 *
 * Tests the kitchen/recipes domain surface:
 *   GET  /api/kitchen/recipes              (root list w/ rich filters + paging)
 *   GET  /api/kitchen/recipes/list         (manifest projection list w/ clamps)
 *   GET  /api/kitchen/recipes/[id]         (detail)
 *   POST /api/manifest/[entity]/commands/[command]  (dispatcher for create/update/activate/deactivate)
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
  requireTenantId: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));
vi.mock("@/lib/manifest-runtime", () => ({ createManifestRuntime: vi.fn() }));
vi.mock("@/lib/manifest-response", () => ({
  manifestSuccessResponse: vi.fn(
    (data, status = 200) =>
      new Response(
        JSON.stringify({
          success: true,
          ...(typeof data === "object" && data !== null ? data : { data }),
        }),
        { status }
      )
  ),
  manifestErrorResponse: vi.fn((message, status = 400) => {
    const body =
      typeof message === "string"
        ? { success: false, message }
        : {
            success: false,
            error: message.error,
            diagnostics: message.diagnostics ?? [],
          };
    return new Response(JSON.stringify(body), { status });
  }),
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
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore: vi.fn(),
}));
vi.mock("@/lib/manifest/issue-log", () => ({ logManifestIssue: vi.fn() }));

// --- Imports (after mocks) ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { requireCurrentUser } = await import("@/app/lib/tenant");
const { runManifestCommand } = await import("@/lib/manifest/execute-command");

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000700";
const TEST_ORG_ID = "org_recipe_test";
const TEST_CLERK_ID = "clerk_recipe_test";
const TEST_RECIPE_ID = "11111111-1111-4111-a111-111111111111";

// --- Helpers ---

function authed() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_CLERK_ID,
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

function sampleRecipe(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_RECIPE_ID,
    tenantId: TEST_TENANT_ID,
    name: "Caesar Dressing",
    category: "sauce",
    cuisineType: "american",
    description: "Classic Caesar dressing",
    tags: ["staff-meal", "popular"],
    isActive: true,
    deletedAt: null,
    createdAt: new Date("2026-04-30"),
    updatedAt: new Date("2026-04-30"),
    ...overrides,
  } as Record<string, unknown>;
}

function rootFindManyArg(): { where: { AND: unknown[] } } {
  const call = vi.mocked(database.recipe.findMany).mock.calls[0];
  if (!call) {
    throw new Error("recipe.findMany was not called");
  }
  return call[0] as never;
}

function mockDispatcherSuccess(
  result: Record<string, unknown> = { id: TEST_RECIPE_ID }
) {
  vi.mocked(runManifestCommand).mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        success: true,
        result,
        events: [{ type: "RecipeEvent", entityId: result.id }],
      }),
      { status: 200 }
    )
  );
}

function mockDispatcherFailure(message: string, status = 400) {
  vi.mocked(runManifestCommand).mockResolvedValueOnce(
    new Response(JSON.stringify({ success: false, message }), { status })
  );
}

// --- Test Suite ---

describe("Recipes API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authed();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================== GET / (root list)
  describe("GET /api/kitchen/recipes (filtered list)", () => {
    it("returns 401 when unauthenticated", async () => {
      unauthed();
      const { GET } = await import("@/app/api/kitchen/recipes/route");
      const res = await GET(makeRequest("/api/kitchen/recipes") as Request);

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Unauthorized");
    });

    it("returns paginated results with default page=1, limit=20", async () => {
      vi.mocked(database.recipe.findMany).mockResolvedValue([
        sampleRecipe(),
      ] as never);
      vi.mocked(database.recipe.count).mockResolvedValue(1 as never);

      const { GET } = await import("@/app/api/kitchen/recipes/route");
      const res = await GET(makeRequest("/api/kitchen/recipes") as Request);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe(TEST_RECIPE_ID);
      expect(body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it("scopes results to tenant + non-deleted by default", async () => {
      vi.mocked(database.recipe.findMany).mockResolvedValue([] as never);
      vi.mocked(database.recipe.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/recipes/route");
      await GET(makeRequest("/api/kitchen/recipes") as Request);

      const arg = rootFindManyArg();
      expect(arg.where.AND).toContainEqual({ tenantId: TEST_TENANT_ID });
      expect(arg.where.AND).toContainEqual({ deletedAt: null });
    });

    it("applies category filter", async () => {
      vi.mocked(database.recipe.findMany).mockResolvedValue([] as never);
      vi.mocked(database.recipe.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/recipes/route");
      await GET(makeRequest("/api/kitchen/recipes?category=sauce") as Request);

      expect(rootFindManyArg().where.AND).toContainEqual({ category: "sauce" });
    });

    it("applies cuisineType filter", async () => {
      vi.mocked(database.recipe.findMany).mockResolvedValue([] as never);
      vi.mocked(database.recipe.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/recipes/route");
      await GET(
        makeRequest("/api/kitchen/recipes?cuisineType=italian") as Request
      );

      expect(rootFindManyArg().where.AND).toContainEqual({
        cuisineType: "italian",
      });
    });

    it("applies search filter as case-insensitive OR over name|description", async () => {
      vi.mocked(database.recipe.findMany).mockResolvedValue([] as never);
      vi.mocked(database.recipe.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/recipes/route");
      await GET(makeRequest("/api/kitchen/recipes?search=Caesar") as Request);

      const ands = rootFindManyArg().where.AND as Record<string, unknown>[];
      const orClause = ands.find((c) => "OR" in c) as { OR: unknown[] };
      expect(orClause).toBeDefined();
      expect(orClause.OR).toEqual([
        { name: { contains: "caesar", mode: "insensitive" } },
        { description: { contains: "caesar", mode: "insensitive" } },
      ]);
    });

    it("applies tag filter via Postgres array `has`", async () => {
      vi.mocked(database.recipe.findMany).mockResolvedValue([] as never);
      vi.mocked(database.recipe.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/recipes/route");
      await GET(makeRequest("/api/kitchen/recipes?tag=staff-meal") as Request);

      expect(rootFindManyArg().where.AND).toContainEqual({
        tags: { has: "staff-meal" },
      });
    });

    it("applies isActive=true filter", async () => {
      vi.mocked(database.recipe.findMany).mockResolvedValue([] as never);
      vi.mocked(database.recipe.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/recipes/route");
      await GET(makeRequest("/api/kitchen/recipes?isActive=true") as Request);

      expect(rootFindManyArg().where.AND).toContainEqual({ isActive: true });
    });

    it("applies isActive=false filter (coerces 'false' to boolean)", async () => {
      vi.mocked(database.recipe.findMany).mockResolvedValue([] as never);
      vi.mocked(database.recipe.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/recipes/route");
      await GET(makeRequest("/api/kitchen/recipes?isActive=false") as Request);

      expect(rootFindManyArg().where.AND).toContainEqual({ isActive: false });
    });

    it("clamps limit to 100 maximum", async () => {
      vi.mocked(database.recipe.findMany).mockResolvedValue([] as never);
      vi.mocked(database.recipe.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/recipes/route");
      await GET(makeRequest("/api/kitchen/recipes?limit=999999") as Request);

      const arg = vi.mocked(database.recipe.findMany).mock.calls[0]![0] as {
        take: number;
        skip: number;
      };
      expect(arg.take).toBe(100);
      expect(arg.skip).toBe(0);
    });

    it("clamps limit to 1 minimum (rejects 0/negatives)", async () => {
      vi.mocked(database.recipe.findMany).mockResolvedValue([] as never);
      vi.mocked(database.recipe.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/recipes/route");
      await GET(makeRequest("/api/kitchen/recipes?limit=0") as Request);

      const arg = vi.mocked(database.recipe.findMany).mock.calls[0]![0] as {
        take: number;
      };
      expect(arg.take).toBe(1);
    });

    it("computes offset from page number (page=3, limit=10 => skip=20)", async () => {
      vi.mocked(database.recipe.findMany).mockResolvedValue([] as never);
      vi.mocked(database.recipe.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/recipes/route");
      await GET(makeRequest("/api/kitchen/recipes?page=3&limit=10") as Request);

      const arg = vi.mocked(database.recipe.findMany).mock.calls[0]![0] as {
        take: number;
        skip: number;
      };
      expect(arg.take).toBe(10);
      expect(arg.skip).toBe(20);
    });

    it("returns 500 on unexpected DB error", async () => {
      vi.mocked(database.recipe.findMany).mockRejectedValue(
        new Error("DB explosion") as never
      );

      const { GET } = await import("@/app/api/kitchen/recipes/route");
      const res = await GET(makeRequest("/api/kitchen/recipes") as Request);

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });
  });

  // ============================================== GET /list
  describe("GET /api/kitchen/recipes/list (manifest projection)", () => {
    it("returns 401 when unauthenticated", async () => {
      unauthed();
      const { GET } = await import("@/app/api/kitchen/recipes/list/route");
      const res = await GET(makeRequest("/api/kitchen/recipes/list"));

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Unauthorized");
    });

    it("returns 400 when tenant cannot be resolved", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const { GET } = await import("@/app/api/kitchen/recipes/list/route");
      const res = await GET(makeRequest("/api/kitchen/recipes/list"));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Tenant not found");
    });

    it("returns recipes with default limit=50 + offset=0 (DEFAULT_LIMIT pin)", async () => {
      const recipes = [sampleRecipe(), sampleRecipe({ id: "rec-2" })];
      vi.mocked(database.recipe.findMany).mockResolvedValue(recipes as never);

      const { GET } = await import("@/app/api/kitchen/recipes/list/route");
      const res = await GET(makeRequest("/api/kitchen/recipes/list"));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.recipes).toHaveLength(2);
      expect(body.limit).toBe(50);
      expect(body.offset).toBe(0);

      const arg = vi.mocked(database.recipe.findMany).mock.calls[0]![0] as {
        where: Record<string, unknown>;
        orderBy: Record<string, unknown>;
        take: number;
        skip: number;
      };
      expect(arg.where).toEqual({
        tenantId: TEST_TENANT_ID,
        deletedAt: null,
      });
      expect(arg.orderBy).toEqual({ createdAt: "desc" });
      expect(arg.take).toBe(50);
      expect(arg.skip).toBe(0);
    });

    it("clamps limit at MAX_LIMIT=200 even when client requests more", async () => {
      vi.mocked(database.recipe.findMany).mockResolvedValue([] as never);

      const { GET } = await import("@/app/api/kitchen/recipes/list/route");
      const res = await GET(
        makeRequest("/api/kitchen/recipes/list?limit=10000")
      );

      expect(res.status).toBe(200);
      const arg = vi.mocked(database.recipe.findMany).mock.calls[0]![0] as {
        take: number;
      };
      expect(arg.take).toBe(200);
    });

    it("returns 500 on unexpected runtime error", async () => {
      vi.mocked(database.recipe.findMany).mockRejectedValue(
        new Error("DB explosion") as never
      );

      const { GET } = await import("@/app/api/kitchen/recipes/list/route");
      const res = await GET(makeRequest("/api/kitchen/recipes/list"));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });
  });

  // ============================================== GET /[id]
  describe("GET /api/kitchen/recipes/[id] (detail)", () => {
    it("returns 401 when unauthenticated", async () => {
      unauthed();
      const { GET } = await import("@/app/api/kitchen/recipes/[id]/route");
      const res = await GET(makeRequest("/api/kitchen/recipes/abc"), {
        params: Promise.resolve({ id: TEST_RECIPE_ID }),
      });

      expect(res.status).toBe(401);
    });

    it("returns 400 when tenant cannot be resolved", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const { GET } = await import("@/app/api/kitchen/recipes/[id]/route");
      const res = await GET(makeRequest("/api/kitchen/recipes/abc"), {
        params: Promise.resolve({ id: TEST_RECIPE_ID }),
      });

      expect(res.status).toBe(400);
    });

    it("returns 200 with recipe when found", async () => {
      vi.mocked(database.recipe.findFirst).mockResolvedValue(
        sampleRecipe() as never
      );

      const { GET } = await import("@/app/api/kitchen/recipes/[id]/route");
      const res = await GET(
        makeRequest(`/api/kitchen/recipes/${TEST_RECIPE_ID}`),
        { params: Promise.resolve({ id: TEST_RECIPE_ID }) }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.recipe.id).toBe(TEST_RECIPE_ID);

      const arg = vi.mocked(database.recipe.findFirst).mock.calls[0]![0] as {
        where: Record<string, unknown>;
      };
      expect(arg.where).toEqual({
        id: TEST_RECIPE_ID,
        tenantId: TEST_TENANT_ID,
      });
    });

    it("returns 404 when recipe not found", async () => {
      vi.mocked(database.recipe.findFirst).mockResolvedValue(null as never);

      const { GET } = await import("@/app/api/kitchen/recipes/[id]/route");
      const res = await GET(
        makeRequest(`/api/kitchen/recipes/${TEST_RECIPE_ID}`),
        { params: Promise.resolve({ id: TEST_RECIPE_ID }) }
      );

      expect(res.status).toBe(404);
    });

    it("returns 500 on unexpected DB error", async () => {
      vi.mocked(database.recipe.findFirst).mockRejectedValue(
        new Error("DB explosion") as never
      );

      const { GET } = await import("@/app/api/kitchen/recipes/[id]/route");
      const res = await GET(
        makeRequest(`/api/kitchen/recipes/${TEST_RECIPE_ID}`),
        { params: Promise.resolve({ id: TEST_RECIPE_ID }) }
      );

      expect(res.status).toBe(500);
    });
  });

  // ============================================== POST /commands/* (entity-scoped via dispatcher)

  type Cmd = {
    name: string;
    runtimeName: string;
    path: string;
    sampleBody: Record<string, unknown>;
  };

  const COMMANDS: Cmd[] = [
    {
      name: "create",
      runtimeName: "create",
      path: "/api/manifest/Recipe/commands/create",
      sampleBody: {
        name: "Caesar Dressing",
        category: "sauce",
        cuisineType: "american",
      },
    },
    {
      name: "update",
      runtimeName: "update",
      path: "/api/manifest/Recipe/commands/update",
      sampleBody: {
        id: TEST_RECIPE_ID,
        description: "Updated description",
      },
    },
    {
      name: "activate",
      runtimeName: "activate",
      path: "/api/manifest/Recipe/commands/activate",
      sampleBody: { id: TEST_RECIPE_ID },
    },
    {
      name: "deactivate",
      runtimeName: "deactivate",
      path: "/api/manifest/Recipe/commands/deactivate",
      sampleBody: { id: TEST_RECIPE_ID },
    },
  ];

  describe.each(COMMANDS)("POST $path (Recipe $name)", ({
    name,
    path,
    sampleBody,
  }) => {
    // The dispatcher route reads entity/command from context.params
    const context = {
      params: Promise.resolve({ entity: "Recipe", command: name }),
    };

    it(`returns 401 when unauthenticated [${name}]`, async () => {
      vi.mocked(requireCurrentUser).mockRejectedValueOnce(
        Object.assign(new Error("Unauthorized"), { name: "InvariantError" })
      );

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(postRequest(path, sampleBody), context);

      expect(res.status).toBe(401);
    });

    it(`returns success when authenticated [${name}]`, async () => {
      vi.mocked(requireCurrentUser).mockResolvedValueOnce({
        id: TEST_CLERK_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
        email: "test@test.com",
        firstName: "Test",
        lastName: "User",
      });

      mockDispatcherSuccess({ id: TEST_RECIPE_ID, name: "Caesar Dressing" });

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(postRequest(path, sampleBody), context);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it(`returns 400 on generic command failure [${name}]`, async () => {
      vi.mocked(requireCurrentUser).mockResolvedValueOnce({
        id: TEST_CLERK_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
        email: "test@test.com",
        firstName: "Test",
        lastName: "User",
      });

      mockDispatcherFailure("Recipe is already active");

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      const res = await POST(postRequest(path, sampleBody), context);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Recipe is already active");
    });

    it(`passes correct entity + command to dispatcher [${name}]`, async () => {
      vi.mocked(requireCurrentUser).mockResolvedValueOnce({
        id: TEST_CLERK_ID,
        tenantId: TEST_TENANT_ID,
        role: "admin",
        email: "test@test.com",
        firstName: "Test",
        lastName: "User",
      });

      mockDispatcherSuccess({ id: TEST_RECIPE_ID });

      const { POST } = await import(
        "@/app/api/manifest/[entity]/commands/[command]/route"
      );
      await POST(postRequest(path, sampleBody), context);

      // The dispatcher receives entity/command from context.params
      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Recipe",
          command: name,
          body: sampleBody,
          user: {
            id: TEST_CLERK_ID,
            tenantId: TEST_TENANT_ID,
            role: "admin",
          },
        })
      );
    });
  });
});
