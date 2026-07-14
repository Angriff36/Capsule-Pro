/**
 * Focused tests for POST /api/timecards/bulk — processEditRequests +
 * processExceptionFlags. These previously had NO test coverage. They pin the
 * read-N+1 collapse (per-iteration findUnique → one batched findMany) AND the
 * behavior parity (update-vs-create routing, exception-note accumulation,
 * including the duplicate-timeEntryId case the grouping must handle).
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, tx } = vi.hoisted(() => {
  const timeEntry = {
    findMany: vi.fn(() => Promise.resolve([])),
    updateMany: vi.fn(() => Promise.resolve({ count: 0 })),
  };
  const timecardEditRequest = {
    findFirst: vi.fn(() => Promise.resolve(null)),
    update: vi.fn(() => Promise.resolve({})),
    create: vi.fn(() => Promise.resolve({})),
  };
  const transactionClient = { timeEntry, timecardEditRequest };
  const database = {
    timeEntry,
    timecardEditRequest,
    // Interactive $transaction: invoke the callback with the same model stubs
    // so `tx.*` inside the handler resolves to the spies below.
    $transaction: vi.fn(
      async (cb: (t: typeof transactionClient) => Promise<unknown>) =>
        cb(transactionClient)
    ),
  };
  return { db: database, tx: transactionClient };
});

vi.mock("@repo/database", () => ({
  database: db,
  Prisma: { sql: () => "", empty: "", raw: (s: string) => s },
}));
vi.mock("@repo/auth/server", () => ({ auth: vi.fn() }));
vi.mock("@/app/lib/tenant", () => ({
  getTenantIdForOrg: vi.fn(),
  requireCurrentUser: vi.fn(),
}));
vi.mock("@/middleware/rate-limiter", () => ({
  // passthrough — exercise the raw handler, skip DB-backed rate-limit config
  withRateLimit: (fn: unknown) => fn,
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { auth } = await import("@repo/auth/server");
const { getTenantIdForOrg } = await import("@/app/lib/tenant");
const { POST } = await import("@/app/api/timecards/bulk/route");

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/timecards/bulk", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/timecards/bulk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      userId: "user-1",
      orgId: "org-1",
    } as never);
    vi.mocked(getTenantIdForOrg).mockResolvedValue(TENANT_ID as never);
    db.$transaction.mockImplementation(
      async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx)
    );
  });

  it("collapses processEditRequests timeEntry reads to one batched findMany (N→1)", async () => {
    // 3 editRequests: te-1 (existing→update), te-2 (none→create), te-3 (missing→skip).
    // findMany call order is deterministic: validateTimeEntries (1st) then the
    // edit-requests batch (2nd) — no per-iteration findUnique remains.
    tx.timeEntry.findMany
      .mockResolvedValueOnce([
        { id: "te-1", clockOut: new Date() },
        { id: "te-2", clockOut: new Date() },
        { id: "te-3", clockOut: new Date() },
      ] as never)
      .mockResolvedValueOnce([
        { id: "te-1", employeeId: "emp-1" },
        { id: "te-2", employeeId: "emp-2" },
      ] as never);
    // te-1 has an existing request (→ update); te-2 falls through to the stub
    // default null (→ create). te-3 is skipped before findFirst.
    tx.timecardEditRequest.findFirst.mockResolvedValueOnce({
      id: "er-1",
    } as never);

    const response = await POST(
      postRequest({
        approve: false,
        timeEntryIds: ["te-1", "te-2", "te-3"],
        editRequests: [
          { timeEntryId: "te-1", reason: "r1" },
          { timeEntryId: "te-2", reason: "r2" },
          { timeEntryId: "te-3", reason: "r3" },
        ],
      })
    );

    expect(response.status).toBe(200);

    // ONE batched employeeId read over all 3 edit-requests (not 3 findUnique).
    expect(tx.timeEntry.findMany).toHaveBeenCalledTimes(2); // validate + batch
    expect(tx.timeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true, employeeId: true },
        where: {
          tenantId: TENANT_ID,
          id: { in: ["te-1", "te-2", "te-3"] },
        },
      })
    );

    // findFirst stays serial per editRequest, but te-3 (missing entry) is
    // skipped BEFORE findFirst — so exactly 2 lookups (te-1, te-2).
    expect(tx.timecardEditRequest.findFirst).toHaveBeenCalledTimes(2);

    // te-1 → update of the existing request; te-2 → create; te-3 → nothing.
    expect(tx.timecardEditRequest.update).toHaveBeenCalledTimes(1);
    expect(tx.timecardEditRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_id: { tenantId: TENANT_ID, id: "er-1" } },
        data: expect.objectContaining({ status: "pending", reason: "r1" }),
      })
    );
    expect(tx.timecardEditRequest.create).toHaveBeenCalledTimes(1);
    expect(tx.timecardEditRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          timeEntryId: "te-2",
          employeeId: "emp-2",
          reason: "r2",
          status: "pending",
        }),
      })
    );

    const body = await response.json();
    expect(body.results.editRequestCount).toBe(3);
  });

  it("collapses processExceptionFlags notes reads to one batched findMany (N→1)", async () => {
    tx.timeEntry.findMany
      .mockResolvedValueOnce([
        { id: "te-1", clockOut: new Date() },
        { id: "te-2", clockOut: new Date() },
      ] as never)
      .mockResolvedValueOnce([
        { id: "te-1", notes: "base1" },
        { id: "te-2", notes: null },
      ] as never);

    const response = await POST(
      postRequest({
        approve: false,
        timeEntryIds: ["te-1", "te-2"],
        flagExceptions: [
          { timeEntryId: "te-1", exceptionType: "Missed", notes: "forgot" },
          { timeEntryId: "te-2", exceptionType: "Late", notes: "traffic" },
        ],
      })
    );

    expect(response.status).toBe(200);

    // ONE batched notes read over both distinct entries (validate + batch = 2).
    expect(tx.timeEntry.findMany).toHaveBeenCalledTimes(2);
    expect(tx.timeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { id: true, notes: true },
        where: {
          tenantId: TENANT_ID,
          id: { in: ["te-1", "te-2"] },
        },
      })
    );

    // One updateMany per distinct entry, with the accumulated note string.
    expect(tx.timeEntry.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.timeEntry.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { tenantId: TENANT_ID, id: "te-1", deletedAt: null },
        data: { notes: "base1 [EXCEPTION: Missed] forgot" },
      })
    );
    expect(tx.timeEntry.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { tenantId: TENANT_ID, id: "te-2", deletedAt: null },
        // null base notes → "" prefix, matching the prior `${timeEntry.notes ?? ""}` shape
        data: { notes: " [EXCEPTION: Late] traffic" },
      })
    );

    const body = await response.json();
    expect(body.results.exceptionFlagCount).toBe(2);
  });

  it("preserves sequential note accumulation for duplicate timeEntryIds in one request", async () => {
    // Two flags for the SAME entry → must accumulate in original order, one write.
    tx.timeEntry.findMany
      .mockResolvedValueOnce([{ id: "te-1", clockOut: new Date() }] as never)
      .mockResolvedValueOnce([{ id: "te-1", notes: "base" }] as never);

    await POST(
      postRequest({
        approve: false,
        timeEntryIds: ["te-1"],
        flagExceptions: [
          { timeEntryId: "te-1", exceptionType: "A", notes: "a1" },
          { timeEntryId: "te-1", exceptionType: "B", notes: "b1" },
        ],
      })
    );

    // Grouped → exactly ONE write for the entry, with both flags appended in order.
    expect(tx.timeEntry.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.timeEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID, id: "te-1", deletedAt: null },
        data: { notes: "base [EXCEPTION: A] a1 [EXCEPTION: B] b1" },
      })
    );
  });

  it("returns 401 and skips the transaction when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);

    const response = await POST(
      postRequest({ approve: true, timeEntryIds: ["te-1"] })
    );

    expect(response.status).toBe(401);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("returns 400 when no time entry ids are provided", async () => {
    const response = await POST(
      postRequest({ approve: true, timeEntryIds: [] })
    );

    expect(response.status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
