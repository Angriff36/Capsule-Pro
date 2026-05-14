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
