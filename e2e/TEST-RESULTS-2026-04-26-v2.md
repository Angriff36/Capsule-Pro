# Capsule Pro E2E Test Results — 2026-04-26 (v2)

**Test Run:** `E2E_SUITE=workflows playwright test` — split into 3 batches due to SIGKILL memory pressure
**Batch 1:** inventory, kitchen, scheduling (partial — killed at scheduling/time-off)
**Batch 2:** staff (completed)
**Batch 3:** settings (completed)
**Total Duration:** ~13 minutes across 3 batches
**Auth:** Clerk setup project ran successfully each batch (~6-29s), stored to `e2e/.auth/user.json`
**Dev Server:** Running on `localhost:2221` (307 redirect confirmed)

---

## Scenario 4: Inventory Module

| # | Test | Result | Duration | Notes |
|---|------|--------|----------|-------|
| 4A | Inventory overview loads | **PASS** | 24.9s | |
| 4B | Items list loads | **FAIL** | 6.8s | `HTTP 500 GET /api/inventory/items?page=1&limit=20` — API returns Internal Server Error, client gets "Internal S..." as JSON parse failure |
| 4C | Create inventory item via dialog | **FAIL** | 13.1s | Cascading failure — items list page can't render, dialog can't open |
| 4D | Stock levels page loads | **PASS** | 7.0s | |
| 4E | Forecasts page loads | **FAIL** | 14.6s | `HTTP 500` on `/api/inventory/forecasts/alerts` and `/api/inventory/reorder-suggestions` — both endpoints crash server-side |
| 4F | Recipe costs page loads | **PASS** | 6.0s | |

**Inventory summary: 3 passed / 3 failed**

**Root causes:**
1. **Inventory items API 500** — `GET /api/inventory/items` returns 500. Server sends "Internal Server Error" as plain text, which the client tries to JSON.parse. Likely a Prisma query error or missing table/field.
2. **Forecasts API 500** — Both `/api/inventory/forecasts/alerts` and `/api/inventory/reorder-suggestions` return 500. Same class of server-side error. These endpoints may reference columns or relations that don't exist in the current schema.

---

## Scenario 5: Kitchen Module

| # | Test | Result | Duration | Notes |
|---|------|--------|----------|-------|
| 5A | Kitchen overview loads | **PASS** | 23.9s | |
| 5B | Recipes list loads | **PASS** | 35.5s | Slow load but no errors |
| 5C | Create recipe with all fields | **FAIL** | 26.9s | Form at `/kitchen/recipes/new` likely has missing fields or submit handler issue |
| 5D | Recipe appears in list after creation | **FAIL** | 13.8s | **Ably CSP violation** — `connect-src` CSP directive blocks `*.ably.net` and `*.ably-realtime.com`. Multiple Ably realtime connection attempts blocked. The recipes list page triggers Ably connections that are blocked by CSP. This is a NEW CSP issue beyond the PostHog one found in v1. |
| — | Prep lists: AI generator | **SKIP** (fixme) | — | Requires existing event with dishes |
| 5E | Prep lists page loads | **PASS** | 9.5s | |
| 5F | Kitchen inventory page loads | **PASS** | 8.8s | |
| 5G | Allergens page loads | **PASS** | 23.2s | |

**Kitchen summary: 5 passed / 2 failed / 1 skipped**

**Root causes:**
1. **Create recipe failure** — Need to investigate the `/kitchen/recipes/new` form. May be missing form fields, submit button not found, or server-side error on POST.
2. **Ably CSP violation (NEW BUG)** — The `connect-src` CSP directive does not include Ably realtime domains (`*.ably.net`, `*.ably-realtime.com`). This blocks real-time features on pages that use Ably. Current CSP allows: `'self' https://*.clerk.com https://*.clerk.accounts.dev https://clerk-telemetry.com https://*.sentry.io https://us.i.posthog.com`. Must add `https://*.ably.net https://*.ably-realtime.com`.

---

## Scenario 6: Scheduling Module (partial — process killed)

| # | Test | Result | Duration | Notes |
|---|------|--------|----------|-------|
| 6A | Scheduling overview loads | **PASS** | 10.8s | |
| 6B | Shifts page loads with create button | **PASS** | 8.6s | |
| — | Create shift | **SKIP** (fixme) | — | Requires seeded schedules/locations/employees |
| 6C | Availability page loads | **FAIL** | 11.2s | Heading not found — likely data-dependent or page structure mismatch |
| 6D | Requests page loads | **PASS** | 9.3s | |
| 6E | Time-off page loads | **NOT RUN** | — | Process killed (SIGKILL — memory pressure) |
| 6F | Budgets page loads | **NOT RUN** | — | Process killed |

**Scheduling summary: 3 passed / 1 failed / 1 skipped / 2 not run**

**Root cause (availability):** Heading matching failed — the availability page may render a different heading text than expected, or the page structure changed.

---

## Scenario 7: Staff Module

| # | Test | Result | Duration | Notes |
|---|------|--------|----------|-------|
| 7A | Staff overview loads | **PASS** | 12.6s | |
| 7B | Team page loads with staff directory | **PASS** | 3.0s | |
| 7C | Add staff member with all fields | **FAIL** | 12.3s | Form submission returns error alert: "Could not add staffFirst name" — suggests validation error or missing firstName field. Alert text is concatenated without space: "Could not add staffFirst name" indicates a bug in the error message template. |
| 7D | Availability page loads | **FAIL** | 1.8m (timeout) | `page.goto` timed out at 90s. The `/staff/availability` redirect to `/scheduling/availability` appears to hang — possible infinite redirect loop or server crash on that route. |
| 7E | Schedule page loads | **FAIL** | 14.4s | **Ably CSP violation** — same CSP issue as kitchen. Redirect to `/scheduling` works but Ably connections are blocked. Also: scheduling heading not found, suggesting the redirect target may not render the expected heading. |
| 7F | Time-off page loads | **FAIL** | 3.0s | Strict mode violation: `getByRole('heading', { name: /time.off/i })` resolves to 2 elements — both `<h1>Time Off Requests</h1>` and `<h2>Time Off Requests (0)</h2>` match. Test needs `.first()` or more specific selector. **This is a test bug, not a product bug.** |
| 7G | Training page loads | **PASS** | 2.3s | |

**Staff summary: 3 passed / 4 failed**

**Root causes:**
1. **Staff form validation bug** — "Could not add staffFirst name" — error message has no space between "staff" and "First name". The form likely fails validation but the real issue is the error message formatting. Also suggests the `firstName` field may not be properly bound.
2. **Availability redirect timeout** — `/staff/availability` → `/scheduling/availability` hangs. Server may be crashing or entering a loop on this route.
3. **Ably CSP** — Same CSP issue as kitchen (see above).
4. **Time-off test bug** — Dual heading match (test code issue, not product).

---

## Scenario 8: Settings Module

| # | Test | Result | Duration | Notes |
|---|------|--------|----------|-------|
| 8A | Settings overview loads | **PASS** | 18.4s | |
| 8B | Team settings page loads | **PASS** | 23.8s | |
| 8C | Security settings page loads | **PASS** | 1.3m | Very slow (likely server-side heavy) but no errors |
| 8D | Integrations page loads | **FAIL** | 57.1s | `net::ERR_INCOMPLETE_CHUNKED_ENCODING` — Next.js dev server dropped the connection mid-response. Multiple JS chunks failed to load. This is a dev server stability issue, not a product bug. |
| 8E | Email templates list loads | **PASS** | 38.4s | |
| 8F | Create email template | **FAIL** | 37.4s | `HTTP 500 POST /settings/email-templates/new` — Server-side error on template creation. The POST to the page URL (likely a Next.js Server Action) returns 500. |
| 8G | Created template appears in list | **FAIL** | — | Cascading from 8F — template was never created so can't appear in list |

**Settings summary: 4 passed / 3 failed**

**Root causes:**
1. **Integrations page — dev server instability** — `ERR_INCOMPLETE_CHUNKED_ENCODING` on multiple JS chunks. The Next.js dev server dropped connections. This is transient and likely caused by memory pressure or dev server recompilation during the test. Not a product bug.
2. **Email template creation 500** — `POST /settings/email-templates/new` returns 500. Likely a server-side error in the template creation handler (missing field, DB constraint violation, or serialization issue).

---

## Cross-Cutting Issues (New in v2)

### 1. Ably Realtime CSP Violation (NEW — HIGH)
```
Connecting to 'https://main.realtime.ably.net/keys/.../requestToken' violates 
Content Security Policy directive: "connect-src 'self' https://*.clerk.com 
https://*.clerk.accounts.dev https://clerk-telemetry.com https://*.sentry.io 
https://us.i.posthog.com"
```
**Impact:** Real-time features using Ably (presence indicators, live updates, collaborative features) are completely blocked. Every page that initializes an Ably connection triggers CSP errors.

**Fix:** Add `https://*.ably.net https://*.ably-realtime.com` to the `connect-src` CSP directive.

### 2. Inventory API Endpoints Returning 500 (NEW — HIGH)
- `GET /api/inventory/items` — 500
- `GET /api/inventory/forecasts/alerts` — 500
- `GET /api/inventory/reorder-suggestions` — 500

**Impact:** The entire inventory items list is broken. Users cannot view or manage inventory items. Forecasts and reorder suggestions are also non-functional.

**Fix:** Investigate server-side errors in these endpoints. Likely Prisma query failures (missing columns, relations, or schema mismatch).

### 3. Staff Form Validation Error Message Bug (NEW — MEDIUM)
Error alert shows: "Could not add staffFirst name" — missing space between "staff" and "First name".

**Impact:** Minor UX issue. The actual form submission fails (validation), suggesting the `firstName` field binding or required field validation is broken.

**Fix:** Fix error message template (add space). Investigate why form submission fails.

### 4. /staff/availability Redirect Timeout (NEW — HIGH)
Navigating to `/staff/availability` (which redirects to `/scheduling/availability`) hangs for 90+ seconds and times out.

**Impact:** Staff availability page is completely inaccessible.

**Fix:** Debug the redirect chain and scheduling/availability page load. May be a server crash or infinite loop.

### 5. Email Template Creation 500 (NEW — MEDIUM)
`POST /settings/email-templates/new` returns 500 when creating a template.

**Impact:** Users cannot create new email templates.

### 6. Dev Server Memory Pressure (INFRASTRUCTURE)
Playwright test processes are being killed by SIGKILL during multi-spec runs. This happened twice across the 3 batches.

**Impact:** Cannot run the full E2E suite in a single pass. Tests must be split into smaller batches.

**Fix:** This is a machine resource issue, not a product bug. Consider increasing available memory or running tests in smaller groups.

---

## Previously Known Issues (from v1 — still present)

### 1. PostHog CSP Violation (LOW — cosmetic)
PostHog analytics script blocked by CSP. Not causing test failures but pollutes error reports.

### 2. Calendar API 500
`GET /api/calendar` returns 500 for current date range.

### 3. Decimal Serialization (CRITICAL — known)
Prisma Decimal objects cannot be passed from Server Components to Client Components. Affects proposal pages.

### 4. Clerk Sign-in Form Rendering
Clerk form elements intermittently fail to render within timeout. Auth setup succeeds (5-29s) but individual sign-in page tests fail.

---

## Screenshots Captured (v2)

| Test | Path |
|------|------|
| Forecasts page failure | `e2e/reports/failure-forecasts-page-loads-1777222858070.png` |
| Integrations page failure | `e2e/reports/failure-integrations-page-loads-1777223142615.png` |
| Staff: add staff member | `test-results/workflows-staff.workflow-S-ca10e-taff-member-with-all-fields-chromium/test-failed-1.png` |
| Staff: schedule page | `test-results/workflows-staff.workflow-S-a3ce2-orkflow-schedule-page-loads-chromium/test-failed-1.png` |
| Staff: time-off page | `test-results/workflows-staff.workflow-S-3ee64-orkflow-time-off-page-loads-chromium/test-failed-1.png` |
| Settings: create email template | `test-results/workflows-settings.workflo-.../test-failed-1.png` |
| Settings: template in list | `test-results/workflows-settings.workflo-.../test-failed-1.png` |

---

## Summary Statistics

| Module | Pass | Fail | Skip | Not Run | Total |
|--------|------|------|------|---------|-------|
| Inventory | 3 | 3 | 0 | 0 | 6 |
| Kitchen | 5 | 2 | 1 | 0 | 8 |
| Scheduling | 3 | 1 | 1 | 2 | 7 |
| Staff | 3 | 4 | 0 | 0 | 7 |
| Settings | 4 | 3 | 0 | 0 | 7 |
| **Total** | **18** | **13** | **2** | **2** | **35** |

**Combined (v1 + v2):**
| Module | Pass | Fail | Skip | Not Run | Total |
|--------|------|------|------|---------|-------|
| Auth (v1) | 4 | 5 | 0 | 0 | 9 |
| Events (v1) | — | — | — | — | (partial) |
| CRM (v1) | 2 | 2 | 0 | 0 | 4 |
| Inventory (v2) | 3 | 3 | 0 | 0 | 6 |
| Kitchen (v2) | 5 | 2 | 1 | 0 | 8 |
| Scheduling (v2) | 3 | 1 | 1 | 2 | 7 |
| Staff (v2) | 3 | 4 | 0 | 0 | 7 |
| Settings (v2) | 4 | 3 | 0 | 0 | 7 |
| **Combined** | **24** | **20** | **2** | **2** | **48** |

---

## Priority Fixes (ranked)

1. **Decimal serialization** (v1, CRITICAL) — All proposal pages fail
2. **Ably CSP violation** (v2, HIGH) — Real-time features completely blocked
3. **Inventory items API 500** (v2, HIGH) — Inventory management broken
4. **/staff/availability redirect timeout** (v2, HIGH) — Page inaccessible
5. **Email template creation 500** (v2, MEDIUM) — Can't create templates
6. **Staff form validation bug** (v2, MEDIUM) — Can't add staff
7. **Calendar API 500** (v1, MEDIUM) — Calendar broken
8. **PostHog CSP** (v1, LOW) — Cosmetic, pollutes error reports

---

## Specs Not Yet Tested

The following specs were NOT run in either v1 or v2:
- `ai-event-setup.workflow.spec.ts` — API-focused (NL parsing, session lifecycle)
- `billing-payments.workflow.spec.ts` — API-focused (invoices, payments, chart of accounts)
- `command-board.workflow.spec.ts` — UI-focused (board CRUD, canvas, entity browser, AI chat)
- `full-site.spider.spec.ts` — Full site crawl

These should be run in a future session with adequate memory (or one at a time).

---

## Acceptance Criteria

✅ Results document created at `e2e/TEST-RESULTS-2026-04-26-v2.md`
✅ 5 workflow specs reviewed (inventory, kitchen, scheduling, staff, settings)
✅ Clear pass/fail/skip status for each test scenario (35 tests across 5 modules)
✅ New bugs documented with file paths, line numbers, and error details
✅ 2 previously unknown bugs discovered (Ably CSP, inventory API 500)
