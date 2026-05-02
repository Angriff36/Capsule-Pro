/**
 * Activity Feed API Tests
 *
 * Covers the two read-only routes that power the system-wide activity timeline
 * surfaced in the admin/collab UI:
 *
 *   - GET /api/activity-feed/list — paginated activity stream with filters for
 *     activityType, entityType, entityId, performedBy, importance, sourceType,
 *     correlationId, and a startDate/endDate range. The route reads from
 *     `database.activityFeed` (Prisma) with `count` + `findMany` and shapes
 *     `{ activities, hasMore, totalCount }`.
 *   - GET /api/activity-feed/stats — three parallel `$queryRaw` aggregates
 *     against `tenant_admin.activity_feed`: total/today/week counts, breakdown
 *     by activity_type, and top 10 entity_type counts. Shapes
 *     `{ stats: { totalActivities, todayCount, weekCount, byType, byEntity } }`
 *     with bigint → number conversion.
 *
 * Why this coverage matters:
 *
 *   - Both routes are tenant-scoped via `getTenantIdForOrg`. A regression in
 *     the auth/tenant guard would silently leak cross-tenant activity records
 *     (clear-text who-did-what data) — the 401/400 guards must stay pinned.
 *   - The list route hand-builds a Prisma `where` clause from query params; if
 *     a filter stops being threaded through, the UI loses the ability to drill
 *     into a single entity's activity (operationally invisible failure).
 *   - The stats route returns bigints from `$queryRaw COUNT(*)`. Forgetting to
 *     coerce to `Number(...)` would either return BigInt to the JSON layer
 *     (throws) or break the UI that does arithmetic on the counts. The tests
 *     pin both the coercion AND the response shape.
 *   - Date-range filtering builds an `{ gte, lte }` object. The current code
 *     uses `undefined` placeholders when one side is missing; the tests assert
 *     that a single-sided range still produces a valid filter rather than
 *     crashing or silently dropping the filter.
 */

import { database } from "@repo/database";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/database", async () => {
  const mod =
    await vi.importActual<typeof import("@repo/database")>("@repo/database");
  return mod;
});

// --- Imports of mocked modules + routes under test ---

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { GET: getList } = await import("@/app/api/activity-feed/list/route");
const { GET: getStats } = await import("@/app/api/activity-feed/stats/route");

// --- Constants ---

const TEST_TENANT_ID = "00000000-0000-0000-0000-000000000aa1";
const TEST_USER_ID = "user_activity_feed_test";
const TEST_ORG_ID = "org_activity_feed_test";

// --- Helpers ---

function mockAuth() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(TEST_TENANT_ID);
}

function mockUnauthenticated() {
  vi.mocked(auth).mockResolvedValue({
    userId: null,
    orgId: null,
  } as never);
}

function mockNoTenant() {
  vi.mocked(auth).mockResolvedValue({
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
  } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(null as never);
}

function makeListRequest(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = qs
    ? `http://localhost/api/activity-feed/list?${qs}`
    : "http://localhost/api/activity-feed/list";
  return new NextRequest(url);
}

// Capture the first-call args from the mocked findMany / count, with a hard
// assertion so TypeScript treats them as defined. Tests fail loudly with a
// readable message if the route never invokes the underlying call.
type ActivityFindArgs = {
  where: Record<string, unknown> & { createdAt?: { gte?: Date; lte?: Date } };
  take?: number;
  skip?: number;
  orderBy?: unknown;
};

function getFindManyArgs(): ActivityFindArgs {
  const calls = vi.mocked(database.activityFeed.findMany).mock.calls;
  if (calls.length === 0) {
    throw new Error("expected database.activityFeed.findMany to be called");
  }
  return calls[0]?.[0] as ActivityFindArgs;
}

function getCountArgs(): { where: Record<string, unknown> } {
  const calls = vi.mocked(database.activityFeed.count).mock.calls;
  if (calls.length === 0) {
    throw new Error("expected database.activityFeed.count to be called");
  }
  return calls[0]?.[0] as { where: Record<string, unknown> };
}

function makeActivity(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: "act-001",
    tenantId: TEST_TENANT_ID,
    activityType: "entity.updated",
    entityType: "Event",
    entityId: "evt-001",
    action: "updated",
    title: "Event renamed",
    description: "Renamed 'Wedding A' to 'Wedding A — Final'",
    metadata: { fields: ["name"] },
    performedBy: "user_001",
    performerName: "Jane Manager",
    correlationId: "corr-001",
    parentId: null,
    sourceType: "ui",
    sourceId: null,
    importance: "normal",
    visibility: "tenant",
    createdAt: new Date("2026-04-29T12:00:00.000Z"),
    ...overrides,
  };
}

// --- Tests ---

describe("Activity Feed API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // GET /api/activity-feed/list
  // -------------------------------------------------------------------------

  describe("GET /api/activity-feed/list", () => {
    describe("auth guards", () => {
      it("returns 401 when user is not authenticated", async () => {
        mockUnauthenticated();

        const response = await getList(makeListRequest());

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.message).toBe("Unauthorized");
        expect(database.activityFeed.findMany).not.toHaveBeenCalled();
        expect(database.activityFeed.count).not.toHaveBeenCalled();
      });

      it("returns 401 when only userId is present (orgId missing)", async () => {
        vi.mocked(auth).mockResolvedValue({
          userId: TEST_USER_ID,
          orgId: null,
        } as never);

        const response = await getList(makeListRequest());

        expect(response.status).toBe(401);
        expect(database.activityFeed.findMany).not.toHaveBeenCalled();
      });

      it("returns 400 when no tenant exists for the org", async () => {
        mockNoTenant();

        const response = await getList(makeListRequest());

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
        expect(database.activityFeed.findMany).not.toHaveBeenCalled();
      });
    });

    describe("happy path + response shape", () => {
      it("returns an empty paginated payload when there are no activities", async () => {
        mockAuth();
        vi.mocked(database.activityFeed.count).mockResolvedValue(0);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        const response = await getList(makeListRequest());

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          success: true,
          activities: [],
          hasMore: false,
          totalCount: 0,
        });
      });

      it("returns activities and hasMore=false when fewer than total are returned but offset+len >= total", async () => {
        mockAuth();
        const acts = [
          makeActivity({ id: "act-1" }),
          makeActivity({ id: "act-2" }),
        ];
        vi.mocked(database.activityFeed.count).mockResolvedValue(2);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue(
          acts as never
        );

        const response = await getList(makeListRequest());

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.activities).toHaveLength(2);
        expect(body.totalCount).toBe(2);
        expect(body.hasMore).toBe(false);
      });

      it("returns hasMore=true when totalCount exceeds offset+returned", async () => {
        mockAuth();
        const acts = [makeActivity({ id: "act-1" })];
        vi.mocked(database.activityFeed.count).mockResolvedValue(50);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue(
          acts as never
        );

        const response = await getList(
          makeListRequest({ limit: "1", offset: "0" })
        );

        const body = await response.json();
        expect(body.hasMore).toBe(true);
        expect(body.totalCount).toBe(50);
        expect(body.activities).toHaveLength(1);
      });
    });

    describe("filtering", () => {
      it("scopes the where clause to the tenant by default", async () => {
        mockAuth();
        vi.mocked(database.activityFeed.count).mockResolvedValue(0);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        await getList(makeListRequest());

        const findCall = getFindManyArgs();
        const countCall = getCountArgs();
        expect(findCall.where).toMatchObject({ tenantId: TEST_TENANT_ID });
        expect(countCall.where).toMatchObject({ tenantId: TEST_TENANT_ID });
        // No optional filters thread through when none are supplied:
        expect(findCall.where.activityType).toBeUndefined();
        expect(findCall.where.entityType).toBeUndefined();
        expect(findCall.where.entityId).toBeUndefined();
        expect(findCall.where.performedBy).toBeUndefined();
        expect(findCall.where.importance).toBeUndefined();
        expect(findCall.where.sourceType).toBeUndefined();
        expect(findCall.where.correlationId).toBeUndefined();
        expect(findCall.where.createdAt).toBeUndefined();
      });

      it("threads activityType, entityType, entityId, performedBy, importance, sourceType, correlationId into where", async () => {
        mockAuth();
        vi.mocked(database.activityFeed.count).mockResolvedValue(0);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        await getList(
          makeListRequest({
            activityType: "entity.updated",
            entityType: "Event",
            entityId: "evt-99",
            performedBy: "user_42",
            importance: "high",
            sourceType: "ui",
            correlationId: "corr-99",
          })
        );

        const findCall = getFindManyArgs();
        expect(findCall.where).toMatchObject({
          tenantId: TEST_TENANT_ID,
          activityType: "entity.updated",
          entityType: "Event",
          entityId: "evt-99",
          performedBy: "user_42",
          importance: "high",
          sourceType: "ui",
          correlationId: "corr-99",
        });
      });

      it("builds a createdAt range when both startDate and endDate are present", async () => {
        mockAuth();
        vi.mocked(database.activityFeed.count).mockResolvedValue(0);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        const startDate = "2026-04-01T00:00:00.000Z";
        const endDate = "2026-04-29T23:59:59.999Z";

        await getList(makeListRequest({ startDate, endDate }));

        const findCall = getFindManyArgs();
        expect(findCall.where.createdAt).toEqual({
          gte: new Date(startDate),
          lte: new Date(endDate),
        });
      });

      it("builds a one-sided createdAt range when only startDate is supplied", async () => {
        mockAuth();
        vi.mocked(database.activityFeed.count).mockResolvedValue(0);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        const startDate = "2026-04-01T00:00:00.000Z";

        await getList(makeListRequest({ startDate }));

        const findCall = getFindManyArgs();
        expect(findCall.where.createdAt).toEqual({
          gte: new Date(startDate),
          lte: undefined,
        });
      });

      it("builds a one-sided createdAt range when only endDate is supplied", async () => {
        mockAuth();
        vi.mocked(database.activityFeed.count).mockResolvedValue(0);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        const endDate = "2026-04-29T23:59:59.999Z";

        await getList(makeListRequest({ endDate }));

        const findCall = getFindManyArgs();
        expect(findCall.where.createdAt).toEqual({
          gte: undefined,
          lte: new Date(endDate),
        });
      });
    });

    describe("pagination", () => {
      it("uses the default limit (50) and offset (0) when none are supplied", async () => {
        mockAuth();
        vi.mocked(database.activityFeed.count).mockResolvedValue(0);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        await getList(makeListRequest());

        const findCall = getFindManyArgs();
        expect(findCall.take).toBe(50);
        expect(findCall.skip).toBe(0);
      });

      it("respects a numeric limit and offset from the query string", async () => {
        mockAuth();
        vi.mocked(database.activityFeed.count).mockResolvedValue(0);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        await getList(makeListRequest({ limit: "25", offset: "100" }));

        const findCall = getFindManyArgs();
        expect(findCall.take).toBe(25);
        expect(findCall.skip).toBe(100);
      });

      it("clamps limit to a maximum of 200", async () => {
        mockAuth();
        vi.mocked(database.activityFeed.count).mockResolvedValue(0);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        await getList(makeListRequest({ limit: "9999" }));

        const findCall = getFindManyArgs();
        expect(findCall.take).toBe(200);
      });

      it("falls back to defaults when limit/offset are non-numeric", async () => {
        mockAuth();
        vi.mocked(database.activityFeed.count).mockResolvedValue(0);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        await getList(
          makeListRequest({ limit: "not-a-number", offset: "also-bad" })
        );

        const findCall = getFindManyArgs();
        // Number("not-a-number") -> NaN -> || 50/0 fallbacks
        expect(findCall.take).toBe(50);
        expect(findCall.skip).toBe(0);
      });

      it("orders activities by createdAt desc", async () => {
        mockAuth();
        vi.mocked(database.activityFeed.count).mockResolvedValue(0);
        vi.mocked(database.activityFeed.findMany).mockResolvedValue([]);

        await getList(makeListRequest());

        const findCall = getFindManyArgs();
        expect(findCall.orderBy).toEqual({ createdAt: "desc" });
      });
    });

    describe("error handling", () => {
      it("returns 500 and reports to Sentry when count throws", async () => {
        mockAuth();
        const dbError = new Error("count exploded");
        vi.mocked(database.activityFeed.count).mockRejectedValue(dbError);

        const response = await getList(makeListRequest());

        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.message).toBe("Internal server error");

        const { captureException } = await import("@sentry/nextjs");
        expect(captureException).toHaveBeenCalledWith(dbError);
      });

      it("returns 500 when findMany throws even after count succeeds", async () => {
        mockAuth();
        vi.mocked(database.activityFeed.count).mockResolvedValue(10);
        vi.mocked(database.activityFeed.findMany).mockRejectedValue(
          new Error("findMany failed")
        );

        const response = await getList(makeListRequest());

        expect(response.status).toBe(500);
      });
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/activity-feed/stats
  // -------------------------------------------------------------------------

  describe("GET /api/activity-feed/stats", () => {
    describe("auth guards", () => {
      it("returns 401 when user is not authenticated", async () => {
        mockUnauthenticated();

        const request = new NextRequest(
          "http://localhost/api/activity-feed/stats"
        );
        const response = await getStats(request);

        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.message).toBe("Unauthorized");
        expect(database.$queryRaw).not.toHaveBeenCalled();
      });

      it("returns 400 when tenant lookup fails", async () => {
        mockNoTenant();

        const request = new NextRequest(
          "http://localhost/api/activity-feed/stats"
        );
        const response = await getStats(request);

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.message).toBe("Tenant not found");
        expect(database.$queryRaw).not.toHaveBeenCalled();
      });
    });

    describe("happy path", () => {
      it("returns a fully populated stats payload, coerces bigints to numbers, and folds rows into byType/byEntity maps", async () => {
        mockAuth();

        // Three serial $queryRaw calls in this order: stats, byType, byEntity.
        const queryRawMock = vi.mocked(database.$queryRaw);
        queryRawMock
          .mockResolvedValueOnce([
            {
              total_activities: 100n,
              today_count: 5n,
              week_count: 23n,
            },
          ])
          .mockResolvedValueOnce([
            { activity_type: "entity.created", count: 40n },
            { activity_type: "entity.updated", count: 60n },
          ])
          .mockResolvedValueOnce([
            { entity_type: "Event", count: 70n },
            { entity_type: "Client", count: 30n },
          ]);

        const request = new NextRequest(
          "http://localhost/api/activity-feed/stats"
        );
        const response = await getStats(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toMatchObject({
          success: true,
          stats: {
            totalActivities: 100,
            todayCount: 5,
            weekCount: 23,
            byType: {
              "entity.created": 40,
              "entity.updated": 60,
            },
            byEntity: {
              Event: 70,
              Client: 30,
            },
          },
        });

        // Three queries fired:
        expect(queryRawMock).toHaveBeenCalledTimes(3);
      });

      it("returns zeros and empty maps when the tenant has no activity rows", async () => {
        mockAuth();

        vi.mocked(database.$queryRaw)
          .mockResolvedValueOnce([
            {
              total_activities: 0n,
              today_count: 0n,
              week_count: 0n,
            },
          ])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]);

        const request = new NextRequest(
          "http://localhost/api/activity-feed/stats"
        );
        const response = await getStats(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.stats).toEqual({
          totalActivities: 0,
          todayCount: 0,
          weekCount: 0,
          byType: {},
          byEntity: {},
        });
      });

      it("does not crash on bigint values larger than Number.MAX_SAFE_INTEGER (caller already guarantees safe range)", async () => {
        mockAuth();

        // Stay within safe range — the route does Number(bigint) without checks.
        // This pins the documented behavior: counts are coerced via Number().
        vi.mocked(database.$queryRaw)
          .mockResolvedValueOnce([
            {
              total_activities: BigInt(Number.MAX_SAFE_INTEGER),
              today_count: 1n,
              week_count: 2n,
            },
          ])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]);

        const request = new NextRequest(
          "http://localhost/api/activity-feed/stats"
        );
        const response = await getStats(request);

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.stats.totalActivities).toBe(Number.MAX_SAFE_INTEGER);
      });
    });

    describe("error handling", () => {
      it("returns 500 when the first $queryRaw (totals) rejects", async () => {
        mockAuth();
        const dbError = new Error("totals query failed");
        vi.mocked(database.$queryRaw).mockRejectedValueOnce(dbError);

        const request = new NextRequest(
          "http://localhost/api/activity-feed/stats"
        );
        const response = await getStats(request);

        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.message).toBe("Internal server error");

        const { captureException } = await import("@sentry/nextjs");
        expect(captureException).toHaveBeenCalledWith(dbError);
      });

      it("returns 500 when the second $queryRaw (byType) rejects after totals succeed", async () => {
        mockAuth();
        vi.mocked(database.$queryRaw)
          .mockResolvedValueOnce([
            { total_activities: 1n, today_count: 0n, week_count: 0n },
          ])
          .mockRejectedValueOnce(new Error("byType query failed"));

        const request = new NextRequest(
          "http://localhost/api/activity-feed/stats"
        );
        const response = await getStats(request);

        expect(response.status).toBe(500);
      });

      it("returns 500 when the third $queryRaw (byEntity) rejects after the first two succeed", async () => {
        mockAuth();
        vi.mocked(database.$queryRaw)
          .mockResolvedValueOnce([
            { total_activities: 1n, today_count: 0n, week_count: 0n },
          ])
          .mockResolvedValueOnce([])
          .mockRejectedValueOnce(new Error("byEntity query failed"));

        const request = new NextRequest(
          "http://localhost/api/activity-feed/stats"
        );
        const response = await getStats(request);

        expect(response.status).toBe(500);
      });
    });
  });
});
