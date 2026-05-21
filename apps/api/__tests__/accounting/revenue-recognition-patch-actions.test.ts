/**
 * Revenue Recognition Schedule PATCH Action Test Suite
 *
 * Verifies the command-action dispatcher on
 * `PATCH /api/accounting/revenue-recognition/schedules/[id]`. Actions:
 *   start | recognize | reverse | cancel | adjust
 *
 * Why these tests matter:
 *   - Revenue recognition is the financial source-of-truth for ASC 606 / IFRS
 *     15 reporting. A regression in `recognize` arithmetic produces incorrect
 *     period revenue on the income statement that auditors will fail.
 *   - `recognize` runs in a `$transaction` to atomically (1) create the
 *     revenue line and (2) update aggregates on the schedule. If the
 *     atomicity is broken, a crash between the two writes leaves the schedule
 *     accumulating phantom revenue with no backing line items.
 *   - The terminal-status guards on `start` (PENDING-only) and `cancel` (NOT
 *     COMPLETED) prevent reopening of closed schedules.
 *   - `reverse` must restore both the recognized total and the remaining
 *     amount; otherwise the trial balance won't tie.
 *
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const SCHEDULE_ID = "11111111-1111-1111-1111-111111111111";
const LINE_ID = "22222222-2222-2222-2222-222222222222";
const USER_ID = "99999999-9999-4999-8999-999999999999";

const mocks = vi.hoisted(() => ({
  scheduleFindFirstMock: vi.fn(),
  scheduleUpdateMock: vi.fn(),
  lineCreateMock: vi.fn(),
  lineUpdateMock: vi.fn(),
  lineFindFirstMock: vi.fn(),
  transactionMock: vi.fn(),
  requireTenantIdMock: vi.fn(),
  requireCurrentUserMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  consoleErrorMock: vi.fn(),
  // Manifest runtime stub — for actions migrated to runtime.runCommand,
  // tests must assert the command call, not the underlying `database.*`
  // delegate (the store layer between them is exercised by
  // `packages/manifest-adapters/__tests__/prisma-store-revenue-recognition.test.ts`).
  runCommandMock: vi.fn(),
  createManifestRuntimeMock: vi.fn(),
}));

vi.mock("@repo/database", () => ({
  database: {
    revenueRecognitionSchedule: {
      findFirst: mocks.scheduleFindFirstMock,
      update: mocks.scheduleUpdateMock,
    },
    revenueRecognitionLine: {
      create: mocks.lineCreateMock,
      update: mocks.lineUpdateMock,
      findFirst: mocks.lineFindFirstMock,
    },
    $transaction: mocks.transactionMock,
  },
}));

vi.mock("@/app/lib/tenant", () => ({
  requireTenantId: mocks.requireTenantIdMock,
  requireCurrentUser: mocks.requireCurrentUserMock,
}));

vi.mock("@/lib/manifest-runtime", () => ({
  createManifestRuntime: mocks.createManifestRuntimeMock,
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureExceptionMock,
}));

import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/accounting/revenue-recognition/schedules/[id]/route";

const baseSchedule = {
  id: SCHEDULE_ID,
  tenantId: TENANT_ID,
  status: "PENDING",
  totalAmount: { toString: () => "10000.00" },
  recognizedAmount: 0,
  remainingAmount: 10_000,
  completedMilestones: 0,
  totalMilestones: 4,
  recognitionPeriod: "MONTHLY",
  startDate: new Date("2026-01-01"),
  endDate: new Date("2026-12-31"),
  description: "Annual subscription",
  notes: null,
  completedAt: null,
  lines: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest(
    new URL(
      `http://localhost/api/accounting/revenue-recognition/schedules/${SCHEDULE_ID}`
    ),
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

const params = Promise.resolve({ id: SCHEDULE_ID });

describe("PATCH /api/accounting/revenue-recognition/schedules/[id]", () => {
  beforeEach(() => {
    mocks.scheduleFindFirstMock.mockReset();
    mocks.scheduleUpdateMock.mockReset();
    mocks.lineCreateMock.mockReset();
    mocks.lineUpdateMock.mockReset();
    mocks.lineFindFirstMock.mockReset();
    mocks.transactionMock.mockReset();
    mocks.requireTenantIdMock.mockReset();
    mocks.requireCurrentUserMock.mockReset();
    mocks.captureExceptionMock.mockReset();
    mocks.consoleErrorMock.mockReset();
    mocks.runCommandMock.mockReset();
    mocks.createManifestRuntimeMock.mockReset();

    mocks.requireTenantIdMock.mockResolvedValue(TENANT_ID);
    mocks.requireCurrentUserMock.mockResolvedValue({
      id: USER_ID,
      tenantId: TENANT_ID,
      role: "admin",
      email: "ops@example.com",
      firstName: "Ops",
      lastName: "User",
    });
    // Default runtime stub: every command succeeds with empty result. Tests
    // for migrated actions override with action-specific outcomes.
    mocks.runCommandMock.mockResolvedValue({
      success: true,
      result: {},
      emittedEvents: [],
    });
    mocks.createManifestRuntimeMock.mockResolvedValue({
      runCommand: mocks.runCommandMock,
    });
    // Default $transaction passes through and returns the array of operation
    // results in the order they were declared. Tests override per-case.
    mocks.transactionMock.mockImplementation(async (ops: unknown[]) => ops);
    vi.spyOn(console, "error").mockImplementation(mocks.consoleErrorMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------- guards

  it("returns 404 when schedule does not exist", async () => {
    mocks.scheduleFindFirstMock.mockResolvedValue(null);

    const response = await PATCH(makeRequest({ action: "start" }), { params });

    expect(response.status).toBe(404);
    expect(mocks.scheduleUpdateMock).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------- start

  describe("action: start (migrated to manifest runtime)", () => {
    // `start` is the first action on this route to route writes through
    // `runtime.runCommand("startRecognition", ...)` instead of a direct
    // `database.revenueRecognitionSchedule.update`. These tests now assert
    // against the runtime call. The store layer between the command and
    // Prisma is covered by
    // `packages/manifest-adapters/__tests__/prisma-store-revenue-recognition.test.ts`.

    it("invokes startRecognition via runtime and read-backs the schedule with lines", async () => {
      mocks.scheduleFindFirstMock
        // Initial existence check
        .mockResolvedValueOnce(baseSchedule)
        // Read-back after runCommand succeeds
        .mockResolvedValueOnce({
          ...baseSchedule,
          status: "IN_PROGRESS",
        });

      const response = await PATCH(makeRequest({ action: "start" }), {
        params,
      });

      expect(response.status).toBe(200);

      // 1) The runtime was constructed with the resolved user + entity name.
      expect(mocks.createManifestRuntimeMock).toHaveBeenCalledTimes(1);
      const runtimeCtx = mocks.createManifestRuntimeMock.mock.calls[0][0];
      expect(runtimeCtx.entityName).toBe("RevenueRecognitionSchedule");
      expect(runtimeCtx.user).toEqual(
        expect.objectContaining({
          id: USER_ID,
          tenantId: TENANT_ID,
          role: "admin",
        })
      );

      // 2) runCommand was called with the manifest command name + instanceId.
      expect(mocks.runCommandMock).toHaveBeenCalledTimes(1);
      const [commandName, commandPayload, commandCtx] =
        mocks.runCommandMock.mock.calls[0];
      expect(commandName).toBe("startRecognition");
      expect(commandPayload).toEqual({});
      expect(commandCtx).toEqual(
        expect.objectContaining({
          entityName: "RevenueRecognitionSchedule",
          instanceId: SCHEDULE_ID,
        })
      );

      // 3) The route did NOT issue a direct schedule.update — that is the
      //    whole point of this migration. The PrismaStore (driven by
      //    runtime.runCommand) owns the write now.
      expect(mocks.scheduleUpdateMock).not.toHaveBeenCalled();

      // 4) Response body comes from the read-back, including the empty
      //    lines relation the legacy shape promised.
      const body = await response.json();
      expect(body.data.status).toBe("IN_PROGRESS");
      expect(body.data.lines).toEqual([]);
    });

    it("rejects start on a non-PENDING schedule before invoking the runtime", async () => {
      mocks.scheduleFindFirstMock.mockResolvedValue({
        ...baseSchedule,
        status: "IN_PROGRESS",
      });

      const response = await PATCH(makeRequest({ action: "start" }), {
        params,
      });

      expect(response.status).toBe(400);
      // The 400 mapping is preserved by the route's pre-check; the manifest
      // would emit a 422 guardFailure for the same state. Pinning the
      // pre-check call is what keeps client error mappings stable.
      expect(mocks.createManifestRuntimeMock).not.toHaveBeenCalled();
      expect(mocks.runCommandMock).not.toHaveBeenCalled();
      expect(mocks.scheduleUpdateMock).not.toHaveBeenCalled();
    });

    it("maps runtime guardFailure to a 422 response (covers the new now() >= startDate guard)", async () => {
      mocks.scheduleFindFirstMock.mockResolvedValue(baseSchedule);
      // Simulate the manifest `now() >= self.startDate` guard rejecting a
      // start request for a future-dated schedule. This guard is new in the
      // migrated code — the legacy route allowed it silently.
      mocks.runCommandMock.mockResolvedValueOnce({
        success: false,
        guardFailure: {
          index: 1,
          formatted: "Cannot start before start date",
        },
      });

      const response = await PATCH(makeRequest({ action: "start" }), {
        params,
      });

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.error).toMatch(/Cannot start before start date/);
      // Read-back is skipped on guardFailure path.
      expect(mocks.scheduleFindFirstMock).toHaveBeenCalledTimes(1);
    });

    it("maps runtime policyDenial to a 403 response", async () => {
      mocks.scheduleFindFirstMock.mockResolvedValue(baseSchedule);
      mocks.runCommandMock.mockResolvedValueOnce({
        success: false,
        policyDenial: { policyName: "RevenueRecognitionManagement" },
      });

      const response = await PATCH(makeRequest({ action: "start" }), {
        params,
      });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toMatch(/RevenueRecognitionManagement/);
    });
  });

  // ---------------------------------------------------------------- recognize

  describe("action: recognize", () => {
    it("rejects zero or negative amounts", async () => {
      mocks.scheduleFindFirstMock.mockResolvedValue(baseSchedule);

      const r1 = await PATCH(makeRequest({ action: "recognize", amount: 0 }), {
        params,
      });
      const r2 = await PATCH(
        makeRequest({ action: "recognize", amount: -100 }),
        { params }
      );

      expect(r1.status).toBe(400);
      expect(r2.status).toBe(400);
      expect(mocks.transactionMock).not.toHaveBeenCalled();
    });

    it("rejects recognition that exceeds remaining amount", async () => {
      mocks.scheduleFindFirstMock.mockResolvedValue({
        ...baseSchedule,
        recognizedAmount: 8000,
        remainingAmount: 2000,
      });

      const response = await PATCH(
        makeRequest({ action: "recognize", amount: 5000 }),
        { params }
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/exceeds/i);
      expect(mocks.transactionMock).not.toHaveBeenCalled();
    });

    it("creates a line and updates aggregates atomically (in-progress)", async () => {
      mocks.scheduleFindFirstMock.mockResolvedValue({
        ...baseSchedule,
        status: "IN_PROGRESS",
        recognizedAmount: 2000,
        remainingAmount: 8000,
        completedMilestones: 1,
        lines: [
          {
            id: "line-existing",
            sequence: 1,
            amount: 2000,
            status: "RECOGNIZED",
          },
        ],
      });
      mocks.transactionMock.mockResolvedValue([
        { id: LINE_ID, amount: 2500, sequence: 2 },
        {
          ...baseSchedule,
          status: "IN_PROGRESS",
          recognizedAmount: 4500,
          remainingAmount: 5500,
          completedMilestones: 2,
        },
      ]);

      const response = await PATCH(
        makeRequest({ action: "recognize", amount: 2500 }),
        { params }
      );

      expect(response.status).toBe(200);
      expect(mocks.transactionMock).toHaveBeenCalledTimes(1);

      const ops = mocks.transactionMock.mock.calls[0][0];
      // Two operations: create line, update schedule
      expect(ops).toHaveLength(2);

      // Schedule must NOT be COMPLETED — there's still 5500 remaining.
      const body = await response.json();
      expect(body.data.status).toBe("IN_PROGRESS");
      expect(body.data.newLine).toEqual(
        expect.objectContaining({ id: LINE_ID, amount: 2500 })
      );
    });

    it("marks schedule COMPLETED and stamps completedAt when remaining ≤ 0.01", async () => {
      mocks.scheduleFindFirstMock.mockResolvedValue({
        ...baseSchedule,
        status: "IN_PROGRESS",
        recognizedAmount: 9999,
        remainingAmount: 1,
        completedMilestones: 3,
      });
      const completedAt = new Date();
      mocks.transactionMock.mockResolvedValue([
        { id: LINE_ID, amount: 1, sequence: 1 },
        {
          ...baseSchedule,
          status: "COMPLETED",
          recognizedAmount: 10_000,
          remainingAmount: 0,
          completedMilestones: 4,
          completedAt,
        },
      ]);

      const response = await PATCH(
        makeRequest({ action: "recognize", amount: 1 }),
        { params }
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.status).toBe("COMPLETED");
      expect(body.data.completedAt).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------- reverse

  describe("action: reverse", () => {
    it("requires a lineId", async () => {
      mocks.scheduleFindFirstMock.mockResolvedValue(baseSchedule);

      const response = await PATCH(makeRequest({ action: "reverse" }), {
        params,
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toMatch(/lineId/);
      expect(mocks.transactionMock).not.toHaveBeenCalled();
    });

    it("returns 404 when the line does not exist or belongs to another schedule", async () => {
      mocks.scheduleFindFirstMock.mockResolvedValue({
        ...baseSchedule,
        status: "IN_PROGRESS",
      });
      mocks.lineFindFirstMock.mockResolvedValue(null);

      const response = await PATCH(
        makeRequest({ action: "reverse", lineId: LINE_ID }),
        { params }
      );

      expect(response.status).toBe(404);
      expect(mocks.transactionMock).not.toHaveBeenCalled();
    });

    it("soft-deletes the line and restores the aggregate amounts", async () => {
      mocks.scheduleFindFirstMock.mockResolvedValue({
        ...baseSchedule,
        status: "COMPLETED",
        recognizedAmount: 10_000,
        remainingAmount: 0,
      });
      mocks.lineFindFirstMock.mockResolvedValue({
        id: LINE_ID,
        scheduleId: SCHEDULE_ID,
        amount: 2500,
        status: "RECOGNIZED",
      });
      mocks.transactionMock.mockResolvedValue([
        null, // line update result (we don't read it)
        {
          ...baseSchedule,
          status: "IN_PROGRESS",
          recognizedAmount: 7500,
          remainingAmount: 2500,
          completedAt: null,
        },
      ]);

      const response = await PATCH(
        makeRequest({ action: "reverse", lineId: LINE_ID }),
        { params }
      );

      expect(response.status).toBe(200);
      expect(mocks.transactionMock).toHaveBeenCalledTimes(1);
      const body = await response.json();
      // Reverse must transition out of COMPLETED back into IN_PROGRESS.
      expect(body.data.status).toBe("IN_PROGRESS");
      expect(body.data.completedAt).toBeNull();
    });
  });

  // ---------------------------------------------------------------- cancel

  describe("action: cancel (migrated to manifest runtime)", () => {
    // `cancel` was migrated alongside a manifest-source change in
    // `packages/manifest-adapters/manifests/revenue-recognition-rules.manifest`:
    // the notes mutation is now gated on `reason != ""`, so callers that omit
    // a reason (the legacy route shape) preserve their existing notes value.
    // Callers that supply a non-empty reason now get a `\nCancelled: <reason>`
    // audit entry appended. These tests pin BOTH branches.

    it("rejects cancel on a COMPLETED schedule before invoking the runtime", async () => {
      mocks.scheduleFindFirstMock.mockResolvedValue({
        ...baseSchedule,
        status: "COMPLETED",
      });

      const response = await PATCH(makeRequest({ action: "cancel" }), {
        params,
      });

      expect(response.status).toBe(400);
      // 400 mapping is preserved by the route's pre-check; the manifest would
      // emit a 422 guardFailure for the same state.
      expect(mocks.createManifestRuntimeMock).not.toHaveBeenCalled();
      expect(mocks.runCommandMock).not.toHaveBeenCalled();
      expect(mocks.scheduleUpdateMock).not.toHaveBeenCalled();
    });

    it("invokes cancel via runtime with empty reason by default and read-backs the schedule", async () => {
      mocks.scheduleFindFirstMock
        .mockResolvedValueOnce({
          ...baseSchedule,
          status: "IN_PROGRESS",
        })
        .mockResolvedValueOnce({
          ...baseSchedule,
          status: "CANCELLED",
        });

      const response = await PATCH(makeRequest({ action: "cancel" }), {
        params,
      });

      expect(response.status).toBe(200);

      // Runtime constructed with the resolved user + entity.
      expect(mocks.createManifestRuntimeMock).toHaveBeenCalledTimes(1);
      const runtimeCtx = mocks.createManifestRuntimeMock.mock.calls[0][0];
      expect(runtimeCtx.entityName).toBe("RevenueRecognitionSchedule");

      // runCommand called with reason="" — the legacy request shape (no body
      // reason). The manifest's notes mutation is gated on `reason != ""`, so
      // this preserves the route's "do not touch notes" behavior.
      expect(mocks.runCommandMock).toHaveBeenCalledTimes(1);
      const [commandName, commandPayload, commandCtx] =
        mocks.runCommandMock.mock.calls[0];
      expect(commandName).toBe("cancel");
      expect(commandPayload).toEqual({ reason: "" });
      expect(commandCtx).toEqual(
        expect.objectContaining({
          entityName: "RevenueRecognitionSchedule",
          instanceId: SCHEDULE_ID,
        })
      );

      // Direct database.update is NOT called — the runtime's PrismaStore owns
      // the write.
      expect(mocks.scheduleUpdateMock).not.toHaveBeenCalled();

      const body = await response.json();
      expect(body.data.status).toBe("CANCELLED");
    });

    it("forwards body.reason verbatim so callers can opt into the audit trail", async () => {
      mocks.scheduleFindFirstMock
        .mockResolvedValueOnce({
          ...baseSchedule,
          status: "IN_PROGRESS",
        })
        .mockResolvedValueOnce({
          ...baseSchedule,
          status: "CANCELLED",
          notes: "Quarterly subscription\nCancelled: Customer request",
        });

      await PATCH(
        makeRequest({ action: "cancel", reason: "Customer request" }),
        { params }
      );

      // Reason MUST be forwarded verbatim. The manifest's conditional notes
      // mutation appends `\nCancelled: <reason>` only when reason != "".
      const [, commandPayload] = mocks.runCommandMock.mock.calls[0];
      expect(commandPayload).toEqual({ reason: "Customer request" });
    });

    it("maps runtime guardFailure to a 422 response (covers cancel on already-CANCELLED schedule)", async () => {
      mocks.scheduleFindFirstMock.mockResolvedValue({
        ...baseSchedule,
        status: "CANCELLED",
      });
      // Simulate the manifest guard rejecting a cancel against an already-
      // CANCELLED schedule. The legacy route silently returned 200 (idempotent
      // no-op); the migrated route now returns 422 with the guard's message.
      mocks.runCommandMock.mockResolvedValueOnce({
        success: false,
        guardFailure: {
          index: 0,
          formatted: "Cannot cancel completed recognition",
        },
      });

      const response = await PATCH(makeRequest({ action: "cancel" }), {
        params,
      });

      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.error).toMatch(/Cannot cancel/);
    });

    it("maps runtime policyDenial to a 403 response", async () => {
      mocks.scheduleFindFirstMock.mockResolvedValue({
        ...baseSchedule,
        status: "IN_PROGRESS",
      });
      mocks.runCommandMock.mockResolvedValueOnce({
        success: false,
        policyDenial: { policyName: "RevenueRecognitionManagement" },
      });

      const response = await PATCH(makeRequest({ action: "cancel" }), {
        params,
      });

      expect(response.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------- adjust

  describe("action: adjust", () => {
    it("rejects non-positive totalAmount", async () => {
      mocks.scheduleFindFirstMock.mockResolvedValue(baseSchedule);

      const response = await PATCH(
        makeRequest({ action: "adjust", totalAmount: 0 }),
        { params }
      );

      expect(response.status).toBe(400);
      expect(mocks.scheduleUpdateMock).not.toHaveBeenCalled();
    });

    it("recomputes remainingAmount when totalAmount changes", async () => {
      mocks.scheduleFindFirstMock.mockResolvedValue({
        ...baseSchedule,
        recognizedAmount: 3000,
      });
      mocks.scheduleUpdateMock.mockResolvedValue({
        ...baseSchedule,
        totalAmount: 12_000,
        recognizedAmount: 3000,
        remainingAmount: 9000,
      });

      const response = await PATCH(
        makeRequest({ action: "adjust", totalAmount: 12_000 }),
        { params }
      );

      expect(response.status).toBe(200);
      const dataArg = mocks.scheduleUpdateMock.mock.calls[0][0].data;
      expect(dataArg.totalAmount).toBe(12_000);
      expect(dataArg.remainingAmount).toBe(9000); // 12000 - 3000 already recognized
    });

    it("updates description, notes, endDate, and recognitionPeriod when provided", async () => {
      mocks.scheduleFindFirstMock.mockResolvedValue(baseSchedule);
      mocks.scheduleUpdateMock.mockResolvedValue(baseSchedule);

      const response = await PATCH(
        makeRequest({
          action: "adjust",
          description: "Updated subscription",
          notes: "Customer requested change",
          endDate: "2027-06-30T00:00:00.000Z",
          recognitionPeriod: "QUARTERLY",
        }),
        { params }
      );

      expect(response.status).toBe(200);
      const dataArg = mocks.scheduleUpdateMock.mock.calls[0][0].data;
      expect(dataArg.description).toBe("Updated subscription");
      expect(dataArg.notes).toBe("Customer requested change");
      expect(dataArg.endDate).toBeInstanceOf(Date);
      expect(dataArg.recognitionPeriod).toBe("QUARTERLY");
    });
  });

  // ---------------------------------------------------------------- error path

  it("returns 500 on unexpected database error", async () => {
    mocks.scheduleFindFirstMock.mockRejectedValue(new Error("DB exploded"));

    const response = await PATCH(makeRequest({ action: "start" }), { params });

    expect(response.status).toBe(500);
    expect(mocks.captureExceptionMock).toHaveBeenCalled();
  });
});
