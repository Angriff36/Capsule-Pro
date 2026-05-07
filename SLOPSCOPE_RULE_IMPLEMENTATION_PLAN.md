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
