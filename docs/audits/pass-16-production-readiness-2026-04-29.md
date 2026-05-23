# Production-Readiness Gap Analysis — 2026-04-29

## Executive Summary

Comprehensive audit of the Capsule Pro codebase comparing `specs/*` against `apps/*` to identify missing implementations, placeholders, skipped tests, and production-readiness gaps.

**STATUS: ANALYSIS COMPLETE**

---

## SPEC Coverage (60 Total)

| Status | Count | Percentage |
|--------|-------|------------|
| COMPLETE | 9 | 15% |
| TODO | 51 | 85% |

### COMPLETE Specs (9)
1. `kitchen-allergen-tracking` — Allergen tracking for recipes/dishes
2. `kitchen-prep-list-generation` — Prep list generation from events
3. `kitchen-waste-tracking` — Waste logging and reporting
4. `analytics-client-lifetime-value` — Client LTV calculations
5. `analytics-employee-performance` — Staff performance metrics
6. `analytics-profitability-dashboard` — Event profitability analysis
7. `hydration-resistance` — Next.js SSR stability
8. `performance-enhancements` — Route caching, bundle optimization
9. `bundle_implementation` — Client dependency isolation

### TODO Specs by Domain (51)
| Domain | TODO | COMPLETE | Notes |
|--------|------|----------|-------|
| Staff | 10 | 0 | Payroll, scheduling, training |
| AI | 7 | 0 | Conflict detection, summaries |
| Kitchen | 7 | 3 | Budget tracking, import/export |
| Administrative | 6 | 3 | Email workflows, Goodshuffle sync |
| CRM | 4 | 0 | Communication log, segmentation |
| Inventory | 4 | 0 | Depletion forecasting, costing |
| Mobile | 5 | 0 | Recipe viewer, time clock |
| Warehouse | 3 | 0 | Cycle counting, receiving |
| Integrations | 3 | 0 | Nowsta, SMS, webhooks |

---

## API Routes Analysis

### Kitchen (33 entities)
- Command routes: ~140 (use `runtime.runCommand()`)
- Query routes: ~80 (use Prisma ORM)
- Raw SQL routes: 9 (allergens, recipes, waste, AI bulk-generate)

### Events (22 entities)
- Command routes: ~79
- Query routes: ~60
- Raw SQL routes: 18 (exports, waitlist, contracts, imports)

### Staff/Scheduling
- Heavy raw SQL usage (~50 routes) — **SECURITY RISK**
- Commands use Manifest runtime; queries use `$queryRaw`
- Should convert to Prisma ORM

### Payroll
- Mixed patterns: some Prisma ORM, some raw SQL (~15 routes)
- `payroll/runs`, `payroll/approvals`, `payroll/periods` use raw SQL
- Financial data exposure risk

### Inventory
- 9+ BROKEN_PRISMA_READ entities
- Commands write to Manifest, reads use Prisma ORM
- Write path doesn't persist to same table as read path

### Procurement
- 3 RAW_SQL entities (vendors, purchase-orders, budget)
- No Prisma models — bypass ORM entirely
- **SECURITY RISK** — raw SQL injection potential

### CRM
- Mostly aligned (manifest + Prisma)
- **Venues API disabled** — no Venue model in Prisma schema
- Frontend exists at `/crm/venues/*` but API returns 404

### Accounting
- Mix of Prisma ORM and manifest runtime
- Chart of accounts uses manifest commands
- Invoices, payments use direct Prisma

---

## BROKEN_PRISMA_READ Entities (19)

Commands write to Manifest/JSON store; reads query Prisma tables:

| Entity | Impact |
|--------|--------|
| bulk-order-rules | Create doesn't persist |
| pricing-tiers | Create doesn't persist |
| vendor-catalogs | Create doesn't persist |
| inventory-transactions | Create doesn't persist |
| purchase-order-items | Create doesn't persist |
| cycle-count-sessions | Create doesn't persist |
| cycle-count-records | Create doesn't persist |
| cycle-count-variance-reports | Create doesn't persist |
| requisitions | Create doesn't persist |

**Fix Pattern:** Add entity-specific PrismaStore, wire into ENTITIES_WITH_SPECIFIC_STORES.

---

## RAW_SQL Routes (146 total)

Routes bypassing Prisma ORM with `$queryRaw`:

| Domain | Count | Risk Level |
|--------|-------|------------|
| Staff/Scheduling | ~50 | HIGH |
| Procurement | ~20 | HIGH |
| Payroll | ~15 | HIGH |
| Events | 18 | MEDIUM |
| Kitchen | 9 | MEDIUM |

**Risk:** SQL injection potential, no type safety, tenant isolation gaps.

---

## Frontend Pages Analysis

### Real Implementations
- Kitchen: ~28 pages (mostly functional)
- Events: ~17 pages (mostly functional)
- Staff/Scheduling: ~15 pages (some mocks)
- Payroll: ~10 pages (mostly functional)
- Inventory: ~12 pages (mostly functional)
- CRM: ~15 pages (ALL real)
- Analytics: 9 pages (ALL real)

### Placeholder Modules (6)
| Module | Status | File |
|--------|--------|------|
| Marketing | Empty placeholder | `marketing/page.tsx` |
| Tools | Landing only | `tools/page.tsx` |
| Logistics | Hub only, no views | `logistics/page.tsx` |
| Settings | Landing only | `settings/page.tsx` |
| Payroll | Landing only | `payroll/page.tsx` |
| Kitchen Quality Assurance | Hardcoded data | `kitchen/quality-assurance/page.tsx` |

### Mock Data Pages
| Page | Issue |
|------|-------|
| Scheduling/Requests | Hardcoded `requestQueue` array |
| Payroll/Payouts | Hardcoded static `payouts` array |

### Incomplete Features
- Scoring page: "Delete not implemented yet"
- Venues: API disabled, frontend exists (mismatch)

---

## Test Coverage

### API Tests
- **Total files:** 74
- **Total tests:** ~500+
- **Coverage:** ~17% of API modules have tests
- **Skipped:** 1 (`sales-reporting/generate.test.ts`)
- **Todo:** 0

### E2E Tests
- **Workflow files:** 15
- **Total tests:** 91
- **Conditional skips:** 21
- **Files with skips:** 6 (integration-payment-processor, recipe-scaling, etc.)

### Critical Gaps
1. Recipe/Prep system — no unit tests
2. Payroll workflows — no integration tests
3. Menu/Dish management — no tests
4. Training management — no tests
5. Event lifecycle — only 1 test file

---

## RLS Coverage (SECURITY CRITICAL)

### tenant_accounting — 30% coverage
| Table | RLS |
|-------|-----|
| chart_of_accounts | ❌ MISSING |
| invoices | ❌ MISSING |
| collection_cases | ❌ MISSING |
| collection_actions | ❌ MISSING |
| collection_payment_plans | ❌ MISSING |
| revenue_recognition_schedules | ❌ MISSING |
| revenue_recognition_lines | ❌ MISSING |
| payment_methods | ✅ |
| payments | ✅ |
| payment_refund_attempts | ✅ |

### tenant_staff — 12% coverage
| Table | RLS |
|-------|-----|
| employee_bank_accounts | ✅ |
| labor_budgets | ✅ |
| budget_alerts | ✅ |
| employees | ❌ MISSING |
| schedules | ❌ MISSING |
| schedule_shifts | ❌ MISSING |
| time_entries | ❌ MISSING |
| payroll_runs | ❌ MISSING |
| payroll_periods | ❌ MISSING |

### tenant_kitchen — 3% coverage
Only `prep_task_plan_workflows` has RLS. All others (30+ tables) lack policies.

---

## Priority Recommendations

### P0 — Immediate (Security)
1. Add RLS to `tenant_accounting` tables (7 tables)
2. Add RLS to `tenant_staff` tables (20+ tables)
3. Convert raw SQL routes to Prisma ORM

### P1 — High (Core Functionality)
1. Fix BROKEN_PRISMA_READ entities (9 entities)
2. Create Venue Prisma model OR disable frontend
3. Implement placeholder modules OR remove nav links
4. Add unit tests for critical domains
5. Create Prisma models for procurement RAW_SQL entities

### P2 — Medium (Polish)
1. Investigate -2 route gaps (14 entities)
2. Add E2E workflow tests
3. Enable conditional skip tests

### P3 — Low (Future)
1. Add landing pages to redirect-only modules
2. Clean up console.log statements (2,192 total)
3. Update AGENTS.md stale notes

---

## Archive Reference

This audit is documented in:
- `docs/audits/pass-16-production-readiness-2026-04-29.md` (this file)

Previous audits:
- `docs/audits/pass-15-input-validation.md`
- `docs/audits/pass-14-error-handling.md`
- `docs/audits/pass-13-db-performance.md`
- `docs/audits/pass-12-test-quality.md`
