0a. Study `specs/*` with up to 250 parallel subagents to learn the application specifications.
0b. Study @IMPLEMENTATION_PLAN.md (if present) to understand the plan so far.
0c. Study `packages/*` with up to 250 parallel subagents to understand shared utilities and components.
0d. For reference, the application source code is in `apps/*`
0e. Study `specs/` directory for requirement specifications.

1. @IMPLEMENTATION_PLAN.md was last updated 2026-03-08 but a MASSIVE feature expansion happened since (commit b8c31eef: "Massive feature expansion: accounting, command board, CRM, facilities, inventory, kitchen, logistics, payroll, procurement, staff modules; load testing"). The plan is 6 weeks stale. Your job: use up to 500 subagents to study the CURRENT source code in `apps/*` and `packages/*` and find what's ACTUALLY there now vs what the plan claims. For each claimed-completed item: verify the code still exists, tests pass, and the feature works end-to-end. For new features NOT in the plan: document what exists and its actual completion state. Ultrathink.

2. Use an Opus subagent to analyze findings and update @IMPLEMENTATION_PLAN.md. Structure as:
   - Category 1: CLAIMED DONE BUT BROKEN OR MISSING (highest priority — lies in the plan)
   - Category 2: PARTIALLY IMPLEMENTED (code exists but incomplete)
   - Category 3: NOT STARTED (spec exists but no code)
   - Category 4: NEW FEATURES (not in plan, found in codebase — document state)
   - Category 5: VERIFIED DONE (actually works — move to bottom, keep for reference)

3. For each issue found, include: file path, what's wrong, what's needed to fix it. Be specific — function names, line ranges, missing imports.

4. Check for: TODO comments, placeholder/stub functions, skipped tests, inconsistent patterns, missing error handling, hardcoded values that should be configurable, schema drift (Prisma vs actual DB), missing RLS policies, dead code, routes that reference non-existent Prisma models (like the marketing routes that were deleted).

5. Pay SPECIAL ATTENTION to the post-March-8 additions:
   - Accounting module (chart-of-accounts, invoices, payments, collections, revenue-recognition)
   - Facilities module (areas, assets, schedules, work-orders)
   - Logistics module (dispatch, drivers, routes, tracking, vehicles, shipments)
   - Payroll module (periods, runs, bank-accounts, deductions, approvals, tax)
   - Procurement module (purchase-orders, vendors, budgets, approvals, requisitions)
   - Load testing infrastructure (testing/load-test.js)
   - New pages and UI components across all modules
   - Any new specs/ that were added

6. Also check `planning/` directory for documented gaps and `tasks/todo.md` for known issues.

IMPORTANT: Plan only. Do NOT implement anything. Do NOT assume functionality is missing; confirm with code search first. This is a DIAGNOSIS run — we want the honest truth about project state, not an optimistic summary.

99999. Be brutal. If a feature is claimed complete but has no tests, it's not complete. If it has tests but they're skipped, it's not complete. If the code exists but throws errors, it's not complete. Mark it honestly.

999999. Keep @IMPLEMENTATION_PLAN.md as the single source of truth. When items are verified done, move them to a VERIFIED section at the bottom. When items are found broken, mark them clearly with evidence. UPDATE the "Last updated" date at the top.

9999999. Update @AGENTS.md if you discover new operational learnings (build commands, test patterns, gotchas).
