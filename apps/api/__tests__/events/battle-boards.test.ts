/**
 * Battle Boards API Test Suite
 *
 * Covers all 8 routes in apps/api/app/api/events/battle-boards/:
 *   - GET  /api/events/battle-boards               (list)
 *   - POST /api/events/battle-boards               (create — delegates to executeManifestCommand)
 *   - POST /api/events/battle-boards/commands/create
 *   - POST /api/events/battle-boards/commands/add-dish        (addDish)
 *   - POST /api/events/battle-boards/commands/remove-dish     (removeDish)
 *   - POST /api/events/battle-boards/commands/open
 *   - POST /api/events/battle-boards/commands/start-voting    (startVoting)
 *   - POST /api/events/battle-boards/commands/vote
 *   - POST /api/events/battle-boards/commands/finalize
 *
 * Each command route:
 *   1. auth (orgId + clerkId)
 *   2. resolves tenantId via getTenantIdForOrg
 *   3. resolves internal user via database.user.findFirst
 *   4. delegates to runtime.runCommand(verb, body, { entityName: "BattleBoard" })
 *
 * NOTE: BattleBoard command routes do NOT pass instanceId — they call
 *   runCommand(verb, body, { entityName: "BattleBoard" })
 * even for verbs that operate on an existing instance. This pin guards against
 * accidental signature drift.
 *
 * @vitest-environment node
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("@repo/database", () => ({
  database: {
    user: { findFirst: vi.fn() },
    battleBoard: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
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

// --- Imports (after mocks) ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { database } = await import("@repo/database");
const { createManifestRuntime } = await import("@/lib/manifest-runtime");
const { executeManifestCommand } = await import(
  "@/lib/manifest-command-handler"
);

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000500";
const TEST_ORG_ID = "org_battle_board_test";
const TEST_CLERK_ID = "clerk_battle_board_test";
const TEST_USER_ID = "user_battle_board_test_internal";
const TEST_USER_ROLE = "admin";
const TEST_BATTLE_BOARD_ID = "55555555-5555-4555-a555-555555555555";
const TEST_EVENT_ID = "55555555-5555-4555-a555-555555555eee";
const TEST_DISH_ID = "55555555-5555-4555-a555-5555555dddd1";

// --- Helpers ---

function authed() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_CLERK_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID as never);
  vi.mocked(database.user.findFirst).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: TEST_USER_ROLE,
    authUserId: TEST_CLERK_ID,
  } as never);
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

function getRequest(url: string): NextRequest {
  return makeRequest(url, { method: "GET" });
}

function postRequest(url: string, body: unknown = {}): NextRequest {
  return makeRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function mockRuntimeSuccess(
  result: Record<string, unknown> = { id: TEST_BATTLE_BOARD_ID }
) {
  vi.mocked(createManifestRuntime).mockResolvedValue({
    runCommand: vi.fn().mockResolvedValue({
      success: true,
      result,
      emittedEvents: [{ type: "BattleBoardEvent", entityId: result.id }],
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

describe("Battle Boards API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authed();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------
  // GET /api/events/battle-boards
  // ---------------------------------------------------------------
  describe("GET /api/events/battle-boards", () => {
    const ROUTE = "@/app/api/events/battle-boards/route";
    const URL_BASE = "/api/events/battle-boards";

    it("returns 401 when unauthenticated", async () => {
      unauthed();
      const mod = await import(ROUTE);
      const res = await mod.GET(getRequest(URL_BASE));

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.message).toBe("Unauthorized");
    });

    it("returns boards + pagination on success with no filters", async () => {
      const fakeBoards = [
        { id: TEST_BATTLE_BOARD_ID, status: "draft", eventId: TEST_EVENT_ID },
      ];
      vi.mocked(database.battleBoard.findMany).mockResolvedValue(
        fakeBoards as never
      );
      vi.mocked(database.battleBoard.count).mockResolvedValue(1 as never);

      const mod = await import(ROUTE);
      const res = await mod.GET(getRequest(URL_BASE));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toEqual(fakeBoards);
      expect(body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });

      // tenant + soft-delete filter present, no eventId/status filter
      expect(database.battleBoard.findMany).toHaveBeenCalledWith({
        where: { tenantId: TEST_TENANT_ID, deletedAt: null },
        orderBy: [{ createdAt: "desc" }],
        take: 20,
        skip: 0,
      });
    });

    it("applies eventId filter when provided", async () => {
      vi.mocked(database.battleBoard.findMany).mockResolvedValue([] as never);
      vi.mocked(database.battleBoard.count).mockResolvedValue(0 as never);

      const mod = await import(ROUTE);
      await mod.GET(getRequest(`${URL_BASE}?eventId=${TEST_EVENT_ID}`));

      expect(database.battleBoard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ eventId: TEST_EVENT_ID }),
        })
      );
    });

    it("applies status filter when provided", async () => {
      vi.mocked(database.battleBoard.findMany).mockResolvedValue([] as never);
      vi.mocked(database.battleBoard.count).mockResolvedValue(0 as never);

      const mod = await import(ROUTE);
      await mod.GET(getRequest(`${URL_BASE}?status=voting`));

      expect(database.battleBoard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "voting" }),
        })
      );
    });

    it("computes pagination skip/take from page+limit", async () => {
      vi.mocked(database.battleBoard.findMany).mockResolvedValue([] as never);
      vi.mocked(database.battleBoard.count).mockResolvedValue(0 as never);

      const mod = await import(ROUTE);
      await mod.GET(getRequest(`${URL_BASE}?page=3&limit=10`));

      expect(database.battleBoard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 20 })
      );
    });

    it("clamps limit to a maximum of 100", async () => {
      vi.mocked(database.battleBoard.findMany).mockResolvedValue([] as never);
      vi.mocked(database.battleBoard.count).mockResolvedValue(0 as never);

      const mod = await import(ROUTE);
      await mod.GET(getRequest(`${URL_BASE}?limit=500`));

      expect(database.battleBoard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });

    it("clamps limit to a minimum of 1", async () => {
      vi.mocked(database.battleBoard.findMany).mockResolvedValue([] as never);
      vi.mocked(database.battleBoard.count).mockResolvedValue(0 as never);

      const mod = await import(ROUTE);
      await mod.GET(getRequest(`${URL_BASE}?limit=0`));

      expect(database.battleBoard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1 })
      );
    });

    it("computes totalPages via ceil(total/limit)", async () => {
      vi.mocked(database.battleBoard.findMany).mockResolvedValue([] as never);
      vi.mocked(database.battleBoard.count).mockResolvedValue(45 as never);

      const mod = await import(ROUTE);
      const res = await mod.GET(getRequest(`${URL_BASE}?limit=20`));
      const body = await res.json();

      expect(body.pagination.total).toBe(45);
      expect(body.pagination.totalPages).toBe(3);
    });

    it("returns 500 when Prisma query throws", async () => {
      vi.mocked(database.battleBoard.findMany).mockRejectedValue(
        new Error("DB explosion") as never
      );

      const mod = await import(ROUTE);
      const res = await mod.GET(getRequest(URL_BASE));

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.message).toBe("Internal server error");
    });
  });

  // ---------------------------------------------------------------
  // POST /api/events/battle-boards (delegated to executeManifestCommand)
  // ---------------------------------------------------------------
  describe("POST /api/events/battle-boards (delegated create)", () => {
    const ROUTE = "@/app/api/events/battle-boards/route";
    const URL_BASE = "/api/events/battle-boards";

    it("delegates to executeManifestCommand with BattleBoard/create", async () => {
      const { NextResponse } = await import("next/server");
      vi.mocked(executeManifestCommand).mockResolvedValue(
        NextResponse.json(
          { success: true, result: { id: TEST_BATTLE_BOARD_ID } },
          { status: 200 }
        ) as never
      );

      const req = postRequest(URL_BASE, { eventId: TEST_EVENT_ID });
      const mod = await import(ROUTE);
      const res = await mod.POST(req);

      expect(res.status).toBe(200);
      expect(executeManifestCommand).toHaveBeenCalledWith(req, {
        entityName: "BattleBoard",
        commandName: "create",
      });
    });

    it("propagates the response from executeManifestCommand", async () => {
      const { NextResponse } = await import("next/server");
      vi.mocked(executeManifestCommand).mockResolvedValue(
        NextResponse.json(
          { success: false, message: "delegated failure" },
          { status: 422 }
        ) as never
      );

      const mod = await import(ROUTE);
      const res = await mod.POST(postRequest(URL_BASE, {}));

      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.message).toBe("delegated failure");
    });
  });

  // ---------------------------------------------------------------
  // Command Routes (describe.each)
  // ---------------------------------------------------------------
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
      path: "/api/events/battle-boards/commands/create",
      routePath: "@/app/api/events/battle-boards/commands/create/route",
      sampleBody: {
        eventId: TEST_EVENT_ID,
        title: "Battle Royale",
      },
    },
    {
      name: "add-dish",
      runtimeName: "addDish",
      path: "/api/events/battle-boards/commands/add-dish",
      routePath: "@/app/api/events/battle-boards/commands/add-dish/route",
      sampleBody: {
        id: TEST_BATTLE_BOARD_ID,
        dishId: TEST_DISH_ID,
      },
    },
    {
      name: "remove-dish",
      runtimeName: "removeDish",
      path: "/api/events/battle-boards/commands/remove-dish",
      routePath: "@/app/api/events/battle-boards/commands/remove-dish/route",
      sampleBody: {
        id: TEST_BATTLE_BOARD_ID,
        dishId: TEST_DISH_ID,
      },
    },
    {
      name: "open",
      runtimeName: "open",
      path: "/api/events/battle-boards/commands/open",
      routePath: "@/app/api/events/battle-boards/commands/open/route",
      sampleBody: { id: TEST_BATTLE_BOARD_ID },
    },
    {
      name: "start-voting",
      runtimeName: "startVoting",
      path: "/api/events/battle-boards/commands/start-voting",
      routePath: "@/app/api/events/battle-boards/commands/start-voting/route",
      sampleBody: { id: TEST_BATTLE_BOARD_ID },
    },
    {
      name: "vote",
      runtimeName: "vote",
      path: "/api/events/battle-boards/commands/vote",
      routePath: "@/app/api/events/battle-boards/commands/vote/route",
      sampleBody: {
        id: TEST_BATTLE_BOARD_ID,
        dishId: TEST_DISH_ID,
        voterId: TEST_USER_ID,
      },
    },
    {
      name: "finalize",
      runtimeName: "finalize",
      path: "/api/events/battle-boards/commands/finalize",
      routePath: "@/app/api/events/battle-boards/commands/finalize/route",
      sampleBody: { id: TEST_BATTLE_BOARD_ID },
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

    it(`returns 400 when internal user cannot be resolved [${name}]`, async () => {
      vi.mocked(database.user.findFirst).mockResolvedValue(null as never);

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("User not found in database");
    });

    it(`returns 200 with result and events on success [${name}]`, async () => {
      mockRuntimeSuccess({ id: TEST_BATTLE_BOARD_ID });

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody));

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.result.id).toBe(TEST_BATTLE_BOARD_ID);
      expect(body.events).toHaveLength(1);

      // Verify runtime received correct user context
      const runtimeCall = vi.mocked(createManifestRuntime).mock.calls[0][0];
      expect(runtimeCall).toEqual({
        user: {
          id: TEST_USER_ID,
          tenantId: TEST_TENANT_ID,
          role: TEST_USER_ROLE,
        },
        entityName: "BattleBoard",
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
      expect(body.message).toContain(`role=${TEST_USER_ROLE}`);
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

    it(`returns 400 with default message when error is null [${name}]`, async () => {
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand: vi.fn().mockResolvedValue({ success: false }),
      } as never);

      const mod = await import(routePath);
      const res = await mod.POST(postRequest(path, sampleBody));

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe("Command failed");
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
        result: { id: TEST_BATTLE_BOARD_ID },
        emittedEvents: [],
      });
      vi.mocked(createManifestRuntime).mockResolvedValue({
        runCommand,
      } as never);

      const mod = await import(routePath);
      await mod.POST(postRequest(path, sampleBody));

      expect(runCommand).toHaveBeenCalledWith(runtimeName, sampleBody, {
        entityName: "BattleBoard",
      });
    });

    it(`scopes user lookup to tenant + clerk id [${name}]`, async () => {
      mockRuntimeSuccess();

      const mod = await import(routePath);
      await mod.POST(postRequest(path, sampleBody));

      expect(database.user.findFirst).toHaveBeenCalledWith({
        where: {
          AND: [{ tenantId: TEST_TENANT_ID }, { authUserId: TEST_CLERK_ID }],
        },
      });
    });
  });
});
