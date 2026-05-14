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
