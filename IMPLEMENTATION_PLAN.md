# IMPLEMENTATION_PLAN.md — v81

> Updated 2026-05-14
> All 22 P0 items resolved (v65-v72). Test suite repair complete (v77-v80).

---

## P0 — Critical Bugs (Resolved)

All 22 P0 items resolved. See `docs/implementation-history/v77-v80-test-suite-repair.md` for test suite repair details (v77-v80).

**Test count**: 0 failing / 3719 passing / 19 skipped

---

## P1 — High Priority (In Progress)

### P1.A — Design System Compliance [ONGOING]

- [ ] **ResearchTable**: 125+ bare `<Table>` usages confirmed. 10 ResearchTable import files.
- [ ] **BlogFilterChip**: 7 import files, 16 uses.
- [ ] **30/40 design blocks have zero external consumers**
- [ ] **Decorative pastel backgrounds**: 523 `bg-*-50/100/200` instances across 105 files.

### P1.B — Console Statements [ONGOING]

~974 total across ~364 files. `console.log`: 429/52 files. `console.error`: 501/293 files.

### P1.C — RLS Gaps [PARTIAL]

14 migration files enable RLS across 20+ tables. Tables without RLS:
- `tenant_accounting.*` (all tables)
- `tenant_inventory.vendor_catalogs`, `pricing_tiers`, `bulk_order_rules`, `procurement_budgets`, `vendor_contacts`

---

## P2 — Medium Priority (Feature Gaps / Hardening)

### P2.A — Accounting
- [ ] No journal entries / general ledger
- [ ] Financial reports expense totals hardcoded to 0
- [ ] No accounts payable

### P2.B — Events
- [ ] Event.importWorkflowId NOT in schema
- [ ] Import pipeline: backend has flat `parseStatus`; UI shows 8-phase display
- [ ] Event import code commented out — BLOCKER at `apps/api/app/api/events/documents/parse/route.ts:936-944`

### P2.D — Payroll
- [ ] State tax coverage only 8/50 states
- [ ] Period ID generation produces non-UUID strings

### P2.E — Scheduling
- [ ] No `apps/api/app/api/scheduling/` directory — no scheduling API exists at all

### P2.G — Search
- [ ] FR-107 violation: single-char queries return 200+empty not 400
- [ ] No saved searches, no search history

### P2.O — Command Board
- [ ] AI Chat UI, Plan Approval UI, Simulation toggle UI all missing (APIs exist)
- [ ] React Flow not used (spec requires it)
- [ ] Data model divergence: frontend uses `CommandBoardCard`, API uses `BoardProjection`

### P2.T — Kitchen: Hardcoded Nutrition Database
- [ ] 16 hardcoded ingredients. Anything else silently returns zero nutrition values.

---

## Spec Gap Summary

See `docs/audits/v61-spec-comparison.md` for detailed per-spec analysis.

| Priority | Domain | Files | Status |
|----------|--------|-------|--------|
| CRITICAL | kitchen/ | 240 | No spec |
| HIGH | crm/ | 78 | No spec |
| HIGH | analytics/ | 79 | No metrics contract |
| MEDIUM | scheduling/ | 41 | No API |
| MEDIUM | accounting/ | 50 | Financial module |

---

## Archive Map

Completed pass write-ups and historical notes:
- `docs/implementation-history/` — pass logs, executive summaries
- `docs/audits/` — numbered audit passes
- `docs/audits/v61-spec-comparison.md` — detailed spec gap analysis
- `docs/implementation-history/v77-v80-test-suite-repair.md` — test suite repair (v77-v80)

---

## Methodology

- **v80**: Fixed `requireCurrentUser` mock pattern across 98+ test files. Root cause: tests mocked `auth()` to return null for 401 tests, but `requireCurrentUser` was mocked at module level with `mockResolvedValue({...})` so it always returned a user.
- **v77-v80**: Test suite repair. Progress: 678 → 527 → 473 → 0 failing tests.
- **v65-v72**: All 22 P0 items resolved across payroll, scheduling, security, marketing, procurement, events, knowledge base, event intake, settings, logistics, CRM.
- **v64**: 60+ agent comprehensive audit.
- **v63**: Full re-verification of all 30 P0 items by 40+ parallel agents.
- **v62**: Full re-verification of all 28 P0 items.
- **v61**: Massive multi-agent audit synthesis.
- **v60**: 30+ parallel Sonnet verification agents + 1 Opus synthesis.
- **v59**: 80+ parallel verification agents.
- **v58**: Initial 80+ agent audit.