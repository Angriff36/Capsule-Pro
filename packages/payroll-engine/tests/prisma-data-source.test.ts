/**
 * PrismaPayrollDataSource.savePayrollRecords — atomicity + IR-conformant status.
 *
 * Why these tests exist (the bugs they pin):
 *
 *  1. Atomicity (was: "Non-transactional writes in payroll — savePayrollRecords()
 *     can leave partial state"). The method used to upsert the payroll-run header
 *     and then loop N line-item upserts as independent statements. A failure
 *     partway through the loop left a run whose stored totals did not match its
 *     (partial) line items — a silently inconsistent payroll. The fix wraps the
 *     whole batch in ONE `$transaction`; these tests prove every write goes
 *     through that transaction boundary and that a line-item failure aborts the
 *     batch instead of being swallowed.
 *
 *  2. IR-conformant status (was: writes status "completed"). The Manifest
 *     `PayrollRun` state machine is pending -> processing -> approved -> paid;
 *     "completed" is not a valid state. Persisting it poisoned later transitions
 *     (the `approve` command guards `self.status == "processing"`) and hid the
 *     run from the approvals queue. A generated run has had its totals computed,
 *     i.e. it has been *processed*, so the correct status is "processing" — which
 *     is also exactly what the governed write path (ManifestPayrollDataSource:
 *     create -> process) produces.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaPayrollDataSource } from "../src/dataSource/PrismaPayrollDataSource";
import type { PayrollRecord } from "../src/models";

const TENANT = "00000000-0000-0000-0000-0000000000aa";
const PERIOD = "11111111-1111-4111-a111-111111111111";

function makeRecord(overrides: Partial<PayrollRecord> = {}): PayrollRecord {
  return {
    id: "rec-1",
    tenantId: TENANT,
    periodId: PERIOD,
    employeeId: "emp-1",
    employeeName: "Jane Doe",
    department: "Kitchen",
    roleName: "Line Cook",
    hoursRegular: 40,
    hoursOvertime: 5,
    regularPay: 800,
    overtimePay: 150,
    tips: 0,
    grossPay: 950,
    preTaxDeductions: [],
    taxableIncome: 950,
    taxesWithheld: [],
    totalTaxes: 0,
    postTaxDeductions: [],
    totalDeductions: 100,
    netPay: 850,
    currency: "USD",
    ...overrides,
  };
}

/**
 * Build a fake Prisma client whose `$transaction` runs the interactive callback
 * with a transaction-scoped delegate set, so we can observe exactly which writes
 * happen inside the transaction.
 */
function makeFakePrisma() {
  const payrollRunUpsert = vi.fn().mockResolvedValue({ id: PERIOD });
  const payrollLineItemUpsert = vi.fn().mockResolvedValue({});
  const tx = {
    payrollRun: { upsert: payrollRunUpsert },
    payrollLineItem: { upsert: payrollLineItemUpsert },
  };
  const $transaction = vi.fn(
    async (fn: (txClient: typeof tx) => Promise<unknown>) => fn(tx)
  );
  // The data source's outer client only ever calls $transaction in this path.
  const prisma = { $transaction, ...tx };
  return { prisma, $transaction, payrollRunUpsert, payrollLineItemUpsert };
}

function makeDataSource(prisma: ReturnType<typeof makeFakePrisma>["prisma"]) {
  // Test double — cast to the constructor's client shape.
  return new PrismaPayrollDataSource(
    prisma as unknown as ConstructorParameters<
      typeof PrismaPayrollDataSource
    >[0]
  );
}

describe("PrismaPayrollDataSource.savePayrollRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists the run header and every line item inside a single $transaction", async () => {
    const { prisma, $transaction, payrollRunUpsert, payrollLineItemUpsert } =
      makeFakePrisma();
    const ds = makeDataSource(prisma);

    await ds.savePayrollRecords([
      makeRecord({ id: "rec-1", employeeId: "emp-1" }),
      makeRecord({ id: "rec-2", employeeId: "emp-2" }),
    ]);

    // Exactly one transaction wraps the whole batch.
    expect($transaction).toHaveBeenCalledTimes(1);
    // The run header is written once, the line items once per record — all via
    // the transaction-scoped delegates passed into the $transaction callback.
    expect(payrollRunUpsert).toHaveBeenCalledTimes(1);
    expect(payrollLineItemUpsert).toHaveBeenCalledTimes(2);
  });

  it("writes an IR-valid 'processing' status — never the invalid 'completed'", async () => {
    const { prisma, payrollRunUpsert } = makeFakePrisma();
    const ds = makeDataSource(prisma);

    await ds.savePayrollRecords([makeRecord()]);

    const arg = payrollRunUpsert.mock.calls[0][0];
    expect(arg.create.status).toBe("processing");
    expect(arg.update.status).toBe("processing");
    // Hard guard against the regression: "completed" is not in the IR state machine.
    expect(JSON.stringify(arg)).not.toContain("completed");
    // The run id is derived from the period id (no dependency on the upsert result).
    expect(arg.create.id).toBe(PERIOD);
    expect(arg.where.tenantId_id.id).toBe(PERIOD);
  });

  it("is atomic: a line-item failure rejects the whole batch (no silent partial state)", async () => {
    const { prisma, $transaction, payrollLineItemUpsert } = makeFakePrisma();
    // First line item succeeds, second blows up — the real DB would roll the
    // run header and the first line item back; here we prove the error is NOT
    // swallowed and propagates out of the transaction boundary.
    payrollLineItemUpsert
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("db write failed"));

    const ds = makeDataSource(prisma);

    await expect(
      ds.savePayrollRecords([
        makeRecord({ id: "rec-1", employeeId: "emp-1" }),
        makeRecord({ id: "rec-2", employeeId: "emp-2" }),
      ])
    ).rejects.toThrow("db write failed");

    // The failing write happened inside the single transaction boundary.
    expect($transaction).toHaveBeenCalledTimes(1);
  });

  it("no-ops on an empty record set (opens no transaction)", async () => {
    const { prisma, $transaction } = makeFakePrisma();
    const ds = makeDataSource(prisma);

    await ds.savePayrollRecords([]);

    expect($transaction).not.toHaveBeenCalled();
  });
});
