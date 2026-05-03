# Feature Specification: Settings (Roles, Integrations, Security, Audit Log, Billing)

**Feature Branch**: `general/settings`
**Created**: 2026-05-02
**Status**: Draft
**Input**: User description: "Codify the Settings module — the org-level admin surface that owns role policies, third-party integrations, security primitives (API keys, rate limits, alerts, MFA pass-through), the audit log, and (eventually) subscription billing. Currently Settings landing delegates to `ModuleLanding` per §2C.9 but the leaf surfaces are inconsistent: integrations is a 2-tab `Tabs` page, security is a 2-tab `Tabs` page, audit-log is a separate client component, team is a separate client component, and there is no single Cohere-aligned shell across them."

> **Why this spec exists.** Settings is the only module where every other module bleeds in (RBAC roles touch every entity, audit log records every mutation, integrations gate cross-system writes, API keys gate the whole external surface). It is also the module most likely to be invoked by a panicking operator (revoke key, audit a change, disable an integration) — so the contract for what is surfaced and what is recoverable matters more here than in any other module. The leaf pages today are functionally correct but visually divergent (3× `text-3xl font-bold` openers, 30+ bare `<Card>` ladders, generic shadcn `<Table>` for both API keys and audit log). This document is the rule the leaves snap to.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Operator audits a recent change (Priority: P1)

An admin opens `/settings/audit-log` after a coworker reports a record changed unexpectedly. They must be able to filter by user, by entity (table), and by action type (insert / update / delete) and inspect the before/after JSON for any specific entry — within 30 seconds of opening the page.

**Why this priority**: Audit log is the forensic surface. If an operator cannot find the change in 30 seconds, they will escalate to engineering. This is the highest-leverage Settings flow.

**Independent Test**: Given a tenant with ≥ 100 audit entries, an admin can answer "who changed record X at time Y, what did they change" in ≤ 30 seconds using only the filter rail and detail dialog. Verified by 3-operator usability test, ≥ 2 of 3 succeeding.

**Acceptance Scenarios**:

1. **Given** an admin opens `/settings/audit-log`, **When** the page loads, **Then** rows render via `ResearchTable` (timestamp left, user + action chip center, entity + record-id right), filters render via `BlogFilterChip` (action: insert/update/delete), and pagination controls use the pill-outline button contract.
2. **Given** an admin clicks any row, **When** the detail dialog opens, **Then** it shows User / Timestamp / IP / Record ID / Schema / Table fields plus a `Before` and `After` JSON preview. The JSON preview is monospaced, scrollable, and copyable.
3. **Given** an admin filters by `action=delete` and `table=events`, **When** the list re-renders, **Then** server-side filtering re-runs (the URL reflects the active filters) and total-count + page-of-pages updates accordingly.
4. **Given** an admin types into the search input ("Sarah", a record-id prefix, an email), **When** results re-render, **Then** post-filter narrowing is applied client-side against the current page only (documented limitation — server-side full-text search is out of scope for v1).

---

### User Story 2 — Operator revokes a leaked API key (Priority: P1)

An admin discovers that an API key was committed to a public repo. They must be able to (a) identify the key by name + prefix, (b) confirm last-used timestamp, (c) revoke it immediately, all without leaving `/settings/security`.

**Why this priority**: API keys are the primary external write surface (`POST /api/...` with `Authorization: Bearer ...`). A leaked key is a tenant-isolation breach. Revocation must be one click + one confirm — not a multi-page workflow.

**Independent Test**: Given a tenant with ≥ 1 active `ApiKey`, an admin can revoke it in ≤ 2 clicks (Revoke → Confirm) and verify the status pill flips from `Active` (default) to `Revoked` (secondary) within one re-fetch.

**Acceptance Scenarios**:

1. **Given** an admin opens `/settings/security`, **When** the API Keys panel renders, **Then** the row stack uses `ResearchTable` (name left, key-prefix mono center, status pill + last-used right) and a `Revoke` action surfaces only on rows with status `active`.
2. **Given** an admin clicks `Revoke`, **When** the confirm dialog opens, **Then** the dialog uses `ContactFormCard` panel chrome with a destructive primary CTA ("Revoke Key"), and the action calls `POST /api/settings/api-keys/{id}/revoke`.
3. **Given** the revoke succeeds, **When** the list re-fetches, **Then** the row's status pill renders `Revoked` (BlogFilterChip tone="ghost") and the Revoke action is no longer present.

---

### User Story 3 — Admin assigns a role to a teammate (Priority: P1)

An admin opens `/settings/team`, finds a teammate, and changes their role from `staff` to `manager`. The change must be reflected in the read model immediately and recorded in the audit log.

**Why this priority**: RBAC is the control plane. Mistakes here directly cause access breaches or block someone from doing their job. The flow must be auditable end-to-end.

**Independent Test**: Given a tenant with ≥ 2 users, an admin can change a user's role and (a) see the role pill update in the team list, (b) confirm the change appears in `/settings/audit-log` with `table=users` (or `employees` per the `@@map` aliasing) and `action=update` within one minute.

**Acceptance Scenarios**:

1. **Given** an admin opens `/settings/team`, **When** the page renders, **Then** the row stack uses `ResearchTable` (avatar + name left, email + role chip center, joined-at right) with status filter chips (All / Active / Inactive) using `BlogFilterChip`.
2. **Given** an admin clicks `Change Role` on an active member, **When** the dialog opens, **Then** the role select offers `admin / manager / supervisor / staff` (the only roles defined in `team-client.tsx:79`) and submit calls `POST /api/user/update-role`.
3. **Given** the role-change succeeds, **When** the user re-loads `/settings/audit-log`, **Then** an entry with `action=update`, `tableName` matching the User model `@@map` ("employees"), `oldValues.role`, and `newValues.role` appears within the most recent 5 entries.
4. **Given** an admin clicks `Deactivate` on an active member, **When** the confirm dialog accepts, **Then** the user's `isActive` flips to false (optimistic update) and `POST /api/user/deactivate` persists. The deactivated user retains a row in the list, surfaced under the `Inactive` filter.

---

### User Story 4 — Operator configures a third-party integration (Priority: P2)

An ops manager opens `/settings/integrations`, picks a vendor (Nowsta or GoodShuffle), enters API credentials, runs a connection test, and triggers an initial sync. They must be able to inspect sync statistics and the most recent error if a sync fails.

**Why this priority**: Integrations are mutating surfaces that fail in unfamiliar ways (rate limits, schema drift, auth expiry). The settings panel is the operator's only debugging surface — getting the status + recent-errors view right is what makes the integration recoverable.

**Independent Test**: Given a tenant with no integrations configured, an ops manager can connect Nowsta or GoodShuffle by entering credentials, see a "Connected" status badge, run a manual sync, and inspect the sync result + statistics row — all from one tab on `/settings/integrations`.

**Acceptance Scenarios**:

1. **Given** the operator opens `/settings/integrations`, **When** the page renders, **Then** vendors render as a top-level `BlogFilterChip` group (or `Tabs` surfaced as pill-outline tabs per FR-205), one per vendor, with each panel reachable in one click.
2. **Given** the operator enters credentials and submits, **When** the form validates (per `IntegrationsSettingsPage` rules: API key + secret required, `autoSyncInterval` 5–1440 minutes), **Then** the panel transitions to the configured-display state showing masked credentials, sync direction, conflict resolution, and a `Test Connection` + `Sync Now` action row.
3. **Given** the operator clicks `Test Connection`, **When** the call succeeds (`success !== false`), **Then** a toast confirms "Connection test successful" and the connection-status pill remains `Connected`. **Given** the test fails, **Then** the toast shows the error and the status pill flips to a destructive tone.
4. **Given** the integration has produced shift-sync errors (Nowsta-specific), **When** the status panel renders, **Then** the `Recent Errors` section lists at most the last N errors with shift ID + error message + timestamp, each in a destructive-tone hairline tile.

---

### User Story 5 — Operator inspects the active role policies (Priority: P2)

An admin opens `/settings/security` → `Role Policies` tab to inspect what RBAC rules are active for the tenant. They need to see name, type, status (active/inactive), and a description without leaving the page.

**Why this priority**: Role policies are the plumbing under the team page. Most admins never touch them directly; when they do, it's because an existing policy is blocking a workflow.

**Independent Test**: Given a tenant with ≥ 1 RolePolicy, an admin can see the policy list, click into any policy detail dialog, and confirm `name / policyType / isActive / description`.

**Acceptance Scenarios**:

1. **Given** an admin opens `/settings/security` and switches to the Role Policies tab, **When** the panel renders, **Then** rows use `ResearchTable` (name left, type center, status pill right) and the empty state ("No role policies") uses the soft-stone tile per FR-105.
2. **Given** an admin clicks a row, **When** the detail dialog loads, **Then** it fetches `GET /api/rolepolicy/policies/{id}` and shows `name / policyType / isActive / description`. There is no edit affordance in v1 — RolePolicy edits are CLI/seed-time per [NEEDS CLARIFICATION: is policy editing in scope for v1, or only assignment via /settings/team?].

---

### User Story 6 — Admin reviews subscription + billing (Priority: P3)

An admin opens `/settings/billing` to see their current plan, payment method, and invoice history. **This surface does not exist today** and is gated on the billing model decision.

**Why this priority**: Self-serve billing is a paid-tier feature on a roadmap, not the MVP. The surface must be specced because it touches Stripe (an external vendor), but it is P3 and blocked behind a clarification.

**Independent Test**: Once the billing model lands, given a tenant with an active subscription, an admin can see their current tier, next renewal date, default payment method (last 4), and the last 12 invoices with download links.

**Acceptance Scenarios**:

1. **Given** an admin opens `/settings/billing`, **When** the page renders, **Then** [NEEDS CLARIFICATION: billing model not yet defined — no `Subscription`, `Plan`, `Tier`, or `BillingAccount` Prisma model exists; the existing `Invoice` model in `tenant_accounting` is for client AR, NOT for subscription billing].
2. **Given** the billing surface is in scope, **When** an admin clicks "Update payment method", **Then** the panel opens a Stripe Elements widget per FR-303 (widget palette mapped to `--ds-*` tokens, no decorative pastels). [NEEDS CLARIFICATION: Stripe Elements vs Stripe Checkout redirect — implementation choice].
3. **Given** invoices exist, **When** the admin scrolls the invoice history list, **Then** rows use `ResearchTable` with download-PDF as a text-link secondary action.

---

### Edge Cases

- **What happens when a non-admin opens `/settings/team`, `/settings/security`, or `/settings/audit-log`?** The surface must short-circuit to a soft-stone empty-state tile ("Admin access required") and a back-link to `/settings`. The current implementation returns the data unconditionally — this is a security gap to track in §3.x or a follow-up. [NEEDS CLARIFICATION: confirm Clerk role-gating contract for these routes].
- **What happens when an integration's credentials are valid but the vendor returns a 5xx?** The sync status surface must show the last-success timestamp AND the most recent error, side by side. The current Nowsta panel does this; GoodShuffle does not (only shows last status). FR-403 below ratifies this.
- **What happens when the audit-log table grows past N entries?** The list paginates server-side at 50/page (`audit-log-client.tsx:235`). Client-side text search is post-filter only — operators searching for an entry on page 5+ must page first, then search. Documented limitation; full-text search is out of scope for v1.
- **What happens when an `OverrideAudit` row is recorded?** It is a separate model from the audit log entries surfaced on `/settings/audit-log` (which read from a generic per-table audit stream). OverrideAudit captures policy-override events. **It is not currently surfaced anywhere in the UI** — track as a §3.x follow-up. [NEEDS CLARIFICATION: should OverrideAudit live on `/settings/audit-log` as a tab, or under `/settings/security` next to Role Policies?].
- **What happens when an `EntityVersion` history is requested for a record?** `EntityVersion` and `VersionApproval` exist in the manifest entity catalog but **have no Prisma model** in `schema.prisma`. They are surfaced in the manifest IR / MCP server but not persisted. Until backed by Prisma, version history is documented as "not implemented in UI."
- **What happens when an admin tries to revoke their own API key or deactivate their own user?** The current code does not block this. [NEEDS CLARIFICATION: should self-revocation/self-deactivation be server-side blocked or client-side warned?]. Track as a §3.x follow-up.
- **What happens when no MFA is configured at the Clerk level?** Settings does not own MFA — it is a pass-through to Clerk's user-profile surface. The Settings page must surface a clear "Manage MFA in account settings" link to Clerk's hosted UserButton/UserProfile component, not duplicate the form.

## Requirements *(mandatory)*

### Functional Requirements

#### FR-1xx — Composition (what every Settings leaf MUST use)

- **FR-101**: The Settings landing (`apps/app/app/(authenticated)/settings/page.tsx`) MUST delegate to `ModuleLanding` (it does today). The `highlights` prop MUST list 4 capabilities — Team, Integrations, Security, Audit Log — and (once §5.4 billing lands) Billing as a 5th. Inheriting `specs/general/design-system-shell.md` FR-101 / FR-501 contract.
- **FR-102**: Every settings leaf (`team`, `integrations`, `security`, `audit-log`, plus the email-template and email-workflow surfaces nested under settings) MUST replace the current `text-3xl font-bold` opener with the page-shell ladder: `PageCanvas → CommandBand → DisplayHeading → CommandBandActions → MetricBand (or OperationalColumn)`. Inherits `design-system-shell.md` FR-201.
- **FR-103**: Every list under settings (api-keys, role-policies, audit-log, team-members) MUST migrate from generic shadcn `<Table>` to `ResearchTable` per `design-system-shell.md` FR-102. Generic `<Table>` is allowed only for the JSON before/after preview inside the audit detail dialog (which is tabular numeric/key-value data).
- **FR-104**: Every form panel (integration credentials form, change-role dialog, deactivate-confirm, revoke-confirm) MUST use `ContactFormCard` panel chrome per `design-system-shell.md` FR-103.
- **FR-105**: Status / action filters (audit-log action filter, audit-log table filter, team status filter, security tab) MUST use `BlogFilterChip` per `design-system-shell.md` FR-104. The current shadcn `<Tabs>` on `/settings/security` and `/settings/integrations` MUST migrate to pill-outline tabs (or sub-page routes) per `design-system-shell.md` FR-205.
- **FR-106**: Empty states on every Settings leaf (no api-keys, no role-policies, no audit entries, no team members matching filter) MUST use the soft-stone tile per `design-system-shell.md` FR-105. The current `EmptyState` helper in `security/page.tsx:345` and the inline `Card` empties in `audit-log-client.tsx:386` MUST be replaced with the shared `Empty` primitive.

#### FR-2xx — Roles & RBAC (Team page)

- **FR-201**: `/settings/team` MUST display every user in the tenant with `firstName`, `lastName`, `email`, `role`, `isActive`, `createdAt`. The role field is one of `admin / manager / supervisor / staff` (constants in `team-client.tsx:79`). [NEEDS CLARIFICATION: are these the canonical roles, or is `RolePolicy` the source-of-truth and the four-role enum is legacy?].
- **FR-202**: An admin MUST be able to change a user's role via `POST /api/user/update-role` with `{ userId, role }`. The change MUST be optimistically reflected in the team list AND persisted. The route MUST emit an audit-log entry against the User model (mapped table `employees` per `@@map`).
- **FR-203**: An admin MUST be able to deactivate a user via `POST /api/user/deactivate` with `{ userId }`. Deactivation flips `isActive = false`; the user retains a row in the list under the Inactive filter and loses access on next request. Reactivation is out of scope for v1 (no `/reactivate` route exists). [NEEDS CLARIFICATION: is reactivation in scope for v1?].
- **FR-204**: An admin MUST be able to inspect a user's detail (id, email, role, status, joined-at) via the member-detail dialog without a network round-trip beyond the initial list fetch.
- **FR-205**: The Role Policies surface (`/settings/security` → Role Policies tab) MUST list every `RolePolicy` (`name`, `policyType`, `description`, `isActive`) and offer a read-only detail dialog. Edit/create is **out of scope for v1** — RolePolicy mutation is via seeds/CLI.

#### FR-3xx — Integrations

- **FR-301**: `/settings/integrations` MUST surface one panel per third-party integration. Today: GoodShuffle, Nowsta. Planned: QuickBooks, Stripe (billing), Clerk (auth pass-through, not configurable from this page). [NEEDS CLARIFICATION: QuickBooks integration is not present in `apps/api/app/api/integrations/` — is it in scope for v1 or v2?].
- **FR-302**: Each integration panel MUST surface (a) a connection-status pill (Connected / Not Configured / Error), (b) a credentials form (API key + secret + vendor-specific fields), (c) sync settings (enabled, direction one_way/two_way, auto-sync interval 5–1440 min, conflict resolution where applicable), (d) a `Test Connection` action and a `Sync Now` action, (e) statistics (last-sync timestamp + status, total synced, vendor-specific counts).
- **FR-303**: Vendor-specific surface contracts:
  - **GoodShuffle**: webhook secret (optional), conflict resolution (`convoy_wins | goodshuffle_wins | manual`), pending-conflicts count.
  - **Nowsta**: organization ID (optional), employee-mappings count (total / auto-mapped / confirmed), shift-sync stats (total / synced / pending / error), recent-errors list (shift ID + error + timestamp).
  - **QuickBooks** (planned): OAuth redirect flow per Intuit's spec (no API key field) [NEEDS CLARIFICATION].
  - **Stripe** (planned, billing-only): publishable key managed via env var; this surface is `Connected (read-only)` only. Plan/payment-method management lives on `/settings/billing`.
- **FR-304**: Integration credentials MUST be stored encrypted at rest. The settings UI MUST show the API key and secret as **revealed text** in the configured-display state (per current `ConfigField mono` rendering in `integrations/page.tsx:417`) — [NEEDS CLARIFICATION: is full-key reveal acceptable for an admin-only page, or should it be masked with a Reveal button?]. Edit forms MUST allow leaving the field blank to keep the existing value.
- **FR-305**: An integration MUST be deletable via `DELETE /api/integrations/{vendor}/config` with a destructive-confirm dialog ("This will permanently remove your integration credentials and disable all syncing"). Deletion clears credentials + disables sync; existing synced records are not removed (documented).
- **FR-306**: Webhook ingestion routes (`/api/integrations/webhooks/*`) are infrastructure-allowlisted (per `AGENTS.md` "auth/webhooks/cron/health" exception) and do NOT require a settings UI. Their config (secret rotation) is part of FR-303 per-vendor.

#### FR-4xx — Security primitives

- **FR-401**: API Keys (`/settings/security` → API Keys tab) MUST list every `ApiKey` with `name`, `keyPrefix`, `scopes[]`, `status (active|expired|revoked)`, `lastUsedAt`, `createdAt`. The status is computed: revoked if `revokedAt`, expired if `expiresAt < now`, otherwise active.
- **FR-402**: An admin MUST be able to revoke an active key via `POST /api/settings/api-keys/{id}/revoke`. **API key creation is out of scope for the v1 settings UI** — keys are seeded by ops or generated via the manifest CLI [NEEDS CLARIFICATION: is in-UI key creation in scope for v1?].
- **FR-403**: Rate limit configuration (`RateLimitConfig` model) MUST be surfaced as a read-only list under `/settings/security`. **Rate-limit edits are out of scope for v1** — config is seed-driven. [NEEDS CLARIFICATION: confirm read-only-only intent].
- **FR-404**: Alerts configuration (`AlertsConfig` model) MUST be surfaced as a configurable form under `/settings/security` (or a new `/settings/alerts` leaf). [NEEDS CLARIFICATION: not currently in the settings UI — confirm whether to scope into v1 or defer].
- **FR-405**: MFA is **not owned by Settings** — the surface MUST link to Clerk's hosted `UserProfile` component (or `https://accounts.{tenant}/.../security`) for password / MFA / device management. The Settings security tab MAY surface a single CTA "Manage account security" that opens that surface in a new tab.
- **FR-406**: AdminTask events (`AdminTask` model — used for tracking admin-initiated workflows) MUST be surfaced under audit-log as a separate stream OR as a filter on the existing audit-log surface. [NEEDS CLARIFICATION: confirm placement].

#### FR-5xx — Audit log

- **FR-501**: `/settings/audit-log` MUST list audit entries server-paginated at 50/page from `GET /api/settings/audit-log?page=N&limit=50&action=...&table_name=...`. Entries include `id`, `tableName`, `tableSchema`, `recordId`, `action (insert|update|delete)`, `oldValues`, `newValues`, `performedBy`, `performedByName`, `performedByEmail`, `ipAddress`, `userAgent`, `createdAt`.
- **FR-502**: An admin MUST be able to filter by `action` (All / Created / Updated / Deleted) and by `table_name` (dynamic list returned in the API response). Both filters are server-applied; combining them ANDs the conditions.
- **FR-503**: An admin MUST be able to inspect a single entry's before/after JSON via a detail dialog. The dialog MUST show `User / Timestamp / IP / Record ID / Schema / Table` plus monospaced JSON previews for `Before` and `After`. JSON is scrollable up to 192px height; longer payloads scroll within the dialog.
- **FR-504**: Client-side search is **post-filter** on the current page only. Documented limitation. [NEEDS CLARIFICATION: is server-side full-text search in scope for v1?].
- **FR-505**: `OverrideAudit` entries (policy-override events, distinct from the standard audit stream) MUST be either (a) surfaced as a separate tab on `/settings/audit-log` or (b) filterable as a `table_name=override_audit` selection. [NEEDS CLARIFICATION: confirm placement before implementation].
- **FR-506**: `EntityVersion` and `VersionApproval` are out of scope for v1 — no Prisma model exists. When backed by a model, version history rendering MUST live on the per-entity detail page (e.g., `/events/{id}/history`), not on the global `/settings/audit-log`.

#### FR-6xx — Billing (P3, blocked)

- **FR-601**: `/settings/billing` does not exist today. [NEEDS CLARIFICATION: billing model not yet defined — no `Subscription`, `Plan`, `Tier`, `PaymentMethod`, or `BillingAccount` Prisma model exists. The existing `Invoice` and `Payment` models in `tenant_accounting` are for client AR, NOT for subscription billing].
- **FR-602**: When the billing model lands, the surface MUST show: current tier, renewal date, default payment method (last 4 + expiry), and the last 12 subscription invoices with PDF download links.
- **FR-603**: Payment-method update MUST go through Stripe (Elements or Checkout redirect — implementation choice). The settings UI never holds card data directly; PCI scope stays with Stripe.
- **FR-604**: Plan upgrade / downgrade MUST emit an audit-log entry against `BillingAccount` (or equivalent model) with `oldValues.tier` / `newValues.tier`.

### Key Entities

- **RolePolicy** (`tenant_*` schema, 5295): `id`, `name`, `description`, `policyType`, `isActive`, `tenantId`, `deletedAt`. Source of truth for RBAC rules. Read-only in v1 settings UI.
- **ApiKey** (5152): `id`, `name`, `keyPrefix`, `scopes[]`, `lastUsedAt`, `expiresAt`, `revokedAt`, `createdByUserId`. Listed + revokable in v1.
- **OverrideAudit** (4007): policy-override events. Separate stream from generic audit log; placement TBD.
- **RateLimitConfig** (5219): per-route rate limit config. Read-only in v1.
- **AlertsConfig** (1902): tenant alerting config. Surface deferred / TBD.
- **AdminTask** (2447): admin-initiated workflow tracking. Surface deferred / TBD.
- **User** (`@@map("employees")`): the team-page model. `firstName`, `lastName`, `email`, `role`, `isActive`, `createdAt`. Role enum: admin / manager / supervisor / staff (constant in `team-client.tsx`).
- **Audit log stream**: not a single Prisma model — it is the union of per-table change-tracking rows surfaced via `GET /api/settings/audit-log`. Implementation owns the storage; the UI consumes a stable shape.
- **EntityVersion / VersionApproval**: in the manifest entity catalog but **no Prisma model**. Out of scope for v1 UI.
- **Subscription / Plan / BillingAccount**: do NOT exist. Blocking [NEEDS CLARIFICATION] for FR-6xx.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All five Settings landing card targets (`/settings`, `/settings/team`, `/settings/integrations`, `/settings/security`, `/settings/audit-log`) score 3/3 against `design-system-shell.md` FR-501. Current baseline: `/settings` is 3/3 (delegates to `ModuleLanding`), the four leaves are 1/3 (generic shadcn `<Card>` ladders + `text-3xl font-bold` openers + raw `<Table>`).
- **SC-002**: `text-3xl font-bold` count under `apps/app/app/(authenticated)/settings/**` drops from 3 (one per leaf: integrations:1551, security:648, audit-log uses `<Separator />` only — needs verification) to 0.
- **SC-003**: Bare shadcn `<Card>` opener count under `apps/app/app/(authenticated)/settings/**` drops from > 30 to 0 (every Card declares `tone` per `design-system-shell.md` FR-204).
- **SC-004**: Generic shadcn `<Table>` openers under `apps/app/app/(authenticated)/settings/**` drop from 3 (api-keys, role-policies, audit-log, team-members — 4 actually) to 0; lists migrate to `ResearchTable`. Audit-detail JSON-preview tabular renders are exempt.
- **SC-005**: An admin completes the "audit a recent change" flow (User Story 1) in ≤ 30 seconds in a 3-operator usability test (≥ 2 of 3 succeeding).
- **SC-006**: An admin revokes an API key (User Story 2) in ≤ 2 clicks (Revoke → Confirm), measured end-to-end including the re-fetch.
- **SC-007**: Every Settings mutation (role change, deactivate, integration save, integration delete, API key revoke) emits exactly one audit-log entry against the corresponding model. Verified by running each flow and asserting the next `/settings/audit-log` page contains the matching row.
- **SC-008**: When billing lands (FR-6xx unblocked), `/settings/billing` reaches 3/3 design-system-shell compliance on its first commit (no follow-up pass needed).
- **SC-009**: Zero `console.log` / `console.error` calls in `apps/app/app/(authenticated)/settings/**` and `apps/api/app/api/settings/**` after the leaf pages migrate (cleanup ratchet inheriting the `AGENTS.md` "Test & Logging Hygiene" rule).

## Cross-references

- `specs/general/design-system-shell.md` — shell composition contract, primitive list, scoring rubric (this spec inherits FR-101..106, FR-201..207, FR-301..304).
- `specs/general/marketing.md` (§5.3) — email templates and email workflows are nested under `apps/app/app/(authenticated)/settings/email-templates/` and `email-workflows/` but conceptually belong to the marketing module. This spec defers their requirements to §5.3 and only mandates that the URL-level shell on those leaves matches the Settings shell.
- `IMPLEMENTATION_PLAN.md` §2C.9 — current Settings module-shell score (3/3 landing, leaves variable).
- `AGENTS.md` — package-boundary rules (no `next/*` in `packages/`), validation commands, hygiene baselines.
- `packages/database/prisma/schema.prisma` — `RolePolicy` (5295), `ApiKey` (5152), `OverrideAudit` (4007), `RateLimitConfig` (5219), `AlertsConfig` (1902), `AdminTask` (2447), `User` model with `@@map("employees")`.
- `apps/app/app/(authenticated)/settings/{page,team,integrations,security,audit-log}/*.tsx` — existing leaf implementations.
- `apps/api/app/api/integrations/{goodshuffle,nowsta,webhooks}/**` — vendor integration command + status routes.
- `apps/api/app/api/settings/{api-keys,audit-log}/**` — settings command + read routes.
- `apps/api/app/api/user/{update-role,deactivate}/**` — RBAC mutation routes.
- `apps/api/app/api/rolepolicy/policies/**` — RolePolicy list + detail routes.

## Out of scope

- **Subscription billing implementation** — blocked on [NEEDS CLARIFICATION: billing model]. FR-6xx is specced but cannot ship until a `Subscription` / `Plan` / `BillingAccount` Prisma model lands.
- **In-UI API key creation** — keys are seeded / CLI-generated in v1. v2 may add `POST /api/settings/api-keys/create`.
- **In-UI RolePolicy creation / edit** — read-only in v1. v2 may add a policy editor.
- **In-UI RateLimitConfig editing** — read-only in v1. v2 may add overrides.
- **Server-side full-text audit search** — v1 is post-filter client-side on the current page.
- **EntityVersion / VersionApproval surfaces** — no Prisma model exists; out of scope until backed.
- **MFA enrollment UI** — pass-through to Clerk's hosted `UserProfile` per FR-405.
- **Tenant management** (creating/deleting tenants) — separate admin-tier surface, not Settings.
- **OAuth provider configuration** (e.g., Google Workspace SSO) — Clerk-owned; out of scope for Settings.
- **Webhook signing-secret rotation UI** — covered by per-vendor integration panel (FR-303), no separate webhook-management surface.
