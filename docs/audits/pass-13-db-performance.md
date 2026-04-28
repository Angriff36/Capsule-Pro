# Audit Archive — Pass 13: Database Query Performance & N+1 Pattern Audit

Database query performance and N+1 pattern audit. Captured verbatim from `IMPLEMENTATION_PLAN.md` during the 2026-04-28 cleanup.

## Database Query Performance & N+1 Pattern Audit (13th Pass)

> **Audited:** 2026-04-25
> **Scope:** All Prisma ORM calls and raw SQL queries across apps/api/app/api/ (1,404 route files), packages/database/ (5,493-line schema), and sync/import services
> **Method:** N+1 pattern detection, foreign key index audit, WHERE clause frequency analysis, unbounded query detection, batch operation efficiency review, route-level risk assessment

### Part A: N+1 Query Patterns

#### A1: ORM-Level N+1 Patterns (14 Confirmed)

| # | Severity | File:Line | Pattern | Entities | Queries per Request |
|---|----------|-----------|---------|----------|-------------------|
| 1 | HIGH | `kitchen/stations/route.ts:159-174` | Parallel N+1 — `Promise.all(stations.map(...))` with per-station `count()` | Stations → prep list items | N+1 (5-15 stations) |
| 2 | HIGH | `kitchen/nutrition-labels/list/route.ts:37-74` | Parallel N+1 (double) — `Promise.all(recipes.map(...))` with per-recipe `findFirst` + per-version `count()` | Recipes → versions → ingredients | 2N+1 (20-50 recipes = 40-100 queries) |
| 3 | HIGH | `inventory/cycle-count/sessions/[id]/finalize/route.ts:85-151` | Serial N+1 — `for (const record of records)` with 4 queries per record: findFirst + create + update + updateMany | Variance records → inventory items | 4N+1 (20-100 items = 80-400 queries) |
| 4 | HIGH | `events/import/server-to-server/route.ts:396-430` | Serial N+1 — `for (const menuItem of menuItems)` with findOrCreateDish (SELECT + INSERT) + INSERT | Menu items → dishes | 3N (10-50 items = 30-150 queries) |
| 5 | MEDIUM | `events/import/server-to-server/route.ts:440-469` | Serial N+1 — `for (const guest of guestList)` with INSERT per guest | Guests | N (10-50 guests) |
| 6 | MEDIUM | `events/import/server-to-server/route.ts:480-516` | Serial N+1 — `for (const task of timelineTasks)` with findEmployee SELECT + INSERT | Timeline tasks → employees | 2N (5-20 tasks = 10-40 queries) |
| 7 | HIGH | `inventory/import/route.ts:289-323` | Serial N+1 — `for (const row of validRows)` with `$executeRaw` INSERT per CSV row | CSV rows → inventory items | N (50-500 rows) |
| 8 | HIGH | `procurement/budget/commands/refresh/route.ts:34-70` | Serial N+1 — `for (const budget of budgets)` with spend calc + update + alert check | Budgets → spend aggregation | 2-4N (5-20 budgets = 10-80 queries) |
| 9 | MEDIUM | `procurement/purchase-orders/commands/create/route.ts:59-70` | Serial N+1 — `for (const item of items)` with INSERT per line item | PO line items | N (3-15 items) |
| 10 | MEDIUM | `procurement/purchase-orders/commands/receive/route.ts:24-55` | Serial N+1 — `for (const item of items)` with 2 UPDATEs per item | PO items → inventory | 2N (3-15 items = 6-30 queries) |
| 11 | HIGH | `cron/webhook-retry/route.ts:80-107` | Serial N+1 — `for (const delivery of deliveries)` with findFirst + update per delivery | Webhook deliveries → configs | 2-4N (up to 100 = 200-400 queries) |
| 12 | HIGH | `integrations/webhooks/retry/route.ts:95-107` | Serial N+1 — same pattern as cron webhook retry | Webhook deliveries → configs | 2-4N (up to 50 = 100-200 queries) |
| 13 | MEDIUM | `integrations/webhooks/trigger/route.ts:111-139` | Serial N+1 — `for (const webhook of triggeredWebhooks)` with create + send + update | Triggered webhooks → delivery logs | 2-3N (2-10 webhooks = 4-30 queries) |
| 14 | LOW | `staff/availability/batch/route.ts:92-113` | Serial N+1 — `for (const pattern of body.patterns)` with per-pattern query | Availability patterns | N (1-7 patterns) |

**Notable NON-findings (correctly avoided N+1):**
- `conflicts/detect/route.ts` — uses bulk SQL with JOINs and GROUP BY + Map for O(1) lookups (line 365-377)
- `kitchen/recipes/[recipeId]/cost/route.ts` — explicit comment "Fetch ingredient names in a single query to avoid N+1" (line 89-95)
- `inventory/purchase-orders/[id]/complete/route.ts` — uses `Promise.all` with batch fetch + Map (line 161-174)
- `events/[eventId]/shipments/generate/route.ts` — batch fetches with `findMany({ in: ingredientNames })` + Map (line 92-112)

#### A2: Raw SQL N+1 Patterns (14 Confirmed)

| # | Severity | File:Line | Pattern | Queries per Invocation |
|---|----------|-----------|---------|----------------------|
| 1 | MEDIUM | `goodshuffle-invoice-sync-service.ts:285-307, 348-370` | Row-by-row INSERT inside `for...of` for line items + outer invoice loop | M × N (50 invoices × 10 items = ~652 queries) |
| 2 | MEDIUM | `goodshuffle-event-sync-service.ts:124-198` | Per-event: SELECT + INSERT/UPDATE + sync record | 2-3N (50 events = 100-150 queries) |
| 3 | MEDIUM | `goodshuffle-inventory-sync-service.ts:119-192` | Per-item: SELECT + INSERT/UPDATE + sync record | 2-3N (200 items = 400-600 queries) |
| 4 | MEDIUM | `nowsta-sync-service.ts:116-141` | Per-employee: findUnique + $queryRaw + upsert | 3N (100 employees = 300 queries) |
| 5 | HIGH | `nowsta-sync-service.ts:188-411` | Per-shift: 5-7 queries (SELECT schedule, INSERT schedule, SELECT location, INSERT/UPDATE shift, sync record) | 5-7N (200 shifts = 1000-1400 queries) |
| 6 | HIGH | `inventory/import/route.ts:289-323` | Per-CSV-row `$executeRaw` INSERT | N (500 rows = 500 queries) |
| 7 | HIGH | `events/import/server-to-server/route.ts:396-698` | Deeply nested: per-event findOrCreateVenue + createEvent + per-menuItem + per-guest + per-task | ~143 per event (10 events = 1,430 queries) |
| 8 | HIGH | `events/importer.ts:858-1135` (app) | Per-row: findRecipe + insertRecipe + findDish + insertDish + insertEventDish + insertPrepTask | 6+ per unique item (100 items = 300-500 queries) |
| 9 | HIGH | `recipe-costing.ts:267-286` (API + app duplicate) | Per-ingredient: SELECT + SELECT (unit conversions) + UPDATE | 3N (30 ingredients = 90 queries) |
| 10 | HIGH | `recipe-costing.ts:414-421` (API + app duplicate) | Per-ingredient cost recalculation triggered by inventory price change | 3N × M recipes |
| 11 | MEDIUM | `recipe-version-helpers.ts:522-537, 575-594` | Per-ingredient and per-step individual `create` calls | N (20 ingredients + 10 steps = 30 INSERTs) |
| 12 | MEDIUM | `outbox/publish/route.ts:134-194` | Per-event `update` after bulk fetch (bulk fetch is correct, sequential updates are the issue) | N (100 events = 100-200 UPDATEs) |
| 13 | HIGH | `inventory-forecasting.ts:177-610` | Per-SKU sequential processing + per-forecast-point findFirst + create/update (30 points per SKU) | 30N (50 SKUs = 1,500 queries) |
| 14 | LOW | `inventory/supplier-sync/route.ts:173-200` | `$queryRawUnsafe` with parameterized string interpolation | Low (parameterized, not injectable) |

**Raw SQL usage totals:**
- Files using `$queryRaw`: ~250
- Files using `$queryRawUnsafe`: 42
- Files using `$executeRaw`: 57
- Files using `Prisma.sql`: 130

#### A3: Include/Select Depth Analysis

**Aggregate Statistics:**

| Metric | Value |
|--------|-------|
| findMany total calls | 303 |
| findMany WITH `select` | 117 (38.6%) |
| findMany WITHOUT `select` | **186 (61.4%)** |
| findFirst total calls | 603 |
| findFirst WITH `select` | 80 (13.3%) |
| findFirst WITHOUT `select` | **523 (86.7%)** |
| findUnique total calls | 39 |
| findUnique WITH `select` | 4 (10.3%) |
| findUnique WITHOUT `select` | **35 (89.7%)** |
| Total include blocks | 67 |
| Max include depth | 2 (no 3+ level nesting found) |

**6 Critical Unbounded Queries (no WHERE, no pagination, no SELECT):**

| File:Line | Model | Fields Fetched |
|-----------|-------|---------------|
| `inventory/cycle-count/sessions/[id]/variance-reports/route.ts:74` | varianceReport | 26 |
| `kitchen/iot/probes/route.ts:31` | temperatureProbe | 22 |
| `kitchen/quality-assurance/corrective-actions/list/route.ts:29` | correctiveAction | 24 |
| `kitchen/quality-assurance/temperature-logs/list/route.ts:38` | temperatureLog | 19 |
| `events/[eventId]/warnings/route.ts:63` | allergenWarning | 19 |
| `integrations/webhooks/route.ts:77` | outboundWebhook | 22 |

**Top Overfetching Concerns (large models, no `select`, with WHERE/pagination):**

| File:Line | Model | Fields | Unnecessary Data |
|-----------|-------|--------|-----------------|
| `events/event/list/route.ts:26` | event | **41** | ~30 unused fields per row |
| `ai/suggestions/route.ts:82` | event | **41** | Same |
| `crm/proposals/list/route.ts:26` | proposal | **36** | ~25 unused fields |
| `events/catering-orders/list/route.ts:26` | cateringOrder | **34** | ~24 unused fields |
| `crm/clients/route.ts:90` | client | **33** | ~22 unused fields |
| `logistics/tracking/route.ts:28,43` | shipment | **31** | ~20 unused fields |

**Wide Include Sets (3+ relations):**
- `command-board/simulations/` (5 files) — load `projections`, `groups`, `annotations` as `true` in 10+ separate queries
- `crm/proposals/[id]/pdf/route.tsx:55` — 4 relations (client, lead, event, lineItems)
- `shipments/[id]/pdf/route.tsx:32` — 4 relations (items, event, supplier, location)

### Part B: Missing Database Indexes

#### B1: Foreign Key Index Audit

**CRITICAL — tenantId FKs without index:** **NONE.** All 189 models with tenantId FK are covered by `@@id([tenantId, id])` compound PKs or explicit `@@index([tenantId, ...])`. Multi-tenant isolation is well-protected.

**HIGH — Missing indexes on high-traffic FK columns:**

| # | Model | FK Field | Related Model | Impact |
|---|-------|----------|---------------|--------|
| 1 | **PrepComment** | **taskId** | KitchenTask | Sequential scan on every task detail view |
| 2 | **PrepComment** | **employeeId** | User | Sequential scan on employee lookup |

**MEDIUM — Other FK/index gaps:**

| # | Model | Column | Issue |
|---|-------|--------|-------|
| 3 | **Event** | **status** | No `@@index([tenantId, status])` — filters every dashboard/listing |
| 4 | **Event** | **eventDate** | No `@@index([tenantId, eventDate])` — date range queries require full scan |
| 5 | **Event** | **eventType** | No `@@index([tenantId, eventType])` — type filtering requires scan |
| 6 | **EmailWorkflow** | **emailTemplateId** | No index — template filtering scans |
| 7 | **DocumentVersion** | **createdById** | No standalone index on createdById |
| 8 | **KnowledgeBaseEntry** | **status, category, authorId** | No tenant-scoped indexes for these filtered columns |
| 9 | **Client** | **source** | No index for lead-source analytics |

**The Event model is the single highest-impact gap.** It has 41 fields, is queried on every dashboard page, and lacks indexes on `status`, `eventDate`, and `eventType` — the three most common filter columns after `tenantId`.

#### B2: WHERE Clause Frequency Analysis

| Filter Pattern | Occurrences | Has Index? |
|---------------|-------------|------------|
| `tenantId` | 88 | YES (all covered) |
| `tenantId + deletedAt: null` | 55 | Partial (soft-delete columns not indexed) |
| `status` | 4 explicit (many more via raw SQL) | NO on Event model |
| `contains`/search (Prisma) | 42 files | N/A (app-level filter) |
| `ILIKE`/`LIKE` (raw SQL) | 5 files | NO — leading wildcards prevent B-tree use |
| `orderBy: createdAt desc` | 50+ files | Partial coverage |

**Composite WHERE patterns needing composite indexes:**
- `tenantId + status` — used on every listing page (events, orders, shipments, POs)
- `tenantId + createdAt` — used on every timeline/activity view
- `tenantId + deletedAt` — used on 55 routes with soft-delete filtering

#### B3: Full Text Search Concerns

Leading-wildcard `ILIKE '%search%'` patterns (cannot use B-tree indexes, always sequential scan):

| File:Line | Pattern | Risk |
|-----------|---------|------|
| `procurement/vendors/list/route.ts:40-43` | ILIKE on 4 columns | HIGH — vendor search on large catalogs |
| `training/modules/route.ts:91,110` | ILIKE '%search%' | MEDIUM — small table |
| `events/export/csv/route.ts:91` | ILIKE with parameterized %search% | MEDIUM — export scenario |
| `crm/scoring/calculate/route.ts:53` | ILIKE with **string concatenation** (not parameterized) | HIGH — injection risk + performance |
| `administrative/trash/list/route.ts:656,699` | LIKE with parameterized %search% | LOW — admin-only |

### Part C: Query Plan & Resource Concerns

#### C1: Unbounded Queries (20 findMany without `take`)

All 20 are filtered by `tenantId` (no truly cross-tenant unbounded queries), but none have a LIMIT. A growing tenant with 100K+ records would cause OOM or timeout on any of these:

| # | File:Line | Model |
|---|-----------|-------|
| 1 | `timecards/entries/list/route.ts:26` | timeEntry |
| 2 | `accounting/accounts/route.ts:70` | chartOfAccount |
| 3 | `accounting/chart-of-accounts/list/route.ts:26` | chartOfAccount |
| 4 | `timecards/time-off-requests/list/route.ts:26` | employeeTimeOffRequest |
| 5 | `timecards/edit-requests/list/route.ts:26` | timecardEditRequest |
| 6 | `communications/email-templates/list/route.ts:26` | email_templates |
| 7 | `training/modules/list/route.ts:26` | trainingModule |
| 8 | `training/assignments/list/route.ts:26` | trainingAssignment |
| 9 | `command-board/boards/list/route.ts:26` | commandBoard |
| 10 | `payroll/runs/list/route.ts:26` | payroll_runs |
| 11 | `payroll/periods/list/route.ts:26` | payroll_periods |
| 12 | `payroll/approval-history/list/route.ts:26` | approvalHistory |
| 13 | `shipments/shipment-items/list/route.ts:26` | shipmentItem |
| 14 | `inventory/suppliers/list/route.ts:26` | inventorySupplier |
| 15 | `shipments/shipment/list/route.ts:26` | shipment |
| 16 | `inventory/cycle-count/records/list/route.ts:26` | cycleCountRecord |
| 17 | `communications/email-workflows/list/route.ts:26` | emailWorkflow |
| 18-20 | (3 more `*/list/route.ts` files) | Various |

Plus 2 raw SQL queries without LIMIT:
- `facilities/work-orders/list/route.ts:33` — HIGH risk (large work order tables)
- `procurement/vendors/list/route.ts:23` — HIGH risk (ILIKE search without limit)

#### C2: User-Controlled Limits Without Upper Bounds (8 Routes)

| File:Line | Default | Upper Bound |
|-----------|---------|-------------|
| `training/modules/route.ts:39` | 50 | **NONE** |
| `training/assignments/route.ts:36` | 50 | **NONE** |
| `collaboration/notifications/sms/history/route.ts:35` | none | **NONE** |
| `collaboration/notifications/email/history/route.ts:36` | none | **NONE** |
| `communications/sms/automation-rules/route.ts:31` | 50 | **NONE** |
| `inventory/transfers/list/route.ts:23` | 50 | **NONE** |
| `procurement/requisitions/list/route.ts:29` | 50 | **NONE** |
| `timecards/route.ts:36` | 50 | **NONE** |
| `sentry-fixer/process/route.ts:355` | **Infinity** | **NONE** |

Well-guarded routes (for comparison): `shipments/route.ts`, `events/route.ts`, `inventory/items/route.ts` — all cap at 100 via `Math.min`.

#### C3: Connection Pool & Transaction Configuration

- Uses `@prisma/adapter-neon` (Neon serverless adapter) — connection pooling handled by Neon pooler, not Prisma
- `toNeonPoolerUrl()` auto-rewrites direct connections to pooler hostname (`-pooler` suffix)
- `neonConfig.poolQueryViaFetch = true` — HTTP fetch instead of WebSocket
- No `connection_limit`, `pool_timeout`, or `pool_size` settings — entirely dependent on Neon defaults
- **No PgBouncer** — Neon's pooler replaces it

**Transactions with many operations (5+ queries inside `$transaction`):**

| File:Line | Operations | Contains $queryRaw? |
|-----------|-----------|---------------------|
| `command-board/simulations/merge/route.ts:265` | 6+ operations (update/create projections, groups, annotations) | No |
| `command-board/simulations/[id]/apply/route.ts:351` | 8+ operations | No |
| `timecards/bulk/route.ts:171` | 4-5+ with $queryRaw loops for INSERT/UPDATE | **Yes** |
| `inventory/stock-levels/adjust/route.ts:73` | 3 operations including $executeRaw + $queryRaw | **Yes** |

#### C4: Batch Operation Efficiency (Sync Services)

| Service | File | Pattern | DB Ops/Invocation | Efficiency |
|---------|------|---------|-------------------|-----------|
| GS Event Sync | `goodshuffle-event-sync-service.ts` | Row-by-row `for...of` | 2-3 per event | **Inefficient** |
| GS Inventory Sync | `goodshuffle-inventory-sync-service.ts` | Row-by-row `for...of` | 2-3 per item | **Inefficient** |
| GS Invoice Sync | `goodshuffle-invoice-sync-service.ts` | Double nested row-by-row | 3+L per invoice | **Highly inefficient** |
| Nowsta Employee Sync | `nowsta-sync-service.ts:116-141` | Row-by-row | 3 per employee | **Inefficient** |
| Nowsta Shift Sync | `nowsta-sync-service.ts:188-411` | Row-by-row | 5-7 per shift | **Highly inefficient** |
| Outbox Writer | `prisma-store.ts:2979-3007` | Row-by-row INSERT in tx | 1 per event | **Partially efficient** |
| Inventory Forecasting | `inventory-forecasting.ts:177-610` | Per-SKU + per-forecast-point | 30 per SKU | **Highly inefficient** |

**Positive patterns found (correctly use bulk operations):**
- `activity-feed-service.ts:87` — `createMany` for bulk insert
- `events/budgets/route.ts:167` — `createMany` within transaction
- `kitchen/tasks/prisma-store.ts:1018-1047` — single `IN` query + Map for batch lookups
- `calendar/sync/disconnect/route.ts` — `updateMany` for batch update

**Key anti-patterns in sync services:**
1. No `createMany`/bulk INSERT used anywhere — all inserts are individual
2. Repeated identical queries (default location, default supplier) inside loops instead of cached once
3. No transaction wrapping around sync loops (partial failure leaves inconsistent state)
4. Delete-then-insert-one-by-one pattern in invoice sync line items

### Part D: Route-Level Performance Risk Assessment

| Module | Files | Risk (1-5) | Top Concerns | Would Struggle >1K Rows? |
|--------|-------|------------|--------------|--------------------------|
| **Kitchen** | ~259 | **4** | Nutrition labels double N+1 (Finding A1-2), cycle count finalize 4N+1 (A1-3), recipe costing per-ingredient (A2-9/10) | YES — recipe costing and station queries |
| **Events** | ~141 | **4** | Server-to-server import deeply nested N+1 (A2-7), 41-field event model overfetching (A3), missing status/date indexes (B1) | YES — event listing with filters, imports |
| **Inventory** | ~102 | **4** | CSV import row-by-row INSERT (A1-7), forecasting 30N queries per SKU (A2-13), 20 unbounded list queries (C1) | YES — forecasting, imports, cycle counts |
| **CRM** | ~61 | **4** | Scoring ILIKE with string interpolation (B3 — injection risk), 33-field client overfetching, proposal PDF with 4 includes | YES — client search, scoring calculations |
| **Procurement** | ~37 | **4** | Budget refresh N+1 (A1-8), unbounded vendor ILIKE search (C1), PO create/receive N+1 (A1-9/10) | YES — vendor search, budget refresh |
| **Staff/Scheduling** | ~50 | **3** | Availability batch check (low N), Nowsta shift sync 5-7N (A2-5), no deep query complexity in routes | Moderate — sync services are the bottleneck |
| **Payroll** | ~35 | **4** | Unbounded timecard/payroll queries (C1), timecard bulk with $queryRaw in transaction (C3), tax config SELECT * | YES — timecard aggregation across periods |
| **Analytics** | ~9 | **5** | Aggregate queries spanning multiple modules, full table scans on Event (no status/date indexes), likely GROUP BY without covering indexes | **Critical** — analytics queries touch all data |
| **Accounting** | ~17 | **3** | Invoice overfetching (full client objects), unbounded chart-of-accounts, SELECT * on tax configs | Moderate — smaller data volumes |
| **Logistics** | ~14 | **3** | Unbounded shipment queries, tracking with 31-field model, ILIKE search concerns | Moderate — shipment volumes manageable |

### Part E: Recommended Actions

#### Priority 1 — Critical (Fix Immediately)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| E1 | Add `@@index([tenantId, status])` and `@@index([tenantId, eventDate])` to Event model | Every dashboard/query benefits | Low (1 migration) |
| E2 | Add `@@index([taskId])` and `@@index([employeeId])` to PrepComment model | Kitchen task detail views | Low (1 migration) |
| E3 | Fix `crm/scoring/calculate/route.ts:53` — replace string interpolation with parameterized query | SQL injection fix + performance | Low (1 file) |
| E4 | Cap user-controlled limits to 200 in 8 routes (use `Math.min(limit, 200)`) | Prevent OOM on large tenants | Low (8 files) |
| E5 | Add `take: 200` (or server-enforced max) to 20 unbounded `findMany` list routes | Prevent unbounded result sets | Low (20 files) |

#### Priority 2 — High (Fix This Sprint)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| E6 | Replace recipe-costing.ts per-ingredient loop with batch UPDATE | 90+ queries → 2-3 queries | Medium |
| E7 | Replace inventory-forecasting.ts per-forecast-point loop with bulk upsert | 1,500 queries → 1-2 queries | Medium |
| E8 | Add `createMany` to Goodshuffle invoice sync line item inserts | N inserts → 1 bulk insert | Low |
| E9 | Add `createMany` to Nowsta shift sync bulk operations | 200-400 queries → ~10 queries | Medium |
| E10 | Add `select` to top 6 overfetching routes (event, proposal, client, shipment, cateringOrder) | Reduce payload 50-70% | Medium |
| E11 | Fix event import server-to-server — batch dish lookups and guest inserts | 1,430 queries → ~30 queries | Medium |
| E12 | Add LIMIT to raw SQL in `facilities/work-orders/list` and `procurement/vendors/list` | Prevent unbounded raw SQL results | Low |
| E13 | Add `@@index([tenantId, deletedAt])` composite indexes on soft-delete models used in 55 routes | Soft-delete filtering optimization | Low |

#### Priority 3 — Medium (Fix Next Sprint)

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| E14 | Replace webhook retry N+1 (cron + user endpoint) with batch fetch + bulk update | 200-400 queries → ~5 | Medium |
| E15 | Add `select` clauses to 186 `findMany` and 523 `findFirst` calls without `select` | Reduce overall data transfer | High (many files) |
| E16 | Add connection pool sizing configuration for Neon (explicit `connection_limit`) | Predictable connection behavior | Low |
| E17 | Move `$queryRaw` outside `$transaction` in timecards/bulk and stock-levels/adjust | Shorter transaction duration | Medium |
| E18 | Replace outbox writer `for...of` INSERT with `createMany()` | N inserts → 1 bulk insert | Low |
| E19 | Add `@@index([tenantId, emailTemplateId])` to EmailWorkflow model | Template-based query optimization | Low |
| E20 | Consider PostgreSQL GIN indexes or pg_trgm for ILIKE search patterns on vendor names and event names | Full-text search without sequential scans | Medium |

#### Summary Statistics

| Metric | Count |
|--------|-------|
| Total route files audited | **1,404** |
| Confirmed ORM N+1 patterns | **14** |
| Confirmed raw SQL N+1 patterns | **14** |
| Unbounded findMany queries (no `take`) | **20** |
| Unbounded user-controlled limits | **8 routes** |
| Routes without `select` (overfetching) | **186 findMany + 523 findFirst** |
| Missing FK indexes (HIGH priority) | **2** (PrepComment.taskId, PrepComment.employeeId) |
| Missing composite indexes (HIGH impact) | **3** (Event status, eventDate, eventType) |
| Raw SQL files using $queryRaw | **~250** |
| Raw SQL files using $queryRawUnsafe | **42** |
| ILIKE with leading wildcard (no index possible) | **5 files** |
| Inefficient sync services (row-by-row) | **5 of 5** (all sync services) |
| Positive bulk patterns found | **4** (activity feed, budget line items, task claims, calendar disconnect) |
| Total recommended actions | **20** |
| Priority 1 (Critical) | **5** |
| Priority 2 (High) | **8** |
| Priority 3 (Medium) | **7** |

---

### Supplementary Findings — Deep Verification Pass (2026-04-25)

> **Method:** Re-audit of all 13th Pass findings with targeted file-level verification, Prisma schema cross-reference, and per-module top-query analysis. Prior findings validated; gaps identified below.

#### S1: New N+1 Pattern — Payroll Timecard Generation

**Not in A1 or A2 tables.** The existing audit covers `timecards/bulk` (C3) but misses `timecards/generate`:

| File:Line | Pattern | Severity | Queries per Invocation |
|-----------|---------|----------|----------------------|
| `payroll/timecards/generate/route.ts:211-245` | Serial N+1 — `for (const shift of needsEntry)` with individual `$queryRaw` INSERT per shift | **HIGH** | N (10-100 shifts per payroll period) |

The route first runs a complex 2-CTE query (lines 62-96) computing weekly hours + shift assignments across the entire period, then iterates `needsEntry` doing one INSERT per shift. The CTE materializes all time entries in the period — with 1,000+ shifts this produces a large intermediate result. The subsequent per-shift INSERT loop is unbatched.

**Recommended fix:** Replace the `for...of` INSERT loop with a single `$executeRaw` using `unnest()` arrays (same pattern used in `kitchen/prep-lists/generate/route.ts:854-881`).

#### S2: Full-Table Scan — Allergen Matrix (Performance Aspect)

The SQL injection in `kitchen/allergens/matrix/route.ts` is already documented (Pass 6, CRITICAL #4). The **performance** dimension is not:

| Scenario | File:Line | Impact |
|----------|-----------|--------|
| No `ids` query param | `allergens/matrix/route.ts:118-151` | Full-table scan on `dishes` with 3 LEFT JOINs (recipes → recipe_ingredients → ingredients) |
| No `ids` query param | `allergens/matrix/route.ts:275-303` | Full-table scan on `recipes` with 2 LEFT JOINs (recipe_ingredients → ingredients) |
| With `ids` filter | Both queries | Performance is acceptable (filtered by tenantId + IN clause) |

When called without `ids` (the default case from the frontend), both queries return ALL dishes/recipes for the tenant with their full ingredient lists. A tenant with 500+ dishes and 2,000+ ingredients produces a large result set that is then processed in-memory with O(dishes × ingredients × 9) Big-9 allergen matching.

**Recommended fix:** Add default LIMIT (e.g., 200) when no `ids` filter is provided, or require `ids` parameter.

#### S3: Positive Batch Pattern — Prep List Generation

`kitchen/prep-lists/generate/route.ts` (955 lines) uses PostgreSQL `unnest()` for batch INSERT of prep list items (lines 854-881) and prep tasks (lines 743-749). This is the **best batch INSERT pattern in the codebase** and should be the reference for fixing the N+1 INSERT loops in:

- `payroll/timecards/generate/route.ts:211-245` (S1 above)
- `events/import/server-to-server/route.ts:396-430` (A1-4)
- `inventory/import/route.ts:289-323` (A1-7)
- All sync services in A2

Pattern:
```sql
INSERT INTO table (col1, col2, col3)
SELECT * FROM unnest($1::uuid[], $2::text[], $3::int[])
```

#### S4: Per-Module Top Complex Queries

The existing Part D provides module-level risk ratings. Below are the **top 3 most complex queries per module** with exact file paths and scaling analysis. These are the routes that will degrade first under load.

##### Kitchen (259 files, Risk 4/5)

| Rank | File | Lines | Query Pattern | >1K Row Risk |
|------|------|-------|---------------|-------------|
| 1 | `kitchen/prep-lists/generate/route.ts` | 955 | 4-table JOIN (event_dishes → dishes → recipes → recipe_versions via LATERAL) + `unnest()` batch INSERT | HIGH — O(dishes × ingredients) for ingredient resolution |
| 2 | `kitchen/allergens/matrix/route.ts` | 441 | Two full-table `$queryRawUnsafe` queries with 3 LEFT JOINs each, in-memory O(dishes × ingredients × 9) matrix | HIGH — no LIMIT when unfiltered |
| 3 | `kitchen/waste/entries/route.ts` | 585 | Multi-step transaction: validate item + reason (2 reads), create waste entry, update stock levels, create inventory transaction, create outbox events | MEDIUM — single-entity operations |

##### Events (141 files, Risk 4/5)

| Rank | File | Lines | Query Pattern | >1K Row Risk |
|------|------|-------|---------------|-------------|
| 1 | `events/documents/parse/route.ts` | 1310 | Document parsing → event creation → battle board → checklist. `linkImportRecordsToEvent` uses `Promise.all` with N updates (parallel N+1, line 711-718) | MEDIUM — bounded by import record count |
| 2 | `events/import/server-to-server/route.ts` | 806 | Already documented (A1-4, A2-7). 5-8 queries per event, no batching | HIGH — already in audit |
| 3 | `events/budgets/route.ts` | 266 | `findMany` with nested include (lineItems) + count query. POST uses `createMany` in transaction (good pattern) | LOW — reasonable pagination |

##### Inventory (102 files, Risk 4/5)

| Rank | File | Lines | Query Pattern | >1K Row Risk |
|------|------|-------|---------------|-------------|
| 1 | `inventory/audit/reports/route.ts` | 804 | Fetches ALL finalized sessions for period → ALL variance reports → in-memory trend/discrepancy analysis | HIGH — unbounded in-memory processing |
| 2 | `inventory/stock-levels/route.ts` | 632 | 3 sequential queries: storage locations, inventory items (paginated), stock records. Then computes reorder/par/stock-out risk in JS | HIGH — heavy in-memory computation |
| 3 | `inventory/cycle-count/sessions/[id]/finalize/route.ts` | 334 | Already documented (A1-3). 4N+1 queries inside transaction | HIGH — transaction holds locks during loop |

##### CRM (61 files, Risk 4/5)

| Rank | File | Lines | Query Pattern | >1K Row Risk |
|------|------|-------|---------------|-------------|
| 1 | `crm/scoring/calculate/route.ts` | 205 | Single dynamic UPDATE with CASE WHEN for each rule (not N separate UPDATEs — better than suspected). Injection risk already documented (Pass 6, CRITICAL) | MEDIUM — one query, but dynamic SQL construction is fragile |
| 2 | `crm/proposals/route.ts` | 188 | Multi-join list query with batched client/lead/line item fetches. Reasonable pagination | LOW |
| 3 | `crm/clients/route.ts` | ~180 | 33-field client model overfetching (already in A3) | LOW — with pagination |

**Correction:** Prior investigation suggested CRM scoring runs N full-table UPDATEs. Verified: it constructs a single UPDATE with N CASE WHEN branches. The injection risk (already documented) remains, but the performance pattern is acceptable.

##### Procurement (37 files, Risk 4/5)

| Rank | File | Lines | Query Pattern | >1K Row Risk |
|------|------|-------|---------------|-------------|
| 1 | `procurement/budget/[id]/route.ts` | 145 | 4 sequential `$queryRawUnsafe`: budget lookup, actual spend (3-table JOIN), committed spend (same JOIN), monthly breakdown (GROUP BY) | MEDIUM — single-budget scope limits impact |
| 2 | `procurement/budget/commands/refresh/route.ts` | 125 | Already documented (A1-8). Per-budget N+1 with 3-table JOIN spend calc | HIGH — scales with budget count |
| 3 | `procurement/approvals/action/route.ts` | 122 | Single approval action, moderate complexity | LOW |

##### Staff (50 files, Risk 3/5)

| Rank | File | Lines | Query Pattern | >1K Row Risk |
|------|------|-------|---------------|-------------|
| 1 | `staff/shifts/bulk-assignment-suggestions/route.ts` | 248 | Fetches open shifts via raw SQL, then per-shift employee matching (likely O(shifts × employees)) | HIGH — combinatorial growth |
| 2 | `staff/shifts/bulk-assignment/helpers.ts` | 457 | Serial `for...of` with `processPreSelectedShift` per assignment | MEDIUM — bounded by batch size |
| 3 | `staff/availability/employees/route.ts` | 286 | Raw SQL LEFT JOIN (employees → availability with date filters) + time-off requests | MEDIUM — returns all active employees |

##### Payroll (35 files, Risk 4/5)

| Rank | File | Lines | Query Pattern | >1K Row Risk |
|------|------|-------|---------------|-------------|
| 1 | `payroll/timecards/generate/route.ts` | 292 | **NEW (S1):** 2-CTE query (weekly_hours + shift_weekly) + serial per-shift INSERT loop | HIGH — CTE materializes all entries in period |
| 2 | `payroll/approvals/[approvalId]/route.ts` | 218 | 3 sequential raw SQL queries (SELECT history, UPDATE status, INSERT history) | LOW — single-entity operations |
| 3 | `payroll/deductions/route.ts` | 184 | Standard CRUD with validation | LOW |

##### Analytics (9 files, Risk 5/5 — Critical)

| Rank | File | Lines | Query Pattern | >1K Row Risk |
|------|------|-------|---------------|-------------|
| 1 | `analytics/staff/summary/route.ts` | 428 | Multi-CTE raw SQL joining employees with task stats, time stats, progress stats, client interaction stats, event participation stats | **CRITICAL** — 5+ CTE joins across employee table |
| 2 | `analytics/finance/route.ts` | 496 | 4 parallel queries: event_profitability JOINs, 3 correlated subqueries (proposals, contracts, deposits), budget alerts | **CRITICAL** — cross-module aggregation |
| 3 | `analytics/kitchen/route.ts` | 439 | 4 parallel queries: station metrics GROUP BY, kitchen health (4 sub-queries), station trends (GROUP BY date, LIMIT 500), top performers | HIGH — station trends capped at 500, others unbounded |

All analytics routes are **CRITICAL at scale** because they perform full-table aggregation across modules. The missing Event indexes (status, eventDate — E1 in Part E) directly impact every analytics query.

##### Accounting (17 files, Risk 3/5)

| Rank | File | Lines | Query Pattern | >1K Row Risk |
|------|------|-------|---------------|-------------|
| 1 | `accounting/collections/cases/[id]/route.ts` | 362 | PATCH with 10+ conditional branches — each is a simple findFirst + update | LOW — single-entity |
| 2 | `accounting/invoices/[id]/route.ts` | 326 | GET with includes (client + event), PUT with calculated totals | LOW |
| 3 | `accounting/invoices/route.ts` | 310 | Invoice listing with pagination, uses `select` properly | LOW |

##### Logistics (14 files, Risk 3/5)

| Rank | File | Lines | Query Pattern | >1K Row Risk |
|------|------|-------|---------------|-------------|
| 1 | `logistics/tracking/route.ts` | 330 | 6 total queries: 2 Prisma (active + completed shipments) + 4 raw SQL map queries (location, supplier, driver, vehicle) | MEDIUM — results capped |
| 2 | `logistics/dispatch/route.ts` | 179 | 5 queries: routes with stops (LIMIT 5), available drivers with vehicle JOIN, 2 raw SQL map queries | MEDIUM |
| 3 | `logistics/routes/commands/optimize/route.ts` | 46 | Route optimization command | LOW |

#### S5: Index Verification — Event Model FK Columns

The Prisma schema was cross-referenced to verify Event model FK indexes. Prior agent investigation incorrectly flagged some as missing. Verified status:

| FK Column | Index | Status |
|-----------|-------|--------|
| `clientId` | `@@index([clientId])` at line 496 | ✅ EXISTS |
| `locationId` | `@@index([locationId])` at line 497 | ✅ EXISTS |
| `venueId` | `@@index([tenantId, venueId])` at line 494 | ✅ EXISTS |
| `venueEntityId` | `@@index([tenantId, venueEntityId])` at line 495 | ✅ EXISTS |
| `status` | — | ❌ MISSING (confirmed in B1) |
| `eventDate` | — | ❌ MISSING (confirmed in B1) |
| `eventType` | — | ❌ MISSING (confirmed in B1) |

The Event FK indexes are well-covered. The gaps remain `status`, `eventDate`, and `eventType` — already documented in Part E action E1.

#### S6: Supplementary Recommended Actions

| # | Action | Priority | Impact | Effort |
|---|--------|----------|--------|--------|
| S1 | Batch the `payroll/timecards/generate` INSERT loop using `unnest()` pattern (reference: `kitchen/prep-lists/generate/route.ts:854-881`) | P2 | 10-100 queries → 1 query | Low |
| S2 | Add default LIMIT (200) to allergen matrix when no `ids` filter provided | P2 | Prevents full-table scan on large tenants | Low |
| S3 | Add `@@index([tenantId, status, eventDate])` covering index to Event model for analytics queries | P1 | All analytics + dashboard queries benefit | Low |
| S4 | Cap `inventory/audit/reports/route.ts` in-memory processing — stream or paginate variance report analysis | P3 | Prevents OOM on large tenants with many cycle counts | Medium |

---

