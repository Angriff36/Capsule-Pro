# SlopScope rule discovery

---
## [2026-05-07 06:27] Rule Discovery — fake_integration.mock_fallback_as_production_path

### Finding
The document-parser's PDF extraction layer (`docling-adapter.ts`) claims to use Docling (a real Python-based PDF extraction tool) but silently falls back to hardcoded mock data on any failure — including the common case where Docling is simply not installed. The mock function is exported publicly, the fallback is invisible to callers (it returns the same `ExtractionResult` type), and the entire test suite only exercises the mock path because test files reference `/tmp/test-menu.pdf` which doesn't exist in CI. The README acknowledges the fallback exists "for development/testing" but the code has no guard to prevent it from running in production — the `extractPdf` function is the sole entry point and it always tries the real path first, catches all errors, and falls back to fake salmon-and-short-ribs data with only a warning diagnostic.

### Evidence
- File: `projects/document-parser/project/packages/document-parser/src/extraction/docling-adapter.ts`
- Lines 84-140: `extractPdf` function — tries `execSync('docling ...')` then catches all errors and calls `extractPdfMock`
- Lines 132-138: catch block — `return extractPdfMock(filePath, issues);`
- Lines 142-298: `extractPdfMock` — exported function returning hardcoded `LayoutBlock[]` with IDs like `mock-heading-1`, `mock-item-1`, etc.
- File: `projects/document-parser/project/packages/document-parser/src/pipeline.test.ts`
- Line 5: `describe('Full pipeline (mock extraction)', () => {`
- Line 8: `resolve('/tmp/test-menu.pdf')` — file doesn't exist in CI, so mock is always used
- File: `projects/document-parser/project/packages/document-parser/README.md`
- Line 17: "PDFs are processed via Docling (Python), which preserves reading order, layout blocks, bounding boxes, font metadata, and table structure"
- Line 20: "If Docling is unavailable, the adapter falls back to a mock extraction for development/testing"

### Why this matters
The document-parser is a core piece of infrastructure for catering operations — it parses menus, staffing, and inventory from PDFs. If the mock fallback activates in production (which it will whenever Docling isn't installed, crashes, times out, or the file path is wrong), the system will silently return fake "Pan-Seared Salmon" and "Braised Short Ribs" data to downstream consumers. The caller gets a valid `ExtractionResult` with entities, diagnostics, and a summary — it looks completely real. The only hint is a warning diagnostic with the message "Using mock extraction. Real Docling integration requires Python environment." but nothing in the pipeline stops or surfaces this to the user. A kitchen could receive fabricated menu data and act on it.

### Proposed detector rule
```json
{
  "id": "fake_integration.mock_fallback_as_production_path",
  "title": "Mock data fallback silently used as production extraction path",
  "category": "fake_integration",
  "severity": "critical",
  "confidence": 0.92,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "javascript", "python", "any"],
  "patterns": [
    "export function.*mock|export async function.*mock",
    "catch.*\\{[\\s\\S]*?return.*mock",
    "Using mock extraction|mock extraction|Falling back to mock",
    "extractionEngine.*mock|mock.*extraction"
  ],
  "negative_patterns": [
    "*.test.ts", "*.spec.ts", "*.mock.ts", "__mocks__/", "__tests__/",
    "test/",
    "// mock only|// test-only|test double"
  ],
  "evidence_required": [
    "mock function is exported from a non-test module",
    "catch block in production code returns mock data",
    "no environment guard (e.g. process.env.NODE_ENV) separating mock from real path",
    "test suite exercises mock path exclusively (no integration test for real extraction)",
    "README or docs claim real integration exists"
  ],
  "false_positive_controls": [
    "exclude files in __mocks__/ or test fixtures directories",
    "exclude functions with @internal or @visibleForTesting annotations",
    "exclude catch blocks that re-throw after logging",
    "require the mock function to be exported (not just defined) in a src/ or lib/ path"
  ],
  "user_impact": "Production system silently returns fabricated data instead of real extraction results. Downstream consumers (kitchens, inventory systems, staffing tools) receive fake menu items, quantities, and assignments that look structurally valid but are completely invented. No error is surfaced to the user — only a warning diagnostic that most consumers will never check.",
  "repair_guidance": "Add an environment guard (NODE_ENV !== 'production') before the mock fallback. In production, the catch block should throw or return an error result instead of fake data. Add a dedicated integration test that verifies real Docling extraction with a test PDF. Gate the mock export behind a test-only conditional. Surface extraction engine identity prominently in the result metadata so callers can detect mock vs real extraction.",
  "example_source": {
    "file": "projects/document-parser/project/packages/document-parser/src/extraction/docling-adapter.ts",
    "line_or_snippet": "} catch (err) {\n    const message = err instanceof Error ? err.message : String(err);\n    issues.push({\n      severity: 'error',\n      message: `Docling extraction failed: ${message}. Falling back to mock extraction.`,\n    });\n    return extractPdfMock(filePath, issues);\n  }"
  }
}
```

### Implementation note
This rule should cross-reference exported mock functions against catch blocks that invoke them, then verify no environment guard exists. It should also check the test suite for exclusive mock-path coverage by looking for test files that reference the same mock data literals (e.g., "Pan-Seared Salmon") rather than testing with real document fixtures.
---
## [2026-05-07 06:40] Rule Discovery — automation_theater.cancel_endpoint_status_write_only

### Finding
The claude-workflow API exposes a `DELETE /jobs/:job_id` endpoint that claims to cancel running jobs by "sending SIGTERM to the subprocess." The SPEC.md document explicitly states "Cancel a running job (sends SIGTERM to subprocess)." The route handler for RUNNING status includes comments saying "the worker loop will pick up the CANCELLED status" and "The actual SIGTERM is handled by the runner's subprocess cleanup." However, the runner (`runner.py`) never checks the database for cancellation status and never sends SIGTERM in response to a cancel request. The worker loop only polls for QUEUED jobs, and `_run_one()` runs the subprocess to completion unconditionally. The only SIGTERM logic in the runner is the timeout-based one (after `timeout` seconds), which is unrelated to cancellation. The net effect: calling `DELETE /jobs/:job_id` on a RUNNING job writes CANCELLED to the database and returns 200, but the Claude subprocess continues running. When it finishes, the runner overwrites CANCELLED with SUCCESS or ERROR, silently undoing the cancel. The user sees a brief "cancelled" flash that gets replaced by the actual result. The cancel endpoint is implementation theater — it appears to work but does nothing meaningful for running jobs.

### Evidence
- File: `src/claude-workflow/SPEC.md`
- Line 76: `"Cancel a running job (sends SIGTERM to subprocess)."`
- File: `src/claude-workflow/app/routes/jobs.py`
- Lines 63-72: RUNNING branch — updates DB status to CANCELLED but sends no signal
- Lines 64-65: Comments claim "the worker loop will pick up the CANCELLED status" and "The actual SIGTERM is handled by the runner's subprocess cleanup" — neither statement is true
- File: `src/claude-workflow/app/runner.py`
- Lines 74-93: `worker_loop()` — only checks for QUEUED status, never reads CANCELLED
- Lines 17-71: `_run_one()` — no cancellation check, no SIGTERM on cancel, runs subprocess to completion
- Lines 153-167: Only SIGTERM logic is timeout-based, triggered by `asyncio.TimeoutError`, not by DB status

### Why this matters
A user or calling agent that needs to stop a long-running Claude CLI job will call DELETE, get a 200 with "cancelled" status, and believe the job is stopped. But the subprocess continues consuming Claude API credits and compute. When it finishes, the job status flips from CANCELLED back to SUCCESS or ERROR — the cancel is silently undone. For cost-sensitive operations (Claude API calls are expensive, especially with opus models), this means wasted money with no way to actually stop a running job. The misleading comments compound the problem by making the code appear correct to future developers who won't realize the gap.

### Proposed detector rule
```json
{
  "id": "automation_theater.cancel_endpoint_status_write_only",
  "title": "Cancel/stop endpoint writes status but never signals the running process",
  "category": "automation_theater",
  "severity": "high",
  "confidence": 0.95,
  "detector_type": "cross_file",
  "language_targets": ["python", "typescript", "javascript", "any"],
  "patterns": [
    "DELETE.*job.*cancel|cancel.*job.*status",
    "status.*CANCELLED|status.*cancelled",
    "SIGTERM|terminate|kill.*process|send_signal",
    "worker.*loop|_run_one|process_update.*status"
  ],
  "negative_patterns": [
    "proc\\.terminate|proc\\.kill|process\\.send_signal|subprocess\\.terminate",
    "await.*terminate|await.*kill"
  ],
  "evidence_required": [
    "API route or handler sets status to cancelled/stopped in database or state store",
    "Comments or docstrings claim signal (SIGTERM/SIGKILL) is sent to subprocess",
    "The worker/runner that actually executes the process has no code path that checks for cancellation status",
    "The worker/runner has no mechanism to send signals in response to external cancellation requests",
    "The worker will overwrite the cancelled status with the actual completion status when the process finishes"
  ],
  "false_positive_controls": [
    "exclude systems where the runner polls a cancellation flag from shared memory or event queue (not just DB)",
    "exclude systems where process.kill/terminate is called from a different module than the runner",
    "exclude graceful shutdown paths (app lifecycle) — focus on per-job cancellation"
  ],
  "user_impact": "Users cannot actually cancel running jobs despite the API claiming they can. Expensive long-running Claude CLI subprocesses continue consuming API credits after cancellation. The job status briefly shows cancelled but silently reverts to the real completion status, making the cancel appear to succeed then mysteriously undo itself. This wastes money and erodes trust in the API behavior.",
  "repair_guidance": "Either (a) implement actual cancellation by having the runner periodically check the DB for CANCELLED status and send SIGTERM to the subprocess, or (b) keep a shared dict of running processes keyed by job_id so the cancel endpoint can directly send SIGTERM, or (c) remove the RUNNING branch from the cancel endpoint and return a 409/422 explaining that running jobs cannot be cancelled until this is implemented. At minimum, fix the misleading comments that claim the worker loop picks up cancellation.",
  "example_source": {
    "file": "src/claude-workflow/app/routes/jobs.py",
    "line_or_snippet": "elif job.status == JobStatus.RUNNING:\n        # Signal the subprocess — the worker loop will pick up the CANCELLED status\n        # and let _run_one complete. We mark it cancelled so it does not get re-queued.\n        # The actual SIGTERM is handled by the runner subprocess cleanup.\n        from datetime import datetime, timezone\n        await job_store.update_job(\n            job_id,\n            status=JobStatus.CANCELLED,\n            completed_at=datetime.now(timezone.utc),\n        )"
  }
}
```

### Implementation note
This rule should cross-reference cancel/stop endpoints against the worker/runner that executes jobs. It should look for: (1) an endpoint that writes a cancellation status to a store, (2) comments or docs claiming signal delivery, and (3) the absence of any signal-sending code path in the runner triggered by that status. A secondary check is whether the runner overwrites the cancelled status on completion, which proves the cancel was never honored.
---
---
## [2026-05-07 06:56] Rule Discovery — dashboard_illusion.fabricated_token_cost_from_hardcoded_constants

### Finding
The Usage Analytics dashboard (`UsageView.tsx`) in the autolab project presents "Est. Total Tokens", "Est. Cost" (dollar amounts), and "Token Usage by Agent/Model/Over Time" charts — all derived from a `estimateTokens()` function that uses hardcoded magic numbers (150, 300, 500, 200, 100) assigned per `activity_type` string. The `agent_activity` database table has zero token-tracking columns — no `input_tokens`, `output_tokens`, `token_count`, or anything similar. The `log_agent_activity()` SQL function does not accept or store token data. Additionally, the TypeScript interface declares a `model: string | null` field, but the database table has no `model` column, so every row returns `null` — the "Usage by Model" pie chart always shows a single "unknown" slice. The entire token/cost analytics surface is fabricated from event counts multiplied by arbitrary constants, then multiplied by a "$10/1M blended rate" to produce dollar figures. The UI labels like "Est. Total Tokens" and "Est. Cost" are the only hints these are estimates, but the word "Est." is easy to overlook and the numbers are presented with the same visual weight as the real task-throughput metrics.

### Evidence
- File: `src/openclaw/projects/autolab/src/components/analytics/UsageView.tsx`
- Lines 136-147: `estimateTokens()` — hardcoded `baseTokens` map with arbitrary constants per activity type
- Lines 211-213: Cost calculation using `blendedRatePerM = 10` multiplied by fabricated token total
- Lines 417-431: UI cards displaying "Est. Total Tokens" and "Est. Cost" with dollar formatting
- Lines 48-57: `AgentActivity` interface declares `model: string | null` — no DB backing
- Lines 179-186: "By model" aggregation reading `a.model` which is always `null`
- File: `src/openclaw/projects/autolab/supabase/migrations/20260310121500_agent_activity.sql`
- Lines 1-12: `CREATE TABLE agent_activity` — columns: id, agent_id, channel_id, task_id, activity_type, tool_name, tool_args, result_summary, success, created_at — no token or model columns
- Lines 19-42: `log_agent_activity()` function — no token or model parameters

### Why this matters
A user looking at the Usage Analytics page sees authoritative-looking dashboards: "Est. Total Tokens: 48.2K", "Est. Cost: $0.48", bar charts of token usage by agent, pie charts of usage by model. This creates a false impression that the system is tracking real LLM token consumption and cost. In reality, every number is fabricated from event counts multiplied by made-up constants. The cost figure is particularly misleading — someone could use this to budget or report API spending, and the number would be completely wrong. The "Usage by Model" chart is permanently broken since the `model` column doesn't exist in the database. This is dashboard illusion: the UI creates the appearance of real analytics infrastructure where none exists.

### Proposed detector rule
```json
{
  "id": "dashboard_illusion.fabricated_token_cost_from_hardcoded_constants",
  "title": "Dashboard displays fabricated token/cost metrics from hardcoded per-type constants instead of actual token data",
  "category": "dashboard_illusion",
  "severity": "medium",
  "confidence": 0.93,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "tsx", "javascript"],
  "patterns": [
    "estimateTokens|estimatedTokens|estimate.*token",
    "baseTokens|tokenMultiplier|token_per_|TOKEN_COST|blendedRate",
    "const.*\\{.*:.*\\d+.*\\}.*token",
    "estimatedCost|estimated_cost|est.*cost",
    "blendedRatePerM|blended.*rate.*1M"
  ],
  "negative_patterns": [
    "usage\\.total_tokens|completion_tokens|prompt_tokens",
    "tiktoken|tokenize|countTokens",
    "actual.*tokens|real.*token|reported.*token"
  ],
  "evidence_required": [
    "Dashboard component calculates token metrics from a hardcoded lookup table (activity_type -> number)",
    "The corresponding database table or API response has no token-count columns",
    "The UI presents the fabricated values with labels like 'Est. Total Tokens' or 'Est. Cost'",
    "No tokenizer or token-counting library is imported or used",
    "Dollar cost is derived from the fabricated token count using a static rate"
  ],
  "false_positive_controls": [
    "exclude dashboards that pull token_count from an API/database and merely format it",
    "exclude components that clearly label values as 'simulated' or 'demo'",
    "exclude cases where the hardcoded constants are documented as intentional approximations with a known error margin"
  ],
  "user_impact": "Users see authoritative-looking token usage and cost dashboards that display fabricated numbers. The cost figures could be used for budgeting or reporting, leading to incorrect financial decisions. The 'Usage by Model' chart is permanently broken since the model column doesn't exist in the database, so it always shows 'unknown'. The analytics page creates trust in observability infrastructure that doesn't actually exist.",
  "repair_guidance": "Add input_tokens, output_tokens, and model columns to the agent_activity table. Update log_agent_activity() to accept and store actual token counts from the LLM provider response. Replace estimateTokens() with a function that sums the stored token counts. Update the TypeScript interface to match the new schema. If actual token data isn't available yet, remove the token and cost cards entirely and show only the event-count metrics (requests, success rate) which are grounded in real data.",
  "example_source": {
    "file": "src/openclaw/projects/autolab/src/components/analytics/UsageView.tsx",
    "line_or_snippet": "const estimateTokens = (activity: AgentActivity): number => {\n    const baseTokens: Record<string, number> = {\n      'message': 150,\n      'tool_call': 300,\n      'reasoning': 500,\n      'task_start': 200,\n      'task_complete': 150,\n      'error': 100,\n    };\n    return baseTokens[activity.activity_type] || 150;\n  };"
  }
}
```

### Implementation note
This rule should cross-reference dashboard components that display token/cost metrics against the underlying data schema. It should look for: (1) a function that maps activity types or event categories to hardcoded token constants, (2) a database table or API that stores activity events without any token-count columns, and (3) UI presentation of the resulting numbers as token/cost estimates. A secondary check is whether model-specific breakdowns reference a column that doesn't exist in the schema, producing permanently broken charts.
---
## [2026-05-07 07:09] Rule Discovery — security_theater.optional_webhook_signature_bypass

### Finding
The Resend email webhook handler (`/api/collaboration/notifications/email/webhook`) implements HMAC-SHA256 signature verification using `timingSafeEqual` — a textbook-secure implementation. However, the verification is conditionally guarded by `if (webhookSecret && !verifyResendSignature(...))`, meaning when the `RESEND_WEBHOOK_SECRET` environment variable is unset or empty, the guard short-circuits to `false` and **all requests are accepted without any verification**. This is the opposite of the Twilio SMS webhook in the same project, which calls `handleUnauthenticatedRequest()` when `TWILIO_AUTH_TOKEN` is missing — properly rejecting unauthenticated traffic. The email webhook's docstring says "Verifies HMAC-SHA256 signature before processing" but this is only true when the secret is configured. There is no `.env.example` entry, no startup validation requiring the secret, and no test file for the email webhook. The env var `RESEND_WEBHOOK_SECRET` appears only once in the entire codebase — in the route handler itself.

### Evidence
- File: `src/openclaw/projects/capsule-pro/apps/api/app/api/collaboration/notifications/email/webhook/route.ts`
- Lines 5-6: Docstring claims "Verifies HMAC-SHA256 signature before processing"
- Lines 64-87: `verifyResendSignature()` — correct implementation with timingSafeEqual and timestamp staleness check
- Lines 98-104: Conditional guard — `if (webhookSecret && !verifyResendSignature(...))` — skips verification when secret is missing
- File: `src/openclaw/projects/capsule-pro/apps/api/app/api/collaboration/notifications/sms/webhook/route.ts`
- Lines 117-119: `if (!authToken) return handleUnauthenticatedRequest(request)` — properly rejects when secret is missing
- Lines 121-136: Always verifies signature after confirming authToken exists
- No test file exists for the email webhook (confirmed by search of `*.test.ts` for "email.*webhook|resend.*webhook")
- `RESEND_WEBHOOK_SECRET` env var appears only in the email webhook route — no `.env.example`, no config validation, no documentation

### Why this matters
An attacker who discovers the email webhook URL can forge delivery status updates for any tenant's emails. Since the endpoint performs a cross-tenant lookup by `resend_id` and updates the `email_logs` table, a forged request could mark emails as "bounced" (causing automated retry/alert logic), "delivered" (suppressing legitimate monitoring), or trigger other downstream effects. The multi-tenant nature makes this worse — a single forged request can affect any tenant's email records. The vulnerability is silent: no warning is logged when the secret is missing, no startup check fails, and the code appears secure at first glance because the verification function exists and is well-implemented.

### Proposed detector rule
```json
{
  "id": "security_theater.optional_webhook_signature_bypass",
  "title": "Webhook signature verification is conditionally skipped when secret env var is missing",
  "category": "security_theater",
  "severity": "high",
  "confidence": 0.94,
  "detector_type": "regex",
  "language_targets": ["typescript", "javascript", "tsx"],
  "patterns": [
    "if\\s*\\(\\s*\\w*[Ss]ecret\\s*&&\\s*!verify",
    "if\\s*\\(\\s*\\w*[Ss]ecret\\s*&&\\s*!.*[Ss]ignature",
    "if\\s*\\(.*WEBHOOK.*SECRET.*&&",
    "webhookSecret\\s*&&\\s*!",
    "process\\.env\\..*[Ss]ecret.*&&\\s*!"
  ],
  "negative_patterns": [
    "if\\s*\\(!.*[Ss]ecret.*\\)\\s*(return|throw)",
    "if\\s*\\(!.*[Ss]ecret.*\\)\\s*\\{\\s*return.*401",
    "handleUnauthenticated|rejectUnauthorized"
  ],
  "evidence_required": [
    "Webhook handler has signature verification function (HMAC, timingSafeEqual, etc.)",
    "Verification is conditionally guarded by checking if the secret env var is truthy",
    "When the secret is falsy, the request proceeds without any verification (no early return, no rejection)",
    "Docstring or comments claim verification happens unconditionally",
    "No startup validation or required-env-var check enforces the secret's presence"
  ],
  "false_positive_controls": [
    "exclude cases where missing secret causes an early return/rejection before reaching verification",
    "exclude development-only webhook handlers (localhost-only, dev-middleware)",
    "exclude cases where the conditional guard logs a warning before skipping"
  ],
  "user_impact": "An attacker who discovers the webhook URL can forge delivery status updates for any tenant's emails. This can mark legitimate emails as bounced (triggering incorrect retry/alert behavior), mark undelivered emails as delivered (suppressing monitoring), or trigger arbitrary downstream effects tied to email status changes. The multi-tenant architecture amplifies the blast radius since a single forged request targets any tenant by email ID.",
  "repair_guidance": "Mirror the SMS webhook pattern: if the secret env var is missing, reject the request immediately with a 401/500 error and log a startup warning. Remove the conditional guard — signature verification should be mandatory, not optional. Add RESEND_WEBHOOK_SECRET to .env.example as a required variable. Add a test that verifies requests without a valid signature are rejected even when the secret is not configured.",
  "example_source": {
    "file": "src/openclaw/projects/capsule-pro/apps/api/app/api/collaboration/notifications/email/webhook/route.ts",
    "line_or_snippet": "const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;\n    if (\n      webhookSecret &&\n      !verifyResendSignature(rawBody, signatureHeader, webhookSecret)\n    ) {\n      return NextResponse.json({ error: \"Invalid signature\" }, { status: 401 });\n    }"
  }
}
```

### Implementation note
This rule should flag webhook handlers where signature verification exists but is conditionally guarded by the presence of a secret env var. It should cross-reference with sibling webhook handlers in the same project to detect inconsistent patterns (e.g., one rejects when secret is missing, the other silently proceeds). A secondary check is whether the env var appears in any `.env.example` or startup validation — if it only appears in the handler itself, the secret is likely never validated as required infrastructure.
---
---
## [2026-05-07 07:31] Rule Discovery — automation_theater.audit_log_to_console

### Finding
The payroll-engine package has a `PayrollDataSource` interface with a `savePayrollAudit` method that the `PayrollService` calls after generating and exporting payroll runs. The InMemoryPayrollDataSource test double properly stores audit records in an array. However, the production `PrismaPayrollDataSource` implementation silently drops audit records to `console.log` because the `PayrollAudit` model doesn't exist in the Prisma schema. This means every payroll generation and export in production appears to work correctly but no audit trail is actually persisted — a compliance and accountability gap masked by the fact that the in-memory test implementation works fine.

### Evidence
- File: `src/openclaw/projects/capsule-pro/packages/payroll-engine/src/dataSource/PrismaPayrollDataSource.ts`
- Lines 286-297:
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
- Contrast with InMemoryPayrollDataSource (payrollService.ts:356-358): `this.audits.push(audit)` — test double stores properly
- Prisma schema (`packages/database/prisma/schema.prisma`): No `PayrollAudit` model exists. Models `payroll_line_items`, `payroll_periods`, `payroll_runs` exist but audit is absent.
- PayrollService calls `savePayrollAudit` at line 169 (after generate) and line 254 (after export), both with `enableAuditLog` defaulting to `true`.

### Why this matters
Payroll audit trails are a legal and compliance requirement in most jurisdictions (FLSA recordkeeping, IRS retention requirements, state labor board audits). The system creates rich audit records including tenant ID, period ID, action type, user ID, and timestamp — but in production they vanish into stdout. Any compliance audit, dispute resolution, or forensic investigation into payroll changes would find zero persisted records. The test suite passes because the InMemory test double works correctly, creating a false sense of security. This is a textbook case of automation theater: the infrastructure for auditing exists and is exercised, but the production implementation is a no-op.

### Proposed detector rule
```json
{
  "id": "automation_theater.audit_log_to_console",
  "title": "Audit/compliance logging method drops to console instead of persistent storage",
  "category": "automation_theater",
  "severity": "high",
  "confidence": 0.9,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "methods named *audit*, *log*, *track*, *record* that contain console.log as the sole implementation body",
    "interface method implementations where the test double persists data but the production adapter only logs",
    "BLOCKER/TODO comments adjacent to console.log in methods that implement an interface expecting persistence"
  ],
  "negative_patterns": [
    "console.log in test files",
    "console.log in CLI scripts or standalone utilities",
    "intentional debug/diagnostic logging classes",
    "methods with 'debug' or 'verbose' in the name"
  ],
  "evidence_required": [
    "interface or abstract class defining the method signature expecting persistent storage",
    "production implementation that only calls console.log or similar non-durable output",
    "test double or mock that actually persists the data (proving the contract expects real storage)"
  ],
  "false_positive_controls": [
    "skip files in test/ or __tests__/ directories",
    "skip files with 'cli', 'script', 'debug' in the path",
    "require the method name to contain audit/log/track/record/compliance keywords",
    "require at least one interface implementation that persists to confirm the contract"
  ],
  "user_impact": "Compliance and legal exposure: payroll audit trails, access logs, or change records that should be persisted for regulatory compliance are silently lost. In disputes, audits, or investigations, no records exist. Tests pass because test doubles work correctly, hiding the production gap.",
  "repair_guidance": "1. Create the missing PayrollAudit model in the Prisma schema with fields matching the PayrollAudit interface (id, tenantId, periodId, action, userId, timestamp, metadata). 2. Implement savePayrollAudit to write to the database table. 3. Add retrieval methods (getPayrollAudits, etc.) to the data source interface and implement them. 4. Add integration tests that verify audit records survive a round-trip through the Prisma data source. 5. Remove the BLOCKER comment and console.log fallback.",
  "example_source": {
    "file": "src/openclaw/projects/capsule-pro/packages/payroll-engine/src/dataSource/PrismaPayrollDataSource.ts",
    "line_or_snippet": "async savePayrollAudit(audit: PayrollAudit): Promise<void> {\n    // BLOCKER: PayrollAudit model does not exist in schema...\n    console.log(\"[PayrollAudit]\", { id: audit.id, ... });\n  }"
  }
}
```

### Implementation note
This rule should use a hybrid detector: regex to find interface method implementations containing only console.log, combined with AST analysis to confirm the method implements an interface that expects persistent storage. The cross-file check (verifying the test double persists while production does not) is the highest-confidence signal but adds complexity. Start with the simpler regex+AST version that flags audit/log/track methods whose body is only console.log calls.

---
## [2026-05-07 07:47] Rule Discovery — fake_integration.registered_stub_connector_exposed_as_production

### Finding
The `@repo/supplier-connectors` package exports two supplier connectors — `UsFoodsConnector` and `CharliesProduceConnector` — that are registered in the singleton `connectorRegistry` at module load time and exposed to the application via a `GET /api/inventory/supplier-sync/connectors` API endpoint. The UI-facing connectors list returns `[{ id: "us-foods", name: "US Foods" }, { id: "charlies-produce", name: "Charlie's Produce" }]`, making them appear as available integrations. However, every method on both connectors is a stub: `fetchCatalog()` returns `[]`, `checkAvailability()` returns `{ available: false, quantity: 0 }` for every SKU, `fetchPricing()` returns `{}`, and `testConnection()` always returns `false`. The sync API route (`POST /api/inventory/supplier-sync/sync`) will happily accept a request with these connectors and invoke `SupplierSyncService.syncCatalog()` — which calls `connector.fetchCatalog(config)`, gets an empty array, then deactivates all existing catalog entries for that supplier because the sync sees "zero products" as "the supplier's catalog was cleared." A user who configures US Foods or Charlie's Produce as a supplier and triggers a sync will silently wipe their existing vendor catalog data.

### Evidence
- File: `packages/supplier-connectors/src/connectors/us-foods.ts`
- Lines 88-100: `fetchCatalog()` — `console.log("[us-foods] Catalog fetch not implemented"); return [];`
- Lines 109-126: `checkAvailability()` — returns `{ available: false, quantity: 0 }` for all SKUs
- Lines 135-149: `fetchPricing()` — returns `{}`
- File: `packages/supplier-connectors/src/connectors/charlies-produce.ts`
- Lines 89-119: `fetchCatalog()` — same pattern: `console.log(...); return [];`
- Lines 129-151: `checkAvailability()` — same pattern: returns `{ available: false, quantity: 0 }`
- Lines 165-182: `fetchPricing()` — returns `{}`
- File: `packages/supplier-connectors/src/registry.ts`
- Lines 121-122: Both stubs registered at module load: `connectorRegistry.register(usFoodsConnector); connectorRegistry.register(charliesProduceConnector);`
- File: `apps/api/app/api/inventory/supplier-sync/route.ts`
- Lines 64-73: API route looks up connector from registry and proceeds to call it
- Lines 119-120: `syncService.syncCatalog(connector, config)` — invokes the stub
- File: `packages/supplier-connectors/src/sync-service.ts`
- Lines 138-145: When `syncFullCatalog !== false`, any products NOT returned by the connector get deactivated (`isActive: false`)

### Why this matters
A catering operation using Capsule Pro could configure US Foods or Charlie's Produce as a supplier through the UI, enter credentials, and trigger a catalog sync. The sync would succeed (200 response) but return zero products and deactivate all existing catalog entries for that supplier. The availability check would report every item as unavailable, and pricing would return nothing. This silently destroys data and creates phantom out-of-stock conditions. The worst part: the connectors are listed in the API as available options, giving users no indication these integrations don't actually work.

### Proposed detector rule
```json
{
  "id": "fake_integration.registered_stub_connector_exposed_as_production",
  "title": "Stub connectors registered in production registry and exposed via API perform no real work",
  "category": "fake_integration",
  "severity": "high",
  "confidence": 0.92,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "registry\\.register\\(.*Connector\\)",
    "console\\.log.*not implemented",
    "BLOCKER.*infrastructure.*not yet",
    "return \\[\\];.*//.*stub|return \\{\\};.*//.*stub",
    "available: false, quantity: 0"
  ],
  "negative_patterns": [
    "*.test.ts", "*.spec.ts", "*.mock.ts", "__mocks__/",
    "// test-only|// development-only|@internal"
  ],
  "evidence_required": [
    "Connector class implements a real interface (SupplierConnector, etc.)",
    "Connector is registered in a production registry at module load time",
    "Registry or connectors are exported from a package index",
    "API route uses the registry to list connectors or invoke connector methods",
    "Every method on the connector returns hardcoded empty/failure data or logs 'not implemented'",
    "No environment guard prevents the stub from being used in production"
  ],
  "false_positive_controls": [
    "exclude connectors with at least one method that makes a real HTTP/network call",
    "exclude connectors with a 'status' or 'isImplemented' property that callers check",
    "exclude abstract base classes or interfaces that define the contract"
  ],
  "user_impact": "Users who configure a stub connector as a supplier and trigger a catalog sync will silently lose their existing vendor catalog data (deactivated by the sync service). Availability checks will report all items as out-of-stock, and pricing will return nothing. The connectors appear as available options in the API with no indication they don't work.",
  "repair_guidance": "Either (a) implement the actual connector logic (EDI for US Foods, REST API for Charlie's Produce), (b) remove the connectors from the registry and the export index until they're implemented, or (c) add an 'isImplemented' flag to the connector interface and have the registry/API filter out stubs. The sync service should also guard against deactivating all products when a connector returns zero results, as this could indicate a connectivity issue rather than an empty catalog.",
  "example_source": {
    "file": "packages/supplier-connectors/src/connectors/us-foods.ts",
    "line_or_snippet": "async fetchCatalog(config: SupplierConnectorConfig): Promise<SupplierProduct[]> {\n    // BLOCKER: EDI infrastructure not yet available.\n    console.log(\"[us-foods] Catalog fetch not implemented - EDI infrastructure required\");\n    return [];\n  }"
  }
}
```

### Implementation note
This rule should cross-reference connector registrations in a registry against the method bodies of the registered classes. It should look for classes that implement a real interface but whose every method body consists of console.log + hardcoded empty return values. A secondary check is whether the registry is exported from a package index and consumed by API routes — confirming the stubs reach production code paths. The most dangerous variant is where a sync/worker service will take destructive action (deactivating data) based on the stub's empty results.
---

---
## [2026-05-07 08:06] Rule Discovery — fake_integration.payment_gateway_always_succeeds

### Finding
The Capsule Pro payment gateway module (`gateway.ts`) exposes two critical functions — `processPaymentGateway` and `refundPaymentGateway` — that are called by the production `PUT /api/accounting/payments/[id]` route to charge and refund payments respectively. Both functions are documented as "deterministic always-success placeholders" with detailed swap-in checklists for real Stripe/Adyen integration. The code explicitly suppresses unused-input lints with `void input.paymentId` etc. and unconditionally returns `{ success: true }` with a fake `txn_<uuid>` or `re_<uuid>` transaction ID. There is no environment guard (`NODE_ENV`, feature flag, or config switch) preventing this placeholder from running in production. Meanwhile, `packages/payments/index.ts` already exports a fully-configured Stripe client (`new Stripe(keys().STRIPE_SECRET_KEY, ...)`) that the comments explicitly say "the real call" should use — but nobody wired it up. The production route handler trusts this module's return value exclusively: it marks invoices as PAID, cascades `amountPaid` updates, and sets `completedAt` timestamps based on the gateway's `success: true`. The net effect: every payment submitted through the system is auto-approved, every invoice is auto-paid, and every refund is auto-processed — with no money moving on any processor.

### Evidence
- File: `src/openclaw/projects/capsule-pro/apps/api/app/api/accounting/payments/[id]/gateway.ts`
- Lines 18-20: Comment — "The implementation here is a deterministic always-success placeholder"
- Lines 86-100: `processPaymentGateway()` — uses `void` to suppress unused-input warnings, returns `{ success: true, transactionId: 'txn_${randomUUID()}' }`
- Lines 115-129: `refundPaymentGateway()` — same pattern, returns `{ success: true, refundTransactionId: 're_${randomUUID()}' }`
- Lines 89-94: `void input.paymentId; void input.tenantId; void input.amount; void input.currency;` — all inputs explicitly discarded
- File: `src/openclaw/projects/capsule-pro/apps/api/app/api/accounting/payments/[id]/route.ts`
- Line 26: `import { processPaymentGateway, refundPaymentGateway } from "./gateway";` — production route imports the placeholder
- Lines 156-160: Route calls `processPaymentGateway({ paymentId, tenantId, amount, currency })` and uses the result to mutate payment and invoice rows
- File: `src/openclaw/projects/capsule-pro/packages/payments/index.ts`
- Lines 1-7: `export const stripe = new Stripe(keys().STRIPE_SECRET_KEY, { apiVersion: "2026-01-28.clover" });` — real Stripe client exists but is never imported by gateway.ts

### Why this matters
A catering company using Capsule Pro processes client payments through this system. Every charge is auto-approved regardless of card validity, balance, or processor response. Every invoice flips to PAID. If a client's card is declined, the system still records a successful payment and marks the invoice as paid. Refunds are equally imaginary — the system records a refund with a fake `re_<uuid>` ID but no money moves back to the client. The financial ledger is completely disconnected from reality. This is the most financially dangerous pattern in the codebase because it creates a false paper trail of completed transactions that never occurred on any payment processor.

### Proposed detector rule
```json
{
  "id": "fake_integration.payment_gateway_always_succeeds",
  "title": "Payment gateway function unconditionally returns success without contacting any processor",
  "category": "fake_integration",
  "severity": "critical",
  "confidence": 0.97,
  "detector_type": "hybrid",
  "language_targets": ["typescript", "javascript"],
  "patterns": [
    "return \\{\\s*success: true,\\s*transactionId",
    "void input\\.",
    "deterministic always-success",
    "placeholder.*swap.*point",
    "Real-processor swap-in checklist",
    "txn_\\$\\{randomUUID",
    "re_\\$\\{randomUUID"
  ],
  "negative_patterns": [
    "*.test.ts", "*.spec.ts", "*.mock.ts", "__mocks__/",
    "test double", "fixture"
  ],
  "evidence_required": [
    "Function named processPayment/processCharge/paymentGateway or similar",
    "Function body returns { success: true } unconditionally (no try/catch, no conditional, no network call)",
    "Function discards its inputs with void or similar pattern",
    "Comments explicitly state 'placeholder', 'swap point', or 'real call will'",
    "A real SDK/client (Stripe, Adyen, etc.) exists in the same project but is NOT imported by the gateway function",
    "The function is called by a production API route that mutates database state based on the return value",
    "No environment guard prevents the placeholder from running in production"
  ],
  "false_positive_controls": [
    "exclude files in test or mock directories",
    "exclude functions that contain at least one HTTP/network call (fetch, axios, SDK method)",
    "exclude functions with an environment guard (NODE_ENV check, feature flag, config toggle)",
    "require the 'placeholder' or 'swap' language in comments to reduce false positives on legit always-success paths"
  ],
  "user_impact": "Every payment processed through the system is auto-approved with a fake transaction ID. No money moves on any processor. Invoices are marked PAID for charges that never occurred. Refunds are recorded but never executed. The financial ledger is fiction. For a catering business, this means clients are told they've been charged (and may dispute real charges on their end) while no payment was actually collected, or clients who should be refunded never receive their money back.",
  "repair_guidance": "Wire the gateway functions to the existing Stripe client in packages/payments. Replace the placeholder body with stripe.paymentIntents.create/confirm for charges and stripe.refunds.create for refunds. Map processor errors to { success: false, failureReason }. Add an environment guard (NODE_ENV !== 'production' or a feature flag) that prevents the placeholder from running in production until the real integration is tested. Consider adding an integration test that verifies a real Stripe test-mode charge.",
  "example_source": {
    "file": "src/openclaw/projects/capsule-pro/apps/api/app/api/accounting/payments/[id]/gateway.ts",
    "line_or_snippet": "export async function processPaymentGateway(\n  input: ProcessPaymentInput\n): Promise<ProcessPaymentResult> {\n  void input.paymentId;\n  void input.tenantId;\n  void input.amount;\n  void input.currency;\n\n  return {\n    success: true,\n    transactionId: `txn_${randomUUID()}`,\n  };\n}"
  }
}
```

### Implementation note
This rule should look for functions with "payment", "charge", "gateway", or "refund" in their name that unconditionally return `{ success: true }` without making any network call or SDK invocation. The `void input.` pattern is a strong signal that the author knows the inputs are unused but chose to suppress the lint warning rather than implement the logic. A cross-file check should verify that a real payment SDK (Stripe, Adyen, etc.) exists somewhere in the monorepo but is not imported by the gateway function — proving the infrastructure is available but just not wired up. The most dangerous variant is when the gateway's return value drives database mutations (invoice status changes, payment completions) in a production API route.
---
## [2026-05-07 08:21] Rule Discovery — dashboard_illusion.sku_agnostic_event_usage_formula

### Finding
The inventory forecasting service (`inventory-forecasting.ts`) claims to "analyze upcoming events to predict inventory usage and calculate depletion dates" and produces depletion forecasts, confidence levels, and reorder suggestions served via production API routes. A core part of the projection combines historical transaction data with upcoming event-based usage spikes. However, the event-usage calculation in `getUpcomingEventsUsingInventory()` is a hardcoded magic formula — `Math.ceil((event.guestCount || 0) * 0.1)` — that assigns the same estimated usage to **every SKU** regardless of what inventory item is being forecasted. The `_sku` parameter is literally prefixed with an underscore (unused) and the function never queries any event-to-SKU relationship. The code's own comments admit this: "This is a simplified calculation — in production, you'd use actual event menus" and "In production, this would be based on actual menu items and recipes." Meanwhile, the database already has a `recipe_ingredients` table in the `tenant_kitchen` schema that links recipes to inventory items, and the `Event` model has `menuSections` containing menu items — all the data needed for real SKU-specific event usage exists but is never queried. The result: a 200-person wedding predicts 20 units of usage for filet mignon, paper napkins, champagne, and trash bags equally. The test suite verifies this fake formula works correctly (test comment: "0.1 units/guest = 20 units expected usage") rather than catching the problem.

### Evidence
- File: `src/openclaw/projects/capsule-pro/apps/api/app/lib/inventory-forecasting.ts`
- Lines 318-369: `getUpcomingEventsUsingInventory()` — `_sku` parameter is unused, usage is `Math.ceil((event.guestCount || 0) * 0.1)` for every event regardless of SKU
- Lines 353-354: Comment — "This is a simplified calculation — in production, you'd use actual event menus"
- Lines 363-365: Comment — "Simplified usage calculation: 0.1 units per guest per event / In production, this would be based on actual menu items and recipes"
- Lines 392-395: `getProjectedUsage()` passes empty string `""` as the SKU to `getUpcomingEventsUsingInventory`, confirming the parameter is ignored
- File: `src/openclaw/projects/capsule-pro/apps/api/__tests__/inventory/forecasting.test.ts`
- Line 240: Test comment — "Upcoming event with 200 guests (0.1 units/guest = 20 units expected usage)" — test validates the fake formula rather than asserting SKU-specific behavior
- File: `src/openclaw/projects/capsule-pro/apps/app/prisma/seed-recipe-ingredients.ts`
- Lines 185-196: `recipe_ingredients` table exists in `tenant_kitchen` schema, linking `recipe_version_id` to `ingredient_id` with `quantity` and `unit_id`
- File: `src/openclaw/projects/capsule-pro/apps/api/app/api/inventory/forecasts/route.ts`
- Lines 46-62: Production API route calls `calculateDepletionForecast()` and optionally saves results — the fake event usage flows directly to users
- File: `src/openclaw/projects/capsule-pro/apps/api/app/api/inventory/reorder-suggestions/route.ts`
- Lines 48-54: Production API route calls `generateReorderSuggestions()` — reorder quantities are derived from the fake projections

### Why this matters
A catering operation relies on depletion forecasts and reorder suggestions to decide when and how much to order. If every SKU gets the same event-usage estimate (guestCount * 0.1), then high-volume items like proteins and alcohol are dramatically under-forecasted (a 200-guest wedding needs far more than 20 units of chicken) while low-volume items like garnishes and linens are dramatically over-forecasted. This produces wrong depletion dates, wrong confidence levels, and wrong reorder quantities for every item. The forecasts are saved to the database and cached for 24 hours, compounding the error. The "in production you should" comment is a red flag that this was knowingly shipped as a placeholder, but there's no environment guard, no feature flag, and no UI indicator telling users the event-based projections are not real.

### Proposed detector rule
```json
{
  "id": "dashboard_illusion.sku_agnostic_event_usage_formula",
  "title": "Event-based inventory usage projection ignores SKU and applies uniform per-guest formula to all items",
  "category": "dashboard_illusion",
  "severity": "high",
  "confidence": 0.94,
  "detector_type": "cross_file",
  "language_targets": ["typescript", "javascript", "python", "any"],
  "patterns": [
    "guestCount.*\\*.*0\\.\\d+|guest_count.*\\*.*0\\.\\d+",
    "_sku.*unused|_sku\\b.*//.*ignore|_sku\\b.*//.*simplif",
    "in production.*actual.*menu|in production.*recipe",
    "simplified.*calculation.*per.*guest",
    "0\\.1 units per guest|per guest per event"
  ],
  "negative_patterns": [
    "*.test.ts", "*.spec.ts",
    "recipe_ingredient|RecipeIngredient|eventMenuItem",
    "JOIN.*recipe_ingredient|JOIN.*menu_item"
  ],
  "evidence_required": [
    "Function that accepts an SKU/item identifier but prefixes it with _ (unused) or ignores it",
    "Usage calculation uses only event guest count with a hardcoded multiplier, not SKU-specific data",
    "Comments admit the calculation is simplified or placeholder ('in production, you would...')",
    "Database schema contains event-to-menu or recipe-to-ingredient relationships that could provide real SKU-specific usage",
    "The function's output feeds into depletion forecasts, confidence levels, or reorder suggestions",
    "No environment guard or feature flag separates the placeholder from production"
  ],
  "false_positive_controls": [
    "exclude functions that actually join recipe_ingredients or menu_items to compute SKU-specific usage",
    "exclude functions where the SKU parameter IS used (not prefixed with _)",
    "exclude demo/prototype directories explicitly marked as non-production",
    "require at least two of: unused SKU param, hardcoded per-guest multiplier, 'in production' comment"
  ],
  "user_impact": "Inventory depletion forecasts and reorder suggestions are fundamentally wrong for every SKU when events are in the forecast horizon. High-volume items (proteins, alcohol) are under-forecasted leading to stockouts during events. Low-volume items (garnishes, linens) are over-forecasted leading to over-ordering and waste. Catering operations make purchasing decisions based on these numbers, directly impacting event execution quality and food cost margins.",
  "repair_guidance": "Replace the uniform per-guest formula with SKU-specific event usage by joining events to their menus/recipes to recipe_ingredients, then summing ingredient quantities scaled by guest count and recipe yield. The _sku parameter should be used to filter ingredient_id against the inventory item. Remove the 'in production' disclaimer comments. Update the test to assert that different SKUs get different event-usage projections based on their recipe inclusion. Consider adding a confidence penalty when no recipe-to-SKU mapping exists for a given event rather than falling back to the uniform formula.",
  "example_source": {
    "file": "src/openclaw/projects/capsule-pro/apps/api/app/lib/inventory-forecasting.ts",
    "line_or_snippet": "async function getUpcomingEventsUsingInventory(\n  tenantId: string,\n  _sku: string,\n  horizonDays: number\n): Promise<Array<{ eventId: string; eventName: string; startDate: Date; usage: number }>> {\n    // ...\n    // Simplified usage calculation: 0.1 units per guest per event\n    // In production, this would be based on actual menu items and recipes\n    usage: Math.ceil((event.guestCount || 0) * 0.1),"
  }
}
```

### Implementation note
This rule should detect forecasting/analytics functions that claim to project SKU-specific usage from events but apply a uniform per-guest multiplier. The strongest signals are: (1) an SKU parameter prefixed with `_` (unused), (2) a hardcoded multiplier like `guestCount * 0.1`, and (3) "in production" disclaimer comments. A cross-file check should verify that a recipe-to-ingredient or event-menu-to-inventory relationship exists in the schema, proving the data for real SKU-specific projections is available but not used. The test theater aspect (tests validating the fake formula) is a secondary signal that can be checked separately.
---
