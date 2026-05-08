# SlopScope rule discovery (continued — prior entries archived)

---
## [2026-05-07 22:44] Rule Discovery — automation_theater.webhook_config_without_domain_event_producers

### Finding
The outbound webhook system allows users to configure webhooks for 11 entity types (`event`, `task`, `kitchen_task`, `prep_task`, `employee`, `client`, `proposal`, `contract`, `shipment`, `inventory_item`, `purchase_order`), but only kitchen-related routes (`kitchen_task`, `prep_task`, `waste_entry`, `recipe_version`) actually publish domain events to the outbox. Worse, the webhook trigger endpoint (`/api/integrations/webhooks/trigger`) that would fire these webhooks is never called by any application code — it's a dead endpoint. The outbox publisher sends events to Ably (realtime pub/sub), not to the outbound webhook system. The entire webhook CRUD + trigger + delivery-log + retry + auto-disable pipeline is fully built but completely disconnected from the application's domain events. Users configure webhooks expecting notifications, but they will never fire for most entity types.

### Evidence
- File: `apps/api/app/api/integrations/webhooks/route.ts` (lines 24-36)
  - Defines 11 `VALID_ENTITY_TYPES` for webhook entity filters
- File: `apps/api/app/api/integrations/webhooks/trigger/route.ts` (entire file, 224 lines)
  - Fully built webhook trigger with delivery logging, retry, auto-disable
  - Never imported or called by any other file in the codebase
- File: `apps/api/app/api/integrations/webhooks/trigger/route.ts` — grep for `webhooks/trigger` returns only the file's own comment
- File: `apps/api/app/outbox/publish/route.ts`
  - Outbox publisher sends to Ably realtime, not to the webhook system
- File: `apps/api/app/api/kitchen/tasks/shared-task-helpers.ts` (lines 310, 537)
  - Only kitchen routes create `outboxEvent` records
- Grep for `outboxEvent.create` across `apps/api/app/api` returns matches only in:
  - `kitchen/tasks/`, `kitchen/waste/entries/`, `kitchen/overrides/`, `lib/recipe-version-helpers.ts`
  - Zero matches in `events/`, `client/`, `proposals/`, `contracts/`, `shipments/`, `inventory/`, `purchase-orders/`, `employees/`

### Why this matters
Users invest time configuring outbound webhooks with URLs, secrets, entity type filters, and event type filters, believing they'll receive HTTP callbacks when their data changes. The UI presents this as a working integration feature with delivery logs and retry settings. In reality, for 8 of 11 entity types, no domain events are ever produced, and even for the 3 that do produce outbox events, the outbox publisher sends to Ably (realtime) — not to the webhook dispatch system. The webhook trigger endpoint exists but nothing invokes it. This is automation theater: the appearance of a working integration pipeline with no actual connection to domain events.

### Proposed detector rule
```json
{
  "id": "automation_theater.webhook_config_without_domain_event_producers",
  "title": "Webhook configuration accepts entity types that never produce domain events",
  "category": "automation_theater",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "VALID_ENTITY_TYPES or similar allowlist of entity types in webhook config routes",
    "outboxEvent.create or equivalent domain event publishing calls",
    "webhook trigger/dispatch routes that are never imported or called",
    "entity filter arrays that include types not covered by any event producer"
  ],
  "negative_patterns": [
    "Event producers that call the webhook trigger/dispatch endpoint",
    "Outbox publishers that also dispatch to webhook system",
    "Entity types in filter arrays that have matching outboxEvent.create calls"
  ],
  "evidence_required": [
    "Webhook config route with entity type allowlist (VALID_ENTITY_TYPES)",
    "Grep for outboxEvent.create (or equivalent) showing only subset of entity types produce events",
    "Grep for webhook trigger endpoint path showing zero callers",
    "Outbox publisher code showing it sends to realtime/pub-sub, not webhook dispatch"
  ],
  "false_positive_controls": [
    "Webhook systems that are triggered by external cron jobs or message queues (check for scheduled invocations)",
    "Entity types that publish events through middleware or ORM hooks rather than direct outboxEvent.create",
    "Systems where the outbox publisher itself dispatches to webhooks (not just realtime)"
  ],
  "user_impact": "Users configure outbound webhooks expecting real-time notifications when their data changes. Webhooks silently never fire, leading to missed integrations, broken automation workflows, and false confidence in the platform's integration capabilities.",
  "repair_guidance": "Either: (1) Wire domain event producers for all advertised entity types to call the webhook trigger endpoint or create outbox events consumed by a webhook dispatcher, (2) Remove entity types from the allowlist that don't produce events and clearly document which entity types are supported, or (3) Build a unified event pipeline where the outbox publisher dispatches to both realtime and webhooks.",
  "example_source": {
    "file": "apps/api/app/api/integrations/webhooks/route.ts",
    "line_or_snippet": "const VALID_ENTITY_TYPES = [\n  \"event\",\n  \"task\",\n  \"kitchen_task\",\n  \"prep_task\",\n  \"employee\",\n  \"client\",\n  \"proposal\",\n  \"contract\",\n  \"shipment\",\n  \"inventory_item\",\n  \"purchase_order\",\n];"
  }
}
```

### Implementation note
Detector should: (1) find webhook config routes with entity type allowlists, (2) grep the codebase for domain event producers (outboxEvent.create, emitEvent, etc.), (3) cross-reference to identify entity types in the allowlist that have zero event producers, (4) check if the webhook trigger/dispatch endpoint is actually called by any application code, (5) check if the outbox publisher dispatches to webhooks or only to realtime/pub-sub. Flag when entity types are advertised but have no event producers AND the trigger endpoint has no callers. This is a cross-file analysis that requires tracing data flow from entity mutations through event publishing to webhook dispatch.

---
## [2026-05-08 00:15] Rule Discovery — fake_integration.iot_system_without_device_connectivity

### Finding
The "Kitchen IoT" feature presents itself as a real-time temperature monitoring and probe management system — the page title is "Kitchen IoT", the meta description says "Real-time temperature monitoring, probe management, and IoT alerts", and the UI subtitle reads "Real-time temperature monitoring and probe management". However, the entire system is CRUD-only: there is no device connectivity layer whatsoever. All three API routes (`/api/kitchen/iot/probes`, `/api/kitchen/iot/readings`, `/api/kitchen/iot/alerts`) require Clerk user authentication, meaning actual IoT temperature probes have no way to push data. There is no MQTT broker integration, no Bluetooth Low Energy gateway, no unauthenticated webhook ingestion endpoint, no device SDK, and no IoT platform SDK (e.g., AWS IoT Core, Tuya, Thinger.io). The POST endpoint for recording temperature readings is protected behind `auth()`, so only logged-in browser users can create readings — not actual hardware probes. Furthermore, when an out-of-range temperature does trigger an alert (via a manually-entered reading), the alert is silently written to the database with a TODO comment acknowledging that the notification service is not yet implemented (`Tracked as capsule-pro/TODO:iot-notification-service`). The entire IoT feature is a manual data-entry CRUD app with no connection to any physical device.

### Evidence
- File: `apps/app/app/(authenticated)/kitchen/iot/page.tsx` (lines 8-10)
  - `title: "Kitchen IoT"` / `description: "Real-time temperature monitoring, probe management, and IoT alerts"`
- File: `apps/app/app/(authenticated)/kitchen/iot/iot-page-client.tsx` (lines 194, 196)
  - `<h1>Kitchen IoT</h1>` / `"Real-time temperature monitoring and probe management"`
- File: `apps/api/app/api/kitchen/iot/readings/route.ts` (lines 60-89)
  - POST endpoint requires `auth()` — no unauthenticated device ingestion path
- File: `apps/api/app/api/kitchen/iot/probes/route.ts` (lines 1-46)
  - GET/POST for probe management, all require `auth()`
- File: `apps/api/app/api/kitchen/iot/alerts/route.ts` (lines 97-99)
  - `// BLOCKER: Notification service not yet implemented. ... Tracked as capsule-pro/TODO:iot-notification-service`
- Grep for `mqtt`, `bluetooth`, `iot-device`, `probe-ingest`, `sensor.*connect` across entire codebase returns zero relevant results (only a default probe type string `"bluetooth"` in the probes creation endpoint)
- No unauthenticated routes exist under `apps/api/app/api/kitchen/iot/`

### Why this matters
Catering companies relying on this feature for food safety compliance (HACCP monitoring) would believe they have an IoT temperature monitoring system. In reality, it's a manual data-entry form — staff must manually type temperatures into a browser, which defeats the entire purpose of IoT monitoring. The alerts are database-only records that generate no notifications (push, email, or in-app), so even if someone manually enters an out-of-range temperature, no one is alerted. This is a compliance and food safety risk: the system creates a false sense of monitoring while providing no automated detection or notification.

### Proposed detector rule
```json
{
  "id": "fake_integration.iot_system_without_device_connectivity",
  "title": "IoT/hardware monitoring system with no device connectivity layer",
  "category": "fake_integration",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "tsx", "javascript"],
  "patterns": [
    "UI/page metadata claiming 'real-time' IoT/hardware monitoring",
    "API routes for sensor readings/probes/IoT data that all require user authentication",
    "Absence of MQTT/Bluetooth/WebSocket/device-SDK imports in the API layer",
    "Alert creation that only writes to database without sending notifications",
    "TODO/FIXME comments about notification service not being implemented in alert routes"
  ],
  "negative_patterns": [
    "Unauthenticated webhook or ingestion endpoints for device data",
    "MQTT/Bluetooth/WebSocket/device-SDK imports anywhere in the project",
    "Device provisioning or pairing flows",
    "IoT platform SDK configuration (AWS IoT Core, Tuya, Thinger.io, etc.)",
    "Push notification or email dispatch when alerts are created"
  ],
  "evidence_required": [
    "UI page with IoT/hardware monitoring claims (title, description, headings)",
    "API routes for readings/probes/alerts that all call auth() with no unauthenticated alternative",
    "Zero matches for device connectivity protocols (mqtt, bluetooth, websocket, device-sdk) in relevant API layer",
    "Alert creation code that only does database writes with no notification dispatch",
    "TODO comment acknowledging missing notification service"
  ],
  "false_positive_controls": [
    "Systems that use a separate microservice or edge gateway for device connectivity (check for service references)",
    "IoT features that explicitly document they are in 'manual mode' or 'coming soon' in the UI",
    "Systems where device data flows through a separate ingestion pipeline (e.g., cloud function triggered by IoT platform)"
  ],
  "user_impact": "Users believe they have automated IoT temperature monitoring for food safety compliance, but the system requires manual data entry and generates no alerts. This creates a false sense of safety and a compliance risk for HACCP-monitoring requirements in catering operations.",
  "repair_guidance": "Either: (1) Implement a real device connectivity layer — add an unauthenticated MQTT or HTTP webhook ingestion endpoint that temperature probes can push to, with device authentication via API key or certificate, (2) Integrate an existing IoT platform SDK (e.g., Thinger.io, Tuya, AWS IoT Core) to receive device telemetry, or (3) Honestly rebrand the feature as 'Temperature Log' or 'Manual Temperature Recording' without the IoT/real-time branding. Additionally, implement the notification service so alerts actually reach staff when out-of-range temperatures are detected.",
  "example_source": {
    "file": "apps/api/app/api/kitchen/iot/readings/route.ts",
    "line_or_snippet": "export async function POST(request: NextRequest) {\n  try {\n    const { orgId, userId } = await auth();\n    if (!(userId && orgId)) {\n      return NextResponse.json({ error: \"Unauthorized\" }, { status: 401 });\n    }\n    ...\n    const reading = await database.temperatureReading.create({\n      data: { tenantId, probeId, temperature },\n    });"
  }
}
```

### Implementation note
Detector should: (1) identify API route directories with IoT/sensor/hardware-monitoring naming (iot, probes, sensors, readings), (2) verify ALL routes in that directory require user authentication (auth() or equivalent) with no unauthenticated alternative, (3) grep the entire codebase for device connectivity protocol keywords (mqtt, bluetooth, ble, websocket, iot-core, thinger, tuya, particle, adafruit), (4) check the alert/notification creation path for database-only writes with no notification dispatch, (5) cross-reference with UI page metadata for "real-time" or "IoT" claims. Flag when all routes are authenticated CRUD, zero device connectivity imports exist, and UI claims real-time monitoring.

---
## [2026-05-08 01:30] Rule Discovery — security_theater.rbac_guard_never_wrapped_into_runtime

### Finding
The codebase contains a complete RBAC system — a permission checker (404 lines) with wildcard support, role inheritance, and caching; a permission guard (370 lines) that wraps a `RuntimeEngine` via Proxy to intercept `runCommand` calls and enforce permissions; role policy CRUD endpoints; and comprehensive tests (3 test files). However, the `createManifestRuntime` factory function (the single entry point used by all API routes and server actions) never wraps the runtime with `createPermissionGuard`. No API route or server action anywhere in the codebase imports or calls `createPermissionGuard`, `canExecuteCommand`, or `hasPermission`. The user's `role` field is available in the runtime context (some routes even pass `role: currentUser.role`), but the permission guard is never applied. The UI fetches role policies for display in the security settings page but never gates UI actions using `filterAuthorizedCommands` or `canExecuteCommand`. The entire RBAC system is fully built, tested, and exported — but completely disconnected from production code.

### Evidence
- File: `apps/api/lib/manifest-runtime.ts` (lines 55-67)
  - `createManifestRuntime` returns `createSharedRuntime(...)` with no `createPermissionGuard` wrapping
  - 20+ entity-specific convenience helpers (lines 74-341) all just call `createManifestRuntime` without permission enforcement
- File: `packages/manifest-adapters/src/manifest-runtime-factory.ts` (entire file, 488 lines)
  - Zero references to "permission", "Permission", "guard", or "Guard"
- File: `packages/manifest-adapters/src/permission-guard.ts` (370 lines)
  - `createPermissionGuard` wraps `RuntimeEngine` via Proxy, intercepts `runCommand`
  - Exported from package index (`packages/manifest-adapters/src/index.ts` line 3193)
  - Zero production imports outside its own package and test files
- File: `packages/manifest-adapters/src/permission-checker.ts` (404 lines)
  - `hasPermission`, `canExecuteCommand`, `filterAuthorizedCommands` all exported
  - Zero production imports outside test files
- Grep for `createPermissionGuard` in `apps/api/` and `apps/app/`: zero matches
- Grep for `canExecuteCommand` in `apps/api/` and `apps/app/`: zero matches
- Grep for `hasPermission` in `apps/api/app/api/`: zero matches
- File: `apps/api/app/api/kitchen/allergen-warnings/commands/acknowledge/route.ts` (line 53)
  - Demonstrates role is available and passed: `user: { id: currentUser.id, tenantId, role: currentUser.role }`
- File: `apps/app/app/(authenticated)/settings/security/page.tsx` (lines 406, 466)
  - UI fetches rolePolicies for display but never uses `canExecuteCommand` or `filterAuthorizedCommands` for UI gating

### Why this matters
Any authenticated user can execute any manifest command (create, update, delete) on any entity — events, clients, inventory, recipes, purchase orders — regardless of their assigned role. A `kitchen_staff` user could delete clients, approve purchase orders, or modify payroll settings. The system presents a fully-featured RBAC UI where admins can configure role permissions (grant/revoke permissions per role), and the permission guard code correctly implements these checks with wildcard support and caching. But the guard is never connected to the runtime, making the entire RBAC configuration surface a placebo. Admins invest time configuring granular permissions believing they control access, but no enforcement exists at any layer — not API routes, not server actions, not the manifest runtime.

### Proposed detector rule
```json
{
  "id": "security_theater.rbac_guard_never_wrapped_into_runtime",
  "title": "RBAC permission guard exported but never wired into runtime factory",
  "category": "security_theater",
  "severity": "critical",
  "confidence": 0.97,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "createPermissionGuard or equivalent guard wrapper function exported from a package",
    "RuntimeEngine or createManifestRuntime factory function that creates runtime instances",
    "Role policy CRUD endpoints (rolePolicy.grant, rolePolicy.revoke, rolePolicy.update)",
    "hasPermission / canExecuteCommand / filterAuthorizedCommands utility functions exported",
    "COMMAND_PERMISSION_MAP or similar command-to-permission mapping",
    "User context objects with optional role field (user.role)",
    "Comprehensive test files for permission guard (e.g., rbac-permission-guard.test.ts)"
  ],
  "negative_patterns": [
    "createPermissionGuard imported and called in the runtime factory or API route middleware",
    "canExecuteCommand called in API routes or server actions for pre-flight permission checks",
    "filterAuthorizedCommands used in UI components to conditionally render/hide action buttons",
    "Runtime factory function that wraps the engine with the permission guard before returning"
  ],
  "evidence_required": [
    "Permission guard wrapper function exists and is exported from its package",
    "Runtime factory function exists that creates RuntimeEngine instances",
    "Grep for permission guard import in runtime factory: zero results",
    "Grep for permission guard import in API routes: zero results",
    "Grep for canExecuteCommand/hasPermission in API routes: zero results",
    "Role policy CRUD endpoints exist (proving RBAC infrastructure is present)",
    "Role data is available in user context (role field passed to runtime)",
    "Test files exist for permission guard (proving the code works, just isn't connected)"
  ],
  "false_positive_controls": [
    "Exclude permission-checker imports that are clearly different functions (e.g., requestNotificationPermissions in mobile push handlers)",
    "Exclude test files when checking for production usage",
    "Exclude dist/ build artifacts",
    "Allow for middleware-based enforcement as an alternative to runtime wrapping (check for middleware files that call permission functions)",
    "Check for conditional enforcement flags that might disable RBAC in development only"
  ],
  "user_impact": "Any authenticated user can perform any action (create, update, delete) on any entity regardless of their assigned role. Admins who configure granular role permissions are misled into believing access control is enforced. This is a critical authorization bypass affecting every entity type in the system.",
  "repair_guidance": "The Ralph loop should: (1) modify `createManifestRuntime` in `apps/api/lib/manifest-runtime.ts` to accept an `enforcePermissions` option (default true), (2) after creating the runtime via `createSharedRuntime`, wrap it with `createPermissionGuard(runtime, { rolePolicies })`, (3) load role policies via `loadRolePolicies(database, tenantId)` and pass them to the guard, (4) do the same in `apps/app/lib/manifest-runtime.ts` for server actions, (5) add `canExecuteCommand` checks in API routes for non-manifest commands (direct Prisma CRUD routes), (6) add `filterAuthorizedCommands` usage in UI components for action button visibility. Do NOT implement this now — only record the rule.",
  "example_source": {
    "file": "apps/api/lib/manifest-runtime.ts",
    "line_or_snippet": "export async function createManifestRuntime(\n  ctx: GeneratedRuntimeContext\n): Promise<RuntimeEngine> {\n  return createSharedRuntime(\n    {\n      prisma: database,\n      log,\n      captureException,\n      telemetry: sentryTelemetry,\n    },\n    ctx\n  );\n}"
  }
}
```

### Implementation note
Detector should: (1) locate the runtime factory function that creates RuntimeEngine instances (e.g., `createManifestRuntime`), (2) verify a `createPermissionGuard` or equivalent wrapper exists in the same package or a sibling package, (3) grep all API routes and server actions for imports of the guard/checker functions, (4) grep the runtime factory itself for any reference to the permission guard, (5) verify role policy CRUD endpoints exist as evidence the RBAC infrastructure is intentionally present, (6) check that user context includes a `role` field, (7) verify test files exist for the permission guard (confirming it's production-intended code, not dead utility). Flag when the guard is exported, tested, role data is available, but zero production code imports the guard.

---
## [2026-05-08 02:15] Rule Discovery — automation_theater.sms_automation_rules_crud_without_engine

### Finding
The SMS automation system presents a complete UI for creating, editing, and managing SMS automation rules with trigger types (task_assigned, shift_reminder, inventory_low, etc.), recipient configs, priorities, and activation toggles. The backend CRUD API is fully functional. However, the automation engine (`sms-automation-engine.ts`) and its trigger functions (`sms-automation-triggers.ts`) are never exported from the package index (`packages/notifications/index.ts`) and are never imported by any cron job, webhook handler, event consumer, or application code. The engine and triggers exist as dead code — users configure rules expecting automated SMS dispatch, but no code path ever evaluates or executes them.

### Evidence
- File: `packages/notifications/sms-automation-engine.ts` (lines 73-108)
  - `evaluateAndExecuteRules()` — fully implemented rule evaluation and SMS dispatch
- File: `packages/notifications/sms-automation-triggers.ts` (lines 12, 47, 113, 154)
  - 10 exported trigger functions (triggerTaskAssignedSms, triggerTaskCompletedSms, etc.) that call evaluateAndExecuteRules
- File: `packages/notifications/index.ts` (lines 1-84)
  - Re-exports email triggers, SMS send utilities, webhook service — but does NOT re-export `sms-automation-engine` or `sms-automation-triggers`
- Grep for `sms-automation-triggers` returns 0 imports across entire codebase (only self-references)
- Grep for `evaluateAndExecuteRules` returns only the engine file itself and the triggers file — no application callers
- File: `apps/app/app/(authenticated)/settings/notifications/notifications-client.tsx` (line 710)
  - UI copy: "Create your first SMS automation rule to send notifications automatically"
- File: `apps/api/app/api/communications/sms/automation-rules/route.ts` and `[id]/route.ts`
  - Full CRUD for rules (create, read, update, soft-delete) with manifest runtime integration

### Why this matters
Users invest time configuring SMS automation rules — selecting trigger types (shift reminders, task assignments, inventory alerts), setting recipient types (employee, manager, role-based), writing custom messages with template variables, and setting priorities. The UI and API confirm successful creation with success responses. The automation engine code is fully written and would work if connected. But because the engine is never exported from its package and no application code imports the trigger functions, **no SMS will ever be sent**. Users believe they have working SMS automation when in reality they have a configuration database that nothing reads.

### Proposed detector rule
```json
{
  "id": "automation_theater.sms_automation_rules_crud_without_engine",
  "title": "Automation rules CRUD exists but engine/trigger is dead code (never imported)",
  "category": "automation_theater",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "Package index.ts re-exports related services but omits automation engine/triggers",
    "Engine or trigger files exist with exported functions that call evaluate/dispatch logic",
    "Zero imports of engine/trigger files from any application route, cron, or worker code",
    "CRUD API routes for automation rules with full create/read/update/delete support",
    "UI components presenting automation rules as a working feature with activation toggles"
  ],
  "negative_patterns": [
    "Engine/trigger files exported from package index and imported by application code",
    "Cron jobs or event handlers that call trigger functions",
    "Webhook handlers or middleware that invoke automation evaluation"
  ],
  "evidence_required": [
    "Automation engine file with evaluate/execute functions that is NOT in package index exports",
    "Trigger file with domain-specific trigger functions that is NOT imported anywhere outside its own file",
    "CRUD API routes for the same automation entity with no dispatch/execute endpoint",
    "UI component claiming the feature sends notifications automatically"
  ],
  "false_positive_controls": [
    "Allow cases where engine is conditionally imported via dynamic import() that grep might miss — verify with AST import analysis",
    "Allow engine files that are genuinely new (created < 1 day) as they may be pending integration",
    "Exclude test files that import the engine directly (test-only imports don't prove production wiring)"
  ],
  "user_impact": "Users configure SMS automation rules expecting automatic notifications for shift reminders, task assignments, inventory alerts, etc. No SMS will ever be sent because the execution engine is dead code — never exported or called. Users wait for notifications that never arrive, potentially missing critical alerts like low inventory or shift changes.",
  "repair_guidance": "Export sms-automation-engine and sms-automation-triggers from packages/notifications/index.ts. Wire trigger functions into domain event producers (e.g., call triggerShiftAssignedSms from shift assignment routes, triggerInventoryLowSms from inventory threshold checks). Consider a cron-based approach for reminder triggers (shift_reminder, clock_in_reminder) and event-driven approach for state-change triggers (task_assigned, shift_changed).",
  "example_source": {
    "file": "packages/notifications/index.ts",
    "line_or_snippet": "// Re-exports exist for email triggers (line 34-43), SMS send (line 60-72), webhooks (line 45-58) — but NOT for sms-automation-engine or sms-automation-triggers"
  }
}
```

### Implementation note
Detector should: (1) identify automation/rule engine files by pattern (e.g., `*-automation-engine.ts`, `*-triggers.ts`, `*-dispatcher.ts`), (2) check if these files are exported from their package's index.ts, (3) grep entire codebase for imports of these engine/trigger files from application code (routes, crons, workers, middleware), (4) check if a matching CRUD API exists for the same entity (confirming user-facing feature), (5) verify UI components reference the feature as working automation, (6) flag when engine code exists with zero production callers despite full CRUD support and UI claims.

---
## [2026-05-08 16:38] Rule Discovery — dashboard_illusion.actual_revenue_hardcoded_to_budget

### Finding
The event profitability dashboard presents "Actual Revenue" vs "Budgeted Revenue" as a key variance metric, but `actualRevenue` is literally assigned from `budgetedRevenue` (`const actualRevenue = budgetedRevenue`). This means revenue variance is always exactly $0.00 regardless of what actually happened. The food cost and labor cost calculations DO query real database tables (inventory_transactions, time_entries), making the revenue fake-out even more deceptive — two of three cost pillars are real, but the top-line revenue is fabricated.

### Evidence
- File: `apps/app/app/(authenticated)/analytics/events/actions/get-event-profitability.ts`
- Snippet: `const actualRevenue = budgetedRevenue;` (line 140)
- Downstream: `revenueVariance = actualRevenue - budgetedRevenue` (line 145) is always 0
- UI consumption: `apps/app/app/(authenticated)/analytics/events/components/profitability-dashboard.tsx` lines 110-117 render `{metrics.revenueVariance.toFixed(2)} (over/under budget)` — always shows "$0.00 (over budget)"

### Why this matters
Users rely on profitability variance analysis to understand if events came in over/under budget. Revenue is arguably the most important metric. When a catering event runs over budget on food/labor, the dashboard will correctly show cost overruns against budget, but the revenue side will always show "perfectly on target." This creates a false sense of financial control and masks revenue shortfalls (e.g., client negotiated a discount, or final invoice was less than quote).

Additionally, `getHistoricalProfitability()` and `getEventProfitabilityList()` read from the `event_profitability` table which is only populated in `prisma/seed-dev.ts` — never in production code. So the historical/list views likely return empty or zero data in production, while the single-event calculation path shows fake zero-variance revenue.

### Proposed detector rule
```json
{
  "id": "dashboard_illusion.actual_revenue_hardcoded_to_budget",
  "title": "Actual metric value hardcoded to budget/planned value",
  "category": "dashboard_illusion",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "semantic",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "actualRevenue\\s*=\\s*budgetedRevenue",
    "actualRevenue\\s*=\\s*plannedRevenue",
    "actual.*=\\s*budget.*",
    "actual.*=\\s*estimated.*",
    "actual.*=\\s*projected.*"
  ],
  "negative_patterns": [
    "actualRevenue\\s*=\\s*await",
    "actualRevenue\\s*=\\s*calculate",
    "actualRevenue\\s*=\\s*fetch",
    "actualRevenue\\s*=\\s*sum\\(",
    "actualRevenue\\s*=\\s*result"
  ],
  "evidence_required": [
    "Assignment of an 'actual' variable directly from a 'budgeted'/'planned'/'estimated' variable without any computation or data fetching",
    "The actual value is used in variance calculations (actual - budgeted) that will always yield zero",
    "UI component renders the variance as if it were a real comparison"
  ],
  "false_positive_controls": [
    "Exclude cases where actual is set to budget as a fallback with a conditional (e.g., actualRevenue ?? budgetedRevenue)",
    "Exclude test files and mocks",
    "Exclude cases where the assignment is followed by an override from real data"
  ],
  "user_impact": "Profitability variance dashboards show revenue as always perfectly on-budget. Users cannot detect revenue shortfalls or overages. Cost variance is real but revenue variance is fabricated, creating a misleading picture of event financial performance.",
  "repair_guidance": "Query actual revenue from the catering_orders table (total_amount or equivalent) for the specific event. The event_profitability table already has an actual_revenue column — production code should populate it from real invoice/payment data rather than copying the budget. A cron or post-event workflow should reconcile actuals after event completion.",
  "example_source": {
    "file": "apps/app/app/(authenticated)/analytics/events/actions/get-event-profitability.ts",
    "line_or_snippet": "const actualRevenue = budgetedRevenue;"
  }
}
```

### Implementation note
Detector should: (1) find assignments where a variable prefixed with 'actual' is directly assigned from a variable prefixed with 'budget'/'planned'/'estimated'/'projected' (simple `=`, not `??` or conditional), (2) verify the actual variable is subsequently used in variance/delta calculations, (3) check if any database query or API call exists between the budget assignment and the variance calculation that could provide real actual data, (4) confirm a UI component renders this variance, (5) flag severity high when the metric is revenue/financial and medium for other metrics. Cross-file check: verify the 'actual' column exists in the relevant database table with no production write path.

---
## [2026-05-07 23:30] Rule Discovery — feature_claim_mismatch.ui_button_calls_501_stub_with_silent_failure

### Finding
The logistics routes UI displays an "Optimize" button on draft routes that calls `POST /api/logistics/routes/commands/optimize`. The backend always returns HTTP 501 with `{ error: "Route optimization not yet implemented" }`. The UI handler (`handleOptimize`) does not check `res.ok`, does not display any error toast, and silently swallows the failure. The user clicks "Optimize", sees a loading spinner, and nothing happens — no feedback, no error message, no indication the feature is unimplemented. This is a feature claim mismatch: the UI presents route optimization as a working action, but the backend has never implemented it, and the frontend masks the failure entirely.

### Evidence
- File: `apps/api/app/api/logistics/routes/commands/optimize/route.ts` (lines 28-40)
  - Returns `501` with `{ error: "Route optimization not yet implemented", message: "Schema ready — pending algorithm selection (TSP/OSRM)" }`
  - Comment: `BLOCKER: No route optimization algorithm chosen yet (TSP variants, OSRM integration). Tracked as capsule-pro/TODO:route-optimization-algorithm`
- File: `apps/app/app/(authenticated)/logistics/routes/routes-view.tsx` (lines 141-159)
  - `handleOptimize` calls the endpoint, parses JSON, checks `data.route` (which doesn't exist on 501 response), catches errors with only `console.error`
  - No toast, no alert, no user-facing feedback on failure
- File: `apps/app/app/(authenticated)/logistics/routes/routes-view.tsx` (lines 332-345)
  - "Optimize" button rendered when `route.status === "draft"` with full loading spinner UX
- File: `apps/app/app/(authenticated)/logistics/routes/routes-view.tsx` (line 347)
  - UI checks `route.status === "optimized"` to show "Start Route" button — a status that can never be reached since optimize always fails

### Why this matters
Users managing delivery routes see a polished "Optimize" button on their draft routes. Clicking it triggers a loading spinner, then silently does nothing. There is no toast, error message, or any indication the feature is unimplemented. The user might retry multiple times, thinking it's a network issue. Worse, the UI has conditional rendering for `route.status === "optimized"` (showing a "Start Route" button), but this status can never be achieved — the optimize endpoint is a permanent 501 stub. This creates a phantom workflow: the UI implies a multi-step process (draft → optimize → start → complete) where the critical middle step is non-functional, but presented as if it works.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.ui_button_calls_501_stub_with_silent_failure",
  "title": "UI action button calls 501 stub endpoint with no error feedback to user",
  "category": "feature_claim_mismatch",
  "severity": "medium",
  "confidence": 0.93,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "tsx"],
  "patterns": [
    "API route that returns HTTP 501 status code",
    "501 response body containing 'not yet implemented' or 'not implemented'",
    "Frontend apiFetch handler that does not check res.ok or show toast on failure",
    "Frontend handler that catches errors with only console.error (no user feedback)",
    "UI button with loading state (Loader2 spinner) that calls a backend endpoint",
    "Conditional UI rendering based on status values that can never be reached"
  ],
  "negative_patterns": [
    "501 endpoints that have no corresponding UI buttons",
    "Frontend handlers that display toast.error() on non-ok responses",
    "Endpoints that return 501 only in specific edge cases (not always)",
    "Feature flags or beta badges indicating the feature is experimental"
  ],
  "evidence_required": [
    "Backend route returning 501 with implementation-not-ready message",
    "Frontend component with action button that calls the 501 route",
    "Frontend handler missing res.ok check or user-facing error display",
    "No toast/alert/banner shown to user on 501 response"
  ],
  "false_positive_controls": [
    "Exclude endpoints that are behind feature flags or beta labels",
    "Exclude cases where UI shows 'Coming Soon' or 'Beta' badges",
    "Only flag when the frontend has NO error feedback path (no toast, no alert, no banner)"
  ],
  "user_impact": "Users click an 'Optimize' button expecting their delivery route to be optimized, see a loading spinner, and get no result and no error message. They may retry multiple times. The implied workflow (draft → optimized → started → completed) has a non-functional step that the UI presents as working.",
  "repair_guidance": "Either implement the route optimization algorithm (TSP solver, OSRM integration, etc.), or remove/disable the Optimize button in the UI and show a 'Coming Soon' indicator. At minimum, the frontend should display a toast notification when the endpoint returns 501, informing the user the feature is not yet available.",
  "example_source": {
    "file": "apps/api/app/api/logistics/routes/commands/optimize/route.ts",
    "line_or_snippet": "return NextResponse.json(\n      {\n        error: \"Route optimization not yet implemented\",\n        message: \"Schema ready — pending algorithm selection (TSP/OSRM)\",\n      },\n      { status: 501 }\n    );"
  }
}
```

### Implementation note
Detector should cross-reference API routes returning 501 against frontend components that call those routes. Flag when the frontend handler lacks any user-facing error feedback (toast, alert, banner) on non-ok responses. Also flag conditional UI rendering that depends on status values that the 501 endpoint can never produce.
---

## [2026-05-07 17:08] Rule Discovery — feature_claim_mismatch.calendar_advertises_nonexistent_deadline_reminder_types

### Finding
The calendar API route advertises `deadline` and `reminder` as supported event types in its TypeScript interface and default query parameter, and the frontend renders filter toggle badges for both types. However, the backend has a BLOCKER comment acknowledging that the Deadline and Reminder models do not exist in the database schema, and no query code exists to fetch them. Users who toggle on "Deadlines" or "Reminders" filters will silently see zero results with no indication these features are unimplemented.

### Evidence
- File: `apps/api/app/api/calendar/route.ts`
- Snippet:
  ```typescript
  type: "event" | "shift" | "timeoff" | "deadline" | "reminder";
  // ...
  const typesParam = searchParams.get("types") || "event,shift,timeoff,deadline,reminder";
  // ...
  // BLOCKER: Deadline and Reminder models do not exist in schema.
  // Tracked as capsule-pro/TODO:calendar-deadlines-reminders
  ```
- File: `apps/app/app/(authenticated)/calendar/components/unified-calendar.tsx`
- Snippet:
  ```typescript
  const EVENT_TYPE_LABELS: Record<string, string> = {
    event: "Events",
    shift: "Shifts",
    timeoff: "Time Off",
    deadline: "Deadlines",    // rendered as filter badge in UI
    reminder: "Reminders",    // rendered as filter badge in UI
  };
  // Line 658: {Object.entries(EVENT_TYPE_LABELS).map(([type, label]) => (
  ```

### Why this matters
Users see "Deadlines" and "Reminders" as toggleable filter options in the calendar UI with distinct color schemes (red and purple). Toggling them on sends `types=...,deadline,reminder` to the API, which silently returns zero results for those types. There is no "coming soon" label, no empty-state message explaining the feature isn't available, and no backend 501 error — just a silent no-op. This is a cross-layer feature claim mismatch: the TypeScript types, API defaults, and UI all claim these event types exist, but the database models and query code are missing.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.calendar_advertises_nonexistent_deadline_reminder_types",
  "title": "Calendar advertises nonexistent deadline and reminder event types",
  "category": "feature_claim_mismatch",
  "severity": "medium",
  "confidence": 0.95,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "tsx"],
  "patterns": [
    "BLOCKER.*models? (do|does) not exist in schema",
    "type.*deadline.*reminder.*in TypeScript union but no corresponding database model or query",
    "EVENT_TYPE_LABELS or similar config maps containing types with no backend query implementation",
    "Default query parameters including types that have no fetch logic"
  ],
  "negative_patterns": [
    "Types behind feature flags or beta labels",
    "Types that have a corresponding findMany/query block (even if empty results)",
    "TODO comments in test files or docs only"
  ],
  "evidence_required": [
    "Backend route with TypeScript interface or default param listing event types",
    "BLOCKER or TODO comment confirming models don't exist",
    "Frontend rendering filter badges/toggles for the missing types via Object.entries() or similar iteration over all types",
    "No findMany/query block for the missing types in the route handler"
  ],
  "false_positive_controls": [
    "Only flag when the missing types appear in BOTH backend interface/defaults AND frontend UI controls",
    "Exclude types that have query code but return empty results (that's data absence, not implementation absence)",
    "Exclude types behind feature flags or experimental labels"
  ],
  "user_impact": "Users toggle on 'Deadlines' or 'Reminders' filters in the calendar, expecting to see those items appear. They get silent empty results with no explanation. Over time this erodes trust — users may think they have no deadlines or reminders when in fact the feature simply doesn't exist yet.",
  "repair_guidance": "Either (a) implement the Deadline and Reminder database models and query logic in the calendar route, or (b) remove 'deadline' and 'reminder' from the TypeScript union, default types parameter, EVENT_TYPE_LABELS, and EVENT_COLORS, and add a 'Coming Soon' badge or hide the filter options entirely until implemented. The BLOCKER comment has been tracked since at least the initial implementation.",
  "example_source": {
    "file": "apps/api/app/api/calendar/route.ts",
    "line_or_snippet": "type: \"event\" | \"shift\" | \"timeoff\" | \"deadline\" | \"reminder\";\n// ...\nconst typesParam = searchParams.get(\"types\") || \"event,shift,timeoff,deadline,reminder\";\n// ...\n// BLOCKER: Deadline and Reminder models do not exist in schema.\n// Tracked as capsule-pro/TODO:calendar-deadlines-reminders"
  }
}
```

### Implementation note
Detector should find cases where a TypeScript type union or config map includes options that have no corresponding implementation — specifically looking for BLOCKER/TODO comments near the type definition confirming missing backing, combined with frontend rendering those options as active toggles. Generalize beyond calendar: any API that lists types in its interface/defaults and has frontend filter UI for types with no query implementation.
---

## [2026-05-08 00:24] Rule Discovery — skeleton_crud.recipe_cost_skips_unit_conversion

### Finding
The `/api/recipes/calculate-cost` endpoint in `apps/app` multiplies recipe ingredient quantities directly by vendor catalog unit costs without any unit conversion. When a recipe calls for "3 cups" of flour and the vendor prices flour at $0.45/lb, the endpoint returns `3 × 0.45 = $1.35` instead of the correct `3 cups × 0.125 lb/cup × $0.45 = $0.169`. The route itself admits this via inline comments: `"simplified - assumes unit conversion would be handled"` and `"In production, you'd need proper unit conversion logic"`. Meanwhile, a fully implemented recipe costing library at `apps/api/app/lib/recipe-costing.ts` already loads conversions from `core.unit_conversions` and applies them via `convertQuantity()`. The `apps/app` route is a duplicate implementation that skipped the hard part.

### Evidence
- File: `apps/app/app/api/recipes/calculate-cost/route.ts`
- Snippet: Lines 88-91:
  ```typescript
  // Calculate cost (simplified - assumes unit conversion would be handled)
  // In production, you'd need proper unit conversion logic
  const unitCost = Number(catalogEntry.base_unit_cost);
  const cost = quantity * unitCost * wasteFactor;
  ```
- Counter-evidence (correct implementation): `apps/api/app/lib/recipe-costing.ts` lines 43-75 implement `loadUnitConversions()` querying `core.unit_conversions` and `convertQuantity()` with multiplier lookup.
- The route queries `vendor_catalog.unit_of_measure` (line 72) and `ingredients.default_unit_id` (line 51) but never compares or converts between them.

### Why this matters
Catering businesses use recipe costing to set menu prices. Incorrect unit conversion produces mathematically wrong food costs — sometimes off by 5-10x depending on the unit mismatch (e.g., cups vs lbs, ounces vs grams). This flows into `costPerYield` and `costPerServing` which are displayed in the recipe cost detail UI at `/inventory/recipe-costs/[recipeVersionId]`. Caterers quoting event prices based on these numbers would either overcharge (losing bids) or undercharge (losing margin). The `apps/api/app/lib/recipe-costing.ts` library already has the correct implementation, making this a case of duplicated logic where the copy was simplified into incorrectness.

### Proposed detector rule
```json
{
  "id": "skeleton_crud.recipe_cost_skips_unit_conversion",
  "title": "Recipe cost calculation skips unit conversion between recipe units and vendor units",
  "category": "skeleton_crud",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "tsx"],
  "patterns": [
    "quantity \\* unitCost",
    "quantity \\* .*cost",
    "// Calculate cost (simplified",
    "// In production, you.*unit conversion",
    "base_unit_cost.*quantity",
    "getIngredientCost"
  ],
  "negative_patterns": [
    "convertQuantity",
    "unit_conversions",
    "loadUnitConversions",
    "from_unit_id.*to_unit_id"
  ],
  "evidence_required": [
    "Function that calculates ingredient cost from quantity and unit cost",
    "Queries both recipe ingredient quantity/unit and vendor catalog unit cost",
    "No call to any conversion function between the two units",
    "Comment language like 'simplified', 'assumes', 'in production you would'"
  ],
  "false_positive_controls": [
    "Exclude files that import or call a unit conversion utility",
    "Exclude test files with intentional simplified mocks",
    "Only flag when both unit fields (recipe unit + vendor unit) are queried but no conversion bridge exists"
  ],
  "user_impact": "Recipe cost calculations produce incorrect dollar amounts whenever ingredient units differ from vendor pricing units. Caterers using these costs to set menu prices will quote wrong prices for events, directly impacting revenue and margin.",
  "repair_guidance": "The calculate-cost route at apps/app/app/api/recipes/calculate-cost/route.ts should either (a) import and delegate to the existing recipe-costing library in apps/api/app/lib/recipe-costing.ts (which already handles unit conversions from core.unit_conversions), or (b) add loadUnitConversions/convertQuantity logic directly. The route queries vendor_catalog.unit_of_measure and ingredients.default_unit_id but never compares them — it needs to resolve the unit IDs, look up the conversion multiplier, and apply it before multiplying quantity × unit cost. Alternatively, deprecate this route entirely and route all frontend cost calculation through the server-side library's exported functions.",
  "example_source": {
    "file": "apps/app/app/api/recipes/calculate-cost/route.ts",
    "line_or_snippet": "// Calculate cost (simplified - assumes unit conversion would be handled)\n// In production, you'd need proper unit conversion logic\nconst unitCost = Number(catalogEntry.base_unit_cost);\nconst cost = quantity * unitCost * wasteFactor;"
  }
}
```

### Implementation note
Detector should find cost-calculation functions that multiply quantity by unit cost without an intervening unit conversion step. Specifically: (1) identify functions that query both a recipe ingredient's unit and a vendor catalog's unit_of_measure, (2) check that the cost formula is `quantity * unitCost` without any `convertQuantity`/`unit_conversions`/multiplier lookup, and (3) verify that a proper conversion implementation exists elsewhere in the codebase (proving the author knew it was needed but skipped it). The "In production" comment pattern is a strong signal but the structural evidence (two unit fields queried, no conversion bridge) is the primary detector.
---
## [2026-05-07 18:14] Rule Discovery — skeleton_crud.abandoned_dynamic_sql_replaced_inplace

### Finding
In the CRM scoring rule update endpoint (`PUT /api/crm/scoring/[id]`), the author first attempted to build a dynamic SQL UPDATE using a `updates[]` array and parameterized `$n` placeholders (lines 54-129). This ~75-line block constructs the update columns, pushes values, and builds a `Prisma.sql` template. However, the reduce callback on line 121-124 literally returns an empty array (`return acc`), making the entire first attempt inert — it would produce a broken SQL statement. Instead of removing the dead code, the author simply wrote a second, completely independent UPDATE below it (lines 131-144) using COALESCE, which is the code that actually executes. The first attempt is ~75 lines of unreachable, non-functional code left in a production route handler.

### Evidence
- File: `apps/api/app/api/crm/scoring/[id]/route.ts`
- Lines 54-129: Abandoned dynamic SQL builder with `updates.push(...)` and `updateValues.push(...)` that culminates in a reduce returning `acc` (empty array)
- Line 123: `return acc;` — the reduce callback that silently discards all accumulated SQL fragments
- Lines 131-144: The actual working UPDATE using `COALESCE(${field ?? null}, field)` pattern
- Line 131: Comment `// Re-do with a cleaner approach using Prisma.sql template` — explicit admission of abandonment

### Why this matters
This is dead code that looks functional at first glance. A developer maintaining this route could waste time trying to understand or fix the first approach, not realizing it's inert. The `return acc` on line 123 is particularly deceptive — it looks like an accumulator passthrough but actually discards everything. In a codebase this size, abandoned implementation attempts left in-place signal copy-paste-driven development where cleanup is skipped. It also means the `updates` and `updateValues` arrays are built for nothing on every request, wasting CPU cycles for a dead computation.

### Proposed detector rule
```json
{
  "id": "skeleton_crud.abandoned_dynamic_sql_replaced_inplace",
  "title": "Abandoned dynamic SQL builder replaced by inline redo in same function",
  "category": "skeleton_crud",
  "severity": "medium",
  "confidence": 0.85,
  "detector_type": "ast",
  "language_targets": ["typescript"],
  "patterns": [
    "function with two database UPDATE calls where the first builds dynamic column/value arrays but is never meaningfully consumed",
    "comment containing 're-do' or 'redo' or 'cleaner approach' within 10 lines of a second database operation",
    "reduce callback that returns accumulator unchanged (return acc) after map/filter operations that build SQL fragments"
  ],
  "negative_patterns": [
    "genuine fallback patterns where first attempt catches specific errors and falls back",
    "retry logic with exponential backoff",
    "migration scripts with versioned approach changes"
  ],
  "evidence_required": [
    "two sequential database write operations in same function",
    "first operation builds arrays/objects that are never passed to the second",
    "second operation uses a completely different SQL structure",
    "no conditional branching between the two (not a fallback pattern)"
  ],
  "false_positive_controls": [
    "require that both operations target the same table (not a multi-step workflow)",
    "require that the first operation's output variable is never referenced after the second operation begins",
    "exclude files with 'migration' or 'seed' in the path"
  ],
  "user_impact": "Dead code in production routes increases maintenance burden, confuses developers, wastes CPU on building unused data structures, and signals poor code hygiene that may mask other issues.",
  "repair_guidance": "Remove the abandoned first UPDATE attempt (lines 54-129) entirely. The COALESCE-based UPDATE on lines 131-144 is the working implementation and is already cleaner. A future Ralph loop should detect 'redo' comments near duplicate DB operations and flag for cleanup.",
  "example_source": {
    "file": "apps/api/app/api/crm/scoring/[id]/route.ts",
    "line_or_snippet": "// Build dynamic update\nconst updates: string[] = [];\nconst updateValues: unknown[] = [];\n// ... 60+ lines of updates.push() ...\n.reduce((acc: unknown[], u, i) => {\n  // Manually build the SQL\n  return acc;\n}, [])\n// ...\n// Re-do with a cleaner approach using Prisma.sql template\nconst updateResult = await database.$executeRaw`\n  UPDATE tenant_crm.crm_scoring_rules SET rule_name = COALESCE(...) ..."
  }
}
```

### Implementation note
Detector should use AST analysis to find functions containing two sequential `$executeRaw` or `$queryRaw` calls where the first builds intermediate data structures (arrays of SQL fragments + parameter arrays) that are never consumed by the second. The key signal is a `reduce` or similar fold that returns the accumulator unchanged after building SQL parts — this indicates the author abandoned the approach mid-implementation. The "Re-do with a cleaner approach" comment pattern is a strong secondary signal. Cross-file check: verify the abandoned arrays are not referenced elsewhere in the function scope after the second operation begins.
---
## [2026-05-08 01:49] Rule Discovery — feature_claim_mismatch.audit_log_table_read_only_with_comprehensive_ui

### Finding
The platform has a full audit log system — database table (`platform.audit_log` and `tenant_admin.audit_log`), two API read endpoints, a paginated frontend page with filters for action type/table name/user search, and even a dev console audit log viewer. The page copy says "View a history of changes made to settings and configurations." However, searching the entire codebase reveals that `platform.audit_log` is only written to in **one single endpoint**: the public proposal response handler (`apps/api/app/api/public/proposals/[token]/respond/route.ts:125`). No Prisma middleware, no database triggers, no application-level audit writer exists. The `tenant_admin.audit_log` table has zero application-level writers at all. The audit log UI implies comprehensive change tracking but will appear nearly empty in production.

### Evidence
- File: `apps/api/app/api/settings/audit-log/route.ts`
  - Lines 1-12: JSDoc describes comprehensive filtering by action, table_name, search
  - Lines 64-71: Reads from `database.audit_log` with pagination
  - Lines 111-116: Queries distinct table names for filter dropdown
- File: `apps/app/app/(authenticated)/settings/audit-log/page.tsx`
  - Lines 16-18: Page copy: "View a history of changes made to settings and configurations."
- File: `apps/api/app/api/public/proposals/[token]/respond/route.ts`
  - Line 125: `INSERT INTO platform.audit_log` — **the only writer in the entire backend**
- File: `apps/app/app/api/settings/audit-log/route.ts`
  - Line 92: Reads from `tenant_admin.audit_log` — a separate schema with zero writers
- File: `docs/audits/passes-06-09-raw-sql.md`
  - Lines 83-84: Audit doc explicitly flags both as "Orphaned"
- File: `docs/audits/ralph01/IMPLEMENTATION_PLAN.md`
  - Line 1044: Documents the fix was only about querying the right schema — no writer was added

### Why this matters
Users navigating to Settings > Audit Log see a polished, fully functional UI with filters, pagination, user resolution, and a detail dialog for old/new values. The natural expectation is that this captures a comprehensive trail of all system changes. In reality, it will only ever contain entries for public proposal accept/reject actions. Every other setting change, data mutation, user action, and configuration update goes unrecorded. This is an accountability and compliance gap — the UI creates a false sense of security that changes are being tracked.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.audit_log_table_read_only_with_comprehensive_ui",
  "title": "Audit log table with comprehensive read UI but no application-level writers",
  "category": "feature_claim_mismatch",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "sql"],
  "patterns": [
    "audit_log.*findMany|audit_log.*count",
    "audit.log.*page|audit.log.*client",
    "history of changes|View a history|audit trail"
  ],
  "negative_patterns": [
    "audit_log.*create|auditLog.*create",
    "INSERT INTO.*audit_log",
    "audit.*trigger|TRIGGER.*audit",
    "prisma\\\\.\\\\$use|\\\\.middleware"
  ],
  "evidence_required": [
    "At least one read endpoint querying audit_log",
    "A frontend page or component displaying audit log entries with filter/pagination UI",
    "Zero or near-zero application-level INSERT/create into audit_log table (excluding generated Prisma docs and migration DDL)",
    "No database trigger or Prisma middleware that auto-populates the table"
  ],
  "false_positive_controls": [
    "Exclude migration SQL files (CREATE TABLE, CREATE TRIGGER DDL)",
    "Exclude Prisma generated client files",
    "Allow for audit_log writes in public/unauthenticated webhook handlers as partial coverage",
    "Require at least 2 read endpoints or a full-featured UI before flagging"
  ],
  "user_impact": "Users see a polished audit log UI implying comprehensive change tracking, but it captures almost nothing. This creates a false sense of accountability and is a compliance gap for any tenant needing real audit trails for regulatory or internal policy reasons.",
  "repair_guidance": "Implement an audit log writer — either as Prisma middleware that intercepts all mutations, a database trigger on key tables, or an application-level helper function called from all mutation endpoints. The table schema (table_name, record_id, action, old_values, new_values, performed_by, ip_address, user_agent) is already well-designed for this purpose. Prioritize writes for sensitive mutations: settings changes, user role changes, financial data, and data deletions.",
  "example_source": {
    "file": "apps/api/app/api/settings/audit-log/route.ts",
    "line_or_snippet": "// Line 64: database.audit_log.findMany({ where, ... })\n// Line 70: database.audit_log.count({ where })\n// Only writer found in entire codebase:\n// apps/api/app/api/public/proposals/[token]/respond/route.ts:125\n// INSERT INTO platform.audit_log (...)"
  }
}
```

### Implementation note
Detector should identify database tables named `audit_log` or similar, find all read endpoints (findMany/count/query), find all write operations (create/insert/trigger), and cross-reference against frontend pages with audit-log UI. Flag when the read infrastructure significantly outstrips write infrastructure (e.g., full paginated UI with filters but only 0-1 writers). The key signal ratio is: read-endpoints/UI-complexity vs. number of distinct write paths. A table with a full filterable UI but only one narrow writer (or zero) is a strong slop signal. Official docs not required: generic implementation-evidence rule.
---
## [2026-05-08 02:55] Rule Discovery — fake_integration.sync_route_creates_duplicates_no_external_id_mapping

### Finding
The calendar sync trigger route (`POST /api/calendar/sync/trigger`) fetches events from Google Calendar and Microsoft Graph APIs and imports them into the local database using `database.event.create()`. However, it has no external ID mapping — no `upsert`, no unique constraint on the external event ID, and no deduplication logic. The code itself admits this on line 200: `// Note: In production, use a mapping table to track external event IDs`. Every time a user triggers a sync, all matching external calendar events are duplicated in the database. This is deployed behind real auth, reads real OAuth tokens, and calls real external APIs — it's a production path that silently corrupts data.

### Evidence
- File: `apps/api/app/api/calendar/sync/trigger/route.ts`
- Snippet (line 197-218):
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
- Same pattern repeated for Outlook sync at lines 261-278
- Silent error swallowing: catch blocks increment `errors` counter with zero logging of which event failed or why

### Why this matters
Every sync invocation creates duplicate event records. Users who sync their calendar weekly will accumulate dozens of duplicate events, polluting event lists, dashboards, reports, and billing. The silent catch blocks hide per-event failures, so the `errors` count in the response tells the user nothing actionable. This is a data integrity bug disguised as a working integration — the route returns `{ imported: N, errors: M }` suggesting success, but the data is fundamentally broken.

### Proposed detector rule
```json
{
  "id": "fake_integration.sync_route_creates_duplicates_no_external_id_mapping",
  "title": "External sync route creates records without external ID deduplication",
  "category": "fake_integration",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "hybrid",
  "language_targets": ["typescript"],
  "patterns": [
    "database.*\\.create\\(\\s*\\{",
    "// Note: In production",
    "// Add external ID reference",
    "eventType.*external_",
    "catch\\s*\\{\\s*errors\\+\\+"
  ],
  "negative_patterns": [
    "database.*\\.upsert\\(",
    "externalId",
    "external_event_id",
    "externalEventId"
  ],
  "evidence_required": [
    "Route file in api/ directory",
    "Uses database.event.create (not upsert) inside a loop iterating over external API results",
    "No externalId field in the create data payload",
    "Comment admitting production incompleteness ('In production' language)"
  ],
  "false_positive_controls": [
    "Exclude routes that use upsert or have unique constraints on external IDs",
    "Exclude one-shot import routes that are explicitly labeled as migration tools",
    "Exclude test files"
  ],
  "user_impact": "Every calendar sync creates duplicate events. Users see inflated event counts, duplicated entries in dashboards and reports, and corrupted analytics. The sync appears to succeed but silently corrupts the event database.",
  "repair_guidance": "Replace database.event.create with database.event.upsert keyed on externalEventId. Add an externalEventId field to the Event schema. Log individual event failures instead of silently counting them. Consider adding a syncRun record to track what was last synced and when.",
  "example_source": {
    "file": "apps/api/app/api/calendar/sync/trigger/route.ts",
    "line_or_snippet": "// Note: In production, use a mapping table to track external event IDs\n      await database.event.create({"
  }
}
```

### Implementation note
Detector should scan for routes that (1) call external APIs (fetch to googleapis.com, graph.microsoft.com, etc.), (2) iterate over results in a loop, (3) use `.create()` instead of `.upsert()` on a database model, and (4) have no external ID field in the create payload. The "In production" comment is a strong signal but the structural pattern (create-in-loop-without-upsert) is the primary detector. Should also flag the companion pattern of silent catch blocks that only increment counters without logging. Official docs not required: generic implementation-evidence rule.
---
## [2026-05-08 03:27] Rule Discovery — feature_claim_mismatch.stale_workaround_causes_double_persist

### Finding
Two manually-written API routes (email-templates create and training modules create) contain "fixes" from 2026-04-26 that add a second persistence call (`createInstance` or raw SQL INSERT) after `runtime.runCommand("create", ...)`. The fix was based on the belief that `runCommand("create")` only evaluates guards/policies without persisting. However, the base `RuntimeEngine._executeCommandInternal()` (runtime-engine.ts lines 1539-1587) already calls `this.createInstance()` internally when `command.name === "create"` and `!options.instanceId`. The workaround is now stale, causing **double persistence** — every successful create writes two database rows: one from the runtime engine's built-in create path, and one from the manual workaround.

### Evidence
- File: `apps/api/app/api/communications/email-templates/commands/create/route.ts`
  - Line 2-5: Comment "Updated: 2026-04-26 — Fixed: runCommand alone does not persist entities. The runtime engine's create command only evaluates guards/policies and emits events via mutate actions (no-ops without instanceId). Actual persistence requires calling createInstance() after the command succeeds."
  - Line 83: `const result = await runtime.runCommand("create", body, { entityName: "EmailTemplate" });`
  - Line 98: `const created = await persistEmailTemplate(runtime, tenantId, body);`
  - Line 136: `return await runtime.createInstance("EmailTemplate", { tenantId, ...body });`
- File: `apps/api/app/api/training/modules/route.ts`
  - Line 152-154: Comment "executeManifestCommand only runs the command in-memory — it does NOT persist entities (same bug as email-templates)."
  - Line 203: `const result = await runtime.runCommand("create", commandPayload, { entityName: "TrainingModule" });`
  - Lines 237-274: Raw SQL `INSERT INTO tenant_staff.training_modules ... RETURNING *`
- File: `packages/manifest-runtime/src/manifest/runtime-engine.ts`
  - Lines 1536-1543: Comment explaining the create fast-path: "`create` commands compile `mutate` actions that call `updateInstance`, but route handlers do not pass `instanceId`, so those mutates no-op. Persist new rows via `createInstance` instead."
  - Lines 1539-1547: `if (command.name === "create" && options.entityName && !options.instanceId) { const created = await this.createInstance(options.entityName, validatedInput); ... }`

### Why this matters
Every email template creation writes two rows to the database (one without `tenantId` from the runtime's internal createInstance, one with `tenantId` from the manual workaround). Every training module creation writes two rows (one via PrismaStore/PrismaJsonStore, one via raw SQL). This causes:
1. **Data duplication** — phantom rows accumulate over time, inflating counts and polluting queries.
2. **Data inconsistency** — the runtime-created row may have different field values than the manual row (e.g., missing `tenantId` in email templates).
3. **Misleading comments** — the "fix" comments actively mislead future developers into applying the same stale workaround to other routes.
4. **The 765 auto-generated routes do NOT have this problem** — they call `runCommand("create")` alone, which correctly persists. The manual routes are the only broken ones.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.stale_workaround_causes_double_persist",
  "title": "Stale runtime workaround causes double persistence on create commands",
  "category": "feature_claim_mismatch",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "runCommand\\s*\\(\\s*[\"']create[\"']",
    "createInstance\\s*\\(",
    "Step 2.*Persist|does NOT persist|only runs.*in-memory",
    "runCommand alone does not persist"
  ],
  "negative_patterns": [
    "auto-generated",
    "Auto-generated Next.js command handler"
  ],
  "evidence_required": [
    "Route file that calls runtime.runCommand('create', ...) AND also calls runtime.createInstance() or performs a raw SQL INSERT afterward",
    "Comments claiming runCommand does not persist create commands",
    "RuntimeEngine source confirming create fast-path at _executeCommandInternal"
  ],
  "false_positive_controls": [
    "Exclude auto-generated route files (header contains 'Auto-generated Next.js command handler')",
    "Exclude cases where createInstance is called for a DIFFERENT entity than the runCommand target",
    "Exclude cases where runCommand is called with instanceId (update path, not create)"
  ],
  "user_impact": "Every create request silently writes two database rows, causing data duplication, inconsistent field values (e.g., missing tenantId on the runtime-created row), inflated record counts, and corrupted queries that aggregate over the duplicated data.",
  "repair_guidance": "Remove the manual createInstance/raw-SQL persistence call and the misleading comments from affected routes. The runtime engine's _executeCommandInternal already handles create persistence internally. If tenantId or other fields need to be injected, add them to the commandPayload BEFORE calling runCommand, not after. Verify no duplicate rows exist in production and clean up if needed.",
  "example_source": {
    "file": "apps/api/app/api/communications/email-templates/commands/create/route.ts",
    "line_or_snippet": "// Updated: 2026-04-26 — Fixed: runCommand alone does not persist entities.\nconst result = await runtime.runCommand(\"create\", body, { entityName: \"EmailTemplate\" });\n// ...\nconst created = await persistEmailTemplate(runtime, tenantId, body);"
  }
}
```

### Implementation note
Detector should find route files that (1) call `runtime.runCommand("create", ...)` or `runtime.runCommand('create', ...)`, (2) subsequently call `runtime.createInstance(...)` or perform a raw SQL INSERT/Prisma create, and (3) are NOT auto-generated (no "Auto-generated Next.js command handler" header). Should also flag the misleading comment patterns ("runCommand alone does not persist", "does NOT persist entities", "only runs the command in-memory") as strong corroborating signals. Cross-file verification: confirm that the RuntimeEngine's `_executeCommandInternal` has the create fast-path that calls `createInstance` internally. Official docs not required: internal runtime behavior confirmed via source code analysis.
---
## [2026-05-07 21:30] Rule Discovery — feature_claim_mismatch.ai_route_is_pure_regex_with_fabricated_confidence

### Finding
The `ai-event-setup/parse` API route is branded as "AI-powered" natural language parsing but is implemented entirely as hand-rolled regex string matching — 533 lines of `parseMonth`, `parseDayOfMonth`, `parseYear`, `parseRelativeDate`, `parseAbsoluteDate`, `parseGuestCount`, `parseVenue`, `inferEventType`, and `generateTitle` functions. No LLM, no ML model, no AI SDK import exists anywhere in the file. The design doc (`docs/ai-event-setup.md`) references Vercel AI SDK and OpenAI integration, but the actual route uses neither.

The smoking gun is the fabricated confidence score (lines 425-430): a hardcoded starting value of 0.5 with fixed float additions (+0.15, +0.2, +0.1, +0.05) based on which regex patterns matched. This produces a number that looks like a probabilistic AI confidence but is pure arithmetic — meaningless as a reliability indicator.

### Evidence
- File: `apps/api/app/api/ai-event-setup/parse/route.ts`
- Snippet:
```typescript
let confidence = 0.5;
if (guestCount > 0) confidence += 0.15;
if (eventDate) confidence += 0.2;
if (venue.name) confidence += 0.1;
if (typeResult.confidence > 0.7) confidence += 0.05;
confidence = Math.min(confidence, 1);
```
- Route path: `ai-event-setup/parse` — "AI" in the URL
- Event type emitted: `ai-event-setup.session.parsed`
- Design doc reference: `docs/ai-event-setup.md` line 9 — "leverages... Vercel AI SDK integration"
- Zero AI/ML imports in the entire 533-line file (no `openai`, `@ai-sdk`, `ai`, `generateText`, etc.)

### Why this matters
Users see "AI Event Setup" in the UI and trust that the parser understands natural language intelligently. In reality, it only handles inputs matching ~10 hardcoded regex patterns for event types, specific date formats, and guest count phrasings. Any slightly creative input ("We're hosting a reception for about eighty folks the Saturday after next") will silently fail to extract data while still returning a fabricated confidence score. The confidence number actively misleads users into believing the parse quality is high.

### Proposed detector rule
```json
{
  "id": "feature_claim_mismatch.ai_route_is_pure_regex_with_fabricated_confidence",
  "title": "AI-branded route uses pure regex parsing with arithmetically-fabricated confidence score",
  "category": "feature_claim_mismatch",
  "severity": "medium",
  "confidence": 0.85,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript", "tsx"],
  "pattern": "confidence\\s*\\+=\\s*0\\.\\d+",
  "negative_patterns": [
    "import\\s+.*from\\s+['\"](@ai-sdk|ai|openai|@langchain|tensorflow|@xenova|transformers)"
  ],
  "evidence_required": {
    "file_must_match": ["ai[-/]"],
    "min_pattern_count": 2,
    "companion_pattern": "(new\\s+RegExp\\(|\\\\.test\\(\\s*['\"]|/\\\\b\\w+\\\\b/[gi]*)"
  },
  "false_positive_controls": {
    "skip_test_files": true,
    "skip_doc_files": true,
    "strip_comments": true,
    "path_match": ["ai[-/]"],
    "path_exclude": ["node_modules/", ".next/", "dist/", "e2e/"]
  },
  "user_impact": "Users see 'AI-powered' parsing and trust the confidence score, but the parser is pure regex — it fails on any input not matching hardcoded patterns, and the confidence is meaningless arithmetic, not a probabilistic assessment.",
  "repair_guidance": "Replace the regex parser with an LLM-based natural language parser (the codebase already uses Vercel AI SDK + OpenAI in kitchen/ai/bulk-generate/prep-tasks/service.ts), or rebrand as 'Smart Event Parsing' without the AI label and remove the fabricated confidence.",
  "example_source": {
    "file": "apps/api/app/api/ai-event-setup/parse/route.ts",
    "line_or_snippet": "let confidence = 0.5;\n    if (guestCount > 0) confidence += 0.15;\n    if (eventDate) confidence += 0.2;\n    if (venue.name) confidence += 0.1;\n    confidence = Math.min(confidence, 1);"
  }
}
```

### Implementation note
Detector should flag files in `ai-*` or `*/ai/*` paths where (1) a confidence score is built arithmetically by adding fixed float constants, (2) the file has no AI/ML library imports, and (3) the file uses RegExp patterns heavily (confirming regex-based logic). The `negative_patterns` field lists known AI SDK imports — if any of these appear, the file likely does use real AI and should be excluded. The `companion_pattern` requires evidence of regex usage (RegExp constructor, .test() calls, or regex literals with word boundaries) to avoid false positives on legitimate ML confidence accumulation. Official docs not required: generic implementation-evidence rule.
---
