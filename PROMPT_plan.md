0a. Study @IMPLEMENTATION_PLAN.md — it already has TEN verification passes. DO NOT repeat any of that work. The prior passes covered: (1) route-level claims & blockers, (2-3) blocker re-verification, (4) full package health audit of all 34 shared packages, (5) E2E test suite audit, (6-8) raw-SQL correctness audit (3 passes), (9) frontend health audit, (10) mobile app + public website audit. Your focus is entirely new.
0b. Study `apps/api/proxy.ts` — the main Next.js middleware entry point (Clerk auth + global rate limiting). This is the security perimeter.
0c. Study `apps/api/middleware/` — all middleware modules (api-key-auth, rate-limiter, global-rate-limit).
0d. Study `apps/api/app/lib/` — all 16+ shared library files including Goodshuffle integrations, QuickBooks export, Nowsta sync, recipe costing, activity feed, tenant resolver, invariant utilities.
0e. Study `packages/auth/`, `packages/security/`, `packages/rate-limit/` — auth/security shared packages.
0f. Study `packages/supplier-connectors/`, `packages/payments/` — external integration packages.
0g. For reference, the main API routes are in `apps/api/app/api/`, shared packages are in `packages/`, and the web app is in `apps/app/`.

## FOCUS: Auth, Middleware & Integration Services Audit (11th pass — NEW focus)

All prior audits focused on route correctness, raw SQL, frontend, mobile, and packages. The **authentication chain, authorization enforcement, and external integration services** have never been systematically audited. This is the security and reliability perimeter.

### Part A: Authentication & Authorization Chain

#### 1. Middleware Chain Analysis
- Read `apps/api/proxy.ts` fully — trace the auth flow: Clerk → userId extraction → global rate limit → route handler
- What routes are marked public? Is the public route list correct and complete?
- Does the middleware correctly handle all edge cases: missing auth tokens, expired sessions, malformed Clerk tokens?
- Is the Clerk middleware configured for multi-tenancy? How are org/tenant IDs extracted?
- Read `apps/api/middleware/global-rate-limit.ts` — is the rate limiting actually effective? What are the limits? Can they be bypassed?

#### 2. Route-Level Auth Enforcement
- The IMPLEMENTATION_PLAN mentions **115 routes lack authentication** — verify this claim by scanning `apps/api/app/api/` for routes that don't check `auth()` or `userId`
- Check whether the Clerk middleware matcher (`/api(.*)`) covers ALL API routes or if some are missed
- Are there routes that implement their own auth checks (duplicating middleware logic) or bypassing it entirely?
- Check `apps/api/app/api/health/`, `apps/api/app/api/webhooks/`, `apps/api/app/api/cron/` — are these correctly excluded from auth?

#### 3. RBAC Enforcement
- How is role-based access control enforced? Is it in middleware, route handlers, or manifest rules?
- Are there routes that should be admin-only but are accessible to any authenticated user?
- Check the manifest system — do manifests enforce role checks? Are manifests consistently applied?
- Read `packages/auth/` — what auth utilities exist? Are they used consistently?

#### 4. API Key Authentication
- Read `apps/api/middleware/api-key-auth.ts` and `apps/api/app/lib/api-key-service.ts` fully
- How are API keys generated, stored, and validated?
- Is the timing-safe hash comparison correctly implemented?
- Are API keys scoped to tenants/orgs? Can one key access another tenant's data?
- Where is `authenticateApiKey` / `withApiKeyAuth` actually used? Which routes use it?
- Can API keys be used to bypass Clerk auth? Is that intentional?

#### 5. Session & Token Handling
- How are Clerk JWTs passed to downstream services?
- Is there token refresh handling? What happens when a token expires mid-request?
- Are there any hardcoded tokens, secrets, or credentials in the codebase?

### Part B: Integration Services (`apps/api/app/lib/`)

#### 1. Goodshuffle Integration (4 files)
- `goodshuffle-client.ts` — API client implementation
- `goodshuffle-event-sync-service.ts` — event synchronization
- `goodshuffle-inventory-sync-service.ts` — inventory synchronization
- `goodshuffle-invoice-sync-service.ts` — invoice synchronization
- Are API keys/credentials stored securely? Environment variables? Secrets manager?
- Error handling — what happens when Goodshuffle is unreachable? Are there retries? Timeouts?
- Data mapping — is the Goodshuffle → Capsule Pro mapping correct and complete?
- Are there any data loss scenarios in sync operations?

#### 2. QuickBooks Export (2 files)
- `quickbooks-bill-export.ts` — bill export to QuickBooks
- `quickbooks-invoice-export.ts` — invoice export to QuickBooks
- Is OAuth configured correctly? Token refresh?
- Error handling for QuickBooks API failures
- Data consistency — what if export partially succeeds?

#### 3. Nowsta Integration
- `nowsta-client.ts` — Nowsta API client
- `nowsta-sync-service.ts` — employee sync service
- Authentication method, error handling, data mapping
- Is the sync bi-directional or one-way?

#### 4. Shared Libraries
- `activity-feed-service.ts` — how is the activity feed populated? Performance concerns?
- `tenant.ts` — tenant resolution logic — is it secure? Can tenants be spoofed?
- `recipe-costing.ts` — business logic correctness
- `inventory-forecasting.ts` — algorithm review
- `cors.ts` — CORS configuration — is it overly permissive?
- `invariant.ts` — utility quality

### Part C: External Integration Packages

#### 1. `packages/supplier-connectors/`
- What suppliers are supported?
- API client patterns, error handling, authentication
- Are there any exposed credentials or API keys?

#### 2. `packages/payments/`
- Payment processing logic
- Which payment providers are integrated?
- PCI compliance considerations
- Error handling for payment failures

#### 3. `packages/webhooks/`
- Webhook sending/receiving infrastructure
- Signature verification
- Retry logic and idempotency

### Investigation approach:

- Start with `cat apps/api/proxy.ts` and trace the full auth chain
- Map ALL public routes: grep for `isPublicRoute` patterns and cross-reference with actual route files
- Scan for auth bypasses: find routes that don't call `auth()` or import auth utilities
- Read every file in `apps/api/app/lib/` (16 files) and categorize findings
- Read every file in `packages/auth/`, `packages/security/`, `packages/rate-limit/`
- Check `packages/supplier-connectors/` and `packages/payments/` for credential exposure
- Grep for hardcoded secrets: `grep -rn 'sk_live\|sk_test\|api_key.*=\|password.*=\|secret.*=' apps/ packages/ --include='*.ts'`
- Check `.env.example` or similar for expected env vars vs what's actually used
- Verify rate limiter effectiveness: read the full implementation, check Redis dependency

### Output format:

Append findings to IMPLEMENTATION_PLAN.md under a new section:

```markdown
## Auth, Middleware & Integration Services Audit (11th Pass)

> **Audited:** 2026-04-25
> **Scope:** Auth chain (proxy.ts, middleware/, packages/auth, packages/security), Integration services (apps/api/app/lib/), External integrations (packages/supplier-connectors, packages/payments, packages/webhooks)
> **Method:** Full auth chain trace + lib file audit + credential exposure scan + integration correctness review

### Part A: Authentication & Authorization

#### Executive Summary
[Auth architecture overview, top risks]

#### 1. Middleware Chain
[Findings from proxy.ts + middleware/]

#### 2. Route-Level Auth Enforcement
[Missing auth, bypass risks]

#### 3. RBAC Enforcement
[Role check gaps]

#### 4. API Key Authentication
[Security assessment]

#### 5. Session & Token Handling
[Token management findings]

### Part B: Integration Services

#### 1. Goodshuffle Integration
[Findings]

#### 2. QuickBooks Export
[Findings]

#### 3. Nowsta Integration
[Findings]

#### 4. Shared Libraries
[Findings by file]

### Part C: External Integration Packages

#### 1. Supplier Connectors
[Findings]

#### 2. Payments
[Findings]

#### 3. Webhooks
[Findings]

### Recommended Actions
[Priority-ordered action items]
```

### Guardrails

- Do NOT modify any source code. This is diagnosis only.
- Do NOT report issues already documented in IMPLEMENTATION_PLAN.md (check all prior sections first).
- Cite exact file:line for every finding.
- For auth issues, distinguish between "theoretical concern" and "exploitable vulnerability."
- For integration services, distinguish between "missing error handling" and "data loss risk."
- The Goodshuffle/QuickBooks/Nowsta integrations may use environment variables for credentials — report the PATTERN (how credentials are loaded), never the actual values.
- Do NOT grep for or report actual secret values. Only report whether secrets management is done correctly.
- Check if `packages/security/` has any CSP headers, CORS policies, or other security utilities that should be enforced but aren't.
