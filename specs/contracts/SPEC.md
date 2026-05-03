# Feature Specification: Contracts Module (Cohere-Aligned)

**Feature ID**: CAP-CONTRACTS-001
**Feature Branch**: `spec/contracts-001`
**Created**: 2026-05-02
**Status**: Draft
**Input**: Standalone contracts module aggregating EventContract + VendorContract with e-signature flow, compliance tracking, and renewal/expiration lifecycle.

> **Why this spec exists.** The contracts surface has two competing entry points: `/contracts` (top-level redirect per IMPLEMENTATION_PLAN §2A.12) and `/events/contracts` (the actual landing, currently 1/3 by the design-system-shell rubric — it uses a legacy `Header` import, `text-3xl font-bold` opener, and raw `Alert` components rather than Cohere primitives). VendorContract is a separate Prisma model in `tenant_inventory` with its own 10-command surface (`apps/api/app/api/procurement/vendor-contracts/`) and zero UI entry point. Neither surface has a codified spec. This document is that anchor — it makes the architectural decision (see Clarifications below), defines the composition contract, and locks the lifecycle taxonomy so subsequent passes can score every contracts page against an explicit rubric.

## Clarifications

**Redirect-vs-standalone architectural decision: Standalone module at `/contracts`.**

Rationale: EventContract and VendorContract are distinct entities in separate Prisma schemas (`tenant_events` vs `tenant_inventory`) but share operational semantics — status lifecycle (draft/sent/signed/active/expired/terminated), e-signature mechanics, and compliance/expiration tracking. An operator seeking "our signed venue contract" should not need to know whether it lives under events or procurement. The standalone `/contracts` module is the aggregated cross-domain view; `/events/[eventId]/contracts` remains the per-event scoped sub-tab (per `specs/events/SPEC.md` User Story 7.1). The top-level `/contracts/page.tsx` redirect (currently `redirect("/events/contracts")`) becomes a real module landing once this spec is implemented.

**[NEEDS CLARIFICATION: VendorContract has no `signingToken` field (EventContract has one). Does vendor contract e-signature use a separate signing flow, or are vendor contracts signed out-of-band with only `contractUrl` attached?]**

**[NEEDS CLARIFICATION: Should the `/contracts` landing aggregate EventContract + VendorContract in a single ResearchTable (type-pill differentiating them), or use two separate tab-switched OperationalColumn sections?]**

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Operator scans all contracts (Priority: P1)

An operator (sales lead, admin, compliance reviewer) opens `/contracts` to triage the full contract portfolio across events and vendors in one view.

**Why this priority**: The redirect at `/contracts` crashes on deep URLs (only the exact `/contracts` URL redirects; `/contracts/[id]` 404s). The events/contracts landing is 1/3. Before any other contracts work, the landing must satisfy the Cohere shell contract and resolve the deep-link gap.

**Independent Test**: Given a tenant with ≥ 5 EventContracts (mixed statuses) and ≥ 3 VendorContracts (mixed statuses), an operator can identify (a) overdue/expiring contracts, (b) unsigned contracts, (c) active vendor contracts with compliance warnings — all within 2 seconds of viewport load, without scrolling, with zero `<Card>` per row and zero `text-3xl font-bold`.

**Acceptance Scenarios**:

1. **Given** the operator opens `/contracts`, **When** the page renders, **Then** the shell composes `PageCanvas → CommandBand (heading "Contracts", eyebrow="Operations / Contracts", primary "New contract" pill, secondary "Export" text-link) → MetricBand (total active, awaiting signature, expiring within 30 days, vendor compliance average) → BlogFilterChip cluster (draft / sent / signed / active / expired / terminated) → ResearchTable` with no `<Card>` per row, no `text-3xl font-bold`, no `bg-*-50/100/200` decoratives, no legacy `Header` import.
2. **Given** the operator filters by `sent` (awaiting signature), **When** the chip toggles, **Then** the ResearchTable re-renders showing only contracts in `sent` status; the MetricBand "awaiting signature" cell highlights; the URL gains `?status=sent`.
3. **Given** the operator clicks a contract row, **When** navigation completes, **Then** they land on `/contracts/[contractId]` (User Story 2) with the contract title pre-populated in the `DisplayHeading`.

---

### User Story 2 — Operator views a contract detail (Priority: P1)

The operator opens `/contracts/[contractId]` to inspect metadata, signatures, milestones, and available actions.

**Why this priority**: The existing `/events/contracts/[contractId]/page.tsx` uses a legacy `Header` import and delegates to `ContractDetailClient` without Cohere primitives. The detail view is the surface operators spend the most time on.

**Independent Test**: Given an EventContract in `sent` status with one `ContractSignature` row, an operator landing on the detail page can see headline metadata (title, event, client, status), the signature timeline, expiration countdown, and available actions — all without `<Card>` wrappers, scoring 3/3 on the design-system-shell rubric.

**Acceptance Scenarios**:

1. **Given** the operator opens `/contracts/[contractId]` for an EventContract, **When** the page renders, **Then** the shell composes `PageCanvas → CommandBand (contract title as DisplayHeading, eyebrow="Operations / Contracts / <contractNumber>", lede=event-name + client + expires-at, primary action per status, ≥1 secondary action) → MetricBand (status, signatures collected, days until expiry, document type) → OperationalColumn (sections: Signatures, Milestones, Event Details, Document, Notes)`.
2. **Given** the EventContract has `ContractSignature` rows, **When** the Signatures section renders, **Then** each signature appears as a `ResearchTable` row: signer name left, `MonoLabel` signed-at mono-date right — no raw `<ul>`.
3. **Given** the contract is a VendorContract with `complianceScore < 80`, **When** the detail renders, **Then** the MetricBand compliance cell shows a warning-coral `StatusPill` and `slaBreachCount` appears as a `MonoLabel` below the score.
4. **Given** the operator clicks "Send for signature", **When** the command fires, **Then** `POST /api/events/contracts/commands/send` executes, the status transitions `draft → sent`, and confirmation is verified via the detail re-fetch (not the command response — per AGENTS.md Critical Write Validation).

---

### User Story 3 — Client signs a contract (public surface) (Priority: P1)

A client (non-authenticated, external) receives an email link to `/sign/[signingToken]` and completes the e-signature flow on a surface separate from the authenticated shell.

**Why this priority**: Contract signature is the revenue-capture event in the catering workflow. A broken or missing public signing surface forces operators to use paper contracts, defeating the module's core purpose. `EventContract.signingToken` exists in the schema but the public route is not yet confirmed in the codebase.

**Independent Test**: Given an EventContract in `sent` status with a `signingToken`, a public user opening `/sign/[signingToken]` sees the contract title, client name, event details, and a signature pad — all without authentication. After submitting, a `ContractSignature` row is created and the contract status transitions to `signed`.

**Acceptance Scenarios**:

1. **Given** a client opens `/sign/[signingToken]` for a valid unsigned contract, **When** the page renders, **Then** the surface uses `ContactFormCard` (22px radius, white canvas, 32px padding) containing: contract title, event name + date, client name, contract body, and a signature pad. The authenticated sidebar does NOT render. Status is `sent`.
2. **Given** the client completes the signature and clicks "Sign contract", **When** submit fires, **Then** `POST /api/events/contracts/commands/sign` executes with `{ signingToken, signatureData, signerName, signerEmail, ipAddress }`, a `ContractSignature` row is created, and the page transitions to a confirmation `ContactFormCard` with `DisplayHeading` "Signed" and no further actions.
3. **Given** the client opens `/sign/[signingToken]` for an already-signed contract, **When** the page renders, **Then** a `MonoLabel` "ALREADY SIGNED" eyebrow appears, the signature pad is replaced with the existing signature summary, and no submit action is available.
4. **Given** the client opens `/sign/[signingToken]` for an expired contract (`expiresAt < now`), **When** the page renders, **Then** a warning-coral banner reads "This contract has expired. Please contact your coordinator to request a renewed contract." No signing form renders.

---

### User Story 4 — Operator monitors expiring and compliance-at-risk contracts (Priority: P2)

The operator uses the `/contracts` landing to identify contracts approaching expiration or VendorContracts with declining compliance scores without opening each contract individually.

**Why this priority**: `cron/contract-expiration-alerts` is currently missing from `apps/api/vercel.json` (per AGENTS.md Cron Schedule Registry). Until it is scheduled, operators must manually scan. The MetricBand and expiration filter chip close this gap for daily ops.

**Independent Test**: Given 2 contracts expiring within 7 days and 1 VendorContract with `complianceScore < 60`, the MetricBand "expiring within 30 days" cell shows count ≥ 2, and the `expiring-soon` chip filters to those rows highlighted with a warning-coral `StatusPill`.

**Acceptance Scenarios**:

1. **Given** the operator selects the `expiring-soon` filter chip, **When** the ResearchTable re-renders, **Then** every row shows a `MonoLabel` countdown ("expires in 5 days") in the date-right column, sorted ascending by `expiresAt`.
2. **Given** a VendorContract row has `complianceScore < 80`, **When** the row renders, **Then** its status pill is warning-coral regardless of the lifecycle `status` field — compliance risk overrides lifecycle status for triage.
3. **Given** the operator clicks "Renew" on an expiring VendorContract, **When** the command fires, **Then** `POST /api/procurement/vendor-contracts/commands/renew` executes; a new VendorContract row is created with `startDate = old.endDate + 1 day` and `status = "draft"`; the original row transitions to `expired`.

---

### User Story 5 — Operator records SLA breach on a VendorContract (Priority: P2)

The operator records an SLA breach and triggers a compliance review from the VendorContract detail view.

**Why this priority**: The `record-sla-breach` and `update-compliance` commands exist in the manifest (per AGENTS.md) but have no documented UI surface. Without this, `slaBreachCount`, `complianceScore`, `onTimeDeliveryRate`, and `qualityRating` grow stale.

**Independent Test**: Given a VendorContract in `active` status, the operator records an SLA breach and sees `slaBreachCount` increment in the MetricBand. They then update `complianceScore` directly and see it update in the same view — both confirmed via the read API.

**Acceptance Scenarios**:

1. **Given** the operator opens a VendorContract detail, **When** the compliance section renders, **Then** the `OperationalColumn` compliance section shows `MonoLabel` rows for `complianceScore`, `slaBreachCount`, `onTimeDeliveryRate`, `qualityRating`, and `lastComplianceReview` — no raw `<dl>` or `<Card>`.
2. **Given** the operator clicks "Record SLA breach" and submits a reason via Dialog, **When** the command fires, **Then** `POST /api/procurement/vendor-contracts/commands/record-sla-breach` executes with `{ contractId, breachReason, breachedAt }`, `slaBreachCount` increments, and a warning-coral `StatusPill` appears if `complianceScore` drops below 80.

---

### Edge Cases

- **What if `signingToken` is submitted twice concurrently?** The sign command MUST be idempotent on `signingToken` — the second submit receives `409 already_signed` and does NOT create a duplicate `ContractSignature` row.
- **What if an EventContract's parent Event was soft-deleted?** The contract row remains visible (`EventContract.deletedAt IS NULL`); the detail page renders with a `MonoLabel` "EVENT DELETED" in coral on the event row — not a 404.
- **What if `cron/contract-expiration-alerts` fires on a `terminated` contract?** The cron MUST skip contracts with `status IN ('signed', 'cancelled', 'terminated')`. Only `draft`, `sent`, and `active` contracts are candidates.
- **What if a VendorContract has `autoRenew = true` and `endDate` is within `noticeDaysBeforeRenewal` days?** The landing list row MUST show an `autoRenewPending` `MonoLabel` badge distinct from the standard expiring-soon warning-coral pill.
- **What if the operator navigates to `/contracts/[contractId]` directly (deep URL)?** The module MUST serve the detail page — not 404. The current redirect-only implementation at `apps/app/app/(authenticated)/contracts/page.tsx` does not handle deep URLs; this gap is closed by FR-102.

---

## Requirements *(mandatory)*

### Functional Requirements

#### FR-1xx — Composition (inherits design-system-shell §5.1)

- **FR-101**: `/contracts/page.tsx` (module landing) MUST compose `PageCanvas → CommandBand → MetricBand → BlogFilterChip cluster → ResearchTable` with zero legacy `Header` import, zero `text-3xl font-bold`, zero `bg-*-50/100/200` decoratives, zero `shadow-*`, zero bare `<Card>`. Inherits §5.1 FR-101.
- **FR-102**: `/contracts/[contractId]/page.tsx` MUST compose `PageCanvas → CommandBand (contract title as DisplayHeading, eyebrow="Operations / Contracts / <contractNumber>", lede=entity-name + type + expires-at) → MetricBand (≥3 cells) → OperationalColumn` per User Story 2. The current redirect-only implementation does NOT handle `/contracts/[contractId]` — this gap MUST be closed. Inherits §5.1 FR-101.
- **FR-103**: Every create/edit form panel MUST use `ContactFormCard` per §5.1 FR-103. The public signing surface (`/sign/[signingToken]`) MUST also use `ContactFormCard` for its outer container.
- **FR-104**: Every taxonomy filter MUST use `BlogFilterChip` per §5.1 FR-104. The status filter cluster MUST render exactly the lifecycle chips defined in FR-401 (EventContract) and FR-402 (VendorContract).
- **FR-105**: Empty state (no contracts yet) MUST use the soft-stone tile contract per §5.1 FR-105 with "New contract" as the pill primary CTA.
- **FR-106**: The `/contracts/[contractId]` detail page MUST inherit the eyebrow taxonomy `Operations / Contracts / <contractNumber>`. Breadcrumb-back is the eyebrow link to `/contracts` — no separate "back" button.

#### FR-2xx — Data (inherits §5.1 FR-2xx)

- **FR-201**: No contracts page MUST contain `text-3xl font-bold` (use `DisplayHeading`). Inherits §5.1 FR-201.
- **FR-202**: No contracts page MUST contain `shadow-(sm|md|lg|xl|2xl)` on non-overlay surfaces. Inherits §5.1 FR-202.
- **FR-203**: No contracts page MUST contain `bg-*-(50|100|200)` decorative pastels. Inherits §5.1 FR-203.
- **FR-204**: No contracts page MUST render a contract row as a bare `<Card>`. Rows are `ResearchTable` entries. Inherits §5.1 FR-204.
- **FR-205**: No contracts page MUST import `next/link` from a `packages/` path. Inherits §5.1 FR-207.
- **FR-206**: The existing `/events/contracts/page.tsx` raw SQL fetch (`$queryRaw`) MUST be replaced with `database.eventContract.findMany()` ORM call before this spec is satisfied. Raw SQL bypasses Prisma-enforced RLS on `tenant_events`.
- **FR-207**: Status transitions MUST NOT be driven by a free-text dropdown. Each transition fires a dedicated manifest command (see FR-402 and FR-403).

#### FR-3xx — Governance (inherits §5.1 FR-3xx)

- **FR-301**: Radius, spacing, color, and typography MUST consume the `--ds-*` token surface per §5.1 FR-301..304.
- **FR-302**: Every contracts write command MUST be discoverable in `packages/manifest-ir/dist/routes.manifest.json`. The 8 EventContract commands (`cancel`, `create`, `expire`, `mark-viewed`, `send`, `sign`, `soft-delete`, `update`) and the 10 VendorContract commands (`activate`, `approve`, `create`, `record-sla-breach`, `reject`, `renew`, `submit`, `terminate`, `update`, `update-compliance`) MUST all be in the manifest IR.
- **FR-303**: Every contracts write MUST persist through a PrismaStore-backed command per AGENTS.md "Critical Write Validation". Any write confirmed only via command response payload — not re-read from the list/detail API — is incorrect.
- **FR-304**: Cross-tenant scoping is enforced by Postgres RLS on `tenant_events.event_contracts`, `tenant_events.contract_signatures`, and `tenant_inventory.vendor_contracts`. Raw SQL used in any contract route MUST include `WHERE tenant_id = ${tenantId}` at minimum.

#### FR-4xx — Lifecycle (status taxonomy)

- **FR-401**: The canonical status taxonomy for **EventContract** is exactly: `draft` (slate), `sent` (action-blue), `signed` (green-600), `expired` (warning-coral), `cancelled` (slate strike-through). Use `StatusPill` for inline display, `BlogFilterChip` for filters. No other status values are permitted.
- **FR-402**: The canonical status taxonomy for **VendorContract** is exactly: `draft` (slate), `submitted` (action-blue), `approved` (action-blue lighter), `active` (green-600), `expired` (warning-coral), `terminated` (slate strike-through). Rejected contracts return to `draft` via the `reject` command.
- **FR-403**: Status transitions MUST fire the corresponding manifest command. EventContract: `draft → sent` via `send`; `sent → signed` via `sign`; `any → cancelled` via `cancel`; `any → expired` via `expire`. VendorContract: `draft → submitted` via `submit`; `submitted → approved` via `approve`; `submitted → draft` via `reject`; `approved → active` via `activate`; `active → terminated` via `terminate`; `active|expired → draft` via `renew`.
- **FR-404**: Contracts within 30 days of `expiresAt` (EventContract) or `endDate` (VendorContract) MUST show a warning-coral `MonoLabel` countdown on both the landing list row and the detail MetricBand.

#### FR-5xx — E-signature flow

- **FR-501**: The public signing surface MUST live at `/sign/[signingToken]` outside the `(authenticated)` route group. It MUST NOT render `GlobalSidebar`, topbar, or any authenticated chrome.
- **FR-502**: The sign form MUST capture `signerName` (required), `signerEmail` (optional), `signatureData` (required — canvas drawing or typed name), and `ipAddress` (captured server-side). All four fields MUST be stored on `ContractSignature`.
- **FR-503**: `signingToken` is `@unique` in the schema. The sign command MUST reject a second submission with `409 already_signed`. The signing surface MUST handle this rejection with the "already signed" state (User Story 3, Scenario 3).
- **FR-504**: After a successful signature, the operator receives a `Notification` entity record that the contract was signed. Client confirmation email is out of scope — owned by email workflow surface.
- **FR-505**: **[NEEDS CLARIFICATION: VendorContract has no `signingToken` field. Until resolved, VendorContract e-signature is out of scope. VendorContracts are assumed signed out-of-band and attached via `contractUrl`.]**

#### FR-6xx — Renewal and expiration alerts

- **FR-601**: `cron/contract-expiration-alerts` MUST be added to `apps/api/vercel.json` before this module is considered production-complete. This is a documented missing entry per AGENTS.md Cron Schedule Registry. **Hard dependency — the alert system does not fire in production without this entry.**
- **FR-602**: The expiration cron MUST query contracts with `expiresAt BETWEEN now() AND now() + interval '30 days'` AND `status NOT IN ('signed', 'cancelled', 'terminated')` and emit a `Notification` for the tenant's assigned operator.
- **FR-603**: VendorContracts with `autoRenew = true` where `endDate` is within `noticeDaysBeforeRenewal` days MUST show an `autoRenewPending` flag on the landing list row, distinct from the standard expiration warning.
- **FR-604**: Renewing a VendorContract via the `renew` command MUST create a new VendorContract row with `startDate = old.endDate + 1 day` and `status = "draft"`, copying metadata from the source contract. The original contract MUST transition to `expired` in the same transaction.

#### FR-7xx — Vendor compliance

- **FR-701**: The VendorContract detail view MUST surface the compliance section as an `OperationalColumn` section with `MonoLabel` rows for: `complianceScore` (0-100), `slaBreachCount`, `onTimeDeliveryRate` (%), `qualityRating` (0-5), `lastComplianceReview`. No raw `<dl>` or `<Card>` container.
- **FR-702**: A `complianceScore < 80` MUST render a warning-coral `StatusPill` on both the landing list row and the detail MetricBand. A `complianceScore < 60` MUST render a warning banner in the detail `OperationalColumn` with a "Record SLA breach" pill action.
- **FR-703**: The `record-sla-breach` command MUST accept `{ contractId, breachReason, breachedAt }` and increment `slaBreachCount` + recalculate `complianceScore` server-side. UI MUST confirm via the list/detail read API (AGENTS.md Critical Write Validation).
- **FR-704**: The `update-compliance` command MUST accept `{ contractId, complianceScore, onTimeDeliveryRate, qualityRating, lastComplianceReview }` with all fields optional (partial updates allowed).

### Key Entities

- **EventContract**: `{ tenantId, id, eventId, clientId, contractNumber, title, status, documentUrl, documentType, notes, signingToken, expiresAt, createdAt, updatedAt, deletedAt }`. Schema: `tenant_events.event_contracts` (line ~4082 in schema.prisma). Relations: Event (cascade), Client, ContractSignature[].
- **ContractSignature**: `{ tenantId, id, contractId, signedAt, signatureData, signerName, signerEmail, ipAddress, createdAt, updatedAt, deletedAt }`. Schema: `tenant_events.contract_signatures` (line ~4115). Cascade-deleted with parent EventContract.
- **VendorContract**: `{ tenantId, id, contractNumber, vendorId, vendorName, contractType, status, startDate, endDate, autoRenew, renewalTermDays, noticeDaysBeforeRenewal, paymentTerms, contractUrl, notes, complianceScore, slaBreachCount, onTimeDeliveryRate, qualityRating, lastComplianceReview, approvedBy, terminatedBy, terminationReason, createdAt, updatedAt, deletedAt }`. Schema: `tenant_inventory.vendor_contracts` (line ~2173).

### Cross-references

- `specs/general/design-system-shell.md` (§5.1) — parent composition contract. All FR-1xx and FR-2xx rules inherit from §5.1. Design primitives: PageCanvas, CommandBand, DisplayHeading, MonoLabel, MetricBand, ResearchTable, BlogFilterChip, StatusPill, ContactFormCard, ProductCard.
- `specs/events/SPEC.md` (§5.2) — governs `/events/[eventId]/contracts` scoped sub-tab (User Story 7.1). The per-event sub-tab remains EventContract-scoped; this spec governs the top-level `/contracts` aggregated view.
- `IMPLEMENTATION_PLAN.md` §2A.12 — marks the current `/contracts` landing as 1/3 (orphan redirect).
- `AGENTS.md` Cron Schedule Registry — `cron/contract-expiration-alerts` is MISSING from `apps/api/vercel.json`. FR-601 is a hard dependency on adding this entry.
- `AGENTS.md` Known Gotchas — VendorContract `record-sla-breach` and `update-compliance` commands exist but have no UI surface (FR-7xx closes this).
- `apps/api/app/api/events/contracts/commands/` — 8 EventContract commands: cancel, create, expire, mark-viewed, send, sign, soft-delete, update.
- `apps/api/app/api/procurement/vendor-contracts/commands/` — 10 VendorContract commands: activate, approve, create, record-sla-breach, reject, renew, submit, terminate, update, update-compliance.
- `packages/database/prisma/schema.prisma` — EventContract (~line 4082), ContractSignature (~line 4115), VendorContract (~line 2173).
- `packages/design-system/components/blocks/` — PageCanvas, CommandBand, DisplayHeading, MonoLabel, MetricBand, ResearchTable, BlogFilterChip, StatusPill, ContactFormCard, ProductCard.
- `DESIGN.md` (root) — color, typography, radius, spacing tokens that all `--ds-*` variables resolve to.

### Out of scope

- `/events/[eventId]/contracts` per-event scoped sub-tab — governed by `specs/events/SPEC.md` User Story 7.1; this spec does not modify that sub-route.
- VendorContract e-signature (`signingToken`) — VendorContract has no `signingToken` field; signing is EventContract-only until schema is extended (FR-505 NEEDS CLARIFICATION).
- Email delivery of signed contracts to clients — owned by email workflow surface in `specs/general/settings.md`.
- PDF generation and contract document rendering — `documentUrl` points to an externally-hosted document; this spec governs metadata and signature flow only.
- Custom contract template authoring — owned by a future sub-spec under `specs/events/`.
- Employment contracts, NDAs, legal contracts — reserved for future modules (e.g. `/hr`, `/legal`). The `/contracts` slug is `EventContract`-scoped.
- Mobile app contracts surface — platform unspecified, separate spec.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `/contracts` module landing scores 3/3 against §5.1 FR-501 rubric — zero `text-3xl font-bold`, zero `bg-*-(50|100|200)`, zero `shadow-*`, zero bare `<Card>` per row, zero legacy `Header` import. Measured by `rg -c` sweep on each PR touching `/contracts/**`.
- **SC-002**: `/contracts/[contractId]` serves the detail page without 404 for all valid contract IDs. Current state: FAIL — deep URLs under `/contracts/` 404. Closing this gap is the minimum work for the module.
- **SC-003**: Operator can identify all expiring and compliance-at-risk contracts within 2 seconds of opening `/contracts`. Verified by 5-operator usability test, ≥ 4 of 5 succeeding.
- **SC-004**: Public signing surface `/sign/[signingToken]` renders without authentication, captures signature, and creates a `ContractSignature` row persisted via PrismaStore — verified by E2E test asserting read API returns the new signature after submit.
- **SC-005**: `ContractSignature` creation is idempotent on `signingToken` — a second submit returns `409 already_signed` and does NOT create a duplicate row. Verified by unit test on the sign command.
- **SC-006**: All 8 EventContract commands and all 10 VendorContract commands are discoverable in `packages/manifest-ir/dist/routes.manifest.json` — verified by `pnpm manifest:routes:ir -- --format summary | grep contract` returning ≥ 18 entries.
- **SC-007**: `cron/contract-expiration-alerts` is added to `apps/api/vercel.json` (FR-601 hard dependency). Verified by `grep "contract-expiration-alerts" apps/api/vercel.json` returning a match.
- **SC-008**: VendorContract `record-sla-breach` round-trip increments `slaBreachCount` and the updated count is visible via the list/detail read API — verified by E2E assertion per AGENTS.md Critical Write Validation.
- **SC-009**: The raw SQL fetch in `/events/contracts/page.tsx` is replaced with `database.eventContract.findMany()` and `pnpm --filter api typecheck` passes with zero errors.
- **SC-010**: Zero `console.log` / `console.error` / `console.warn` under `apps/api/app/api/events/contracts/` and `apps/api/app/api/procurement/vendor-contracts/` — replaced with `@repo/observability` per AGENTS.md hygiene.

---

## Reference

- **DESIGN.md** (root) — color, typography, radius, spacing, and component tokens that all `--ds-*` variables resolve to.
- **`packages/design-system/components/blocks/page-shell.tsx`** — PageCanvas, CommandBand, CommandBandHeader, CommandBandLede, CommandBandActions, DisplayHeading, MonoLabel, MetricBand, OperationalColumn, OperationalRow, StatusPill, FilterRail.
- **`packages/design-system/components/blocks/research-table.tsx`** — ResearchTable (title left, taxonomy pill center, mono date right, hairline divider).
- **`packages/design-system/components/blocks/blog-filter-chip.tsx`** — BlogFilterChip (coral taxonomy pill for status filters).
- **`packages/design-system/components/blocks/contact-form-card.tsx`** — ContactFormCard (22px radius white form panel; used for create/edit forms AND the public signing surface).
- **`packages/design-system/components/blocks/product-card.tsx`** — ProductCard (for provider/capability cards if needed on signing surface).
- **IMPLEMENTATION_PLAN.md §2A.12** — origin of the `/contracts` redirect; this spec governs its replacement with a real module landing.
