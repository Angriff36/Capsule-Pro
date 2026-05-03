# Feature Specification: Marketing Module (Cohere-Aligned)

**Feature ID**: CAP-MARKETING-001
**Feature Branch**: `spec/marketing-001`
**Created**: 2026-05-02
**Status**: Draft
**Input**: User description: "Codify the marketing module — multi-channel campaigns (email, SMS), lead capture and nurturing, email template and workflow delegation, audience segmentation, performance analytics, SMS automation, and public-facing marketing website surfaces. Inherit the shell contract from specs/general/design-system-shell.md (§5.1). The current landing (apps/app/app/(authenticated)/marketing/page.tsx) scores 1/3 — it uses text-3xl font-bold, bare shadcn Cards, a legacy Header import, and a Coming Soon empty placeholder."

> **Why this spec exists.** Marketing bridges the public-facing website (`apps/web`) and the operational CRM (`/crm`). Meaningful Prisma infrastructure already exists — `Lead`, `ClientInteraction`, `email_templates`, `EmailWorkflow`, `sms_automation_rules` — and four API route families (`/api/lead/`, `/api/emailtemplate/`, `/api/emailworkflow/`, `/api/smsautomationrule/`). The landing page is a 1/3 placeholder: three bare `<Card>` tiles, a legacy `Header` import, `text-3xl font-bold` opener, and a "Coming Soon" `Empty` block. This spec codifies what a complete marketing module must satisfy, delegates email-template authoring to Settings (avoiding duplication with `specs/general/settings.md`), and declares the CRM segmentation boundary.

## Clarifications

- [NEEDS CLARIFICATION: Email templates and workflows are co-administered from Settings (`/settings/email-templates`, `/settings/email-workflows`) per `specs/general/settings.md`. This spec treats template authoring as a Settings concern and workflow activation as a Marketing concern. Confirm if product decision reverses this split.]
- [NEEDS CLARIFICATION: No `Campaign` Prisma model exists. Confirm whether campaigns are a new entity or tag-based groupings of existing `EmailWorkflow` + `sms_automation_rules` rows.]
- [NEEDS CLARIFICATION: `sms_automation_rules` trigger types are operational (task_assigned, shift_reminder) not marketing-blast oriented. Confirm whether SMS broadcast sends to leads/clients are in scope for v1 or deferred.]
- [NEEDS CLARIFICATION: Audience segmentation — confirm whether segment criteria are stored on a new `Segment` model or derived dynamically from `Lead.status` and `Client` filters. This spec assumes dynamic-query segmentation for v1.]

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Operator scans the marketing command center (Priority: P1)

A marketing coordinator or ops manager opens `/marketing` to assess active campaign health and the lead pipeline. Within 2 seconds of viewport load they must see:

1. **Operational temperature.** A `MetricBand` row surfaces 4–6 numbers: active campaigns, leads this month, lead-to-client conversion rate, average email open rate (last 30d), SMS rules active, follow-ups overdue.
2. **Navigation ladder.** An `OperationalColumn` links to four sub-surfaces: Campaigns, Leads, Email Workflows, SMS Rules.
3. **Primary action.** A `CommandBand` near-black pill "New campaign" — the single entry point for launching a multi-channel campaign.

**Why this priority**: The landing is the triage entry point, currently scored 1/3 in §2A of `IMPLEMENTATION_PLAN.md`. It blocks every downstream marketing flow.

**Independent Test**: Given a tenant with ≥ 5 leads and ≥ 1 active `EmailWorkflow`, a coordinator can read the lead pipeline temperature and navigate to the Leads list within 5 seconds, without scrolling, with zero `<Card>` openers or `text-3xl font-bold` occurrences on the page.

**Acceptance Scenarios**:

1. **Given** the coordinator opens `/marketing`, **When** the page renders, **Then** the shell composes `PageCanvas → CommandBand (primary "New campaign" pill, eyebrow="Operations / Marketing", DisplayHeading="Marketing") → MetricBand (active campaigns, leads this month, conversion rate, avg open rate, SMS rules active, follow-ups overdue) → OperationalColumn (Campaigns, Leads, Email Workflows, SMS Rules)`. Zero `text-3xl font-bold`, zero legacy `Header` import, zero bare `<Card>` opener, zero `bg-*-50/100/200` decoratives.
2. **Given** the coordinator clicks "Leads" in the operational column, **When** navigation completes, **Then** the operator lands on `/marketing/leads` with the leads list pre-loaded.
3. **Given** the tenant has zero campaigns and zero leads, **When** the page renders, **Then** the MetricBand shows `—` (em-dash) for rates and the OperationalColumn section links remain active — no full-page empty state obscures navigation.

---

### User Story 2 — Operator manages the lead pipeline (Priority: P1)

A sales coordinator opens `/marketing/leads` to triage inbound leads from catering inquiries. They must filter by status, assign a lead, log an interaction, convert to client, or disqualify — all from one list surface and its detail page.

**Why this priority**: Leads are the revenue top-of-funnel. The `Lead` Prisma model exists with full API command coverage (create, update, archive, convert-to-client, disqualify) but has no Cohere-aligned UI.

**Independent Test**: Given a tenant with ≥ 10 leads spanning ≥ 3 statuses, a coordinator can filter to `new`, open a lead detail, log a `ClientInteraction`, and assign the lead to themselves in under 3 minutes.

**Acceptance Scenarios**:

1. **Given** the coordinator opens `/marketing/leads`, **When** the page renders, **Then** the shell composes `PageCanvas → CommandBand (primary "New lead" pill) → MetricBand (total leads, new, contacted, qualified, converted this month, conversion rate) → BlogFilterChip cluster (status: new/contacted/qualified/converted/disqualified) → ResearchTable (contact name left, status pill center, estimated value + event date mono right)`. Zero `<Card>` per row.
2. **Given** the coordinator clicks a lead row, **When** the detail page (`/marketing/leads/[leadId]`) renders, **Then** the shell composes `PageCanvas → CommandBand (contact name as DisplayHeading, eyebrow="Operations / Marketing / Leads", primary "Convert to client" or "Disqualify" depending on status) → MetricBand (estimated value, estimated guests, event date, interaction count) → OperationalColumn (sections: Contact info, Event details, Interactions, Follow-ups)`.
3. **Given** the coordinator clicks "Convert to client", **When** `POST /api/lead/convert-to-client` succeeds, **Then** the lead `convertedToClientId` is populated, the status pill flips to `converted`, and a link to the new Client record appears in the OperationalColumn under "Converted account".
4. **Given** a lead is `disqualified`, **When** the list renders, **Then** the row uses `BlogFilterChip tone="ghost"` for the status pill and is de-emphasized visually but not removed from the list unless explicitly filtered out.

---

### User Story 3 — Operator activates and monitors an email workflow (Priority: P1)

A marketing coordinator opens `/marketing/email-workflows` to activate an event-confirmation workflow and review delivery statistics. Email-template authoring is delegated to `/settings/email-templates` and is not re-implemented here.

**Why this priority**: `EmailWorkflow` (with `email_trigger_type` covering event_confirmed, proposal_sent, contract_signed, etc.) is the primary operational automation surface. API routes exist but the UI is not Cohere-aligned.

**Independent Test**: Given a tenant with ≥ 1 active `EmailWorkflow` and a linked `email_templates` row, a coordinator can toggle the workflow on/off, inspect the last-triggered timestamp, and see delivery stats — all from `/marketing/email-workflows`.

**Acceptance Scenarios**:

1. **Given** the coordinator opens `/marketing/email-workflows`, **When** the page renders, **Then** the shell composes `PageCanvas → CommandBand (primary "New workflow" pill) → BlogFilterChip cluster (active / inactive) → ResearchTable (name left, trigger-type chip center, active/inactive pill + last-triggered mono right)`. Zero bare `<Card>` per row.
2. **Given** the coordinator clicks a workflow row, **When** the detail panel renders, **Then** a `ContactFormCard` shows: name, trigger type (email_trigger_type closed enum — 11 values), linked email template, recipient config, and an active/inactive toggle (`POST /api/emailworkflow/update`). A `MonoLabel "LAST TRIGGERED"` timestamp appears in the metadata row.
3. **Given** the coordinator clicks "New workflow", **When** the create form opens, **Then** the trigger-type picker uses `BlogFilterChip` for all 11 closed-enum values. A "Manage templates" text-link navigates to `/settings/email-templates` — the marketing surface does NOT re-host template authoring.
4. **Given** a workflow's linked `email_templates` row is soft-deleted, **When** the list renders, **Then** the workflow row surfaces a coral `MonoLabel "TEMPLATE MISSING"` annotation and the active/inactive toggle is disabled until a valid template is re-assigned.

---

### User Story 4 — Operator reviews campaign and automation analytics (Priority: P2)

A marketing manager opens `/marketing/analytics` to review open rates, click-through rates, lead-to-client conversion trend, and SMS delivery rates over 30 / 90 / 180 day windows.

**Why this priority**: Analytics close the marketing feedback loop. Without them, every send is fire-and-forget with no learning surface.

**Independent Test**: Given a tenant with ≥ 30 days of `EmailLog` and `Lead` history, a manager can see open rate, click rate, conversion rate, and SMS delivery rate on a single page load with no drill-downs required for the headline numbers.

**Acceptance Scenarios**:

1. **Given** the manager opens `/marketing/analytics`, **When** the page renders, **Then** the shell composes `PageCanvas → CommandBand (heading "Marketing analytics", eyebrow="Operations / Marketing") → BlogFilterChip cluster (date window: 30d / 90d / 180d) → MetricBand (total sent, open rate %, click rate %, conversion rate %, SMS delivery rate %, leads sourced) → OperationalColumn (sections: Email performance by workflow, Lead pipeline by source, SMS performance by rule)`.
2. **Given** the manager selects the `90d` chip, **When** the filter fires, **Then** the URL gains `?window=90d`, MetricBand values re-aggregate to the 90-day period, and section data updates without a full page reload.
3. **Given** a workflow has zero sends in the selected window, **When** the Email performance section renders that workflow row, **Then** the row shows `—` for open/click rates and a `MonoLabel "NO DATA"` pill — never `0.00%` (which implies success with zero engagement).

---

### User Story 5 — Operator configures SMS automation rules (Priority: P2)

An operations manager opens `/marketing/sms-rules` to configure which operational events trigger SMS notifications to employees or role-based recipients.

**Why this priority**: `sms_automation_rules` is modeled and has full API command coverage but has no aligned UI surface. SMS rules are high-leverage operational automations.

**Independent Test**: Given a tenant with ≥ 1 `sms_automation_rules` row, a manager can see the rule list, toggle a rule active state, and create a new rule with a custom message — without navigating away from `/marketing/sms-rules`.

**Acceptance Scenarios**:

1. **Given** the manager opens `/marketing/sms-rules`, **When** the page renders, **Then** the shell composes `PageCanvas → CommandBand (primary "New SMS rule" pill) → BlogFilterChip cluster (active / inactive) → ResearchTable (rule name left, trigger-type chip center, active/inactive pill + priority right)`.
2. **Given** the manager clicks "New SMS rule", **When** the create form opens, **Then** a `ContactFormCard` provides: name, trigger type (sms_automation_trigger_type closed enum — 11 values: task_assigned, task_completed, task_overdue, shift_assigned, shift_reminder, shift_changed, clock_in_reminder, clock_out_reminder, prep_list_published, inventory_low, custom_event), custom message or template reference, recipient type (employee / role_based), and priority (integer). Submit calls `POST /api/smsautomationrule/create`.
3. **Given** a rule is deactivated (`POST /api/smsautomationrule/deactivate`), **When** the list re-renders, **Then** the row status pill flips to `BlogFilterChip tone="ghost"` and the rule is de-emphasized while retaining its priority position.

---

### User Story 6 — Public-facing marketing website surfaces (Priority: P2)

A site visitor reaches `apps/web` — the three-zone marketing nav — and submits a catering inquiry that feeds into the operator Lead pipeline.

**Why this priority**: The public site is the top-of-funnel for lead capture. Getting the design primitives right determines whether the brand reads as polished or generic.

**Independent Test**: A prospective client opens the public homepage, identifies the three capability zones, submits an inquiry, and the submission creates a `Lead` row with `source="website"` visible in the operator `/marketing/leads` list.

**Acceptance Scenarios**:

1. **Given** a visitor opens the public homepage, **When** the page renders, **Then** the marketing three-zone nav composes exclusively from the 11 flagship design-system blocks (AnnouncementBar, HeroPhotoCard, CapabilityCard, ProductCard, DarkFeatureBand, ContactFormCard, FooterNewsletter, etc.). Zero raw shadcn `<Card>`, zero `bg-*-50/100/200` pastels, zero `shadow-(sm|md|lg|xl|2xl)`.
2. **Given** a visitor fills and submits the `ContactFormCard`, **When** the form posts, **Then** a `Lead` row is created with `source="website"` and is visible in `/marketing/leads` within one refresh cycle.
3. **Given** a visitor lands on a public capability page (e.g. `/catering/corporate`), **When** the page renders, **Then** it uses `CapabilityCard` from `packages/design-system/components/blocks/capability-card.tsx` — never a bespoke card with inline styling.

---

### Edge Cases

- **What happens when a Lead is converted but the Client record creation fails?** The `convert-to-client` command must be atomic. If Client creation fails, the Lead remains `qualified` with an error Toast surfacing the rejection reason verbatim.
- **What happens when an EmailWorkflow fires but its linked `email_templates` row is soft-deleted?** The workflow MUST skip delivery, write an `EmailLog` row with `status='failed'` and `errorMessage="template_unavailable"`, and surface a coral `MonoLabel "TEMPLATE MISSING"` annotation on the workflow row.
- **What happens when campaign analytics are unavailable** (no `EmailLog` data, new tenant)? MetricBand cells render `—` and each analytics section shows the soft-stone empty-state tile: "No data yet — activate a workflow to begin tracking."
- **What happens when the public contact form submits with an email matching an existing `Client.email`?** Create the `Lead` regardless and surface a `MonoLabel "POSSIBLE DUPLICATE"` annotation on the new lead row.
- **What happens when an SMS rule has priority conflicts** (two rules with the same value for the same `trigger_type`)? The API breaks ties by `created_at ASC`. The UI annotates conflicting rows with `MonoLabel "PRIORITY CONFLICT"` in coral tone. [NEEDS CLARIFICATION: confirm server-side collision detection scope for v1.]
- **What happens when the coordinator opens `/marketing` in dark mode** (per §5.1 User Story 5)? Sidebar and topbar flip dark; the marketing content area stays on canvas via `editorial-surface-reset`.

## Requirements *(mandatory)*

### Functional Requirements

#### FR-1xx — Composition (inherits §5.1 design-system-shell)

- **FR-101**: Every `/marketing/*` module landing MUST compose `PageCanvas → CommandBand → MetricBand → OperationalColumn` (or delegate to `ModuleLanding`). The current `text-3xl font-bold` opener, legacy `Header` import, and bare `<Card>` tiles in `marketing/page.tsx` MUST be replaced. Cites §5.1 FR-101 / FR-201 / FR-204.
- **FR-102**: `/marketing/leads` MUST compose `PageCanvas → CommandBand → MetricBand → BlogFilterChip cluster → ResearchTable`. Each lead row is a `ResearchTable` entry — never a `<Card>` per row. Cites §5.1 FR-102.
- **FR-103**: `/marketing/leads/[leadId]` MUST compose `PageCanvas → CommandBand (DisplayHeading = contact name, eyebrow taxonomy) → MetricBand → OperationalColumn`. All create/edit forms use `ContactFormCard`. Cites §5.1 FR-103.
- **FR-104**: `/marketing/email-workflows` and `/marketing/sms-rules` MUST use `ResearchTable` for list surfaces. Status and trigger-type filters use `BlogFilterChip`. Cites §5.1 FR-102 / FR-104.
- **FR-105**: Empty states on every `/marketing/**` sub-route MUST use the soft-stone tile: `bg-soft-stone px-6 py-16 rounded-[22px]`, central icon, heading, body, pill primary CTA. Cites §5.1 FR-105.
- **FR-106**: `DarkFeatureBand` and `NavyFeatureBand` are reserved for `apps/web` public surfaces. The authenticated `/marketing/*` shell MUST NOT hand-author dark hero bands inline. Cites §5.1 FR-106.

#### FR-2xx — Forbidden patterns (inherits §5.1 FR-2xx)

- **FR-201**: No file under `/marketing/**` MUST contain `text-3xl font-bold` or `text-4xl font-bold`. Current violation: `apps/app/app/(authenticated)/marketing/page.tsx:34`. Cites §5.1 FR-201.
- **FR-202**: No file MUST contain `shadow-(sm|md|lg|xl|2xl)` on non-overlay surfaces. Cites §5.1 FR-202.
- **FR-203**: No file MUST contain decorative pastel `bg-*-(50|100|200)` surfaces. Cites §5.1 FR-203.
- **FR-204**: No file MUST contain a bare shadcn `<Card>` opener without a `tone` prop. Current violations: 3 bare `<Card>` tiles at `marketing/page.tsx:56-96`. Cites §5.1 FR-204.
- **FR-205**: No file MUST import `next/link`, `next/dynamic`, or `next/server` from a path inside `packages/`. Cites §5.1 FR-207.
- **FR-206**: The legacy `Header` import (`import { Header } from "../components/header"`) MUST be removed from `marketing/page.tsx`. Any residual `Header` import demotes the landing to 2/3. Cites §5.1 FR-501.

#### FR-3xx — Token and governance rules (inherits §5.1 FR-3xx)

- **FR-301**: Radius MUST consume the DESIGN.md scale exclusively (`rounded-xs` through `rounded-full`). Cites §5.1 FR-301.
- **FR-302**: Color MUST consume `--ds-*` tokens. No hardcoded hex colors in app-level files. Cites §5.1 FR-303.
- **FR-303**: Typography MUST consume the `ds-*` utility scale plus `MonoLabel` for mono-uppercase eyebrows. Cites §5.1 FR-304.
- **FR-304**: Lead status pills MUST use the canonical taxonomy: `new` (action-blue), `contacted` (slate), `qualified` (deep-green), `converted` (green-600), `disqualified` (slate ghost). Use `BlogFilterChip` for filters, `StatusPill` from page-shell for inline status — never raw shadcn `<Badge>`.

#### FR-4xx — Campaigns

- **FR-401**: A "campaign" in v1 is a named grouping of one or more `EmailWorkflow` or `sms_automation_rules` rows sharing a common `campaignTag` metadata field. [NEEDS CLARIFICATION: confirm whether a dedicated `Campaign` Prisma model is required for v1 or whether tag-based grouping is acceptable.] If a `Campaign` model is introduced, it MUST follow `CLAUDE.md` database hard rules — migration via `pnpm db:dev --create-only --name campaign`, RLS enabled, schema `tenant_admin`.
- **FR-402**: Campaign creation MUST be a `ContactFormCard` panel with: campaign name, channel selector (Email / SMS / Multi-channel), start date, audience definition (dynamic `Lead`/`Client` query filter), and associated workflow / rule picker.
- **FR-403**: Campaign scheduling is in scope for v1 only if the API layer supports a time-based trigger. [NEEDS CLARIFICATION: `EmailWorkflow.triggerType` is event-driven. Confirm whether a `broadcast` trigger type must be added to `email_trigger_type` for true scheduled sends.]
- **FR-404**: Campaign analytics MUST be derived from `EmailLog` rows filtered by campaign tag. No separate analytics model required for v1.

#### FR-5xx — Leads and CRM integration

- **FR-501**: The `Lead` entity is the canonical top-of-funnel model. Lead sources are a closed enum: `website` (public contact form), `manual` (operator-entered), `import` (CSV upload). Source is immutable after creation.
- **FR-502**: Lead status transitions MUST follow the closed lifecycle: `new → contacted → qualified → converted | disqualified`. Only permitted backward transition: `disqualified → new`. Status changes MUST route through dedicated commands — no free-text status dropdown.
- **FR-503**: `ClientInteraction` rows MUST be creatable from `/marketing/leads/[leadId]`. Each interaction records `interactionType`, `interactionDate`, `subject`, `description`, `followUpDate`, `followUpCompleted`. The interaction list renders as `ResearchTable` within the OperationalColumn.
- **FR-504**: Audience segmentation cross-over (per §4.22 reference): segment definitions used for campaign targeting MUST be composable from `Lead` and `Client` query filters. Segments are evaluated dynamically for v1 — no persisted `Segment` rows required.
- **FR-505**: Public contact form submission (`source="website"`) MUST be rate-limited via `RateLimitConfig`. The endpoint is infrastructure-allowlisted (comparable to webhook ingestion per `AGENTS.md`) and does NOT require operator authentication.

#### FR-6xx — Analytics

- **FR-601**: Analytics data MUST derive from existing models: `EmailLog` (email delivery + open tracking), `Lead` (conversion metrics), `ClientInteraction` (engagement cadence), `sms_logs` (SMS delivery). No new analytics model introduced for v1.
- **FR-602**: Open rate = `EmailLog` rows with `status='opened'` / total sent, per workflow, per selected window. Delivery rate = rows without `status='bounced'` / total sent. Computed server-side per `GET /api/marketing/analytics?window=30d`. [NEEDS CLARIFICATION: `/api/marketing/analytics` does not yet exist — confirm whether to author it under the marketing module or aggregate from existing email/lead APIs.]
- **FR-603**: Conversion rate = `Lead` rows with `status='converted'` AND `convertedAt` in window / total leads created in window. Surfaced in MetricBand as a percentage.
- **FR-604**: Analytics aggregations MUST run server-side. The analytics page MUST NOT pull raw log rows to the client and aggregate in JavaScript — row counts can exceed 100k on busy tenants.

#### FR-7xx — Public-facing marketing (apps/web)

- **FR-701**: The public marketing site (`apps/web`) MUST compose the three-zone marketing nav exclusively from the 11 flagship design-system blocks in `packages/design-system/components/blocks/`. No bespoke card layouts.
- **FR-702**: Public contact form submission MUST create a `Lead` row with `source="website"` via the infrastructure-allowlisted endpoint. Rate limiting via `RateLimitConfig` is REQUIRED per FR-505.
- **FR-703**: `ProductCard`, `CapabilityCard`, `HeroPhotoCard` are the ONLY card primitives allowed on public-facing marketing pages. Raw shadcn `<Card>` is forbidden.
- **FR-704**: `BlogFilterChip` taxonomy on public pages MUST use the same `--ds-coral` token as the authenticated shell — brand consistency across both surfaces.

### Key Entities

- **Lead** (Prisma, `tenant_crm`): `{ id, tenantId, source (immutable), companyName, contactName, contactEmail, contactPhone, eventType, eventDate, estimatedGuests, estimatedValue, status, assignedTo, notes, convertedToClientId, ... }`. Top-of-funnel entity.
- **ClientInteraction** (Prisma, `tenant_crm`): `{ id, tenantId, clientId, leadId, employeeId, interactionType, interactionDate, subject, description, followUpDate, followUpCompleted, ... }`. N:1 to Lead or Client.
- **email_templates** (Prisma, `tenant_admin.email_templates`): `{ id, tenantId, name, template_type (proposal|confirmation|reminder|follow_up|contract|contact|custom), subject, body, merge_fields, is_active, is_default, ... }`. Authored in `/settings/email-templates`; referenced read-only from marketing.
- **EmailWorkflow** (Prisma, `tenant_admin.email_workflows`): `{ id, tenantId, name, triggerType (email_trigger_type — 11 values), triggerConfig, emailTemplateId, recipientConfig, isActive, lastTriggeredAt, ... }`. Activated and monitored from `/marketing/email-workflows`.
- **sms_automation_rules** (Prisma, `tenant_admin.sms_automation_rules`): `{ id, tenantId, name, description, trigger_type (sms_automation_trigger_type — 11 values), trigger_config, template_id, custom_message, recipient_type (employee|role_based), recipient_config, is_active, priority, ... }`. Configured from `/marketing/sms-rules`.
- **EmailLog** (Prisma, `tenant_admin`): `{ id, tenantId, workflowId, recipientEmail, status (sent|opened|clicked|bounced|failed), sentAt, openedAt, ... }`. Source for email analytics; read-only in UI.
- **Campaign** (DEFERRED — see FR-401): No Prisma model in v1. Campaigns are tag-based groupings of `EmailWorkflow` + `sms_automation_rules` rows unless the product decision resolves to a dedicated entity.

### Cross-references

- `specs/general/design-system-shell.md` — §5.1 design contract; this spec inherits FR-101..106, FR-201..207, FR-301..304.
- `specs/general/settings.md` — email templates and workflows are co-administered from Settings. This spec defers template authoring to Settings and cross-links the activation surface only.
- `specs/events/SPEC.md` — `Lead.eventType` and `Lead.eventDate` map to the events taxonomy; a converted lead seeds an Event via the CRM handoff (§5.2 FR-301).
- `IMPLEMENTATION_PLAN.md` §2A (marketing/page.tsx scored 1/3), §2A.4 (marketing landing remediation target), §5.3 (this spec entry).
- `AGENTS.md` — package boundary rules, validation commands, cron registry (`cron/email-reminders` is currently missing from `vercel.json` — must be added in the PR that ships analytics-triggered follow-up reminders).
- `packages/database/prisma/schema.prisma` — `Lead` (line 853), `ClientInteraction` (882), `email_templates` (3149), `EmailWorkflow` (4931), `sms_automation_rules` (3096), `EmailLog` (4956).
- `apps/api/app/api/lead/` — create, update, archive, convert-to-client, disqualify commands.
- `apps/api/app/api/emailtemplate/` — create, update, soft-delete commands.
- `apps/api/app/api/emailworkflow/` — create, update, soft-delete commands.
- `apps/api/app/api/smsautomationrule/` — activate, create, deactivate, soft-delete, update commands.

### Out of scope

- **Campaign Prisma model (v1)** — DEFERRED (see FR-401). Tag-based grouping is the v1 approach; a dedicated entity is a v2 decision pending product clarification.
- **Broadcast / scheduled email blasts** — `EmailWorkflow.triggerType` is event-driven. Scheduled broadcasts require a new trigger type and cron job. Out of scope for v1.
- **A/B testing / multivariate campaigns** — no split-test infrastructure. Out of scope.
- **Social media campaign management** — no Prisma model or API route exists. Out of scope for v1.
- **Email template authoring UI in Marketing** — template authoring lives in `/settings/email-templates`. Marketing references templates by ID only.
- **Click-redirect tracking** — `EmailLog` tracks delivery and opens only. Click tracking requires a redirect endpoint and new table. Out of scope for v1.
- **In-app / push-notification channel** — no mobile push spec. Marketing ships email + SMS only.
- **Cross-tenant audience sharing** — tenant isolation enforced by RLS; segments are tenant-scoped.
- **Mobile-app marketing surface** — separate spec per §4.28.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `/marketing/page.tsx` scores 3/3 against §5.1 FR-501 after remediation — zero `text-3xl font-bold`, zero bare `<Card>`, zero legacy `Header` import, zero `bg-*-50/100/200` decoratives. Current baseline: 1/3.
- **SC-002**: Lead pipeline — operator can move a lead from `new` to `converted` (create interaction, update status, convert-to-client) in under 3 minutes on a tenant with ≥ 20 leads. Verified by Playwright E2E timing under `e2e/workflows/marketing-lead-capture.workflow.spec.ts` (to be authored).
- **SC-003**: Email workflow list renders at `/marketing/email-workflows` within 2 seconds (p95 Lighthouse LCP) for a tenant with ≤ 50 `EmailWorkflow` rows.
- **SC-004**: `GET /api/marketing/analytics?window=30d` returns in < 500ms p95 for a tenant with ≤ 10,000 `EmailLog` rows and ≤ 1,000 leads. Baseline measurable once route is authored.
- **SC-005**: Public contact form submission creates a `Lead` row with `source="website"` visible in `/marketing/leads` within one page refresh. Verified by E2E test.
- **SC-006**: Lead conversion rate in MetricBand matches a direct `Lead` table count query within ±0 (no rounding divergence). Verified by API integration test.
- **SC-007**: SMS rules create form renders all 11 `sms_automation_trigger_type` closed-enum values with no unlisted options. Verified by snapshot test.
- **SC-008**: §3.6 / §3.7 / §3.8 / §3.11 / §3.12 cross-cutting counts on `apps/app/app/(authenticated)/marketing/**` drop to zero after the module shell remediation. Measured by the same `rg -c` sweep used for other modules in §3 of `IMPLEMENTATION_PLAN.md`.
- **SC-009**: `pnpm --filter app typecheck` and `pnpm --filter api typecheck` pass with zero new errors after the marketing shell re-author (FR-101..FR-206 compliance).
- **SC-010**: `cron/email-reminders` is added to `apps/api/vercel.json` in the same PR that ships analytics-triggered follow-up reminders, per the AGENTS.md Cron Schedule Registry "missing" list. Without this entry, follow-up reminders never fire in production.

---

## Reference

- `DESIGN.md` (root) — color, typography, radius, spacing, component tokens; the `--ds-*` surface consumed by every FR-3xx rule in this spec.
- Design-system primitives used by this module: `PageCanvas`, `CommandBand`, `DisplayHeading`, `MonoLabel`, `MetricBand`, `OperationalColumn`, `ResearchTable`, `BlogFilterChip`, `ProductCard`, `CapabilityCard`, `ContactFormCard`, `HeroPhotoCard`, `DarkFeatureBand` (public web only), `NavyFeatureBand` (public web only).
- `packages/design-system/components/blocks/` — exports for all primitives listed above.
- `IMPLEMENTATION_PLAN.md` §2A.4 — marketing landing remediation target; this spec is the rubric for that pass.
