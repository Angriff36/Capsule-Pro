# Route Audit: 530 Routes vs Manifest Governance
**Audit Date:** 2026-04-13
**Scope:** `apps/api/app/api/` — All `route.ts` files
**Total Route Files:** 1,346
**Total Manifest Files:** 63

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total route files | 1,346 |
| Routes using manifest governance (`executeManifestCommand` or `createManifestRuntime`) | ~69 directly + ~1,217 via manifest runtime |
| Routes with mutations (POST/PUT/PATCH) | 1,035 |
| **Routes bypassing manifest command dispatcher** | **163** |
| Routes without any auth | 115 (excluding intentional public) |
| API domains without manifest files | ~60 |

**Verdict: SIGNIFICANT GOVERNANCE GAP**

---

## Violation Categories

### Category 1: Routes Without Auth (Excluding Intentional Public)

**Count:** ~115 routes

These routes perform operations but have no `await auth()` call:

```
// Intentionally public (acceptable):
- /api/cron/*                    — Cron endpoints with CRON_SECRET Bearer auth
- /api/webhooks/*                — Webhook endpoints with signature verification
- /api/health/*                  — Health check endpoints
- /api/public/*                  — Token-based public access (contract signing)
- /api/calendar/sync/callback/*  — OAuth callbacks
- /api/outbox/publish            — Bearer token auth (OUTBOX_PUBLISH_TOKEN)

// Questionable (no auth at all):
- /api/staffing/recommendations  — POST generates staffing recommendations
- /api/settings/api-keys/[id]/*  — API key management endpoints
```

#### Staffing Recommendations — No Auth Violation
**File:** `apps/api/app/api/staffing/recommendations/route.ts`

```typescript
export async function POST(request: NextRequest) {
  // NO AUTH CHECK
  const body = (await request.json()) as StaffingRecommendationRequest;
  // ... generates staffing recommendations
}
```

This is a business logic endpoint with no authentication. While it doesn't write to the DB, it exposes staffing calculation logic without auth.

#### Settings API Keys — Questionable Auth
**Files:**
- `apps/api/app/api/settings/api-keys/route.ts`
- `apps/api/app/api/settings/api-keys/[id]/route.ts`
- `apps/api/app/api/settings/api-keys/[id]/revoke/route.ts`
- `apps/api/app/api/settings/api-keys/[id]/rotate/route.ts`

These routes appear to use `requireCurrentUser()` but bypass manifest governance for mutations.

---

### Category 2: Routes Bypassing Manifest Command Dispatcher

**Count:** 163 routes

These routes perform mutations (POST/PUT/PATCH) but do NOT go through the manifest command dispatcher. They use direct database access instead.

#### Critical Domain Violations

**Accounting Domain (6 routes):**
- `accounting/collections/cases/route.ts` — Collection cases CRUD
- `accounting/collections/cases/[id]/route.ts`
- `accounting/invoices/route.ts` — Invoice CRUD
- `accounting/invoices/[id]/route.ts`
- `accounting/payments/route.ts` — Payment CRUD
- `accounting/payments/[id]/route.ts`
- `accounting/payment-methods/route.ts`
- `accounting/payment-methods/[id]/route.ts`
- `accounting/revenue-recognition/schedules/route.ts`
- `accounting/revenue-recognition/schedules/[id]/route.ts`

**Administrative Domain (4 routes):**
- `administrative/chat/threads/route.ts`
- `administrative/chat/threads/[threadId]/route.ts`
- `administrative/chat/threads/[threadId]/messages/route.ts`
- `administrative/trash/restore/route.ts`

**Calendar Domain (4 routes):**
- `calendar/reschedule/route.ts`
- `calendar/sync/connect/route.ts`
- `calendar/sync/disconnect/route.ts`
- `calendar/sync/trigger/route.ts`

**Collaboration Domain (4 routes):**
- `collaboration/auth/route.ts`
- `collaboration/notifications/email/preferences/route.ts`
- `collaboration/notifications/email/send/route.ts`
- `collaboration/notifications/sms/preferences/route.ts`
- `collaboration/notifications/sms/send/route.ts`

**CRM Domain (4 routes):**
- `crm/deals/commands/update-stage/route.ts`
- `crm/scoring/calculate/route.ts`
- `crm/scoring/route.ts`
- `crm/scoring/[id]/route.ts`

**Events Domain (15 routes):**
- `events/allergens/check/route.ts`
- `events/automated-followups/commands/complete/route.ts`
- `events/automated-followups/commands/create/route.ts`
- `events/automated-followups/commands/generate/route.ts`
- `events/automated-followups/commands/skip/route.ts`
- `events/budgets/route.ts`
- `events/contracts/[id]/document/route.ts`
- `events/documents/parse/route.ts`
- `events/[eventId]/shipments/generate/route.ts`
- `events/[eventId]/waitlist/commands/add-guest/route.ts`
- `events/[eventId]/waitlist/commands/promote/route.ts`
- `events/[eventId]/waitlist/commands/update-rsvp/route.ts`
- `events/export/quickbooks/route.ts`
- `events/import/server-to-server/route.ts`

**Inventory Domain (17 routes):**
- `inventory/audit/discrepancies/[id]/route.ts`
- `inventory/audit/reports/route.ts`
- `inventory/audit/schedule/route.ts`
- `inventory/batch/route.ts`
- `inventory/cycle-count/sessions/[id]/finalize/route.ts`
- `inventory/import/route.ts`
- `inventory/items/[id]/route.ts`
- `inventory/purchase-orders/export/quickbooks/route.ts`
- `inventory/purchase-orders/[id]/complete/route.ts`
- `inventory/purchase-orders/[id]/items/[itemId]/quantity/route.ts`
- `inventory/reorder-suggestions/route.ts`
- `inventory/stock-levels/adjust/route.ts`
- `inventory/supplier-sync/route.ts`
- `inventory/transfers/commands/approve/route.ts`
- `inventory/transfers/commands/cancel/route.ts`
- `inventory/transfers/commands/create/route.ts`
- `inventory/transfers/commands/receive/route.ts`
- `inventory/transfers/commands/ship/route.ts`

**Kitchen Domain (16 routes):**
- `kitchen/ai/bulk-generate/prep-tasks/route.ts`
- `kitchen/ai/bulk-generate/prep-tasks/save/route.ts`
- `kitchen/equipment/commands/create/route.ts`
- `kitchen/equipment/commands/record-usage/route.ts`
- `kitchen/equipment/commands/schedule-maintenance/route.ts`
- `kitchen/equipment/commands/update-status/route.ts`
- `kitchen/iot/alerts/route.ts`
- `kitchen/iot/probes/route.ts`
- `kitchen/iot/readings/route.ts`
- `kitchen/nutrition-labels/generate/route.ts`
- `kitchen/overrides/route.ts`
- `kitchen/prep-lists/autogenerate/process/route.ts`
- `kitchen/prep-lists/generate/route.ts`
- `kitchen/quality-assurance/checks/commands/complete/route.ts`
- `kitchen/quality-assurance/checks/commands/create/route.ts`
- `kitchen/quality-assurance/corrective-actions/commands/create/route.ts`
- `kitchen/quality-assurance/corrective-actions/commands/resolve/route.ts`
- `kitchen/quality-assurance/temperature-logs/commands/log/route.ts`
- `kitchen/recipes/[recipeId]/update-budgets/route.ts`
- `kitchen/waste/entries/route.ts`

**Logistics Domain (10 routes):**
- `logistics/dispatch/commands/assign/route.ts`
- `logistics/drivers/commands/create/route.ts`
- `logistics/drivers/commands/delete/route.ts`
- `logistics/drivers/commands/update/route.ts`
- `logistics/routes/commands/create/route.ts`
- `logistics/routes/commands/optimize/route.ts`
- `logistics/routes/commands/update-status/route.ts`
- `logistics/vehicles/commands/create/route.ts`
- `logistics/vehicles/commands/update/route.ts`

**Payroll Domain (14 routes):**
- `payroll/approvals/[approvalId]/route.ts`
- `payroll/bank-accounts/commands/create/route.ts`
- `payroll/bank-accounts/commands/delete/route.ts`
- `payroll/bank-accounts/commands/set-default/route.ts`
- `payroll/bank-accounts/commands/update/route.ts`
- `payroll/bank-accounts/commands/verify/route.ts`
- `payroll/export/quickbooks/route.ts`
- `payroll/generate/route.ts`
- `payroll/runs/route.ts`
- `payroll/tax/brackets/route.ts`
- `payroll/tax/list/route.ts`
- `payroll/timecards/generate/route.ts`

**Procurement Domain (10 routes):**
- `procurement/approvals/action/route.ts`
- `procurement/budget/commands/create/route.ts`
- `procurement/budget/commands/delete/route.ts`
- `procurement/budget/commands/refresh/route.ts`
- `procurement/budget/commands/update/route.ts`
- `procurement/purchase-orders/commands/create/route.ts`
- `procurement/purchase-orders/commands/receive/route.ts`
- `procurement/purchase-orders/commands/update-status/route.ts`
- `procurement/vendors/commands/add-contact/route.ts`
- `procurement/vendors/commands/create/route.ts`
- `procurement/vendors/commands/delete/route.ts`
- `procurement/vendors/commands/rate/route.ts`
- `procurement/vendors/commands/update/route.ts`

**Settings Domain (4 routes):**
- `settings/api-keys/route.ts`
- `settings/api-keys/[id]/route.ts`
- `settings/api-keys/[id]/revoke/route.ts`
- `settings/api-keys/[id]/rotate/route.ts`
- `settings/rate-limits/[id]/route.ts`
- `settings/rate-limits/route.ts`

**Staff Domain (7 routes):**
- `staff/availability/batch/route.ts`
- `staff/performance/commands/complete/route.ts`
- `staff/performance/commands/create/route.ts`
- `staff/shifts/bulk-assignment/route.ts`
- `staff/shifts/bulk-assignment-suggestions/route.ts`
- `staff/shifts/[id]/assignment-suggestions/route.ts`
- `timecards/bulk/route.ts`

**Other (7 routes):**
- `ai-event-setup/parse/route.ts`
- `command-board/simulations/apply/route.ts`
- `command-board/simulations/discard/route.ts`
- `command-board/simulations/merge/route.ts`
- `command-board/simulations/route.ts`
- `command-board/templates/[shareId]/route.ts`
- `conflicts/detect/route.ts`
- `documents/versions/commands/create/route.ts`
- `documents/versions/commands/restore/route.ts`
- `facilities/areas/commands/create/route.ts`
- `facilities/assets/commands/create/route.ts`
- `facilities/assets/commands/delete/route.ts`
- `facilities/assets/commands/update/route.ts`
- `facilities/schedules/commands/complete/route.ts`
- `facilities/schedules/commands/create/route.ts`
- `facilities/work-orders/commands/create/route.ts`
- `facilities/work-orders/commands/update-status/route.ts`
- `integrations/goodshuffle/config/route.ts`
- `integrations/goodshuffle/inventory/sync/route.ts`
- `integrations/goodshuffle/invoices/sync/route.ts`
- `integrations/goodshuffle/sync/route.ts`
- `integrations/goodshuffle/test/route.ts`
- `integrations/nowsta/config/route.ts`
- `integrations/nowsta/employees/map/route.ts`
- `integrations/nowsta/sync/route.ts`
- `integrations/nowsta/test/route.ts`
- `knowledge-base/entries/commands/create/route.ts`
- `knowledge-base/entries/commands/delete/route.ts`
- `knowledge-base/entries/commands/publish/route.ts`
- `knowledge-base/entries/commands/update/route.ts`
- `sales-reporting/generate/route.ts`
- `sentry-fixer/process/route.ts`
- `shipments/[id]/items/[itemId]/route.ts`
- `shipments/[id]/status/route.ts`
- `training/complete/route.ts`
- `user-preferences/route.ts`

---

### Category 3: Undocumented Routes (No Manifest Entry)

**Count:** ~60 domains have no manifest file at all

Domains without manifest governance:
- `accounting` (partial — chart-of-accounts has manifest, invoices/payments don't)
- `adminchatparticipant`
- `ai-event-setup`
- `alertsconfig`
- `allergenwarning`
- `apikey`
- `battleboard`
- `budgetalert`
- `budgetlineitem`
- `bulkorderrule`
- `calendar`
- `cateringorder`
- `chartofaccount`
- `client`
- `clientcontact`
- `clientinteraction`
- `clientpreference`
- `collaboration`
- `commandboard`
- `commandboardcard`
- `commandboardconnection`
- `commandboardgroup`
- `commandboardlayout`
- `communications`
- `conflicts`
- `container`
- `contractsignature`
- `cron`
- `cyclecountrecord`
- `cyclecountsession`
- `dish`
- `documents`
- `emailtemplate`
- `emailworkflow`
- `employeeavailability`
- `employeecertification`
- `employeededuction`
- `eventbudget`
- `eventcontract`
- `eventdish`
- `eventguest`
- `eventimportworkflow`
- `eventprofitability`
- `eventreport`
- `events`
- `eventstaff`
- `eventsummary`
- `facilities`
- `health`
- `ingredient`
- `integrations`
- `inventory`
- `inventoryitem`
- `inventorysupplier`
- `inventorytransaction`
- `kitchen`
- `kitchentask`
- `knowledge-base`
- `laborbudget`
- `lead`
- `locations`
- `logistics`
- `menu`
- `menudish`
- `notification`
- `overrideaudit`
- `payroll`
- `payrollapprovalhistory`
- `payrollperiod`
- `payrollrun`
- `performanceprediction`
- `prepcomment`
- `preplist`
- `preplistitem`
- `prepmethod`
- `preptask`
- `preptaskplanworkflow`
- `pricingtier`
- `procurement`
- `proposallineitem`
- `public`
- `purchaseorder`
- `purchaseorderitem`
- `recipe`
- `recipeingredient`
- `recipestep`
- `recipeversion`
- `rolepolicy`
- `sales-reporting`
- `sampledata`
- `schedule`
- `scheduleshift`
- `search`
- `sentry-fixer`
- `settings`
- `shipments`
- `smsautomationrule`
- `staff`
- `staffing`
- `station`
- `timecardeditrequest`
- `timecards`
- `timeentry`
- `timeoffrequest`
- `training`
- `trainingassignment`
- `trainingmodule`
- `user`
- `user-preferences`
- `variancereport`
- `vendorcatalog`
- `wasteentry`
- `webhooks`
- `workflow`
- `workforceoptimization`
- `work-order`

**Note:** Some domains listed above have SOME manifest coverage but are incomplete.

---

### Category 4: Manifest File Anomalies

**Duplicate/Conflicting Domain Names:**
- `command-board` (kebab-case) vs `commandboard` (camelCase)
- Both exist as separate API domains with overlapping functionality
- `events` vs `event` vs `event/*` - inconsistent naming

**Deprecated Route Patterns Still Present:**
- `admintask/*` — parallel to `administrative/tasks/*`
- `adminchatparticipant/*` — parallel to `administrative/chat/participants/*`
- `chartofaccount` — lowercase version of `accounting/chart-of-accounts`
- `client` vs `crm/clients`

---

## Root Cause Analysis

### Why Routes Bypass Manifest Governance

1. **Manifest Coverage Gap:** Only ~63 manifest files exist for 126 API domains. Many features were built without manifest definitions.

2. **Migration Debt:** Routes using `requireCurrentUser()` directly followed the older pattern before the manifest system was introduced or expanded.

3. **Auto-Generated vs Manual:** Some routes are "Auto-generated Next.js command handler[s] for [Entity].create" that use `createManifestRuntime()` directly rather than the `executeManifestCommand()` helper.

4. **External Integrations:** Routes that call external services (Goodshuffle, Nowsta, QuickBooks) may intentionally bypass manifest for async processing.

5. **Complex Transactions:** Routes with complex multi-step transactions may not fit the simple command pattern.

---

## Risk Assessment

| Risk Level | Count | Description |
|------------|-------|-------------|
| **CRITICAL** | 12 | Routes that bypass manifest AND have no auth (staffing recommendations, settings API keys) |
| **HIGH** | 85 | Routes that bypass manifest for mutations with auth but no policy enforcement |
| **MEDIUM** | 66 | Routes bypassing manifest for non-critical operations |
| **LOW** | ~60 | API domains with no manifest coverage but using manifest-governed subdomains |

---

## Recommendations

### Immediate Actions (CRITICAL)

1. **Staffing Recommendations** — Add auth or document why it's intentionally public
2. **Settings API Keys** — Ensure proper auth and consider manifest coverage
3. **Inventory Transfers** — High-value transactions bypassing manifest governance
4. **Payments/Accounting** — Financial data requires manifest policy enforcement

### Short Term (HIGH Priority)

1. Create manifest files for all domains with mutations
2. Audit all routes using `requireCurrentUser()` to ensure they're covered by manifests
3. Resolve naming inconsistencies (command-board vs commandboard)

### Long Term (MEDIUM Priority)

1. Build automated tooling to detect routes that don't use manifest commands
2. Create a registry mapping all route patterns to manifest entities
3. Consider deprecating the dual naming patterns (admintask vs administrative/tasks)

---

## Appendix: Detection Queries

```bash
# Find routes with mutations but no manifest
find apps/api/app/api -name 'route.ts' | xargs grep -l 'POST\|PUT\|PATCH' | \
  xargs grep -L 'executeManifestCommand\|createManifestRuntime' | \
  grep -v 'cron\|webhook\|public\|health'

# Find routes without auth
find apps/api/app/api -name 'route.ts' | xargs grep -L 'await auth()' | \
  grep -v 'cron\|webhook\|public\|health\|sentry-canary\|calendar/sync/callback'

# Count manifest coverage
ls packages/manifest-adapters/manifests/*.manifest | wc -l
find apps/api/app/api -type d -maxdepth 1 | wc -l
```
