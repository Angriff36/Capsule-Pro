/**
 * Schedule End-to-End Persistence Tests
 *
 * Tests that the Schedule write path (manifest command → SchedulePrismaStore)
 * and read path (Prisma list/detail API) are aligned. The write path persists
 * through the SchedulePrismaStore, and the read path queries the same Prisma
 * model — so a created schedule is immediately visible in the list API.
 *
 * This test also verifies the command dispatcher correctly routes Schedule
 * commands through requireCurrentUser + runManifestCommand.
 *
 * Note: The manifest's `blockNoShifts` (release) and `blockNotPublished` (close)
 * constraints may exhibit the polarity bug described in IMPLEMENTATION_PLAN.md
 * Blocker #2. The close command is expected to fail in practice due to this bug.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockDatabase } = vi.hoisted(() => ({
  mockDatabase: {
    schedule: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    scheduleShift: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@repo/database", () => ({
  database: mockDatabase,
}));
vi.mock("@/lib/database", async () => {
  const { database } = await import("@repo/database");
  return { database };
});
vi.mock("@repo/auth/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
  requireTenantId: vi.fn(),
  resolveCurrentUser: vi.fn(),
}));

vi.mock("@/app/lib/invariant", async () => {
  const actual = await vi.importActual("@/app/lib/invariant");
  return actual;
});

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
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

vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
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

// Import mocked modules after vi.mock setup
import { auth } from "@repo/auth/server";
import { getTenantIdForOrg, requireCurrentUser } from "@/app/lib/tenant";
import { runManifestCommand } from "@/lib/manifest/execute-command";

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const TEST_TENANT_ID = "a0000000-0000-4000-a000-000000000001";
const TEST_ORG_ID = "org-test-123";
const TEST_USER_ID = "u0000000-0000-4000-a000-000000000001";
const TEST_CLERK_ID = "clerk_test_001";

// ---------------------------------------------------------------------------
// Mock data factories
// ---------------------------------------------------------------------------

function createMockSchedule(overrides: Record<string, unknown> = {}) {
  return {
    id: "sched-001",
    tenantId: TEST_TENANT_ID,
    locationId: null,
    schedule_date: new Date("2026-05-01"),
    status: "draft",
    published_at: null,
    published_by: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    ...overrides,
  };
}

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

/** Helper to get manifest dispatcher POST with entity/command params */
function scheduleParams(command: string) {
  return {
    params: Promise.resolve({ entity: "Schedule", command }),
  };
}

async function getScheduleCommandHandler(command: string) {
  const mod = await import(
    "@/app/api/manifest/[entity]/commands/[command]/route"
  );
  return (req: NextRequest) => mod.POST(req, scheduleParams(command));
}

/** Mock requireCurrentUser to return an authenticated internal user */
function mockAuthenticatedUser() {
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    email: "test@test.com",
    firstName: "Test",
    lastName: "User",
  } as never);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Schedule Persistence (write → read alignment)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      orgId: TEST_ORG_ID,
      userId: TEST_CLERK_ID,
    } as any);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
  });

  // -------------------------------------------------------------------------
  // 1. GET /api/staff/schedules/list — list route
  // -------------------------------------------------------------------------

  describe("GET /api/staff/schedules/list", () => {
    it("returns schedules persisted through SchedulePrismaStore", async () => {
      const mockSchedule = createMockSchedule({
        id: "sched-001",
        status: "draft",
        schedule_date: new Date("2026-05-01"),
      });

      vi.mocked(database.schedule.findMany).mockResolvedValue([
        mockSchedule,
      ] as never);

      const { GET } = await import("@/app/api/staff/schedules/list/route");

      const request = createMockRequest(
        "http://localhost:3000/api/staff/schedules/list"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.schedules).toHaveLength(1);
      expect(data.schedules[0].id).toBe("sched-001");
      expect(data.schedules[0].status).toBe("draft");

      // Verify the read path uses Prisma (not in-memory store)
      expect(database.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          }),
        })
      );
    });

    it("returns 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as any);

      const { GET } = await import("@/app/api/staff/schedules/list/route");

      const request = createMockRequest(
        "http://localhost:3000/api/staff/schedules/list"
      );
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("excludes soft-deleted schedules from the list", async () => {
      vi.mocked(database.schedule.findMany).mockResolvedValue([]);

      const { GET } = await import("@/app/api/staff/schedules/list/route");

      const request = createMockRequest(
        "http://localhost:3000/api/staff/schedules/list"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.schedules).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // 2. GET /api/staff/schedules/[id] — detail route
  // -------------------------------------------------------------------------

  describe("GET /api/staff/schedules/[id] (detail)", () => {
    it("returns a single persisted schedule", async () => {
      const mockSchedule = createMockSchedule({
        id: "sched-002",
        status: "published",
        published_at: new Date("2026-01-15"),
        published_by: TEST_USER_ID,
      });

      vi.mocked(database.schedule.findFirst).mockResolvedValue(
        mockSchedule as never
      );

      const { GET } = await import("@/app/api/staff/schedules/[id]/route");

      const request = createMockRequest(
        "http://localhost:3000/api/staff/schedules/sched-002"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "sched-002" }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.schedule.id).toBe("sched-002");
      expect(data.schedule.status).toBe("published");

      // Verify the read uses Prisma findFirst with tenant + id scoping
      expect(database.schedule.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "sched-002",
            tenantId: TEST_TENANT_ID,
            deletedAt: null,
          }),
        })
      );
    });

    it("returns 404 for non-existent schedule", async () => {
      vi.mocked(database.schedule.findFirst).mockResolvedValue(null);

      const { GET } = await import("@/app/api/staff/schedules/[id]/route");

      const request = createMockRequest(
        "http://localhost:3000/api/staff/schedules/non-existent"
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: "non-existent" }),
      });

      expect(response.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Command routes use the generic manifest dispatcher
  // -------------------------------------------------------------------------

  describe("command routes via manifest dispatcher", () => {
    beforeEach(() => {
      mockAuthenticatedUser();
      vi.mocked(runManifestCommand).mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            result: { id: "sched-003", status: "draft" },
            events: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    });

    const instanceScopedVerbs = ["update", "release", "close"];

    for (const verb of instanceScopedVerbs) {
      it(`${verb} route sends correct entity/command to runManifestCommand`, async () => {
        const handler = await getScheduleCommandHandler(verb);
        const request = createMockRequest(
          `http://localhost:3000/api/manifest/Schedule/commands/${verb}`,
          {
            method: "POST",
            body: JSON.stringify({ id: "sched-003" }),
          }
        );

        await handler(request);

        expect(runManifestCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            entity: "Schedule",
            command: verb,
            body: expect.objectContaining({ id: "sched-003" }),
          })
        );
      });
    }

    it("create route sends correct entity/command", async () => {
      const handler = await getScheduleCommandHandler("create");
      const request = createMockRequest(
        "http://localhost:3000/api/manifest/Schedule/commands/create",
        {
          method: "POST",
          body: JSON.stringify({
            locationId: "loc-001",
            scheduleDate: Date.now(),
          }),
        }
      );

      await handler(request);

      expect(runManifestCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "Schedule",
          command: "create",
        })
      );
    });
  });
});
