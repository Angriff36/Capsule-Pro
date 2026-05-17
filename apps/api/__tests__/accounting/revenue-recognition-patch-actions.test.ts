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

const mocks = vi.hoisted(() => ({
  scheduleFindFirstMock: vi.fn(),
  scheduleUpdateMock: vi.fn(),
  lineCreateMock: vi.fn(),
  lineUpdateMock: vi.fn(),
  lineFindFirstMock: vi.fn(),
  transactionMock: vi.fn(),
  requireTenantIdMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  consoleErrorMock: vi.fn(),
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
    mocks.captureExceptionMock.mockReset();
    mocks.consoleErrorMock.mockReset();

    mocks.requireTenantIdMock.mockResolvedValue(TENANT_ID);
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

  describe("action: start", () => {
    it("transitions PENDING → IN_PROGRESS", async () => {
      mocks.scheduleFindFirstMock.mockResolvedValue(baseSchedule);
      mocks.scheduleUpdateMock.mockResolvedValue({
        ...baseSchedule,
        status: "IN_PROGRESS",
      });

      const response = await PATCH(makeRequest({ action: "start" }), {
        params,
      });

      expect(response.status).toBe(200);
      const dataArg = mocks.scheduleUpdateMock.mock.calls[0][0].data;
      expect(dataArg.status).toBe("IN_PROGRESS");
    });

    it("rejects start on a non-PENDING schedule", async () => {
      mocks.scheduleFindFirstMock.mockResolvedValue({
        ...baseSchedule,
        status: "IN_PROGRESS",
      });

      const response = await PATCH(makeRequest({ action: "start" }), {
        params,
      });

      expect(response.status).toBe(400);
      expect(mocks.scheduleUpdateMock).not.toHaveBeenCalled();
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

  describe("action: cancel", () => {
    it("rejects cancel on a COMPLETED schedule", async () => {
      mocks.scheduleFindFirstMock.mockResolvedValue({
        ...baseSchedule,
        status: "COMPLETED",
      });

      const response = await PATCH(makeRequest({ action: "cancel" }), {
        params,
      });

      expect(response.status).toBe(400);
      expect(mocks.scheduleUpdateMock).not.toHaveBeenCalled();
    });

    it("transitions IN_PROGRESS → CANCELLED", async () => {
      mocks.scheduleFindFirstMock.mockResolvedValue({
        ...baseSchedule,
        status: "IN_PROGRESS",
      });
      mocks.scheduleUpdateMock.mockResolvedValue({
        ...baseSchedule,
        status: "CANCELLED",
      });

      const response = await PATCH(makeRequest({ action: "cancel" }), {
        params,
      });

      expect(response.status).toBe(200);
      const dataArg = mocks.scheduleUpdateMock.mock.calls[0][0].data;
      expect(dataArg.status).toBe("CANCELLED");
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
