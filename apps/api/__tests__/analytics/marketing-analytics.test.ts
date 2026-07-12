/**
 * Marketing analytics GET — regression guard for the GROUP BY refactor (DB-perf #15).
 *
 * The route aggregates email logs (tenant_admin.email_logs), leads (tenant_crm.leads),
 * and SMS logs (tenant_admin.sms_logs) over a time window. Before the refactor it
 * materialized EVERY email log + lead into JS and counted in memory; now it pushes the
 * aggregation to SQL `GROUP BY` (mirroring the existing sms_logs query) and returns
 * O(groups) rows. These tests pin the response shape + metric math and guard against a
 * regression to unbounded `findMany` (the mock has no emailLog/lead accessors, so any
 * such regression throws) and lock the 5-query grouped structure.
 */

import { database } from "@repo/database";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks ---

vi.mock("@repo/database", () => {
  const database = {
    $queryRaw: vi.fn(),
    emailWorkflow: { findMany: vi.fn() },
    smsAutomationRule: { findMany: vi.fn() },
    // ponytail: deliberately NO emailLog / lead accessors — the route must aggregate
    // via $queryRaw GROUP BY, not unbounded findMany. A regression would throw here.
  };
  return { database };
});

vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");

import { GET as getMarketingAnalytics } from "@/app/api/marketing/analytics/route";

// --- Constants ---

const MKT_TENANT_ID = "00000000-0000-0000-0000-000000000050";
const MKT_ORG_ID = "org_marketing_test";

function makeAuthedUser() {
  vi.mocked(auth).mockResolvedValue({ orgId: MKT_ORG_ID } as never);
  vi.mocked(getTenantIdForOrg).mockResolvedValue(MKT_TENANT_ID);
}

function makeRequest(url: string): Request {
  return new Request(new URL(url, "http://localhost:3000"));
}

// Promise.all invokes the five $queryRaw tagged templates left-to-right, so the
// mockResolvedValueOnce sequence follows the route's destructure order:
// emailByStatus, emailByWorkflow, leadByStatus, leadBySource, smsLogs.
function setupGroupedMocks() {
  vi.mocked(database.$queryRaw)
    .mockResolvedValueOnce([
      { status: "delivered", total: 50 },
      { status: "opened", total: 30 },
      { status: "bounced", total: 5 },
      { status: "failed", total: 15 },
    ])
    .mockResolvedValueOnce([
      { workflow_id: "wf-1", sent: 40, opened: 30 },
      { workflow_id: null, sent: 10, opened: 5 },
    ])
    .mockResolvedValueOnce([
      { status: "new", total: 20 },
      { status: "converted", total: 5 },
      { status: "qualified", total: 10 },
    ])
    .mockResolvedValueOnce([
      { source: "website", total: 15 },
      { source: null, total: 8 },
      { source: "", total: 4 },
    ])
    .mockResolvedValueOnce([
      { status: "delivered", total: 90 },
      { status: "failed", total: 10 },
    ]);
  vi.mocked(database.emailWorkflow.findMany).mockResolvedValue([
    {
      id: "wf-1",
      name: "Welcome",
      triggerType: "event_created",
      isActive: true,
    },
    {
      id: "wf-2",
      name: "Follow-up",
      triggerType: "manual",
      isActive: false,
    },
  ] as never);
  vi.mocked(database.smsAutomationRule.findMany).mockResolvedValue([
    {
      id: "r-1",
      name: "Shift reminder",
      triggerType: "shift_start",
      isActive: true,
    },
  ] as never);
}

describe("GET /api/marketing/analytics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    makeAuthedUser();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 for unauthenticated requests", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);

    const response = await getMarketingAnalytics(
      makeRequest("/api/marketing/analytics")
    );
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("computes email/lead/sms metrics from grouped SQL output", async () => {
    setupGroupedMocks();

    const response = await getMarketingAnalytics(
      makeRequest("/api/marketing/analytics?window=30d")
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.window).toBe("30d");

    // Email: totalSent=100, opened=opened(30)+delivered(50)=80 (internal), bounced=5 → 80%
    expect(body.metrics.totalSent).toBe(100);
    expect(body.metrics.openRate).toBe(80);
    expect(body.metrics.bounced).toBe(5);

    // Leads: totalLeads=35, converted=5 → ~14.29%; manual merges null(8)+""(4)=12
    expect(body.metrics.totalLeads).toBe(35);
    expect(body.metrics.conversionRate).toBeCloseTo(
      (5 / 35) * 100,
      5
    );
    expect(body.metrics.leadsBySource).toEqual({
      website: 15,
      manual: 12,
    });

    // SMS: totalSms=100, delivered=90 → 90%
    expect(body.metrics.totalSms).toBe(100);
    expect(body.metrics.smsDeliveryRate).toBe(90);

    // Active config counts
    expect(body.metrics.activeWorkflows).toBe(1);
    expect(body.metrics.activeSmsRules).toBe(1);
  });

  it("joins per-workflow email counts with the workflow config", async () => {
    setupGroupedMocks();

    const response = await getMarketingAnalytics(
      makeRequest("/api/marketing/analytics")
    );
    const body = await response.json();

    expect(body.emailPerformanceByWorkflow).toHaveLength(2);
    const wf1 = body.emailPerformanceByWorkflow.find(
      (w: { id: string }) => w.id === "wf-1"
    );
    expect(wf1).toMatchObject({
      name: "Welcome",
      triggerType: "event_created",
      isActive: true,
      sent: 40,
      opened: 30,
      openRate: 75,
    });
    // wf-2 has no email logs in the window → zeroed with null openRate
    const wf2 = body.emailPerformanceByWorkflow.find(
      (w: { id: string }) => w.id === "wf-2"
    );
    expect(wf2).toMatchObject({ sent: 0, opened: 0, openRate: null });
  });

  it("returns the sms performance summary", async () => {
    setupGroupedMocks();

    const response = await getMarketingAnalytics(
      makeRequest("/api/marketing/analytics")
    );
    const body = await response.json();

    expect(body.smsPerformanceSummary).toHaveLength(1);
    expect(body.smsPerformanceSummary[0]).toMatchObject({
      id: "r-1",
      name: "Shift reminder",
      triggerType: "shift_start",
      isActive: true,
    });
  });

  it("guards the grouped-query structure (5 $queryRaw calls, no findMany)", async () => {
    setupGroupedMocks();

    await getMarketingAnalytics(makeRequest("/api/marketing/analytics"));

    // Regression guard for DB-perf #15: the route must aggregate via 5 GROUP BY
    // queries, not regress to unbounded emailLog/lead findMany.
    expect(database.$queryRaw).toHaveBeenCalledTimes(5);
  });

  it("handles empty aggregates gracefully (zeros + nulls)", async () => {
    vi.mocked(database.$queryRaw)
      .mockResolvedValueOnce([]) // email by status
      .mockResolvedValueOnce([]) // email by workflow
      .mockResolvedValueOnce([]) // lead by status
      .mockResolvedValueOnce([]) // lead by source
      .mockResolvedValueOnce([]); // sms
    vi.mocked(database.emailWorkflow.findMany).mockResolvedValue([]);
    vi.mocked(database.smsAutomationRule.findMany).mockResolvedValue([]);

    const response = await getMarketingAnalytics(
      makeRequest("/api/marketing/analytics")
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.metrics.totalSent).toBe(0);
    expect(body.metrics.openRate).toBeNull();
    expect(body.metrics.bounced).toBe(0);
    expect(body.metrics.totalLeads).toBe(0);
    expect(body.metrics.conversionRate).toBeNull();
    expect(body.metrics.leadsBySource).toEqual({});
    expect(body.metrics.totalSms).toBe(0);
    expect(body.metrics.smsDeliveryRate).toBeNull();
    expect(body.emailPerformanceByWorkflow).toEqual([]);
    expect(body.smsPerformanceSummary).toEqual([]);
  });

  it("propagates database errors (route has no try/catch)", async () => {
    // The marketing route does not wrap its body in try/catch (pre-existing, unlike
    // the finance/kitchen/staff analytics routes), so a DB error rejects.
    vi.mocked(database.$queryRaw).mockRejectedValue(new Error("DB connection"));

    await expect(
      getMarketingAnalytics(makeRequest("/api/marketing/analytics"))
    ).rejects.toThrow("DB connection");
  });
});
