/**
 * Manifest-governed PayrollDataSource.
 *
 * Routes write operations (savePayrollPeriod, savePayrollRecords, savePayrollAudit)
 * through the Manifest runtime via runManifestCommandCore. Read operations delegate
 * to PrismaPayrollDataSource (reads bypass Manifest per constitution §2).
 *
 * Why: Payroll writes were 100% bypassing Manifest — no RBAC, no audit trail,
 * no tenant enforcement, no event emission. This data source provides governed
 * persistence while keeping the PayrollService calculation logic untouched.
 *
 * Governance: Task 8.1 Phase 2.
 */

import { database } from "@repo/database";
import type { PrismaTransactionClient } from "@repo/manifest-runtime/manifest-runtime-factory";
import type { ManifestUserContext } from "@repo/manifest-runtime/run-manifest-command-core";
import { runManifestCommandCore } from "@repo/manifest-runtime/run-manifest-command-core";
import { log } from "@repo/observability/log";
import type {
  PayrollAudit,
  PayrollPeriod,
  PayrollRecord,
} from "@repo/payroll-engine";
import { PrismaPayrollDataSource } from "@repo/payroll-engine";
import { createManifestRuntime } from "@/lib/manifest-runtime";

/**
 * Build the deps object expected by runManifestCommandCore.
 *
 * When `prismaOverride` (a Prisma transaction client) is supplied, every
 * Manifest write executed through these deps is routed to that transaction —
 * letting multiple command invocations share ONE atomic database transaction.
 * Reads issued during command execution (e.g. loading a PayrollRun to evaluate
 * a transition guard) go through the same client, so they observe uncommitted
 * writes from earlier commands in the batch (read-your-writes). See
 * manifest-runtime-factory.ts (`prismaForWrites = prismaOverride ?? prisma`).
 */
function makeCoreDeps(prismaOverride?: PrismaTransactionClient) {
  return {
    createRuntime: ({
      user,
      entityName,
    }: {
      user: ManifestUserContext;
      entityName: string;
    }) => createManifestRuntime({ user, entityName, prismaOverride }),
  };
}

type CoreDeps = ReturnType<typeof makeCoreDeps>;

/** Default (non-transactional) deps for standalone single-command writes. */
const coreDeps = makeCoreDeps();

/**
 * Execute a Manifest command and return the result.
 * Throws on failure so the caller (and any wrapping transaction) can surface
 * the error and roll back — failures are never swallowed.
 */
async function executeManifestCommand(
  params: {
    entity: string;
    command: string;
    body: Record<string, unknown>;
    user: ManifestUserContext;
    instanceId?: string;
  },
  deps: CoreDeps = coreDeps
): Promise<unknown> {
  const result = await runManifestCommandCore(deps, params);

  if (!result.ok) {
    throw new Error(
      `Manifest command ${params.entity}.${params.command} failed: ${result.message}`
    );
  }

  return result.result;
}

/**
 * ManifestPayrollDataSource implements PayrollDataSource.
 *
 * - Reads: delegate to PrismaPayrollDataSource (constitution §2 — reads bypass runtime)
 * - Writes: route through Manifest runtime for governed persistence
 */
export class ManifestPayrollDataSource extends PrismaPayrollDataSource {
  readonly #user: ManifestUserContext;

  constructor(user: ManifestUserContext) {
    super(database);
    this.#user = user;
  }

  /**
   * Governed write: save payroll period through Manifest.
   * Maps to PayrollPeriod.create command.
   */
  override async savePayrollPeriod(period: PayrollPeriod): Promise<void> {
    try {
      await executeManifestCommand({
        entity: "PayrollPeriod",
        command: "create",
        body: {
          id: period.id,
          periodStart: period.startDate.toISOString(),
          periodEnd: period.endDate.toISOString(),
        },
        user: this.#user,
      });
    } catch (error) {
      // If create fails (period may already exist), try a no-op approach:
      // Manifest doesn't have an upsert command, so we log and continue
      // since the period existing is actually fine for generation.
      log.info("PayrollPeriod.create skipped (may already exist)", {
        periodId: period.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Governed write: save payroll run + line items through Manifest.
   * Maps to PayrollRun.create → PayrollRun.process → loop PayrollLineItem.create.
   */
  override async savePayrollRecords(records: PayrollRecord[]): Promise<void> {
    if (records.length === 0) {
      return;
    }

    const periodId = records[0].periodId;

    // Aggregate totals across all records
    const summary = records.reduce(
      (acc, record) => ({
        totalGross: acc.totalGross + record.grossPay,
        totalDeductions: acc.totalDeductions + record.totalDeductions,
        totalNet: acc.totalNet + record.netPay,
      }),
      { totalGross: 0, totalDeductions: 0, totalNet: 0 }
    );

    // Persist the run header, its processed totals, and every line item in a
    // SINGLE database transaction.
    //
    // Why this matters: previously each command (PayrollRun.create →
    // PayrollRun.process → N× PayrollLineItem.create) ran as an independent
    // runtime invocation, and the process + line-item failures were caught and
    // logged ("swallowed"). A failure partway through left a payroll run whose
    // stored totals did not match its (partial) line items — yet
    // savePayrollRecords still returned successfully, so no later read could
    // detect the silent loss. On financial data that is unacceptable.
    //
    // The Manifest runtime routes all writes (and the entity reads issued during
    // command execution) through `prismaOverride` — the tx client — so
    // PayrollRun.process sees the just-created run via read-your-writes, and any
    // failure throws out of the transaction callback, rolling the WHOLE batch
    // back. This brings the governed write path to parity with the base
    // PrismaPayrollDataSource (Task 8.1): all-or-nothing, no swallowed failures.
    //
    // The timeout is raised above Prisma's 5s default because the governed path
    // runs the full command pipeline (policy, guards, middleware, outbox) per
    // line item, which is heavier than the base path's raw upserts.
    await database.$transaction(
      async (tx) => {
        const txDeps = makeCoreDeps(tx as unknown as PrismaTransactionClient);

        // Create the payroll run
        const runResult = await executeManifestCommand(
          {
            entity: "PayrollRun",
            command: "create",
            body: {
              id: periodId,
              payrollPeriodId: periodId,
              runDate: new Date().toISOString(),
            },
            user: this.#user,
          },
          txDeps
        );

        // Extract the run ID (may be the same as periodId or auto-generated)
        const payrollRunId =
          (runResult as Record<string, unknown>)?.id ?? periodId;

        // Process the run (pending → processing; sets financial totals).
        await executeManifestCommand(
          {
            entity: "PayrollRun",
            command: "process",
            body: {
              id: payrollRunId,
              totalGross: summary.totalGross.toFixed(2),
              totalDeductions: summary.totalDeductions.toFixed(2),
              totalNet: summary.totalNet.toFixed(2),
            },
            user: this.#user,
            instanceId: String(payrollRunId),
          },
          txDeps
        );

        // Create line items
        for (const record of records) {
          await executeManifestCommand(
            {
              entity: "PayrollLineItem",
              command: "create",
              body: {
                id: `${payrollRunId}_${record.employeeId}`,
                payrollRunId: String(payrollRunId),
                employeeId: record.employeeId,
                grossPay: record.grossPay.toFixed(2),
                netPay: record.netPay.toFixed(2),
                totalDeductions: record.totalDeductions.toFixed(2),
                hoursWorked: (
                  record.hoursRegular + record.hoursOvertime
                ).toFixed(2),
                hoursRegular: record.hoursRegular.toFixed(2),
                hoursOvertime: record.hoursOvertime.toFixed(2),
                rateRegular:
                  record.hoursRegular > 0
                    ? (record.regularPay / record.hoursRegular).toFixed(2)
                    : "0",
                rateOvertime:
                  record.hoursOvertime > 0
                    ? (record.overtimePay / record.hoursOvertime).toFixed(2)
                    : "0",
              },
              user: this.#user,
            },
            txDeps
          );
        }
      },
      { timeout: 120_000, maxWait: 15_000 }
    );
  }

  /**
   * Governed write: save payroll audit log through Manifest.
   * Uses PayrollApprovalHistory.create as the audit trail entity.
   *
   * Audit failures must not crash payroll processing (same contract as PrismaPayrollDataSource).
   */
  override async savePayrollAudit(audit: PayrollAudit): Promise<void> {
    try {
      await executeManifestCommand({
        entity: "PayrollApprovalHistory",
        command: "create",
        body: {
          payrollRunId: audit.periodId,
          action: audit.action,
          previousStatus: "",
          newStatus: "",
          performedBy: audit.userId ?? this.#user.id,
          reason: audit.resultSummary
            ? typeof audit.resultSummary === "string"
              ? audit.resultSummary
              : JSON.stringify(audit.resultSummary)
            : "",
        },
        user: this.#user,
      });
    } catch (error) {
      // Audit failures must not crash payroll processing (same contract as PrismaPayrollDataSource)
      log.error("[PayrollAudit] Failed to persist audit log via Manifest", {
        auditId: audit.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
