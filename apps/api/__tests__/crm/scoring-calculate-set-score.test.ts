/**
 * POST /api/crm/scoring/calculate — governed Lead.setScore conformance suite.
 *
 * Pins db-perf #13: the recompute loop persists each lead's score via the
 * dedicated governed `Lead.setScore` command (score + scoreBreakdown + the
 * LeadUpdated event land in ONE governed write) instead of the prior
 * non-atomic dual-write — a no-op governed `Lead.update` ({id,tenantId},
 * mutates nothing) followed by a RAW `database.lead.updateMany` that persisted
 * the score OUTSIDE governance. That dual-write was 2N governed round-trips and
 * could leave a stale event/mismatched score if either step failed mid-loop.
 *
 * Why these tests matter:
 *   - `@repo/database` is mocked WITH a `lead.updateMany` spy that MUST stay
 *     uncalled — reverting to the dual-write would call it → the guard fails.
 *   - Every dispatched command MUST be `Lead.setScore` — reverting to the
 *     no-op `Lead.update` fails the `command === "setScore"` assertion.
 *   - The score math (in-memory rule matching) + the snake_case→camelCase
 *     body contract (id/tenantId/score/scoreBreakdown) are pinned per lead.
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const USER_ID = "00000000-0000-0000-0000-000000000099";

const mocks = vi.hoisted(() => ({
  runManifestCommandMock: vi.fn(),
  resolveCurrentUserMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  queryRawMock: vi.fn(),
  leadFindManyMock: vi.fn(),
  // Regression guard: the dual-write's raw score write. Must stay uncalled.
  leadUpdateManyMock: vi.fn(),
}));

// `lead.updateMany` is present as a spy so the dual-write regression fails the
// `not.toHaveBeenCalled()` guard instead of silently throwing.
vi.mock("@repo/database", () => ({
  database: {
    $queryRaw: mocks.queryRawMock,
    lead: {
      findMany: mocks.leadFindManyMock,
      updateMany: mocks.leadUpdateManyMock,
    },
  },
  Prisma: { sql: (strings: TemplateStringsArray, ...vals: unknown[]) => ({ strings, vals }) },
}));

vi.mock("@repo/auth/server", () => ({
  auth: vi.fn().mockResolvedValue({ orgId: "org_test" }),
}));

vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureExceptionMock,
}));

vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi
    .fn()
    .mockResolvedValue("00000000-0000-0000-0000-000000000001"),
  resolveCurrentUser: mocks.resolveCurrentUserMock,
}));

vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: mocks.runManifestCommandMock,
}));

import { NextRequest } from "next/server";
import { auth } from "@repo/auth/server";
import { POST } from "@/app/api/crm/scoring/calculate/route";

function makeRequest() {
  return new NextRequest(new URL("http://localhost/api/crm/scoring/calculate"), {
    method: "POST",
  });
}

describe("POST /api/crm/scoring/calculate — governed Lead.setScore (#13)", () => {
  beforeEach(() => {
    mocks.runManifestCommandMock.mockReset();
    mocks.resolveCurrentUserMock.mockReset();
    mocks.captureExceptionMock.mockReset();
    mocks.queryRawMock.mockReset();
    mocks.leadFindManyMock.mockReset();
    mocks.leadUpdateManyMock.mockReset();

    mocks.resolveCurrentUserMock.mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "sales_manager",
    });
    // The route awaits but ignores the governed Response — a 200 stub is enough.
    mocks.runManifestCommandMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
    vi.mocked(auth).mockResolvedValue({ orgId: "org_test" } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("persists each computed score via governed Lead.setScore (no dual-write, no Lead.update)", async () => {
    // One rule: estimatedValue >= 5000 → +25 points.
    mocks.queryRawMock.mockResolvedValueOnce([
      {
        id: "rule-1",
        rule_name: "High value",
        field: "estimatedValue",
        condition: "gte",
        value: "5000",
        points: 25,
        priority: 1,
      },
    ]);
    mocks.leadFindManyMock.mockResolvedValue([
      { id: "lead-A", estimatedValue: 6000 },
      { id: "lead-B", estimatedValue: 1000 },
    ]);
    // Distribution + count reads (after the score loop): both leads score < 50.
    mocks.queryRawMock.mockResolvedValueOnce([{ bucket: "cold", count: 2n }]);
    mocks.queryRawMock.mockResolvedValueOnce([{ count: 2n }]);

    const response = await POST(makeRequest());
    const json = await response.json();

    // 2 leads → 2 governed writes (2N→N: was 2 governed + 2 raw = 4, now 2).
    expect(mocks.runManifestCommandMock).toHaveBeenCalledTimes(2);
    // Every dispatch is setScore — never the old no-op update.
    expect(
      mocks.runManifestCommandMock.mock.calls.every(
        (c) => c[0]?.command === "setScore" && c[0]?.entity === "Lead"
      )
    ).toBe(true);
    // The raw dual-write must NOT fire.
    expect(mocks.leadUpdateManyMock).not.toHaveBeenCalled();

    const [callA, callB] = mocks.runManifestCommandMock.mock.calls.map(
      (c) => c[0]
    );
    expect(callA).toMatchObject({
      entity: "Lead",
      command: "setScore",
      instanceId: "lead-A",
      body: {
        id: "lead-A",
        tenantId: TENANT_ID,
        score: 25,
        scoreBreakdown: { "rule-1": "25", "rule_name_rule-1": "High value" },
      },
    });
    expect(callB).toMatchObject({
      entity: "Lead",
      command: "setScore",
      instanceId: "lead-B",
      body: { id: "lead-B", tenantId: TENANT_ID, score: 0, scoreBreakdown: {} },
    });
    // Actor context flows from resolveCurrentUser (runtime RBAC + audit).
    expect(callA.user).toEqual({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "sales_manager",
    });

    // Distribution math: both leads are cold (<50).
    expect(response.status).toBe(200);
    expect(json).toEqual({
      data: { updated: 2, distribution: { hot: 0, warm: 0, cold: 2 } },
    });
  });

  it("zero-rules branch resets every lead to score 0 via setScore (no raw write)", async () => {
    mocks.queryRawMock.mockResolvedValueOnce([]); // no active rules
    mocks.leadFindManyMock.mockResolvedValue([
      { id: "lead-A" },
      { id: "lead-B" },
      { id: "lead-C" },
    ]);

    const response = await POST(makeRequest());
    const json = await response.json();

    expect(mocks.runManifestCommandMock).toHaveBeenCalledTimes(3);
    for (const c of mocks.runManifestCommandMock.mock.calls) {
      expect(c[0]?.command).toBe("setScore");
      expect(c[0]?.body).toMatchObject({
        score: 0,
        scoreBreakdown: {},
        tenantId: TENANT_ID,
      });
    }
    expect(mocks.leadUpdateManyMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(json).toEqual({
      data: { updated: 0, distribution: { hot: 0, warm: 0, cold: 0 } },
    });
  });

  it("rejects an unauthenticated request (401) before any DB read or governed write", async () => {
    vi.mocked(auth).mockResolvedValueOnce({ orgId: null } as never);

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
    expect(mocks.queryRawMock).not.toHaveBeenCalled();
    expect(mocks.leadFindManyMock).not.toHaveBeenCalled();
  });
});
