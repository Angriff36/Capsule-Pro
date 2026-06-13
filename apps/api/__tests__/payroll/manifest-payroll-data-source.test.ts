/**
 * ManifestPayrollDataSource.savePayrollRecords — atomicity + fail-loud.
 *
 * Why this matters: the governed payroll write path persists a run as three
 * stages — PayrollRun.create -> PayrollRun.process -> N× PayrollLineItem.create.
 * It USED TO run each stage as an independent Manifest command invocation and
 * SWALLOW the process + per-line-item failures (caught + logged + continued).
 * A failure partway through left a payroll run whose stored totals did not match
 * its (partial) line items, yet savePayrollRecords still returned successfully —
 * silent financial data loss no read could detect.
 *
 * The fix wraps the whole batch in ONE database.$transaction and threads the
 * transaction client into every command via `prismaOverride`, so the runtime
 * writes (and the entity reads it issues to evaluate guards) all share the
 * transaction. Any failure throws out of the callback and rolls the batch back.
 *
 * These tests pin the INTENT, not just the mechanics:
 *  - the batch is wrapped in exactly one transaction (atomic boundary),
 *  - every command runs through ONE deps object bound to the SAME tx client,
 *  - a process failure throws (no longer swallowed) and aborts before line items,
 *  - a line-item failure throws (no longer swallowed) so the tx rolls back,
 *  - an empty record set opens no transaction at all.
 */

import type { PayrollRecord } from "@repo/payroll-engine";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  txClient,
  mockDatabase,
  runManifestCommandCore,
  createManifestRuntime,
} = vi.hoisted(() => {
  const txClient = { __txClient: "shared-transaction-client" };
  return {
    txClient,
    mockDatabase: {
      // Interactive transaction: run the callback with our sentinel tx client.
      // A throw inside the callback propagates (as real Prisma would, then
      // rolling back) — that is exactly the behavior the tests assert.
      $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
        cb(txClient)
      ),
    },
    runManifestCommandCore: vi.fn(),
    createManifestRuntime: vi.fn(async () => ({ __runtime: true })),
  };
});

vi.mock("@repo/database", () => ({ database: mockDatabase }));
// Isolate the unit: the base class only needs to accept the prisma client.
vi.mock("@repo/payroll-engine", () => ({
  PrismaPayrollDataSource: class {
  },
}));
vi.mock("@repo/manifest-runtime/run-manifest-command-core", () => ({
  runManifestCommandCore,
}));
vi.mock("@/lib/manifest-runtime", () => ({ createManifestRuntime }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { ManifestPayrollDataSource } from "@/lib/payroll/manifest-payroll-data-source";

const USER = { id: "user-1", tenantId: "tenant-1", role: "admin" };

function makeRecord(overrides: Partial<PayrollRecord> = {}): PayrollRecord {
  return {
    tenantId: "tenant-1",
    periodId: "period-1",
    employeeId: "emp-1",
    grossPay: 1000,
    netPay: 800,
    totalDeductions: 200,
    hoursRegular: 40,
    hoursOvertime: 5,
    regularPay: 800,
    overtimePay: 150,
    ...overrides,
  } as unknown as PayrollRecord;
}

describe("ManifestPayrollDataSource.savePayrollRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists the run header, process, and every line item in ONE transaction, all bound to the same tx client", async () => {
    runManifestCommandCore.mockResolvedValue({
      ok: true,
      result: { id: "period-1" },
    });

    const ds = new ManifestPayrollDataSource(USER);
    await ds.savePayrollRecords([
      makeRecord({ employeeId: "emp-1" }),
      makeRecord({ employeeId: "emp-2" }),
    ]);

    // Exactly one transaction wraps the whole batch (the atomic boundary).
    expect(mockDatabase.$transaction).toHaveBeenCalledTimes(1);

    // create + process + 2 line items, in order.
    const calls = runManifestCommandCore.mock.calls;
    expect(calls).toHaveLength(4);
    expect(calls[0][1]).toMatchObject({
      entity: "PayrollRun",
      command: "create",
    });
    expect(calls[1][1]).toMatchObject({
      entity: "PayrollRun",
      command: "process",
    });
    expect(calls[2][1]).toMatchObject({
      entity: "PayrollLineItem",
      command: "create",
    });
    expect(calls[3][1]).toMatchObject({
      entity: "PayrollLineItem",
      command: "create",
    });

    // Every command ran through ONE deps object (the transaction-bound deps).
    const depsArgs = calls.map((c) => c[0]);
    expect(new Set(depsArgs).size).toBe(1);

    // That deps injects the transaction client as `prismaOverride`, so all
    // runtime writes/reads share the transaction (read-your-writes).
    await depsArgs[0].createRuntime({
      user: { id: USER.id, tenantId: USER.tenantId },
      entityName: "PayrollRun",
    });
    expect(createManifestRuntime).toHaveBeenCalledWith({
      user: { id: USER.id, tenantId: USER.tenantId },
      entityName: "PayrollRun",
      prismaOverride: txClient,
    });
  });

  it("throws (no longer swallows) when a line item fails, so the transaction rolls back", async () => {
    runManifestCommandCore
      .mockResolvedValueOnce({ ok: true, result: { id: "period-1" } }) // create
      .mockResolvedValueOnce({ ok: true, result: {} }) // process
      .mockResolvedValueOnce({ ok: true, result: {} }) // line item 1
      .mockResolvedValueOnce({ ok: false, message: "constraint violation" }); // line item 2

    const ds = new ManifestPayrollDataSource(USER);

    await expect(
      ds.savePayrollRecords([
        makeRecord({ employeeId: "emp-1" }),
        makeRecord({ employeeId: "emp-2" }),
      ])
    ).rejects.toThrow(/PayrollLineItem\.create failed: constraint violation/);

    // The failure propagated OUT of the single wrapping transaction callback —
    // in production that rolls back the run header + earlier line items.
    expect(mockDatabase.$transaction).toHaveBeenCalledTimes(1);
  });

  it("throws (no longer swallows) when process fails, and never reaches line items", async () => {
    runManifestCommandCore
      .mockResolvedValueOnce({ ok: true, result: { id: "period-1" } }) // create
      .mockResolvedValueOnce({ ok: false, message: "bad transition" }); // process

    const ds = new ManifestPayrollDataSource(USER);

    await expect(
      ds.savePayrollRecords([makeRecord({ employeeId: "emp-1" })])
    ).rejects.toThrow(/PayrollRun\.process failed: bad transition/);

    // Aborted at process: create + process only, no line-item command attempted.
    expect(runManifestCommandCore).toHaveBeenCalledTimes(2);
  });

  it("no-ops on an empty record set (opens no transaction)", async () => {
    const ds = new ManifestPayrollDataSource(USER);
    await ds.savePayrollRecords([]);

    expect(mockDatabase.$transaction).not.toHaveBeenCalled();
    expect(runManifestCommandCore).not.toHaveBeenCalled();
  });
});
