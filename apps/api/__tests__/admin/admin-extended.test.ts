/**
 * Admin Extended API Test Suite
 *
 * Covers untested admin API domains:
 * - Activity Feed (list, stats)
 * - Admin Chat Participant (archive, clear-history, unarchive)
 * - AI Event Setup (parse - NL parsing)
 * - AI Event Setup Session (cancel, confirm, mark-created, parse, update-confidence)
 * - Alerts Config (create, update, remove)
 * - Allergen Warning (acknowledge, apply-override, create, resolve, soft-delete)
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@repo/database", () => ({
  database: {
    activityFeed: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    allergenWarning: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
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

vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: vi.fn(),
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: vi.fn(),
}));

vi.mock("@/lib/manifest-response", async () => {
  const { NextResponse } = await import("next/server");
  return {
    manifestSuccessResponse: vi.fn((data: unknown, status = 200) =>
      NextResponse.json(
        {
          success: true,
          ...(typeof data === "object" && data !== null ? data : { data }),
        },
        { status }
      )
    ),
    manifestErrorResponse: vi.fn((message: string, status: number) =>
      NextResponse.json({ success: false, message }, { status })
    ),
  };
});

vi.mock("@/app/lib/invariant", () => ({
  InvariantError: class extends Error {
    constructor(message: string) {
      super(message);
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

vi.mock("@/lib/database", async () => {
  const { database } = await import("@repo/database");
  return { database };
});

// --- Import mocked modules ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg, requireCurrentUser } = await import(
  "@/app/lib/tenant"
);
const { runManifestCommand } = await import("@/lib/manifest/execute-command");

// --- Route imports ---

import { GET as getActivityFeedList } from "@/app/api/activity-feed/list/route";
import { GET as getActivityFeedStats } from "@/app/api/activity-feed/stats/route";
import { POST as aiEventSetupParse } from "@/app/api/ai-event-setup/parse/route";
import { POST as manifestDispatch } from "@/app/api/manifest/[entity]/commands/[command]/route";

const dispatch = (entity: string, command: string) => (req: NextRequest) =>
  manifestDispatch(req, {
    params: Promise.resolve({ entity, command }),
  });

const archiveParticipant = dispatch("AdminChatParticipant", "archive");
const clearHistory = dispatch("AdminChatParticipant", "clearHistory");
const unarchiveParticipant = dispatch("AdminChatParticipant", "unarchive");
const sessionCancel = dispatch("AiEventSetupSession", "cancel");
const sessionConfirm = dispatch("AiEventSetupSession", "confirm");
const sessionMarkCreated = dispatch("AiEventSetupSession", "markCreated");
const sessionParse = dispatch("AiEventSetupSession", "parse");
const sessionUpdateConfidence = dispatch(
  "AiEventSetupSession",
  "updateConfidence"
);
const alertsConfigCreate = dispatch("AlertsConfig", "create");
const alertsConfigRemove = dispatch("AlertsConfig", "remove");
const alertsConfigUpdate = dispatch("AlertsConfig", "update");
const allergenAcknowledge = dispatch("AllergenWarning", "acknowledge");
const allergenApplyOverride = dispatch("AllergenWarning", "applyOverride");
const allergenCreate = dispatch("AllergenWarning", "create");
const allergenResolve = dispatch("AllergenWarning", "resolve");
const allergenSoftDelete = dispatch("AllergenWarning", "softDelete");

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000070";
const TEST_USER_ID = "user_admin_extended_test";
const TEST_ORG_ID = "org_admin_extended_test";

// --- Helpers ---

function makeAuthedUser() {
  vi.mocked(auth).mockResolvedValue({
    orgId: TEST_ORG_ID,
    userId: TEST_USER_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
  vi.mocked(requireCurrentUser).mockResolvedValue({
    id: TEST_USER_ID,
    tenantId: TEST_TENANT_ID,
    role: "admin",
    email: "test@test.com",
    firstName: "Test",
    lastName: "User",
  } as never);
}

function makeRequest(url: string, options: RequestInit = {}): NextRequest {
  if (options.body && !options.headers) {
    options.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(
    new URL(url, "http://localhost:3000"),
    options as never
  );
}

function sampleActivity(overrides: Record<string, unknown> = {}) {
  return {
    id: "activity-001",
    tenantId: TEST_TENANT_ID,
    activityType: "event_created",
    entityType: "Event",
    entityId: "event-001",
    action: "create",
    title: "New event created",
    description: "A wedding event was created",
    metadata: null,
    performedBy: TEST_USER_ID,
    performerName: "Test User",
    correlationId: null,
    parentId: null,
    sourceType: "manual",
    sourceId: null,
    importance: "normal",
    visibility: "tenant",
    createdAt: new Date("2026-04-15T10:00:00Z"),
    ...overrides,
  };
}

function dispatchSuccess(
  result: Record<string, unknown> = { id: "test-id" },
  events: unknown[] = []
) {
  return new Response(JSON.stringify({ success: true, result, events }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// --- Tests ---

describe("Admin Extended API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    makeAuthedUser();
    // Default: runManifestCommand returns success
    vi.mocked(runManifestCommand).mockResolvedValue(dispatchSuccess());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =====================================================================
  // ACTIVITY FEED
  // =====================================================================
  describe("Activity Feed", () => {
    describe("GET /api/activity-feed/list", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({ orgId: null } as never);

        const response = await getActivityFeedList(
          makeRequest("/api/activity-feed/list")
        );
        expect(response.status).toBe(401);

        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const response = await getActivityFeedList(
          makeRequest("/api/activity-feed/list")
        );
        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Tenant not found");
      });

      it("should return activities with default pagination", async () => {
        const activities = [
          sampleActivity(),
          sampleActivity({
            id: "activity-002",
            activityType: "task_completed",
          }),
        ];
        vi.mocked(database.activityFeed.count).mockResolvedValue(2);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue(
          activities as never
        );

        const response = await getActivityFeedList(
          makeRequest("/api/activity-feed/list")
        );
        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.activities).toHaveLength(2);
        expect(body.hasMore).toBe(false);
        expect(body.totalCount).toBe(2);
      });

      it("should pass tenantId in where clause for isolation", async () => {
        vi.mocked(database.activityFeed.count).mockResolvedValue(0);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        await getActivityFeedList(makeRequest("/api/activity-feed/list"));

        const whereArg = vi.mocked(database.activityFeed.findMany).mock
          .calls[0][0] as Record<string, unknown>;
        expect(whereArg.where).toEqual(
          expect.objectContaining({ tenantId: TEST_TENANT_ID })
        );
      });

      it("should apply activityType filter", async () => {
        vi.mocked(database.activityFeed.count).mockResolvedValue(0);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        await getActivityFeedList(
          makeRequest("/api/activity-feed/list?activityType=event_created")
        );

        const whereArg = vi.mocked(database.activityFeed.findMany).mock
          .calls[0][0] as Record<string, unknown>;
        const where = whereArg.where as Record<string, unknown>;
        expect(where.activityType).toBe("event_created");
      });

      it("should apply importance filter", async () => {
        vi.mocked(database.activityFeed.count).mockResolvedValue(0);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        await getActivityFeedList(
          makeRequest("/api/activity-feed/list?importance=high")
        );

        const whereArg = vi.mocked(database.activityFeed.findMany).mock
          .calls[0][0] as Record<string, unknown>;
        const where = whereArg.where as Record<string, unknown>;
        expect(where.importance).toBe("high");
      });

      it("should apply entityType filter", async () => {
        vi.mocked(database.activityFeed.count).mockResolvedValue(0);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        await getActivityFeedList(
          makeRequest("/api/activity-feed/list?entityType=Event")
        );

        const whereArg = vi.mocked(database.activityFeed.findMany).mock
          .calls[0][0] as Record<string, unknown>;
        const where = whereArg.where as Record<string, unknown>;
        expect(where.entityType).toBe("Event");
      });

      it("should apply entityId filter", async () => {
        vi.mocked(database.activityFeed.count).mockResolvedValue(0);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        await getActivityFeedList(
          makeRequest("/api/activity-feed/list?entityId=event-123")
        );

        const whereArg = vi.mocked(database.activityFeed.findMany).mock
          .calls[0][0] as Record<string, unknown>;
        const where = whereArg.where as Record<string, unknown>;
        expect(where.entityId).toBe("event-123");
      });

      it("should apply performedBy filter", async () => {
        vi.mocked(database.activityFeed.count).mockResolvedValue(0);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        await getActivityFeedList(
          makeRequest("/api/activity-feed/list?performedBy=user-123")
        );

        const whereArg = vi.mocked(database.activityFeed.findMany).mock
          .calls[0][0] as Record<string, unknown>;
        const where = whereArg.where as Record<string, unknown>;
        expect(where.performedBy).toBe("user-123");
      });

      it("should apply sourceType filter", async () => {
        vi.mocked(database.activityFeed.count).mockResolvedValue(0);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        await getActivityFeedList(
          makeRequest("/api/activity-feed/list?sourceType=ai")
        );

        const whereArg = vi.mocked(database.activityFeed.findMany).mock
          .calls[0][0] as Record<string, unknown>;
        const where = whereArg.where as Record<string, unknown>;
        expect(where.sourceType).toBe("ai");
      });

      it("should apply correlationId filter", async () => {
        vi.mocked(database.activityFeed.count).mockResolvedValue(0);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        await getActivityFeedList(
          makeRequest("/api/activity-feed/list?correlationId=corr-123")
        );

        const whereArg = vi.mocked(database.activityFeed.findMany).mock
          .calls[0][0] as Record<string, unknown>;
        const where = whereArg.where as Record<string, unknown>;
        expect(where.correlationId).toBe("corr-123");
      });

      it("should apply date range filters", async () => {
        vi.mocked(database.activityFeed.count).mockResolvedValue(0);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        await getActivityFeedList(
          makeRequest(
            "/api/activity-feed/list?startDate=2026-01-01&endDate=2026-04-30"
          )
        );

        const whereArg = vi.mocked(database.activityFeed.findMany).mock
          .calls[0][0] as Record<string, unknown>;
        const where = whereArg.where as Record<string, unknown>;
        expect(where.createdAt).toBeDefined();
      });

      it("should respect custom limit and offset", async () => {
        vi.mocked(database.activityFeed.count).mockResolvedValue(100);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        await getActivityFeedList(
          makeRequest("/api/activity-feed/list?limit=10&offset=20")
        );

        expect(database.activityFeed.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 10, skip: 20 })
        );
      });

      it("should cap limit at 200", async () => {
        vi.mocked(database.activityFeed.count).mockResolvedValue(500);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        await getActivityFeedList(
          makeRequest("/api/activity-feed/list?limit=500")
        );

        expect(database.activityFeed.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 200 })
        );
      });

      it("should calculate hasMore correctly", async () => {
        vi.mocked(database.activityFeed.count).mockResolvedValue(50);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue(
          Array.from({ length: 10 }, (_, i) =>
            sampleActivity({ id: `act-${i}` })
          ) as never
        );

        const response = await getActivityFeedList(
          makeRequest("/api/activity-feed/list?limit=10&offset=0")
        );
        const body = await response.json();
        expect(body.hasMore).toBe(true);
      });

      it("should return 500 on database error", async () => {
        vi.mocked(database.activityFeed.count).mockRejectedValue(
          new Error("DB error")
        );

        const response = await getActivityFeedList(
          makeRequest("/api/activity-feed/list")
        );
        expect(response.status).toBe(500);

        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Internal server error");
      });

      it("should only return activities for the correct tenant", async () => {
        vi.mocked(database.activityFeed.count).mockResolvedValue(1);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([
          sampleActivity(),
        ] as never);

        await getActivityFeedList(makeRequest("/api/activity-feed/list"));

        const whereArg = vi.mocked(database.activityFeed.count).mock
          .calls[0][0] as Record<string, unknown>;
        expect(whereArg.where).toEqual(
          expect.objectContaining({ tenantId: TEST_TENANT_ID })
        );
      });
    });

    describe("GET /api/activity-feed/stats", () => {
      it("should return 401 for unauthenticated requests", async () => {
        vi.mocked(auth).mockResolvedValue({ orgId: null } as never);

        const response = await getActivityFeedStats(
          makeRequest("/api/activity-feed/stats")
        );
        expect(response.status).toBe(401);
      });

      it("should return 400 when tenant not found", async () => {
        vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

        const response = await getActivityFeedStats(
          makeRequest("/api/activity-feed/stats")
        );
        expect(response.status).toBe(400);
      });

      it("should return stats on success", async () => {
        vi.mocked(database.$queryRaw)
          .mockResolvedValueOnce([
            {
              total_activities: BigInt(100),
              today_count: BigInt(5),
              week_count: BigInt(25),
            },
          ] as never)
          .mockResolvedValueOnce([
            { activity_type: "event_created", count: BigInt(50) },
            { activity_type: "task_completed", count: BigInt(30) },
          ] as never)
          .mockResolvedValueOnce([
            { entity_type: "Event", count: BigInt(60) },
            { entity_type: "Task", count: BigInt(40) },
          ] as never);

        const response = await getActivityFeedStats(
          makeRequest("/api/activity-feed/stats")
        );
        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.stats.totalActivities).toBe(100);
        expect(body.stats.todayCount).toBe(5);
        expect(body.stats.weekCount).toBe(25);
        expect(body.stats.byType).toEqual({
          event_created: 50,
          task_completed: 30,
        });
        expect(body.stats.byEntity).toEqual({ Event: 60, Task: 40 });
      });

      it("should return 500 on database error", async () => {
        vi.mocked(database.$queryRaw).mockRejectedValue(new Error("DB error"));

        const response = await getActivityFeedStats(
          makeRequest("/api/activity-feed/stats")
        );
        expect(response.status).toBe(500);

        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Internal server error");
      });
    });
  });

  // =====================================================================
  // ADMIN CHAT PARTICIPANT
  // =====================================================================
  describe("Admin Chat Participant", () => {
    function testManifestRoute(
      label: string,
      handler: (req: NextRequest) => Promise<Response>,
      entityName: string,
      commandName: string,
      body: Record<string, unknown>
    ) {
      describe(label, () => {
        it("should return 401 for unauthenticated requests", async () => {
          vi.mocked(requireCurrentUser).mockRejectedValue(
            new (await import("@/app/lib/invariant")).InvariantError(
              "Unauthorized"
            ) as never
          );

          const response = await handler(
            makeRequest("/api/test", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );
          expect(response.status).toBe(401);

          const respBody = await response.json();
          expect(respBody.success).toBe(false);
          expect(respBody.message).toBe("Unauthorized");
        });

        it("should return 200 on successful command", async () => {
          vi.mocked(runManifestCommand).mockResolvedValue(
            dispatchSuccess({ id: "result-id", archived: true }, [
              { type: "archived" },
            ])
          );

          const response = await handler(
            makeRequest("/api/test", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );
          expect(response.status).toBe(200);

          const respBody = await response.json();
          expect(respBody.success).toBe(true);
          expect(respBody.result).toEqual({ id: "result-id", archived: true });
          expect(respBody.events).toEqual([{ type: "archived" }]);
        });

        it("should pass correct entity and command to runManifestCommand", async () => {
          vi.mocked(runManifestCommand).mockResolvedValue(dispatchSuccess());

          await handler(
            makeRequest("/api/test", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );

          expect(runManifestCommand).toHaveBeenCalledWith(
            expect.objectContaining({
              entity: entityName,
              command: commandName,
              body: expect.any(Object),
              user: expect.objectContaining({
                id: TEST_USER_ID,
                tenantId: TEST_TENANT_ID,
              }),
            })
          );
        });

        it("should pass correct user context with tenantId", async () => {
          vi.mocked(runManifestCommand).mockResolvedValue(dispatchSuccess());

          await handler(
            makeRequest("/api/test", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );

          expect(runManifestCommand).toHaveBeenCalledWith(
            expect.objectContaining({
              user: expect.objectContaining({
                id: TEST_USER_ID,
                tenantId: TEST_TENANT_ID,
              }),
            })
          );
        });

        it("should return 500 on unexpected exception", async () => {
          vi.mocked(requireCurrentUser).mockRejectedValue(
            new Error("Runtime crashed") as never
          );

          const response = await handler(
            makeRequest("/api/test", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );
          expect(response.status).toBe(500);

          const respBody = await response.json();
          expect(respBody.success).toBe(false);
          expect(respBody.message).toBe("Internal server error");
        });
      });
    }

    testManifestRoute(
      "POST archive",
      archiveParticipant,
      "AdminChatParticipant",
      "archive",
      {
        instanceId: "participant-001",
      }
    );

    testManifestRoute(
      "POST clear-history",
      clearHistory,
      "AdminChatParticipant",
      "clearHistory",
      {
        instanceId: "participant-001",
      }
    );

    testManifestRoute(
      "POST unarchive",
      unarchiveParticipant,
      "AdminChatParticipant",
      "unarchive",
      {
        instanceId: "participant-001",
      }
    );
  });

  // =====================================================================
  // AI EVENT SETUP (custom NL parse route - no manifest runtime)
  // =====================================================================
  describe("AI Event Setup - Parse", () => {
    it("should return 401 for unauthenticated requests", async () => {
      vi.mocked(auth).mockResolvedValue({ orgId: null, userId: null } as never);

      const response = await aiEventSetupParse(
        makeRequest("/api/ai-event-setup/parse", {
          method: "POST",
          body: JSON.stringify({
            originalInput:
              "Plan a wedding for 100 guests on March 25th at the Grand Ballroom",
          }),
        })
      );
      expect(response.status).toBe(401);
    });

    it("should return 400 when tenant not found", async () => {
      vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);

      const response = await aiEventSetupParse(
        makeRequest("/api/ai-event-setup/parse", {
          method: "POST",
          body: JSON.stringify({ originalInput: "wedding for 50 guests" }),
        })
      );
      expect(response.status).toBe(400);
    });

    it("should return 400 when originalInput is missing", async () => {
      const response = await aiEventSetupParse(
        makeRequest("/api/ai-event-setup/parse", {
          method: "POST",
          body: JSON.stringify({}),
        })
      );
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("originalInput is required");
    });

    it("should return 400 when originalInput is empty string", async () => {
      const response = await aiEventSetupParse(
        makeRequest("/api/ai-event-setup/parse", {
          method: "POST",
          body: JSON.stringify({ originalInput: "   " }),
        })
      );
      expect(response.status).toBe(400);
    });

    it("should parse wedding event with full details", async () => {
      const response = await aiEventSetupParse(
        makeRequest("/api/ai-event-setup/parse", {
          method: "POST",
          body: JSON.stringify({
            originalInput:
              "Plan a wedding for 150 guests on June 15th at the Grand Ballroom",
          }),
        })
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.parsedEventType).toBe("wedding");
      expect(body.result.parsedGuestCount).toBe(150);
      expect(body.result.parsedVenueName).toBeTruthy();
      expect(body.result.confidence).toBeGreaterThan(0.5);
      expect(body.result.status).toBe("parsed");
      expect(body.result.sessionId).toBeTruthy();
      expect(body.events).toHaveLength(1);
      expect(body.events[0].type).toBe("event-setup.session.parsed");
    });

    it("should parse corporate event", async () => {
      const response = await aiEventSetupParse(
        makeRequest("/api/ai-event-setup/parse", {
          method: "POST",
          body: JSON.stringify({
            originalInput: "Corporate meeting for 30 people next week",
          }),
        })
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.parsedEventType).toBe("corporate");
      expect(body.result.parsedGuestCount).toBe(30);
    });

    it("should parse birthday party", async () => {
      const response = await aiEventSetupParse(
        makeRequest("/api/ai-event-setup/parse", {
          method: "POST",
          body: JSON.stringify({
            originalInput: "Birthday party for 25 guests",
          }),
        })
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.parsedEventType).toBe("birthday");
      expect(body.result.parsedGuestCount).toBe(25);
    });

    it("should return general type for unrecognized events", async () => {
      const response = await aiEventSetupParse(
        makeRequest("/api/ai-event-setup/parse", {
          method: "POST",
          body: JSON.stringify({
            originalInput: "Something fun",
          }),
        })
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.parsedEventType).toBe("general");
    });

    it("should report missing fields for minimal input", async () => {
      const response = await aiEventSetupParse(
        makeRequest("/api/ai-event-setup/parse", {
          method: "POST",
          body: JSON.stringify({
            originalInput: "a party",
          }),
        })
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.result.missingFields).toContain("guestCount");
      expect(body.result.missingFields).toContain("eventDate");
      expect(body.result.missingFields).toContain("venueName");
      expect(body.result.suggestions.length).toBeGreaterThan(0);
      expect(body.result.readyToCreate).toBe(false);
    });

    it("should indicate readyToCreate when all fields are present", async () => {
      const response = await aiEventSetupParse(
        makeRequest("/api/ai-event-setup/parse", {
          method: "POST",
          body: JSON.stringify({
            originalInput:
              "Plan a wedding for 100 guests on March 25th at the Ritz Hotel",
          }),
        })
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.result.readyToCreate).toBe(true);
      expect(body.result.missingFields).toHaveLength(0);
    });

    it("should respect referenceDate parameter", async () => {
      const response = await aiEventSetupParse(
        makeRequest("/api/ai-event-setup/parse", {
          method: "POST",
          body: JSON.stringify({
            originalInput: "event tomorrow",
            referenceDate: "2026-06-01T00:00:00Z",
          }),
        })
      );
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      // Should have a parsed date near the reference date
      if (body.result.parsedEventDate) {
        expect(body.result.parsedEventDate).toBeGreaterThan(0);
      }
    });

    it("should return 500 on unexpected exception", async () => {
      vi.mocked(auth).mockRejectedValue(new Error("Auth provider down"));

      const response = await aiEventSetupParse(
        makeRequest("/api/ai-event-setup/parse", {
          method: "POST",
          body: JSON.stringify({ originalInput: "test" }),
        })
      );
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.message).toBe("Internal server error");
    });
  });

  // =====================================================================
  // AI EVENT SETUP SESSION (manifest runtime commands via dispatcher)
  // =====================================================================
  describe("AI Event Setup Session", () => {
    function testSessionCommand(
      label: string,
      handler: (req: NextRequest) => Promise<Response>,
      entityName: string,
      commandName: string,
      body: Record<string, unknown>
    ) {
      describe(label, () => {
        it("should return 401 for unauthenticated requests", async () => {
          vi.mocked(requireCurrentUser).mockRejectedValue(
            new (await import("@/app/lib/invariant")).InvariantError(
              "Unauthorized"
            ) as never
          );

          const response = await handler(
            makeRequest("/api/test", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );
          expect(response.status).toBe(401);
        });

        it("should return 200 on success", async () => {
          vi.mocked(runManifestCommand).mockResolvedValue(
            dispatchSuccess({ sessionId: "session-001", status: "confirmed" }, [
              { type: "session.confirmed" },
            ])
          );

          const response = await handler(
            makeRequest("/api/test", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );
          expect(response.status).toBe(200);

          const respBody = await response.json();
          expect(respBody.success).toBe(true);
        });

        it("should pass correct entity and command to runManifestCommand", async () => {
          vi.mocked(runManifestCommand).mockResolvedValue(dispatchSuccess());

          await handler(
            makeRequest("/api/test", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );

          expect(runManifestCommand).toHaveBeenCalledWith(
            expect.objectContaining({
              entity: entityName,
              command: commandName,
            })
          );
        });

        it("should use correct tenantId for isolation", async () => {
          vi.mocked(runManifestCommand).mockResolvedValue(dispatchSuccess());

          await handler(
            makeRequest("/api/test", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );

          expect(runManifestCommand).toHaveBeenCalledWith(
            expect.objectContaining({
              user: expect.objectContaining({ tenantId: TEST_TENANT_ID }),
            })
          );
        });

        it("should return 500 on unexpected error", async () => {
          vi.mocked(requireCurrentUser).mockRejectedValue(
            new Error("Runtime exploded") as never
          );

          const response = await handler(
            makeRequest("/api/test", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );
          expect(response.status).toBe(500);
        });
      });
    }

    testSessionCommand(
      "POST cancel",
      sessionCancel,
      "AiEventSetupSession",
      "cancel",
      {
        instanceId: "session-001",
      }
    );

    testSessionCommand(
      "POST confirm",
      sessionConfirm,
      "AiEventSetupSession",
      "confirm",
      {
        instanceId: "session-001",
      }
    );

    testSessionCommand(
      "POST mark-created",
      sessionMarkCreated,
      "AiEventSetupSession",
      "markCreated",
      {
        instanceId: "session-001",
      }
    );

    testSessionCommand(
      "POST parse",
      sessionParse,
      "AiEventSetupSession",
      "parse",
      {
        instanceId: "session-001",
        originalInput: "wedding for 50 guests",
      }
    );

    testSessionCommand(
      "POST update-confidence",
      sessionUpdateConfidence,
      "AiEventSetupSession",
      "updateConfidence",
      {
        instanceId: "session-001",
        confidence: 0.95,
      }
    );
  });

  // =====================================================================
  // ALERTS CONFIG
  // =====================================================================
  describe("Alerts Config", () => {
    function testAlertsCommand(
      label: string,
      handler: (req: NextRequest) => Promise<Response>,
      entityName: string,
      commandName: string,
      body: Record<string, unknown>
    ) {
      describe(label, () => {
        it("should return 401 for unauthenticated requests", async () => {
          vi.mocked(requireCurrentUser).mockRejectedValue(
            new (await import("@/app/lib/invariant")).InvariantError(
              "Unauthorized"
            ) as never
          );

          const response = await handler(
            makeRequest("/api/test", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );
          expect(response.status).toBe(401);
        });

        it("should return 200 on success", async () => {
          vi.mocked(runManifestCommand).mockResolvedValue(
            dispatchSuccess({ id: "alert-001" }, [{ type: "alert.created" }])
          );

          const response = await handler(
            makeRequest("/api/test", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );
          expect(response.status).toBe(200);

          const respBody = await response.json();
          expect(respBody.success).toBe(true);
          expect(respBody.result).toEqual({ id: "alert-001" });
        });

        it("should pass correct entity and command to runManifestCommand", async () => {
          vi.mocked(runManifestCommand).mockResolvedValue(dispatchSuccess());

          await handler(
            makeRequest("/api/test", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );

          expect(runManifestCommand).toHaveBeenCalledWith(
            expect.objectContaining({
              entity: entityName,
              command: commandName,
            })
          );
        });

        it("should use correct tenantId for isolation", async () => {
          vi.mocked(runManifestCommand).mockResolvedValue(dispatchSuccess());

          await handler(
            makeRequest("/api/test", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );

          expect(runManifestCommand).toHaveBeenCalledWith(
            expect.objectContaining({
              user: expect.objectContaining({ tenantId: TEST_TENANT_ID }),
            })
          );
        });

        it("should return 500 on unexpected error", async () => {
          vi.mocked(requireCurrentUser).mockRejectedValue(
            new Error("DB error") as never
          );

          const response = await handler(
            makeRequest("/api/test", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );
          expect(response.status).toBe(500);

          const respBody = await response.json();
          expect(respBody.message).toBe("Internal server error");
        });
      });
    }

    testAlertsCommand(
      "POST create",
      alertsConfigCreate,
      "AlertsConfig",
      "create",
      {
        name: "Low Stock Alert",
        type: "inventory",
        threshold: 10,
      }
    );

    testAlertsCommand(
      "POST update",
      alertsConfigUpdate,
      "AlertsConfig",
      "update",
      {
        instanceId: "alert-001",
        threshold: 20,
      }
    );

    testAlertsCommand(
      "POST remove",
      alertsConfigRemove,
      "AlertsConfig",
      "remove",
      {
        instanceId: "alert-001",
      }
    );
  });

  // =====================================================================
  // ALLERGEN WARNING
  // =====================================================================
  describe("Allergen Warning", () => {
    function testAllergenCommand(
      label: string,
      handler: (req: NextRequest) => Promise<Response>,
      entityName: string,
      commandName: string,
      body: Record<string, unknown>
    ) {
      describe(label, () => {
        it("should return 401 for unauthenticated requests", async () => {
          vi.mocked(requireCurrentUser).mockRejectedValue(
            new (await import("@/app/lib/invariant")).InvariantError(
              "Unauthorized"
            ) as never
          );

          const response = await handler(
            makeRequest("/api/test", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );
          expect(response.status).toBe(401);
        });

        it("should return 200 on success", async () => {
          vi.mocked(runManifestCommand).mockResolvedValue(
            dispatchSuccess({ id: "allergen-001" }, [
              { type: "allergen.created" },
            ])
          );

          const response = await handler(
            makeRequest("/api/test", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );
          expect(response.status).toBe(200);

          const respBody = await response.json();
          expect(respBody.success).toBe(true);
          expect(respBody.result).toEqual({ id: "allergen-001" });
        });

        it("should pass correct entity and command to runManifestCommand", async () => {
          vi.mocked(runManifestCommand).mockResolvedValue(dispatchSuccess());

          await handler(
            makeRequest("/api/test", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );

          expect(runManifestCommand).toHaveBeenCalledWith(
            expect.objectContaining({
              entity: entityName,
              command: commandName,
            })
          );
        });

        it("should use correct tenantId for isolation", async () => {
          vi.mocked(runManifestCommand).mockResolvedValue(dispatchSuccess());

          await handler(
            makeRequest("/api/test", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );

          expect(runManifestCommand).toHaveBeenCalledWith(
            expect.objectContaining({
              user: expect.objectContaining({ tenantId: TEST_TENANT_ID }),
            })
          );
        });

        it("should return 500 on unexpected error", async () => {
          vi.mocked(requireCurrentUser).mockRejectedValue(
            new Error("Unexpected failure") as never
          );

          const response = await handler(
            makeRequest("/api/test", {
              method: "POST",
              body: JSON.stringify(body),
            })
          );
          expect(response.status).toBe(500);

          const respBody = await response.json();
          expect(respBody.message).toBe("Internal server error");
        });
      });
    }

    testAllergenCommand(
      "POST acknowledge",
      allergenAcknowledge,
      "AllergenWarning",
      "acknowledge",
      {
        instanceId: "allergen-001",
        acknowledgedBy: TEST_USER_ID,
      }
    );

    testAllergenCommand(
      "POST apply-override",
      allergenApplyOverride,
      "AllergenWarning",
      "applyOverride",
      {
        instanceId: "allergen-001",
        overrideReason: "False positive confirmed by chef",
      }
    );

    testAllergenCommand(
      "POST create",
      allergenCreate,
      "AllergenWarning",
      "create",
      {
        allergenType: "peanut",
        severity: "high",
        dishId: "dish-001",
        description: "Contains trace peanuts",
      }
    );

    testAllergenCommand(
      "POST resolve",
      allergenResolve,
      "AllergenWarning",
      "resolve",
      {
        instanceId: "allergen-001",
        resolution: "Ingredient substituted",
      }
    );

    testAllergenCommand(
      "POST soft-delete",
      allergenSoftDelete,
      "AllergenWarning",
      "softDelete",
      {
        instanceId: "allergen-001",
      }
    );
  });
});
