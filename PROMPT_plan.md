# Ralph Wiggum Diagnosis Prompt — Capsule Pro

## What's Already Done

0a. Study @IMPLEMENTATION_PLAN.md — it already has TWELVE verification passes (plus 6 addenda/sub-passes). DO NOT repeat any of that work. The prior passes covered: (1) route-level claims & blockers, (2-3) blocker re-verification, (4) full package health audit of all 34 shared packages, (5) E2E test suite audit, (6-9) raw-SQL correctness audit (4 passes — parameterization, injection, schema drift, tenant isolation), (9) frontend health audit (imports, API contracts, error handling, accessibility), (10) mobile app + public website audit (3 sub-passes), (11) auth, middleware & integration services audit (3 sub-passes), (12) test quality & coverage gap audit. Your focus is entirely new.
0b. The raw-SQL passes (6-9) focused on CORRECTNESS (SQL injection, schema drift, tenant isolation) — NOT on performance. They identified ~1,603 raw-SQL lines across 233 files but did NOT systematically check for N+1 queries, missing indexes, or query plan inefficiencies.
0c. One N+1 query was fixed reactively via Sentry (commit `f1067043`: "fix(sentry): CAPSULE-PRO-3B - N+1 query on users by org_id"). This was found by monitoring, NOT by proactive audit. The codebase likely has many more.
0d. Study `apps/api/app/api/` — the main API routes directory. Routes use a mix of Prisma ORM calls and raw SQL (`$queryRaw`, `$queryRawUnsafe`, `Prisma.sql`).
0e. Study `packages/database/prisma/schema.prisma` — the Prisma schema. Check for missing indexes on foreign keys and frequently-queried columns.
0f. Study `packages/database/src/` for any custom query builders, connection pooling, or middleware.
0g. For reference, the main app routes are in `apps/api/app/api/`, shared packages are in `packages/`, the web app is in `apps/app/`, and E2E tests are in `e2e/`.

## FOCUS: Database Query Performance & N+1 Pattern Audit (13th pass — NEW focus)

All prior audits focused on correctness, security, and test quality. The **query performance** of the application has never been systematically audited. This pass asks: where are the N+1 query patterns? Which foreign keys lack indexes? Which routes will collapse under load?

### Part A: N+1 Query Pattern Detection

#### 1. ORM-Level N+1 Patterns
- Find all route handlers that query a list of entities, then loop over results to fetch related data (classic N+1)
- Look for patterns like: `const items = await prisma.X.findMany(...)` followed by `for (const item of items) { await prisma.Y.findUnique({ where: { xId: item.id } }) }` inside a loop
- Check for `.map()` + `await` patterns that execute sequential queries per item instead of batch fetching
- Find `Promise.all(items.map(...))` patterns — these are parallel N+1 (better than serial, but still N queries instead of 1-2)

#### 2. Raw SQL N+1 Patterns
- Find raw SQL queries inside loops (any `$queryRaw` or `$queryRawUnsafe` call inside a `for`/`.forEach`/`.map`/`while`)
- Find patterns where a query result is iterated and individual rows trigger additional queries
- Check batch processing functions (imports, syncs, bulk operations) for row-by-row queries

#### 3. Include/Select Depth Analysis
- Find Prisma `include` chains with 3+ levels of nesting — deep includes can generate massive JOIN trees
- Find routes that fetch entire related records when they only need a single field (e.g., `include: { user: true }` when only `user.name` is needed)
- Look for routes missing `select` clauses where specific fields are known (fetching entire rows when 2-3 columns suffice)

### Part B: Missing Database Indexes

#### 1. Foreign Key Index Audit
- Read the Prisma schema (`packages/database/prisma/schema.prisma`) and list ALL foreign key relations (`@relation`)
- Check which foreign key columns have `@index` or `@@index` directives
- Cross-reference against route handlers to identify frequently-queried foreign key columns that lack indexes
- Pay special attention to: tenant_id (multi-tenant queries), org_id, user_id, event_id — these are in almost every WHERE clause

#### 2. Query WHERE Clause Analysis
- Grep for common query patterns: `where: { tenantId: ... }`, `where: { eventId: ... }`, `where: { status: ... }`
- For each frequently-filtered column, verify an index exists in the schema
- Look for composite WHERE clauses (e.g., `tenantId + status + date`) that would benefit from composite indexes

#### 3. Raw SQL WHERE Clause Analysis
- For raw SQL queries, check which columns appear in WHERE clauses
- Verify corresponding indexes exist (especially for `ORDER BY` + `WHERE` combinations — these need covering indexes)
- Look for `ILIKE`/`LIKE` queries on unindexed columns — these require full table scans

### Part C: Query Plan & Resource Concerns

#### 1. Unbounded Queries
- Find queries without LIMIT clauses (or with user-controlled limit set to very high values)
- Prior passes found 9+ unbounded pagination routes — verify these are the ONLY ones
- Check for `findMany` calls without any `take`/`limit` parameter

#### 2. Full Table Scans
- Find queries that filter on columns without indexes (cross-reference Part B)
- Look for `SELECT *` equivalents in Prisma (any `findMany` without `select`)
- Find raw SQL queries using `SELECT *` or equivalent

#### 3. Connection Pool & Transaction Concerns
- Check if the Prisma client uses connection pooling (PgBouncer, Prisma Accelerate, or built-in pool)
- Find long-running transactions — any `prisma.$transaction()` with many sequential operations
- Look for `$queryRaw` inside `$transaction` — these hold connections longer than necessary

#### 4. Batch Operation Efficiency
- Audit the event importer (`apps/api/app/lib/events/importer.ts`) — it imports events with 15+ raw SQL queries. Are these batched or row-by-row?
- Audit the Goodshuffle sync services — do they batch updates or update one record at a time?
- Audit the Nowsta sync — same question
- Check the outbox processor for batch processing patterns

### Part D: Route-Level Performance Risk Assessment

For each API domain module, assess the performance risk:

1. **Kitchen** (259 route files) — prep list generation, recipe costing, allergen matrix
2. **Events** (141 route files) — event listing with filters, guest management, budget calculations
3. **Inventory** (102 route files) — stock levels, forecasts, cycle counting, transfers
4. **CRM** (61 route files) — client search, scoring calculations, pipeline queries
5. **Procurement** (37 route files) — PO listing with joins, budget calculations, vendor search
6. **Staff/Scheduling** (50 route files) — availability overlap detection, auto-assignment, shift generation
7. **Payroll** (35 route files) — timecard aggregation, labor budget calculations, tax computations
8. **Analytics** (9 route files) — aggregate queries across multiple modules
9. **Accounting** (17 route files) — journal entries, invoice generation
10. **Logistics** (14 route files) — dispatch with driver/vehicle joins, route optimization

For each module: identify the top 3 most complex queries, estimate their execution cost, and flag any that would struggle with >1,000 rows.

### Investigation approach:

- Start with grep for loop patterns: `for.*await.*prisma`, `\.map.*await.*prisma`, `\.forEach.*await.*`
- Search for `$queryRaw` and `$queryRawUnsafe` inside any loop construct
- Read the Prisma schema to build a complete index inventory
- Cross-reference foreign keys against index declarations
- Read the top 10 most complex route handlers (by file size or raw SQL count)
- Read all sync/import service files for batch patterns
- Check database migration files for index creation patterns

### Output format:

Append findings to IMPLEMENTATION_PLAN.md under a new section:

```markdown
## Database Query Performance & N+1 Pattern Audit (13th Pass)

> **Audited:** 2026-04-25
> **Scope:** All Prisma ORM calls and raw SQL queries across apps/api/app/api/ (750+ route files), packages/database/, and sync/import services
> **Method:** N+1 pattern detection, foreign key index audit, query plan analysis, batch operation efficiency review

### Part A: N+1 Query Patterns
[ORM-level, raw SQL, include depth analysis]

### Part B: Missing Database Indexes
[Foreign key audit, WHERE clause analysis, composite index recommendations]

### Part C: Query Plan & Resource Concerns
[Unbounded queries, full table scans, connection pool, batch operations]

### Part D: Route-Level Performance Risk Assessment
[Per-module risk ratings, top complex queries, scaling concerns]

### Part E: Recommended Actions
[Prioritized index additions, N+1 fixes, query optimizations]
```

### Guardrails

- Do NOT modify any source code. This is diagnosis only.
- Do NOT report issues already documented in IMPLEMENTATION_PLAN.md (check all prior sections first).
- Cite exact file:line for every finding.
- Distinguish between "confirmed N+1" (code pattern found) and "suspected N+1" (pattern likely exists but complex to verify without runtime).
- Prioritize findings by estimated performance impact (queries that would be called most frequently with the most data).
- Focus on ROUTE HANDLERS and SYNC SERVICES — these are the hot paths. Library/package code is lower priority unless it's used in every request.
- When reading Prisma schema, note that multi-tenant queries ALWAYS filter by tenant_id — every tenant_id column MUST have an index.
```
