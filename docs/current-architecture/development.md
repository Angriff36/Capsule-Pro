# Development Notes

## Setup Discipline (Required)

- Follow all relevant setup steps from official docs end-to-end (install, env, scripts, generators, integration).
- No minimal patterns or partial installs; wire into the actual repo files.
- If blocked or missing secrets, stop and ask before proceeding.

## Design Patterns

### Builder pattern (preferred for many optional inputs)
- Use when a constructor/function has many positional params (5+), or when options are frequently extended.
- Favor fluent setters + `build()` over long positional argument lists.
- Validate required fields in `build()` with precise error messages.

**Current usage**
- Payroll calculation: `PayrollRecordBuilder` in `packages/payroll-engine/src/core/calculator.ts`.
- QuickBooks Online export: `QBOnlineJournalBuilder` in `packages/payroll-engine/src/exporters/qbOnlineCsvExport.ts`.

### Factory pattern (centralize object/strategy creation)
- Use when the codebase repeats `new` + conditionals to choose types or strategies.
- Put branching logic in one factory function/class, keep call sites simple.

**Current usage**
- Payroll exports: `createPayrollExporter` in `packages/payroll-engine/src/exporters/index.ts`.
- AI SDK errors: `createSDKError` in `packages/ai/src/errors.ts`.
