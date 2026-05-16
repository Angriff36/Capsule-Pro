# SlopScope rule discovery (continued)

Rotated from previous log at 2026-05-07T00:48:35Z. Archive: `SLOPSCOPE_RULE_DISCOVERY_ARCHIVE/SLOPSCOPE_RULE_DISCOVERY_2026-05-07_004835_UTC.md`

---
## [2026-05-07 00:48] Rule Discovery — automation_theater.outbox_processor_immediately_fails_all_events

### Finding
The prep-list autogenerate outbox processor endpoint at `/api/kitchen/prep-lists/autogenerate/process` claims to process pending prep list generation requests from the outbox, but its handler callback immediately returns `{ success: false }` for every single event without performing any work. This means every outbox event transitions from `pending` to `failed` without any actual prep list generation occurring. The outbox pattern is fully scaffolded (events are created, a processor reads them, statuses are updated) but the core business logic is a deliberate no-op that always fails.

### Evidence
- File: `apps/api/app/api/kitchen/prep-lists/autogenerate/process/route.ts`
- Snippet:
```typescript
const result = await processPendingPrepListGenerations(
  database,
  (_input) => {
    // For now, just mark as processed with a note
    // In production, you would call the generate endpoint here
    // or implement the business logic directly
    return Promise.resolve({
      success: false,
      error:
        "Prep list generation should be triggered via /api/kitchen/prep-lists/generate endpoint",
    });
  }
);
```
- Supporting: `packages/manifest-adapters/src/prep-list-autogeneration.ts` lines 160-196 — `processPendingPrepListGenerations` marks events as `failed` when the callback returns `success: false`, and increments the `errors` counter. No retry logic, no dead-letter handling, no re-queueing.

### Why this matters
Users (or automated systems) who trigger prep list auto-generation via the outbox pattern will see their events created as `pending`, then silently flipped to `failed` if this processor runs. The GET endpoint on the same route will show `pending: 0` after processing, giving the false impression that all events were handled. No prep lists are actually generated. The "processed" count is always 0 and the "errors" count equals the number of pending events. This is automation theater — the full outbox infrastructure exists but processes nothing.

### Proposed detector rule
```json
{
  "id": "automation_theater.outbox_processor_immediately_fails_all_events",
  "title": "Outbox processor callback always returns failure without work",
  "category": "automation_theater",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "callback passed to outbox/event processor that unconditionally returns { success: false }",
    "Promise.resolve({ success: false }) inside a handler/callback meant to process events",
    "// For now, just mark as processed",
    "handler callback that returns failure without calling any business logic function"
  ],
  "negative_patterns": [
    "callbacks that conditionally return failure based on input validation",
    "callbacks that call actual service methods and handle their errors",
    "test mocks that deliberately return failure for testing"
  ],
  "evidence_required": [
    "handler/callback function body",
    "surrounding context showing it's passed to an outbox processor or event consumer",
    "absence of any business logic call inside the callback"
  ],
  "false_positive_controls": [
    "Exclude test files (jest/vitest mocks)",
    "Exclude callbacks that validate input and return failure conditionally",
    "Exclude error handlers that re-throw or wrap errors"
  ],
  "user_impact": "Outbox events accumulate as pending, then get marked as failed without any work being done. Automated systems relying on the outbox pattern for prep list generation will silently fail. The GET status endpoint falsely reports zero pending items after processing, hiding the fact that no work was accomplished.",
  "repair_guidance": "Wire the handler callback to actually invoke the prep list generation logic (e.g., call the /api/kitchen/prep-lists/generate endpoint or its underlying service directly). Add retry logic with exponential backoff for transient failures. Implement a dead-letter queue for events that fail after max retries. Remove the no-op handler and replace with real business logic.",
  "example_source": {
    "file": "apps/api/app/api/kitchen/prep-lists/autogenerate/process/route.ts",
    "line_or_snippet": "(_input) => {\n    // For now, just mark as processed with a note\n    return Promise.resolve({\n      success: false,\n      error: \"Prep list generation should be triggered via /api/kitchen/prep-lists/generate endpoint\",\n    });\n  }"
  }
}
```

### Implementation note
Detector should use AST analysis to find callback functions passed to outbox/event processor functions where the callback body is a single `Promise.resolve({ success: false, ... })` return without any conditional logic or service calls. Cross-file check: verify the parent function name contains terms like "process", "consume", "handle", or "worker". Flag as high severity when found in non-test files under `app/api/` or `api/` routes.
---
---
## [2026-05-07 01:15] Rule Discovery — feature_claim_mismatch.api_schema_accepts_options_never_consumed

### Finding
The server-to-server event import endpoint at `/api/events/import/server-to-server` defines a Zod schema (`ImportOptionsSchema`) that accepts `notifyOnCompletion: boolean` and `notificationUrl: string` fields. These are validated and passed into the `ImportOptions` type, but the import processing logic never reads either field. The `processEvents` and `processSingleEvent` functions only consume `dryRun`, `skipDuplicates`, and `autoCreateEntities`. A caller who sets `notifyOnCompletion: true` with a valid `notificationUrl` expects a webhook callback after import completes, but the import silently finishes without any notification dispatch. The schema advertises a feature that the handler never implements.

### Evidence
- File: `apps/api/app/api/events/import/server-to-server/route.ts`
- Snippet (schema definition, lines 103-109):
```typescript
const ImportOptionsSchema = z.object({
  dryRun: z.boolean().default(false),
  skipDuplicates: z.boolean().default(false),
  autoCreateEntities: z.boolean().default(true),
  notifyOnCompletion: z.boolean().default(false),
  notificationUrl: z.string().url().optional(),
});
```
- Snippet (all usages of `importOptions` — only 3 of 5 fields consumed):
```typescript
importOptions.skipDuplicates   // line 602, 688
importOptions.autoCreateEntities  // line 638
importOptions.dryRun           // line 684, 791
// notifyOnCompletion — NEVER READ
// notificationUrl — NEVER READ
```

### Why this matters
An external system integrating via this server-to-server API would reasonably expect that setting `notifyOnCompletion: true` with a `notificationUrl` would trigger a webhook callback after the batch import completes. Instead, the import finishes silently. The caller has no way to know the notification was never sent — there is no error, no warning, no log. For large batch imports, the caller may be waiting for a webhook that will never arrive, potentially causing timeout-based retry loops or data synchronization gaps between systems.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.api_schema_accepts_options_never_consumed",
  "title": "API schema accepts option fields that handler logic never reads",
  "category": "feature_claim_mismatch",
  "severity": "medium",
  "confidence": 0.88,
  "detector_type": "ast",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "Zod schema object with boolean/string fields that are not destructured or accessed in the handler function body",
    "Request schema fields that pass validation but are never referenced after schema.parse/safeParse",
    "Interface or type derived from schema with fields that have zero usage in downstream function calls"
  ],
  "negative_patterns": [
    "Fields consumed by middleware or wrapper functions not visible in the handler",
    "Fields passed through to helper functions via spread/rest operators",
    "Optional fields intentionally accepted for forward compatibility with documented deprecation",
    "Fields consumed in catch/finally blocks or error handlers"
  ],
  "evidence_required": [
    "Schema or interface definition with named fields",
    "Handler function body that receives the parsed schema output",
    "Absence of field name in any identifier reference within the handler and its callees",
    "Field name not present in spread patterns, destructuring, or property access"
  ],
  "false_positive_controls": [
    "Exclude fields passed to sub-functions via object spread (...options)",
    "Exclude fields consumed by wrappers like withRateLimit, withAuth that accept the full options object",
    "Exclude fields starting with underscore (deliberately unused)",
    "Check for field consumption in imported utility functions, not just inline code",
    "Allow fields that appear in JSDoc or comments describing future implementation"
  ],
  "user_impact": "External API consumers who rely on documented schema options (like completion notifications) will experience silent failures. The API accepts valid input for features that do not exist, creating a false contract. Integrations built on these options will never receive expected callbacks, leading to broken data synchronization and timeout-based retry storms.",
  "repair_guidance": "Either implement the notification dispatch logic using the existing outbound webhook service (packages/notifications/outbound-webhook-service.ts) to POST the batch result to notificationUrl when notifyOnCompletion is true, or remove the two fields from ImportOptionsSchema and update the API documentation to reflect the actual supported options. If the feature is planned, add a TODO with a tracking reference and return a 501 when notifyOnCompletion is true, rather than silently ignoring it.",
  "example_source": {
    "file": "apps/api/app/api/events/import/server-to-server/route.ts",
    "line_or_snippet": "notifyOnCompletion: z.boolean().default(false),\n  notificationUrl: z.string().url().optional(),"
  }
}
```

### Implementation note
AST-based detector should parse Zod schema definitions (z.object({...})), extract the field names, then trace the parsed output variable through the handler function body. For each schema field, check if the field name appears as a property access (obj.fieldName, destructuring, or spread) anywhere in the handler or functions called from it. Fields with zero references are flagged. Cross-file tracing is needed for callees in imported modules. Medium severity because the feature gap is real but the impact is limited to integrations that discover and use these undocumented options.
---

## [2026-05-07 02:11] Rule Discovery — placeholder.payroll_tax_fields_hardcoded_zero_in_data_source

### Finding
The payroll engine has a real tax calculation module (`taxEngine.ts`, 290 lines) with 2024 federal/state/FICA brackets that correctly computes federal, state, Social Security, and Medicare withholdings. However, the `PrismaPayrollDataSource.getPayrollRecords()` method — which retrieves stored historical payroll records — hardcodes `taxesWithheld: []`, `totalTaxes: 0`, and `tips: 0` for every record. The API route `GET /api/payroll/reports/{periodId}` serves this data as JSON and exports it to CSV/QBXML with columns for FederalTax, StateTax, SocialSecurity, Medicare, TotalTaxes, and Tips — all showing $0.00. The frontend payroll line items table at `/payroll/runs/[runId]` displays these same zero values via `getTaxAmount()` and `getTotalTaxes()` helper functions.

The BLOCKER comments acknowledge the issue: "Tax calculation engine not yet implemented" (referring to the data layer wiring, not the engine itself), "TipPool model does not exist in schema", "Department model not yet linked to employees". The tax engine exists and works, but is never wired into the data source read path.

### Evidence
- File: `packages/payroll-engine/src/dataSource/PrismaPayrollDataSource.ts`
- Snippet:
```typescript
// Line 389-394 in getPayrollRecords()
tips: 0, // BLOCKER: TipPool model does not exist in schema.
taxesWithheld: [], // BLOCKER: Tax calculation engine not yet implemented.
totalTaxes: 0, // BLOCKER: Tax calculation engine not yet implemented.
```
- File: `packages/payroll-engine/src/exporters/csvExport.ts`
- Snippet:
```typescript
// Lines 116-120 — CSV columns that will always be $0.00
escapeCSV(getTaxByType(record, "federal").toFixed(2)),
escapeCSV(getTaxByType(record, "state").toFixed(2)),
escapeCSV(getTaxByType(record, "social_security").toFixed(2)),
escapeCSV(getTaxByType(record, "medicare").toFixed(2)),
escapeCSV(record.totalTaxes.toFixed(2)),
```
- File: `apps/api/app/api/payroll/reports/[periodId]/route.ts`
- Snippet: Returns HTTP 200 with payroll report data containing fabricated zero tax values via `payrollService.getReport()`

### Why this matters
Users viewing payroll reports see Federal Tax, State Tax, Social Security, Medicare, Total Taxes, and Tips all as $0.00 for every employee in every period. This is a financial compliance risk — exported CSV and QuickBooks files contain materially incorrect payroll data. An operator could export these reports for accounting or tax filing purposes and submit records showing zero tax withholdings. The system presents itself as a full payroll solution with tax bracket lookup, deduction management, and QB export, but the stored record read path silently drops all tax calculations.

### Proposed detector rule
```json
{
  "id": "placeholder.payroll_tax_fields_hardcoded_zero_in_data_source",
  "title": "Payroll data source hardcodes zero for tax/tip financial fields instead of computing from engine",
  "category": "placeholder",
  "severity": "critical",
  "confidence": 0.95,
  "detector_type": "hybrid",
  "language_targets": ["typescript"],
  "patterns": [
    "taxesWithheld: \\[\\]",
    "totalTaxes: 0",
    "tips: 0",
    "taxInfo: undefined",
    "payrollPrefs: undefined"
  ],
  "negative_patterns": [
    "// test|// mock|// stub|// fixture",
    "MockPayrollDataSource|InMemoryPayrollDataSource|TestPayrollDataSource",
    "vi\\.mock|jest\\.fn"
  ],
  "evidence_required": [
    "Data source class implementing a payroll/repository interface",
    "Hardcoded zero/empty values for tax or tip fields in return mapping",
    "Export or report consumer that displays these fields to users",
    "BLOCKER/TODO comment near the hardcoded values referencing missing schema or engine"
  ],
  "false_positive_controls": [
    "Exclude test data sources (InMemory, Mock, Stub prefixed classes)",
    "Exclude files in __tests__ or *.test.ts",
    "Require that the file also imports from a real ORM/client (prisma, database)",
    "Require at least one BLOCKER/TODO comment near the hardcoded value"
  ],
  "user_impact": "Payroll reports and exports show $0.00 for all tax withholdings and tips. Users may export materially incorrect financial data for accounting or tax filing. The system presents full payroll functionality but silently omits tax computation on the record read path.",
  "repair_guidance": "Wire the existing taxEngine.calculateTaxes() into the PrismaPayrollDataSource.getPayrollRecords() method. This requires: (1) adding tax breakdown columns to the payroll_line_items database table (federal_tax, state_tax, social_security, medicare, total_taxes, tips), (2) populating these during payroll generation via the calculator, (3) reading them back in getPayrollRecords() instead of hardcoding zeros. The tax engine at packages/payroll-engine/src/core/taxEngine.ts already has the computation logic — it just needs to be persisted and recalled.",
  "example_source": {
    "file": "packages/payroll-engine/src/dataSource/PrismaPayrollDataSource.ts",
    "line_or_snippet": "taxesWithheld: [], // BLOCKER: Tax calculation engine not yet implemented.\ntotalTaxes: 0, // BLOCKER: Tax calculation engine not yet implemented."
  }
}
```

### Implementation note
Build a hybrid detector that scans data source/repository files for return mappings containing hardcoded zero or empty values for financially significant fields (taxes, tips, deductions). Cross-reference with: (1) a real ORM/client import proving this is a production data source, (2) a BLOCKER/TODO comment near the hardcoded value, (3) an existing calculation engine or service in the same package that SHOULD be computing these values. Flag severity as critical when the output flows to user-facing reports or exports. The key insight is that the tax engine exists and works — the slop is in the data access layer that never calls it on the read path.
---

---
## [2026-05-07 02:30] Rule Discovery — phantom_columns.finance_analytics_ledger_query

### Finding
The finance analytics dashboard queries two columns (`total_value` and `deposit_paid`) from the `event_contracts` table that do not exist in the Prisma schema, have never been added by any migration, and would cause a runtime SQL error when the endpoint is hit. Additionally, the deposit calculation uses a hardcoded `* 0.5` multiplier (assuming 50% deposit rate) instead of reading from any actual deposit field. The `EventContract` model is purely a document management entity (contract number, title, status, signing token, signatures) with zero financial columns.

### Evidence
- File: `apps/api/app/api/analytics/finance/route.ts`
- Lines 186, 196, 200, 219, 228, 232 — queries `ec.total_value` and `ec.deposit_paid`
- Snippet:
```sql
SELECT COALESCE(SUM(ec.total_value), 0)::numeric
FROM tenant_events.event_contracts ec
...
SELECT COALESCE(SUM(ec.total_value * 0.5), 0)::numeric
FROM tenant_events.event_contracts ec
WHERE ec.deposit_paid = true
```
- Prisma schema (`packages/database/prisma/schema.prisma:4082-4113`): `EventContract` has no `total_value`, `deposit_paid`, or any financial fields
- Base migration (`packages/database/prisma/migrations/0_init/migration.sql:1997-2014`): `event_contracts` DDL confirms no financial columns
- No migration in the entire history adds these columns to `event_contracts`
- `total_value` exists only on `Shipment` model (line 2340), `deposit_paid` exists on `Event` (line 1646) and `Invoice` (line 4421) — the developer likely confused models

### Why this matters
The `/api/analytics/finance` endpoint powers the Finance Dashboard page. When a user navigates to the finance analytics view, the `fetchLedgerData` function would throw a database error at runtime because the columns literally don't exist. The entire "active contracts" value and "deposits received" metric are dead on arrival. Even if the columns were added, the hardcoded `* 0.5` deposit assumption means the deposits metric would be fabricated arithmetic rather than reflecting actual deposit amounts tracked in the `Invoice.depositPaid` or `Event.deposit_paid` fields.

### Proposed detector rule
```json
{
  "id": "phantom_columns.raw_sql_references_nonexistent_schema_columns",
  "title": "Raw SQL queries reference columns that don't exist in the ORM schema",
  "category": "phantom_columns",
  "severity": "critical",
  "confidence": 0.95,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "$queryRaw",
    "$executeRaw",
    "Prisma.sql",
    "database.$queryRaw",
    "prisma.$queryRawUnsafe"
  ],
  "negative_patterns": [
    "prisma.\\w+\\.findMany",
    "prisma.\\w+\\.findFirst",
    "prisma.\\w+\\.create",
    "prisma.\\w+\\.update"
  ],
  "evidence_required": [
    "Raw SQL string referencing table.column via alias (e.g., ec.total_value)",
    "ORM schema file (schema.prisma) confirming the referenced model lacks that column",
    "Migration directory confirming no migration adds the column"
  ],
  "false_positive_controls": [
    "Exclude raw SQL that references columns proven to exist in the corresponding Prisma model",
    "Exclude raw SQL in test fixtures or seed files",
    "Exclude raw SQL in migration files themselves"
  ],
  "user_impact": "Runtime database errors when users access analytics dashboards or any page backed by the broken query. Financial metrics displayed as $0 or error states. Users cannot trust the finance dashboard data.",
  "repair_guidance": "Either: (1) add the missing financial columns (total_value, deposit_paid) to the EventContract model and create a migration, populating them from actual Invoice/Event data, or (2) rewrite the query to JOIN through the Invoice model which already has total, depositPaid, and depositPercentage fields, or JOIN through the Event model which has deposit_amount and deposit_paid. Remove the hardcoded * 0.5 multiplier and use actual deposit amounts from the source of truth.",
  "example_source": {
    "file": "apps/api/app/api/analytics/finance/route.ts",
    "line_or_snippet": "SELECT COALESCE(SUM(ec.total_value), 0)::numeric\nFROM tenant_events.event_contracts ec\n...\nAND ec.deposit_paid = true"
  }
}
```

### Implementation note
Build a hybrid detector that: (1) finds all `$queryRaw` / `$executeRaw` calls in TypeScript files, (2) extracts table aliases and column references from the raw SQL template literals, (3) resolves the table name to a Prisma model via `@@map` annotations in schema.prisma, (4) checks if the referenced column exists on that model, (5) flags mismatches as phantom columns. The schema resolution step is critical for avoiding false positives — the detector must understand Prisma's `@map()` convention to match SQL column names to model field names. Cross-reference with migration files to confirm columns were never added historically. Severity should be critical when the query powers a user-facing dashboard or financial report.
---
---
## [2026-05-06 20:15] Rule Discovery — dashboard_illusion.analytics_reads_from_orphaned_aggregation_table

### Finding
The rate limits analytics endpoint (`GET /api/settings/rate-limits/analytics`) reads from the `rateLimitUsage` table to show per-endpoint request counts, blocked counts, average response times, and max response times. However, no code in the entire codebase ever writes to `rateLimitUsage`. The rate limiter middleware (`middleware/rate-limiter.ts`) writes individual events to `rateLimitEvent` but never upserts bucket-level aggregation rows into `rateLimitUsage`. The Prisma model `RateLimitUsage` exists with proper indexes and a unique constraint on `[tenantId, endpoint, method, bucketStart]`, clearly designed for time-bucketed aggregation — but the bucket-filling pipeline was never built. The analytics dashboard will always return zeros.

### Evidence
- File: `apps/api/app/api/settings/rate-limits/analytics/route.ts`
- Snippet:
  ```typescript
  const usageData = await database.rateLimitUsage.groupBy({
    by: ["endpoint", "method"],
    where: usageWhere,
    _sum: { requestCount: true, blockedCount: true },
    _avg: { avgResponseTime: true },
    _max: { maxResponseTime: true },
  });
  ```
- File: `apps/api/middleware/rate-limiter.ts` (line 296) — writes to `rateLimitEvent`, not `rateLimitUsage`
- File: `packages/database/prisma/schema.prisma` (line 5242) — `model RateLimitUsage` exists with aggregation fields
- Writer search: zero results for `rateLimitUsage.*create|rateLimitUsage.*update|rateLimitUsage.*upsert` across entire codebase
- Reader search: only the analytics route and its test mocks reference `rateLimitUsage`

### Why this matters
The settings UI presents a "Rate Limit Analytics" page that purports to show traffic patterns, block rates, and response time distributions across endpoints. Because `rateLimitUsage` is never populated, every query returns `{ totalRequests: 0, totalBlocked: 0, blockRate: 0, byEndpoint: [], events: { allowed: 0, blocked: 0 }, topBlockedEndpoints: [] }`. Administrators relying on this dashboard to detect abuse patterns, tune rate limits, or validate security posture are looking at an always-empty report. The schema design (bucket-level aggregation with unique constraint) shows intent to build a proper analytics pipeline, but only the reader was shipped.

### Proposed detector rule
```json
{
  "id": "dashboard_illusion.analytics_reads_from_orphaned_aggregation_table",
  "title": "Analytics dashboard reads from aggregation table with no writer",
  "category": "dashboard_illusion",
  "severity": "medium",
  "confidence": 0.92,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "prisma"],
  "patterns": [
    "database.<tableName>.groupBy(",
    "database.<tableName>.aggregate(",
    "model <ModelName> { ... requestCount ... blockedCount ... }"
  ],
  "negative_patterns": [
    "database.<sameTable>.create(",
    "database.<sameTable>.upsert(",
    "database.<sameTable>.update(",
    "database.<sameTable>.updateMany("
  ],
  "evidence_required": [
    "Prisma model with aggregation-style fields (count, sum, average fields)",
    "At least one route or service that reads from the table via groupBy/aggregate",
    "Zero writers (create/upsert/update/updateMany) to that table across the entire codebase",
    "The reader route is under a path suggesting analytics/dashboard/reporting"
  ],
  "false_positive_controls": [
    "Exclude tables where a migration or seed script is the writer (check prisma/seed.ts, scripts/)",
    "Exclude tables populated by external processes (check for cron job references, background workers)",
    "Exclude views (Prisma @@ignore or @@view annotations)",
    "Require the model to have fields named like aggregation buckets (count, total, sum, avg) rather than entity fields (name, email, status)"
  ],
  "user_impact": "Admin-facing analytics dashboards display permanently empty/zero data, giving a false sense of monitoring coverage. Administrators may believe rate limiting analytics, traffic monitoring, or abuse detection is operational when it has never collected a single data point.",
  "repair_guidance": "Add a bucket-filling writer to the rate limiter middleware that upserts into `rateLimitUsage` on each rate limit check, or create a cron job that aggregates `rateLimitEvent` rows into time-bucketed `rateLimitUsage` rows. The unique constraint on [tenantId, endpoint, method, bucketStart] is already designed for this pattern.",
  "example_source": {
    "file": "apps/api/app/api/settings/rate-limits/analytics/route.ts",
    "line_or_snippet": "database.rateLimitUsage.groupBy({ by: [\"endpoint\", \"method\"], ... _sum: { requestCount: true, blockedCount: true }, _avg: { avgResponseTime: true } })"
  }
}
```

### Implementation note
Build a cross-file detector that: (1) identifies all Prisma models with aggregation-style field names (count, total, sum, blockedCount, requestCount, avgResponseTime), (2) finds all read queries against those models (groupBy, aggregate, findMany), (3) searches the entire codebase for write operations (create, upsert, update, updateMany) to the same model, (4) if reads exist but no writes exist anywhere (including scripts, seeds, migrations, cron jobs), flag as an orphaned aggregation table. Check for external writer patterns like INSERT triggers, materialized view refreshes, or background job references. Severity should be medium for internal analytics, high if the dashboard is customer-facing or security-related (like rate limit monitoring).
---

---
## [2026-05-07 21:30] Rule Discovery — skeleton_crud.budget_actual_column_alias_collision

### Finding
In the finance analytics endpoint, the SQL query for "current period metrics" aliases the **exact same expression** (`SUM(actual_beverage_cost + actual_rentals_cost + actual_other_cost)`) to **both** `budgeted_other_cost` and `actual_other_cost`. This means the budget-vs-actual comparison for "other costs" will always show 0% variance — the dashboard lies to users about budget adherence. Additionally, the three referenced columns (`actual_beverage_cost`, `actual_rentals_cost`, `actual_other_cost`) **do not exist** in the Prisma schema for `EventProfitability` — the real columns are `budgeted_overhead` and `actual_overhead`.

### Evidence
- File: `apps/api/app/api/analytics/finance/route.ts`
- Lines 95-96 (locationId branch) and lines 116-117 (no-locationId branch):
```sql
COALESCE(SUM(ep.actual_beverage_cost + ep.actual_rentals_cost + ep.actual_other_cost), 0)::numeric as budgeted_other_cost,
COALESCE(SUM(ep.actual_beverage_cost + ep.actual_rentals_cost + ep.actual_other_cost), 0)::numeric as actual_other_cost
```
- Prisma schema (`packages/database/prisma/schema.prisma:602-638`): `EventProfitability` model has `budgetedOverhead` / `actualOverhead` — no `beverage_cost`, `rentals_cost`, or `other_cost` columns exist.
- The `calculateVariances()` function (line 292) uses `metrics.budgetedOtherCost` and `metrics.actualOtherCost` for comparison, but they are always identical.
- The `buildFinanceHighlights()` function (line 362) presents "Cost of goods sold" using `metrics.totalCost` which sums `actualFoodCost + actualOtherCost` — so COGS will also be wrong since `actualOtherCost` references phantom columns.

### Why this matters
The finance dashboard is a core decision-making tool for catering operations. If this endpoint actually runs (meaning these phantom columns exist via manual migration outside Prisma), the "Revenue vs Budget" and COGS metrics are misleading because "other costs" always show zero variance. If these columns don't exist, the entire analytics endpoint returns a 500 error and the finance dashboard is completely broken. Either way, the copy-paste duplication of the same expression for budgeted and actual is a clear implementation shortcut that defeats the purpose of budget comparison.

### Proposed detector rule
```json
{
  "id": "skeleton_crud.budget_actual_column_alias_collision",
  "title": "SQL query aliases identical expression to both budget and actual columns",
  "category": "skeleton_crud",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "regex",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "as budgeted_.*\\n.*as actual_",
    "as budget[A-Z].*\\n.*as actual[A-Z]",
    "budgeted.*cost.*\\n.*actual.*cost"
  ],
  "negative_patterns": [
    "SUM\\(ep\\.budgeted_",
    "SUM\\(ep\\.actual_",
    "ep\\.budgeted_.*as budgeted_",
    "ep\\.actual_.*as actual_"
  ],
  "evidence_required": [
    "SQL query in $queryRaw or $executeRaw tagged template",
    "Two consecutive SELECT aliases where the source expression is identical",
    "One alias prefixed with 'budgeted' and the other with 'actual'",
    "The aliased values feed into a variance/comparison function"
  ],
  "false_positive_controls": [
    "Only flag when the source expression is character-for-character identical between budget and actual lines",
    "Exclude cases where the budget line references ep.budgeted_* and actual references ep.actual_* (correct pattern)",
    "Require the file to be in an analytics/dashboard/API path"
  ],
  "user_impact": "Finance dashboard shows misleading budget-vs-actual variance for cost categories. Managers making staffing, purchasing, or pricing decisions based on 'other costs always on budget' will have false confidence in their margins.",
  "repair_guidance": "Replace the budgeted_other_cost alias with the correct schema column expression (ep.budgeted_overhead), and the actual_other_cost alias with ep.actual_overhead. If beverage and rentals costs need to be tracked separately, add those columns to the EventProfitability model via a migration. Validate the query runs without errors against the actual database schema.",
  "example_source": {
    "file": "apps/api/app/api/analytics/finance/route.ts",
    "line_or_snippet": "COALESCE(SUM(ep.actual_beverage_cost + ep.actual_rentals_cost + ep.actual_other_cost), 0)::numeric as budgeted_other_cost,\nCOALESCE(SUM(ep.actual_beverage_cost + ep.actual_rentals_cost + ep.actual_other_cost), 0)::numeric as actual_other_cost"
  }
}
```

### Implementation note
Build a regex-based detector that scans $queryRaw/$executeRaw tagged template literals for consecutive SELECT alias lines where one alias is prefixed with "budgeted" and the other with "actual" but the source SQL expression is identical. Cross-reference the column names against the Prisma schema to also flag phantom column references. This catches copy-paste errors in analytics queries where a developer duplicated the actuals expression for the budget column.
---
## [2026-05-07 03:51] Rule Discovery — feature_claim_mismatch.ui_action_handler_is_toast_only

### Finding
The "Autofill Reports" tool in the frontend has three "Apply to Event" buttons (for Event Details, Menu Items, and Staff Shifts) and a "Download" button. The three "Apply" buttons all call `handleApplySection()` which does nothing except show a `toast.success()` message claiming the data was applied. No API call is made, no state is persisted, and no navigation occurs. The "Download" button has no `onClick` handler at all. Users are deceived into thinking their parsed document data is being written to the event record, but nothing happens.

### Evidence
- File: `apps/app/app/(authenticated)/tools/autofill-reports/autofill-reports-client.tsx`
- Snippet (handler — lines 497-501):
  ```tsx
  const handleApplySection = useCallback((section: string) => {
    toast.success(`${section} data applied to event form`, {
      description: "Navigate to the event editor to review the changes.",
    });
  }, []);
  ```
- Snippet (button usage — line 626):
  ```tsx
  onClick={() => handleApplySection("Event Details")}
  ```
- Snippet (dead Download button — lines 380-382):
  ```tsx
  <Button size="sm" variant="ghost">
    <Download className="h-4 w-4" />
  </Button>
  ```

### Why this matters
A catering operations team uploads a contract PDF or CSV, the parser extracts menu items, staff shifts, and event details. They click "Apply to Event" expecting the data to be written to the event record. The toast says "Event Details data applied to event form" and instructs them to "Navigate to the event editor to review the changes." But nothing was actually saved. The user navigates to the event editor and finds the same data as before — wasted time and potential data loss if they relied on the autofill and didn't manually enter the data.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.ui_action_handler_is_toast_only",
  "title": "UI action handler body is toast notification only",
  "category": "feature_claim_mismatch",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "ast",
  "language_targets": ["tsx", "jsx"],
  "patterns": [
    "Callback/arrow function assigned to a handler variable (handle*, on*) whose entire body is a single toast.success/info call with no fetch/apiFetch/Router.push/state mutation before it",
    "Button element with no onClick prop that has a label suggesting an action (Download, Export, Save, Apply, Delete)"
  ],
  "negative_patterns": [
    "Handler calls toast AFTER an await apiFetch or state setter",
    "Handler calls toast inside a try block that also has fetch/mutation",
    "Toast is used for informational display only (copy-to-clipboard feedback)"
  ],
  "evidence_required": [
    "Handler function body contains only toast call(s) with no side effects",
    "Handler is bound to a Button onClick",
    "Button label or section name implies data persistence (Apply, Save, Submit, Update)"
  ],
  "false_positive_controls": [
    "Ignore toast calls in catch blocks (error reporting)",
    "Ignore toast calls preceded by Router.push or router navigation",
    "Ignore toast calls in handlers that also call setState or mutate local state",
    "Allow informational toasts that accurately describe what happened (e.g., 'Link copied')"
  ],
  "user_impact": "User clicks an action button expecting data to be persisted or an action to occur. A success message appears confirming the action, but nothing was actually done. User wastes time and may lose data they expected to be saved.",
  "repair_guidance": "Wire each 'Apply to Event' button to call the appropriate API endpoint (e.g., PATCH /api/events/[id]) with the parsed section data. Add the Download button onClick to trigger a file download via Blob URL or API endpoint. Remove toast-only handlers and replace with real mutation + optimistic update + toast confirmation.",
  "example_source": {
    "file": "apps/app/app/(authenticated)/tools/autofill-reports/autofill-reports-client.tsx",
    "line_or_snippet": "const handleApplySection = useCallback((section: string) => {\n    toast.success(`${section} data applied to event form`, {\n      description: \"Navigate to the event editor to review the changes.\",\n    });\n  }, []);"
  }
}
```

### Implementation note
Build an AST-based detector that identifies useCallback or const handler functions whose body is a single expression statement calling toast.success, toast.info, or toast() with a string containing action verbs (applied, saved, updated, deleted, exported, downloaded). Cross-reference that the handler is used in a Button onClick. Also detect Button elements without onClick that have icon children suggesting download/export actions. Flag with high severity when the toast message implies persistence but no fetch/mutation/Router call exists in the handler body.
---

---
## [2026-05-07 04:58] Rule Discovery — skeleton_crud.orm_model_with_readers_zero_writers

### Finding
The `SupplierSyncLog` Prisma model is a fully-specified database model with 4 custom indexes, two foreign key relations (to `Account` and `InventorySupplier`), and detailed fields tracking sync operations (status, productsSynced, productsCreated, productsUpdated, productsDeactivated, errors, durationMs, triggeredBy). A dedicated API endpoint reads from this table to show "sync history" to users. However, no code anywhere in the entire codebase ever writes to `supplierSyncLog` — no `.create()`, `.createMany()`, or `.upsert()` call exists. The actual `SupplierSyncService.syncCatalog()` method returns a `SupplierSyncResult` with all the data the model was designed to capture, but the caller simply returns it to the HTTP response without persisting it. To compound the illusion, the read endpoint wraps the query in `.catch(() => { return []; })` which silently swallows any error (e.g., if the migration hasn't been applied), returning an empty array that looks like "no syncs yet" rather than surfacing the infrastructure gap.

### Evidence
- File: `apps/api/app/api/inventory/supplier-sync/route.ts`
- Snippet (read-only consumer with silent catch):
```typescript
    const syncLogs = await database.supplierSyncLog
      .findMany({
        where: { tenantId, supplierId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
      .catch(() => {
        // Table may not exist yet — return empty
        return [];
      });
```
- File: `packages/supplier-connectors/src/sync-service.ts` (lines 147-156 — result returned but never persisted):
```typescript
      return {
        connectorId: connector.id,
        productsSynced,
        productsUpdated,
        productsCreated,
        productsDeactivated,
        errors,
        syncedAt: new Date(),
        durationMs: Date.now() - startTime,
      };
```
- File: `packages/database/prisma/schema.prisma` (lines 1772-1798 — fully-indexed model):
```prisma
model SupplierSyncLog {
  tenantId            String    @map("tenant_id") @db.Uuid
  id                  String    @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  supplierId          String    @map("supplier_id") @db.Uuid
  connectorId         String    @map("connector_id")
  status              String    @default("pending")
  productsSynced      Int       @default(0) @map("products_synced")
  productsCreated     Int       @default(0) @map("products_created")
  productsUpdated     Int       @default(0) @map("products_updated")
  productsDeactivated Int       @default(0) @map("products_deactivated")
  errors              Json      @default("[]") @db.JsonB
  durationMs          Int       @default(0) @map("duration_ms")
  triggeredBy         String?   @map("triggered_by")
  // ... 4 custom indexes
}
```
- Cross-file proof: `grep -r "supplierSyncLog\.\(create\|createMany\|upsert\)"` returns 0 results across the entire codebase.

### Why this matters
Users see a "sync status" or "sync history" feature in the UI. When they trigger a supplier catalog sync, the sync runs (or fails) and they get an immediate HTTP response. But there is no durable record of any sync ever having occurred. The status endpoint always returns an empty array. This means:
1. There is no audit trail of supplier syncs — no way to see what changed, when, or by whom.
2. Troubleshooting sync failures is impossible — errors are returned in the HTTP response but never stored.
3. The `.catch(() => [])` mask means even if the database table doesn't exist (migration not applied), the endpoint silently returns success with empty data, hiding a potential infrastructure problem.
4. The Prisma model with 4 indexes suggests significant design effort was invested in a feature that was never wired up, creating implementation theater.

### Proposed detector rule
```json
{
  "id": "skeleton_crud.orm_model_with_readers_zero_writers",
  "title": "ORM model has consumer reads but zero writer calls anywhere in codebase",
  "category": "skeleton_crud",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "Prisma/ORM model referenced in findMany/findFirst queries but no create/createMany/upsert calls exist anywhere",
    "model has multiple custom indexes suggesting intended write-heavy usage",
    "read query wrapped in .catch(() => []) or similar silent error swallowing",
    "service layer returns data matching model fields but caller does not persist to model"
  ],
  "negative_patterns": [
    "models used only as lookup/reference tables (e.g., enum-like tables)",
    "models that are write-only (e.g., audit logs with no read endpoint)",
    "models written to via raw SQL or migration seed scripts",
    "models in generated/client code directories"
  ],
  "evidence_required": [
    "Prisma model definition with indexes in schema.prisma",
    "at least one findMany/findFirst consumer in application code",
    "zero create/createMany/upsert calls across entire codebase for that model",
    "no raw SQL INSERT into the mapped table"
  ],
  "false_positive_controls": [
    "exclude models whose only purpose is as a junction/relation table with no standalone business meaning",
    "exclude models that are clearly read-only caches populated by external systems",
    "verify the model is not written to via database triggers or external ETL pipelines"
  ],
  "user_impact": "Users see a feature (sync history, audit trail, activity log) that appears functional but is always empty. No data is ever persisted, so the feature provides zero value and masks the absence of real infrastructure.",
  "repair_guidance": "Add a sync log persistence step in the POST handler that calls syncCatalog, mapping the SupplierSyncResult fields to a supplierSyncLog.create() call. Remove the silent .catch(() => []) and replace with proper error handling. Ensure the sync log is created before returning the HTTP response so failures are captured even if the response fails.",
  "example_source": {
    "file": "apps/api/app/api/inventory/supplier-sync/route.ts",
    "line_or_snippet": "database.supplierSyncLog.findMany({...}).catch(() => { return []; })"
  }
}
```

### Implementation note
Build a cross-file detector that (1) extracts all Prisma model names from schema.prisma, (2) for each model, searches the codebase for write operations (create/createMany/upsert/update on that model), (3) searches for read operations (findMany/findFirst/count), (4) flags models where reads > 0 and writes == 0 and the model has 2+ custom indexes. Weight severity higher when the read endpoint uses .catch(() => []) or similar silent error suppression. Exclude junction tables, enum-like tables, and models only in generated code.
---
## [2026-05-07 22:15] Rule Discovery — automation_theater.rules_engine_rule_registered_but_always_passes

### Finding
The kitchen operations rules engine exports a rule called `equipmentCapacityRule` that is registered in the `equipmentRules` and `allRules` collections, making it part of every rules engine evaluation cycle. However, the rule's `validate` function is a no-op — it contains an inline comment "This would need to query current equipment usage" and "For now, just pass", and unconditionally returns `success(equipmentCapacityRule)` regardless of input. The rule appears in the public API surface (exported from the rules-engine index) and is consumed by the `allRules` default set, giving operators a false sense that equipment capacity limits are being enforced.

### Evidence
- File: `packages/manifest-adapters/src/rules-engine/rules.ts`
- Lines: 277-300
- Snippet:
```typescript
export const equipmentCapacityRule: ValidatedRule = createRule(
  "equipment-capacity",
  "Equipment Capacity Limits",
  "Equipment has capacity limits that cannot be exceeded",
  RuleSeverity.Warning,
  (context: RuleContext) => {
    const state = context.entity.state as {
      equipmentRequired?: string[];
    };
    const operation = context.operation.type;

    // Only check on claim/start operations
    if (operation !== "claim" && operation !== "start") {
      return success(equipmentCapacityRule);
    }

    // Check if any required equipment is at capacity
    // This would need to query current equipment usage
    // For now, just pass

    return success(equipmentCapacityRule);
  },
  { appliesTo: ["PrepTask", "KitchenTask"], tags: ["equipment", "capacity"] }
);
```
- Also exported at line 25 of `packages/manifest-adapters/src/rules-engine/index.ts` and included in `allRules` at line 686.

### Why this matters
A catering operation could overload equipment (e.g., assigning too many tasks to a single oven or prep station simultaneously) because this safety rule silently approves everything. The rule exists in the production rules engine and is evaluated on every task claim/start, so developers and operators may reasonably assume capacity checks are happening. In a high-volume kitchen environment, this could lead to equipment damage, food safety issues, or production bottlenecks that the system was designed to prevent.

### Proposed detector rule
```json
{
  "id": "automation_theater.rules_engine_rule_registered_but_always_passes",
  "title": "Rules engine rule is registered but always returns success",
  "category": "automation_theater",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "validate.*=>.*return success\\(",
    "// For now, just pass",
    "// TODO.*implement",
    "return success\\(.*Rule\\)",
    "export const.*Rule.*=.*createRule"
  ],
  "negative_patterns": [
    "return success\\(.*Rule\\);\\s*}\\);",
    "early-return.*conditional.*success"
  ],
  "evidence_required": [
    "Rule is exported and included in a rules collection (allRules, ruleSets, etc.)",
    "Rule validate function contains only early-return success calls",
    "Rule has descriptive name/summary claiming enforcement (e.g., 'capacity', 'limits', 'cannot exceed')",
    "No conditional logic that could produce a failure result"
  ],
  "false_positive_controls": [
    "Exclude rules where success is an early return with later failure paths",
    "Exclude rules whose validate function has more than 5 lines of logic",
    "Exclude informational/advisory rules (severity: Info) where always-passing is intentional",
    "Exclude test fixtures and mock rules"
  ],
  "user_impact": "Safety and capacity rules in the kitchen operations rules engine silently approve all operations, giving operators false confidence that equipment capacity, resource limits, or safety constraints are being enforced. In a catering kitchen, this could lead to equipment overload, scheduling conflicts, or food safety violations.",
  "repair_guidance": "Implement actual equipment capacity checking by querying current equipment usage from the database (FacilityAsset or Station models track capacity) and comparing against the task's equipment requirements. Remove the rule from the collection until implemented, or mark it as disabled in the rule set configuration.",
  "example_source": {
    "file": "packages/manifest-adapters/src/rules-engine/rules.ts",
    "line_or_snippet": "export const equipmentCapacityRule: ValidatedRule = createRule(...)"
  }
}
```

### Implementation note
Build an AST-based detector that (1) finds all rule definitions using the createRule factory pattern, (2) extracts the validate function body, (3) checks if all return paths lead to a success/allowed outcome with no conditional failure branches, (4) cross-references the rule name/description for enforcement-sounding keywords ("limit", "capacity", "cannot", "must not"), (5) verifies the rule is included in at least one exported collection. Flag as high severity when the rule description claims to prevent something (capacity limits, safety violations) but the validate function is tautologically permissive.
---

## [2026-05-07 06:44] Rule Discovery — test_theater.tests_assert_on_mirrored_constants_not_imported_code

### Finding
The test file `apps/app/__tests__/api/command-board/agent-loop-timeout.test.ts` claims to test timeout helpers, error retry logic, and structured error envelopes from the production module `agent-loop.ts`. However, the tests never import or invoke any of the functions they claim to test. Instead, they construct local constants mirroring the source values, create Error objects with known messages, and assert on string properties of those self-created objects. The test suite reads like thorough coverage (217 lines, 5 describe blocks, 12+ test cases) but validates nothing about the actual production code.

### Evidence
- File: `apps/app/__tests__/api/command-board/agent-loop-timeout.test.ts`
- Snippet (lines 28-46):
  ```typescript
  describe("withTimeout helper", () => {
    it("returns result when operation completes within timeout", async () => {
      await import("../../../app/api/command-board/chat/agent-loop");
      // For now, verify the constants are correct
      expect(true).toBe(true);
    });
    it("returns timedOut=true when operation exceeds timeout", async () => {
      // Testing timeout behavior requires access to internal functions
      // The behavior is tested through integration tests
      expect(true).toBe(true);
    });
  });
  describe("isRetryableError helper", () => {
    it("identifies timeout errors as retryable", async () => {
      const timeoutError = new Error("Connection ETIMEDOUT");
      expect(timeoutError.message).toContain("ETIMEDOUT");
    });
  ```
- Snippet (lines 84-100 — self-referential constants):
  ```typescript
  describe("timeout configuration constants", () => {
    it("defines appropriate tool call timeout", () => {
      expect(30_000).toBeLessThanOrEqual(30_000);
    });
    it("defines appropriate API call timeout", () => {
      expect(60_000).toBeLessThanOrEqual(60_000);
    });
  ```

### Why this matters
This is a more sophisticated form of test theater than bare `expect(true).toBe(true)`. The tests look legitimate on review — they have meaningful test names, non-trivial assertions, and organized structure. But they provide zero regression protection because they never import the functions under test. If `isRetryableError` were broken to always return false, or `executeToolWithRetry` stopped retrying, these tests would still pass. The 217 lines of test code inflate coverage metrics and create a false sense of confidence around critical agent-loop infrastructure (timeout handling, retry logic, structured error envelopes) that powers the AI command board — one of the product's headline features.

### Proposed detector rule
```json
{
  "id": "test_theater.tests_assert_on_mirrored_constants_not_imported_code",
  "title": "Tests assert on mirrored constants and self-created objects instead of imported production code",
  "category": "test_theater",
  "severity": "medium",
  "confidence": 0.85,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "describe blocks with test names referencing specific functions/classes",
    "new Error() constructed inside test then only .message or .toString() asserted",
    "expect(true).toBe(true) alongside comment about constants/internals",
    "self-defined constants asserted against their own literal values (expect(30000).toBeLessThanOrEqual(30000))",
    "test file contains no import of the module it describes in its test names",
    "await import('...') called but return value never destructured or used"
  ],
  "negative_patterns": [
    "import statements that destructure the function under test",
    "test files explicitly marked as .skip or .todo",
    "snapshot tests that intentionally test string representations",
    "unit tests for pure utility functions where re-importing is the point"
  ],
  "evidence_required": [
    "Test file describe/it names reference a specific function or module",
    "No import statement for that function exists in the test file, OR import return value is unused",
    "Assertions operate on locally constructed data (new Error(), literal constants) not on function return values"
  ],
  "false_positive_controls": [
    "Allow tests that import and call the function, even if they also create test fixtures",
    "Allow test helper files that are not named *.test.ts",
    "Allow integration/e2e test files that test via HTTP calls rather than direct imports"
  ],
  "user_impact": "Critical agent infrastructure (timeouts, retries, error handling) appears well-tested but has zero regression protection. A bug in isRetryableError or executeToolWithRetry would ship undetected and could cause the AI command board to silently fail or hang.",
  "repair_guidance": "Rewrite the test file to import isRetryableError, withTimeout, and executeToolWithRetry from agent-loop.ts (may need to export them), then write actual tests: pass known error objects to isRetryableError and assert return values, create a slow promise to test withTimeout, mock tool calls to test retry behavior. Remove the self-referential constant assertions.",
  "example_source": {
    "file": "apps/app/__tests__/api/command-board/agent-loop-timeout.test.ts",
    "line_or_snippet": "const timeoutError = new Error(\"Connection ETIMEDOUT\");\n      expect(timeoutError.message).toContain(\"ETIMEDOUT\");"
  }
}
```

### Implementation note
Build a hybrid detector that (1) parses test files to extract describe/it test names, (2) identifies function/class names referenced in those test names, (3) checks if those functions are imported from a source module, (4) checks if the import return value is used in assertions, (5) flags test files where assertions operate on locally constructed data (new Error(), literal values) that mirror the module's interface without actually invoking it. The `await import(...)` with unused return value pattern is a strong signal. Cross-reference against the source module to confirm the referenced functions exist but are not being tested.
---
## [2026-05-07 07:57] Rule Discovery — feature_claim_mismatch.ui_action_calls_501_endpoint_silently_fails

### Finding
The logistics route management UI presents a multi-step workflow: draft → optimize → start → complete. The "Optimize" button is visible for draft routes and calls `/api/logistics/routes/commands/optimize`, which always returns HTTP 501 ("Route optimization not yet implemented"). The frontend handler silently swallows this error — no toast, no status message, no user feedback — and the spinner just stops. The downstream "Start Route" button is gated on `route.status === "optimized"`, a state that is unreachable through normal UI interaction. The entire middle step of the advertised workflow is a dead button backed by a permanently unimplemented endpoint.

### Evidence
- File: `apps/api/app/api/logistics/routes/commands/optimize/route.ts`
- Snippet (backend — lines 30-39):
  ```ts
  // BLOCKER: No route optimization algorithm chosen yet (TSP variants, OSRM integration).
  // Tracked as capsule-pro/TODO:route-optimization-algorithm
  return NextResponse.json(
    {
      error: "Route optimization not yet implemented",
      message: "Schema ready — pending algorithm selection (TSP/OSRM)",
    },
    { status: 501 }
  );
  ```
- File: `apps/app/app/(authenticated)/logistics/routes/routes-view.tsx`
- Snippet (frontend handler — lines 141-160):
  ```ts
  const handleOptimize = async (routeId: string) => {
    setOptimizing(routeId);
    try {
      const res = await apiFetch("/api/logistics/routes/commands/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId }),
      });
      const data = await res.json();
      if (data.route) {
        setRoutes((prev) =>
          prev.map((r) => (r.id === routeId ? data.route : r))
        );
      }
    } catch (error) {
      console.error("Failed to optimize route:", error);
    } finally {
      setOptimizing(null);
    }
  };
  ```
- Snippet (unreachable downstream UI — lines 347-356):
  ```tsx
  {route.status === "optimized" && (
    <Button onClick={() => handleStartRoute(route.id)} size="sm" variant="default">
      <Play className="mr-2 h-4 w-4" />
      Start Route
    </Button>
  )}
  ```

### Why this matters
Users see an "Optimize" button on their draft delivery routes, click it, see a brief spinner, and nothing happens. There is no indication that the feature is unimplemented. The "Start Route" action — which is the natural next step after optimization — is permanently hidden behind a status that can never be achieved through the UI. This creates a confusing dead-end in the logistics workflow where the advertised multi-step process (draft → optimize → start → complete) is actually a single-step process (draft → dead end). The page header also advertises an "Optimized" tab (line 247) for filtering, but no route can ever reach that status through normal usage.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.ui_action_calls_501_endpoint_silently_fails",
  "title": "UI action handler calls endpoint that permanently returns 501 without user feedback",
  "category": "feature_claim_mismatch",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "tsx"],
  "patterns": [
    "apiFetch.*commands/optimize",
    "apiFetch.*commands/.*method.*POST",
    "handleOptimize|handle.*optim",
    "501.*not.*implemented",
    "status: 501"
  ],
  "negative_patterns": [
    "if.*res.*ok|if.*res.*status.*!==|toast|alert|setError|setErrorMessage|notification",
    "status === 501.*return.*error"
  ],
  "evidence_required": [
    "Frontend file with apiFetch call to a commands/ endpoint",
    "Backend route file that returns status 501",
    "Frontend handler that does not show user-visible error feedback on non-success response",
    "Downstream UI state gated on a status that the 501 endpoint would need to produce"
  ],
  "false_positive_controls": [
    "Exclude handlers that check res.ok or res.status before processing",
    "Exclude handlers that show toast/error notifications on failure",
    "Exclude endpoints that return 501 conditionally (only for specific inputs)",
    "Exclude test files"
  ],
  "user_impact": "Users click action buttons that appear functional but do nothing. No feedback is given. Downstream workflow steps are permanently unreachable, creating a confusing dead-end in multi-step processes.",
  "repair_guidance": "Either (a) implement the route optimization algorithm so the endpoint actually transitions routes to optimized status, (b) disable or hide the Optimize button and the Optimized tab with a Coming Soon badge, or (c) at minimum show a user-facing error toast/notification when the 501 is returned so the user knows the feature is not yet available.",
  "example_source": {
    "file": "apps/app/app/(authenticated)/logistics/routes/routes-view.tsx",
    "line_or_snippet": "const handleOptimize = async (routeId: string) => { setOptimizing(routeId); ... console.error('Failed to optimize route:', error); ... setOptimizing(null); };"
  }
}
```

### Implementation note
Build a cross-file detector that (1) scans frontend components for `apiFetch` calls to API endpoints, (2) checks if the corresponding backend route handler contains a permanent 501 return (not conditional), (3) checks if the frontend handler inspects the response status or shows user-facing error feedback (toast, alert, setError state), (4) flags cases where the frontend silently ignores the 501. Correlate with downstream UI state conditions (e.g., `route.status === "optimized"`) that depend on the 501 endpoint actually working.
---
## [2026-05-07 02:05] Rule Discovery — automation_theater.auto_sync_interval_never_consumed

### Finding
Both the Goodshuffle and Nowsta integration config schemas accept an `autoSyncInterval` field (integer, 5-1440 minutes). The frontend presents this as an "Auto Sync Interval (minutes)" input with a label "Between 5 and 1440 minutes", and the status display shows the configured value back to the user. However, no cron job, background scheduler, or recurring task ever reads this value to trigger automatic syncs. The only way to sync is via manual POST to `/api/integrations/{provider}/sync`. The `autoSyncInterval` is stored in the database and displayed in the UI, creating the impression of automated synchronization that does not actually exist.

### Evidence
- File: `apps/api/app/api/integrations/goodshuffle/config/route.ts`
- Snippet: `autoSyncInterval: z.number().int().min(5).max(1440).optional().nullable()`
- File: `apps/api/app/api/integrations/nowsta/config/route.ts`
- Snippet: `autoSyncInterval: z.number().int().min(5).max(1440).optional().nullable()`
- File: `apps/app/app/(authenticated)/settings/integrations/page.tsx` (line 594-607)
- Snippet:
  ```tsx
  <Label htmlFor="gs-auto-sync-interval">
    Auto Sync Interval (minutes)
  </Label>
  <Input id="gs-auto-sync-interval" min={5} max={1440} type="number" />
  <p className="text-xs text-muted-foreground">
    Between 5 and 1440 minutes
  </p>
  ```
- File: `apps/app/app/(authenticated)/settings/integrations/page.tsx` (line 437-439)
- Snippet: `<ConfigField label="Auto Sync Interval" value={`${config.autoSyncInterval} minutes`} />`
- No cron route under `apps/api/app/api/cron/` references goodshuffle or nowsta
- No `setInterval`, `node-cron`, `bullmq`, or `Temporal` usage found in `apps/api/`

### Why this matters
Users configure an auto-sync interval believing data will automatically flow between Convoy and their integration partners (Goodshuffle for event rentals, Nowsta for payroll). In reality, syncs only happen when someone manually clicks "Sync." If a user sets "every 15 minutes" and relies on that for up-to-date inventory or payroll data, they will be working with stale information without knowing it. This is a data integrity risk disguised as a working feature.

### Proposed detector rule
```json
{
  "id": "automation_theater.auto_sync_interval_never_consumed",
  "title": "Auto-sync interval config stored but never consumed by scheduler",
  "category": "automation_theater",
  "severity": "medium",
  "confidence": 0.92,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "tsx"],
  "patterns": [
    "autoSyncInterval|auto_sync_interval|syncInterval",
    "z.number().int().min(5).max(1440)",
    "Auto Sync Interval"
  ],
  "negative_patterns": [
    "setInterval|cron|schedule|bull|Temporal|agenda",
    "import.*node-cron|import.*bullmq|import.*@temporalio"
  ],
  "evidence_required": [
    "Config schema accepting interval value with min/max validation",
    "Frontend form field exposing interval configuration",
    "Absence of any scheduler/cron/worker that reads the interval from DB",
    "Absence of any import of scheduling library in the codebase"
  ],
  "false_positive_controls": [
    "Exclude if a cron route or background job references the config table",
    "Exclude if a scheduling library (bullmq, node-cron, Temporal, agenda) is imported anywhere in the monorepo and references the interval field",
    "Exclude if the config table has a last_auto_sync_at column that is updated on a recurring basis"
  ],
  "user_impact": "Users set an auto-sync interval expecting automated data synchronization, but syncs only happen manually. This leads to stale data in integrations, missed updates, and false confidence in system automation.",
  "repair_guidance": "Implement a cron job (e.g., via Vercel Cron or external scheduler) that periodically queries integration config tables for tenants with non-null autoSyncInterval and lastSyncAt older than the interval, then triggers the existing sync service. Alternatively, remove the autoSyncInterval field from both schemas and the frontend to avoid misleading users.",
  "example_source": {
    "file": "apps/api/app/api/integrations/goodshuffle/config/route.ts",
    "line_or_snippet": "autoSyncInterval: z.number().int().min(5).max(1440).optional().nullable()"
  }
}
```

### Implementation note
Build a cross-file detector that (1) identifies config schemas with interval/scheduling fields (e.g., `autoSyncInterval`, `syncInterval`, `cronInterval`), (2) checks if the database model/table is queried by any cron route, background job, or scheduler in the codebase, (3) checks if any scheduling library is imported or used anywhere that references the config entity, (4) checks if the frontend exposes a form field for the interval, and (5) flags cases where the interval is stored and displayed but never consumed by an actual scheduler. Should scan `packages/` for scheduling primitives as well.
---
## [2026-05-07 03:05] Rule Discovery — feature_claim_mismatch.iot_alert_creates_record_but_never_notifies

### Finding
The IoT temperature alert endpoint (`POST /api/kitchen/iot/alerts`) writes an alert record to the database but never dispatches any notification to kitchen staff. A BLOCKER comment at line 96 explicitly states "Notification service not yet implemented." While the codebase has a fully functional `packages/notifications` package with Knock integration, SMS via Twilio, email templates, and outbound webhook services, none of these are wired to the IoT alert creation flow. For a commercial kitchen platform, IoT temperature alerts are a food safety feature — a probe detecting a walk-in cooler above 41°F should immediately notify staff, not silently write a row to a database that nobody monitors in real-time.

### Evidence
- File: `apps/api/app/api/kitchen/iot/alerts/route.ts`
- Snippet: 
  ```typescript
  // BLOCKER: Notification service not yet implemented. Need to determine notification
  // channel (in-app, push, email) and staff assignment routing.
  // Tracked as capsule-pro/TODO:iot-notification-service
  ```
- The POST handler creates an `ioTAlert` record (line 81-94) and returns immediately (line 100) with no notification dispatch.
- `packages/notifications/` exports `sendSms`, `sendEmailNotification`, `sendWebhook`, and a full Knock client — none are imported or called in this route.
- The IoT Monitoring page at `/kitchen/iot` displays active alerts, implying staff will see them by navigating there — but nobody navigates to a dashboard during active food prep.

### Why this matters
In a commercial kitchen, temperature compliance is critical for food safety. An IoT probe detecting a refrigeration failure is only useful if it reaches staff in time to act. An alert that only exists as a database row provides false confidence — the feature appears to work (it returns 200, creates a record, displays in the UI) but fails at its core purpose: timely notification. This is especially dangerous because the BLOCKER comment has been present since the feature was shipped, meaning it was known to be incomplete at launch.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.iot_alert_creates_record_but_never_notifies",
  "title": "IoT alert endpoint creates DB record but never dispatches notification",
  "category": "feature_claim_mismatch",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "tsx"],
  "patterns": [
    "BLOCKER.*[Nn]otification.*not.*implemented",
    "create\\(\\s*data.*alert.*status.*active",
    "ioTAlert\\.create|iot_alert.*INSERT"
  ],
  "negative_patterns": [
    "sendSms|sendEmail|sendNotification|sendWebhook|knock",
    "dispatch.*alert|trigger.*notification|notify.*staff"
  ],
  "evidence_required": [
    "Route handler that creates an alert/safety record in the database",
    "Absence of any notification dispatch (SMS, email, push, webhook) in the same handler or downstream call",
    "BLOCKER or TODO comment explicitly noting missing notification",
    "Presence of a notification package in the monorepo that could be used"
  ],
  "false_positive_controls": [
    "Exclude if a notification is dispatched in the same request handler or via a downstream function call",
    "Exclude if an outbox/event pattern is used and a consumer worker dispatches notifications",
    "Exclude if the alert is purely informational and no notification claim exists in the UI/docs"
  ],
  "user_impact": "IoT temperature alerts in commercial kitchens fail silently — staff are never notified of refrigeration failures, creating a food safety risk. The feature appears functional (200 response, UI displays alerts) but its core purpose (timely notification) is unimplemented.",
  "repair_guidance": "After creating the IoT alert record, dispatch notifications using the existing packages/notifications infrastructure. For critical severity alerts, send SMS to on-duty kitchen staff via sendSms(). For all alerts, create an in-app notification via the Knock client and/or the collaboration notifications API. Consider adding a configurable escalation policy (notify after X minutes unacknowledged). Remove the BLOCKER comment once notification dispatch is verified.",
  "example_source": {
    "file": "apps/api/app/api/kitchen/iot/alerts/route.ts",
    "line_or_snippet": "// BLOCKER: Notification service not yet implemented. Need to determine notification\n// channel (in-app, push, email) and staff assignment routing.\n// Tracked as capsule-pro/TODO:iot-notification-service"
  }
}
```

### Implementation note
Build a hybrid detector that (1) identifies BLOCKER/TODO comments mentioning notification in alert-creating endpoints, (2) checks if the handler or any function it calls imports from `@repo/notifications` or calls notification dispatch functions (`sendSms`, `sendEmailNotification`, `sendWebhook`, `notifications.notify`), (3) checks if an outbox pattern exists with a consumer that dispatches notifications, (4) flags cases where an alert/safety record is persisted but no notification channel is invoked. Cross-reference with the IoT monitoring UI to confirm the feature claims real-time alerting capability.
---
