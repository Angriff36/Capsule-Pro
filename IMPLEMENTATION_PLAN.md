# SlopScope Rule Discovery Log

---
## [2026-05-06 15:11] Rule Discovery — automation_theater.audit_log_console_only

### Finding
The `PrismaPayrollDataSource.savePayrollAudit()` method is intended to persist payroll audit records to the database for compliance and accountability. Instead, it logs audit data to `console.log` and returns immediately — the audit data is never persisted. The `PayrollService.generatePayroll()` method calls `savePayrollAudit()` believing it creates a durable audit trail (it's guarded by `enableAuditLog` config, defaulting to `true`). Meanwhile, `getPayrollRecords()` also fabricates `taxesWithheld: []` and `totalTaxes: 0` when reading records back, because `savePayrollRecords()` never stored tax breakdown data in the database schema. The net effect: payroll taxes are calculated correctly during generation but are silently lost on persistence, and the entire audit trail is theater.

### Evidence
- File: `packages/payroll-engine/src/dataSource/PrismaPayrollDataSource.ts`
- Snippet (audit theater, line 286-297):
  ```typescript
  async savePayrollAudit(audit: PayrollAudit): Promise<void> {
    // BLOCKER: PayrollAudit model does not exist in schema. Tracked as capsule-pro/TODO:payroll-employee-models
    // For now, log to console
    console.log("[PayrollAudit]", {
      id: audit.id,
      tenantId: audit.tenantId,
      periodId: audit.periodId,
      action: audit.action,
      userId: audit.userId,
      timestamp: audit.timestamp,
    });
  }
  ```
- Snippet (tax data fabrication on read-back, lines 389-394):
  ```typescript
  taxesWithheld: [], // BLOCKER: Tax calculation engine not yet implemented. Tracked as capsule-pro/TODO:payroll-employee-models
  totalTaxes: 0, // BLOCKER: Tax calculation engine not yet implemented. Tracked as capsule-pro/TODO:payroll-employee-models
  ```
- Snippet (tax data dropped during save, lines 258-265 — `record.taxesWithheld` and `record.totalTaxes` never referenced in save):
  ```typescript
  create: {
    // ... fields stored: hours_regular, hours_overtime, rate_regular, rate_overtime,
    // gross_pay, deductions (JSON), net_pay
    // MISSING: no tax_withheld or total_taxes column
  }
  ```
- Snippet (taxInfo and payrollPrefs always undefined, lines 54-59):
  ```typescript
  department: undefined,
  taxInfo: undefined, // BLOCKER: EmployeeTaxInfo model does not exist in schema
  payrollPrefs: undefined, // BLOCKER: EmployeePayrollPrefs model does not exist in schema
  ```

### Why this matters
This is a payroll system. When payroll records are generated, federal/state/FICA taxes are correctly computed by `taxEngine.ts`. But `savePayrollRecords()` drops the tax breakdown entirely (no DB column exists), and `getPayrollRecords()` returns hardcoded zeros. Any UI, report, or export that reads back payroll records will show employees receiving their full gross pay with zero tax withholdings. The audit trail — which would be critical for IRS compliance, wage disputes, and internal controls — goes to `console.log` only. A user viewing historical payroll reports would see incorrect financial data and have zero audit history to investigate discrepancies.

### Proposed detector rule
```json
{
  "id": "automation_theater.audit_log_console_only",
  "title": "Audit/log persistence method uses console.log instead of durable storage",
  "category": "automation_theater",
  "severity": "critical",
  "confidence": 0.95,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "async.*saveAudit|async.*persistAudit|async.*recordAudit|async.*logAudit",
    "console\\.log\\(.*[Aa]udit",
    "console\\.log\\(.*[Ll]og.*\\{",
    "// For now, log to console",
    "// BLOCKER.*model does not exist"
  ],
  "negative_patterns": [
    "console\\.log\\(.*test",
    "console\\.log\\(.*debug",
    "describe\\(|it\\(|test\\(",
    "__tests__|\\.test\\.|\\.spec\\."
  ],
  "evidence_required": [
    "Method named with audit/log/persist/record intent that only calls console.log",
    "BLOCKER or TODO comment indicating missing schema/model",
    "Interface or type definition that implies the data should be persisted",
    "Caller of the method assumes durable persistence (no error handling for failure)"
  ],
  "false_positive_controls": [
    "Exclude test files and test utility functions",
    "Exclude files with 'mock' or 'stub' in filename or class name",
    "Require the method to have an async signature (not just logging)",
    "Require caller to not check the return value or handle errors from the call"
  ],
  "user_impact": "Critical financial data (tax withholdings, audit trails) is silently lost. Payroll reports show zero taxes. No compliance audit trail exists for IRS or internal controls. Users trust the system is recording financial history when it is not.",
  "repair_guidance": "1. Create the missing PayrollAudit table/model in the Prisma schema. 2. Implement savePayrollAudit to INSERT into the table. 3. Add tax_withheld and total_taxes columns to payroll_line_items table. 4. Update savePayrollRecords to persist tax breakdown. 5. Update getPayrollRecords to read tax data from DB instead of hardcoding zeros. 6. Add migration for all schema changes.",
  "example_source": {
    "file": "packages/payroll-engine/src/dataSource/PrismaPayrollDataSource.ts",
    "line_or_snippet": "async savePayrollAudit(audit: PayrollAudit): Promise<void> {\n    // BLOCKER: PayrollAudit model does not exist in schema.\n    console.log(\"[PayrollAudit]\", { ... });\n  }"
  }
}
```

### Implementation note
Detector should flag methods with audit/persistence intent (async, returns Promise<void>, named with save/record/audit/log) that only perform console.log/console.warn without any database write, file write, or API call. Cross-file validation: check if the method's interface contract implies durable storage, and if callers treat the result as persisted. Should also flag read-back methods that hardcode zero/empty values for fields that should come from storage, paired with BLOCKER comments.
---

---
## [2026-05-06 08:22] Rule Discovery — fake_integration.stub_connector_registered_as_live

### Finding
The `@repo/supplier-connectors` package exports a `SupplierConnector` interface with methods for `testConnection()`, `fetchCatalog()`, `checkAvailability()`, and `fetchPricing()`. Two concrete implementations are registered in a `ConnectorRegistry` singleton and exported as if production-ready: `CharliesProduceConnector` and `UsFoodsConnector`. A `SupplierSyncService` consumes these connectors via the registry, and a Next.js API route (`POST /api/inventory/supplier-sync/sync`) wires the full pipeline: auth, credential validation, Zod schema parsing, sync execution, and response.

However, both connector implementations are pure stubs. Every method body is a `console.log` followed by a hardcoded return value (`[]`, `{}`, `{ available: false, quantity: 0 }`, `false`). All methods contain `// BLOCKER` comments admitting the integration is not implemented. The sync service calls `connector.fetchCatalog()` which always returns `[]`, causing it to report `{ productsSynced: 0, errors: [] }` — a silent success for zero work. A user triggering a sync sees "Synced 0 products from Charlie's Produce" with no indication the connector is non-functional.

The API route also declares a `supplier` variable (line 77-82) with a type cast to query credentials from the database, then never uses it — credentials fall through to env vars with a comment "For now, build config with placeholder credentials." This is a second-order finding (dead code / incomplete implementation).

### Evidence
- File: `packages/supplier-connectors/src/connectors/charlies-produce.ts`
- Snippet (lines 89-118):
  ```typescript
  async fetchCatalog(
    config: SupplierConnectorConfig
  ): Promise<SupplierProduct[]> {
    const { apiBaseUrl, apiKey } = config.credentials;
    // BLOCKER: API credentials from Charlie's Produce not yet obtained.
    console.log(
      "[charlies-produce] Catalog fetch not implemented - API credentials required"
    );
    return [];
  }
  ```
- File: `packages/supplier-connectors/src/connectors/us-foods.ts`
- Snippet (lines 109-126):
  ```typescript
  async checkAvailability(
    config: SupplierConnectorConfig,
    skus: string[]
  ): Promise<Record<string, { available: boolean; quantity?: number }>> {
    // BLOCKER: EDI infrastructure not yet available.
    console.log(
      "[us-foods] Availability check not implemented - EDI infrastructure required"
    );
    const result: Record<string, { available: boolean; quantity?: number }> = {};
    for (const sku of skus) {
      result[sku] = { available: false, quantity: 0 };
    }
    return result;
  }
  ```
- File: `packages/supplier-connectors/src/registry.ts`
- Snippet (lines 120-122):
  ```typescript
  // Register built-in connectors
  connectorRegistry.register(usFoodsConnector);
  connectorRegistry.register(charliesProduceConnector);
  ```
- File: `apps/api/app/api/inventory/supplier-sync/route.ts`
- Snippet (lines 84-88):
  ```typescript
  // For now, build config with placeholder credentials
  // In production, credentials would be fetched from the supplier record's
  // encrypted connectorCredentials field
  const config = {
  ```
- File: `apps/api/app/api/inventory/supplier-sync/route.ts`
- Snippet (lines 122-125, silent success response):
  ```typescript
  return manifestSuccessResponse({
    message: `Synced ${result.productsSynced} products from ${connector.name}`,
    ...result,
  });
  ```

### Why this matters
A catering company using this system would configure their supplier (US Foods or Charlie's Produce) with API credentials, hit "Sync Catalog" in the UI, and see a success message saying "Synced 0 products" — with zero indication the connector is non-functional. The system never makes any HTTP request to the supplier. All inventory and pricing data remains empty/stale. The sync service and API route present a complete, production-ready interface, but the actual integration layer is an empty shell. This is textbook fake integration: a well-typed interface, a registry, a sync engine, an API route with auth — but no outbound network call exists anywhere in the connector implementations.

### Proposed detector rule
```json
{
  "id": "fake_integration.stub_connector_registered_as_live",
  "title": "Connector/interface implementation registered as live but all methods are stubs returning empty/falsy values",
  "category": "fake_integration",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "class \\w+Connector implements \\w+Connector",
    "console\\.log\\(.*not implemented",
    "console\\.log\\(.*API credentials required",
    "console\\.log\\(.*infrastructure required",
    "return \\[\\];",
    "return \\{\\};",
    "// BLOCKER.*not yet",
    "// BLOCKER.*credentials",
    "connectorRegistry\\.register\\(",
    "stub implementation"
  ],
  "negative_patterns": [
    "describe\\(|it\\(|test\\(",
    "__tests__|\\.test\\.|\\.spec\\.",
    "class.*Mock.*implements",
    "class.*Stub.*implements"
  ],
  "evidence_required": [
    "Class implements an interface with methods implying real integration (fetch, sync, connect, check)",
    "Method body contains only console.log/warn and hardcoded empty/falsy return",
    "BLOCKER or TODO comment indicating missing credentials/infrastructure",
    "Class is registered in a registry or exported as a singleton (not behind a feature flag or mock guard)",
    "Consumer code (sync service, API route) calls the methods without checking for stub status"
  ],
  "false_positive_controls": [
    "Exclude test files and files in __tests__ directories",
    "Exclude classes with 'Mock' or 'Stub' in their name",
    "Exclude classes only imported from test files",
    "Require at least 2 methods in the class to match the stub pattern",
    "Require the class to be registered/exported outside of test context"
  ],
  "user_impact": "Users believe supplier integrations are active and can sync inventory/pricing data. In reality, all sync operations silently return zero results with no error. Catering staff would see empty vendor catalogs, stale pricing, and incorrect availability — but the UI reports success. This could lead to ordering from incorrect prices, missing ingredient availability data, and financial discrepancies in event costing.",
  "repair_guidance": "1. Add an isLive: boolean property to the SupplierConnector interface that each implementation must declare. 2. Gate registration in the connector registry — require isLive=true or a dedicated staging registry. 3. Have the sync service check connector.isLive before proceeding and return a clear connector not implemented error. 4. Add a UI badge or warning when displaying connectors that are in stub mode. 5. Remove the For now, placeholder credentials dead code in the sync route and either implement credential fetching from DB or add a BLOCKER comment.",
  "example_source": {
    "file": "packages/supplier-connectors/src/connectors/charlies-produce.ts",
    "line_or_snippet": "async fetchCatalog(config: SupplierConnectorConfig): Promise<SupplierProduct[]> {\n    console.log('[charlies-produce] Catalog fetch not implemented - API credentials required');\n    return [];\n  }"
  }
}
```

### Implementation note
Detector should scan for classes that implement an interface (indicating a contract) and are registered/exported as production singletons, but whose method bodies consist only of console.log/console.warn and hardcoded empty returns. Cross-file validation: check if a registry or consumer (sync service, API route) calls these methods without any stub-detection guard. Should also flag the "For now, placeholder" / "For now, build config with placeholder" pattern in route handlers as secondary evidence of incomplete wiring. The detector should distinguish between intentional test doubles (Mock/Stub naming, test-only imports) and production code that happens to be unimplemented.
---
---
## [2026-05-06 08:36] Rule Discovery — feature_claim_mismatch.deadline_reminder_ui_no_backend

### Finding
The unified calendar UI advertises five event types — Events, Shifts, Time Off, Deadlines, and Reminders — with color-coded filter badges that users can toggle on/off. The default filter state includes all five types, and the API's default `types` parameter also includes all five. However, the `Deadline` and `Reminder` models do not exist in the Prisma schema, and the calendar API route silently returns zero results for these types with no error, no warning, and no indication to the user that these features are non-functional. The BLOCKER comment acknowledging this is buried in server code the user never sees.

### Evidence
- File: `apps/api/app/api/calendar/route.ts`
- Snippet (type union includes deadline and reminder, line 39):
  ```typescript
  type: "event" | "shift" | "timeoff" | "deadline" | "reminder";
  ```
- Snippet (default types param includes deadline and reminder, lines 88-89):
  ```typescript
  const typesParam =
    searchParams.get("types") || "event,shift,timeoff,deadline,reminder";
  ```
- Snippet (BLOCKER comment, lines 240-241):
  ```typescript
  // BLOCKER: Deadline and Reminder models do not exist in schema.
  // Tracked as capsule-pro/TODO:calendar-deadlines-reminders
  ```
- File: `apps/app/app/(authenticated)/calendar/components/unified-calendar.tsx`
- Snippet (frontend type union also includes both types, line 74):
  ```typescript
  type: "event" | "shift" | "timeoff" | "deadline" | "reminder";
  ```
- Snippet (color scheme includes both types, lines 96-97):
  ```typescript
  deadline: "bg-red-500 border-red-600",
  reminder: "bg-purple-500 border-purple-600",
  ```
- Snippet (labels include both types, lines 104-105):
  ```typescript
  deadline: "Deadlines",
  reminder: "Reminders",
  ```
- Snippet (default filter state includes both types, lines 226-232):
  ```typescript
  const [filters, setFilters] = useState<string[]>([
    "event",
    "shift",
    "timeoff",
    "deadline",
    "reminder",
  ]);
  ```
- Snippet (filter toggle badges rendered for all five types, lines 657-665):
  ```tsx
  {Object.entries(EVENT_TYPE_LABELS).map(([type, label]) => (
    <Badge
      className={`cursor-pointer ${filters.includes(type) ? EVENT_COLORS[type]... : ""}`}
      key={type}
      onClick={() => toggleFilter(type)}
      variant={filters.includes(type) ? "default" : "outline"}
    >
      {label}
  ```

### Why this matters
A catering operations manager opens the calendar and sees five filter badges: Events, Shifts, Time Off, Deadlines, and Reminders. All five are active by default. They assume the calendar is comprehensive and shows all scheduled items. If they click "Deadlines" to filter only deadlines, the calendar empties — but this looks like they simply have no deadlines, not that the feature is broken. There is no "coming soon" label, no disabled state, no tooltip, and no empty-state message explaining the feature isn't built yet. The BLOCKER comment is server-side only. The type union in both frontend and backend creates a contract that implies these features exist. This is a feature claim mismatch: the UI and API advertise functionality that has zero backend implementation.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.deadline_reminder_ui_no_backend",
  "title": "UI advertises event types or feature categories that have no backend model or data source",
  "category": "feature_claim_mismatch",
  "severity": "medium",
  "confidence": 0.90,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "tsx", "prisma"],
  "patterns": [
    "type.*=.*\"event\".*\"shift\".*\"deadline\".*\"reminder\"",
    "EVENT_TYPE_LABELS|EVENT_COLORS",
    "const \\[filters.*useState",
    "BLOCKER.*model does not exist",
    "typesParam.*deadline.*reminder"
  ],
  "negative_patterns": [
    "describe\\(|it\\(|test\\(",
    "__tests__|\\.test\\.|\\.spec\\.",
    "501 Not Implemented",
    "Coming soon|coming.soon|not.yet.available"
  ],
  "evidence_required": [
    "Type union or enum in frontend component includes categories like 'deadline', 'reminder', or other feature types",
    "UI renders filter badges, tabs, or toggles for those categories with no disabled/coming-soon state",
    "Default filter/param state includes those categories (not just available but active by default)",
    "API route or backend has BLOCKER/TODO comment acknowledging missing model/table",
    "No corresponding Prisma model, database table, or API endpoint exists for those categories",
    "API returns success (200) with zero items rather than an error or explicit not-implemented response"
  ],
  "false_positive_controls": [
    "Exclude features that return a 501 status or explicit 'not implemented' error response",
    "Exclude features where the UI shows a disabled state or 'coming soon' label",
    "Exclude features where the frontend has a conditional render based on feature flag or capability check",
    "Require the missing category to be included in default/initial state, not just available"
  ],
  "user_impact": "Users see filter badges and type options for features that don't exist, with no indication they're non-functional. Clicking 'Deadlines' shows an empty calendar that looks like they have no deadlines, not that the feature is unbuilt. This erodes trust and causes confusion about whether data is missing or the feature is broken.",
  "repair_guidance": "1. Add a feature flag or capability check to the frontend that disables or hides the Deadline and Reminder filter badges with a 'Coming soon' label. 2. Remove 'deadline' and 'reminder' from the API's default types parameter so they're not advertised unless requested. 3. If a user explicitly requests these types, return a 501 with a clear message. 4. Alternatively, implement the Deadline and Reminder Prisma models and wire them into the calendar query.",
  "example_source": {
    "file": "apps/api/app/api/calendar/route.ts",
    "line_or_snippet": "// BLOCKER: Deadline and Reminder models do not exist in schema.\n// Tracked as capsule-pro/TODO:calendar-deadlines-reminders\n\nreturn NextResponse.json({ events });"
  }
}
```

### Implementation note
Detector should perform cross-file analysis: (1) scan frontend components for type unions/enums/label maps that declare feature categories, (2) check if corresponding filter badges/tabs are rendered with active default states, (3) check the backend API for those same category names, (4) verify whether a Prisma model or database table exists for each category, (5) flag cases where the frontend advertises a category that has no backend data source AND the backend silently returns empty results rather than an explicit error. The key signal is the asymmetry: UI presents the feature as live, backend silently drops it.
---

---
## [2026-05-06 16:30] Rule Discovery — security_theater.api_key_scopes_never_enforced

### Finding
The API key authentication system (apps/api/middleware/api-key-auth.ts) implements a full scope-based authorization model: it defines hasScope(), hasAnyScope(), hasAllScopes(), insufficientPermissions(), and a withApiKeyAuth higher-order function wrapper — all with thorough JSDoc and usage examples. The ApiKeyContext type includes a scopes: string[] field populated from the database. Users create API keys with scopes via POST /api/settings/api-keys and the scopes are persisted and displayed in the settings UI.

However, no route handler in the entire apps/api/app directory imports or calls any of these scope-checking functions. A search for withApiKeyAuth, authenticateApiKey, hasScope, hasAnyScope, hasAllScopes, and insufficientPermissions in apps/api/app returns zero results. The scope functions are dead code — defined, documented, and exported but never consumed.

### Evidence
- File: apps/api/middleware/api-key-auth.ts
- Snippet (scope functions, lines 300-337):
  export function hasScope(apiKey: ApiKeyContext, scope: string): boolean {
    return apiKey.scopes.includes(scope);
  }
  export function hasAnyScope(apiKey: ApiKeyContext, scopes: string[]): boolean {
    return scopes.some((scope) => apiKey.scopes.includes(scope));
  }
  export function hasAllScopes(apiKey: ApiKeyContext, scopes: string[]): boolean {
    return scopes.every((scope) => apiKey.scopes.includes(scope));
  }
  export function insufficientPermissions(requiredScope: string): Response {
    return NextResponse.json(
      { message: "Insufficient permissions. Required scope: " + requiredScope },
      { status: 403 }
    );
  }
- Snippet (withApiKeyAuth HOF, lines 266-287): exported HOF wrapping authenticateApiKey, passing apiKey context to handler
- File: apps/api/app/api/settings/api-keys/route.ts
- Snippet (scopes are created and stored, lines 107-113):
  const apiKey = await database.apiKey.create({
    data: {
      scopes: Array.isArray(scopes) ? (scopes as string[]) : [],
    },
  });
- Cross-file grep: searching for withApiKeyAuth|authenticateApiKey|hasScope|hasAnyScope|hasAllScopes in apps/api/app/ returns 0 results in route handlers.

### Why this matters
Users create API keys believing scopes like read:events, write:inventory restrict access. In reality, scopes are stored in the database and shown in the UI but never enforced. This is a textbook security theater pattern: the authorization infrastructure exists and looks complete, but it has zero enforcement teeth.

### Proposed detector rule
{
  "id": "security_theater.api_key_scopes_never_enforced",
  "title": "Scope-checking auth functions defined but never consumed by route handlers",
  "category": "security_theater",
  "severity": "critical",
  "confidence": 0.95,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "export function hasScope\\(",
    "export function hasAnyScope\\(",
    "export function hasAllScopes\\(",
    "export function insufficientPermissions\\(",
    "export function withApiKeyAuth\\(",
    "scopes.*string\\[\\]"
  ],
  "negative_patterns": [
    "hasScope.*import",
    "withApiKeyAuth.*import",
    "authenticateApiKey.*import"
  ],
  "evidence_required": [
    "Middleware or auth module exports scope-checking functions (hasScope, hasAnyScope, hasAllScopes, insufficientPermissions, withApiKeyAuth)",
    "API routes directory has zero imports of these exported scope functions",
    "Settings or management UI allows creating resources with scope fields",
    "Database schema stores scope data for API keys"
  ],
  "false_positive_controls": [
    "Only flag if the middleware file is in a server/API directory (not client-side)",
    "Only flag if at least 3 scope-related functions are exported together",
    "Exclude if any route handler imports the scope functions (would mean enforcement exists)"
  ],
  "user_impact": "Users create API keys with specific scope restrictions believing they limit access, but scopes are never enforced at the route level. Any valid API key bypasses all authorization boundaries. If third-party integrations use API keys, they gain unrestricted access to all endpoints.",
  "repair_guidance": "Wire the API key auth middleware into route handlers that should be accessible via API keys. Use withApiKeyAuth wrapper or call authenticateApiKey + hasScope at the top of each protected route. Add integration tests that verify scope enforcement.",
  "example_source": {
    "file": "apps/api/middleware/api-key-auth.ts",
    "line_or_snippet": "export function hasScope(apiKey: ApiKeyContext, scope: string): boolean { return apiKey.scopes.includes(scope); }"
  }
}

### Implementation note
Detector should perform cross-file analysis: (1) identify middleware/auth modules that export scope-checking functions, (2) search all route handlers for imports of those functions, (3) if exports exist but zero imports are found in route handlers, flag as security theater, (4) check if a settings/management CRUD endpoint exists for creating resources with scope fields, (5) verify the database schema stores scope data. The key signal is the gap between authorization infrastructure and enforcement consumption.
---

---
## [2026-05-06 17:45] Rule Discovery — test_theater.tautological_assertions_inflate_coverage

### Finding
Multiple test files in the repository contain test cases whose sole assertion is `expect(true).toBe(true)`. These tests function as documentation notes or TODO placeholders rather than actual verification of behavior. They always pass, inflate test counts, and create a false impression of test coverage. The most concentrated example is `apps/app/__tests__/settings/settings-workflow.test.ts`, where 39 out of 49 tests (80%) are tautological. A secondary example is `packages/notifications/__tests__/provider-disabled.test.ts` with 13 out of 18 tests using `expect(true).toBe(true)`, many accompanied by comments like `// Source: ...` or `// ✅ FIXED:` that describe the expected behavior in prose but never actually import or invoke the code under test.

### Evidence
- File: `apps/app/__tests__/settings/settings-workflow.test.ts`
- Snippet (line 330-337):
  ```typescript
  it("Security page is a static placeholder (no real data)", () => {
    // ✅ Currently safe — shows no real security settings
    expect(true).toBe(true);
  });

  it("Integrations page is a static placeholder (no real data)", () => {
    // ✅ Currently safe — shows no real integration configs
    expect(true).toBe(true);
  });
  ```
- Snippet (line 324-327):
  ```typescript
  it("Email template actions do NOT check user role", () => {
    // ⚠️ FINDING: Server actions only check auth(), not role
    // Any authenticated user can create/update/delete email templates
    expect(true).toBe(true);
  });
  ```
- File: `packages/notifications/__tests__/provider-disabled.test.ts`
- Snippet (lines 22-28):
  ```typescript
  it("returns children without wrapping when Knock keys are missing", () => {
    // Source: packages/notifications/components/provider.tsx
    // if (!(knockApiKey && knockFeedChannelId)) { return children; }
    // ✅ GRACEFUL: App renders normally, no crash, no wrapper overhead
    expect(true).toBe(true);
  });
  ```
- File: `apps/app/__tests__/api/command-board/agent-loop-timeout.test.ts`
- Snippet (lines 28-38):
  ```typescript
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
  ```
- File: `apps/api/__tests__/kitchen/manifest-code-generation.test.ts`
- Snippet (lines 98-121):
  ```typescript
  // This test always passes - it's inventory only
  expect(true).toBe(true);
  ...
  // This test always passes - it's informational only
  expect(true).toBe(true);
  ```
- Aggregate count: 63 `expect(true).toBe(true)` occurrences across 4 project test files (excluding node_modules)

### Why this matters
Tautological tests inflate the test suite's pass count without providing any regression protection. When a developer sees "49 tests passing" in `settings-workflow.test.ts`, they may assume authorization flows, role checks, and access controls are verified — but 80% of those tests verify nothing. The `provider-disabled.test.ts` file claims to validate graceful degradation of email/SMS/notification services, but most tests just restate the source code in comments without actually importing or invoking the service code. This creates a dangerous gap: if a regression is introduced (e.g., a missing `try/catch` causes an unhandled crash instead of graceful degradation), these tests will still pass. The test suite signals safety where none exists. CI dashboards, coverage reports, and PR checks all appear green while real behavior goes unverified.

### Proposed detector rule
```json
{
  "id": "test_theater.tautological_assertions_inflate_coverage",
  "title": "Test file uses expect(true).toBe(true) or equivalent tautological assertions that always pass",
  "category": "test_theater",
  "severity": "medium",
  "confidence": 0.95,
  "detector_type": "regex",
  "language_targets": ["typescript", "javascript", "tsx"],
  "patterns": [
    "expect\\(true\\)\\.toBe\\(true\\)",
    "expect\\(1\\)\\.toBe\\(1\\)",
    "expect\\(0\\)\\.toBe\\(0\\)",
    "assert\\(true\\)",
    "expect\\(true\\)\\.toBeTruthy\\(\\)"
  ],
  "negative_patterns": [
    "node_modules/",
    "vendor/",
    "dist/",
    ".next/",
    "coverage/",
    "// intentional tautology",
    "// TODO: replace with real assertion",
    "// SKIP:",
    "skip\\(",
    "test\\.skip",
    "describe\\.skip",
    "it\\.skip"
  ],
  "evidence_required": [
    "Test file containing tautological assertions",
    "Ratio of tautological to total assertions per file exceeding 30%",
    "Absence of any other meaningful assertion in the same test block (it/it.each block)"
  ],
  "false_positive_controls": [
    "Skip if test file contains 'skip' or 'todo' annotations indicating known placeholder status",
    "Skip single occurrences in otherwise well-asserted files (focus on files where tautological ratio exceeds 30%)",
    "Skip files under node_modules or generated directories",
    "Allow tautological assertions if the test block also contains at least one non-tautological assertion"
  ],
  "user_impact": "Test suite reports green/passing for behaviors that are never actually verified. Developers get false confidence that auth flows, graceful degradation, error handling, and access controls work correctly. Real regressions can ship undetected because the tests that claim to cover them don't actually test anything.",
  "repair_guidance": "Replace tautological assertions with real behavioral tests that import and invoke the code under test. For documentation-only test blocks, convert them to code comments, README entries, or architectural decision records (ADRs). For tests blocked on external dependencies (databases, APIs), use proper mocking to make them executable. Delete the test blocks if the behavior they document is already covered by integration tests elsewhere.",
  "example_source": {
    "file": "apps/app/__tests__/settings/settings-workflow.test.ts",
    "line_or_snippet": "it(\"Email template actions do NOT check user role\", () => {\n  // ⚠️ FINDING: Server actions only check auth(), not role\n  expect(true).toBe(true);\n});"
  }
}
```

### Implementation note
Detector should scan all test files (glob: `**/*.test.{ts,tsx,js,jsx}`), count `expect(true).toBe(true)` and equivalent tautological patterns per file, and calculate the ratio of tautological assertions to total assertions. Flag files where the ratio exceeds 30% and where individual test blocks (delimited by `it(` or `it.each(`) contain no non-tautological assertions. Cross-reference with `describe.skip` / `it.skip` / `test.skip` annotations to exclude intentionally disabled tests. Output should include file path, tautological count, total assertion count, and ratio.
---

---
## [2026-05-06 18:15] Rule Discovery — fake_integration.payment_gateway_always_success_placeholder

### Finding
The payment processing system has a fully wired pipeline — auth, rate limiting, input validation, business-rule validation, database mutations, invoice status cascading, refund audit trails — but the critical payment gateway seam (`processPaymentGateway` and `refundPaymentGateway` in `gateway.ts`) is a deterministic always-success placeholder. Every charge always succeeds (`{ success: true, transactionId: "txn_<uuid>" }`), and every refund always succeeds (`{ success: true, refundTransactionId: "re_<uuid>" }`). No money ever moves through a real payment processor.

Meanwhile, a real Stripe client exists in `packages/payments/index.ts` (instantiated with a Stripe secret key), but the gateway module never imports it. The gateway file's own JSDoc describes itself as a "deterministic always-success placeholder" with a "Real-processor swap-in checklist." The route handler that consumes it (`PUT /api/accounting/payments/[id]`) faithfully treats the placeholder's return value as authoritative: it marks the payment COMPLETED, persists the fake `txn_` ID as `gatewayTransactionId`, and cascades `invoice.amountPaid += payment.amount`, potentially flipping the invoice to PAID status — all without any real money being charged.

The refund path is equally dangerous: `POST /api/accounting/payments/[id]` calls `refundPaymentGateway`, which always returns success, then decrements `invoice.amountPaid` and writes a forensic audit row to `paymentRefundAttempt` — recording a fake `re_` transaction ID as if a real processor issued it. A user could process a charge, see the invoice flip to PAID, then refund it — the entire ledger cycle completes with phantom transactions from start to finish.

### Evidence
- File: `apps/api/app/api/accounting/payments/[id]/gateway.ts`
- Snippet (charge placeholder, lines 86-100):
  ```typescript
  export async function processPaymentGateway(
    input: ProcessPaymentInput
  ): Promise<ProcessPaymentResult> {
    // Reference inputs so the placeholder is not flagged as unused; the real
    // call will consume all four.
    void input.paymentId;
    void input.tenantId;
    void input.amount;
    void input.currency;

    return {
      success: true,
      transactionId: `txn_${randomUUID()}`,
    };
  }
  ```
- Snippet (refund placeholder, lines 115-129):
  ```typescript
  export async function refundPaymentGateway(
    input: RefundPaymentInput
  ): Promise<RefundPaymentResult> {
    void input.paymentId;
    void input.tenantId;
    void input.amount;
    void input.currency;
    void input.reason;
    void input.originalGatewayTransactionId;

    return {
      success: true,
      refundTransactionId: `re_${randomUUID()}`,
    };
  }
  ```
- File: `packages/payments/index.ts`
- Snippet (real Stripe client exists but is unused by gateway):
  ```typescript
  import Stripe from "stripe";
  import { keys } from "./keys";

  export const stripe = new Stripe(keys().STRIPE_SECRET_KEY, {
    apiVersion: "2026-01-28.clover",
  });
  ```
- File: `apps/api/app/api/accounting/payments/[id]/route.ts`
- Snippet (route handler treats placeholder as authoritative, lines 156-179):
  ```typescript
  const gatewayResult = await processPaymentGateway({
    paymentId: payment.id,
    tenantId,
    amount: Number(payment.amount),
    currency: payment.currency,
  });

  const isCompleted = gatewayResult.success;

  const updatedPayment = await database.payment.update({
    where: { tenantId_id: { tenantId, id } },
    data: {
      status: isCompleted ? "COMPLETED" : "FAILED",
      processedAt: new Date(),
      completedAt: isCompleted ? new Date() : null,
      gatewayTransactionId: gatewayResult.transactionId,
    },
  });
  ```
- Snippet (invoice cascading on phantom charge, lines 182-215):
  ```typescript
  if (isCompleted && payment.invoiceId) {
    // ...
    await database.invoice.update({
      data: {
        amountPaid: currentAmountPaid + paymentAmount,
        amountDue: currentAmountDue - paymentAmount,
        status: Math.abs(currentAmountDue - paymentAmount) < 0.01
          ? "PAID" : "PARTIALLY_PAID",
      },
    });
  }
  ```

### Why this matters
This is the most financially dangerous finding in the codebase. The entire payment processing pipeline — from the "Process Payment" button in the UI through auth, rate limiting, validation, DB writes, invoice status updates, and refund audit trails — is fully operational. But the gateway seam is a stub that always returns success. No real money ever moves. When a catering operator clicks "Process Payment" on a $5,000 invoice, the system records it as COMPLETED, flips the invoice to PAID, and generates a fake Stripe-like transaction ID (`txn_a1b2c3d4...`) — all without ever calling Stripe. The fake transaction ID would pass casual inspection because it follows the `txn_` prefix convention.

The refund path compounds the problem: a refund always succeeds, decrements invoice amounts, and writes a forensic audit row with a fake `re_` transaction ID. This means the entire charge-refund lifecycle can execute end-to-end with zero real processor interaction. Financial reports, invoice histories, and audit trails would all show activity that never happened on any payment processor. If this system is used in production, the business has no way to reconcile their Stripe dashboard with their internal ledger — because their internal ledger reflects phantom transactions.

### Proposed detector rule
```json
{
  "id": "fake_integration.payment_gateway_always_success_placeholder",
  "title": "Payment/money-moving gateway function is a deterministic always-success placeholder with no real processor call",
  "category": "fake_integration",
  "severity": "critical",
  "confidence": 0.97,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "success: true",
    "transactionId: `txn_",
    "refundTransactionId: `re_",
    "void input\\.",
    "placeholder",
    "deterministic always-success",
    "swap-in checklist",
    "processPaymentGateway|refundPaymentGateway",
    "gatewayTransactionId"
  ],
  "negative_patterns": [
    "stripe\\.paymentIntents\\.create",
    "stripe\\.charges\\.create",
    "stripe\\.refunds\\.create",
    "adyen|authorize\\.net|braintree",
    "describe\\(|it\\(|test\\(",
    "__tests__|\\.test\\.|\\.spec\\.",
    "class.*Mock.*gateway",
    "class.*Stub.*gateway"
  ],
  "evidence_required": [
    "Function named with payment/gateway intent (processPayment, chargePayment, refundPayment, processPaymentGateway, refundPaymentGateway)",
    "Function body contains only void input statements and a hardcoded return { success: true, transactionId } pattern",
    "JSDoc or comments explicitly label the implementation as 'placeholder', 'swap point', or 'deterministic always-success'",
    "A real SDK/client exists in the same codebase (e.g., Stripe, Adyen) but is NOT imported by the gateway function",
    "Route handler or service calls the gateway function and treats its result as authoritative (updating DB records, invoice status, etc.)"
  ],
  "false_positive_controls": [
    "Exclude test files and test doubles (Mock/Stub class names)",
    "Exclude sandbox/demo mode functions that are explicitly gated by environment variable or feature flag",
    "Require the gateway function to NOT import any real processor SDK",
    "Require the calling code to perform real DB mutations based on the gateway result (not just return the result)"
  ],
  "user_impact": "Every payment processed through the system is phantom — no money ever moves on a real processor. Invoices are marked PAID based on fake charges. Refunds are recorded with fake processor IDs. Financial reports, audit trails, and ledger reconciliation are all fiction. If the business relies on this system for accounting, their books are fundamentally incorrect.",
  "repair_guidance": "1. Replace processPaymentGateway body with a real Stripe charge call using the existing packages/payments Stripe client (stripe.paymentIntents.create + confirm). 2. Replace refundPaymentGateway body with stripe.refunds.create. 3. Map processor errors to { success: false, failureReason }. 4. Add idempotency keys using paymentId. 5. Add integration tests that verify real Stripe API calls (using Stripe test mode). 6. Add a runtime check that fails closed if the gateway is still in placeholder mode and the environment is production.",
  "example_source": {
    "file": "apps/api/app/api/accounting/payments/[id]/gateway.ts",
    "line_or_snippet": "export async function processPaymentGateway(input: ProcessPaymentInput): Promise<ProcessPaymentResult> {\n  void input.paymentId;\n  void input.tenantId;\n  void input.amount;\n  void input.currency;\n  return { success: true, transactionId: `txn_${randomUUID()}` };\n}"
  }
}
```

### Implementation note
Detector should identify functions with payment/gateway semantics (processPayment, chargePayment, refundPayment, processPaymentGateway, refundPaymentGateway) whose body consists only of voided input parameters and a hardcoded `{ success: true, transactionId: <generated> }` return. Cross-file validation: (1) check if a real payment processor SDK (Stripe, Adyen, etc.) exists anywhere in the monorepo but is NOT imported by the gateway function, (2) verify that the caller (route handler or service) performs real DB mutations based on the gateway's return value, treating it as authoritative. The combination of a placeholder gateway + real SDK available + downstream DB mutations is the highest-confidence signal. Should also flag JSDoc phrases like "swap-in checklist", "deterministic always-success", or "placeholder implementation" as corroborating evidence. This is distinct from the stub_connector rule because the connector rule focuses on class-based interfaces registered in a registry, while this rule focuses on standalone gateway functions in the money-moving path.
---

---
## [2026-05-06 19:30] Rule Discovery — feature_claim_mismatch.mobile_api_phantom_endpoints

### Finding
The mobile app (`apps/mobile/`) has a complete push notification and settings system that calls three API endpoints — `/api/mobile/push-token`, `/api/mobile/notification-preferences`, and `/api/mobile/app-settings` — none of which exist on the backend. The `apps/api/app/api/mobile/` directory does not exist at all. There are no route files, no proxy/rewrite rules, no database models for push tokens or device registrations, and no Prisma schema entries for mobile-specific settings. The mobile client code calls these endpoints through `apiClient`, which will silently receive HTTP errors (404) that are caught by try/catch blocks and logged to console, giving the user zero feedback that the operations failed. The Settings screen presents a fully interactive UI with toggles for "Push Notifications", five notification type sub-toggles (Task Assignments, Task Completions, Event Reminders, Schedule Changes, Inventory Alerts), plus Haptic Feedback and Auto Refresh toggles — all backed by API calls to phantom endpoints.

### Evidence
- File: `apps/mobile/src/notifications/push-handlers.ts`
- Snippet (push token registration to nonexistent endpoint, lines 67-82):
  ```typescript
  export async function registerPushTokenWithBackend(
    token: string
  ): Promise<boolean> {
    try {
      const authToken = await getAuthToken();
      await apiClient<PushTokenResponse>("/api/mobile/push-token", {
        method: "POST",
        token: authToken ?? undefined,
        body: { pushToken: token },
      });
      return true;
    } catch (error) {
      console.error("Error registering push token:", error);
      return false;
    }
  }
  ```
- Snippet (notification preferences GET to nonexistent endpoint, lines 172-184):
  ```typescript
  export async function getNotificationPreferences(): Promise<NotificationPreferences | null> {
    try {
      const authToken = await getAuthToken();
      const response = await apiClient<{ preferences: NotificationPreferences }>(
        "/api/mobile/notification-preferences",
        { token: authToken ?? undefined }
      );
      return response.preferences;
    } catch (error) {
      console.error("Error getting notification preferences:", error);
      return null;
    }
  }
  ```
- File: `apps/mobile/src/screens/SettingsScreen.tsx`
- Snippet (app settings fetch to nonexistent endpoint, lines 33-42):
  ```typescript
  async function fetchAppSettings(): Promise<AppSettings> {
    const token = await getAuthToken();
    const response = await apiClient<SettingsResponse>(
      "/api/mobile/app-settings",
      {
        token: token ?? undefined,
      }
    );
    return response.settings;
  }
  ```
- File: (nonexistent) `apps/api/app/api/mobile/` — directory does not exist
- No proxy/rewrite rules found mapping `/api/mobile/*` paths
- No Prisma schema models for `pushToken`, `deviceToken`, or mobile-specific settings tables

### Why this matters
Every mobile user who opens the Settings screen and enables push notifications will see a "Push notifications enabled" success alert, but the token is never actually registered with any backend. The five notification type toggles (Task Assignments, Completions, Event Reminders, Schedule Changes, Inventory Alerts) appear interactive but their state changes are silently dropped — preferences are never persisted. The Haptic Feedback and Auto Refresh toggles similarly fail to save. The user has no way to know that none of these settings work because errors are swallowed by catch blocks that only log to console. For a catering/event management app where staff rely on task assignments and schedule change notifications on their mobile devices, this means the entire mobile notification pipeline is non-functional theater.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.mobile_api_phantom_endpoints",
  "title": "Mobile/client calls API endpoints that don't exist on the backend",
  "category": "feature_claim_mismatch",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "tsx", "javascript", "any"],
  "patterns": [
    "apiClient\\([^)]*['\"](/api/[^'\"]+)['\"]",
    "fetch\\([^)]*['\"](/api/[^'\"]+)['\"]",
    "axios\\.[^(]+\\([^)]*['\"](/api/[^'\"]+)['\"]"
  ],
  "negative_patterns": [
    "node_modules",
    "__tests__",
    ".test.",
    ".spec.",
    ".stories.",
    ".mock.",
    "e2e/",
    "storybook/"
  ],
  "evidence_required": [
    "Client code calling /api/<path> endpoint",
    "No matching route.ts file in apps/api/app/api/<path>/",
    "No proxy/rewrite rule mapping the path",
    "No server-side handler file matching the endpoint"
  ],
  "false_positive_controls": [
    "Exclude test files and storybook stories",
    "Allow for dynamic route segments (e.g., [id]) — must check with regex pattern matching",
    "Allow for endpoints handled by middleware or edge functions if verifiable",
    "Check for next.config.js rewrites and API route catch-all patterns"
  ],
  "user_impact": "Users interact with fully rendered, seemingly functional UI controls (toggles, buttons, forms) that appear to save state but silently fail. Settings are never persisted, notifications are never delivered, and the user receives no error feedback — only a misleading success confirmation in some cases.",
  "repair_guidance": "Either (a) implement the missing backend API routes with proper database models for push tokens, notification preferences, and app settings, or (b) remove the non-functional UI from the mobile Settings screen and add a 'Coming Soon' indicator, or (c) at minimum, surface the 404 errors to the user instead of swallowing them in catch blocks.",
  "example_source": {
    "file": "apps/mobile/src/notifications/push-handlers.ts",
    "line_or_snippet": "await apiClient<PushTokenResponse>(\"/api/mobile/push-token\", {\n  method: \"POST\",\n  token: authToken ?? undefined,\n  body: { pushToken: token },\n});"
  }
}
```

### Implementation note
Build a cross-file detector that (1) extracts all API path strings from client code (apiClient, fetch, axios calls), (2) normalizes them into filesystem route patterns (e.g., `/api/mobile/push-token` → `apps/api/app/api/mobile/push-token/route.ts`), (3) checks whether the corresponding route file exists, (4) also checks for rewrite/proxy rules in next.config.js or middleware, and (5) flags paths called from client code with no server-side implementation. The key insight is that the detector works by proving a negative — the absence of a route handler is the signal. Should be configurable per monorepo structure (different apps may use different API route directory conventions). Exclude test files, mocks, and storybook to avoid false positives from test fixtures that intentionally call non-existent endpoints.
---
---
## [2026-05-06 17:00] Rule Discovery — feature_claim_mismatch.ai_branded_arithmetic_only

### Finding
The "AI Staffing Recommendations" page is branded with a Sparkles icon, titled "AI Staffing Recommendations", and subtitled "Get AI-powered staffing recommendations based on event details." However, the backend `/api/staffing/recommendations` contains zero AI/ML logic — it is a pure arithmetic formula: `Math.ceil(guestCount / 18) * serviceMultiplier` with hardcoded hourly rates ($22-$32) and fixed role percentages (10% captains, 45% servers, 15% bartenders, 30% culinary). The `eventType` parameter is accepted from the UI but never used in any computation. The "notes" are template string interpolation with no intelligence. No AI model, no historical data, no learning, no vendor SDK import.

### Evidence
- File: `apps/app/app/(authenticated)/staffing/recommendations/staffing-recommendations-client.tsx`
  - Snippet: `<h1 className="text-3xl font-bold">AI Staffing Recommendations</h1>` (line 77)
  - Snippet: `Get AI-powered staffing recommendations based on event details` (line 79)
  - Snippet: `<Sparkles className="h-5 w-5" />` (line 86)
- File: `apps/api/app/api/staffing/recommendations/route.ts`
  - Snippet: `const baseStaff = Math.max(3, Math.ceil(guestCount / 18));` (line 106)
  - Snippet: `const totalStaff = Math.ceil(baseStaff * serviceMultiplier);` (line 107)
  - Snippet: `const eventType = body.eventType?.trim() || "corporate";` (line 87) — accepted but never used in computation
  - Snippet: `hourlyRate: 32` / `hourlyRate: 24` / `hourlyRate: 26` / `hourlyRate: 22` — hardcoded (lines 43, 49, 56, 62)

### Why this matters
Users are told they are receiving "AI-powered" recommendations, which implies some form of machine learning, historical analysis, or intelligent optimization. In reality, they are getting a deterministic `ceil(N/18)` formula with fixed role splits and hardcoded rates. This misrepresentation could lead to: (1) misplaced trust in recommendations that are actually naive heuristics, (2) users making staffing/budgeting decisions based on what they believe is intelligent analysis when it is just division, (3) the `eventType` parameter creates a false sense of customization — changing from "wedding" to "corporate" changes only the prose text, not the numbers. If the product markets AI capabilities that do not exist, this is also a potential truth-in-advertising issue.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.ai_branded_arithmetic_only",
  "title": "UI claims AI/ML intelligence but backend is pure arithmetic with no model/SDK/historical data",
  "category": "feature_claim_mismatch",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "tsx", "javascript"],
  "patterns": [
    "UI elements containing 'AI' or 'intelligent' or 'smart' in titles/buttons/headers near Sparkles/Brain/Bot icons",
    "Backend route handler for the corresponding API path containing only Math.ceil/Math.floor/Math.round arithmetic without any AI/ML SDK imports (openai, anthropic, @langchain, tensorflow, onnx, etc.)",
    "Accepted request parameters that are never referenced in the computation body"
  ],
  "negative_patterns": [
    "Routes that import AI/ML SDKs (openai, anthropic, @langchain, etc.)",
    "Routes that call external AI services via HTTP",
    "Routes with comments explicitly stating 'heuristic' or 'formula-based' or 'rule-based' where the UI also avoids AI branding",
    "Routes in test fixtures or mock directories"
  ],
  "evidence_required": [
    "Frontend file with AI/intelligence branding (title, subtitle, icon) calling the backend route",
    "Backend route file containing only arithmetic (Math.*, hardcoded rates/percentages, template strings) with no AI SDK imports",
    "At least one request parameter accepted but unused in the computation"
  ],
  "false_positive_controls": [
    "Allow routes that explicitly document their heuristic nature in comments AND avoid AI branding in the UI",
    "Exclude routes that call external AI APIs via HTTP even without SDK imports",
    "Allow 'AI assistant' features that delegate to a separate AI service endpoint (check if the called endpoint itself has real AI)",
    "Check for TODO comments indicating planned AI integration — lower severity but still flag"
  ],
  "user_impact": "Users receive staffing/budgeting recommendations they believe are AI-optimized but are actually naive arithmetic formulas. The eventType parameter is a placebo — changing it alters only prose text, not calculated values. This undermines trust and could lead to suboptimal staffing decisions.",
  "repair_guidance": "Either (a) integrate a real AI/ML model for staffing recommendations (e.g., historical event data, labor cost optimization), (b) rebrand the feature honestly as 'Staffing Calculator' or 'Staffing Estimator' without AI/Sparkles branding, or (c) remove the unused eventType parameter and add a disclaimer that recommendations are formula-based estimates.",
  "example_source": {
    "file": "apps/api/app/api/staffing/recommendations/route.ts",
    "line_or_snippet": "const baseStaff = Math.max(3, Math.ceil(guestCount / 18));\nconst totalStaff = Math.ceil(baseStaff * serviceMultiplier);"
  }
}
```

### Implementation note
Build a cross-file detector that (1) scans UI components for AI/intelligence branding patterns (titles with "AI", Sparkles/Brain/Bot icons, "powered" language), (2) traces the API endpoint each branded component calls, (3) inspects the backend route handler for AI/ML SDK imports (openai, anthropic, @langchain, tensorflow, vertexai, etc.) or external AI service calls, (4) if none found, checks whether the handler is pure arithmetic (Math.*, hardcoded values, template strings), (5) cross-references accepted request parameters against actual usage in computation, and (6) flags cases where the UI claims AI but the backend is deterministic arithmetic with unused parameters. Should also check for heuristic disclaimers that honestly set expectations. The unused parameter check is a strong signal — it shows the interface promises personalization the implementation cannot deliver.
---
---
## [2026-05-06 20:45] Rule Discovery — dashboard_illusion.simulated_gps_tracking_data

### Finding
The logistics "real-time tracking" endpoint fetches real shipment, driver, and vehicle data from the database, but then **fabricates GPS coordinates** using `Math.random()` around hardcoded Los Angeles coordinates. The frontend renders these fake positions on an interactive SVG map with animated pulsing dots for "in transit" deliveries, creating the illusion of live vehicle tracking. No GPS hardware, SDK, or geolocation integration exists anywhere in the codebase.

### Evidence
- File: `apps/api/app/api/logistics/tracking/route.ts`
- Lines: 241-268
- Snippet:
```typescript
// Simulated position based on status and timestamps
// In production, this would come from GPS tracking hardware/SDK
const baseLat = 34.052; // LA default
const baseLng = -118.243;
const jitter = (Math.random() - 0.5) * 0.01;

const position = {
  lat: shipment.status === "delivered"
    ? baseLat + 0.05
    : shipment.status === "in_transit" ? baseLat + jitter : baseLat - 0.02,
  lng: shipment.status === "delivered"
    ? baseLng + 0.03
    : shipment.status === "in_transit" ? baseLng + jitter : baseLng - 0.01,
  heading: shipment.status === "in_transit" ? Math.floor(Math.random() * 360) : 0,
  speed: shipment.status === "in_transit" ? 20 + Math.floor(Math.random() * 20) : 0,
  updatedAt: new Date().toISOString(),
};
```
- Frontend consumer: `apps/app/app/(authenticated)/logistics/tracking/page.tsx` (622 lines)
  - Lines 100-212: `MiniMap` SVG component plots delivery positions on a map grid
  - Lines 162-212: Active deliveries shown with pulsing animation (`<animate>` elements)
  - Map legend labels dots as "In Transit" and "Delivered"
  - No indication anywhere in the UI that positions are simulated

### Why this matters
Users viewing the logistics tracking page see an interactive map with pulsing dots representing delivery vehicles. Every time the page refreshes, dots jump to random positions around LA. This is presented as "real-time tracking" but provides zero actual location intelligence. A catering operations manager might use this to estimate delivery timing, reassure clients, or dispatch decisions — all based on fabricated data. The comment "In production, this would come from GPS tracking hardware/SDK" confirms the team knows this is not real.

### Proper implementation evidence that should exist
- Integration with a GPS/telemetry SDK (e.g., Samsara, Geotab, Fleetio, or a mobile app reporting location)
- Database table or external data store for vehicle position history
- No use of `Math.random()` for position generation
- No "In production" comments acknowledging the simulation
- A fallback/placeholder mode explicitly surfaced in the UI (e.g., "Demo mode — no live GPS connected")

### Proposed detector rule
```json
{
  "id": "dashboard_illusion.simulated_gps_tracking_data",
  "title": "Simulated GPS/location data presented as real-time tracking",
  "category": "dashboard_illusion",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript", "tsx"],
  "patterns": [
    "Math\\.random\\(\\).*\\d+\\.\\d{2,}.*lat|lng|latitude|longitude|coordinates",
    "baseLat|baseLng|base_lat|base_lng.*34\\.05|40\\.71|51\\.50|37\\.77",
    "Simulated position|simulated.*gps|simulated.*location",
    "In production.*GPS.*hardware|In production.*GPS.*SDK",
    "jitter.*Math\\.random"
  ],
  "negative_patterns": [
    "seed|deterministic|test|mock|fixture|__tests__|\\.spec\\.|\\.test\\.",
    "const BASE_LAT.*=.*process\\.env",
    "simulation.*mode.*flag|demo.*mode.*flag"
  ],
  "evidence_required": [
    "Math.random() used to generate lat/lng/heading/speed values",
    "Hardcoded base coordinates (not from env vars or config)",
    "No GPS SDK import or telemetry client initialization",
    "Frontend map component consuming these coordinates without demo-mode disclosure"
  ],
  "false_positive_controls": [
    "Exclude test files and fixtures",
    "Exclude files with explicit demo/simulation mode flags",
    "Exclude game or visualization prototypes explicitly labeled as demos"
  ],
  "user_impact": "Operations staff and clients see fabricated delivery vehicle positions on a map, leading to incorrect ETA estimates, false confidence in delivery status, and potential business decisions based on phantom data.",
  "repair_guidance": "Integrate a real GPS/telemetry provider SDK. Store position history in a time-series or dedicated table. Replace Math.random() position generation with actual device-reported coordinates. Add an explicit demo/fallback mode to the UI when no live GPS is available.",
  "example_source": {
    "file": "apps/api/app/api/logistics/tracking/route.ts",
    "line_or_snippet": "// Simulated position based on status and timestamps\n// In production, this would come from GPS tracking hardware/SDK\nconst baseLat = 34.052; // LA default\nconst baseLng = -118.243;\nconst jitter = (Math.random() - 0.5) * 0.01;"
  }
}
```

### Implementation note
Detector should use regex to find Math.random() used near lat/lng/coordinate variable assignments, combined with a cross-file check for absence of GPS SDK imports (samsara, geotab, fleetio, google-maps, mapbox, etc.) in the same module. The "In production" comment pattern is a strong secondary signal. Frontend check should verify that any map component consuming these coordinates either has a demo-mode disclosure or connects to a real geolocation data source.
---

## [2026-05-06 17:30] Rule Discovery — security_theater.webhook_signature_optional_on_missing_secret

### Finding
The email delivery webhook at `/api/collaboration/notifications/email/webhook` claims in its JSDoc to "Verifies HMAC-SHA256 signature before processing." The code does contain a `verifyResendSignature()` function that correctly implements HMAC-SHA256 with timing-safe comparison and timestamp staleness checks. However, the actual verification is **conditionally skipped**: if the `RESEND_WEBHOOK_SECRET` environment variable is not set, the code silently proceeds to process the webhook payload without any authentication whatsoever. The same pattern exists in the SMS webhook (`/api/collaboration/notifications/sms/webhook`), which has a `handleUnauthenticatedRequest()` function that explicitly processes requests when `TWILIO_AUTH_TOKEN` is missing — effectively providing a graceful fallback to **no security**.

The critical difference: the supplier-catalog webhook (`/api/webhooks/supplier-catalog`) correctly rejects requests with status 500 when the secret is missing. The email and SMS webhooks do the opposite — they silently downgrade security.

### Evidence
- File: `apps/api/app/api/collaboration/notifications/email/webhook/route.ts`
- Snippet (JSDoc claim, lines 1-6):
  ```typescript
  /**
   * POST /api/collaboration/notifications/email/webhook
   *
   * Handle Resend webhook callbacks for email delivery status updates.
   * Verifies HMAC-SHA256 signature before processing.
   */
  ```
- Snippet (conditional verification bypass, lines 98-104):
  ```typescript
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (
    webhookSecret &&
    !verifyResendSignature(rawBody, signatureHeader, webhookSecret)
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  ```
- File: `apps/api/app/api/collaboration/notifications/sms/webhook/route.ts`
- Snippet (SMS unauthenticated fallback, lines 117-119, 168-196):
  ```typescript
  if (!authToken) {
    return handleUnauthenticatedRequest(request);
  }
  // ...
  async function handleUnauthenticatedRequest(request: NextRequest): Promise<NextResponse> {
    // Processes the full request without any authentication
  }
  ```

### Why this matters
A webhook endpoint that accepts delivery status updates from an email provider is a high-value target for spoofing. An attacker who discovers the endpoint URL can forge `email.bounced` or `email.delivered` events, causing the system to incorrectly mark emails as bounced (potentially triggering suppression lists and blocking legitimate communications) or as delivered (hiding actual delivery failures from the operations team). The JSDoc's claim of verification creates a false sense of security — a developer or auditor reading the comments would assume the endpoint is protected, but any deploy that forgets to set the env var silently opens the endpoint to the public internet. This is textbook security theater: the appearance of a security control (HMAC verification function exists, JSDoc claims it's used) without the guarantee that it's always enforced.

### Proposed detector rule
```json
{
  "id": "security_theater.webhook_signature_optional_on_missing_secret",
  "title": "Webhook signature verification is conditionally skipped when secret env var is missing",
  "category": "security_theater",
  "severity": "critical",
  "confidence": 0.95,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "env.*WEBHOOK_SECRET.*&&",
    "if\\s*\\(\\s*\\w+\\s*&&\\s*!verify",
    "handleUnauthenticatedRequest",
    "webhookSecret.*&&.*!verify"
  ],
  "negative_patterns": [
    "!webhookSecret.*return.*401",
    "!webhookSecret.*return.*503",
    "!secret.*reject",
    "return NextResponse.*Unauthorized.*status.*401.*missing"
  ],
  "evidence_required": [
    "JSDoc or comment claiming signature verification",
    "Conditional check where env var presence gates verification",
    "Code path that proceeds to process payload when secret is absent",
    "Absence of rejection response (401/503) when secret is missing"
  ],
  "false_positive_controls": [
    "Exclude routes that return 401/503 when secret is missing (correct behavior)",
    "Exclude test files and mock implementations",
    "Exclude health-check GET handlers that don't need verification"
  ],
  "user_impact": "An attacker can forge webhook payloads to manipulate delivery status records, suppress legitimate emails, or hide delivery failures from the operations team. The false JSDoc claim means auditors and developers may believe the endpoint is secure when it is not.",
  "repair_guidance": "All webhook handlers must use fail-closed authentication: if the signature secret is not configured, the endpoint must reject all requests with 503 (misconfigured) or 401, never fall through to process unauthenticated payloads. Remove any handleUnauthenticatedRequest fallback functions. Add integration tests that verify rejection when env vars are unset.",
  "example_source": {
    "file": "apps/api/app/api/collaboration/notifications/email/webhook/route.ts",
    "line_or_snippet": "const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;\n  if (\n    webhookSecret &&\n    !verifyResendSignature(rawBody, signatureHeader, webhookSecret)\n  ) {\n    return NextResponse.json({ error: \"Invalid signature\" }, { status: 401 });\n  }"
  }
}
```

### Implementation note
Detector should use regex to find webhook route files containing HMAC/signature verification functions, then check for conditional patterns where `process.env.*SECRET` is used as a boolean gate before calling the verification function. Cross-reference with JSDoc claims of verification. Flag cases where the code path on missing secret does NOT return a rejection status (401/503) but instead proceeds to process the request. Compare against the correct pattern used in supplier-catalog webhook (returns 500 on missing secret) as the positive example.
---
# SlopScope rule discovery (continued)
---
## [2026-05-07 16:15] Rule Discovery — feature_claim_mismatch.recipient_filter_config_shape_mismatch

### Finding
The `filterRecipients` function in the email workflow trigger service declares a `RecipientConfig` interface with 7 fields (`includeRoles`, `excludeRoles`, `includeEmployeeIds`, `excludeEmployeeIds`, `notifyClient`, `notifyAssignedUser`, `notifyManager`) but only reads 2 of them (`excludeEmployeeIds`, `includeEmployeeIds`). The remaining 5 fields — including all role-based and role-notify fields — are never referenced in the filter logic.

Meanwhile, the frontend stores `recipientConfig` using a completely different shape: `{ type: "client" }` or `{ type: "custom", emails: [...] }`. This shape has zero overlap with any field in the `RecipientConfig` interface. The `type` field itself is never read by any backend code.

The net effect: the `filterRecipients` function is always a no-op. It receives a config object containing `{ type: "client" }`, checks for `excludeEmployeeIds` and `includeEmployeeIds` (neither exists), and returns all recipients unchanged. This means:
- A workflow configured to notify "client only" will email every recipient in the caller's list, including employees.
- A workflow configured with "custom" email addresses stores those addresses but never extracts or uses them.
- The `includeRoles`, `excludeRoles`, `notifyClient`, `notifyAssignedUser`, `notifyManager` config fields are dead code — declared in the interface but never implemented.
- The `_entity` parameter in `triggerEmailWorkflows` is destructured but unused, meaning the entity context (event ID, task ID, etc.) is discarded rather than used for recipient resolution.

### Evidence
- File: `packages/notifications/email-workflow-triggers.ts`
- Snippet (RecipientConfig interface, lines 142-150):
```typescript
interface RecipientConfig {
  includeRoles?: string[];
  excludeRoles?: string[];
  includeEmployeeIds?: string[];
  excludeEmployeeIds?: string[];
  notifyClient?: boolean;
  notifyAssignedUser?: boolean;
  notifyManager?: boolean;
}
```
- Snippet (filterRecipients implementation, lines 155-184):
```typescript
function filterRecipients(
  recipients: EmailRecipient[],
  config: RecipientConfig
): EmailRecipient[] {
  if (!config || Object.keys(config).length === 0) {
    return recipients;
  }

  return recipients.filter((recipient) => {
    // Check exclude lists first
    if (
      config.excludeEmployeeIds &&
      recipient.employeeId &&
      config.excludeEmployeeIds.includes(recipient.employeeId)
    ) {
      return false;
    }

    // Check include lists (if specified, only include matching)
    if (
      config.includeEmployeeIds &&
      recipient.employeeId &&
      !config.includeEmployeeIds.includes(recipient.employeeId)
    ) {
      return false;
    }

    return true;
  });
}
```
- File: `apps/app/app/(authenticated)/settings/email-workflows/new/page.tsx` (line 76)
- Snippet (UI stores different shape):
```typescript
const recipientConfig = {
  type: recipientType,
  ...(recipientType === "custom" && {
    emails: customEmails.split(",").map((e) => e.trim()).filter(Boolean),
  }),
};
```
- File: `packages/notifications/email-workflow-triggers.ts` (line 49)
- Snippet (entity parameter unused):
```typescript
const {
  tenantId,
  triggerType,
  entity: _entity,
  templateData,
  recipients,
} = context;
```

### Why this matters
Users configure email workflows with recipient types ("client", "employee", "custom") expecting the system to route emails accordingly. In practice, the configured recipient type is stored in the database but never consumed by the filter logic. Every workflow sends to every recipient in the caller's list regardless of configuration. For example, a "contract signed" workflow configured to notify only the client will also email staff if the cron caller passes employee recipients. This is a silent misdelivery — no error is thrown, the UI shows success, but the recipient targeting is completely ignored. The 5 unimplemented interface fields (includeRoles, excludeRoles, notifyClient, notifyAssignedUser, notifyManager) represent promised-but-undelivered functionality that users may rely on when configuring workflows.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.recipient_filter_config_shape_mismatch",
  "title": "Recipient filter config interface declares fields that filter implementation never reads",
  "category": "feature_claim_mismatch",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "TypeScript interface with 3+ optional fields where only a subset are referenced in the same file's filter/map/reduce logic",
    "filter function parameter typed as config interface but only reads 1-2 of its declared fields",
    "frontend stores { type: ... } config object that backend casts to unrelated interface shape",
    "underscore-prefixed destructured parameter (_entity) in function that consumes entity-adjacent data"
  ],
  "negative_patterns": [
    "Config interfaces where all fields are consumed by at least one code path in the file",
    "Config objects used as pass-through to external libraries (e.g., ORM options, SDK configs)",
    "Partial config patterns where unused fields are intentionally optional for forward compatibility"
  ],
  "evidence_required": [
    "Interface definition with >=3 optional fields in same file as filter function",
    "Filter function body that references <=50% of interface fields",
    "Frontend config write shape that has zero field overlap with backend interface",
    "Caller code that passes recipients alongside config (proving filter should have routed)"
  ],
  "false_positive_controls": [
    "Exclude config interfaces used as ORM/SDK pass-through options",
    "Exclude interfaces where all fields are consumed across multiple functions in the same module",
    "Exclude config shapes where unused fields are documented as reserved/planned",
    "Require >=3 unused fields to flag (avoids flagging genuinely partial configs)"
  ],
  "user_impact": "Email workflow recipient targeting silently ignored. Users who configure workflows to notify specific roles or recipient types get emails sent to all recipients instead. No error shown to user — the UI reports success. Could cause misdelivery of contract, billing, or task notifications to wrong recipients.",
  "repair_guidance": "Align the RecipientConfig interface with the actual UI shape ({ type, emails }) OR implement the missing filter logic for includeRoles, excludeRoles, notifyClient, notifyAssignedUser, notifyManager. The filterRecipients function should use config.type to decide routing: 'client' should filter to non-employee recipients, 'custom' should extract and use the emails array, 'employee' should pass through employee recipients. Remove or implement the unused _entity parameter for entity-aware recipient resolution.",
  "example_source": {
    "file": "packages/notifications/email-workflow-triggers.ts",
    "line_or_snippet": "interface RecipientConfig { includeRoles?: string[]; excludeRoles?: string[]; ... } — filterRecipients only reads excludeEmployeeIds/includeEmployeeIds"
  }
}
```

### Implementation note
Build a hybrid detector that: (1) finds TypeScript interfaces with >=3 optional fields, (2) locates filter/map functions in the same file that accept parameters typed as that interface, (3) counts how many interface fields are actually referenced in the function body, (4) flags when <=50% of fields are used, (5) cross-references with frontend config write shapes to detect shape mismatches. The underscore-prefixed parameter check is a secondary signal.

---
## [2026-05-06 20:44] Rule Discovery — automation_theater.automation_engine_never_wired_to_events

### Finding
The SMS automation subsystem has a fully implemented engine (`sms-automation-engine.ts`) and 9 trigger functions (`sms-automation-triggers.ts`) that can evaluate rules and send real SMS messages via Twilio. However, these trigger functions are never imported or called from any production code in `apps/`, and they are not re-exported from the package's `index.ts`. Users can create and manage automation rules through the CRUD API, but those rules will never fire because no business event handler invokes the trigger functions. The file header literally says "Import and call these functions from the relevant business logic handlers" — but nobody did.

### Evidence
- File: `packages/notifications/sms-automation-triggers.ts` (line 6)
- Snippet: `* Import and call these functions from the relevant business logic handlers.`
- File: `packages/notifications/index.ts` (lines 59-84)
- Snippet: SMS re-exports exist for `sms`, `sms-notification-service`, `sms-templates` — but `sms-automation-engine` and `sms-automation-triggers` are **not** re-exported
- File: `apps/api/app/api/communications/sms/automation-rules/route.ts`
- Snippet: Full CRUD for `sms_automation_rules` table — users can create, read, update, delete rules
- Cross-reference: searching `apps/` for any import of the trigger functions returns **0 results**

### Why this matters
Users can configure SMS automation rules through the UI (CRUD API is live), set trigger types like "task_assigned", "shift_reminder", "inventory_low", and believe these rules will automatically send SMS messages when those events occur. In reality, the rules are stored in the database but never evaluated — the trigger functions exist but are disconnected from all business event handlers. This is a silent failure: no errors, no warnings, the UI shows rules as "active", but they never fire. Users could be relying on automated SMS notifications that simply don't work.

### Proposed detector rule
```json
{
  "id": "automation_theater.automation_engine_never_wired_to_events",
  "title": "Automation engine and trigger functions exist but are never called from production code",
  "category": "automation_theater",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "export.*function.*trigger.*(?:Sms|Email|Notification|Webhook)",
    "export.*function.*evaluateAndExecute",
    "Import and call these functions from",
    "Integration points for triggering"
  ],
  "negative_patterns": [
    "from \"[\"']\\.\\/(?:sms-automation-engine|email-workflow-engine)[\"']",
    "jest\\.mock|vitest\\.mock",
    "__tests__|\\.test\\.|\\.spec\\."
  ],
  "evidence_required": [
    "Package file exporting trigger/engine functions (not in test files)",
    "CRUD API routes for the corresponding rules table in apps/",
    "Zero imports of the trigger functions from apps/ directory",
    "Trigger functions not re-exported from package index.ts"
  ],
  "false_positive_controls": [
    "Exclude test files and mock directories",
    "Exclude files where the trigger functions are only referenced in their own definitions",
    "Require evidence of a CRUD API for the rules table to confirm user-facing exposure",
    "Skip if the trigger functions are called from within the same package (internal wiring is sufficient)"
  ],
  "user_impact": "Users configure automation rules believing they will fire automatically. Rules sit dormant in the database, never evaluated, never sending notifications. Silent operational failure with no error surface.",
  "repair_guidance": "Wire the trigger functions into the relevant business event handlers. For SMS: import and call triggerTaskAssignedSms from task assignment handlers, triggerShiftAssignedSms from shift scheduling logic, etc. Re-export the trigger functions from the package index. Add a startup check that warns if trigger functions are exported but never imported.",
  "example_source": {
    "file": "packages/notifications/sms-automation-triggers.ts",
    "line_or_snippet": " * Import and call these functions from the relevant business logic handlers."
  }
}
```

### Implementation note
Build a cross-file detector that: (1) scans packages for files containing exported trigger/engine functions (pattern: `export.*function.*trigger.*` with automation-related names), (2) checks if those functions are imported anywhere in `apps/` or from the package index, (3) cross-references with CRUD API routes for the corresponding rules/config table to confirm the feature is user-facing, (4) flags when a user-facing CRUD exists for rules that have a well-implemented engine with zero production callers. The comment "Import and call these functions" is a strong signal — it indicates intentional wiring was planned but never completed.

---
## [2026-05-07 17:30] Rule Discovery — security_theater.authenticated_route_trusts_untrusted_input_for_resource_id

### Finding
The `/api/user-preferences` route authenticates the caller via Clerk `auth()` but then reads `userId` from a query parameter instead of from the session. Both GET and POST handlers accept any `userId` value, allowing any authenticated user to read or write preferences for any other user in the same tenant. The code contains an explicit admission: "For now, we'll pass it via query param for testing." This is an IDOR vulnerability masked by the presence of an authentication check.

### Evidence
- File: `apps/api/app/api/user-preferences/route.ts`
- Snippet (GET handler, line 26-28):
  ```typescript
  // Get user ID from session (this would typically come from Clerk session)
  // For now, we'll pass it via query param for testing
  const userId = searchParams.get("userId");
  ```
- Snippet (POST handler, line 101-102):
  ```typescript
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  ```
- The `auth()` call at lines 13 and 81 extracts `orgId` but `userId` from the session (available as `auth().userId`) is never used.

### Why this matters
Any authenticated user in a tenant can impersonate any other user by supplying their `userId` as a query parameter. This lets them read another user's preferences (potentially sensitive settings) or overwrite them. The authentication check creates a false sense of security — the route looks properly guarded at a glance, but the authorization boundary is completely absent. In a multi-tenant app where preferences might include notification settings, theme choices, or access-level hints, this is a real data integrity and privacy risk.

### Proposed detector rule
```json
{
  "id": "security_theater.authenticated_route_trusts_untrusted_input_for_resource_id",
  "title": "Authenticated route reads resource-scoping ID from untrusted input instead of session",
  "category": "security_theater",
  "severity": "critical",
  "confidence": 0.95,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "tsx"],
  "patterns": [
    "await auth()",
    "searchParams.get(\"userId\")",
    "searchParams.get('userId')",
    "body.userId",
    "For now.*query param",
    "for testing",
    "for now.*pass.*via.*query"
  ],
  "negative_patterns": [
    "auth().userId",
    "ctx.userId",
    "session.userId",
    "clerkAuth.userId",
    "WHERE.*user_id.*=.*auth"
  ],
  "evidence_required": [
    "Route file calls auth() or equivalent authentication function",
    "Same route reads a user-scoping identifier (userId, employeeId, etc.) from request.body or URL searchParams",
    "The identifier from the session (e.g. auth().userId) is not used for scoping the database query",
    "Comment or code admits temporary nature (for testing, for now, placeholder)"
  ],
  "false_positive_controls": [
    "Exclude routes that explicitly compare the query/body userId against auth().userId",
    "Exclude admin-only routes that legitimately accept a target userId parameter with admin role checks",
    "Exclude routes where the resource is not user-scoped (e.g. listing all users)"
  ],
  "user_impact": "Any authenticated user can read or modify another user's data by supplying their ID as a parameter. Preferences, settings, and potentially sensitive data are exposed. The presence of the auth() check makes this invisible to casual code review.",
  "repair_guidance": "Extract userId from the auth session (e.g., auth().userId) instead of accepting it from query params or request body. If the route must support admin actions on other users, add explicit role/permission checks and use a separate admin endpoint pattern. Remove the query param userId path entirely for non-admin endpoints.",
  "example_source": {
    "file": "apps/api/app/api/user-preferences/route.ts",
    "line_or_snippet": "// Get user ID from session (this would typically come from Clerk session)\n// For now, we'll pass it via query param for testing\nconst userId = searchParams.get(\"userId\");"
  }
}
```

### Implementation note
Build a hybrid detector that: (1) identifies route files that call `auth()` or similar session-based authentication, (2) scans the same file for patterns where a user-scoping identifier is read from `searchParams`, `request.body`, or `request.json()` rather than from the auth result, (3) checks that the session-provided userId is not subsequently used to scope the query, (4) flags with higher confidence when a "for now" / "for testing" / "placeholder" comment appears near the untrusted input read. The detector should cross-reference with auth library exports to know what fields are available from the session.
---
## [2026-05-07 17:45] Rule Discovery — automation_theater.outbound_webhooks_never_auto_dispatched

### Finding
The codebase has a fully built outbound webhook system — CRUD management API, a trigger endpoint, delivery logging, retry with exponential backoff, DLQ, auto-disable on consecutive failures, and a cron-based retry worker — but no domain logic automatically dispatches webhooks when entity events occur. The `/api/integrations/webhooks/trigger` endpoint exists as a manual POST, but it is never called by any domain handler (event creation, task update, contract deletion, etc.). The only consumer of `sendWebhook` in production code is the DLQ retry route. Users can configure webhooks for 12 entity types (event, task, kitchen_task, prep_task, employee, client, proposal, contract, shipment, inventory_item, purchase_order, plus generic), but those webhooks will never fire unless someone manually POSTs to the trigger endpoint. The entire delivery infrastructure (delivery logs, retry scheduling, DLQ, auto-disable) is dead code in practice.

### Evidence
- File: `apps/api/app/api/integrations/webhooks/trigger/route.ts`
- Snippet (the trigger route — fully implemented but never called by domain logic):
```typescript
// apps/api/app/api/integrations/webhooks/trigger/route.ts
// POST /api/integrations/webhooks/trigger - Trigger webhooks for an entity event
// This endpoint is fully functional but no domain handler imports or calls it.
```
- File: `packages/notifications/outbound-webhook-service.ts`
- Snippet (service exports never consumed by domain logic):
```typescript
export function shouldTriggerWebhook(...) { ... }
export function buildWebhookPayload(...) { ... }
// These are exported from @repo/notifications but only imported by:
//   1. The manual trigger route (apps/api/app/api/integrations/webhooks/trigger/route.ts)
//   2. The DLQ retry route (apps/api/app/api/integrations/webhooks/dlq/[id]/retry/route.ts)
//   3. The cron retry worker (apps/api/app/api/cron/webhook-retry/route.ts)
// Zero domain event handlers (event creation, task mutation, contract signing, etc.) import these.
```
- Cross-file evidence: `sendWebhook` is only imported in 2 files:
  - `apps/api/app/api/integrations/webhooks/dlq/[id]/retry/route.ts` (manual DLQ retry)
  - `apps/api/app/api/cron/webhook-retry/route.ts` (scheduled retry worker)
  - NOT imported by any CRUD route that creates/updates/deletes domain entities

### Why this matters
Users (or operators via the dev console) configure outbound webhooks expecting them to fire automatically when entities change. The UI presents a full management interface with entity type filters, event type filters, retry settings, delivery logs, and a DLQ. But none of this infrastructure ever activates because the bridge between domain events and webhook dispatch was never wired. This is automation theater: the system looks fully functional from the outside but does nothing in practice. Every webhook configured is silently ignored.

### Proposed detector rule
```json
{
  "id": "automation_theater.outbound_webhooks_never_auto_dispatched",
  "title": "Outbound webhook dispatch infrastructure exists but no domain logic triggers it",
  "category": "automation_theater",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "export function (sendWebhook|buildWebhookPayload|shouldTriggerWebhook|triggerWebhooks)",
    "webhookDeliveryLog.create",
    "outboundWebhook.findMany"
  ],
  "negative_patterns": [
    "test files",
    "node_modules",
    "generated clients"
  ],
  "evidence_required": [
    "Outbound webhook CRUD API routes exist",
    "Trigger/dispatch functions are exported from a shared package",
    "Cron retry worker exists for failed deliveries",
    "No domain event handler (entity create/update/delete routes) imports the trigger/dispatch functions"
  ],
  "false_positive_controls": [
    "Exclude test files that import webhook functions for testing",
    "Exclude the trigger route itself and the retry worker — only check domain handlers",
    "Allow if a middleware or event bus imports the trigger function"
  ],
  "user_impact": "Webhooks configured by users never fire. Integrations with external systems silently fail. Users may believe their integrations are working because the CRUD succeeds and delivery logs exist for manual triggers.",
  "repair_guidance": "Wire domain event handlers (entity create/update/delete routes) to call the webhook dispatch service automatically. Options: (1) add a shared `dispatchEntityWebhooks(tenantId, eventType, entityType, entityId, data)` call after each mutation, (2) implement an event emitter/observer pattern that triggers webhook dispatch, or (3) use Prisma middleware/hooks on the OutboundWebhook-related entity models.",
  "example_source": {
    "file": "apps/api/app/api/integrations/webhooks/trigger/route.ts",
    "line_or_snippet": "POST /api/integrations/webhooks/trigger - Trigger webhooks for an entity event (fully implemented, never called by domain logic)"
  }
}
```

### Implementation note
Build a cross-file detector that identifies exported webhook dispatch functions from shared packages, finds all domain mutation routes (POST/PUT/PATCH/DELETE handlers for entity types listed in VALID_ENTITY_TYPES), and verifies at least one domain handler imports and calls the dispatch function. Flag when the dispatch infrastructure is complete (CRUD + retry + DLQ) but zero domain handlers trigger it.
---
---
## [2026-05-06 18:25] Rule Discovery — feature_claim_mismatch.predictive_analytics_is_flat_arithmetic

### Finding
The "Predictive LTV" analytics component displays a card titled "Predictive LTV" with a "Model confidence: X%" metric, but the backend `calculatePredictiveLTV` function is entirely deterministic arithmetic — no model, no regression, no ML SDK, no historical time-series projection. The "predicted" values are just historical averages multiplied by flat constants (e.g., `avgLTV * (1 + avgOrderCount - 1) * 0.15`), and "confidence" is a hardcoded tier lookup based on sample size (`>= 20 clients → 85%`).

### Evidence
- File: `apps/app/app/(authenticated)/analytics/clients/actions/get-client-ltv.ts`
- Snippet (line 384): `const predictedLTV = avgLTV * (1 + Math.max(0, avgOrderCount - 1) * 0.15);`
- Snippet (line 391): `growthRate: avgOrderValue * 0.15,`
- Snippet (lines 396-404): Confidence hardcoded to 85/70/50/30 based on client count thresholds
- Snippet (line 412): Fallback `avgHistoricalLTV * 1.2` — "prediction" is literally historical + 20%
- File: `apps/app/app/(authenticated)/analytics/clients/components/predictive-ltv.tsx` (line 70-73): UI card displays "Predictive LTV" with "Model confidence: {data.confidence}%"
- File: `apps/app/app/(authenticated)/analytics/clients/page.tsx` (line 16): Page summary advertises "predictive modeling"

### Why this matters
Users see "Predictive LTV" with "Model confidence: 85%" and assume an ML model is generating forecasts. In reality, the "prediction" is `historicalLTV × 1.15` and the "confidence" is a made-up number from a lookup table. Business decisions about client retention, marketing spend, or resource allocation based on these numbers are grounded in nothing. This is implementation theater dressed up as data science.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.predictive_analytics_is_flat_arithmetic",
  "title": "Analytics UI branded as predictive/ML but backend is flat arithmetic with fabricated confidence scores",
  "category": "feature_claim_mismatch",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "tsx"],
  "patterns": [
    "UI components or page metadata containing 'predictive' or 'Predictive' in title/description",
    "Backend functions named calculatePredictive* or predict* that contain no ML/AI SDK imports",
    "Hardcoded confidence tiers (e.g., if/else chain assigning 85, 70, 50, 30 to a confidence variable)",
    "Flat multipliers on historical averages presented as 'predicted' values (e.g., avgLTV * 1.15)"
  ],
  "negative_patterns": [
    "Files importing AI/ML SDKs (openai, @tensorflow, @xenova, etc.)",
    "Functions calling external model endpoints",
    "Statistical functions using regression, ARIMA, or time-series libraries",
    "Files with 'demo' or 'mock' in the name"
  ],
  "evidence_required": [
    "UI component or page copy uses 'predictive' or 'Model confidence' language",
    "Backend data source function exists (server action or API route)",
    "Data source function contains no ML SDK import or model API call",
    "Confidence value is assigned via hardcoded if/else tiers rather than statistical calculation",
    "Predicted values are derived purely from historical averages with flat multipliers"
  ],
  "false_positive_controls": [
    "Exclude files that import any AI/ML library or call external model APIs",
    "Exclude functions that use regression libraries (simple-statistics, regression-js, etc.)",
    "Only flag when UI branding explicitly says 'predictive' or 'model confidence'",
    "Allow genuine statistical calculations (standard deviation, confidence intervals from actual distributions)"
  ],
  "user_impact": "Users trust 'predicted' LTV figures and 'model confidence' percentages to make business decisions about client retention and marketing spend. Since these are fabricated from flat arithmetic, any decision based on them is no better than guessing. The 85% confidence figure is particularly misleading — it implies statistical rigor that does not exist.",
  "repair_guidance": "Either (1) replace the arithmetic with a real predictive model (e.g., BG/NBD, Pareto/NBD for CLV, or an ML regression trained on historical order data), or (2) rebrand the UI honestly as 'Historical LTV Trends' with 'data coverage' instead of 'model confidence', removing all predictive/ML language. If option 2, the flat multiplier should be documented as a planning heuristic, not a prediction.",
  "example_source": {
    "file": "apps/app/app/(authenticated)/analytics/clients/actions/get-client-ltv.ts",
    "line_or_snippet": "const predictedLTV = avgLTV * (1 + Math.max(0, avgOrderCount - 1) * 0.15);\nconfidence = 85; // when clientData.length >= 20"
  }
}
```

### Implementation note
Build a hybrid detector that scans for UI components/pages containing "predictive" or "model confidence" in titles/descriptions, traces their data sources to server actions or API routes, and checks whether the source function uses any ML/AI SDK or statistical library. Flag when the branding implies prediction but the implementation is pure arithmetic with hardcoded confidence tiers. Cross-reference with the presence of any `import` from AI/ML packages to reduce false positives.
---
## [2026-05-06 21:41] Rule Discovery — automation_theater.audit_log_table_has_read_infrastructure_but_no_writers

### Finding
The `audit_log` table (platform schema) has comprehensive read infrastructure — a full GET endpoint at `/api/settings/audit-log` with filtering by action type, table name, and user; pagination; user name/email resolution; and distinct table name enumeration — plus a complete UI page (`settings/audit-log/audit-log-client.tsx`) with filtering, pagination, and detail dialogs. However, the table has essentially no writers in the entire codebase. The only write is a single raw SQL INSERT in the public proposal response route (`apps/api/app/api/public/proposals/[token]/respond/route.ts`). No Prisma middleware, no PostgreSQL triggers, and no application-level audit utility exist to populate the table from domain operations.

Two related audit tables are even more disconnected: `audit_config` (core schema, models per-table audit levels and excluded columns) and `admin_audit_trail` (tenant_admin schema, for admin action auditing) have zero references in any TypeScript code — not even test files. The Prisma client (`packages/database/index.ts`) is a plain `PrismaClient` with no `$use` middleware or audit extensions. The only extension (`packages/database/tenant.ts`) handles tenant scoping, not auditing.

### Evidence
- File: `apps/api/app/api/settings/audit-log/route.ts` (lines 62-69)
- Snippet (full read infrastructure):
```typescript
const [logs, total] = await Promise.all([
  database.audit_log.findMany({
    where,
    orderBy: { created_at: "desc" },
    take: limit,
    skip,
  }),
  database.audit_log.count({ where }),
]);
```
- File: `apps/app/app/(authenticated)/settings/audit-log/audit-log-client.tsx` (line 217)
- Snippet (full UI page):
```typescript
export function AuditLogClient() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
```
- File: `packages/database/prisma/schema.prisma` (lines 2741-2748, 2856-2873, 2940-2958)
- Snippet (three audit-related models, zero application code writers):
```prisma
model audit_config {
  table_schema     String
  table_name       String
  audit_level      String   @default("full")
  excluded_columns String[]
  @@id([table_schema, table_name])
  @@schema("core")
}
```
- File: `packages/database/index.ts` (line 41) — Prisma client is plain, no audit middleware
- Snippet: `export const database = globalForPrisma.prisma || new PrismaClient({ adapter });`
- Cross-reference: searching entire codebase for `audit_log.create` returns **0 results** in production code
- Cross-reference: searching entire codebase for `audit_config` or `admin_audit_trail` returns **0 results** in TypeScript code
- Cross-reference: the only audit_log write is a raw SQL INSERT at `apps/api/app/api/public/proposals/[token]/respond/route.ts:123`

### Why this matters
The audit log viewer page in Settings presents itself as a comprehensive activity log — users can filter by action type (insert/update/delete), table name, and user. The UI is polished with pagination, user name resolution, and a detail dialog. But the table behind it is essentially empty for all operations except public proposal accept/reject events. This means: (1) there is no record of who changed what, when, or from where for any business operation — employee edits, inventory mutations, contract updates, payment processing, kitchen overrides, etc. are all invisible. (2) If a compliance audit, security incident, or data corruption event occurs, the audit log will be blank. (3) The `audit_config` table implies configurable per-table audit levels were planned, but nothing reads or writes the config. (4) The `admin_audit_trail` table exists for admin actions but is never populated. The entire audit infrastructure is read-only theater.

### Proposed detector rule
```json
{
  "id": "automation_theater.audit_log_table_has_read_infrastructure_but_no_writers",
  "title": "Audit/log table has full read API and UI but no production writers",
  "category": "automation_theater",
  "severity": "critical",
  "confidence": 0.97,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "prisma", "sql"],
  "patterns": [
    "Prisma model named audit_log, admin_audit_trail, or audit_config with findMany/count in API routes",
    "Full GET endpoint reading from audit table with filtering, pagination, user resolution",
    "UI page or component for viewing audit entries with search/filter functionality",
    "Zero .create calls to the audit table in production code (excluding test mocks)",
    "No Prisma middleware or $extends that writes audit entries on mutations",
    "No PostgreSQL trigger definitions for audit population in migration files"
  ],
  "negative_patterns": [
    "Prisma $use middleware that writes to audit tables on $allOperations",
    "pgAudit or trigger-based audit functions in migrations that reference the audit table",
    "Audit writer utility functions that are imported by route handlers or services",
    "Test-only mock writes (vi.mock, jest.mock)"
  ],
  "evidence_required": [
    "Prisma model for audit/log table exists in schema.prisma",
    "API route or server action reads from the audit table (findMany, $queryRaw SELECT)",
    "Frontend component exists for displaying audit entries",
    "Zero production code paths write to the audit table (no .create, no $executeRaw INSERT, no middleware)",
    "No PostgreSQL trigger or function populates the audit table"
  ],
  "false_positive_controls": [
    "Exclude audit tables where Prisma middleware ($use) or $extends writes entries",
    "Exclude tables populated by PostgreSQL triggers (check CREATE TRIGGER ... AFTER INSERT/UPDATE/DELETE)",
    "Exclude tables where a utility function exists that is imported by >=2 route handlers",
    "Only flag when a reader UI/API exists alongside zero writers (don't flag write-only audit tables)"
  ],
  "user_impact": "Users see a fully functional audit log viewer in Settings, implying all system changes are tracked. In reality, the table is empty for virtually all operations. During a security incident, compliance audit, or data corruption investigation, the audit log provides no evidence. Admins may trust the audit log for accountability or forensics when it contains nothing useful.",
  "repair_guidance": "Implement audit writing via one of: (1) Prisma middleware ($use on $allOperations) that intercepts create/update/delete operations and writes audit entries with old/new values, user context from auth(), and request metadata; (2) PostgreSQL triggers with audit functions (CREATE OR REPLACE FUNCTION audit_trigger_func) that auto-populate the audit_log table on INSERT/UPDATE/DELETE for configured tables; (3) An application-level audit utility (e.g., writeAuditEntry) that route handlers call after mutations. The audit_config table should drive which tables are audited and at what level (full, changes-only, metadata-only). Remove admin_audit_trail if it will never be used, or wire it into admin-only mutation routes.",
  "example_source": {
    "file": "apps/api/app/api/settings/audit-log/route.ts",
    "line_or_snippet": "database.audit_log.findMany({ where, orderBy: { created_at: 'desc' }, take: limit, skip }) — full read infrastructure, zero production writers"
  }
}
```

### Implementation note
Build a cross-file detector that: (1) identifies Prisma models with audit-related names (audit_log, audit_trail, activity_log, change_log, admin_audit_trail), (2) checks for reader infrastructure (API routes with findMany/count on the model, UI components that fetch and display entries), (3) searches the entire codebase for writer patterns (.create, $executeRaw INSERT INTO, Prisma $use middleware, PostgreSQL CREATE TRIGGER referencing the table), (4) flags when reader infrastructure exists but writer count is zero or the only writer is a single isolated route. The detector should also check for sibling audit configuration tables (audit_config) that have zero code references, indicating planned-but-unimplemented audit infrastructure.
---
---
## [2026-05-07 18:30] Rule Discovery — fake_integration.calendar_sync_creates_duplicate_events

### Finding
The calendar sync trigger endpoint (`/api/calendar/sync/trigger`) fetches real events from Google Calendar and Microsoft Graph APIs, but the persistence logic uses `database.event.create()` with no deduplication mechanism. Every time a user triggers sync, every external calendar event is inserted as a new database row, creating duplicates. The code even contains an inline TODO acknowledging this: "In production, use a mapping table to track external event IDs." Additionally, the per-event catch blocks silently swallow errors (`catch { errors++; }`) with no logging, making it impossible to diagnose which events failed to import.

### Evidence
- File: `apps/api/app/api/calendar/sync/trigger/route.ts`
- Snippet (Google sync, lines 196-218):
```typescript
for (const event of events) {
  try {
    // Create or update event in database
    // Note: In production, use a mapping table to track external event IDs
    await database.event.create({
      data: {
        tenantId: _tenantId,
        title: event.summary || "Untitled Event",
        eventDate: new Date(
          event.start?.dateTime || event.start?.date || new Date()
        ),
        eventType: "external_google",
        status: "confirmed",
        venueName: event.location || null,
        guestCount: event.attendees?.length || 0,
        // Add external ID reference if schema supports it
      },
    });
    imported++;
  } catch {
    errors++;
  }
}
```
- Snippet (Outlook sync, lines 260-277) — identical pattern with `database.event.create()` and silent catch.
- The disconnect route (`/api/calendar/sync/disconnect/route.ts`) only nulls local DB tokens but never revokes the access/refresh token at the provider (Google `https://accounts.google.com/o/oauth2/revoke` or Microsoft token revocation endpoint), meaning stored OAuth grants remain active after user-initiated disconnect.

### Why this matters
Users who connect their Google or Outlook calendar and trigger sync will see their events multiply in the system on every sync. A weekly sync habit would create hundreds of duplicate event records over time, inflating counts, corrupting analytics, and degrading database performance. The silent error swallowing means users get a success count but no indication of which events failed or why. The missing token revocation on disconnect means OAuth grants persist at the provider even after the user believes they've disconnected — a security concern.

### Proposed detector rule
```json
{
  "id": "fake_integration.sync_loop_creates_duplicates",
  "title": "External sync loop uses create instead of upsert with no external ID tracking",
  "category": "fake_integration",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "for.*event.*of.*(events|items|data)",
    "database\\..+\\.create\\(",
    "//.*(production|mapping table|external ID|upsert|dedup|track)",
    "catch\\s*\\{\\s*errors?\\+\\+",
    "eventType.*external_"
  ],
  "negative_patterns": [
    "upsert",
    "findUnique",
    "findMany.*where.*externalId",
    "externalEventId",
    "providerEventId",
    "ON CONFLICT"
  ],
  "evidence_required": [
    "Function iterates over external API response items",
    "Uses .create() (not .upsert()) inside the loop",
    "No external ID field stored or referenced in the create data",
    "Inline comment acknowledging the gap ('In production', 'TODO', 'mapping table')"
  ],
  "false_positive_controls": [
    "Exclude routes that use upsert or findUnique before create",
    "Exclude if an externalEventId or providerEventId field exists in the create data",
    "Exclude if there's a prior deleteMany/where clause clearing old imports before batch insert"
  ],
  "user_impact": "Every sync trigger creates duplicate records, inflating event counts, corrupting dashboards and analytics, and silently losing data when individual imports fail with no logging.",
  "repair_guidance": "Replace database.event.create() with upsert keyed on a composite of (tenantId, provider, externalEventId). Store the external event ID from the provider response (event.id for Google, event.id for Outlook) in a new field on the event model. Add logging in the catch block instead of silently incrementing an error counter. Implement token revocation at the provider in the disconnect route.",
  "example_source": {
    "file": "apps/api/app/api/calendar/sync/trigger/route.ts",
    "line_or_snippet": "await database.event.create({ data: { tenantId: _tenantId, title: event.summary || \"Untitled Event\", eventType: \"external_google\" } });"
  }
}
```

### Implementation note
Build a hybrid detector that: (1) identifies sync/import functions that iterate over external API response arrays, (2) checks whether the persistence call inside the loop is `.create()` without a preceding `.findUnique()` or `.upsert()`, (3) checks whether the create data payload includes an external ID reference field, (4) flags when inline comments acknowledge the gap (patterns like 'In production', 'mapping table', 'TODO'), (5) flags when catch blocks inside the loop only increment a counter without logging. Should also scan disconnect routes for OAuth providers to verify token revocation is called at the provider's revocation endpoint.
---
---
## [2026-05-06 22:33] Rule Discovery — security_theater.rbac_permission_guard_never_wired_to_runtime

### Finding
The codebase contains a complete RBAC permission system: a Prisma `RolePolicy` model (schema line 5295), a `permission-checker.ts` module with default role permissions, wildcard matching, permission inheritance, a caching layer, a `permission-guard.ts` module that wraps the Manifest RuntimeEngine as a Proxy to enforce permissions on every `runCommand` call, a `COMMAND_PERMISSION_MAP` mapping 20+ manifest commands to granular permissions, an AI approval permission system, a full CRUD API for role policies (`/api/rolepolicy/*`), and a frontend Security Settings page that lists, views, grants, and revokes permissions per role.

However, `createPermissionGuard` is imported in exactly zero production files. It is only used in `packages/manifest-adapters/__tests__/rbac-permission-guard.test.ts`. The runtime factory (`manifest-runtime-factory.ts`) does not wire in permission guards. No API route calls `loadRolePolicies`, `canExecuteCommand`, `filterAuthorizedCommands`, or `getUserPermissions`. The `RolePolicy` table is only read by its own CRUD routes and the trash/restore system.

The net effect: the entire RBAC system is theater. Users can configure permissions for roles via the UI, those permissions are stored in the database, but they are never evaluated. Any authenticated user with any role can execute any manifest command that the manifest policies allow — the custom per-role permissions configured via the Security Settings page have zero enforcement impact.

### Evidence
- File: `packages/manifest-adapters/src/permission-guard.ts`
- Snippet (createPermissionGuard export, only production definition — never imported in apps/):
```typescript
export function createPermissionGuard(
  runtime: RuntimeEngine,
  options: PermissionGuardOptions = {}
): RuntimeEngine {
```
- File: `packages/manifest-adapters/src/permission-guard.ts`
- Snippet (COMMAND_PERMISSION_MAP — 20+ command mappings that no production code consults):
```typescript
export const COMMAND_PERMISSION_MAP: Record<string, Permission> = {
  "Event.create": "events.create",
  "Client.create": "clients.create",
  "User.updateRole": "users.manage_roles",
  "InventoryItem.delete": "inventory.delete",
  "Dish.create": "kitchen.create",
  // ... 20+ entries
};
```
- File: `packages/manifest-adapters/src/manifest-runtime-factory.ts`
- Snippet: Zero references to `permission`, `Permission`, `guard`, or `createPermissionGuard` in the factory that all API routes use to create runtimes.
- File: `apps/app/app/(authenticated)/settings/security/page.tsx` (line 395)
- Snippet (frontend manages policies that are never enforced):
```typescript
apiFetch("/api/rolepolicy/policies/list"),
```

### Why this matters
A catering company owner who configures "kitchen_staff can only read recipes and claim prep tasks" in the Security Settings UI would reasonably expect those permissions to be enforced. Instead, any kitchen staff member can create, update, or delete recipes, dishes, events, and inventory items — because the permission guard that would enforce those rules is never wired into the runtime. This is a security theater pattern where the illusion of access control coexists with complete enforcement absence.

### Proposed detector rule
```json
{
  "id": "security_theater.rbac_permission_guard_never_wired_to_runtime",
  "title": "RBAC permission guard exported but never wired into production runtime",
  "category": "security_theater",
  "severity": "critical",
  "confidence": 0.95,
  "detector_type": "cross_file",
  "language_targets": ["typescript"],
  "patterns": [
    "export function createPermissionGuard",
    "permission-guard.ts",
    "COMMAND_PERMISSION_MAP",
    "RolePolicy"
  ],
  "negative_patterns": [
    "__tests__",
    "*.test.ts",
    "*.spec.ts"
  ],
  "evidence_required": [
    "Permission guard module exists with exported guard factory function",
    "Runtime factory exists that creates RuntimeEngine instances",
    "Zero production imports of the guard factory outside test files",
    "RolePolicy CRUD API and/or frontend management UI exists"
  ],
  "false_positive_controls": [
    "Exclude test files from import checks",
    "Verify the guard is not transitively imported via barrel exports that are consumed",
    "Check that the guard is not applied at middleware level rather than route level"
  ],
  "user_impact": "Users who configure role-based permissions through the UI believe those permissions are enforced, but they are not. Any authenticated user can perform any action regardless of configured permissions, creating a false sense of security and potential unauthorized data modification.",
  "repair_guidance": "Wire createPermissionGuard into the manifest runtime factory so that every runtime.runCommand call passes through the permission check. Call loadRolePolicies to fetch the tenant's active policies, pass them to createPermissionGuard, and use the guarded runtime instead of the raw one. Add cache invalidation when policies are updated via the grant/revoke endpoints.",
  "example_source": {
    "file": "packages/manifest-adapters/src/permission-guard.ts",
    "line_or_snippet": "export function createPermissionGuard(\n  runtime: RuntimeEngine,\n  options: PermissionGuardOptions = {}\n): RuntimeEngine {"
  }
}
```

### Implementation note
Build a cross-file detector that identifies exported permission/authorization guard functions (Proxy-based runtime wrappers, middleware factories, or guard creators), then verifies at least one production file (excluding tests) imports and applies them to the runtime or middleware chain. Flag when guard infrastructure is complete — including database model, CRUD API, UI management page, and unit tests — but zero production callers exist.
---
---
## [2026-05-07 19:15] Rule Discovery — error_handling_theater.abandoned_implementation_breaks_endpoint

### Finding
The PUT handler for CRM scoring rules (`/api/crm/scoring/[id]`) contains two sequential implementations of the same UPDATE logic. The first (lines 54-128) is a dynamic SQL builder that constructs `updates[]` and `updateValues[]` arrays, then attempts to interpolate them via `Prisma.join()`. However, the `.reduce()` callback at line 120-123 is a no-op — it returns the initial empty array unchanged (`return acc;`). This means `Prisma.join([])` produces an empty SQL fragment, resulting in `UPDATE ... SET WHERE ...` — a PostgreSQL syntax error. The `await` on line 96 throws, the outer catch at line 172 returns HTTP 500, and the working implementation below (lines 131-143) is never reached.

The developer left explicit evidence of abandonment: line 117 says `// Use a simpler approach`, and line 130 says `// Re-do with a cleaner approach using Prisma.sql template`. The working implementation on lines 131-143 uses a straightforward COALESCE pattern that correctly handles partial updates — but it is unreachable dead code.

Additionally, lines 54-84 build `updates[]` and `updateValues[]` arrays that are never consumed by the working implementation (which uses the original `rule_name`, `field`, `condition`, etc. variables directly). No test exists for this endpoint (`apps/api/app/api/crm/scoring/` has zero test files), so the 500 error has gone undetected.

### Evidence
- File: `apps/api/app/api/crm/scoring/[id]/route.ts`
- Snippet (broken first attempt, lines 96-128):
```typescript
    const updated = await database.$queryRaw<...>(
      Prisma.sql`
        UPDATE tenant_crm.crm_scoring_rules
        SET ${Prisma.join(
          updates
            .map((u, i) => {
              // The $ numbering is tricky with Prisma.sql template tag
              // Use a simpler approach
              return Prisma.sql`${Prisma.raw(u)}`;
            })
            .reduce((acc: unknown[], u, i) => {
              // Manually build the SQL
              return acc;
            }, [])
        )}
        WHERE id = $${updateValues.length - 1}::uuid AND tenant_id = $${updateValues.length}::uuid
        RETURNING id, tenant_id, rule_name, field, condition, value, points, is_active, priority, created_at, updated_at
      `
    );

    // Re-do with a cleaner approach using Prisma.sql template
    const updateResult = await database.$executeRaw`
      UPDATE tenant_crm.crm_scoring_rules
      SET
        rule_name = COALESCE(${rule_name ?? null}, rule_name),
        field = COALESCE(${field ?? null}, field),
        condition = COALESCE(${condition ?? null}, condition),
        value = COALESCE(${value ?? null}, value)::varchar,
        points = COALESCE(${points ?? null}, points),
        is_active = COALESCE(${is_active ?? null}, is_active),
        priority = COALESCE(${priority ?? null}, priority),
        updated_at = NOW()
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;
```
- No test files exist under `apps/api/app/api/crm/scoring/` (searched `crm.*scoring.*test|scoring.*spec` — zero results)
- The `.reduce()` at line 120-123 is `return acc;` — a no-op that discards all mapped elements

### Why this matters
The PUT `/api/crm/scoring/[id]` endpoint always returns HTTP 500. Any user attempting to update a CRM scoring rule — changing its name, points value, active status, or priority — gets a server error. This means the CRM lead scoring configuration UI (if it exists) cannot save changes. The endpoint appears to have a complete implementation with auth, tenant isolation, validation, and a working SQL pattern — but ~75 lines of abandoned dead code preceding the working code makes the entire endpoint non-functional. The absence of tests means this regression was never caught.

### Proposed detector rule
```json
{
  "id": "error_handling_theater.abandoned_implementation_breaks_endpoint",
  "title": "Abandoned implementation attempt runs before working code, breaking the endpoint",
  "category": "error_handling_theater",
  "severity": "critical",
  "confidence": 0.93,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "Re-do with|re-do with|cleaner approach|simpler approach",
    "\\.reduce\\(\\(acc.*return acc;?\\s*\\},\\s*\\[\\]\\)",
    "await.*\\$queryRaw.*await.*\\$executeRaw",
    "// Manually build the SQL",
    "// The \\$ numbering is tricky"
  ],
  "negative_patterns": [
    "__tests__",
    "*.test.ts",
    "*.spec.ts",
    "// This is intentional",
    "// Fallback"
  ],
  "evidence_required": [
    "Two sequential database query calls in the same function (queryRaw then executeRaw or two similar calls)",
    "A .reduce() or .map().reduce() chain that returns the accumulator unchanged (no-op)",
    "An inline comment acknowledging the first approach was abandoned ('simpler approach', 'Re-do', 'cleaner approach')",
    "The first query would produce invalid SQL (empty SET clause, missing interpolations, etc.)",
    "No test file exists for the route"
  ],
  "false_positive_controls": [
    "Exclude test files",
    "Exclude cases where the first query has a try/catch around it and the second is in the catch (intentional fallback)",
    "Exclude cases where the .reduce() actually transforms the accumulator",
    "Verify the first query is actually broken (not just stylistically different)"
  ],
  "user_impact": "The CRM scoring rule update endpoint always returns 500, making it impossible to modify lead scoring rules. Users see server errors when trying to configure scoring criteria, point values, or rule priority — a core CRM feature is silently broken.",
  "repair_guidance": "Delete the abandoned first implementation (lines 54-128) entirely. Keep only the working COALESCE-based implementation (lines 131-143) and the refreshed SELECT query (lines 149-169). Add a test that verifies PUT returns 200 and the rule is actually updated with the new values. Consider adding validation that the field and condition values match allowed values (similar to the FIELD_COLUMN_MAP in scoring/calculate/route.ts).",
  "example_source": {
    "file": "apps/api/app/api/crm/scoring/[id]/route.ts",
    "line_or_snippet": "// Re-do with a cleaner approach using Prisma.sql template\n    const updateResult = await database.$executeRaw`"
  }
}
```

### Implementation note
Build a hybrid detector that: (1) scans for functions containing two sequential raw SQL query calls (`$queryRaw` or `$executeRaw`), (2) checks for inline comments between them that indicate the first was abandoned ("Re-do", "cleaner approach", "simpler approach"), (3) analyzes the first query's interpolation logic for no-op patterns (`.reduce()` returning initial value unchanged, empty `.filter()` results, `Prisma.join([])` with empty array), (4) verifies the first query would produce invalid SQL if the interpolation is empty, (5) checks for absence of test files covering the route. The detector should flag this as critical severity because abandoned code that runs before working code doesn't just waste resources — it actively breaks the endpoint.
---
## [2026-05-07 19:45] Rule Discovery — dashboard_illusion.analytics_queries_ghost_aggregation_table

### Finding
The rate limits analytics endpoint (`GET /api/settings/rate-limits/analytics`) queries two database tables: `rateLimitEvent` (event-level rows, correctly written by middleware) and `rateLimitUsage` (pre-aggregated buckets with per-endpoint `requestCount`, `blockedCount`, `avgResponseTime`, `maxResponseTime`). However, `rateLimitUsage` is never written to by any production code in the entire codebase. The middleware's `logRateLimitEvent()` function only writes to `rateLimitEvent`. The `RateLimitUsage` Prisma model exists in the schema with proper indexes and composite unique constraints, but it is a ghost table — the analytics endpoint's "byEndpoint" breakdown and "totalStats" summary will always return zeros.

### Evidence
- File: `apps/api/app/api/settings/rate-limits/analytics/route.ts`
- Snippet:
```typescript
const usageData = await database.rateLimitUsage.groupBy({
  by: ["endpoint", "method"],
  where: usageWhere,
  _sum: {
    requestCount: true,
    blockedCount: true,
  },
  _avg: {
    avgResponseTime: true,
  },
  _max: {
    maxResponseTime: true,
  },
});
```
- Prisma model: `packages/database/prisma/schema.prisma` line 5242 — `model RateLimitUsage { ... }`
- Writer search: `rateLimitUsage.create`, `rateLimitUsage.upsert`, `rateLimitUsage.update`, `rateLimitUsage.createMany` — zero results across all `.ts` files
- Only reads exist: analytics route and test mocks (`__tests__/settings/settings.test.ts`)

### Why this matters
The analytics dashboard presents a polished view of rate limit usage with per-endpoint breakdowns, average/max response times, and block rates. In reality, the "byEndpoint" section and "totalStats" summary always return empty arrays and zeros respectively. The `events.allowed` vs `events.blocked` counts from `rateLimitEvent` will work, but the core aggregation table that should power the detailed view is a dead schema artifact. Admins relying on this dashboard to tune rate limit configs are making decisions based on empty data. The `avgResponseTime` and `maxResponseTime` fields on the model suggest the original design intended to track performance metrics per bucket, but that writer logic was never implemented — likely a TODO that was scaffolded into the schema and analytics route but forgotten.

### Proposed detector rule
```json
{
  "id": "dashboard_illusion.analytics_queries_ghost_aggregation_table",
  "title": "Analytics endpoint queries aggregation table that is never written to",
  "category": "dashboard_illusion",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "prisma"],
  "patterns": [
    "database.<model>.groupBy(",
    "database.<model>.aggregate(",
    "model <ModelName> {",
    "bucketStart",
    "requestCount",
    "_sum:",
    "_avg:",
    "_max:"
  ],
  "negative_patterns": [
    "database.<model>.create(",
    "database.<model>.upsert(",
    "database.<model>.createMany(",
    "database.<model>.update(",
    "INSERT INTO"
  ],
  "evidence_required": [
    "Prisma model definition with aggregation-friendly fields (counts, averages, timestamps)",
    "Analytics/dashboard route reading from that model via groupBy/aggregate",
    "Zero writes to that model across the entire codebase (no create/upsert/createMany/update)",
    "Model name suggests pre-aggregated or bucketed data (Usage, Summary, Stats, Bucket)"
  ],
  "false_positive_controls": [
    "Exclude models that are written to via raw SQL ($executeRaw with INSERT)",
    "Exclude models written to in migration seed files",
    "Exclude models populated by external systems (check for cron jobs or external service references)",
    "Exclude read-only views (check @@map targets actual tables)"
  ],
  "user_impact": "Analytics dashboard shows always-empty or always-zero data for key metrics. Admins cannot make informed decisions about rate limit tuning, capacity planning, or performance monitoring because the aggregation pipeline is incomplete.",
  "repair_guidance": "Implement a writer for RateLimitUsage — either: (a) add a periodic aggregation job that rolls up rateLimitEvent rows into pre-computed buckets (e.g., a cron that runs every 5 minutes), or (b) modify logRateLimitEvent() to also upsert into rateLimitUsage using the endpoint+method+bucketStart composite key, incrementing requestCount/blockedCount and updating response time rolling averages. Then verify the analytics endpoint returns populated data.",
  "example_source": {
    "file": "apps/api/app/api/settings/rate-limits/analytics/route.ts",
    "line_or_snippet": "database.rateLimitUsage.groupBy({ by: [\"endpoint\", \"method\"], where: usageWhere, _sum: { requestCount: true, blockedCount: true } })"
  }
}
```

### Implementation note
Build a cross-file detector that: (1) identifies Prisma models with aggregation-friendly schemas (numeric count/sum fields + timestamp bucket fields), (2) finds all read queries against those models (groupBy, aggregate, findMany), (3) searches the entire codebase for any write operations to those models (create, upsert, createMany, update, $executeRaw with INSERT targeting the table), (4) if reads exist but zero writes exist in production code, flag as a ghost aggregation table. The detector should also check if the reads appear in analytics/dashboard/reporting routes to confirm user-facing impact. Severity should be high because analytics with empty data is worse than no analytics — it gives false confidence.
---
## [2026-05-07 20:15] Rule Discovery — security_theater.oauth_state_parameter_is_self_signed_base64_without_verification

### Finding
The OAuth 2.0 calendar sync flow (Google and Outlook) uses a state parameter that is a self-signed base64-encoded JSON blob containing `{ tenantId, provider, ts }`. The connect route generates it with a comment acknowledging the weakness: "Generate a simple state token (in production, store in session/redis)." However, neither the Google nor Outlook callback verifies this state against a server-side store, checks the embedded timestamp for expiry, or applies any HMAC/signature validation. Both callbacks blindly decode the base64, extract `tenantId`, and use it to store OAuth tokens via `database.providerSync.upsert`. The `ts` field is declared in the type but never read or checked.

This means any attacker who knows (or guesses) a target tenant's ID can craft a valid-looking OAuth callback with that tenantId in the state parameter, causing the system to associate the attacker's Google/Microsoft calendar tokens with the victim tenant. The attacker could then trigger a sync to overwrite the victim's calendar events, or the victim's calendar connection could be silently hijacked.

### Evidence
- File: `apps/api/app/api/calendar/sync/connect/route.ts` (line 145-148)
- Snippet:
```typescript
// Generate a simple state token (in production, store in session/redis)
const state = Buffer.from(
  JSON.stringify({ tenantId, provider, ts: Date.now() })
).toString("base64url");
```
- File: `apps/api/app/api/calendar/sync/callback/google/route.ts` (lines 34-43)
- Snippet:
```typescript
let stateData: { tenantId: string; provider: string; ts: number };
try {
  stateData = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
} catch {
  return NextResponse.redirect(
    new URL("/calendar/sync?error=invalid_state", request.url)
  );
}
const { tenantId } = stateData;
// ts is destructured from the type but never checked — no expiry, no server lookup
```
- File: `apps/api/app/api/calendar/sync/callback/outlook/route.ts` (lines 34-43)
- Snippet: Identical pattern — base64 decode, extract tenantId, no verification of ts, no server-side state store

### Why this matters
The OAuth 2.0 state parameter exists specifically to prevent CSRF attacks. By design, the callback must verify the state against a value stored server-side before the authorization redirect. This implementation skips that entirely — the state is a self-signed, forgeable blob. An attacker can:
1. Initiate their own Google/Microsoft OAuth flow for calendar access
2. Intercept the callback and replace the state parameter with a base64-encoded blob containing the victim's tenantId
3. The system stores the attacker's tokens under the victim tenant, enabling calendar data exfiltration or event manipulation

The "in production, store in session/redis" comment is a direct admission this was knowingly shipped as a placeholder. In a multi-tenant app where calendar sync pulls events into the business system, this is a cross-tenant data integrity vulnerability.

### Proposed detector rule
```json
{
  "id": "security_theater.oauth_state_parameter_is_self_signed_base64_without_verification",
  "title": "OAuth state parameter is self-signed base64 blob without server-side verification or expiry check",
  "category": "security_theater",
  "severity": "critical",
  "confidence": 0.97,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "Buffer.from.*JSON.stringify.*state.*base64",
    "JSON.parse.*Buffer.from.*state.*base64",
    "in production.*store.*session.*redis",
    "stateData.*tenantId",
    "const \\{ tenantId \\} = stateData"
  ],
  "negative_patterns": [
    "state.*compare|state.*verify|state.*match|storedState",
    "Date.now.*ts.*stateData.*expir|ts.*<.*Date.now|state.*expir",
    "redis.*get.*state|session.*get.*state|kv.*get.*state",
    "crypto.*createHmac.*state|hmac.*verify.*state"
  ],
  "evidence_required": [
    "OAuth connect/initiate route generates state as base64-encoded JSON",
    "OAuth callback route decodes state from base64 and extracts tenantId or userId",
    "No server-side state storage (redis, session, database, KV) is referenced in the callback",
    "No HMAC/signature verification on the decoded state value",
    "No timestamp expiry check on the embedded ts field",
    "Comment in connect route acknowledges placeholder nature ('in production', 'for now')"
  ],
  "false_positive_controls": [
    "Exclude flows where the callback calls a verifyState/compareState function against a stored value",
    "Exclude flows where state includes an HMAC that is verified in the callback",
    "Exclude flows where the state is an opaque token from an OAuth library (e.g., authjs/next-auth state management)",
    "Exclude flows where timestamp expiry is checked before processing"
  ],
  "user_impact": "Cross-tenant OAuth state forgery allows an attacker to associate their calendar tokens with another tenant's account. This enables reading or overwriting the victim's synced calendar events. In a catering/event management system, this could mean silently altering event dates, times, or details stored from calendar sync. The 'in production, store in session/redis' comment confirms the developers knew this was insecure when shipping.",
  "repair_guidance": "Store the OAuth state server-side before redirecting (e.g., in Redis/KV with a TTL, or in a database table). The connect route should generate a random nonce, store it alongside tenantId and provider with an expiry (e.g., 10 minutes), and put only the nonce in the state parameter. The callback should look up the nonce in the store, verify it matches, check it hasn't expired, then delete it (one-time use). Alternatively, sign the state with HMAC using a server secret and verify the signature in the callback.",
  "example_source": {
    "file": "apps/api/app/api/calendar/sync/callback/google/route.ts",
    "line_or_snippet": "stateData = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8')); const { tenantId } = stateData; // ts never checked, no server lookup"
  }
}
```

### Implementation note
Build a cross-file detector that: (1) identifies OAuth connect routes that generate state parameters via base64 encoding of JSON, (2) finds the corresponding callback routes that decode state from base64, (3) checks whether the callback performs any server-side state verification (redis get, session lookup, database query, HMAC verification, timestamp expiry check), (4) flags when the state is decoded and used directly without verification. The "in production, store in session/redis" comment is a strong signal — it explicitly acknowledges the implementation is a known placeholder.
---
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
# SlopScope rule discovery (continued)

---
## [2026-05-06 17:47] Rule Discovery — placeholder.pseudo_random_financial_reference_collision

### Finding
Three `generate*Number` functions in the accounting/events validation modules use `Math.floor(Math.random() * 90_000 + 10_000)` to produce financial reference numbers (INV-, PAY-, CON- prefixed). These numbers are stored in Prisma model fields with `@unique` constraints (`invoiceNumber` on Invoice, `contractNumber` on Contract). The random space is only 90,000 values per day — under moderate load, birthday-paradox math says collision probability exceeds 50% at roughly 374 records per day per prefix. A collision triggers a hard `UniqueConstraintViolationError` from Postgres, causing the entire invoice/payment/contract creation request to fail.

Additionally, all three functions accept `_tenantId` as a parameter (underscore-prefixed = intentionally unused), showing the developer knew the numbers should be scoped per-tenant but never implemented it. The contracts file even contains explicit "For now" / "In a real implementation" comments acknowledging this is a placeholder.

The payment number case is worse: the generated random string is stored as `gatewayTransactionId` — a field meant for the real payment processor's transaction ID — rather than a dedicated reference column (which doesn't exist on the Payment model at all).

### Evidence
- File: `apps/api/app/api/accounting/invoices/validation.ts`
- Snippet:
```typescript
export function generateInvoiceNumber(_tenantId: string): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(Math.random() * 90_000 + 10_000).toString();
  return `INV-${dateStr}-${randomPart}`;
}
```
- File: `apps/api/app/api/accounting/payments/validation.ts`
- Snippet:
```typescript
export function generatePaymentNumber(_tenantId: string): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(Math.random() * 90_000 + 10_000).toString();
  return `PAY-${dateStr}-${randomPart}`;
}
```
- File: `apps/api/app/api/events/contracts/validation.ts`
- Snippet:
```typescript
export function generateContractNumber(_tenantId: string): string {
  // This would typically call a database function to generate a unique contract number
  // For now, we'll implement a basic generator that could be replaced with a DB function
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(Math.random() * 90_000 + 10_000).toString();
  return `CON-${dateStr}-${randomPart}`;
}
```
- Prisma schema evidence: `invoiceNumber String @unique` (schema.prisma:4405), `contractNumber String @unique` (schema.prisma:2176)
- Payment model has no `paymentNumber` column; the generated value is stored as `gatewayTransactionId` (payments/route.ts:243)

### Why this matters
Under moderate business volume (hundreds of invoices/payments per day), random collisions will cause hard 500 errors on invoice or contract creation. The error surface is user-facing: a client trying to pay or sign a contract gets an opaque server error. The `_tenantId` parameter being accepted but ignored proves this was recognized as incomplete. The contracts file explicitly labels it a placeholder. For payments, the misuse of `gatewayTransactionId` means reconciliation with actual payment processors will break — the field will contain a random string instead of a real processor transaction ID.

### Proposed detector rule
```json
{
  "id": "placeholder.pseudo_random_financial_reference_collision",
  "title": "Math.random used to generate financial reference numbers with uniqueness constraints",
  "category": "placeholder",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "Math.random() within functions named generate*Number, generate*Reference, or generate*Id",
    "Math.floor(Math.random() adjacent to INV-, PAY-, CON-, ORD- prefixes",
    "_tenantId parameter (underscore-prefixed unused param) in number generator functions",
    "For now / In a real implementation comments near random number generators"
  ],
  "negative_patterns": [
    "Math.random() in test files",
    "Math.random() in demo/fixture/mock contexts",
    "Math.random() with no database persistence downstream",
    "crypto.randomUUID() or nanoid() usage (these are proper)"
  ],
  "evidence_required": [
    "Function generates a string with a business prefix (INV, PAY, CON, ORD, etc.)",
    "Generated value is stored in a Prisma model field with @unique constraint",
    "No database sequence, counter, or ON CONFLICT retry logic exists",
    "No crypto.randomUUID or equivalent CSPRNG is used"
  ],
  "false_positive_controls": [
    "Exclude test fixtures and mock data generators",
    "Exclude cases where Math.random is used for non-persisted values (UI only)",
    "Require evidence of database @unique constraint or uniqueness expectation"
  ],
  "user_impact": "Invoice, payment, or contract creation fails with a database unique constraint error when two records collide on the same day. Probability of collision grows with volume — at ~374 records/day per prefix, collision chance exceeds 50%. This is a silent time bomb that works fine at low volume but breaks under growth.",
  "repair_guidance": "Replace Math.random() with a database-backed sequence (e.g., PostgreSQL SEQUENCE per tenant+prefix), a ULID/UUIDv7 for global uniqueness without coordination, or an atomic incrementing counter stored in the database. Ensure the generator retries on collision if randomness is retained. Remove the unused _tenantId parameter or actually use it for scoping.",
  "example_source": {
    "file": "apps/api/app/api/accounting/invoices/validation.ts",
    "line_or_snippet": "export function generateInvoiceNumber(_tenantId: string): string {\n  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, \"\");\n  const randomPart = Math.floor(Math.random() * 90_000 + 10_000).toString();\n  return `INV-${dateStr}-${randomPart}`;\n}"
  }
}
```

### Implementation note
Build a hybrid detector: (1) regex scan for `Math.random` inside functions matching `generate*Number` or `generate*Reference`, (2) AST check for the function accepting a `_tenantId` or `_orgId` parameter (unused scoped param), (3) cross-file check that the generated value flows into a Prisma create with a field that has `@unique` in the schema. The "For now" / "In a real implementation" comment proximity boosts confidence. Flag as high severity when the @unique constraint is confirmed.
---

## [2026-05-06 18:15] Rule Discovery — feature_claim_mismatch.full_ui_page_no_database_model

### Finding
The kitchen Equipment Maintenance page presents a complete, multi-tab UI with tabs for "Equipment" (list), "Work Orders", and "Predictive Failure Alerts." The alerts tab header explicitly brands itself as "AI-powered alerts based on equipment usage, maintenance history, and condition." The page metadata description advertises "predictive failure alerts." However, the entire backend is absent: no `Equipment` model exists in the Prisma schema, no `EquipmentAlert` model exists, and both API endpoints (`/api/kitchen/equipment/list` and `/api/kitchen/equipment/alerts`) are hardcoded 501 stubs that return "not implemented" errors. The frontend silently swallows these failures — it checks `data.success` which is never true for a 501 response, resulting in an empty equipment list and an empty alerts list with a green checkmark saying "No alerts at this time. Your equipment is in good standing." The user sees a fully built, branded feature page that appears functional but does absolutely nothing.

### Evidence
- File: `apps/api/app/api/kitchen/equipment/alerts/route.ts`
- Snippet:
```typescript
// NOTE: Equipment model is not yet implemented in the database schema.
// This endpoint returns an empty response until the model is added.
...
return NextResponse.json(
  {
    error: "Not implemented",
    message:
      "Equipment alerts feature not yet implemented. Equipment model and predictive failure analysis are pending. Tracked as capsule-pro/TODO:equipment-model-implementation",
  },
  { status: 501 }
);
```
- File: `apps/api/app/api/kitchen/equipment/list/route.ts`
- Snippet:
```typescript
// Equipment routes are disabled - Equipment model does not exist in schema
// This route needs schema migration to add Equipment model
...
return manifestErrorResponse(
  "Equipment feature not implemented - missing model",
  501
);
```
- File: `apps/app/app/(authenticated)/kitchen/equipment/equipment-page-client.tsx` (line 440-444)
- Snippet:
```tsx
<CardTitle className="flex items-center gap-2">
  <AlertTriangle className="h-5 w-5" />
  Predictive Failure Alerts
</CardTitle>
<CardDescription>
  AI-powered alerts based on equipment usage, maintenance history,
  and condition
</CardDescription>
```
- File: `apps/app/app/(authenticated)/kitchen/equipment/page.tsx` (line 7-11)
- Snippet:
```tsx
export const metadata = {
  title: "Equipment Maintenance",
  description:
    "Track equipment maintenance, work orders, and predictive failure alerts",
};
```
- Prisma schema: `model Equipment` does not exist (confirmed via grep across all .prisma files)
- Prisma schema: `model EquipmentAlert` does not exist

### Why this matters
Users navigate to the Equipment Maintenance page and see a polished, multi-tab interface with AI branding on the alerts tab. Because the frontend silently swallows the 501 responses, the user sees empty lists with a reassuring "No alerts at this time. Your equipment is in good standing" message — giving a false impression that the system is monitoring their equipment when in fact no equipment data or monitoring exists at all. For a catering/food-service company where equipment failure (walk-in freezers, ovens, refrigeration) can cause thousands of dollars in food waste and event cancellations, this is a critical trust violation. The "AI-powered" branding compounds the deception.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.full_ui_page_no_database_model",
  "title": "Full UI page with tabs and AI branding has no backing database model or functional API",
  "category": "feature_claim_mismatch",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "tsx", "sql", "any"],
  "patterns": [
    "Frontend page component imports and renders tabs for features (alerts, list, etc.)",
    "API route files return 501 status with 'not implemented' or 'model does not exist' messages",
    "Route file comments state 'model does not exist in schema'",
    "Frontend metadata/description advertises feature capabilities (predictive, AI-powered)",
    "Frontend fetch handler checks data.success without handling error/not-implemented responses"
  ],
  "negative_patterns": [
    "API routes that return actual data from database queries",
    "Prisma schema containing the referenced model",
    "Frontend showing explicit 'coming soon' or 'beta' badges",
    "Error responses that propagate to user-visible error states"
  ],
  "evidence_required": [
    "Frontend page.tsx or client component with feature advertising (metadata, card titles, descriptions)",
    "API route returning 501 with 'not implemented' message",
    "Absence of referenced model in Prisma schema",
    "Frontend silently handling failure as empty success state"
  ],
  "false_positive_controls": [
    "Verify the 501 is returned unconditionally (not gated behind a feature flag that could be enabled)",
    "Check that the frontend does not show an explicit 'coming soon' or 'feature not available' notice",
    "Exclude intentionally stubbed routes in test/dev-only environments"
  ],
  "user_impact": "Users see a complete, branded feature page implying active equipment monitoring and AI-powered predictive alerts, when no equipment model, data, or monitoring exists. The reassuring 'all clear' message creates false confidence in a domain where equipment failure has direct financial and food-safety consequences.",
  "repair_guidance": "Either (a) implement the Equipment and EquipmentAlert Prisma models with lifecycle tracking, maintenance history, and usage metrics, then wire the API endpoints to real data with actual alerting logic, or (b) add a prominent 'Coming Soon' banner to the frontend page, remove the 'AI-powered' branding, and show an explicit message explaining the feature is not yet available instead of a misleading green checkmark.",
  "example_source": {
    "file": "apps/api/app/api/kitchen/equipment/alerts/route.ts",
    "line_or_snippet": "Equipment alerts feature not yet implemented. Equipment model and predictive failure analysis are pending."
  }
}
```

### Implementation note
Build a cross-file detector: (1) identify frontend page components with feature-advertising metadata or card titles (regex for "predictive", "AI-powered", "alerts"), (2) trace API calls from those components to backend route files, (3) check if the route unconditionally returns 501 or contains "model does not exist" comments, (4) verify the referenced model is absent from the Prisma schema, (5) check if the frontend silently renders an empty/success state on failure. Flag as high severity when AI/ML branding is present alongside the missing model. Official docs not required: generic implementation-evidence rule.
---

## [2026-05-06 21:00] Rule Discovery — error_handling_theater.audit_write_swallowed_success_returned

### Finding
The `POST /api/kitchen/overrides` endpoint handles constraint override authorizations — a compliance-critical action in a food-service system where overrides bypass safety checks (e.g., temperature violations, allergen controls). The route creates an audit record and an outbox event inside a `$transaction`, but wraps the transaction in a try/catch that **only logs a warning on failure and then returns `{ success: true }` with the override details**. This means the caller is told the override was recorded when it was not. The audit trail — the entire compliance record of who overrode what constraint and why — is silently lost. The outbox event (which would notify downstream systems like the activity feed) is also lost.

The comment says "If the audit table doesn't exist yet, log and continue" but the catch block catches ALL errors, not just "table doesn't exist." Connection failures, permission errors, constraint violations, and any other database error are all treated the same way: swallowed with a warning and a fake success response.

### Evidence
- File: `apps/api/app/api/kitchen/overrides/route.ts`
- Snippet (lines 94-148):
```typescript
  // Record the override in the audit table + outbox event atomically
  try {
    await database.$transaction(async (tx) => {
      await tx.overrideAudit.create({ data: { ... } });
      await tx.outboxEvent.create({ data: { ... } });
    });
  } catch (error) {
    // If the audit table doesn't exist yet, log and continue
    logger.warn("Override audit + outbox transaction failed", {
      error: String(error),
    });
  }

  return NextResponse.json({
    success: true,
    override: { constraintCode, reason, authorizedBy, ... },
  });
```
- Same file, GET handler (lines 185-190) has a similar pattern:
```typescript
  } catch (error) {
    captureException(error);
    // If the table doesn't exist yet, return empty array
    logger.warn("Override audit table not available", { error: String(error) });
    return NextResponse.json({ overrides: [] });
  }
```

### Why this matters
In a food-service catering operation, kitchen constraint overrides bypass safety controls — temperature limits, allergen separation, prep time requirements, etc. When a manager authorizes an override, the audit trail is the ONLY compliance record that proves who authorized it and why. If the database write fails (table doesn't exist, connection error, permission issue) and the endpoint returns `success: true`, the frontend shows a green confirmation to the manager, who walks away thinking the override is recorded. But there is no record. If a food safety incident occurs and investigators ask "who overrode the temperature constraint on walk-in cooler 3?", the answer is: nobody knows. The override was silently lost.

Additionally, the outbox event is lost, meaning downstream systems (activity feed, notifications) never learn about the override. This breaks the event-sourced audit chain entirely.

### Proposed detector rule
```json
{
  "id": "error_handling_theater.audit_write_swallowed_success_returned",
  "title": "Audit/compliance database write failure silently swallowed, success returned to caller",
  "category": "error_handling_theater",
  "severity": "critical",
  "confidence": 0.93,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "try/catch wrapping a database write (create/update/$transaction) where the catch block logs but does NOT return an error response",
    "After the catch block, the function returns a success response (status 200, { success: true }, etc.)",
    "The caught database write involves audit, compliance, override, or outbox tables",
    "Comment pattern: 'table may not exist' or 'table doesn't exist yet' used to justify silent error swallowing"
  ],
  "negative_patterns": [
    "Catch block that returns an error response (500, 4xx) after the database write failure",
    "Catch block that re-throws the error",
    "try/catch around request.json() parsing (common input validation pattern)",
    "Catch blocks in test files",
    "Intentional dry-run modes that explicitly document skipping persistence"
  ],
  "evidence_required": [
    "Database write operation (Prisma create/update/$transaction/$executeRaw) inside a try block",
    "Catch block that logs but does not return an error response or re-throw",
    "Success response returned after the try/catch regardless of whether the write succeeded",
    "The written data involves audit, compliance, override, approval, or outbox semantics"
  ],
  "false_positive_controls": [
    "Exclude catch blocks that return an error response or re-throw",
    "Exclude patterns where the database write is intentionally optional (with clear documentation)",
    "Require the database write to involve compliance-significant data (audit, override, approval, outbox)",
    "Check that the success response is returned unconditionally after the try/catch, not conditionally"
  ],
  "user_impact": "Compliance-critical audit records (who overrode what safety constraint and when) are silently lost when database writes fail. The caller receives a success response, creating a false paper trail. In food-safety-regulated environments, this means override authorizations exist in the UI but not in the database — making them useless during audits, incident investigations, or liability proceedings.",
  "repair_guidance": "The catch block must either (a) return an error response to the caller indicating the override was not recorded, or (b) re-throw the error to be caught by the outer error handler. If the table might genuinely not exist in some environments, use a schema migration check at startup or a feature flag, not a silent catch. The override authorization should be atomic with its audit record — if the audit can't be written, the override should not be considered authorized.",
  "example_source": {
    "file": "apps/api/app/api/kitchen/overrides/route.ts",
    "line_or_snippet": "} catch (error) {\n    // If the audit table doesn't exist yet, log and continue\n    logger.warn(\"Override audit + outbox transaction failed\", {\n      error: String(error),\n    });\n  }\n\n  return NextResponse.json({\n    success: true,\n    override: { ... },\n  });"
  }
}
```

### Implementation note
Build a hybrid detector: (1) AST analysis to find try/catch blocks where a database write (Prisma create/update/$transaction) is inside the try, (2) check the catch block for absence of error response return or re-throw, (3) verify the function returns a success response after the try/catch, (4) check if the database tables involved have audit/compliance/override/outbox semantics (by table name patterns). Boost severity to critical when the write involves both an audit table and an outbox event in the same transaction — this pattern means the entire event-sourced audit chain is broken. Official docs not required: generic implementation-evidence rule.
---

## [2026-05-07 12:30] Rule Discovery — fake_integration.client_fabricated_gateway_response

### Finding
The client-side payment form in `payment-form-client.tsx` fabricates a fake payment gateway response using `Date.now()` timestamps and hardcoded success values, then sends it to the server as if a real payment processor returned it. The component also creates fake tokenized payment method records. No actual payment gateway (Stripe, Square, etc.) is ever called.

### Evidence
- File: `apps/app/app/(authenticated)/accounting/invoices/components/payment-form-client.tsx`
- Snippet (lines 128-153):
```typescript
// Process payment (in real implementation, this would call the payment gateway)
await apiFetch(`/api/accounting/payments/${payment.id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    gatewayResponse: {
      code: "200",
      message: "Success",
      transactionId: `txn_${Date.now()}`,
    },
  }),
});

// If saving payment method, create tokenized record
if (savePaymentMethod && paymentMethodNickname) {
  await apiFetch("/api/accounting/payment-methods", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: "", // Will be derived from invoice
      type: methodType,
      externalMethodId: `pm_${Date.now()}`,
      nickname: paymentMethodNickname,
    }),
  });
}
```
- Additional: Line 104 passes `eventId: ""` with comment "Will be derived from invoice" but no derivation exists.

### Why this matters
This is a **critical** finding. The payment form presents a full checkout UI with credit card, debit card, ACH, wire transfer, check, cash, and digital wallet options. When a user submits a payment, the UI shows "Processing..." but zero money is ever collected. Instead:

1. A fake `gatewayResponse` with hardcoded `code: "200"` and a `txn_` + timestamp ID is sent to the server, which stores it as a completed payment. The server-side `gateway.ts` (already discovered separately) accepts any response without verification.
2. The "Save payment method" feature creates a record with `externalMethodId: pm_${Date.now()}` — a timestamp masquerading as a tokenized card reference that could never be used for real charges.
3. `clientId` and `eventId` are sent as empty strings with "will be derived" comments but no derivation logic exists.
4. The user receives a success confirmation and is redirected back to the invoice page, which now shows the invoice as "paid."

In a real catering business, this means: revenue is not actually collected, financial records contain fabricated transaction IDs, and any downstream accounting or tax reporting based on these records would be incorrect. The explicit comment "in real implementation, this would call the payment gateway" confirms this is a known placeholder left in production.

### Proposed detector rule
```json
{
  "id": "fake_integration.client_fabricated_gateway_response",
  "title": "Client-side component fabricates payment gateway response",
  "category": "fake_integration",
  "severity": "critical",
  "confidence": 0.95,
  "detector_type": "regex",
  "language_targets": ["typescript", "tsx", "javascript", "jsx"],
  "patterns": [
    "gatewayResponse.*code.*200",
    "transactionId.*Date\\.now\\(\\)",
    "externalMethodId.*Date\\.now\\(\\)",
    "pm_\\$\\{Date",
    "txn_\\$\\{Date",
    "in real implementation.*call.*payment gateway",
    "in real implementation.*would call.*gateway"
  ],
  "negative_patterns": [
    "PaymentIntent",
    "stripe.confirm",
    "@stripe/",
    "confirmPayment",
    "processPayment"
  ],
  "evidence_required": [
    "Client component (tsx/jsx) that sends a fabricated gatewayResponse object to an API endpoint",
    "Transaction ID or payment method ID generated using Date.now() or Math.random()",
    "Absence of any payment SDK import (stripe, square, braintree, etc.)",
    "Comment admitting the implementation is a placeholder"
  ],
  "false_positive_controls": [
    "Exclude files that import a real payment SDK (stripe, @stripe/stripe-js, square, braintree)",
    "Exclude files that call a server-side payment function (not just API fetch with fabricated body)",
    "Require the fabricated response to be sent via apiFetch/fetch to a /api/ endpoint",
    "Only flag when both transactionId fabrication AND gatewayResponse fabrication are present"
  ],
  "user_impact": "Users are shown a 'Processing...' state and then a success confirmation for payments that were never processed. No money is collected. Financial records contain fabricated transaction IDs (txn_1234567890) and fake tokenized payment method records (pm_1234567890) that correspond to no real financial institution. Downstream accounting, tax reporting, and revenue tracking are all based on fictitious payment data.",
  "repair_guidance": "Replace the fabricated gatewayResponse with a real payment processor integration. For card payments, integrate Stripe Elements or similar to collect card details client-side and create a PaymentIntent server-side. For ACH/wire/check/cash, create a separate recording flow that does not pretend to be a real-time gateway authorization. Remove the 'Save payment method' tokenization simulation until real PCI-compliant tokenization via the payment processor is implemented. Ensure the server-side gateway endpoint validates the response against the actual processor before recording payment completion.",
  "example_source": {
    "file": "apps/app/app/(authenticated)/accounting/invoices/components/payment-form-client.tsx",
    "line_or_snippet": "// Process payment (in real implementation, this would call the payment gateway)\nawait apiFetch(`/api/accounting/payments/${payment.id}`, {\n  method: \"PUT\",\n  body: JSON.stringify({\n    gatewayResponse: {\n      code: \"200\",\n      message: \"Success\",\n      transactionId: `txn_${Date.now()}`,\n    },\n  }),\n});"
  }
}
```

### Implementation note
Build a regex-based detector that scans client components (.tsx/.jsx) for the combination of (1) a `gatewayResponse` object with hardcoded success codes, (2) `Date.now()` used to generate transaction or payment method IDs, and (3) absence of any real payment SDK import. The "in real implementation" comment is a strong confirmation signal but not required for the match. Cross-reference with the server-side `fake_integration.payment_gateway_always_success_placeholder` rule — when both the client fabricates the response AND the server accepts it without verification, the combined severity should be escalated to critical. Official docs not required: generic implementation-evidence rule.
---

## [2026-05-06 18:52] Rule Discovery — placeholder.base64_data_url_persisted_as_file_storage

### Finding
Multiple API endpoints store file content as base64 data URLs directly in PostgreSQL `String` columns instead of using object storage (S3, GCS, Azure Blob). The most impactful case is the contract document upload endpoint, which accepts PDF and Word documents up to 10MB, converts them to base64 data URLs (~13.3MB per 10MB file), and stores the entire string in the `documentUrl` field on the `EventContract` model. The same pattern appears in payroll, purchase order, and event QuickBooks export endpoints where base64 data URLs are returned in API responses instead of being stored in object storage with signed download URLs.

The contract document upload is the critical case: every contract document uploaded by a user is persisted as an inline data URL in a database text column. For a catering company handling event contracts (legal documents), this means the database is being used as a file system. A 10MB PDF becomes a ~13.3MB string stored in a `String?` column with no size limit enforcement beyond the 10MB input validation (which doesn't account for the base64 expansion). The comment explicitly acknowledges this is temporary: "Note: In production, you would upload to a storage service (S3, Blob, etc.) and store the URL. For now, we're storing a data URL."

### Evidence
- File: `apps/api/app/api/events/contracts/[id]/document/route.ts`
- Snippet:
```typescript
// Convert file to base64 for storage
const bytes = await file.arrayBuffer();
const buffer = Buffer.from(bytes);
const base64 = buffer.toString("base64");

// Update contract with document URL
// Note: In production, you would upload to a storage service (S3, Blob, etc.)
// and store the URL. For now, we're storing a data URL.
const dataUrl = `data:${file.type};base64,${base64}`;

await database.eventContract.update({
  where: {
    tenantId_id: { tenantId, id: contractId },
  },
  data: {
    documentUrl: dataUrl,
    documentType,
  },
});
```
- File: `apps/api/app/api/payroll/export/quickbooks/route.ts` (line 81-91)
- Snippet:
```typescript
// In a production system, you might:
// 1. Store the file in object storage (S3, GCS, etc.)
// 2. Return a signed URL for download
// For now, we'll return the content as a base64-encoded data URL
const base64Content = Buffer.from(result.content).toString("base64");
const dataUrl = `data:${mimeType};base64,${base64Content}`;
return NextResponse.json({ exportId: result.exportId, fileUrl: dataUrl, ... });
```
- File: `apps/api/app/api/inventory/purchase-orders/export/quickbooks/route.ts` (line 346-352) — same pattern
- File: `apps/api/app/api/events/export/quickbooks/route.ts` (line 331-336) — same pattern
- Prisma schema: `documentUrl String? @map("document_url")` (schema.prisma:4090) — plain String column, not a blob or large-object reference

### Why this matters
For contract documents specifically: event contracts are legal documents in a catering business. Storing them as base64 data URLs in PostgreSQL text columns has several consequences: (1) database bloat — a 10MB PDF becomes ~13.3MB of text stored in-row, consuming disk, memory, and WAL space; (2) no CDN or streaming — the "document URL" is an inline data URL that must be fully loaded into memory before serving, making document downloads slow and resource-intensive; (3) backup/restore impact — every database backup includes all contract documents as base64 strings, inflating backup size and duration; (4) no access control at the storage layer — a proper S3/GCS setup allows signed URLs with expiration, but data URLs are served from the application layer with no download tracking or expiration; (5) the 10MB input limit doesn't account for the base64 expansion, so a 10MB file becomes ~13.3MB in the database with no explicit column size guard. For the export endpoints, returning base64 in API responses means large export files are embedded in JSON responses, which can exceed typical response size limits and make downloads unreliable.

### Proposed detector rule
```json
{
  "id": "placeholder.base64_data_url_persisted_as_file_storage",
  "title": "File content stored as base64 data URL in database or API response instead of object storage",
  "category": "placeholder",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "regex",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "toString('base64') followed by template literal with 'data:' prefix",
    "dataUrl = `data:${...};base64,${...}` pattern",
    "Comment: 'In production, you would upload to a storage service' or 'For now, we are storing a data URL'",
    "Comment: 'In a production system, you might' near base64 file content",
    "Prisma update/create where a field named documentUrl/fileUrl is set to a data: URL"
  ],
  "negative_patterns": [
    "Base64 encoding for email attachments (RFC 2387 multipart/related)",
    "Base64 encoding for JWT tokens or OAuth flows",
    "Base64 in test fixtures or mock data",
    "S3 upload presigned URL generation (actual storage integration)",
    "import from '@aws-sdk/client-s3' or similar cloud storage SDK"
  ],
  "evidence_required": [
    "File content (arrayBuffer, Buffer) converted to base64 via toString('base64')",
    "Result stored in a variable named dataUrl or assigned to a database field named documentUrl/fileUrl",
    "Comment acknowledging this is temporary or should use object storage",
    "Absence of cloud storage SDK import (S3, GCS, Azure Blob, Uploadthing, etc.)"
  ],
  "false_positive_controls": [
    "Exclude files that import a cloud storage SDK (@aws-sdk/client-s3, @google-cloud/storage, azure-storage, uploadthing, etc.)",
    "Exclude base64 encoding used for non-file purposes (JWT, auth, encoding for transport)",
    "Require the data URL to be stored in a database field or returned as a fileUrl in an API response",
    "Exclude test files and fixtures"
  ],
  "user_impact": "Contract documents (legal files for catering events) are stored as base64 strings in PostgreSQL instead of proper object storage. This causes database bloat (~33% size overhead per file), slow document retrieval (no CDN/streaming), inflated backups, and no storage-level access control or signed URL expiration. For a catering business where contracts define event terms, pricing, and liability, document reliability and accessibility are operationally critical.",
  "repair_guidance": "Replace base64 data URL storage with a proper object storage integration (AWS S3, GCS, Azure Blob, or a managed service like Uploadthing). Upload the file to object storage, store the resulting URL or key in the database field, and serve downloads via signed URLs with expiration. For the export endpoints, store the export file in object storage and return a signed download URL instead of embedding base64 in the JSON response. Add a file size limit that accounts for base64 expansion if keeping a string column.",
  "example_source": {
    "file": "apps/api/app/api/events/contracts/[id]/document/route.ts",
    "line_or_snippet": "// Note: In production, you would upload to a storage service (S3, Blob, etc.)\n// and store the URL. For now, we are storing a data URL.\nconst dataUrl = `data:${file.type};base64,${base64}`;\n\nawait database.eventContract.update({\n  where: { tenantId_id: { tenantId, id: contractId } },\n  data: { documentUrl: dataUrl, documentType },\n});"
  }
}
```

### Implementation note
Build a regex-based detector that scans for the combination of (1) `toString('base64')` or `Buffer.from` followed by base64 conversion, (2) the result being assembled into a `data:` URL template literal, and (3) the data URL being stored in a database field (Prisma update/create with a field named documentUrl, fileUrl, etc.) or returned in an API response. Check for the presence of a comment pattern like "In production, you would upload" or "For now, we're storing" as a confidence booster. Cross-reference with cloud storage SDK imports — if `@aws-sdk/client-s3`, `@google-cloud/storage`, `uploadthing`, or similar are imported in the same file, it's likely a false positive. Flag as high severity when the data URL is persisted to a database field, medium severity when only returned in an API response. Official docs not required: generic implementation-evidence rule.
---

## [2026-05-06 18:52] Rule Discovery — placeholder.base64_data_url_persisted_as_file_storage

### Finding
Multiple API endpoints store file content as base64 data URLs directly in PostgreSQL String columns instead of using object storage (S3, GCS, Azure Blob). The most impactful case is the contract document upload endpoint, which accepts PDF and Word documents up to 10MB, converts them to base64 data URLs, and stores the entire string in the documentUrl field on the EventContract model. The same pattern appears in payroll, purchase order, and event QuickBooks export endpoints where base64 data URLs are returned in API responses instead of being stored in object storage with signed download URLs.

The contract document upload is the critical case: every contract document uploaded by a user is persisted as an inline data URL in a database text column. The comment explicitly acknowledges this is temporary: "Note: In production, you would upload to a storage service (S3, Blob, etc.) and store the URL. For now, we're storing a data URL."

### Evidence
- File: apps/api/app/api/events/contracts/[id]/document/route.ts
- Snippet: toString('base64') followed by data URL template literal, stored in documentUrl via Prisma update
- File: apps/api/app/api/payroll/export/quickbooks/route.ts (line 81-91)
- File: apps/api/app/api/inventory/purchase-orders/export/quickbooks/route.ts (line 346-352)
- File: apps/api/app/api/events/export/quickbooks/route.ts (line 331-336)
- Prisma schema: documentUrl String? (schema.prisma:4090) - plain String column

### Why this matters
Event contracts are legal documents. Storing them as base64 data URLs in PostgreSQL causes database bloat, no CDN/streaming, inflated backups, and no storage-level access control or signed URL expiration. The 10MB input limit does not account for base64 expansion.

### Proposed detector rule
See full JSON in source.

### Implementation note
Regex detector for toString('base64') + data: URL template + database field assignment or API response, with negative patterns for cloud storage SDK imports. Official docs not required: generic implementation-evidence rule.
---
---
## [2026-05-06 18:57] Rule Discovery — automation_theater.outbox_events_created_without_automated_consumer

### Finding
The codebase implements a transactional outbox pattern where domain events (kitchen task status changes, waste entries, recipe version updates, kitchen overrides, command board replays) are written to an `OutboxEvent` table during database transactions. A publisher endpoint (`/outbox/publish`) exists to poll pending events and publish them to Ably for real-time delivery. However, the publisher is a manual HTTP POST endpoint with no automated trigger — no Vercel cron, no CI pipeline, no background worker, no setInterval, no Bull queue, no pg-boss, nothing. The Vercel cron configuration defines three scheduled jobs (sentry-fixer, webhook-retry, inventory-audit) but none of them is the outbox publisher. This means outbox events are created on every kitchen task status change, waste entry, recipe version publish, and kitchen override, but they remain in `pending` status indefinitely unless a human manually POSTs to `/outbox/publish`. The real-time updates that the outbox pattern was designed to deliver (task completion notifications, progress updates, override broadcasts) are silently never delivered to users.

### Evidence
- File: `apps/api/app/outbox/publish/route.ts`
- Snippet:
```typescript
// The publisher is a manual POST endpoint — requires explicit invocation
export async function POST(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  // ... polls pending events and publishes to Ably
}
```
- File: `apps/api/vercel.json` (lines 15-28)
- Snippet:
```json
"crons": [
  { "path": "/api/sentry-fixer/process", "schedule": "0 0 * * *" },
  { "path": "/api/cron/webhook-retry", "schedule": "*/5 * * * *" },
  { "path": "/api/cron/inventory-audit", "schedule": "0 6 * * *" }
]
```
No `/outbox/publish` cron entry exists.

- File: `apps/api/app/api/kitchen/tasks/shared-task-helpers.ts` (line 537)
- Snippet:
```typescript
const outboxEvent = await tx.outboxEvent.create({
  data: {
    tenantId,
    aggregateType: "KitchenTask",
    aggregateId: taskId,
    eventType: `kitchen.task.${newStatus === "done" ? "completed" : newStatus}`,
    payload: { taskId, status: newStatus, constraintOutcomes: result.constraintOutcomes },
    status: "pending" as const,
  },
});
```
Events created with status "pending" but never consumed.

- File: `apps/api/app/api/kitchen/prep-lists/autogenerate/process/route.ts` (line 76)
- Snippet:
```typescript
const pendingCount = await database.outboxEvent.count({
  where: { eventType: "event.prep-list.requested", status: "pending" },
});
return NextResponse.json({ pending: pendingCount, timestamp: new Date().toISOString() });
```
An endpoint that counts pending events but never processes them — monitoring theater.

- 10 locations create outbox events (kitchen tasks, waste entries, overrides, recipe versions, command board)
- 0 automated consumers exist (no cron, no worker, no queue, no scheduled trigger)
- The publisher route is in `proxy.ts` public routes but requires Bearer token auth

### Why this matters
The outbox pattern exists specifically to guarantee reliable event delivery for real-time features. Kitchen staff rely on real-time task updates — when a prep task is completed, the next station needs to know immediately. When a kitchen override is issued (e.g., ingredient substitution, allergen flag), staff need instant notification. When a waste entry is logged, inventory counts should update across all connected clients. All of these events are written to the outbox table but never published to Ably, meaning the real-time layer is completely inert. The frontend likely subscribes to Ably channels expecting these events, creating a false expectation of live updates. The database accumulates pending outbox events indefinitely, growing over time. The `/outbox/publish` endpoint works correctly when called manually (it has good tests and proper SKIP LOCKED concurrency handling), but it's never called automatically in production, making the entire outbox infrastructure implementation theater — all the engineering effort (transactional writes, SKIP LOCKED queries, payload size limits, Ably integration, error handling, test coverage) produces zero user value without an automated trigger.

### Proposed detector rule
```json
{
  "id": "automation_theater.outbox_events_created_without_automated_consumer",
  "title": "Transactional outbox events created by domain logic but no automated consumer/worker processes them",
  "category": "automation_theater",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "javascript", "json", "yaml", "yml"],
  "patterns": [
    "Database model named outboxEvent or OutboxEvent with create operations in multiple files",
    "OutboxEvent table in Prisma schema with status field having 'pending' as initial value",
    "A publish/process/consume route or function that reads pending outbox events",
    "Absence of the outbox publish endpoint in any cron configuration (vercel.json crons, cron expressions, scheduled triggers)",
    "Absence of background worker libraries (bull, agenda, pg-boss, node-cron, setInterval) referencing outbox",
    "Absence of CI/CD pipeline step that triggers outbox processing"
  ],
  "negative_patterns": [
    "Outbox publish endpoint referenced in a Vercel cron, AWS EventBridge rule, or equivalent scheduler config",
    "Background job queue (Bull, Agenda, pg-boss) with a recurring job that calls the outbox publisher",
    "A long-running process or worker that polls the outbox table on a timer",
    "Serverless function triggered by a database notify/listen or CDC stream"
  ],
  "evidence_required": [
    "OutboxEvent model/table exists in schema with create operations in domain code (at least 3+ locations)",
    "A publisher/processor route or function exists that can process pending events",
    "No automated trigger (cron job, background worker, CI pipeline, scheduled function) invokes the publisher",
    "Vercel cron config or equivalent scheduler does not include the outbox publish path"
  ],
  "false_positive_controls": [
    "Exclude if a background worker or cron job explicitly references the outbox publish endpoint or function",
    "Exclude if the application uses a CDC (Change Data Capture) tool like Debezium to consume outbox events",
    "Exclude if outbox events are consumed by a separate service with its own deployment pipeline (verify via docker-compose, k8s manifests, or deployment config)",
    "Exclude if the outbox is used for audit/log purposes only (no real-time delivery intended) — check for absence of Ably/push/SSE publish code in the consumer"
  ],
  "user_impact": "Real-time features (kitchen task updates, override notifications, waste entry broadcasts, recipe version change alerts) silently fail to deliver. Kitchen staff see stale data and miss critical updates. The outbox table grows unbounded with pending events, consuming database storage. The engineering investment in the outbox pattern (transactional consistency, concurrency-safe polling, payload validation) produces zero runtime value.",
  "repair_guidance": "Add the outbox publish endpoint to the Vercel cron configuration with a frequent interval (e.g., every 30-60 seconds: '*/1 * * * *'). Alternatively, implement a background worker using pg-boss, Bull, or a similar job queue that polls the outbox table on a timer. The publisher endpoint at /outbox/publish is already well-implemented with proper auth, SKIP LOCKED concurrency, payload size limits, and error handling — it just needs to be triggered automatically.",
  "example_source": {
    "file": "apps/api/vercel.json",
    "line_or_snippet": "\"crons\": [\n  { \"path\": \"/api/sentry-fixer/process\", \"schedule\": \"0 0 * * *\" },\n  { \"path\": \"/api/cron/webhook-retry\", \"schedule\": \"*/5 * * * *\" },\n  { \"path\": \"/api/cron/inventory-audit\", \"schedule\": \"0 6 * * *\" }\n]\n// Missing: { \"path\": \"/outbox/publish\", \"schedule\": \"*/1 * * * *\" }"
  }
}
```

### Implementation note
Build a cross-file detector that (1) identifies an outbox/event table or model with create operations in domain code, (2) identifies a consumer/publisher route or function, and (3) checks all scheduler/cron/worker configurations for an automated trigger to that consumer. If producers exist but no automated consumer trigger is found, flag as automation theater. The detector should check vercel.json crons, any file with cron/schedule patterns, docker-compose for worker services, and search for background job libraries. Confidence is high because the outbox pattern is specifically designed for automated processing — a manual-only publisher is a clear implementation gap. Official docs not required: generic implementation-evidence rule.
---

---
## [2026-05-06 22:30] Rule Discovery — automation_theater.cron_endpoint_never_scheduled

### Finding
Two fully-implemented cron endpoints (`contract-expiration-alerts` and `email-reminders`) contain real business logic — database queries, email workflow triggering via `@repo/notifications`, proper CRON_SECRET auth, error handling with Sentry — but are **never registered in the Vercel cron configuration** (`vercel.json`). Only 3 of 5 cron endpoints are scheduled. The two unregistered endpoints are dead code: they exist, they pass tests, but they never execute in production.

### Evidence
- File: `apps/api/vercel.json`
- Only registered crons:
  - `/api/sentry-fixer/process` (daily)
  - `/api/cron/webhook-retry` (every 5 min)
  - `/api/cron/inventory-audit` (daily 6am)
- File: `apps/api/app/api/cron/contract-expiration-alerts/route.ts` (262 lines)
- Snippet: Full production implementation querying `eventContract`, calling `triggerEmailWorkflows`, with configurable reminder intervals `[30, 14, 7, 3, 1]` days
- File: `apps/api/app/api/cron/email-reminders/route.ts` (387 lines)
- Snippet: Full production implementation querying `kitchenTask`/`kitchenTaskClaim` and `scheduleShift`, calling `triggerEmailWorkflows` for task and shift reminders
- Neither endpoint appears in `vercel.json` crons array

### Why this matters
Contract expiration alerts are supposed to notify clients at 30/14/7/3/1 day intervals before contracts expire. Task and shift reminders are supposed to notify employees about upcoming work. Neither of these notifications are being sent because the cron jobs are never triggered. This means:
1. Contracts may expire silently without client notification
2. Staff may miss task deadlines and shift start times
3. The code quality is high (auth, error handling, Sentry) which makes the omission harder to detect — it looks like it should work
4. Tests exist for auth but there's no test verifying the endpoints are actually scheduled

### Proposed detector rule
```json
{
  "id": "automation_theater.cron_endpoint_never_scheduled",
  "title": "Cron endpoint exists but is not registered in scheduler config",
  "category": "automation_theater",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "json"],
  "patterns": [
    "route.ts files under api/cron/ directories",
    "vercel.json or equivalent scheduler config with crons array",
    "export async function POST/GET in cron route files"
  ],
  "negative_patterns": [
    "endpoints referenced in vercel.json crons array",
    "endpoints with comments explicitly marking them as manual-only or on-demand",
    "test fixtures or mock cron directories"
  ],
  "evidence_required": [
    "cron route file exists with POST/GET handler",
    "scheduler config file exists (vercel.json crons, cron.yaml, etc.)",
    "route path is NOT present in scheduler config"
  ],
  "false_positive_controls": [
    "Exclude endpoints that are called by other internal systems (check for import references)",
    "Exclude endpoints explicitly documented as on-demand/manual triggers",
    "Verify platform-specific config (Vercel, AWS EventBridge, etc.)"
  ],
  "user_impact": "Background jobs that appear to handle critical automated tasks (contract expiration alerts, employee reminders) are silently dead code. Users expect these notifications to fire but they never do, leading to missed deadlines, expired contracts, and staff no-shows.",
  "repair_guidance": "Add missing cron entries to vercel.json with appropriate schedules. contract-expiration-alerts should run daily (matching its documented intent). email-reminders should run every 15 minutes (matching its documented intent). Add a CI/lint check that verifies all api/cron/* route files have a corresponding scheduler entry.",
  "example_source": {
    "file": "apps/api/app/api/cron/contract-expiration-alerts/route.ts",
    "line_or_snippet": "// File exists with 262 lines of production code but is not in vercel.json crons array"
  }
}
```

### Implementation note
Cross-file detector: parse the scheduler config (vercel.json crons array, or platform equivalents) and compare against all route files found under `api/cron/` directories. Flag any cron route whose path does not appear in the scheduler config. Should also check for reverse false positives — scheduler entries pointing to non-existent routes. Could extend to support AWS EventBridge rules, GitHub Actions scheduled workflows, etc.
---

## [2026-05-07 13:00] Rule Discovery — security_theater.credential_field_exists_but_never_read

### Finding
The `InventorySupplier` Prisma model has a `connectorCredentials Json` field explicitly designed to hold per-supplier API credentials (apiBaseUrl, apiKey, apiSecret, webhookSecret). Comments throughout the codebase claim this field is the authoritative source for credentials: "Credentials are stored as encrypted JSON on the InventorySupplier record" and "Secret is stored in the supplier's connectorCredentials.webhookSecret field." However, the actual runtime code in two separate endpoints — the supplier sync trigger (`/api/inventory/supplier-sync/sync`) and the supplier catalog webhook (`/api/webhooks/supplier-catalog`) — never reads from this field. Instead, both endpoints construct credential lookups from global environment variables (`process.env["SUPPLIER_<CONNECTOR>_API_KEY"]` and `process.env["SUPPLIER_<CONNECTOR>_WEBHOOK_SECRET"]`) that fall back to empty strings.

The sync route contains a particularly telling dead-code artifact: it performs a typecast-heavy database lookup for the supplier record (`database as unknown as Record<string, unknown>`), assigns the result to a `supplier` variable, then never uses it. The variable exists solely to make the "encrypted credentials" comment appear credible to a reader skimming the code. The field is plain `Json` (not encrypted) in the schema, and no encryption/decryption logic exists anywhere in the codebase.

The practical impact is two-fold: (1) the `connectorCredentials` field is a lie — it's never used for its stated purpose, so any credentials entered there by users (e.g., through a settings UI) have no effect; (2) the global env var approach means all suppliers of the same type share one set of credentials, which breaks multi-tenant credential isolation — if two tenants use the same supplier connector type, they share the same API key from the environment.

### Evidence
- File: `apps/api/app/api/inventory/supplier-sync/route.ts`
- Snippet:
```typescript
    // Look up the supplier and get their connector credentials
    // Credentials are stored as encrypted JSON on the InventorySupplier record
    const supplier = (await (database as unknown as Record<string, unknown>)
      .inventorySupplier) as
      | {
          findFirst: (args: unknown) => Promise<unknown>;
        }
      | undefined;

    // For now, build config with placeholder credentials
    // In production, credentials would be fetched from the supplier record's
    // encrypted connectorCredentials field
    const config = {
      supplierId,
      tenantId,
      credentials: {
        apiBaseUrl:
          process.env[
            `SUPPLIER_${connectorId.toUpperCase().replace(/-/g, "_")}_API_URL`
          ] || "",
        apiKey:
          process.env[
            `SUPPLIER_${connectorId.toUpperCase().replace(/-/g, "_")}_API_KEY`
          ] || "",
        apiSecret:
          process.env[
            `SUPPLIER_${connectorId.toUpperCase().replace(/-/g, "_")}_API_SECRET`
          ] || "",
      },
```
- File: `apps/api/app/api/webhooks/supplier-catalog/route.ts` (lines 39, 133-136)
- Snippet:
```typescript
// - Secret is stored in the supplier's connectorCredentials.webhookSecret field
...
  const webhookSecret =
    process.env[
      `SUPPLIER_${payload.connectorId.toUpperCase().replace(/-/g, "_")}_WEBHOOK_SECRET`
    ];
```
- File: `packages/database/prisma/schema.prisma` (line 1742)
- Snippet: `connectorCredentials Json @default("{}") @map("connector_credentials") @db.JsonB`
- Cross-reference: `connectorCredentials` is only read/written in manifest-adapter stores (CRUD) and test fixtures — never in any authentication or sync logic.

### Why this matters
In a multi-tenant SaaS platform for catering companies, each tenant should have independent credentials for their supplier integrations (different API keys for different supplier accounts). The codebase claims to support this through the `connectorCredentials` field on each supplier record. But the actual implementation uses global environment variables shared across all tenants — meaning: (1) only one set of credentials per connector type can exist, making multi-tenant supplier integration impossible; (2) any credentials entered by users in the UI (if such a UI exists) are silently ignored; (3) the comment claiming "encrypted" storage is false — the field is plain JSON; (4) the dead-code supplier lookup with double `as unknown` type casts was written to create the appearance of credential reading without actually doing it, which is a form of implementation theater that wastes future developers' time investigating a code path that goes nowhere.

### Proposed detector rule
```json
{
  "id": "security_theater.credential_field_exists_but_never_read",
  "title": "Database credential field documented as source of auth secrets but never read at runtime",
  "category": "security_theater",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "javascript", "prisma"],
  "patterns": [
    "Comment claiming credentials are 'stored as encrypted JSON' or 'stored in the X field' near a database lookup",
    "Database lookup result assigned to a variable that is never referenced again",
    "process.env used to read the same credential type that the comment claims comes from the database",
    "Prisma model field named connectorCredentials, credentials, apiCredentials, or similar Json/String field",
    "TypeScript double-cast through 'unknown' (as unknown as Record) near credential-related code"
  ],
  "negative_patterns": [
    "Code that actually reads .connectorCredentials or .credentials from the fetched record",
    "Environment variable reads for app-wide config (DATABASE_URL, PORT) not related to per-record credentials",
    "Comments that say 'stored in env' matching the actual env var usage",
    "Test files and mock data"
  ],
  "evidence_required": [
    "Prisma model with a credential-related Json or String field (connectorCredentials, credentials, apiSecret, webhookSecret)",
    "Comment in a route/handler claiming the field is the source of auth credentials",
    "The same handler reading credentials from process.env instead of the fetched database record",
    "The fetched database record variable is unused after assignment (dead code)",
    "No encryption/decryption logic exists despite 'encrypted' claim in comments"
  ],
  "false_positive_controls": [
    "Verify the database variable is truly unused after assignment (not passed to another function off-screen)",
    "Check that the env var and claimed DB field refer to the same credential type",
    "Exclude cases where env vars are used as a fallback after a DB read attempt",
    "Require the 'encrypted' or 'stored in' claim comment to be within 10 lines of the DB lookup"
  ],
  "user_impact": "Multi-tenant credential isolation is broken — all tenants sharing a connector type use the same global API key from environment variables. Per-supplier credentials entered by users (if a UI exists) are silently ignored. The 'encrypted' claim in comments gives a false sense of security for a field that is plain JSON. Future developers investigating the credential flow waste time following dead-code database lookups that appear intentional but go nowhere.",
  "repair_guidance": "Read credentials from the supplier record's connectorCredentials field at runtime, decrypt if encryption is used, and use those per-supplier credentials for API calls and webhook verification. Remove the dead-code supplier lookup or actually use its result. Either implement real encryption for the connectorCredentials field or remove the 'encrypted' claim from comments. If per-tenant credentials are not yet supported, document that limitation explicitly rather than maintaining deceptive comments.",
  "example_source": {
    "file": "apps/api/app/api/inventory/supplier-sync/route.ts",
    "line_or_snippet": "// Credentials are stored as encrypted JSON on the InventorySupplier record\n    const supplier = (await (database as unknown as Record<string, unknown>)\n      .inventorySupplier) as\n      | {\n          findFirst: (args: unknown) => Promise<unknown>;\n        }\n      | undefined;\n\n    // For now, build config with placeholder credentials\n    // In production, credentials would be fetched from the supplier record's\n    // encrypted connectorCredentials field\n    const config = {\n      credentials: {\n        apiBaseUrl: process.env[...] || \"\",\n        apiKey: process.env[...] || \"\",\n      },\n    };"
  }
}
```

### Implementation note
Build a cross-file detector: (1) identify Prisma models with credential-related fields (connectorCredentials, credentials, webhookSecret patterns), (2) find route/handler files that comment-claim those fields are the credential source, (3) verify the fetched record variable is dead code (assigned but never referenced), (4) check if the same handler reads from process.env for the same credential type, (5) search for encryption/decryption logic — if the comment says "encrypted" but no crypto operations exist near the field, boost severity. This rule is distinct from existing rules because it targets the specific pattern of dead-code database lookups paired with misleading credential-source claims, not just stub integrations or env var usage in general. Official docs not required: generic implementation-evidence rule.
---
## [2026-05-07 14:30] Rule Discovery — feature_claim_mismatch.ai_branded_regex_parser

### Finding
The `/api/ai-event-setup/parse` route is branded as "AI Event Setup" in its API path, e2e test suite, and planning documentation, but the implementation is entirely regex-based with zero LLM/AI calls. The 532-line file contains only hand-written regex patterns for date parsing, event type inference, guest count extraction, and venue name detection — no `openai`, `ai`, `generateText`, or any AI SDK import exists. The planning docs explicitly describe it as "AI-assisted event setup" and the e2e test file is named `ai-event-setup-e2e.spec.ts`, reinforcing the AI branding to anyone auditing the feature surface.

### Evidence
- File: `apps/api/app/api/ai-event-setup/parse/route.ts`
- Snippet:
```typescript
// Line 1: File is under /api/ai-event-setup/ — branded as AI
// Line 16: Comment says "Natural Language Event Parsing Logic"
// Lines 32-51: Hand-written regex patterns for event type detection
// Lines 84-94: parseMonth() — manual regex over month name arrays
// Lines 96-120: parseDayOfMonth() — manual regex for day extraction
// Lines 127-198: parseRelativeDate() — hand-coded relative date patterns
// Lines 246-262: parseGuestCount() — regex patterns for "for N guests"
// Lines 264-340: parseVenue() — regex venue extraction with stop words
// Lines 390-444: parseNaturalLanguageEvent() — pure regex orchestration, no AI
// Line 484: const parsed = parseNaturalLanguageEvent(originalInput, referenceDate);
// No imports from "ai", "@ai-sdk/*", "openai", or any LLM library
```
- Planning doc: `planning/workflows.md` line 11: "AI-assisted event setup (via `ai-event-setup` manifest) pre-fills details"
- E2e test: `e2e/ai-event-setup-e2e.spec.ts` — entire suite branded as "AI Event Setup"
- Contrast: `apps/api/app/api/ai/suggestions/route.ts` imports `openai` and `generateText` from `ai` SDK — this route does not

### Why this matters
Users (and sales/engineering teams) see "AI Event Setup" and expect intelligent NLP understanding — the ability to handle varied phrasing, ambiguous inputs, context from conversation history, and complex event specifications. What they get is a brittle regex parser that fails on any input outside its ~15 hardcoded patterns. A user typing "I need catering next Friday the 13th for about fifty people at my sister's place" will get a partial parse with wrong confidence scores, while the "AI" branding creates false expectations. This is feature claim mismatch — the name promises intelligence, the code delivers grep.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.ai_branded_regex_parser",
  "title": "AI-branded route uses only regex, no LLM/AI SDK calls",
  "category": "feature_claim_mismatch",
  "severity": "medium",
  "confidence": 0.92,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "route path or directory contains 'ai-' or '/ai/' prefix",
    "file contains extensive RegExp patterns (>= 5 distinct regex literals)",
    "file does NOT import from 'ai', '@ai-sdk/*', 'openai', 'anthropic', '@anthropic-ai/*', 'google', '@google/*' (AI SDKs)"
  ],
  "negative_patterns": [
    "files that import any AI SDK alongside regex (regex may be preprocessing for AI)",
    "test files that mock AI responses",
    "utility files under shared lib that are clearly helper modules"
  ],
  "evidence_required": [
    "route or API handler file with ai-branded path",
    "absence of AI/LLM SDK imports",
    "presence of 5+ regex literals suggesting regex-only parsing logic"
  ],
  "false_positive_controls": [
    "skip files that import AI SDKs (regex may be pre-processing)",
    "skip files in test/ or __tests__/ directories",
    "skip utility/helper files that don't claim to be AI features",
    "require the ai-branding to be in the file path or API route, not just comments"
  ],
  "user_impact": "Users see 'AI-powered' feature labels and expect intelligent natural language understanding, but receive brittle regex parsing that fails on unexpected phrasing. This creates false expectations and erodes trust when the feature underperforms on real-world inputs.",
  "repair_guidance": "Either (1) integrate an actual LLM call for the parsing logic using the existing ai SDK and openai provider already used in ai/suggestions/route.ts, or (2) rename the feature to remove AI branding (e.g., 'smart-parse', 'quick-setup', 'template-setup') to accurately reflect the regex-based implementation.",
  "example_source": {
    "file": "apps/api/app/api/ai-event-setup/parse/route.ts",
    "line_or_snippet": "// Line 16: 'Natural Language Event Parsing Logic' — 532 lines of pure regex, no AI SDK imports, route path branded as /api/ai-event-setup/"
  }
}
```

### Implementation note
Build a cross-file detector: (1) scan route handler files whose directory path contains `/ai-` or `/ai/` as a path segment, (2) for each matched file, check import statements for any known AI SDK package names (ai, @ai-sdk/openai, @ai-sdk/anthropic, openai, @anthropic-ai/sdk, google/generative-ai), (3) count distinct RegExp literals in the file body, (4) if AI SDK imports are absent AND regex count >= 5, flag as feature_claim_mismatch. Exclude test files and utility modules. The rule should also check planning/docs for matching ai-branding language to strengthen the mismatch signal. Official docs not required: generic implementation-evidence rule.
---

## [2026-05-06 19:58] Rule Discovery — skeleton_crud.phantom_database_table_unwired

### Finding
The `iot_alert_rules` table exists as a fully-structured PostgreSQL table with 16 columns, foreign keys, indexes, and a comment stating its purpose is "for automated alert configuration." However, no Prisma model maps to it, no API route provides CRUD operations for it, no background worker or cron job evaluates its rules against incoming sensor data, and no UI page exists to manage alert rules. The only code references are in the trash/restore endpoints listing soft-deleted entities. Meanwhile, the `iot_alerts` table has an `alert_rule_id` column designed to reference it, but alerts are generated using hardcoded probe min/max thresholds in the readings route instead of configurable rules. This is a phantom database table — schema and infrastructure built for a feature that was never wired to application code.

### Evidence
- File: `packages/database/prisma/migrations/20260305000000_add_iot_kitchen_monitoring/migration.sql` (lines 51-92)
- Snippet:
```sql
-- Create iot_alert_rules table for automated alert configuration
CREATE TABLE "tenant_kitchen"."iot_alert_rules" (
    "tenant_id" UUID NOT NULL,
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sensor_type" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION,
    "threshold_min" DOUBLE PRECISION,
    "threshold_max" DOUBLE PRECISION,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "alert_action" TEXT NOT NULL DEFAULT 'notification',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notify_roles" TEXT[] NOT NULL DEFAULT '{}',
    "notify_channels" TEXT[] NOT NULL DEFAULT '{"in_app"}',
    ...
);
```
- File: `apps/api/app/api/kitchen/iot/readings/route.ts` (lines 100-128) — uses hardcoded `probe.minTemp`/`probe.maxTemp` instead of evaluating `iot_alert_rules`
- No Prisma model for `iot_alert_rules` in `packages/database/prisma/schema.prisma`
- No API route files matching `alert-rules` or `alertRule` in `apps/api/app/api/`
- No UI pages matching `alert-rules` or `alertRule` in `apps/app/`

### Why this matters
The database advertises a configurable, role-aware, multi-channel alert rule engine (with `notify_roles`, `notify_channels`, `alert_action`, `duration_ms`, `condition` fields). Users who inspect the schema or migration history would reasonably assume this feature works. In reality, alerts are generated using only static probe thresholds — users cannot create custom rules, assign notifications to specific roles, or configure alert actions. If a food safety audit asked "can I configure temperature alert rules per equipment?" the schema says yes, but the application says no.

### Proposed detector rule
```json
{
  "id": "skeleton_crud.phantom_database_table_unwired",
  "title": "Phantom database table — migrated but no Prisma model, API route, or worker consumes it",
  "category": "skeleton_crud",
  "severity": "medium",
  "confidence": 0.92,
  "detector_type": "cross_file",
  "language_targets": ["sql", "prisma", "typescript", "any"],
  "patterns": [
    "CREATE TABLE in migration SQL with comment mentioning 'rule', 'config', 'notification', 'automation', or 'alert'",
    "Table referenced by foreign key in another table (e.g. alert_rule_id column)",
    "No matching Prisma model in schema.prisma",
    "No API route files in route directories matching the table name (snake_case or camelCase)",
    "No worker/cron references in codebase"
  ],
  "negative_patterns": [
    "Tables prefixed with _prisma_migrations",
    "Tables that are pure join/pivot tables",
    "Tables referenced in Prisma @@map",
    "Raw SQL query references (database.$queryRaw) to the table",
    "Views, materialized views, or trigger-function tables"
  ],
  "evidence_required": [
    "Migration SQL creating the table with business-meaningful columns",
    "Absence of Prisma model mapping",
    "Absence of API route files",
    "Absence of worker/cron/trigger code referencing the table",
    "Presence of foreign key reference from another table confirming intended use"
  ],
  "false_positive_controls": [
    "Exclude tables only referenced via $queryRaw or $executeRaw (intentionally unmapped)",
    "Exclude tables that have matching API routes in any format",
    "Exclude tables under 3 business-meaningful columns (could be utility/join tables)",
    "Require foreign key evidence to confirm the table was designed for active use"
  ],
  "user_impact": "Users and auditors see a feature in the database schema that doesn't exist in the application. Configurable alert rules appear supported but are not — leading to false confidence in monitoring capabilities.",
  "repair_guidance": "Either (a) create a Prisma model, CRUD API routes, a UI management page, and a rule-evaluation engine that processes incoming readings against active rules, or (b) if the feature is deprioritized, add a schema comment marking the table as deprecated/unused and remove the foreign key reference from iot_alerts.alert_rule_id.",
  "example_source": {
    "file": "packages/database/prisma/migrations/20260305000000_add_iot_kitchen_monitoring/migration.sql",
    "line_or_snippet": "-- Create iot_alert_rules table for automated alert configuration\nCREATE TABLE \"tenant_kitchen\".\"iot_alert_rules\" ("
  }
}
```

### Implementation note
Build a cross-file detector: (1) scan all migration SQL files for CREATE TABLE statements with business-meaningful comments (containing keywords like 'rule', 'config', 'notification', 'automation', 'alert'), (2) extract the table name and its snake_case/camelCase variants, (3) check if a Prisma model exists in schema.prisma mapping to the table name (via @@map or model name convention), (4) check if any API route file path segments match the table name, (5) check if any TypeScript file references the table name in raw queries ($queryRaw, $executeRaw, sql tagged template), (6) check if any other migration has a foreign key referencing the table, (7) flag if the table has no Prisma model, no API routes, and no raw query references, but does have a foreign key from another table. This indicates a designed-but-unwired feature. Official docs not required: generic implementation-evidence rule.
---

---
## [2026-05-07 15:30] Rule Discovery — placeholder.forecasting_core_formula_is_constant

### Finding
The `inventory-forecasting.ts` module presents a full-featured depletion forecasting and reorder suggestion service with confidence levels, accuracy tracking, and batch processing. However, the core per-SKU event usage projection — the function that determines how much of a specific inventory item each upcoming event will consume — uses a single hardcoded constant: `guestCount * 0.1` units per event, regardless of the SKU. The function `getUpcomingEventsUsingInventory` accepts `_sku` as a parameter but never uses it (underscore-prefixed = intentionally ignored). The code explicitly comments "In production, this would be based on actual menu items and recipes."

The database already has `Recipe`, `RecipeIngredient`, `Menu`, and `MenuDish` models that could connect events to specific ingredient usage. The Event model has `eventDate` and `guestCount` fields that are used, but no relation to menus or recipes exists on the Event model, meaning even the correct implementation would need a join path that doesn't exist yet.

Additionally, the confidence bounds saved to the database are deterministic ±10% (`forecastValue * 0.9` and `forecastValue * 1.1`) regardless of the actual confidence level or variability — making the "high/medium/low" confidence label and the stored bounds disconnected from any statistical model. The MAPE calculation in `getForecastAccuracyMetrics` uses a hardcoded 30-day baseline assumption (`averageErrorDays / 30 * 100`) rather than the actual forecast horizon.

### Evidence
- File: `apps/api/app/lib/inventory-forecasting.ts`
- Snippet (core fake calculation):
```typescript
async function getUpcomingEventsUsingInventory(
  tenantId: string,
  _sku: string,  // <-- accepted but never used
  horizonDays: number
): Promise<Array<{ eventId: string; eventName: string; startDate: Date; usage: number }>> {
  // ...
  const eventUsage = events.map((event) => ({
    eventId: event.id,
    eventName: event.title || `Event ${event.id}`,
    startDate: event.eventDate,
    // Simplified usage calculation: 0.1 units per guest per event
    // In production, this would be based on actual menu items and recipes
    usage: Math.ceil((event.guestCount || 0) * 0.1),
  }));
  return eventUsage;
}
```
- Snippet (deterministic confidence bounds):
```typescript
const forecastValue = point.projectedStock;
const lowerBound = forecastValue * 0.9;
const upperBound = forecastValue * 1.1;
```
- Prisma schema evidence: `model Recipe` (schema.prisma:1037), `model RecipeIngredient` (schema.prisma:1095), `model Menu` (schema.prisma:1216), `model MenuDish` (schema.prisma:1238) — all exist but are never queried by the forecasting module.
- The `calculateConfidenceLevel` function accepts `_currentStock` and `_projectedUsage` as parameters but never uses them (lines 493-494).

### Why this matters
A catering company relying on this forecasting service will get identical depletion predictions for every SKU — salmon, napkins, champagne, and ice all deplete at the same rate per guest. Reorder suggestions will recommend the same order quantities regardless of what's actually needed. The confidence bounds provide false precision (±10%) that has no statistical basis. When the system reports "high confidence" depletion in 12 days, the real depletion could be anywhere — the number is meaningless because the underlying usage rate is a made-up constant. This could lead to over-ordering some items and under-ordering others, directly impacting food costs and event quality.

### Proposed detector rule
```json
{
  "id": "placeholder.forecasting_core_formula_is_constant",
  "title": "Forecasting/analytics service uses hardcoded constant as core business formula",
  "category": "placeholder",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "function accepting _parameter (underscore-prefixed unused) that should correlate output to input",
    "hardcoded magic number multiplied by entity count (e.g., guestCount * 0.1) inside a forecasting/prediction/estimation function",
    "'in production' / 'simplified' comments near core calculation logic",
    "deterministic confidence bounds (value * 0.9 / value * 1.1) disconnected from variability data"
  ],
  "negative_patterns": [
    "hardcoded constants in utility/math libraries not claiming business prediction",
    "test fixtures and mock data generators",
    "functions explicitly named 'mock', 'stub', 'dummy', or 'fake'"
  ],
  "evidence_required": [
    "function in a forecasting/prediction/analytics module with business-meaningful name",
    "underscore-prefixed parameter that should drive output but doesn't",
    "hardcoded multiplier applied to entity count as the sole usage/consumption driver",
    "comment acknowledging this is a placeholder or simplified version",
    "related domain models (Recipe, Menu, etc.) exist in the schema but are not queried"
  ],
  "false_positive_controls": [
    "exclude files under __tests__/, mocks/, fixtures/, or with 'test' in filename",
    "exclude functions with fewer than 5 lines of business logic",
    "require at least one 'in production' / 'simplified' / 'TODO' comment near the constant"
  ],
  "user_impact": "Forecasting service produces meaningless predictions — all inventory items get identical depletion rates regardless of actual usage. Reorder suggestions are wrong. Confidence levels and bounds provide false precision that could mislead purchasing decisions.",
  "repair_guidance": "Replace the hardcoded 0.1 multiplier with actual per-SKU usage derived from RecipeIngredient quantities joined to Event menus. Build an Event-to-Menu relationship in the schema. Calculate confidence bounds from the historical variability data already computed by getHistoricalUsage() instead of applying a flat ±10%. Use the _currentStock and _projectedUsage parameters in calculateConfidenceLevel or remove them.",
  "example_source": {
    "file": "apps/api/app/lib/inventory-forecasting.ts",
    "line_or_snippet": "usage: Math.ceil((event.guestCount || 0) * 0.1),"
  }
}
```

### Implementation note
Build a hybrid detector: (1) regex scan for functions in forecasting/prediction/analytics files that contain underscore-prefixed parameters alongside a hardcoded multiplier on an entity count field (guestCount, attendeeCount, orderCount, etc.), (2) check for 'in production' / 'simplified' / 'for now' comments within 5 lines of the multiplier, (3) cross-reference with Prisma schema for domain models that should be joined (Recipe, Menu, etc.) but aren't imported, (4) flag deterministic confidence bound patterns (value * 0.9 / value * 1.1) in the same file. Official docs not required: generic implementation-evidence rule.
---
# SlopScope rule discovery (continued)

Rotated from previous log at 2026-05-07T03:05:00Z. Archive: `SLOPSCOPE_RULE_DISCOVERY_ARCHIVE/SLOPSCOPE_RULE_DISCOVERY_2026-05-07_030500_UTC.md`

---
## [2026-05-07 10:31] Rule Discovery — feature_claim_mismatch.dead_validation_module_unwired_to_routes

### Finding
A 433-line validation module (`apps/api/app/api/events/contracts/validation.ts`) exports six validation functions that implement thorough business rule enforcement for contract operations — signature data validation, contract access checks, business rule validation, status transition guards, expiration checks, and contract number generation. Only one export from this file (`CONTRACT_STATUSES`, a constant array) is actually imported by any route handler. All six validation functions are dead code: `validateSignatureData`, `validateContractAccess`, `validateContractBusinessRules`, `validateContractTransition`, `isContractExpired`, and `generateContractNumber`. The actual contract routes delegate to the manifest runtime for validation, meaning this module creates a false impression of safety — a developer reading this file would assume these guards are active in production, but they are not.

### Evidence
- File: `apps/api/app/api/events/contracts/validation.ts`
- Snippet:
  ```typescript
  // Line 257 — exported but never imported anywhere:
  export function validateSignatureData(
    data: unknown
  ): asserts data is ContractSignatureData { ... }

  // Line 361 — exported but never imported anywhere:
  export function validateContractAccess(
    contract: { tenantId: string; eventId?: string; ... },
    tenantId: string,
    requiredStatus?: ContractStatus[]
  ): void { ... }

  // Line 385 — exported but never imported anywhere:
  export function validateContractBusinessRules(
    contract: { status: ContractStatus; expiresAt?: string | Date | null; ... },
  ): void { ... }

  // Line 338 — exported but never imported anywhere:
  export function generateContractNumber(_tenantId: string): string { ... }
  ```
- Cross-file proof: grep for imports of these functions across the entire `apps/api/` codebase returns only definitions in `validation.ts` and one import of `CONTRACT_STATUSES` in `contracts/route.ts:15`.

### Why this matters
Contract operations (signing, status transitions, expiration) are legally and financially sensitive. A catering company relying on this system could believe that signature data is validated (email format, signer name non-empty, signature date not in the future, etc.) or that contract transitions are guarded (can't send a signed contract, can't cancel an expired contract). In reality, none of these guards execute. The manifest runtime may have its own guards, but the existence of this dead validation module masks the actual enforcement surface and could lead to incorrect assumptions during code review or security audits.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.dead_validation_module_unwired_to_routes",
  "title": "Exported validation functions in domain module never imported by any route handler",
  "category": "feature_claim_mismatch",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "export function validate\\w+\\(",
    "export function \\w+Validation\\(",
    "export function assert\\w+\\(",
    "export function check\\w+\\("
  ],
  "negative_patterns": [
    "index.ts barrel re-exports",
    "test files importing from validation",
    "type-only exports (export type)",
    "functions imported by middleware or interceptor files"
  ],
  "evidence_required": [
    "validation.ts (or similar) file with 3+ exported validation functions",
    "zero imports of those functions from route handlers or middleware",
    "only constant/type imports from the same file by routes"
  ],
  "false_positive_controls": [
    "Barrel re-exports that are consumed indirectly through index.ts",
    "Utility libraries where functions are intentionally standalone",
    "Validation functions called within the same file by a higher-level exported function",
    "Functions imported by test files only (still dead in production)"
  ],
  "user_impact": "Critical business validation logic appears to exist but never executes. Contract signatures may lack email/date validation, status transitions may lack guard enforcement, and financial references may use insecure random generation — all while the codebase visually suggests these checks are active.",
  "repair_guidance": "For each dead validation function: (1) determine if the manifest runtime guard covers the same invariant, (2) if yes, remove the dead function and add a comment noting the manifest handles it, (3) if no, wire the validation function into the route handler or manifest guard. Additionally, add a lint rule or CI check that flags exported functions with zero production imports.",
  "example_source": {
    "file": "apps/api/app/api/events/contracts/validation.ts",
    "line_or_snippet": "export function validateSignatureData(\n  data: unknown\n): asserts data is ContractSignatureData {"
  }
}
```

### Implementation note
This detector should use cross-file analysis: first identify files matching `validation.ts` naming pattern in API route directories, then check that exported functions from those files are imported by at least one route handler or middleware file. Functions only imported by test files or not imported at all should be flagged. A TypeScript AST approach could parse export declarations and then search for import statements referencing them across the codebase.
---

## [2026-05-07 10:50] Rule Discovery — feature_claim_mismatch.dead_navigation_buttons_no_onpress

### Finding
The mobile app's Settings screen renders four `TouchableOpacity` elements under a "Support" section — "Help Center", "Contact Support", "Privacy Policy", and "Terms of Service" — that present as tappable navigation links (chevron icon, full-width row, matching the style of functional buttons like "Clear Cache" above them) but have zero `onPress` handler. In React Native, `TouchableOpacity` without `onPress` still renders with visual press feedback (opacity animation), creating the impression the button is wired when it is completely inert. A user tapping these will see a brief opacity flash and nothing else — no navigation, no modal, no alert. This is shipped UI, not a development placeholder in the code comments.

### Evidence
- File: `apps/mobile/src/screens/SettingsScreen.tsx`
- Snippet:
  ```tsx
  // Line 351 — no onPress prop:
  <TouchableOpacity style={styles.settingRow}>
    <Text style={styles.settingLabel}>Help Center</Text>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>

  // Line 356 — no onPress prop:
  <TouchableOpacity style={styles.settingRow}>
    <Text style={styles.settingLabel}>Contact Support</Text>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>

  // Line 361 — no onPress prop:
  <TouchableOpacity style={styles.settingRow}>
    <Text style={styles.settingLabel}>Privacy Policy</Text>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>

  // Line 366 — no onPress prop:
  <TouchableOpacity style={styles.settingRow}>
    <Text style={styles.settingLabel}>Terms of Service</Text>
    <Text style={styles.chevron}>›</Text>
  </TouchableOpacity>
  ```
- Contrast with functional button on line 323: `<TouchableOpacity onPress={handleClearCache} style={styles.settingRow}>`

### Why this matters
Users see four support links that look identical to working navigation elements. Tapping them produces a brief visual press animation (React Native default `TouchableOpacity` behavior) but nothing happens. For a catering business app, "Contact Support" and "Privacy Policy" are legally relevant — a customer unable to access privacy policy or contact support through the app could be a compliance issue depending on jurisdiction. The dead buttons erode trust and make the app feel unfinished.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.dead_navigation_buttons_no_onpress",
  "title": "TouchableOpacity/Pressable elements with navigation-like children but no onPress handler",
  "category": "feature_claim_mismatch",
  "severity": "medium",
  "confidence": 0.88,
  "detector_type": "ast",
  "language_targets": ["tsx"],
  "patterns": [
    "<TouchableOpacity(?![^>]*onPress)",
    "<Pressable(?![^>]*onPress|[^>]*android_ripple)",
    "TouchableOpacity style={styles",
    "chevron.*›"
  ],
  "negative_patterns": [
    "TouchableOpacity used purely as layout container without text children",
    "disabled={true} explicitly set",
    "Elements inside non-mobile frameworks (e.g., web-only touchable polyfills)",
    "Storybook or test fixture files"
  ],
  "evidence_required": [
    "JSX file with TouchableOpacity or Pressable without onPress prop",
    "Element contains Text children suggesting navigation or action (links, labels with chevron)",
    "File is in a screens/ or components/ directory (not test/storybook)"
  ],
  "false_positive_controls": [
    "Containers using TouchableOpacity as a styling wrapper with no text content",
    "Elements explicitly disabled via disabled prop",
    "Elements where onPress is set via spread props (...props)",
    "Gesture handler elements where interaction is handled by child gesture components"
  ],
  "user_impact": "Users tap buttons that look interactive (chevron icons, matching styling with functional buttons) but nothing happens. For support/legal links this is a compliance risk and trust erosion. The React Native press animation creates a false expectation of action.",
  "repair_guidance": "For each dead button: either (1) wire it to real navigation (Linking.openURL for privacy policy, support email link, etc.), (2) replace with a non-interactive View if the feature is intentionally deferred, or (3) remove the section entirely. Add a TODO with a tracking ticket if deferring. Consider an ESLint rule that flags TouchableOpacity without onPress in production screen files.",
  "example_source": {
    "file": "apps/mobile/src/screens/SettingsScreen.tsx",
    "line_or_snippet": "<TouchableOpacity style={styles.settingRow}>\n          <Text style={styles.settingLabel}>Help Center</Text>\n          <Text style={styles.chevron}>›</Text>\n        </TouchableOpacity>"
  }
}
```

### Implementation note
AST-based detector: parse TSX files in mobile app directories, find all JSX elements named `TouchableOpacity` or `Pressable`, check for absence of `onPress` attribute. Then check if the element contains Text children with navigation-indicative content (chevron characters, link-like labels). Flag elements in screens/ or components/ directories. A simpler regex version could look for `<TouchableOpacity` followed by content lines without `onPress=` appearing before the closing `>`, but AST is more reliable for avoiding false positives from spread props.
---

## [2026-05-07 11:31] Rule Discovery — dashboard_illusion.write_service_no_callers

### Finding
The `activity-feed-service.ts` file exports 6 write functions (`createActivity`, `createActivities`, `recordEntityChange`, `recordAIApproval`, `recordCollaboratorAction`, `recordSystemEvent`) designed to populate the `ActivityFeed` table. The Prisma model exists (with 6 indexes), two read-only API routes exist (`/api/activity-feed/list` and `/api/activity-feed/stats`), and a full frontend with polling exists (`activity-feed-client.tsx` with `ActivityFeedClient` and `ActivityTimelineWidget`). Tests cover only the read endpoints. **Zero callers** import or invoke any of the write functions anywhere in the entire API codebase. The activity feed will always display "No recent activity" for every tenant.

### Evidence
- File: `apps/api/app/lib/activity-feed-service.ts`
- Snippet:
  ```ts
  export async function createActivity(input: ActivityCreateInput): Promise<void> {
    await database.activityFeed.create({ data: { ... } });
  }
  export async function recordEntityChange(...): Promise<void> { ... }
  export async function recordAIApproval(...): Promise<void> { ... }
  export async function recordCollaboratorAction(...): Promise<void> { ... }
  export async function recordSystemEvent(...): Promise<void> { ... }
  ```
- No imports found: `grep -r "from.*activity-feed-service" apps/api/` returns 0 results
- No cross-references to exported functions found outside the defining file
- Prisma model: `packages/database/prisma/schema.prisma:2961` — `model ActivityFeed` with proper indexes
- Frontend: `apps/app/app/(authenticated)/analytics/components/activity-feed-client.tsx` — polls `/api/activity-feed/list` every 30s when `enableRealtime` is true
- Stats route: `apps/api/app/api/activity-feed/stats/route.ts` — reads from same table

### Why this matters
The analytics dashboard's activity feed is a prominent UI feature that promises "real-time updates and filtering capabilities" for entity changes, AI approvals, and collaborator actions. Users navigating to the analytics page see an empty feed and assume nothing is happening in their account. Meanwhile, the backend is performing real work (creating events, approving AI plans, etc.) but never recording it. This is a complete read-only illusion — infrastructure without data flow.

### Proposed detector rule
```json
{
  "id": "dashboard_illusion.write_service_no_callers",
  "title": "Write service exported but never imported (dead data pipeline)",
  "category": "dashboard_illusion",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "cross_file",
  "language_targets": ["typescript"],
  "patterns": [
    "service files exporting async write functions (create*, record*, log*)",
    "corresponding read API routes or frontend components consuming the same data",
    "zero imports of the write service from any route, middleware, or cron handler"
  ],
  "negative_patterns": [
    "functions imported by test files only (test-only consumers should still count as weak evidence)",
    "barrel exports that re-export from index files",
    "functions used within the same file (internal helpers)",
    "dynamically imported via require() or import()"
  ],
  "evidence_required": [
    "service file with exported write functions targeting a specific DB table/collection",
    "grep for import paths matching the service file across all non-test source files returns 0",
    "corresponding read endpoint or frontend component exists that would display the data"
  ],
  "false_positive_controls": [
    "exclude newly created service files (check git blame for age < 7 days)",
    "exclude files in monorepo packages that are consumed by other packages via package.json exports",
    "check for dynamic imports using string patterns matching the module path",
    "allow test-only imports if they exercise the write path with meaningful assertions"
  ],
  "user_impact": "Users see an always-empty analytics feed, timeline, or activity dashboard even though real system events are occurring. This erodes trust in the product and makes the analytics page appear broken or useless.",
  "repair_guidance": "Instrument key domain events (entity CRUD, AI plan approvals, collaborator actions, system events) to call the appropriate record* functions from activity-feed-service.ts. Priority call sites: command-board write routes, AI approval routes, and manifest command handlers. Wire these calls into existing transaction boundaries to ensure atomicity with the primary write.",
  "example_source": {
    "file": "apps/api/app/lib/activity-feed-service.ts",
    "line_or_snippet": "export async function createActivity(input: ActivityCreateInput): Promise<void> {\n  await database.activityFeed.create({ data: { ... } });\n}"
  }
}
```

### Implementation note
Cross-file detector: For each `.ts` file in service/utility directories, collect all exported `async function` names that start with `create`, `record`, `log`, `save`, or `write`. Then search the entire codebase (excluding the defining file itself and `.test.`/`.spec.` files) for import statements that reference the module path. If zero imports found AND a corresponding read endpoint or frontend component references the same entity/table name, flag as a dead data pipeline. Weight severity by the prominence of the consumer (dedicated frontend page = high, minor component = low).
---
---
## [2026-05-07 05:05] Rule Discovery — skeleton_crud.hardcoded_validation_always_passes

### Finding
Two exported validation functions in the payment-methods module (`isCardExpired` and `isPaymentMethodUsable`) are hardcoded to always return `false` and `true` respectively, with inline comments explicitly admitting the implementation is incomplete because the Prisma schema lacks the necessary fields. Meanwhile, the `[id]/route.ts` actively writes `EXPIRED` and `FLAGGED` status values to the `status` column — but nothing ever reads those statuses back to gate payment usage. These functions are dead code (zero imports across the entire monorepo), creating the illusion of safety checks that do not exist.

### Evidence
- File: `apps/api/app/api/accounting/payment-methods/validation.ts`
- Lines 189-197:
  ```typescript
  // Simplified helper - always returns true since we don't have expiry/status fields
  export function isCardExpired(): boolean {
    return false;
  }

  // Simplified helper - always returns true since we don't have status fields
  export function isPaymentMethodUsable(): boolean {
    return true;
  }
  ```
- File: `apps/api/app/api/accounting/payment-methods/[id]/route.ts`
- Lines 201, 214, 227 actively write `VERIFIED`, `FLAGGED`, `EXPIRED` status values
- File: `packages/database/prisma/schema.prisma`
- Line 4460: `status String @default("ACTIVE") @db.Text` — free-text, no enum constraint
- Zero imports of `isCardExpired` or `isPaymentMethodUsable` anywhere in the monorepo

### Why this matters
This is a financial safety issue. The codebase stores payment method statuses (EXPIRED, FLAGGED) and has validation function signatures that suggest they check these statuses, but the actual check is a hardcoded pass. Any code path that processes payments and relies on these helpers (or a future developer who discovers them and starts using them) would get a false sense of security. Currently the functions are dead code, which means the status column is written to but never enforced — flagged or expired cards could theoretically be used for charges with no server-side gate.

### Proposed detector rule
```json
{
  "id": "skeleton_crud.hardcoded_validation_always_passes",
  "title": "Exported validation function returns hardcoded boolean",
  "category": "skeleton_crud",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "export function is[A-Z].*\\(.*\\).*: boolean \\{",
    "return (true|false);",
    "Simplified helper",
    "since we don't have",
    "always returns"
  ],
  "negative_patterns": [
    "// Email is optional",
    "// Phone is optional",
    "// field is optional",
    "return true; // .*optional",
    "return false; // disabled",
    "isDev|isDebug|isTest",
    "stub|mock|fixture"
  ],
  "evidence_required": [
    "Function is exported (export function or export const)",
    "Function returns a literal boolean (true or false) with no conditions",
    "Function name implies a dynamic check (is*, has*, can*, should*, validate*)",
    "Inline comment admits incomplete implementation or missing fields",
    "Zero imports of the function across the codebase (dead code confirmation)"
  ],
  "false_positive_controls": [
    "Exclude test files and mock directories",
    "Exclude functions in node_modules or generated clients",
    "Allow optional-field patterns like 'return true; // field is optional'",
    "Exclude feature-flag stubs that explicitly say 'disabled'"
  ],
  "user_impact": "Payment methods with EXPIRED or FLAGGED status can be used for transactions because no server-side validation gate exists. A future developer importing these helpers would get a false pass on every call.",
  "repair_guidance": "Either (a) implement real checks that read the status column and compare against expiry dates, or (b) delete the dead-code functions and add TODO comments at call sites where payment method validity should be checked. The status column should be migrated to an enum type with ACTIVE/EXPIRED/FLAGGED/VERIFIED values.",
  "example_source": {
    "file": "apps/api/app/api/accounting/payment-methods/validation.ts",
    "line_or_snippet": "// Simplified helper - always returns true since we don't have expiry/status fields\nexport function isCardExpired(): boolean {\n  return false;\n}\n\n// Simplified helper - always returns true since we don't have status fields\nexport function isPaymentMethodUsable(): boolean {\n  return true;\n}"
  }
}
```

### Implementation note
Detector should use AST parsing to find exported functions whose body is a single return statement with a literal boolean, then check if the function name implies dynamic behavior (is/has/can/validate prefix). Cross-file phase should verify zero imports. The comment patterns ("Simplified helper", "since we don't have", "always returns") serve as strong confirmation signals. This is a hybrid rule: AST for the structural pattern, regex for the comment signals, cross-file search for dead-code confirmation.
---

## [2026-05-07] SlopScope Fix Batch — Resolved Findings

### Fixed: error_handling_theater.abandoned_implementation_breaks_endpoint
- **File**: `apps/api/app/api/crm/scoring/[id]/route.ts`
- **Root cause**: PUT handler had abandoned dynamic SQL code (lines 54-129) that always threw a SQL syntax error. The `.reduce()` always returned `[]`, `Prisma.raw()` injected unbound `$N` placeholders, and template interpolation produced invalid parameter syntax. A working COALESCE-based approach existed at lines 131-144 but was never reached because the broken code executed first.
- **Fix**: Removed the entire broken dynamic SQL block (lines 54-129), keeping only the COALESCE-based `$executeRaw` approach which correctly uses Prisma.sql parameterized templates.
- **Status**: RESOLVED

### Fixed: phantom_columns.finance_analytics_ledger_query
- **File**: `apps/api/app/api/analytics/finance/route.ts`
- **Root cause**: `fetchLedgerData` queried `ec.total_value` and `ec.deposit_paid` from `event_contracts` table, but these columns don't exist in the `EventContract` Prisma model. The query would crash at runtime when the finance dashboard was accessed. Also used hardcoded `* 0.5` deposit multiplier instead of actual deposit data.
- **Fix**: Replaced phantom column references with real columns from the joined `events` table: `e.budget` for contract value, `e.deposit_amount` for deposits, `e.deposit_paid` for deposit status.
- **Status**: RESOLVED

### Fixed: automation_theater.cron_route_never_scheduled
- **File**: `apps/api/vercel.json`
- **Root cause**: Two cron routes existed in the codebase but were never scheduled in Vercel: `email-reminders` and `idempotency-cleanup`. They would never run in production.
- **Fix**: Added both to `vercel.json` crons array: `email-reminders` at `*/15 * * * *` (every 15 min), `idempotency-cleanup` at `0 3 * * *` (daily at 3am).
- **Note**: `contract-expiration-alerts` was already scheduled (AGENTS.md was stale).
- **Status**: RESOLVED

### Deferred: security_theater.rbac_permission_guard_never_wired_to_runtime
- **File**: `packages/manifest-adapters/src/permission-guard.ts` → `apps/api/lib/manifest-runtime.ts`
- **Status**: DEFERRED — architectural change requiring separate commit. The `createPermissionGuard` is well-tested but needs careful integration into `createManifestRuntime` with role policy loading.

### Pre-existing failures (not fixed this batch)
- `apps/api/__tests__/inventory/transfers/transfers.test.ts` — expects 500 on DB error, gets 400 (4 failures)
- Kitchen equipment routes reference missing `PrismaClient.equipment` model (11 TypeScript errors)
