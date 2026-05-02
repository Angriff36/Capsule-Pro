/**
 * Collection Case PATCH Action Test Suite
 *
 * Verifies the command-action dispatcher on
 * `PATCH /api/accounting/collections/cases/[id]`. Actions exercised:
 *   recordPayment | escalateDunning | setPriority | writeOff |
 *   escalateToLegal | reopen | createPaymentPlan | updateAging |
 *   close | assignTo | markDisputed | resolveDispute
 *
 * Why these tests matter:
 *   - `recordPayment` updates `collectedAmount` / `outstandingAmount` and
 *     transitions to PAID once the outstanding balance is at or below the
 *     0.01 floating-point floor. A regression on the floor turns a fully
 *     collected debt into a permanently-open case (financial-reporting
 *     drift) — pin the boundary explicitly.
 *   - `writeOff` is a money-loss decision and MUST clamp the requested
 *     write-off amount to the outstanding balance to prevent negative
 *     residuals. We pin the clamp to guard against future "trust the
 *     payload" edits.
 *   - `escalateToLegal` raises priority to URGENT, sets `status="LEGAL"`,
 *     and flips `isEscalatedToLegal=true` atomically. Losing any one of
 *     those mutations creates a half-escalated case that legal teams will
 *     never see.
 *   - `escalateDunning` derives priority from stage. The route has
 *     overlapping branches that both set priority for `FINAL_NOTICE` /
 *     `COLLECTIONS` — pin URGENT for those and HIGH for `REMINDER_2/3`.
 *   - Zod-validated bodies (recordPayment, setPriority, writeOff,
 *     createPaymentPlan) MUST 400 on schema violations, not crash with a
 *     500. Pin one happy path and one Zod-failure path per validated
 *     action.
 *   - 404 for missing/cross-tenant cases is the tenant-isolation barrier:
 *     the route uses `findFirst({ where: { tenantId, id, deletedAt: null } })`
 *     and we cover the not-found branch explicitly.
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_ID = "00000000-0000-0000-0000-000000000010";
// Valid v4 UUIDs (Zod's .uuid() requires version=4 and variant in [89ab]).
const CASE_ID = "33333333-3333-4333-8333-333333333333";
const APPROVER_ID = "44444444-4444-4444-8444-444444444444";
const PLAN_ID = "55555555-5555-4555-8555-555555555555";
const ASSIGNEE_ID = "66666666-6666-4666-8666-666666666666";

const mocks = vi.hoisted(() => ({
  caseFindFirstMock: vi.fn(),
  caseUpdateMock: vi.fn(),
  requireTenantIdMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  consoleErrorMock: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    collectionCase: {
      findFirst: mocks.caseFindFirstMock,
      update: mocks.caseUpdateMock,
    },
  },
}));

vi.mock("@/app/lib/tenant", () => ({
  requireTenantId: mocks.requireTenantIdMock,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureExceptionMock,
}));

import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/accounting/collections/cases/[id]/route";

const baseCase = {
  id: CASE_ID,
  tenantId: TENANT_ID,
  status: "ACTIVE",
  priority: "MEDIUM",
  dunningStage: "CURRENT",
  isDisputed: false,
  isEscalatedToLegal: false,
  hasPaymentPlan: false,
  originalAmount: 10_000,
  collectedAmount: 0,
  outstandingAmount: 10_000,
  daysOverdue: 30,
  notes: null,
  assignedTo: null,
  agingBucket: null,
  deletedAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest(
    new URL(`http://localhost/api/accounting/collections/cases/${CASE_ID}`),
    {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }
  );
}

const params = Promise.resolve({ id: CASE_ID });

describe("PATCH /api/accounting/collections/cases/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireTenantIdMock.mockResolvedValue(TENANT_ID);
    // Default: update echoes data merged onto baseCase so JSON serialization works
    mocks.caseUpdateMock.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...baseCase,
        ...data,
      })
    );
    vi.spyOn(console, "error").mockImplementation(mocks.consoleErrorMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------- not-found

  it("returns 404 when the case is missing or belongs to another tenant", async () => {
    mocks.caseFindFirstMock.mockResolvedValue(null);

    const response = await PATCH(makeRequest({ action: "close" }), { params });

    expect(response.status).toBe(404);
    expect(mocks.caseUpdateMock).not.toHaveBeenCalled();
    // Tenant scoping must be in the WHERE clause
    expect(mocks.caseFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT_ID,
          id: CASE_ID,
          deletedAt: null,
        }),
      })
    );
  });

  it("returns 400 when the action is unknown / missing", async () => {
    mocks.caseFindFirstMock.mockResolvedValue(baseCase);

    const response = await PATCH(makeRequest({ action: "noSuchAction" }), {
      params,
    });

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/Invalid action/);
    expect(mocks.caseUpdateMock).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------- assignTo

  it("assignTo: writes the new assignee", async () => {
    mocks.caseFindFirstMock.mockResolvedValue(baseCase);

    const response = await PATCH(
      makeRequest({ action: "assignTo", userId: ASSIGNEE_ID }),
      { params }
    );

    expect(response.status).toBe(200);
    expect(mocks.caseUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CASE_ID },
        data: expect.objectContaining({ assignedTo: ASSIGNEE_ID }),
      })
    );
  });

  // ------------------------------------------------------------ recordPayment

  describe("action: recordPayment", () => {
    it("returns 400 when the Zod schema rejects (negative amount)", async () => {
      mocks.caseFindFirstMock.mockResolvedValue(baseCase);

      const response = await PATCH(
        makeRequest({ action: "recordPayment", amount: -50 }),
        { params }
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/Validation failed/);
      expect(mocks.caseUpdateMock).not.toHaveBeenCalled();
    });

    it("partial payment: keeps existing status and recomputes outstanding", async () => {
      mocks.caseFindFirstMock.mockResolvedValue(baseCase);

      const response = await PATCH(
        makeRequest({ action: "recordPayment", amount: 4000 }),
        { params }
      );

      expect(response.status).toBe(200);
      expect(mocks.caseUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CASE_ID },
          data: expect.objectContaining({
            collectedAmount: 4000,
            outstandingAmount: 6000,
            // Partial payment must NOT transition status to PAID
            status: "ACTIVE",
          }),
        })
      );
    });

    it("transitions status=PAID when remaining outstanding ≤ 0.01 (full payment)", async () => {
      mocks.caseFindFirstMock.mockResolvedValue(baseCase);

      const response = await PATCH(
        makeRequest({ action: "recordPayment", amount: 10_000 }),
        { params }
      );

      expect(response.status).toBe(200);
      expect(mocks.caseUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            collectedAmount: 10_000,
            outstandingAmount: 0,
            status: "PAID",
          }),
        })
      );
    });

    it("clamps outstandingAmount to 0 when overpaid (defense-in-depth)", async () => {
      mocks.caseFindFirstMock.mockResolvedValue(baseCase);

      const response = await PATCH(
        makeRequest({ action: "recordPayment", amount: 12_000 }),
        { params }
      );

      expect(response.status).toBe(200);
      const callArgs = mocks.caseUpdateMock.mock.calls[0]?.[0];
      // Even when payment exceeds outstanding, the floor at 0 prevents
      // negative receivables from leaking into the read model.
      expect(callArgs.data.outstandingAmount).toBe(0);
      expect(callArgs.data.status).toBe("PAID");
    });
  });

  // ------------------------------------------------------------- escalateDunning

  describe("action: escalateDunning", () => {
    it("FINAL_NOTICE → priority=URGENT", async () => {
      mocks.caseFindFirstMock.mockResolvedValue(baseCase);

      await PATCH(
        makeRequest({ action: "escalateDunning", stage: "FINAL_NOTICE" }),
        { params }
      );

      expect(mocks.caseUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dunningStage: "FINAL_NOTICE",
            priority: "URGENT",
          }),
        })
      );
    });

    it("COLLECTIONS → priority=URGENT", async () => {
      mocks.caseFindFirstMock.mockResolvedValue(baseCase);

      await PATCH(
        makeRequest({ action: "escalateDunning", stage: "COLLECTIONS" }),
        { params }
      );

      expect(mocks.caseUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dunningStage: "COLLECTIONS",
            priority: "URGENT",
          }),
        })
      );
    });

    it("REMINDER_2 → priority=HIGH", async () => {
      mocks.caseFindFirstMock.mockResolvedValue(baseCase);

      await PATCH(
        makeRequest({ action: "escalateDunning", stage: "REMINDER_2" }),
        { params }
      );

      expect(mocks.caseUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dunningStage: "REMINDER_2",
            priority: "HIGH",
          }),
        })
      );
    });

    it("REMINDER_3 → priority=HIGH", async () => {
      mocks.caseFindFirstMock.mockResolvedValue(baseCase);

      await PATCH(
        makeRequest({ action: "escalateDunning", stage: "REMINDER_3" }),
        { params }
      );

      expect(mocks.caseUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dunningStage: "REMINDER_3",
            priority: "HIGH",
          }),
        })
      );
    });
  });

  // -------------------------------------------------------------- setPriority

  describe("action: setPriority", () => {
    it("returns 400 on invalid priority value", async () => {
      mocks.caseFindFirstMock.mockResolvedValue(baseCase);

      const response = await PATCH(
        makeRequest({ action: "setPriority", priority: "OMG" }),
        { params }
      );

      expect(response.status).toBe(400);
      expect(mocks.caseUpdateMock).not.toHaveBeenCalled();
    });

    it("writes the validated priority and appends a notes entry", async () => {
      mocks.caseFindFirstMock.mockResolvedValue({
        ...baseCase,
        notes: "existing",
      });

      await PATCH(
        makeRequest({
          action: "setPriority",
          priority: "URGENT",
          reason: "executive escalation",
        }),
        { params }
      );

      const data = mocks.caseUpdateMock.mock.calls[0]?.[0]?.data;
      expect(data.priority).toBe("URGENT");
      expect(data.notes).toContain("existing");
      expect(data.notes).toContain("Priority changed");
      expect(data.notes).toContain("executive escalation");
    });
  });

  // ------------------------------------------------------------ markDisputed

  it("markDisputed: flips isDisputed=true and appends a dispute reason", async () => {
    mocks.caseFindFirstMock.mockResolvedValue(baseCase);

    await PATCH(
      makeRequest({ action: "markDisputed", reason: "wrong invoice total" }),
      { params }
    );

    const data = mocks.caseUpdateMock.mock.calls[0]?.[0]?.data;
    expect(data.isDisputed).toBe(true);
    expect(data.notes).toContain("Dispute reason");
    expect(data.notes).toContain("wrong invoice total");
  });

  it("resolveDispute: flips isDisputed=false and stamps resolution notes", async () => {
    mocks.caseFindFirstMock.mockResolvedValue({
      ...baseCase,
      isDisputed: true,
    });

    await PATCH(
      makeRequest({
        action: "resolveDispute",
        resolutionNotes: "agreed to amended total",
      }),
      { params }
    );

    const data = mocks.caseUpdateMock.mock.calls[0]?.[0]?.data;
    expect(data.isDisputed).toBe(false);
    expect(data.notes).toContain("Dispute resolved");
    expect(data.notes).toContain("agreed to amended total");
  });

  // ----------------------------------------------------------- escalateToLegal

  it("escalateToLegal: sets isEscalatedToLegal + status=LEGAL + priority=URGENT atomically", async () => {
    mocks.caseFindFirstMock.mockResolvedValue(baseCase);

    await PATCH(
      makeRequest({
        action: "escalateToLegal",
        legalCaseNumber: "LX-2026-001",
        legalFirm: "Smith & Associates",
      }),
      { params }
    );

    const data = mocks.caseUpdateMock.mock.calls[0]?.[0]?.data;
    expect(data.isEscalatedToLegal).toBe(true);
    expect(data.status).toBe("LEGAL");
    expect(data.priority).toBe("URGENT");
    expect(data.notes).toContain("LX-2026-001");
    expect(data.notes).toContain("Smith & Associates");
  });

  // ----------------------------------------------------------------- writeOff

  describe("action: writeOff", () => {
    it("returns 400 when Zod schema rejects (missing approvedBy)", async () => {
      mocks.caseFindFirstMock.mockResolvedValue(baseCase);

      const response = await PATCH(
        makeRequest({
          action: "writeOff",
          amount: 1000,
          reason: "uncollectable",
          // approvedBy intentionally absent
        }),
        { params }
      );

      expect(response.status).toBe(400);
      expect(mocks.caseUpdateMock).not.toHaveBeenCalled();
    });

    it("clamps requested amount to outstanding balance and sets status=WRITE_OFF", async () => {
      mocks.caseFindFirstMock.mockResolvedValue({
        ...baseCase,
        collectedAmount: 2000,
        outstandingAmount: 8000,
      });

      // Caller asks to write off 12000 but only 8000 is outstanding.
      await PATCH(
        makeRequest({
          action: "writeOff",
          amount: 12_000,
          reason: "bankruptcy",
          approvedBy: APPROVER_ID,
        }),
        { params }
      );

      const data = mocks.caseUpdateMock.mock.calls[0]?.[0]?.data;
      // The clamp is the safety property: outstandingAmount must equal the
      // capped amount (which equals the prior outstanding), and collected
      // gets the (outstanding - cap) delta — zero in this overshoot case.
      expect(data.outstandingAmount).toBe(8000);
      expect(data.status).toBe("WRITE_OFF");
      expect(data.notes).toContain("bankruptcy");
      expect(data.notes).toContain(APPROVER_ID);
    });
  });

  // -------------------------------------------------------------- updateAging

  it("updateAging: writes daysOverdue and agingBucket from the body", async () => {
    mocks.caseFindFirstMock.mockResolvedValue(baseCase);

    await PATCH(
      makeRequest({
        action: "updateAging",
        daysOverdue: 95,
        agingBucket: "91-120",
      }),
      { params }
    );

    const data = mocks.caseUpdateMock.mock.calls[0]?.[0]?.data;
    expect(data.daysOverdue).toBe(95);
    expect(data.agingBucket).toBe("91-120");
  });

  it("updateAging: defaults daysOverdue to 0 and agingBucket to null when absent", async () => {
    mocks.caseFindFirstMock.mockResolvedValue(baseCase);

    await PATCH(makeRequest({ action: "updateAging" }), { params });

    const data = mocks.caseUpdateMock.mock.calls[0]?.[0]?.data;
    expect(data.daysOverdue).toBe(0);
    expect(data.agingBucket).toBeNull();
  });

  // -------------------------------------------------------------------- close

  it("close: transitions status to CLOSED and stamps resolution notes", async () => {
    mocks.caseFindFirstMock.mockResolvedValue(baseCase);

    await PATCH(
      makeRequest({ action: "close", resolution: "settled out of court" }),
      { params }
    );

    const data = mocks.caseUpdateMock.mock.calls[0]?.[0]?.data;
    expect(data.status).toBe("CLOSED");
    expect(data.notes).toContain("settled out of court");
  });

  // -------------------------------------------------------- createPaymentPlan

  describe("action: createPaymentPlan", () => {
    it("returns 400 when the Zod schema rejects (missing nextPaymentDue)", async () => {
      mocks.caseFindFirstMock.mockResolvedValue(baseCase);

      const response = await PATCH(
        makeRequest({ action: "createPaymentPlan", planId: PLAN_ID }),
        { params }
      );

      expect(response.status).toBe(400);
      expect(mocks.caseUpdateMock).not.toHaveBeenCalled();
    });

    it("flips hasPaymentPlan=true, downgrades priority to MEDIUM, appends a notes entry", async () => {
      mocks.caseFindFirstMock.mockResolvedValue({
        ...baseCase,
        priority: "URGENT",
      });

      await PATCH(
        makeRequest({
          action: "createPaymentPlan",
          planId: PLAN_ID,
          nextPaymentDue: "2026-06-01T00:00:00.000Z",
        }),
        { params }
      );

      const data = mocks.caseUpdateMock.mock.calls[0]?.[0]?.data;
      expect(data.hasPaymentPlan).toBe(true);
      // A payment plan is the customer engaging — no longer URGENT.
      expect(data.priority).toBe("MEDIUM");
      expect(data.notes).toContain(PLAN_ID);
    });
  });

  // ------------------------------------------------------------------ reopen

  it("reopen: resets status=ACTIVE, dunningStage=CURRENT, and clears legal escalation", async () => {
    mocks.caseFindFirstMock.mockResolvedValue({
      ...baseCase,
      status: "CLOSED",
      dunningStage: "FINAL_NOTICE",
      isEscalatedToLegal: true,
    });

    await PATCH(
      makeRequest({ action: "reopen", reason: "new evidence surfaced" }),
      { params }
    );

    const data = mocks.caseUpdateMock.mock.calls[0]?.[0]?.data;
    expect(data.status).toBe("ACTIVE");
    expect(data.dunningStage).toBe("CURRENT");
    expect(data.isEscalatedToLegal).toBe(false);
    expect(data.notes).toContain("new evidence surfaced");
  });

  // ------------------------------------------------------------- error path

  it("returns 500 on unexpected DB error and reports it via Sentry", async () => {
    mocks.caseFindFirstMock.mockResolvedValue(baseCase);
    mocks.caseUpdateMock.mockRejectedValue(new Error("connection lost"));

    const response = await PATCH(
      makeRequest({ action: "close", resolution: "n/a" }),
      { params }
    );

    expect(response.status).toBe(500);
    expect(mocks.captureExceptionMock).toHaveBeenCalledTimes(1);
  });
});
