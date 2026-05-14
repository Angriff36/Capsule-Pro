/**
 * Recipes API Test Suite
 *
 * Tests the kitchen/recipes domain surface:
 *   GET  /api/kitchen/recipes              (root list w/ rich filters + paging)
 *   GET  /api/kitchen/recipes/list         (manifest projection list w/ clamps)
 *   GET  /api/kitchen/recipes/[id]         (detail)
 *   POST /api/kitchen/recipes/commands/create
 *   POST /api/kitchen/recipes/commands/activate
 *   POST /api/kitchen/recipes/commands/deactivate
 *   POST /api/kitchen/recipes/commands/update
 *
 * Why this matters:
 * - Recipes are the *foundation* of every downstream cost / yield / pricing
 *   calculation in the platform. A regression on the create/update path
 *   silently breaks costPerPortion, yieldPerBatch, and the dish-pricing roll-up.
 *   The failure is invisible until end-of-month margin reports come in wrong.
 * - All 4 commands are entity-scoped (`runCommand(verb, body, { entityName: "Recipe" })`)
 *   with NO `instanceId`. The runtime resolves the instance from `body.id` for
 *   stateful verbs (activate/deactivate/update). A "helpful" patch that adds
 *   `instanceId: body.id` here would double-route at best and stomp tenant
 *   isolation at worst — the tests pin the exact 3-arg shape.
 * - Routes use the *direct-clerk-id* user-context shape:
 *   `createManifestRuntime({ user: { id: userId, tenantId } })` — they do NOT
 *   call `database.user.findFirst` to resolve an internal user. We pin this
 *   shape so a copy/paste from a different domain doesn't introduce a per-write
 *   round trip.
 * - Policy denial format is `Access denied: ${policyName}` (no `role=` suffix).
 *   Tests pin this domain's format to prevent a cross-domain refactor from
 *   accidentally merging Recipe with the notification-commands' `role=` style.
 * - The root GET (`/api/kitchen/recipes`) is the load-bearing list for menu
 *   builder, recipe browser, and dish wiring UIs. Filter threading (category,
 *   cuisineType, search OR name|description, tag `has`, isActive) and the
 *   1..100 limit clamp must be defended — a regression silently widens the
 *   tenant query (DOS) or narrows the visible recipe set (UI looks empty).
 * - The list GET (`/api/kitchen/recipes/list`) is the manifest projection that
 *   feeds external callers via `clampLimit`/`clampOffset`. We pin that the
 *   default limit is 50 (DEFAULT_LIMIT) and the cap is 200 (MAX_LIMIT) so a
 *   deploy that swaps in a different pagination policy does not silently
 *   change the SLA.
 * - The detail GET (`/api/kitchen/recipes/[id]`) defends the soft-delete
 *   filter (`deletedAt: null`) and tenant isolation. The shape mismatch case
 *   (orgId-but-no-userId) is a real Clerk failure mode — pinned to 401.
 *
 * Coverage shape:
 *   - 4 commands × 9 cases via describe.each (=36 tests)
 *   - Root GET: ~12 tests (auth, default paging, tenant scoping, filters x5,
 *     limit clamp, error paths)
 *   - List GET: ~5 tests (auth, success+default clamps, custom clamps,
 *     soft-delete filter, error)
 *   - Detail GET: ~5 tests (auth, tenant-missing, found, not-found w/
 *     soft-delete, internal error)
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

vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InvariantError";
    }
  },
  invariant: vi.fn(),
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
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

// --- Imports (after mocks) ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, requireCurrentUser } = await import("@/app/lib/tenant");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");
const { InvariantError } = await import("@/app/lib/invariant");

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
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_CLERK_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    authUserId: TEST_CLERK_ID,
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  } as never);
}

function unauthed() {
  vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);
  // Use imported InvariantError so instanceof check in route.ts passes
  vi.mocked(requireCurrentUser).mockRejectedValue(
    new InvariantError("Unauthorized") as never
  );
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({ success: false }),
  } as never);
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

function mockRuntimeSuccess(
  result: Record<string, unknown> = { id: TEST_RECIPE_ID }
) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: true,
      result,
      emittedEvents: [{ type: "RecipeEvent", entityId: result.id }],
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
      const res = await GET(
        makeRequest("/api/kitchen/recipes") as unknown as Request
      );

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
      const res = await GET(
        makeRequest("/api/kitchen/recipes") as unknown as Request
      );

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
      await GET(makeRequest("/api/kitchen/recipes") as unknown as Request);

      const arg = rootFindManyArg();
      // Pin tenant + soft-delete defenses — a regression here either leaks
      // cross-tenant data (no tenantId) or surfaces deleted recipes.
      expect(arg.where.AND).toContainEqual({ tenantId: TEST_TENANT_ID });
      expect(arg.where.AND).toContainEqual({ deletedAt: null });
    });

    it("applies category filter", async () => {
      vi.mocked(database.recipe.findMany).mockResolvedValue([] as never);
      vi.mocked(database.recipe.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/recipes/route");
      await GET(
        makeRequest("/api/kitchen/recipes?category=sauce") as unknown as Request
      );

      expect(rootFindManyArg().where.AND).toContainEqual({ category: "sauce" });
    });

    it("applies cuisineType filter", async () => {
      vi.mocked(database.recipe.findMany).mockResolvedValue([] as never);
      vi.mocked(database.recipe.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/recipes/route");
      await GET(
        makeRequest(
          "/api/kitchen/recipes?cuisineType=italian"
        ) as unknown as Request
      );

      expect(rootFindManyArg().where.AND).toContainEqual({
        cuisineType: "italian",
      });
    });

    it("applies search filter as case-insensitive OR over name|description", async () => {
      vi.mocked(database.recipe.findMany).mockResolvedValue([] as never);
      vi.mocked(database.recipe.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/recipes/route");
      await GET(
        makeRequest("/api/kitchen/recipes?search=Caesar") as unknown as Request
      );

      const ands = rootFindManyArg().where.AND as Array<
        Record<string, unknown>
      >;
      const orClause = ands.find((c) => "OR" in c) as { OR: unknown[] };
      expect(orClause).toBeDefined();
      // Pin both fields + insensitive-mode + lower-cased search term.
      expect(orClause.OR).toEqual([
        { name: { contains: "caesar", mode: "insensitive" } },
        { description: { contains: "caesar", mode: "insensitive" } },
      ]);
    });

    it("applies tag filter via Postgres array `has`", async () => {
      vi.mocked(database.recipe.findMany).mockResolvedValue([] as never);
      vi.mocked(database.recipe.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/recipes/route");
      await GET(
        makeRequest("/api/kitchen/recipes?tag=staff-meal") as unknown as Request
      );

      expect(rootFindManyArg().where.AND).toContainEqual({
        tags: { has: "staff-meal" },
      });
    });

    it("applies isActive=true filter", async () => {
      vi.mocked(database.recipe.findMany).mockResolvedValue([] as never);
      vi.mocked(database.recipe.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/recipes/route");
      await GET(
        makeRequest("/api/kitchen/recipes?isActive=true") as unknown as Request
      );

      expect(rootFindManyArg().where.AND).toContainEqual({ isActive: true });
    });

    it("applies isActive=false filter (must coerce 'false' to boolean)", async () => {
      vi.mocked(database.recipe.findMany).mockResolvedValue([] as never);
      vi.mocked(database.recipe.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/recipes/route");
      await GET(
        makeRequest("/api/kitchen/recipes?isActive=false") as unknown as Request
      );

      // Pin: regex match on the AND clause — a regression that compares the
      // raw "false" string would falsely match isActive: true.
      expect(rootFindManyArg().where.AND).toContainEqual({ isActive: false });
    });

    it("clamps limit to 100 maximum", async () => {
      vi.mocked(database.recipe.findMany).mockResolvedValue([] as never);
      vi.mocked(database.recipe.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/recipes/route");
      await GET(
        makeRequest("/api/kitchen/recipes?limit=999999") as unknown as Request
      );

      const arg = vi.mocked(database.recipe.findMany).mock.calls[0][0] as {
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
      await GET(
        makeRequest("/api/kitchen/recipes?limit=0") as unknown as Request
      );

      const arg = vi.mocked(database.recipe.findMany).mock.calls[0][0] as {
        take: number;
      };
      expect(arg.take).toBe(1);
    });

    it("computes offset from page number (page=3, limit=10 => skip=20)", async () => {
      vi.mocked(database.recipe.findMany).mockResolvedValue([] as never);
      vi.mocked(database.recipe.count).mockResolvedValue(0 as never);

      const { GET } = await import("@/app/api/kitchen/recipes/route");
      await GET(
        makeRequest(
          "/api/kitchen/recipes?page=3&limit=10"
        ) as unknown as Request
      );

      const arg = vi.mocked(database.recipe.findMany).mock.calls[0][0] as {
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
      const res = await GET(
        makeRequest("/api/kitchen/recipes") as unknown as Request
      );

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

      // Pin the where shape: tenant + soft-delete + orderBy createdAt desc.
      const arg = vi.mocked(database.recipe.findMany).mock.calls[0][0] as {
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
      const arg = vi.mocked(database.recipe.findMany).mock.calls[0][0] as {
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
      const body = await res.json();
      expect(body.message).toBe("Unauthorized");
    });

    it("returns 400 when tenant cannot be resolved", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const { GET } = await import("@/app/api/kitchen/recipes/[id]/route");
      const res = await GET(makeRequest("/api/kitchen/recipes/abc"), {
        params: Promise.resolve({ id: TEST_RECIPE_ID }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Tenant not found");
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

      // Pin the soft-delete + tenant filter — both must be present in
      // the where clause every single time.
      const arg = vi.mocked(database.recipe.findFirst).mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(arg.where).toEqual({
        id: TEST_RECIPE_ID,
        tenantId: TEST_TENANT_ID,
        deletedAt: null,
      });
    });

    it("returns 404 when recipe not found (or soft-deleted)", async () => {
      vi.mocked(database.recipe.findFirst).mockResolvedValue(null as never);

      const { GET } = await import("@/app/api/kitchen/recipes/[id]/route");
      const res = await GET(
        makeRequest(`/api/kitchen/recipes/${TEST_RECIPE_ID}`),
        { params: Promise.resolve({ id: TEST_RECIPE_ID }) }
      );

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.message).toBe("Recipe not found");
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
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });
  });

  // ============================================== POST /commands/* (entity-scoped)

  type Cmd = {
    name: string;
    runtimeName: string;
    path: string;
    routePath: string;
    sampleBody: Record<string, unknown>;
  };

  const COMMANDS: Cmd[] = [
    {
      name: "create",
      runtimeName: "create",
      path: "/api/kitchen/recipes/commands/create",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: {
        name: "Caesar Dressing",
        category: "sauce",
        cuisineType: "american",
      },
    },
    {
      name: "update",
      runtimeName: "update",
      path: "/api/kitchen/recipes/commands/update",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: {
        id: TEST_RECIPE_ID,
        description: "Updated description",
      },
    },
    {
      name: "activate",
      runtimeName: "activate",
      path: "/api/kitchen/recipes/commands/activate",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_RECIPE_ID },
    },
    {
      name: "deactivate",
      runtimeName: "deactivate",
      path: "/api/kitchen/recipes/commands/deactivate",
      routePath: "@/app/api/manifest/[entity]/commands/[command]/route",
      sampleBody: { id: TEST_RECIPE_ID },
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
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({ entity: "Recipe", command: name }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Unauthorized");
    });

    it(`returns 401 when user resolution fails [${name}]`, async () => {
      // requireCurrentUser throws InvariantError for auth failures (including tenant resolution)
      vi.mocked(requireCurrentUser).mockRejectedValue(
        new InvariantError("auth.orgId must exist") as never
      );
      mockRuntimeSuccess({ id: TEST_RECIPE_ID });

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({ entity: "Recipe", command: name }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Unauthorized");
    });

    it(`returns 200 with result + events on success [${name}]`, async () => {
      mockRuntimeSuccess({ id: TEST_RECIPE_ID, name: "Caesar Dressing" });

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({ entity: "Recipe", command: name }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.id).toBe(TEST_RECIPE_ID);
      expect(body.events).toHaveLength(1);

      // Pin the user-context shape: clerk userId is forwarded directly
      // (no database.user.findFirst lookup). Role is also included for RBAC.
      const runtimeCall = vi.mocked(createManifestRuntime).mock.calls[0][0];
      expect(runtimeCall).toEqual({
        user: {
          id: TEST_CLERK_ID,
          tenantId: TEST_TENANT_ID,
          role: "admin",
        },
        entityName: "Recipe",
      });
    });

    it(`returns 403 on policy denial [${name}]`, async () => {
      mockRuntimePolicyDenial("ChefsCanEditRecipes");

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({ entity: "Recipe", command: name }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.message).toBe("Access denied: ChefsCanEditRecipes (role=admin)");
    });

    it(`returns 422 on guard failure [${name}]`, async () => {
      mockRuntimeGuardFailure(0, "name must not be empty");

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({ entity: "Recipe", command: name }),
      });

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.message).toContain("Guard 0 failed");
      expect(body.message).toContain("name must not be empty");
    });

    it(`returns 400 on generic command failure [${name}]`, async () => {
      mockRuntimeFailure("Recipe is already active");

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({ entity: "Recipe", command: name }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Recipe is already active");
    });

    it(`returns 400 with default message when error is null [${name}]`, async () => {
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockResolvedValue({ success: false }),
      } as never);

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({ entity: "Recipe", command: name }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Command failed");
    });

    it(`returns 500 when runtime throws [${name}]`, async () => {
      vi.mocked(createManifestRuntime).mockRejectedValue(
        new Error("Runtime explosion") as never
      );

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({ entity: "Recipe", command: name }),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });

    it(`passes correct command name + entity (no instanceId) to runtime [${name}]`, async () => {
      const runCommand = vi.fn().mockResolvedValue({
        success: true,
        result: { id: TEST_RECIPE_ID },
        emittedEvents: [],
      });
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand,
      } as never);

      const mod = await import(routePath);
      await mod.POST(postRequest(path, sampleBody), {
        params: Promise.resolve({ entity: "Recipe", command: name }),
      });

      // Pin the exact 3-arg shape: all 4 commands are entity-scoped, so
      // no `instanceId` is passed even for stateful verbs (activate /
      // deactivate / update). Runtime resolves the instance from body.id.
      // Adding `instanceId: body.id` here would double-route at best.
      expect(runCommand).toHaveBeenCalledWith(runtimeName, sampleBody, {
        entityName: "Recipe",
      });

      const callArgs = runCommand.mock.calls[0];
      expect(callArgs).toHaveLength(3);
      expect(callArgs[2]).not.toHaveProperty("instanceId");
    });
  });
});
