# Task: Atomic governed payroll write path (ManifestPayrollDataSource)

## Problem
`apps/api/lib/payroll/manifest-payroll-data-source.ts` `savePayrollRecords()` ran
`PayrollRun.create → PayrollRun.process → N× PayrollLineItem.create` as independent
`runManifestCommandCore` invocations and **swallowed** the `process` and per-line-item
failures (caught + logged + continued). Result: a failure partway through left a payroll
run whose totals didn't match its partial line items, yet the method returned success —
silent financial data loss no read could detect.

This was the open follow-up to commit `b6690d91b` (which made the *base*
`PrismaPayrollDataSource` atomic via `$transaction`); the *governed* path was still
non-atomic. (See memory: payroll-run-status-ir-drift.)

## Root-cause fix (not a band-aid)
The Manifest runtime already supports atomic multi-command writes: `createManifestRuntime`
accepts `prismaOverride` (a Prisma tx client); the factory routes both reads and writes
for entity stores through it (`prismaForWrites = prismaOverride ?? prisma`,
manifest-runtime-factory.ts:379 + storeProvider:424/445). So wrapping the batch in one
`database.$transaction` and threading `prismaOverride: tx` into each command makes the
whole sequence all-or-nothing (read-your-writes lets `process` see the just-created run).
Remove the swallow try/catch blocks so any failure rolls back.

## Plan
- [x] Verify runtime tx support (`prismaOverride`) + store reads use tx client
- [x] Verify PayrollRun states (pending→processing→approved→paid) + process guard `status=="pending"`
- [ ] Refactor `executeManifestCommand` to accept deps; add `makeCoreDeps(prismaOverride?)`
- [ ] Wrap `savePayrollRecords` in `database.$transaction`, thread `txDeps`, drop swallows
- [ ] New unit test `apps/api/__tests__/payroll/manifest-payroll-data-source.test.ts`:
      atomic success (tx threaded into createManifestRuntime), line-item failure throws,
      process failure throws, empty no-op
- [ ] `pnpm --filter api typecheck` green
- [ ] New test passes
- [ ] Update IMPLEMENTATION_PLAN.md + memory; commit + tag + push

## Review

**Done (v0.12.246).** The governed payroll write path is now atomic and fail-loud.

What changed (2 files):
- `apps/api/lib/payroll/manifest-payroll-data-source.ts`:
  - `coreDeps` → `makeCoreDeps(prismaOverride?)`; `executeManifestCommand` gained an
    optional `deps` param (backward compatible — `savePayrollPeriod`/`savePayrollAudit`
    keep the default non-tx deps and their intentional swallow contracts).
  - `savePayrollRecords` wraps create→process→N×lineItem in ONE `database.$transaction`,
    threading `prismaOverride: tx` into every command. Removed the process + line-item
    swallow try/catch → any failure throws out of the callback → full rollback.
- `apps/api/__tests__/payroll/manifest-payroll-data-source.test.ts` (NEW, 4 tests):
  atomic success + tx-threading (proves all commands share one deps bound to the tx
  client via `prismaOverride`), line-item failure throws, process failure throws + aborts
  before line items, empty no-op.

Why this is the root fix, not a band-aid: the runtime already supported atomic
multi-command writes (`createManifestRuntime` ctx `prismaOverride`; factory
`prismaForWrites = prismaOverride ?? prisma`; the entity store uses that client for reads
too → `PayrollRun.process` sees the just-created run via read-your-writes). So no saga was
needed — just thread the transaction. Brings the governed path to parity with the base
`PrismaPayrollDataSource` (Task 8.1).

Verification:
- `pnpm --filter api typecheck` → exit 0.
- `pnpm --filter api test __tests__/payroll/manifest-payroll-data-source.test.ts` → 4/4 pass.
- `pnpm --filter api test __tests__/payroll` → 6 files, 50 tests pass.
- `pnpm --filter payroll-engine test` → 3 files, 46 tests pass.

Parent-context guardrail (6a): N/A — this task changes a runtime persistence path's
atomicity; it introduces no new parent→child UI/API surface and no IR/command-param change,
so no parent-owned field becomes required input. `tenantId` is still injected by the runtime
tenant context, not the caller.

Remaining payroll follow-up (documented, not in scope): `runs/route.ts` zod enum +
`approvals/route.ts` `PayrollRunStatus` unions still list legacy `completed`/`finalized`.
The approvals SQL intentionally keeps `'completed'` for legacy rows, so narrowing the TS
type alone would lie about runtime — needs a §14 vocabulary + legacy-data decision.
