/**
 * CRM Scoring Rule — governed-create conformance suite
 *
 * Verifies `POST /api/crm/scoring` routes the CrmScoringRule create through the
 * Manifest runtime (`runManifestCommand`) instead of a direct
 * `database.crmScoringRule.create`.
 *
 * Why these tests matter (Constitution §9 / §4a, IMPLEMENTATION_PLAN "governed
 * writes only"):
 *   - CrmScoringRule is a tenant-scoped governed entity. A direct Prisma create
 *     in this route is a governance bypass — it skips the runtime's policy
 *     (RBAC: sales/manager/admin), guards, and semantic-event/audit emission.
 *     `@repo/database` is mocked here WITHOUT a `crmScoringRule.create`, so if
 *     the route ever reverted to a direct write the create test would throw —
 *     the bypass cannot silently return.
 *   - The snake_case request contract (`rule_name`, `is_active`) must map to the
 *     command's camelCase params with the same type coercion the entity expects
 *     (`value`→String, `points`/`priority`→Number, `is_active`→Boolean). A
 *     mapping regression would create rules with wrong/typeless values.
 *   - Input validation (required fields, allowed condition/field enums) must
 *     reject BEFORE any command dispatch, so bad input never reaches the runtime.
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
}));

// Mocked without `crmScoringRule.create`: a reverted direct write would throw.
vi.mock("@repo/database", () => ({
  database: { $queryRaw: vi.fn() },
  Prisma: { sql: vi.fn() },
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
import { POST } from "@/app/api/crm/scoring/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest(new URL("http://localhost/api/crm/scoring"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  rule_name: "High-value lead",
  field: "estimatedValue",
  condition: "gte",
  value: 5000,
  points: 25,
  is_active: true,
  priority: 3,
};

describe("POST /api/crm/scoring — governed create", () => {
  beforeEach(() => {
    mocks.runManifestCommandMock.mockReset();
    mocks.resolveCurrentUserMock.mockReset();
    mocks.captureExceptionMock.mockReset();

    mocks.resolveCurrentUserMock.mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "sales_manager",
    });
    mocks.runManifestCommandMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("delegates the create to the Manifest runtime with mapped params + actor context", async () => {
    await POST(makeRequest(VALID_BODY));

    expect(mocks.runManifestCommandMock).toHaveBeenCalledTimes(1);
    const arg = mocks.runManifestCommandMock.mock.calls[0]![0];
    expect(arg.entity).toBe("CrmScoringRule");
    expect(arg.command).toBe("create");
    // snake_case request → camelCase command params, with coercion.
    expect(arg.body).toEqual({
      ruleName: "High-value lead",
      field: "estimatedValue",
      condition: "gte",
      value: "5000",
      points: 25,
      isActive: true,
      priority: 3,
    });
    // Actor context flows from resolveCurrentUser (runtime RBAC + audit).
    expect(arg.user).toEqual({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "sales_manager",
    });
  });

  it("rejects missing required fields (400) without dispatching a command", async () => {
    const response = await POST(makeRequest({ rule_name: "x", field: "status" }));

    expect(response.status).toBe(400);
    expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid condition (400) without dispatching a command", async () => {
    const response = await POST(
      makeRequest({ ...VALID_BODY, condition: "approximately" })
    );

    expect(response.status).toBe(400);
    expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid field (400) without dispatching a command", async () => {
    const response = await POST(
      makeRequest({ ...VALID_BODY, field: "not_a_real_field" })
    );

    expect(response.status).toBe(400);
    expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
  });
});
