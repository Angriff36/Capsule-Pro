# Ralph Wiggum Diagnosis Prompt — Capsule Pro

## What's Already Done

0a. Study @IMPLEMENTATION_PLAN.md — it already has THIRTEEN verification passes (plus 6 addenda/sub-passes). DO NOT repeat any of that work. The prior passes covered: (1) route-level claims & blockers, (2-3) blocker re-verification, (4) full package health audit of all 34 shared packages, (5) E2E test suite audit, (6-9) raw-SQL correctness audit (4 passes — parameterization, injection, schema drift, tenant isolation), (9) frontend health audit (imports, API contracts, error handling, accessibility), (10) mobile app + public website audit (3 sub-passes), (11) auth, middleware & integration services audit (3 sub-passes), (12) test quality & coverage gap audit, (13) database query performance & N+1 pattern audit (with supplementary deep-verification). Your focus is entirely new.
0b. The frontend health audit (pass 9) did flag some missing error handling on the frontend side — but this pass focuses on the API/backend layer's error handling patterns, not the frontend.
0c. The test quality audit (pass 12) identified missing error-path test coverage but did NOT audit the actual error handling code paths in production route handlers.
0d. Study `apps/api/app/api/` — the main API routes directory. Routes use a mix of Prisma ORM calls and raw SQL (`$queryRaw`, `$queryRawUnsafe`, `Prisma.sql`).
0e. Study `apps/api/app/lib/` — shared libraries, middleware, utilities.
0f. Study `packages/` — shared packages including database, manifest-adapters, notifications, etc.
0g. For reference, the main app routes are in `apps/api/app/api/`, shared packages are in `packages/`, the web app is in `apps/app/`, and E2E tests are in `e2e/`.

## FOCUS: Error Handling & API Resilience Audit (14th pass — NEW focus)

All prior audits focused on correctness, security, performance, and test quality. The **error handling patterns** of the application have never been systematically audited. This pass asks: when things go wrong, what happens? Are errors caught, classified, and returned properly? Do partial failures leave inconsistent state? Are there silent failures?

### Part A: Route-Level Error Handling Patterns

#### 1. Try/Catch Coverage
- Scan ALL route handlers in `apps/api/app/api/` for try/catch blocks
- Classify each handler: (a) has try/catch, (b) has no try/catch (relies on framework), (c) has partial try/catch (catches some but not all async operations)
- For handlers WITHOUT try/catch: will Next.js catch the error? Or will it result in an unhandled promise rejection that crashes the process?
- Find handlers where the try/catch is present but only wraps PART of the handler (e.g., catches the Prisma call but not the subsequent response construction)

#### 2. Error Response Consistency
- Sample 50+ route handlers across different domains and check their error response format
- Are all errors returned with consistent structure? (e.g., `{ error: string, code: string, statusCode: number }`)
- Do 4xx errors include helpful messages? Do 5xx errors leak internal details (stack traces, SQL errors, file paths)?
- Check if there's a shared error handler/middleware in `apps/api/app/lib/` or `apps/api/middleware.ts`
- Find routes that throw generic `Error()` vs. custom error classes vs. HTTP-specific errors

#### 3. Prisma Error Handling
- Find all `catch` blocks that catch Prisma errors
- Are Prisma-specific errors (P2002 unique constraint, P2025 record not found, P2003 foreign key) properly translated to HTTP status codes?
- Find routes where Prisma errors are caught generically (catching all errors) vs. specifically (checking error.code)
- Find routes where Prisma errors would leak database schema details to the client

#### 4. Raw SQL Error Handling
- For the ~250 files using `$queryRaw` / `$executeRaw` / `$queryRawUnsafe`: do they handle SQL errors?
- Find raw SQL queries inside try/catch vs. bare (no error handling)
- For `$queryRawUnsafe` calls (42 files): if the query fails, what happens? Is the error propagated, swallowed, or transformed?

### Part B: Partial Failure & State Consistency

#### 1. Transaction Rollback Analysis
- Find all `$transaction()` calls and check: if the transaction fails partway through, does error handling properly propagate? Or are there cases where partial state is committed?
- Find transactions with side effects OUTSIDE the transaction (e.g., sending an email, calling a webhook, updating a cache AFTER the transaction commits but without retry logic)
- Find patterns where `$transaction` is used but the error from a failed transaction is caught and swallowed (the caller never knows it failed)

#### 2. Multi-Step Operation Resilience
- Find handlers that perform multiple sequential operations (create A, then create B, then send notification) where failure at step 2 or 3 leaves orphaned state
- Check if the outbox pattern is used consistently for side effects (events that trigger notifications, webhooks, etc.)
- Find operations that should be atomic but aren't wrapped in transactions

#### 3. Webhook & Integration Failure Handling
- Audit webhook delivery: what happens when a webhook target is unreachable? Is there retry logic? Exponential backoff?
- Check the DLQ (dead letter queue) implementation — does it actually work?
- For Goodshuffle and Nowsta syncs: what happens when a sync partially fails? Is there a resume mechanism or does it restart from scratch?
- Find any fire-and-forget patterns (async operations launched without awaiting, with no error handling on the promise)

### Part C: Unhandled Promise Rejections & Silent Failures

#### 1. Unhandled Async Errors
- Find `.then()` chains without `.catch()` 
- Find `Promise.all()` / `Promise.allSettled()` usage — is `Promise.allSettled` used where partial failure is expected? Or does `Promise.all` cause one failure to reject everything?
- Find `async` functions called without `await` (fire-and-forget) — are these intentional background tasks or bugs?
- Check `process.on('unhandledRejection')` — is there a global handler?

#### 2. Silent Error Swallowing
- Find empty `catch {}` or `catch (e) { console.error(e) }` patterns that log but don't propagate
- Find `try { ... } catch { return { success: true } }` patterns — claiming success when the operation failed
- Find routes that return 200 even when the underlying operation failed (common in update/delete endpoints)

#### 3. Error Logging Quality
- How are errors logged? Is there structured logging (JSON with context) or just `console.error(e)`?
- Are errors correlated with request IDs for debugging?
- Are Prisma errors logged with full context (query, params, model) or just the message?
- Check if there's a logging library or if it's all raw console calls

### Part D: Rate Limiting & Circuit Breaking

#### 1. External API Call Resilience
- Find all outbound HTTP calls (fetch, axios, etc.) — to Goodshuffle, Nowsta, Clerk, email providers, etc.
- Do these calls have timeouts? What's the default timeout if none is set?
- Is there retry logic with exponential backoff?
- Is there circuit breaking (stop calling a failing service)?
- What happens when an external API is slow — does it block the request thread?

#### 2. Rate Limiting Coverage
- Which endpoints have rate limiting? Is it consistent across all public-facing endpoints?
- Are rate limits applied at the middleware level or per-route?
- What happens when a rate limit is hit — is the response informative?
- Are internal/admin endpoints accidentally rate-limited (or not rate-limited when they should be)?

#### 3. Timeout Configuration
- Find all `setTimeout`, `AbortController`, or timeout configurations
- Are database queries subject to a timeout? What's the default Prisma query timeout?
- Are webhook deliveries subject to a timeout?
- Are sync operations (Goodshuffle, Nowsta) subject to overall timeouts?

### Part E: Domain-Specific Error Handling Deep Dives

For each of these critical flows, trace the FULL error path end-to-end:

1. **Event Import (server-to-server)** — what happens if dish creation fails mid-import? Is the entire event rolled back?
2. **Procurement PO Creation** — what happens if creating line items fails after the PO header is created?
3. **Inventory Cycle Count Finalization** — what happens if the finalize transaction fails on the 50th variance record?
4. **Payroll Run Generation** — what happens if a timecard INSERT fails partway through the payroll run?
5. **Webhook Delivery Pipeline** — trace the full path: event → outbox → publisher → HTTP delivery → retry → DLQ. Where are the failure points?
6. **Goodshuffle Full Sync** — what happens if the sync is interrupted? Can it resume?

### Guardrails

- This is PLAN MODE ONLY. Do NOT modify source code. Do NOT commit. Do NOT run build commands.
- Write all findings to @IMPLEMENTATION_PLAN.md as a new section "## Error Handling & API Resilience Audit (14th Pass)".
- For each finding, include the EXACT file path and line numbers. Do not guess — read the actual code.
- Classify severity as: CRITICAL (will cause data corruption or silent failure), HIGH (poor error handling that could cause issues under load), MEDIUM (inconsistent but not dangerous), LOW (style/cosmetic).
- Distinguish between "missing error handling" (no try/catch at all) and "bad error handling" (try/catch that swallows or misclassifies errors).
- Do NOT re-audit anything from passes 1-13. Focus exclusively on error handling patterns.
- If you find an error handling pattern that's actually GOOD, note it as a positive example.
