# Capsule Pro — User Journey Map

**Task:** CP-094 | **Author:** Scribe | **Date:** 2026-04-13

## Overview

Capsule Pro is an all-in-one event and hospitality management platform built on Next.js with Clerk authentication. It serves catering companies, event planners, and hospitality operations. The authenticated app lives under `(authenticated)` route group with 20+ modules.

---

## Stage 1: Acquisition & Signup

**Entry points:**
- `/sign-up` — Clerk-powered signup form (email/password, OAuth)
- `/sign-in` — Clerk-powered login

**Auth system:**
- Clerk handles all identity (packages/auth wraps `@clerk/nextjs/server`)
- Organization-scoped: every user belongs to a Clerk org (`orgId` extracted via `auth()`)
- Tenant mapping: `orgId` maps to internal `tenantId` via `getTenantIdForOrg()`
- Redirect after signup: configurable via `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` (defaults to `/`)

**Post-signup redirect:** Root `/` redirects to `/calendar` — the unified calendar is the landing surface.

**Unauthenticated routes:** Contract signing (`/sign/contract/[token]`) and proposal viewing (`/view/proposal/[token]`) are publicly accessible for external clients.

---

## Stage 2: First Session — The Calendar Hub

**Landing page:** `/calendar` — UnifiedCalendar showing events, shifts, time-off, deadlines, and reminders in a single view.

**Empty state problem:** New orgs have no data. The calendar is their first view — if it's empty, the user needs clear guidance to create their first event.

**Navigation:** GlobalSidebar provides module navigation. Top-level modules:
- Calendar, Events, CRM, Kitchen, Inventory, Warehouse, Procurement, Staff, Payroll, Scheduling, Accounting, Analytics, Facilities, Marketing, Administrative, Settings

---

## Stage 3: First Event Creation

**Route:** `/events/new`

**Flow:**
1. Template selector appears automatically (useEffect on mount)
2. User picks an event template (e.g., Wedding, Corporate, Private Party) → pre-fills form defaults
3. Or skips template → blank `EventForm`
4. Form submits via server action `createEvent` (in `events/actions.ts`)
5. Validation via `createEventSchema` (Zod)
6. Event created with random UUID, status from `eventStatuses` enum
7. Redirects to `/events/[eventId]`

**Event detail page** (`/events/[eventId]`) includes:
- Battle board (event execution tracking)
- Follow-ups (post-event tasks)
- Waitlist management
- Kitchen dashboard (per-event kitchen operations)

**Event import:** `/events/import` — supports CSV and PDF import for bulk event creation.

---

## Stage 4: CRM & Client Management

**Route:** `/crm`

**Sub-flows:**
1. **Clients:** `/crm/clients` → `/crm/clients/new` — create client records
2. **Pipeline:** `/crm/pipeline` — sales pipeline with lead scoring (`/crm/scoring`)
3. **Proposals:** `/crm/proposals` → `/crm/proposals/new` — create proposals with templates (`/crm/proposals/templates`)
4. **Venues:** `/crm/venues` → `/crm/venues/new` — venue management
5. **Communications:** `/crm/communications` — client communications

**External sharing:** Proposals can be shared via token URLs (`/view/proposal/[token]`). Contracts can be signed via `/sign/contract/[token]`.

---

## Stage 5: Supplier/Procurement Integration

**Route:** `/procurement`

**Sub-flows:**
1. **Vendors:** `/procurement/vendors` → vendor detail pages (`/procurement/vendors/[id]`)
2. **Purchase Orders:** `/procurement/purchase-orders` → `/procurement/purchase-orders/new`
3. **Requisitions:** `/procurement/requisitions` — internal purchase requests
4. **Approvals:** `/procurement/approvals` — approval workflow for POs
5. **Vendor Contracts:** `/procurement/vendor-contracts` — supplier agreements
6. **Budget:** `/procurement/budget` — procurement budget tracking

**Vendor data model:** Vendors have shared components (`procurement/components/vendor-shared.tsx`) reused across PO creation and vendor management.

---

## Stage 6: Team & Organization Setup

**Route:** `/settings/team`

**Flow:**
1. Team member list (fetched from database `user` table, filtered by org/tenant)
2. Shows: email, name, role, active status, join date
3. Clerk manages org membership; internal DB tracks role assignments
4. Roles displayed as formatted labels (e.g., `EVENT_MANAGER` → "Event Manager")

**Access control:** ArcJet security middleware on authenticated layout (`secure(["CATEGORY:PREVIEW"])` when `ARCJET_KEY` is set).

---

## Stage 7: Day-to-Day Operations (Retention Loops)

### Calendar as the return hook
- `/calendar` is the root redirect — users see it every login
- Unified view pulls from events, shifts, time-off, deadlines, reminders
- Refresh button and month navigation keep it sticky

### Kitchen operations
- `/kitchen` — recipe management, prep lists, tasks, stations, allergens, waste tracking
- Mobile kitchen: `/kitchen/mobile` — dedicated mobile layout for on-site staff
- Prep lists auto-generate from event menus

### Staff scheduling
- `/scheduling` — availability, shifts, time-off requests, budgets
- `/staff` — performance, training, team management, timeclock

### Notifications
- Knock notification SDK (lazy-loaded in sidebar bell icon)
- Real-time chat via Ably (`/administrative/chat`)
- Email workflows via API (`/api/communications/email-workflows`)
- SMS automation rules (`/api/communications/sms/automation-rules`)

### Event lifecycle as a loop
1. Lead in CRM pipeline → scored → proposal sent (external link)
2. Contract signed (external) → event created → battle board activated
3. Kitchen receives prep lists → procurement generates POs → warehouse receives
4. Event executed → follow-ups created → reports generated (`/events/reports`)
5. Repeat client enters pipeline again

---

## Stage 8: Power User Features

- **Analytics:** `/analytics` — cross-module reporting
- **Budget management:** `/events/budgets`, `/procurement/budget`
- **Battle boards:** `/events/battle-boards` — event execution tracking (competitive/collaborative)
- **Recipe costing:** `/kitchen/recipes` with cost breakdowns (`recipe-costing-actions.ts`)
- **Cycle counting:** `/cycle-counting` — inventory audit cycles
- **AI Assistant:** Floating AI button on every authenticated page (`AiAssistantButton` + `AiAssistantPanel`)
- **Knowledge base:** `/knowledge-base` — internal documentation
- **Dev console:** `/dev-console` — audit logs, webhooks, constraint diagnostics, tenant management (admin only)
- **Data exports:** Event export button on event detail pages
- **Module settings:** Dynamic `/[module]/settings` for per-module configuration

---

## Journey Map Summary

```
Signup (Clerk)
  → Calendar (empty state)
    → First Event (template → form → create)
      → CRM Client + Proposal (external sharing)
        → Contract Signing (external token URL)
          → Event Execution
            → Kitchen / Procurement / Warehouse coordination
              → Event Reports + Follow-ups
                → Repeat client → CRM Pipeline (loop)
```

## Identified Gaps & Observations

1. **No explicit onboarding wizard** — new users land on an empty calendar with no guided setup flow
2. **No org creation UI found** — Clerk handles orgs, but the initial org creation flow isn't visible in the app code (likely Clerk's default)
3. **Team invite mechanism unclear** — settings/team shows members but no invite/send-invite UI was found in the scanned files
4. **Notification onboarding** — Knock notifications exist but no first-run notification preferences setup
5. **Empty states** — most modules show `ModuleLanding` placeholder when no data exists; first-time users need clearer CTAs
6. **Mobile-first gap** — mobile kitchen exists but other modules lack dedicated mobile layouts
7. **Retention is operation-driven** — users return because events demand daily action (prep lists, scheduling, procurement), not because of gamification or reminders
