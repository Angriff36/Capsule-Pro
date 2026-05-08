# SlopScope Rule Implementation Plan

Backlog of proposed detector rules discovered by the rule-discovery loop.

---

- [ ] `fake_integration.mock_fallback_as_production_path` — Mock data fallback silently used as production extraction path
  - Category: fake_integration
  - Severity: critical
  - Detector type: cross_file
  - Source evidence: `projects/document-parser/project/packages/document-parser/src/extraction/docling-adapter.ts`
  - Future implementation: Cross-reference exported mock functions with catch-block callers, verify no env guard, check test suite for exclusive mock coverage

- [ ] `automation_theater.cancel_endpoint_status_write_only` — Cancel/stop endpoint writes status but never signals the running process
  - Category: automation_theater
  - Severity: high
  - Detector type: cross_file
  - Source evidence: `src/claude-workflow/app/routes/jobs.py`
  - Future implementation: Cross-reference cancel endpoints against worker/runner modules to verify signal delivery actually exists, not just claimed in comments

- [ ] `dashboard_illusion.fabricated_token_cost_from_hardcoded_constants` — Dashboard displays fabricated token/cost metrics from hardcoded per-type constants instead of actual token data
  - Category: dashboard_illusion
  - Severity: medium
  - Detector type: cross_file
  - Source evidence: `src/openclaw/projects/autolab/src/components/analytics/UsageView.tsx`
  - Future implementation: Cross-reference dashboard token/cost calculations against DB schema to verify actual token data columns exist; flag hardcoded baseTokens lookup tables used in analytics components

- [ ] `security_theater.optional_webhook_signature_bypass` — Webhook signature verification is conditionally skipped when secret env var is missing
  - Category: security_theater
  - Severity: high
  - Detector type: regex
  - Source evidence: `src/openclaw/projects/capsule-pro/apps/api/app/api/collaboration/notifications/email/webhook/route.ts`
  - Future implementation: Scan webhook handlers for conditional signature verification guards that silently skip when secret env var is missing; cross-reference sibling handlers for inconsistent patterns
- [ ] `automation_theater.audit_log_to_console` — Audit/compliance logging method drops to console instead of persistent storage
  - Category: automation_theater
  - Severity: high
  - Detector type: hybrid
  - Source evidence: `src/openclaw/projects/capsule-pro/packages/payroll-engine/src/dataSource/PrismaPayrollDataSource.ts:286-297`
  - Future implementation: Hybrid regex+AST detector that flags interface methods whose body is only console.log, with cross-file check to verify test double persists while production does not.

- [ ] `fake_integration.registered_stub_connector_exposed_as_production` — Stub connectors registered in production registry and exposed via API perform no real work
  - Category: fake_integration
  - Severity: high
  - Detector type: cross_file
  - Source evidence: `packages/supplier-connectors/src/connectors/us-foods.ts`
  - Future implementation: Cross-reference connector registrations against method bodies to detect stubs that return hardcoded empty data; verify registry is exported from package index and consumed by API routes
- [ ] `fake_integration.payment_gateway_always_succeeds` — Payment gateway function unconditionally returns success without contacting any processor
  - Category: fake_integration
  - Severity: critical
  - Detector type: hybrid
  - Source evidence: `src/openclaw/projects/capsule-pro/apps/api/app/api/accounting/payments/[id]/gateway.ts`
  - Future implementation: Detect payment/charge/gateway functions that return `{ success: true }` unconditionally with `void input.` patterns and no network calls, cross-reference against existing SDK clients in the monorepo that are not imported

- [ ] `dashboard_illusion.sku_agnostic_event_usage_formula` — Event-based inventory usage projection ignores SKU and applies uniform per-guest formula to all items
  - Category: dashboard_illusion
  - Severity: high
  - Detector type: cross_file
  - Source evidence: `src/openclaw/projects/capsule-pro/apps/api/app/lib/inventory-forecasting.ts`
  - Future implementation: Detect forecasting functions with unused SKU params, hardcoded per-guest multipliers, and "in production" disclaimers; cross-reference against recipe_ingredient schema to confirm real data path exists but is unused
- [ ] `dashboard_illusion.simulated_gps_tracking_via_math_random` — Simulated GPS Tracking Using Math.random() Instead of Real Telemetry
  - Category: dashboard_illusion
  - Severity: high
  - Detector type: hybrid
  - Source evidence: `apps/api/app/api/logistics/tracking/route.ts`
  - Future implementation: Regex scan for Math.random() near lat/lng/heading/speed assignments, cross-file check for UI consumer presenting data as real tracking, confirm no GPS SDK integration.
- [ ] `feature_claim_mismatch.payroll_tax_write_read_asymmetry` — Payroll Tax Data Silently Dropped on Persistence (Write-Read Asymmetry)
  - Category: feature_claim_mismatch
  - Severity: critical
  - Detector type: cross_file
  - Source evidence: `packages/payroll-engine/src/dataSource/PrismaPayrollDataSource.ts`
  - Future implementation: Cross-file detector that compares TypeScript model fields against Prisma schema columns and read-path return values, flagging when write drops fields that the model declares and the read path hardcodes to zero/empty.
- [ ] `test_theater.tautological_assertions_in_test_file` — Test File with High Ratio of Tautological Assertions (expect(true).toBe(true))
  - Category: test_theater
  - Severity: medium
  - Detector type: hybrid
  - Source evidence: `apps/app/__tests__/settings/settings-workflow.test.ts`
  - Future implementation: Regex scan for expect(true).toBe(true) frequency per test file, combined with import analysis to confirm zero application imports. Flag files with >3 tautological assertions and no app imports as test theater.

- [ ] `feature_claim_mismatch.ai_staffing_is_just_arithmetic` — Feature branded as AI-powered has zero AI/LLM implementation
  - Category: feature_claim_mismatch
  - Severity: high
  - Detector type: cross_file
  - Source evidence: `apps/api/app/api/staffing/recommendations/route.ts`
  - Future implementation: Cross-reference UI elements claiming "AI-powered" with their backend API handlers, scanning for any LLM/AI SDK imports or model invocations. Flag when AI branding exists but backend is pure deterministic arithmetic.

- [ ] `automation_theater.cron_route_never_scheduled` — Cron route exists in codebase but is never scheduled in deployment config
  - Category: automation_theater
  - Severity: high
  - Detector type: cross_file
  - Source evidence: `apps/api/app/api/cron/email-reminders/route.ts` and `apps/api/app/api/cron/idempotency-cleanup/route.ts` (missing from `apps/api/vercel.json` crons array)
  - Future implementation: Discover all route.ts files under cron/ dirs, extract their HTTP paths, parse vercel.json crons array, flag paths not present in schedule

- [ ] `automation_theater.webhook_config_without_domain_event_producers` — Webhook configuration accepts entity types that never produce domain events
  - Category: automation_theater
  - Severity: high
  - Detector type: cross_file
  - Source evidence: `apps/api/app/api/integrations/webhooks/route.ts`
  - Future implementation: Cross-reference webhook entity type allowlists against outboxEvent.create producers; verify webhook trigger endpoint has callers; check if outbox publisher dispatches to webhooks or only realtime

- [ ] `fake_integration.iot_system_without_device_connectivity` — IoT/hardware monitoring system with no device connectivity layer
  - Category: fake_integration
  - Severity: high
  - Detector type: cross_file
  - Source evidence: `apps/api/app/api/kitchen/iot/readings/route.ts`
  - Future implementation: Identify IoT/sensor API directories, verify all routes require user auth with no unauthenticated device ingestion, grep for MQTT/BLE/device-SDK imports, check alert paths for database-only writes

- [ ] `security_theater.rbac_guard_never_wrapped_into_runtime` — RBAC permission guard exported but never wired into runtime factory
  - Category: security_theater
  - Severity: critical
  - Detector type: cross_file
  - Source evidence: `apps/api/lib/manifest-runtime.ts`
  - Future implementation: Locate runtime factory, verify permission guard exists in same package, grep all API routes/server actions for guard imports, confirm role data available in user context, flag when guard is exported+tested but zero production callers exist

- [ ] `automation_theater.sms_automation_rules_crud_without_engine` — Automation rules CRUD exists but engine/trigger is dead code (never imported)
  - Category: automation_theater
  - Severity: high
  - Detector type: cross_file
  - Source evidence: `packages/notifications/index.ts` (engine/triggers not exported), `packages/notifications/sms-automation-engine.ts` (zero callers)
  - Future implementation: Identify automation engine/trigger files not exported from package index, verify zero application imports, cross-reference against CRUD routes and UI claiming the feature works

- [ ] `dashboard_illusion.actual_revenue_hardcoded_to_budget` — Actual metric value hardcoded to budget/planned value
  - Category: dashboard_illusion
  - Severity: high
  - Detector type: semantic
  - Source evidence: `apps/app/app/(authenticated)/analytics/events/actions/get-event-profitability.ts`
  - Future implementation: Find assignments where 'actual' variables are directly assigned from 'budgeted'/'planned' variables without data fetching, verify they flow into variance calculations rendered by UI

- [ ] `feature_claim_mismatch.ui_button_calls_501_stub_with_silent_failure` — UI action button calls 501 stub endpoint with no error feedback to user
  - Category: feature_claim_mismatch
  - Severity: medium
  - Detector type: cross_file
  - Source evidence: `apps/api/app/api/logistics/routes/commands/optimize/route.ts`
  - Future implementation: Cross-reference 501-returning API routes against frontend components that call them; flag when the frontend handler lacks user-facing error feedback (toast, alert, banner) and UI conditionally renders based on unreachable status values

- [ ] `feature_claim_mismatch.calendar_advertises_nonexistent_deadline_reminder_types` — Calendar advertises deadline and reminder event types that have no database models or query implementation
  - Category: feature_claim_mismatch
  - Severity: medium
  - Detector type: cross_file
  - Source evidence: `apps/api/app/api/calendar/route.ts` (BLOCKER comment, missing query blocks), `apps/app/app/(authenticated)/calendar/components/unified-calendar.tsx` (filter badges for all 5 types via Object.entries)
  - Future implementation: Find TypeScript type unions or config maps listing event/entity types, cross-reference against BLOCKER/TODO comments confirming missing models, and verify frontend renders those types as active filter toggles without 'coming soon' labels

- [ ] `skeleton_crud.recipe_cost_skips_unit_conversion` — Recipe cost calculation skips unit conversion between recipe units and vendor units
  - Category: skeleton_crud
  - Severity: high
  - Detector type: hybrid
  - Source evidence: `apps/app/app/api/recipes/calculate-cost/route.ts`
  - Future implementation: Find cost-calculation functions that multiply quantity × unit cost without unit conversion, especially when both recipe and vendor unit fields are queried but never bridged
- [ ] `skeleton_crud.abandoned_dynamic_sql_replaced_inplace` — Abandoned dynamic SQL builder replaced by inline redo in same function
  - Category: skeleton_crud
  - Severity: medium
  - Detector type: ast
  - Source evidence: `apps/api/app/api/crm/scoring/[id]/route.ts`
  - Future implementation: Find functions with two sequential DB write operations where the first builds dynamic SQL arrays that are never consumed, signaled by a reduce returning acc unchanged and a "re-do" comment near the second operation

- [ ] `feature_claim_mismatch.audit_log_table_read_only_with_comprehensive_ui` — Audit log table with comprehensive read UI but no application-level writers
  - Category: feature_claim_mismatch
  - Severity: high
  - Detector type: cross_file
  - Source evidence: `apps/api/app/api/settings/audit-log/route.ts`
  - Future implementation: Find audit_log tables with read endpoints and frontend UI, then grep for INSERT/create/trigger writers; flag when read infrastructure (paginated UI, filters, user resolution) exists but writes are limited to 0-1 narrow endpoints

- [ ] `fake_integration.sync_route_creates_duplicates_no_external_id_mapping` — External sync route creates records without external ID deduplication
  - Category: fake_integration
  - Severity: high
  - Detector type: hybrid
  - Source evidence: `apps/api/app/api/calendar/sync/trigger/route.ts`
  - Future implementation: Find routes that loop over external API results and use database.create() instead of upsert() without an externalId field, signaled by "In production" comments and silent catch blocks that only increment counters

- [ ] `feature_claim_mismatch.stale_workaround_causes_double_persist` — Stale runtime workaround causes double persistence on create commands
  - Category: feature_claim_mismatch
  - Severity: high
  - Detector type: hybrid
  - Source evidence: `apps/api/app/api/communications/email-templates/commands/create/route.ts`
  - Future implementation: Find non-auto-generated route files that call both runCommand("create") and createInstance/raw-SQL-INSERT, with corroborating stale comment signals claiming runCommand does not persist

- [ ] `feature_claim_mismatch.ai_route_is_pure_regex_with_fabricated_confidence` — AI-branded route uses pure regex parsing with arithmetically-fabricated confidence score
  - Category: feature_claim_mismatch
  - Severity: medium
  - Detector type: hybrid
  - Source evidence: `apps/api/app/api/ai-event-setup/parse/route.ts`
  - Future implementation: Find files in ai-prefixed paths that build confidence scores arithmetically (+= fixed floats) without importing any AI/ML library, confirmed by companion regex-heavy code patterns

- [ ] `feature_claim_mismatch.followup_generator_ignores_event_type` — Follow-up generator claims event-type-aware behavior but queries eventType without consuming it
  - Category: feature_claim_mismatch
  - Severity: medium
  - Detector type: hybrid
  - Source evidence: `apps/api/app/api/events/automated-followups/commands/generate/route.ts`
  - Future implementation: Find handler files that query an eventType field but never branch on it, while claiming type-aware behavior in comments or JSDoc

- [ ] `feature_claim_mismatch.ai_assistant_chat_to_nonexistent_endpoint` — AI chat component uses useChat wired to API route that does not exist
  - Category: feature_claim_mismatch
  - Severity: high
  - Detector type: cross_file
  - Source evidence: `apps/app/app/(authenticated)/components/ai-assistant/ai-assistant-panel.tsx`
  - Future implementation: Extract API paths from DefaultChatTransport constructors, verify corresponding Next.js route files exist, flag when component is mounted in layout and route is absent
- [ ] `dashboard_illusion.attendance_rate_always_100_tautological_sql` — Attendance rate metric computed from identical COUNT(*) expressions on same table, always 100%
  - Category: dashboard_illusion
  - Severity: medium
  - Detector type: regex
  - Source evidence: `apps/app/app/(authenticated)/analytics/staff/actions/get-employee-performance.ts`
  - Future implementation: Flag SQL queries where total_shifts and attended_shifts are both COUNT(*) on the same table, with companion pattern verifying attendanceRate is computed as their ratio in the consuming code
- [ ] `automation_theater.food_safety_alert_without_notification_delivery` — Alert/event creation endpoint persists records but never dispatches notifications
  - Category: automation_theater
  - Severity: critical
  - Detector type: hybrid
  - Source evidence: `apps/api/app/api/kitchen/iot/alerts/route.ts`
  - Future implementation: Match BLOCKER/TODO comments admitting notification service is not implemented, verify the same file persists records via database create, suppress if notification dispatch calls (send/notify/push/publish/emit) exist in the file
- [ ] `error_handling_theater.silent_json_parse_failure_empty_object` — request.json().catch(() => ({})) silently replaces malformed body with empty object in POST routes
  - Category: error_handling_theater
  - Severity: high
  - Detector type: regex
  - Source evidence: `apps/api/app/api/events/[eventId]/shipments/generate/route.ts`, `apps/api/app/api/command-board/simulations/[id]/apply/route.ts`, `apps/api/app/api/integrations/webhooks/dlq/[id]/retry/route.ts`
  - Future implementation: Match the exact `request.json().catch(() => ({}))` pattern in route files, require companion pattern for POST/PUT/PATCH export, skip test and doc files
- [ ] `dashboard_illusion.predictive_ltv_is_arithmetic_with_fake_confidence` — Predictive/analytics UI labels backed by trivial arithmetic instead of ML models
  - Category: dashboard_illusion
  - Severity: medium
  - Detector type: hybrid
  - Source evidence: `apps/app/app/(authenticated)/analytics/clients/actions/get-client-ltv.ts`
  - Future implementation: Match hardcoded confidence assignments and trivial arithmetic labeled as "predicted" or "predictive", suppress when real ML imports (TensorFlow, brain.js, ml5) or model.fit/predict calls are present
