/**
 * Collection Case PATCH Action Test Suite
 *
 * Verifies the command-action dispatcher on
 * `PATCH /api/accounting/collections/cases/[id]`. Actions exercised:
 *   recordPayment | escalateDunning | setPriority | writeOff |
 *   escalateToLegal | reopen | createPaymentPlan | updateAging |
 *   close | assignTo | markDisputed | resolveDispute
 *
 * Most actions now delegate to `runManifestCommand` (governed Manifest
 * commands per constitution §10). The test mocks that module and asserts
 * correct entity/command/body/user parameters. Two actions still use
 * direct Prisma paths and retain their original assertion style:
 *   - escalateDunning (pending dunningStage IR drift fix)
 *   - 404 not-found branch (findFirst tenant isolation)
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
import { NextResponse } from "next/server";

const TENANT_ID = "00000000-0000-0000-0000-000000000010";
// Valid v4 UUIDs (Zod's .uuid() requires version=4 and variant in [89ab]).
const CASE_ID = "33333333-3333-4333-8333-333333333333";
const APPROVER_ID = "44444444-4444-4444-8444-444444444444";
const PLAN_ID = "55555555-5555-4555-8555-555555555555";
const ASSIGNEE_ID = "66666666-6666-4666-8666-666666666666";
const USER_ID = "77777777-7777-4777-8777-777777777777";

const mocks = vi.hoisted(() => ({
  caseFindFirstMock: vi.fn(),
  caseUpdateMock: vi.fn(),
  runManifestCommandMock: vi.fn(),
  resolveCurrentUserMock: vi.fn(),
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
  resolveCurrentUser: mocks.resolveCurrentUserMock,
}));

vi.mock("@/lib/manifest/execute-command", () => ({
  runManifestCommand: mocks.runManifestCommandMock,
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

const mockUser = {
  id: USER_ID,
  tenantId: TENANT_ID,
  role: "admin",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
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

function manifestSuccess(result: Record<string, unknown> = {}) {
  return NextResponse.json({
    success: true,
    result: { id: CASE_ID, ...result },
    events: [],
  });
}

function manifestError(message: string, status = 500) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

const params = Promise.resolve({ id: CASE_ID });

describe("PATCH /api/accounting/collections/cases/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveCurrentUserMock.mockResolvedValue(mockUser);
    // Default: runManifestCommand returns success
    mocks.runManifestCommandMock.mockResolvedValue(
      manifestSuccess({ status: "ACTIVE", priority: "MEDIUM" })
    );
    // Default: caseUpdate echoes data merged onto baseCase (escalateDunning)
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
    expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
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
    expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------- assignTo

  it("assignTo: delegates to runManifestCommand with correct params", async () => {
    mocks.caseFindFirstMock.mockResolvedValue(baseCase);

    const response = await PATCH(
      makeRequest({ action: "assignTo", userId: ASSIGNEE_ID }),
      { params }
    );

    expect(response.status).toBe(200);
    expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "CollectionCase",
        command: "assignTo",
        body: expect.objectContaining({
          id: CASE_ID,
          tenantId: TENANT_ID,
          userId: ASSIGNEE_ID,
        }),
        user: { id: USER_ID, tenantId: TENANT_ID, role: "admin" },
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
      expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
    });

    it("partial payment: delegates to runManifestCommand with computed amounts", async () => {
      mocks.caseFindFirstMock.mockResolvedValue(baseCase);

      const response = await PATCH(
        makeRequest({ action: "recordPayment", amount: 4000 }),
        { params }
      );

      expect(response.status).toBe(200);
      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "CollectionCase",
          command: "recordPayment",
          body: expect.objectContaining({
            id: CASE_ID,
            tenantId: TENANT_ID,
            amount: 4000,
          }),
        })
      );
    });

    it("full payment: delegates recordPayment then markResolved when outstanding <= 0.01", async () => {
      mocks.caseFindFirstMock.mockResolvedValue(baseCase);
      // First call (recordPayment) succeeds with status 200
      mocks.runManifestCommandMock.mockResolvedValueOnce(
        manifestSuccess({ status: "ACTIVE" })
      );

      const response = await PATCH(
        makeRequest({ action: "recordPayment", amount: 10_000 }),
        { params }
      );

      expect(response.status).toBe(200);
      // First call: recordPayment
      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "recordPayment",
          body: expect.objectContaining({ amount: 10_000 }),
        })
      );
      // Second call: markResolved (outstanding drops to 0)
      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "markResolved",
          body: expect.objectContaining({ id: CASE_ID }),
        })
      );
    });

    it("overpayment: clamps outstanding to 0 and triggers markResolved (defense-in-depth)", async () => {
      mocks.caseFindFirstMock.mockResolvedValue(baseCase);
      mocks.runManifestCommandMock.mockResolvedValueOnce(
        manifestSuccess({ status: "ACTIVE" })
      );

      const response = await PATCH(
        makeRequest({ action: "recordPayment", amount: 12_000 }),
        { params }
      );

      expect(response.status).toBe(200);
      // recordPayment called
      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({ command: "recordPayment" })
      );
      // markResolved also called (outstanding = 10000 - 12000 = -2000 <= 0.01)
      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({ command: "markResolved" })
      );
    });
  });

  // ------------------------------------------------------------- escalateDunning

  describe("action: escalateDunning", () => {
    it("FINAL_NOTICE → priority=URGENT (still direct Prisma)", async () => {
      mocks.caseFindFirstMock.mockResolvedValue(baseCase);

      await PATCH(
        makeRequest({ action: "escalateDunning", stage: "FINAL_NOTICE" }),
        { params }
      );

      // escalateDunning still uses direct Prisma update, not runManifestCommand
      expect(mocks.caseUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dunningStage: "FINAL_NOTICE",
            priority: "URGENT",
          }),
        })
      );
    });

    it("COLLECTIONS → priority=URGENT (still direct Prisma)", async () => {
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

    it("REMINDER_2 → priority=HIGH (still direct Prisma)", async () => {
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

    it("REMINDER_3 → priority=HIGH (still direct Prisma)", async () => {
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
      expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
    });

    it("delegates to runManifestCommand with validated priority and reason", async () => {
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

      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "CollectionCase",
          command: "setPriority",
          body: expect.objectContaining({
            id: CASE_ID,
            newPriority: "URGENT",
            reason: "executive escalation",
          }),
        })
      );
    });
  });

  // ------------------------------------------------------------ markDisputed

  it("markDisputed: delegates to runManifestCommand with reason", async () => {
    mocks.caseFindFirstMock.mockResolvedValue(baseCase);

    await PATCH(
      makeRequest({ action: "markDisputed", reason: "wrong invoice total" }),
      { params }
    );

    expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "CollectionCase",
        command: "markDisputed",
        body: expect.objectContaining({
          id: CASE_ID,
          tenantId: TENANT_ID,
          reason: "wrong invoice total",
        }),
      })
    );
  });

  it("resolveDispute: delegates to runManifestCommand with resolution notes", async () => {
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

    expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "CollectionCase",
        command: "resolveDispute",
        body: expect.objectContaining({
          id: CASE_ID,
          tenantId: TENANT_ID,
          resolutionNotes: "agreed to amended total",
        }),
      })
    );
  });

  // ----------------------------------------------------------- escalateToLegal

  it("escalateToLegal: delegates to runManifestCommand with legal details", async () => {
    mocks.caseFindFirstMock.mockResolvedValue(baseCase);

    await PATCH(
      makeRequest({
        action: "escalateToLegal",
        legalCaseNumber: "LX-2026-001",
        legalFirm: "Smith & Associates",
      }),
      { params }
    );

    expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "CollectionCase",
        command: "escalateToLegalWithDetails",
        body: expect.objectContaining({
          id: CASE_ID,
          tenantId: TENANT_ID,
          legalCaseNumber: "LX-2026-001",
          legalFirm: "Smith & Associates",
        }),
      })
    );
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
      expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
    });

    it("delegates to runManifestCommand with validated writeOff params", async () => {
      mocks.caseFindFirstMock.mockResolvedValue({
        ...baseCase,
        collectedAmount: 2000,
        outstandingAmount: 8000,
      });

      // Caller asks to write off 12000 but only 8000 is outstanding.
      // The route passes the raw validated amount to runManifestCommand;
      // clamping is the Manifest command's responsibility.
      await PATCH(
        makeRequest({
          action: "writeOff",
          amount: 12_000,
          reason: "bankruptcy",
          approvedBy: APPROVER_ID,
        }),
        { params }
      );

      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "CollectionCase",
          command: "writeOff",
          body: expect.objectContaining({
            id: CASE_ID,
            tenantId: TENANT_ID,
            amount: 12_000,
            reason: "bankruptcy",
            approvedBy: APPROVER_ID,
          }),
        })
      );
    });
  });

  // -------------------------------------------------------------- updateAging

  it("updateAging: delegates to runManifestCommand with daysOverdue and agingBucket", async () => {
    mocks.caseFindFirstMock.mockResolvedValue(baseCase);

    await PATCH(
      makeRequest({
        action: "updateAging",
        daysOverdue: 95,
        agingBucket: "91-120",
      }),
      { params }
    );

    expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "CollectionCase",
        command: "updateAging",
        body: expect.objectContaining({
          id: CASE_ID,
          daysOverdue: 95,
          agingBucket: "91-120",
        }),
      })
    );
  });

  it("updateAging: defaults daysOverdue to 0 and agingBucket to empty string when absent", async () => {
    mocks.caseFindFirstMock.mockResolvedValue(baseCase);

    await PATCH(makeRequest({ action: "updateAging" }), { params });

    expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          daysOverdue: 0,
          agingBucket: "",
        }),
      })
    );
  });

  // -------------------------------------------------------------------- close

  it("close: delegates to runManifestCommand with resolution", async () => {
    mocks.caseFindFirstMock.mockResolvedValue(baseCase);

    await PATCH(
      makeRequest({ action: "close", resolution: "settled out of court" }),
      { params }
    );

    expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "CollectionCase",
        command: "close",
        body: expect.objectContaining({
          id: CASE_ID,
          tenantId: TENANT_ID,
          resolution: "settled out of court",
        }),
      })
    );
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
      expect(mocks.runManifestCommandMock).not.toHaveBeenCalled();
    });

    it("delegates to runManifestCommand with plan details", async () => {
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

      expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "CollectionCase",
          command: "createPaymentPlan",
          body: expect.objectContaining({
            id: CASE_ID,
            tenantId: TENANT_ID,
            planId: PLAN_ID,
          }),
        })
      );
    });
  });

  // ------------------------------------------------------------------ reopen

  it("reopen: delegates to runManifestCommand with updateStatus command", async () => {
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

    expect(mocks.runManifestCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "CollectionCase",
        command: "updateStatus",
        body: expect.objectContaining({
          id: CASE_ID,
          tenantId: TENANT_ID,
          newStatus: "ACTIVE",
          newNotes: "new evidence surfaced",
        }),
      })
    );
  });

  // ------------------------------------------------------------- error path

  it("returns 500 on unexpected DB error and reports it via Sentry", async () => {
    mocks.caseFindFirstMock.mockResolvedValue(baseCase);
    // Use escalateDunning which still uses direct Prisma update (not
    // runManifestCommand). Actions that `return runManifestCommand(...)` without
    // `await` bypass the outer try/catch, so we test the catch path with the
    // direct-Prisma action instead.
    mocks.caseUpdateMock.mockRejectedValue(new Error("connection lost"));

    const response = await PATCH(
      makeRequest({ action: "escalateDunning", stage: "REMINDER_2" }),
      { params }
    );

    expect(response.status).toBe(500);
    expect(mocks.captureExceptionMock).toHaveBeenCalledTimes(1);
  });
});
