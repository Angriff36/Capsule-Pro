# Capsule Pro Implementation Plan

**Last Updated**: 2026-02-05
**Status**: Active Development
**Ultimate Goal**: Hydration Stability

---

## Current Status Summary

### Bundle Containment: COMPLETE (2026-02-05)
- All heavy libraries (@react-pdf/renderer, xlsx, recharts) are lazy-loaded
- PostHog and Sentry are optimized
- Middleware scope narrowed to protected routes
- Shared bundle: 245KB baseline maintained
- **No further bundle work required**

### Feature Implementation Status
| Category | Status | Notes |
|----------|--------|-------|
| Kitchen Ops | 100% | Prep lists, allergens, waste tracking, recipes (desktop + mobile), task cards, production board, mobile task interface |
| Scheduling | 100% | Shifts, availability, time-off, labor budgets, auto-assignment |
| Payroll | 90% | Timecards, calculation engine complete. Overview/payouts use static data |
| Warehouse | 80% | Shipments, receiving, stock levels API, depletion forecasting, purchase orders, recipe costing complete. Inventory page uses mock data. |
| Analytics | 90% | Main dashboard, profitability, employee performance, kitchen operations complete. Sales lazy-loaded. |
| Command Board | 100% | Strategic command board with real-time collaboration |
| CRM | 85% | Clients, proposals complete. Venues stubbed (no schema). |
| Events | 95% | Details, contracts, reports, import/export complete. Budget tracking needs frontend wiring. |
| Integrations | 30% | Nowsta, GoodShuffle, QuickBooks (partial - payroll export exists) |
| Mobile Time Clock | 0% | Spec exists, not implemented |
| Dev Console | 20% | Placeholder screens only |

---

## PRIORITY P0 - CRITICAL: Hydration Stability

**User's stated ultimate goal. All hydration mismatches must be eliminated.**

### P0-1: Fix event-details-client.tsx Date.now() Hydration Mismatch
**File**: `apps/app/app/(authenticated)/events/[eventId]/event-details-client.tsx`
**Line**: 270
**Issue**:
```typescript
const [now, setNow] = useState(() => new Date());  // HYDRATION MISMATCH
```
The `new Date()` in useState initializer produces different values on server vs client, causing hydration mismatch.

**Fix**:
- Initialize with `null` or server-passed timestamp
- Use `useEffect` to set client-side time after mount
- Add 1-second interval to keep time current for live status displays
- Affected features: Live event status, time until/since calculations

**Acceptance**:
- No hydration errors on `/events/[eventId]/` routes
- Live time displays still function correctly
- Time calculations (until/since) remain accurate

### P0-2: Fix use-mobile.ts Hydration Issue
**File**: `packages/design-system/hooks/use-mobile.ts`
**Issue**:
- Returns `undefined` on server, then `false` or `true` on client
- Used throughout app in sidebar and other components
- Causes layout shift hydration mismatch

**Fix**:
- Initialize with a safe default that matches server-rendered state
- Consider using CSS media queries with `@media (max-width: ...)` for initial render
- Add `suppressHydrationWarning` as fallback if display matches

**Acceptance**:
- No hydration errors on any route using sidebar
- No visible layout shift during initial render
- Mobile/desktop behavior correct after hydration

### P0-3: Address Calendar Focus Behavior
**File**: `packages/design-system/components/ui/calendar.tsx`
**Lines**: 187-189
**Issue**:
```typescript
React.useEffect(() => {
  if (modifiers.focused) ref.current?.focus()
}, [modifiers.focused])
```
- useEffect focuses day buttons - may cause minor hydration issues

**Fix**:
- Add `suppressHydrationWarning` if focus is cosmetic only
- Consider server-side focus indication via CSS classes

**Acceptance**:
- No hydration warnings from calendar components
- Focus behavior remains functional

### P0-4: Add Hydration Error Detection/Instrumentation
**Goal**: Catch future hydration issues before they reach production

**Tasks**:
1. Add error boundary wrapper for hydration errors
2. Log hydration mismatches to monitoring (Sentry)
3. Add development-only warnings for common hydration anti-patterns
4. Create ESLint rule (optional) to detect `new Date()` in useState

**Files**:
- `apps/app/app/layout.tsx` - Add error boundary
- `packages/monitoring/` - Add hydration error tracking

**Acceptance**:
- All hydration errors logged with component stack
- Dev warnings for suspicious patterns
- Monitoring dashboard shows hydration error rate

### P0-5: Create Guardrails for Future Development
**Goal**: Prevent recurrence of hydration issues

**Tasks**:
1. Add to CLAUDE.md: Hydration safety guidelines
2. Create `useClientState` hook that safely handles server/client differences
3. Document common anti-patterns

**Files**:
- `CLAUDE.md` - Add hydration guidelines
- `packages/ui/src/hooks/use-client-state.ts` - New utility hook

**Acceptance**:
- Documentation exists
- Utility hook available and used in new features
- No new hydration issues introduced

---

## PRIORITY P1 - HIGH: Missing Core Models

### P1-1: Add Venue Model to Database Schema
**Issue**: Venue management feature is completely stubbed. Actions throw errors.

**Schema Design** (add to `packages/database/prisma/schema.prisma`):
```prisma
model Venue {
  tenantId         String   @map("tenant_id") @db.Uuid
  id               String   @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name             String
  venueType        String   @default("other") @map("venue_type")
  addressLine1     String?  @map("address_line1")
  addressLine2     String?  @map("address_line2")
  city             String?
  stateProvince    String?  @map("state_province")
  postalCode       String?  @map("postal_code")
  countryCode      String?  @default("US") @map("country_code")
  capacity         Int?
  contactName      String?  @map("contact_name")
  contactPhone     String?  @map("contact_phone")
  contactEmail     String?  @map("contact_email")
  equipmentList    Json?    @map("equipment_list")
  preferredVendors Json?    @map("preferred_vendors")
  accessNotes      String?  @db.Text
  cateringNotes    String?  @db.Text
  layoutImageUrl   String?  @map("layout_image_url")
  isActive         Boolean  @default(true) @map("is_active")
  tags             String[]
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt        DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt        DateTime? @map("deleted_at") @db.Timestamptz(6)

  tenant           Account  @relation(fields: [tenantId], references: [id], onDelete: Restrict)

  @@id([tenantId, id])
  @@index([tenantId, venueType], map: "venues_type_idx")
  @@index([tenantId, city], map: "venues_city_idx")
  @@index([tenantId, isActive], map: "venues_active_idx")
  @@map("venues")
  @@schema("tenant_crm")
}
```

**Files**:
- `packages/database/prisma/schema.prisma` - Add Venue model
- `apps/app/app/(authenticated)/crm/venues/actions.ts` - Implement CRUD operations
- `apps/app/app/(authenticated)/crm/venues/page.tsx` - Wire up UI
- `apps/app/app/(authenticated)/crm/venues/[id]/page.tsx` - Wire up detail view

**Acceptance**:
- Migration runs successfully
- Venues can be created, read, updated, deleted
- Venue list page loads with real data
- Venue detail page loads
- Events can be associated with venues (requires Event.venueId field)

### P1-2: Implement Event Budget Tracking Frontend
**Issue**: EventBudget model exists in schema but frontend shows "Budget model does not exist"

**Note**: The EventBudget model DOES exist (line 467 in schema.prisma). The error message is outdated.

**Files**:
- `apps/app/app/(authenticated)/events/[eventId]/page.tsx:480` - Remove/update error message
- Create budget management component (or wire up existing if partial)

**Acceptance**:
- Budget tab loads without error
- Budget line items can be added/edited
- Budget vs actual tracking displays
- Variance calculations work

---

## PRIORITY P2 - MEDIUM: Email/Integration TODOs

### P2-1: Implement Contract Email Sending
**File**: `apps/app/app/api/events/contracts/[contractId]/send/route.ts:113`

**Current TODO**: "Implement email sending logic"

**Tasks**:
1. Set up email service (Resend, SendGrid, or similar)
2. Create email template for contract delivery
3. Attach PDF contract to email
4. Track email delivery status
5. Add to outbox pattern for multi-tenant safety

**Acceptance**:
- Contracts can be sent via email
- Email includes PDF attachment
- Delivery status tracked in database
- Bounce/complaint handling

### P2-2: Implement Proposal PDF Email Sending
**File**: `apps/app/app/(authenticated)/crm/proposals/actions.ts:452`

**Current TODO**: "Send email with proposal PDF"

**Tasks**:
1. Generate proposal PDF (similar to contract PDF)
2. Create email template for proposal delivery
3. Attach PDF to email
4. Track proposal status (sent, viewed, accepted)
5. Add to outbox pattern

**Acceptance**:
- Proposals can be sent via email
- Email includes PDF attachment
- Proposal tracking updates on send/view/accept

### P2-3: Update Client Interaction Employee Reference
**File**: `apps/app/app/(authenticated)/crm/clients/actions.ts:576`

**Current TODO**: "Add Employee model and proper employee lookup"

**Note**: The User model IS the employee model (mapped to "employees" table). The comment is outdated.

**Fix**:
- Update comment to reflect that User is the employee model
- Consider renaming `employeeId` field references for clarity
- Add proper User lookup if needed

**Acceptance**:
- Comment updated
- Client interactions properly track employee
- Employee names display on interaction records

---

## PRIORITY P3 - NORMAL: Complete Partial Features

### P3-1: Warehouse Cycle Counting Frontend
**Issue**: Backend complete, frontend placeholder

**Files**:
- Find cycle counting frontend component
- Wire up to existing API

**Acceptance**:
- Cycle count list displays
- New cycle counts can be created
- Count entries can be added
- Variance reports generate

### P3-2: Warehouse Inventory Page with Real Data
**Issue**: Currently shows mock data

**Files**:
- `apps/app/app/(authenticated)/warehouse/inventory/page.tsx` (verify path)
- Wire up to stock levels API

**Acceptance**:
- Inventory loads from database
- Real-time stock levels display
- Low stock indicators work
- Filters and search functional

### P3-3: Receiving Reports with Real Data
**Issue**: Shows mock supplier metrics

**Files**:
- Locate receiving reports component
- Wire up to shipments/receiving data

**Acceptance**:
- Supplier metrics calculated from real data
- On-time delivery percentages accurate
- Quality scores based on actual receipts

### P3-4: Payroll Overview with Dynamic Data
**Issue**: UI exists with static data

**Files**:
- `apps/app/app/(authenticated)/payroll/page.tsx` (verify path)
- Wire up to timecard/calculation data

**Acceptance**:
- Payroll period summary loads from database
- Employee hours calculate from timecards
- Tax/deduction summaries display
- Payroll totals accurate

### P3-5: Payouts Management with Dynamic Data
**Issue**: Static data in payouts interface

**Files**:
- Locate payouts component
- Wire up to payroll calculations

**Acceptance**:
- Payout amounts calculated from timecards
- Direct deposit/Check selection works
- Payout history displays
- Export to payroll processor (Nowsta) works

---

## PRIORITY P4 - LOW: Dev Console & Missing Specs

### P4-1: Dev Console Placeholder Screens

**Files**:
- `apps/app/app/(dev-console)/dev-console/webhooks/page.tsx` - Wire to webhook delivery logs
- `apps/app/app/(dev-console)/dev-console/audit-logs/page.tsx` - Wire to audit logs
- `apps/app/app/(dev-console)/dev-console/users/page.tsx` - Wire to user management
- `apps/app/app/(dev-console)/dev-console/api-keys/page.tsx` - Wire to API key management

**Acceptance**:
- Webhook delivery log viewer with retry capability
- Audit log viewer with filters
- User management with role assignment
- API key creation/revocation

### P4-2: Mobile Time Clock
**Spec exists**: `specs/mobile-time-clock_TODO/`

**Tasks**:
- Review spec for requirements
- Implement mobile-optimized time clock interface
- GPS verification for clock-in/out
- Offline support for clock-ins
- Sync when connection restored

**Files to Create**:
- `apps/app/app/(authenticated)/mobile/time-clock/page.tsx`
- Related server actions

**Acceptance**:
- Employees can clock in/out from mobile
- GPS location captured
- Offline clock-ins supported
- Time entries sync to database

### P4-3: Nowsta Integration
**Spec exists**: `specs/nowsta-integration_TODO/`

**Tasks**:
- Review spec for requirements
- Implement Nowsta API client
- Sync employees to Nowsta
- Sync timecards to Nowsta
- Import payroll data from Nowsta

**Acceptance**:
- Employees push to Nowsta
- Timecards push to Nowsta
- Payout data pulls from Nowsta
- Sync status tracked

### P4-4: GoodShuffle Integrations
**Specs exist**:
- `specs/goodshuffle-event-sync_TODO/`
- `specs/goodshuffle-inventory-sync_TODO/`
- `specs/goodshuffle-invoicing-sync_TODO/`

**Tasks**:
- Implement GoodShuffle API client
- Event sync (bidirectional)
- Inventory sync
- Invoicing sync

**Acceptance**:
- Events sync between systems
- Inventory levels sync
- Invoices push to GoodShuffle
- Sync status tracked

### P4-5: QuickBooks Full Export
**Specs exist**:
- `specs/quickbooks-bill-export_TODO/`
- `specs/quickbooks-invoice-export_TODO/`
- `specs/quickbooks-payroll-export_TODO/` (may already exist)

**Tasks**:
- Implement QuickBooks API client
- Bill export (purchasing)
- Invoice export (events/invoicing)
- Verify payroll export exists and works

**Acceptance**:
- Bills push to QuickBooks
- Invoices push to QuickBooks
- Payroll pushes to QuickBooks
- Sync status tracked

---

## PRIORITY P5 - FUTURE: Enhancements

### P5-1: Replace Mock Weather Data
**File**: `apps/app/app/(authenticated)/kitchen/production-board-client.tsx:106`

**Current**: Mock weather data

**Fix**:
- Integrate weather API (OpenWeatherMap, etc.)
- Cache weather data
- Handle API failures gracefully

**Acceptance**:
- Real weather data displays
- Fallback on API failure
- Cached data used when offline

### P5-2: Team Activity Tracking in Kitchen
**Spec exists**: `specs/kitchen-prep-list-generation_TODO/` (may include activity tracking)

**Tasks**:
- Track who completed which prep tasks
- Show active kitchen contributors
- Display task completion by team member

**Acceptance**:
- Activity feed shows task completions
- Contributor avatars display
- Performance metrics by team member

### P5-3: Advanced Analytics Features
**Potential enhancements**:
- Predictive staffing needs
- Revenue forecasting
- Cost trend analysis
- Custom dashboard builder

**Acceptance**:
- Defined by future requirements

---

## Summary Statistics

| Priority Level | Items | Status |
|----------------|-------|--------|
| P0 - Critical | 5 | In Progress |
| P1 - High | 2 | Pending |
| P2 - Medium | 3 | Pending |
| P3 - Normal | 5 | Pending |
| P4 - Low | 5 | Pending |
| P5 - Future | 3 | Pending |

**Total**: 23 items across 5 priority levels

---

## Execution Order Recommendation

1. **Complete P0 items first** - User's stated ultimate goal is hydration stability
2. **P1 items second** - Missing core models block feature completion
3. **P2 items third** - Email/integration TODOs are user-facing blockers
4. **P3 items fourth** - Complete partially-implemented features
5. **P4 items fifth** - Dev console and integrations
6. **P5 items last** - Nice-to-have enhancements

---

## Notes

- All database changes must follow the Prisma schema rules in CLAUDE.md
- All features must maintain multi-tenant isolation
- All errors must be reported (no silent failures)
- Real-time updates expected in collaborative features
- Use outbox pattern for all external integrations
