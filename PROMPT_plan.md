# Ralph Wiggum Diagnosis Prompt — Capsule Pro

## What's Already Done

0a. Study @IMPLEMENTATION_PLAN.md — it already has FOURTEEN verification passes (plus multiple addenda/sub-passes). DO NOT repeat any of that work. The prior passes covered: (1) route-level claims & blockers, (2-3) blocker re-verification, (4) full package health audit of all 34 shared packages, (5) E2E test suite audit, (6-9) raw-SQL correctness audit (4 passes — parameterization, injection, schema drift, tenant isolation), (9) frontend health audit (imports, API contracts, error handling, accessibility), (10) mobile app + public website audit (3 sub-passes), (11) auth, middleware & integration services audit (3 sub-passes), (12) test quality & coverage gap audit, (13) database query performance & N+1 pattern audit, (14) error handling & API resilience audit. Your focus is entirely new.
0b. The error handling audit (pass 14) identified that 95 files leak `error.message` to clients and there's zero Prisma error code translation — but it did NOT audit what INPUT data enters the system unsanitized.
0c. The raw-SQL audits (passes 6-9) focused on injection risk from `$queryRawUnsafe` usage — but did NOT audit whether the DATA being passed to safe `$queryRaw` (tagged template) or Prisma ORM calls is properly validated/typed before reaching the query layer.
0d. Study `apps/api/app/api/` — the main API routes directory. Only ~28 of ~1,347 route files use Zod for input validation. The rest accept raw `Request` bodies, URL params, and query strings without schema validation.
0e. Study `apps/api/app/lib/` — shared libraries, middleware, utilities.
0f. Study `packages/` — shared packages including database, manifest-adapters, notifications, etc.
0g. For reference, the main app routes are in `apps/api/app/api/`, shared packages are in `packages/`, the web app is in `apps/app/`, and E2E tests are in `e2e/`.

## FOCUS: Input Validation & Data Sanitization Audit (15th pass — NEW focus)

All prior audits focused on correctness, security (injection), performance, test quality, and error handling. This pass asks: **what data enters the system, and is it validated before it's used?** The codebase has ~2% Zod coverage on API routes. What about the other 98%? What about URL parameters, query strings, and data flowing between internal services?

### Part A: Route Input Validation Coverage

#### 1. POST/PUT/PATCH Body Validation
- Scan ALL route handlers that accept request bodies (POST, PUT, PATCH) in `apps/api/app/api/`
- Classify each: (a) validated with Zod schema before use, (b) validated with inline type checks (`typeof`, `instanceof`), (c) used directly without validation, (d) delegated to `executeManifestCommand` (which may validate internally)
- For manifest-delegated routes: does `executeManifestCommand` validate input before passing to manifest actions? Or does it pass raw `req.json()` straight through?
- Find routes where `await req.json()` is used without any validation — these accept arbitrary JSON and pass it to database queries

#### 2. URL Parameter Validation
- Scan ALL `[id]`, `[eventId]`, `[recipeId]` etc. dynamic route segments
- Are params validated before use? (e.g., checking they're valid UUIDs, not SQL injection strings, not path traversal)
- Find routes that use `params.id` directly in database queries without validation
- Check if Next.js route params are properly awaited (Next.js 15 requires `await params`)
- Find routes where params could be non-string types that cause unexpected behavior

#### 3. Query String Validation
- Scan for `searchParams`, `new URL(request.url).searchParams`, `request.nextUrl.searchParams`
- Are query parameters validated? Typed? Sanitized?
- Find routes that pass raw query params to database queries (especially `$queryRaw` where search terms become `LIKE` patterns)
- Find routes where `page`, `limit`, `offset` query params are not parsed to integers — `SELECT ... LIMIT 'abc'` behavior
- Find routes where sort direction (`asc`/`desc`) is accepted without validation — could it be used for injection in raw SQL ORDER BY?

#### 4. File Upload Validation
- Find all file upload endpoints
- What validation exists on: file type (MIME), file size, file name (path traversal), file content (magic bytes)?
- Are uploaded files stored with original names or sanitized names?
- Is there a global upload size limit?

### Part B: Data Type Coercion & Boundary Issues

#### 1. Numeric Input Handling
- Find all routes that accept numeric input (prices, quantities, percentages, IDs)
- Are they parsed with `Number()`, `parseInt()`, `parseFloat()`? What happens with `NaN`, `Infinity`, negative numbers, floating point precision issues?
- Find routes where `Number("abc")` produces `NaN` which is then used in database queries — PostgreSQL may reject it or behave unexpectedly
- Find currency/price fields: are they validated as non-negative? Is there a maximum value? What about `0.1 + 0.2 !== 0.3` floating point issues?
- Find quantity fields: are they validated as positive integers? Can a user order -5 items or 3.7 items?

#### 2. Date/Time Input Handling
- Find all routes that accept date/time inputs
- Are dates parsed and validated? What happens with invalid dates like "2026-02-30" or "not-a-date"?
- Are timezone-naive dates handled consistently? (Server is likely UTC, clients may send local time)
- Find date range queries: is start ≤ end enforced? What about ranges spanning years?
- Find routes where date strings are interpolated into raw SQL — is the format guaranteed safe?

#### 3. String Input Handling
- Find routes that accept string inputs used in database queries
- Are strings truncated to column length before INSERT? (PostgreSQL will error on over-length strings)
- Are strings sanitized for special characters? (Newlines in CSV exports, HTML in user-generated content, null bytes)
- Find routes that accept email addresses — are they format-validated before database lookup?
- Find routes that accept phone numbers — are they normalized before storage?

#### 4. Array/Bulk Input Handling
- Find routes that accept arrays of items (bulk create, bulk update, bulk delete)
- Is there a maximum array length? Could a client send 100,000 items in one request?
- For bulk operations: is each item validated individually?
- Find `Promise.all()` on array items — does one invalid item fail the entire batch?

### Part C: Manifest System Input Validation

#### 1. Manifest Command Input Validation
- How does `executeManifestCommand` validate the `input` field before passing it to manifest actions?
- Read `packages/manifest-runtime/src/` and `packages/manifest-adapters/src/` to understand the validation pipeline
- Do manifest schemas define input types? Are they enforced at runtime?
- What happens when manifest input doesn't match the expected shape?

#### 2. Manifest Action Guard Validation
- How are guard conditions validated? Can a user craft input that bypasses guards?
- Are guard conditions evaluated with proper type checking?

#### 3. Event Payload Validation
- When events are emitted (outbox), are payloads validated before storage?
- When events are consumed (inbox/subscribers), are payloads validated before processing?

### Part D: Cross-Site & Injection Vectors Beyond SQL

#### 1. Stored XSS via User Input
- Find routes that store user-provided text (names, descriptions, notes, comments)
- Is the text sanitized for HTML/JavaScript before storage? Or is sanitization applied only at render time?
- Find rich text / markdown fields — are they properly sanitized server-side?
- Check if any routes store HTML directly from user input

#### 2. CSV/Export Injection
- Find all export endpoints (CSV, PDF, Excel)
- Are exported values sanitized for CSV injection (formulas starting with `=`, `+`, `-`, `@`)?
- Find endpoints where user-controlled data appears in filenames or headers

#### 3. Email Header Injection
- Find routes that send emails with user-controlled content (to, from, subject, body)
- Is user input placed in email headers? (Subject line injection)
- Are email addresses validated before use in `To:` headers?

#### 4. Redirect/Open Redirect
- Find all routes that perform redirects (302/303/307)
- Is the redirect target validated? Can an attacker craft a URL that redirects to an external site?
- Find routes that accept `returnUrl`, `redirect`, `next`, `callback` query params

### Part E: Internal Service Boundary Validation

#### 1. Package API Input Contracts
- For each shared package in `packages/`, check if exported functions validate their inputs
- Do packages trust their callers? Or do they have defensive validation?
- Find package functions that would crash or produce wrong results with `null`, `undefined`, or wrong-type inputs

#### 2. Cron Job / Background Task Input
- Find all cron endpoints in `apps/api/app/cron/`
- Do cron tasks validate their own state before processing? Or do they assume the database is always in a valid state?
- What happens if a cron task reads partially-written data from a concurrent request?

#### 3. Webhook Incoming Payload Validation
- Find all webhook receiver endpoints
- Do they validate webhook payloads against expected schemas?
- Is signature verification applied BEFORE payload parsing? (prevent parsing attacks)

### Guardrails

- This is PLAN MODE ONLY. Do NOT modify source code. Do NOT commit. Do NOT run build commands.
- Write all findings to @IMPLEMENTATION_PLAN.md as a new section "## Input Validation & Data Sanitization Audit (15th Pass)".
- For each finding, include the EXACT file path and line numbers. Do not guess — read the actual code.
- Classify severity as: CRITICAL (allows data corruption, injection, or security bypass), HIGH (accepts invalid data that causes crashes or wrong results), MEDIUM (missing validation that could cause issues), LOW (style/cosmetic or defensive-only improvement).
- Distinguish between "no validation at all" (raw input hits DB) and "partial validation" (some fields checked, others not).
- Do NOT re-audit anything from passes 1-14. Focus exclusively on input validation and data sanitization.
- If you find a validation pattern that's actually GOOD, note it as a positive example.
- Pay special attention to PUBLIC endpoints (no auth required) — these are the highest-risk targets.
- Count things. How many routes lack body validation? How many use raw params in queries? Hard numbers, not vague "many routes".
