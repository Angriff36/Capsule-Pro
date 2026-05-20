# Implementation Plan Archive — Executive Summary & Re-verification Deltas (2026-04-24)

> **⚠️ HISTORICAL DOCUMENT (2026-04-24).** Route counts and bypass numbers here are stale — this predates the dispatcher consolidation and constitution adoption. The schema-and-techdebt findings on nonconformances remain valid as historical context. For current architectural standards, see `constitution.md`.

Snapshot of the post-`b8c31eef` audit summary and the second/third re-verification passes. Kept verbatim for historical reference; do not edit.

## Executive Summary

The previous implementation plan (2026-03-08) was over-optimistic and has been substantially falsified by this audit. Between then and now, commit **b8c31eef (2026-04-19)** landed a massive expansion adding **five entirely new top-level modules** (accounting, facilities, logistics, payroll, procurement) plus load testing infrastructure and a suite of planning documents. None of that work was reflected in the old plan.

Core infrastructure remains strong:
- Manifest-driven command/event architecture is intact (63 manifest files / 91 entities / 389 commands / 387 events).
- Auth (Clerk), database (Prisma + Postgres schemas), and the `payroll-engine` package are production-quality.
- Original P0–P3 items that were genuinely completed (schema drift fixes, kitchen task reopen, webhook DLQ backend, email templates, rate limiting, API keys, RBAC, inventory audit, SMS rules, mobile search/settings/push) remain verified.

However, the new-module expansion shipped with:
- **Runtime crash bugs** in procurement (requisitions, vendor-contracts) and payroll (bank-accounts) caused by missing Prisma models and missing manifests.
- **Duplicate route directories** (`softDelete/` alongside `soft-delete/`) in ~45 modules causing Next.js routing ambiguity.
- **SQL injection risk** in logistics driver update.
- ~~**Zero row-level-security policies** on any post-March-8 migration — all new tables are cross-tenant readable.~~ **RESOLVED 2026-04-26**: RLS policies now cover all 17 post-March-8 tenant-scoped tables.
- **473 write handlers (46%)** still lack manifest coverage; 163 routes bypass the dispatcher entirely; 115 routes lack authentication.
- **Eight orphaned tables** in migrations with no Prisma model. ~~**3 created + 5 modeled 2026-04-26**~~: `Driver`, `Vehicle`, `FacilityAsset` now have migrations; `VendorContact`, `VendorRating`, `ProcurementBudget`, `ProcurementBudgetAlert`, `CrmScoringRule` now have Prisma models. Remaining: `ProcurementApproval`, `Deal`, `RevenueRecognitionSchedule`.
- **Falsified test claims** — several test-file paths and line counts referenced in the old plan do not match reality.

The Command Board authenticated UI appears to have been removed: `apps/app/app/(authenticated)/command-board/` **does not exist**, yet the old plan repeatedly cited files inside that directory.

This document supersedes the 2026-03-08 plan. Facts are grouped into the five required categories with file paths and line numbers so that any engineer can verify before acting.

---

## Re-verification Deltas (2026-04-24, third pass)

Third pass ran 10 parallel verification subagents against the second-pass claims. Corrections below are applied inline; this section is the changelog.

1. **Blocker 2a** — procurement requisitions have **8** command directories, not 9. The MISSING one is `delete/`, not `submit/`. Actual: `approve-finance, approve-manager, cancel, convert-to-po, create, reject, submit, update`. Second pass overstated by one.
2. **Blocker 2b** — procurement vendor-contracts have **7** command directories, not 8. The MISSING one is `update/`. Actual: `activate, approve, create, reject, submit, terminate, update-compliance`. Second pass overstated by one.
3. **Blocker 3** — Payroll bank-accounts routes do **NOT crash**. All 5 command routes use `database.$queryRaw` against `tenant_staff.employee_bank_accounts` directly, bypassing the missing `BankAccount` Prisma model. Pattern is broken (raw-SQL-instead-of-ORM) but not a runtime crash. Second pass was wrong about the failure mode.
4. **Blocker 4** — **23 modules** use one of the two spellings (not 21). 3 modules have the camelCase `softDelete/`, 2 of those 3 also have `soft-delete/` alongside it.
5. **Blocker 6** — The drivers/update/route.ts:41 code `${vehicleId !== undefined ? (vehicleId || null) + "::uuid" : "vehicle_id"}::uuid` is **NOT a classical SQL-injection vulnerability** — Prisma's `$queryRaw` template-literal interpolation parameterizes the computed string. It IS a **correctness bug**: the ternary emits `"<uuid-string>::uuid"` (a 40-char string with embedded cast syntax) which PostgreSQL then rejects at uuid cast time, and when vehicleId is undefined it emits the literal string `"vehicle_id"` as a parameter (not the column identifier the author intended). Still a Tier-1 blocker; the framing in the prior pass was wrong.
6. **Payroll engine tests** — 42 tests total (24 calculator + **18** export), not 46 (24 + 22). Second pass overcounted export by 4.
7. **MCP-server tests** — ~165 `it()` blocks across 10 test files (not 10 tests). "10 tests" was "10 files". Correct metric: 10 test files, 165 test cases.
8. **Dead code** — 21 orphan backup files (not 17). The second-pass count had an arithmetic error: 11 `.bak` + 6 `.backup` + 3 `.new` + 1 `.tmp` = 21, not 17. Individual extension counts were correct; the stated sum wasn't.
9. **`@ts-expect-error`/`@ts-ignore`** — 15 in committed source, not 10. Second-pass grep missed occurrences in 4 additional files.
10. **Raw SQL usage** — **1,577 occurrences across 250 files** (sixth-pass full grep count; prior "527 across 187" was a grep-line undercount, not occurrence count).
11. **Route-audit.md numbers are stale** — the planning doc (dated 2026-04-13) claims 163 bypass-dispatcher routes. Current count is closer to **~490** (3x underreport). `b8c31eef` added hundreds of new routes after the audit ran; the figures in that doc should not be quoted without re-running the scan.
12. **Manifest coverage gap** — real gap is **617 uncovered write handlers (61.6%)**, not 473 (46%). Routes `routes.manifest.json` only tracks POST; PUT/PATCH/DELETE handlers are entirely absent from coverage counts. Total write handlers = 1001, manifest-covered = 384.
13. **IR metrics** — `routes.manifest.json` reports **89 entities / 384 commands / 0 events** via `kind` fields (not 91/389/387). Event-sourced routes are either missing from the IR or counted differently. Treat the event count as suspect pending investigation.
14. **L1.6 proxy.ts merge conflict** — REMAINS FALSE. Third-pass subagent #5 flagged a conflict there; a direct grep confirms none exists. Prior plan was correct; that single subagent was wrong.
15. **Command Board** — L1.1 removal of the authenticated UI is confirmed, BUT the backend `apps/api/app/api/command-board/` has a **fully functional simulations engine** (11 subdirectories; `simulations/{apply,delta,discard,merge,route.ts}` all real). P1.3 "AI Simulation Engine is blocked" is **wrong** — the engine runs; only the UI-facing surface is missing. Users currently access the feature through the AI-assistant side panel (`apps/app/app/(authenticated)/components/ai-assistant/`) which calls `/api/command-board/chat`.
16. **Auto-generated camelCase route duplicates** — far more than the 5-12 listed in prior passes. A full top-level listing of `apps/api/app/api/` shows **~60 camelCase-no-hyphen directories** that appear auto-generated (see expanded list in Technical Debt section).
17. **Test file line counts have drifted** (files grew since plan metadata was recorded):
    - `apps/api/__tests__/ai/suggestions.test.ts` — 562 lines (plan said 501).
    - `apps/api/__tests__/inventory/forecasting.test.ts` — **837 lines** (plan said 267; off by a factor of 3).
    - `apps/api/__tests__/email-templates/templates.test.ts` — 1,078 lines (plan said 1,017).
18. **E2E skip count** — 25 `test.skip(true, …)` occurrences across 6 spec files, not 35 across 8. Revised offender list: communication-preferences (2), integrated-payment-processor (7), role-aware-empty-states (4), getting-started-checklist (1), illustrated-empty-states (4), recipe-scaling (7). `collaboration-workspace` and `ambient-animation` and `AI-context-aware-suggestions` skips from the second pass were not found in current source.
19. **Supplier sync logs** — `SupplierSyncLog` Prisma model was correctly removed from the orphaned-table list in the second pass. Still not orphaned.
20. **Spec `SPEC_connections.md`** (command board entity-relationship connections) — spec exists but **no backend routes or UI code**. Add to Category 3.

No new commits since `a71ec8d5`. Blocker validity unchanged at the file:line level; only counts and framing were corrected.

---

## Re-verification Deltas (2026-04-24, second pass — retained for history)

Second pass corrected the following factual errors in the first 2026-04-24 audit:

1. **Blocker 2a** — procurement requisitions have 9 command files (not 8); names are `create/update/delete/approve-finance/approve-manager/cancel/convert-to-po/reject/submit` (not `receive`).
2. **Blocker 2b** — vendor-contracts have 8 files with different names than first pass: `create/update/activate/approve/reject/submit/terminate/update-compliance` (no `delete/renew/amend/void`).
3. **Blocker 4** — 2 modules have both `softDelete/` and `soft-delete/`; 1 has only camelCase; 21 modules total. First pass' "~45" conflated paths with modules.
4. **P2.A Payment Methods** — `[id]` PUT/DELETE are functional at `payment-methods/[id]/route.ts:74-198`, not stubs.
5. **P2.E Procurement Approvals** — action route at `approvals/action/route.ts:68-97` has a working UPDATE + INSERT, not a stub.
6. **P2.D Payroll engine** — 46 tests (24 calculator + 22 export), not 24. Undercounted.
7. **Schema drift** — `supplier_sync_logs` has a `SupplierSyncLog` Prisma model; it is NOT orphaned. Remove from the list.
8. **Dead code** — 17 orphan backup files (not 9): 11 `.bak`, 6 `.backup`, 3 `.new`, 1 `.tmp`.
9. **`@ts-expect-error`/`@ts-ignore`** — 10 in committed source (not 12).
10. **Console logging** — 449 `console.log` + 1,727 `console.error` + 16 `console.warn` in `apps/api/` (~2,192 total). Prior "~393" only counted `console.log`.
11. **Quarantined manifests** — 17 live in `manifests-disabled/` (not just `facility-rules.manifest`). Full list now included in Manifest Coverage Audit.

No new commits since `a71ec8d5`. All Tier 0/1 blockers re-verified to still hold at the exact file paths and line numbers cited.

---
