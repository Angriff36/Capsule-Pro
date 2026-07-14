/**
 * Focused test for GET /api/inventory/cycle-count/sessions/[id]/variance-reports
 * — pins the `select` narrowing on the VarianceReport list read so a future
 * edit that drops a consumed field OR removes the select fails loudly. The
 * route previously had NO test pinning its query shape.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { db } = vi.hoisted(() => ({
  db: {
    cycleCountSession: { findFirst: vi.fn(() => Promise.resolve(null)) },
    varianceReport: { findMany: vi.fn((_query?: unknown) => Promise.resolve([])) },
  },
}));

vi.mock("@repo/database", () => ({ database: db }));
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({ getTenantIdForOrg: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { GET } = await import(
  "@/app/api/inventory/cycle-count/sessions/[id]/variance-reports/route"
);

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const SESSION_INTERNAL_ID = "sess-internal-1";
const SESSION_ID = "CC-2026-001";

// Decimal columns are read via `.toNumber()` in the response map.
const dec = (n: number) => ({ toNumber: () => n });

const fullRow = {
  id: "vr-1",
  tenantId: TENANT_ID,
  deletedAt: null,
  sessionId: SESSION_INTERNAL_ID,
  reportType: "full",
  itemId: "item-1",
  itemNumber: "SKU-1",
  itemName: "Flour",
  expectedQuantity: dec(100),
  countedQuantity: dec(95),
  variance: dec(-5),
  variancePct: dec(-5),
  accuracyScore: dec(95),
  status: "pending",
  adjustmentType: "write_off",
  adjustmentAmount: dec(5),
  adjustmentDate: new Date("2026-07-10"),
  notes: "spillage",
  generatedAt: new Date("2026-07-09"),
  createdAt: new Date("2026-07-09"),
  updatedAt: new Date("2026-07-09"),
};

describe("GET /api/inventory/cycle-count/sessions/[id]/variance-reports — select narrowing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({ orgId: "org-1" } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TENANT_ID as never);
    db.cycleCountSession.findFirst.mockResolvedValue({
      id: SESSION_INTERNAL_ID,
    } as never);
  });

  it("selects exactly the 21 consumed columns (drops the 7 unused resolution/rejection columns)", async () => {
    db.varianceReport.findMany.mockResolvedValue([fullRow] as never);

    const response = await GET(
      new Request(
        `http://localhost/api/inventory/cycle-count/sessions/${SESSION_ID}/variance-reports`
      ),
      { params: Promise.resolve({ id: SESSION_ID }) }
    );

    expect(response.status).toBe(200);

    expect(db.varianceReport.findMany).toHaveBeenCalledTimes(1);
    expect(db.varianceReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          tenantId: true,
          sessionId: true,
          reportType: true,
          itemId: true,
          itemNumber: true,
          itemName: true,
          expectedQuantity: true,
          countedQuantity: true,
          variance: true,
          variancePct: true,
          accuracyScore: true,
          status: true,
          adjustmentType: true,
          adjustmentAmount: true,
          adjustmentDate: true,
          notes: true,
          generatedAt: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
      })
    );

    // Regression guard: the 7 unused resolution/rejection columns must NOT be
    // materialized — re-adding one (or reverting the select) trips this.
    const call = db.varianceReport.findMany.mock.calls.at(-1)?.[0] as
      | Record<string, unknown>
      | undefined;
    const select = call?.select as Record<string, unknown> | undefined;
    for (const dropped of [
      "rejectedAt",
      "rejectedBy",
      "rejectionReason",
      "rootCause",
      "resolutionNotes",
      "resolvedById",
      "resolvedAt",
    ]) {
      expect(select?.[dropped]).toBeUndefined();
    }

    const body = await response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      id: "vr-1",
      item_number: "SKU-1",
      expected_quantity: 100,
      counted_quantity: 95,
      variance: -5,
      variance_pct: -5,
      accuracy_score: 95,
      adjustment_amount: 5,
      status: "pending",
      notes: "spillage",
    });
  });

  it("threads the optional status filter into the where clause", async () => {
    db.varianceReport.findMany.mockResolvedValue([] as never);

    await GET(
      new Request(
        `http://localhost/api/inventory/cycle-count/sessions/${SESSION_ID}/variance-reports?status=approved`
      ),
      { params: Promise.resolve({ id: SESSION_ID }) }
    );

    expect(db.varianceReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "approved",
          sessionId: SESSION_INTERNAL_ID,
        }),
      })
    );
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);

    const response = await GET(
      new Request(
        `http://localhost/api/inventory/cycle-count/sessions/${SESSION_ID}/variance-reports`
      ),
      { params: Promise.resolve({ id: SESSION_ID }) }
    );

    expect(response.status).toBe(401);
    expect(db.varianceReport.findMany).not.toHaveBeenCalled();
  });

  it("returns 404 when the session is not found (before reading reports)", async () => {
    db.cycleCountSession.findFirst.mockResolvedValue(null);

    const response = await GET(
      new Request(
        `http://localhost/api/inventory/cycle-count/sessions/${SESSION_ID}/variance-reports`
      ),
      { params: Promise.resolve({ id: SESSION_ID }) }
    );

    expect(response.status).toBe(404);
    expect(db.varianceReport.findMany).not.toHaveBeenCalled();
  });
});
