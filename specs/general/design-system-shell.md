# Feature Specification: Authenticated Module Shell (Cohere Design Contract)

**Feature Branch**: `general/design-system-shell`
**Created**: 2026-05-02
**Status**: Draft
**Input**: User description: "Codify the authenticated shell pattern that every module page in `apps/app/app/(authenticated)/*` must satisfy. This is the design contract derived from `DESIGN.md` (Cohere) plus the operational primitives already published in `packages/design-system/components/blocks/page-shell.tsx` and `module-landing.tsx`."

> **Why this spec exists.** Module landings drift visually because the shell pattern is implicit — the rules live in `DESIGN.md` (color/typography/radius tokens) and in the page-shell exports (composition primitives) but nothing connects them into a single rule the audit can score against. This document is that connector. It defines what a "Cohere-aligned module shell" means in concrete, testable terms so subsequent module passes (§2A/§2B/§2C in `IMPLEMENTATION_PLAN.md`) can be marked done against an explicit rubric instead of the auditor's judgment.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Operator opens a module landing page (Priority: P1)

An operator (kitchen lead, scheduler, accountant, dispatcher) navigates from the global sidebar to any top-level module landing (`/events`, `/kitchen`, `/scheduling`, `/inventory`, `/payroll`, `/crm`, `/analytics`, `/warehouse`, `/accounting`, `/procurement`, `/staff`, `/staffing`, `/marketing`, `/settings`, `/tools`, `/logistics`, `/calendar`, `/administrative`, `/cycle-counting`, `/facilities`, `/search`, `/contracts`).

The operator must be able to identify, within 2 seconds of viewport load:

1. **Where am I.** A mono-uppercase eyebrow (`Operations / <Module>` or equivalent taxonomy crumb) appears above the page heading.
2. **What is this page.** A `DisplayHeading` (≥ 48px, restrained Cohere display typography) names the module.
3. **What can I do here.** A `CommandBand` actions cluster sits adjacent to the heading with the primary call-to-action as a near-black pill, and any secondary actions as pill-outline (30px radius) or text-link buttons.
4. **What is the state of the world.** A `MetricBand` row (or, for landings without metrics, an `OperationalColumn` ladder of section leads) shows the 2–6 numbers an operator needs to triage.

**Why this priority**: The shell is the surface every module inherits. If P1 is wrong, every module is wrong.

**Independent Test**: Given a fresh module landing, an operator can answer the four "where/what/can-do/state" questions without scrolling. Verified by visual diff against the §2C reference set (settings, tools, logistics, payroll, scheduling, inventory, analytics, crm, calendar, knowledge-base) and by the §3.6/§3.7/§3.8 cross-cutting counts dropping to zero on the landing file.

**Acceptance Scenarios**:

1. **Given** the operator opens `/inventory`, **When** the page renders, **Then** the page composes `PageCanvas → CommandBand → DisplayHeading → CommandBandActions → MetricBand → OperationalColumn` (or `ModuleLanding` which delegates to that ladder) with no `text-3xl font-bold` opener, no `bg-*-50/100/200` decorative pastels, no `shadow-{sm,md,lg,xl,2xl}`, and no legacy `Header` import.
2. **Given** the operator opens `/payroll`, **When** the page renders, **Then** it delegates to `ModuleLanding` from `packages/design-system/components/blocks/module-landing.tsx` (passing `linkComponent={Link}` to inject `next/link`), and the rendered DOM matches the §2C visual reference within ±4px on the heading, ±2px on the metric row baseline.
3. **Given** the operator opens any of the 12 module landings still scored 1/3 in §2A (`cycle-counting`, `facilities`, `marketing`, `accounting`, `administrative`, `payroll/overview`, `staffing/payroll/scheduling layouts`, `search`, `contracts`, `warehouse`), **When** that page is reworked under this spec, **Then** the resulting file must declare itself either (a) a thin server component delegating to `ModuleLanding`, (b) a server component composing the page-shell primitives directly, or (c) the explicit operational pattern documented in §1.x of `IMPLEMENTATION_PLAN.md` (e.g. `kitchen/page.tsx` delegates to `ProductionBoardClient`, which is the documented exception).

---

### User Story 2 — Operator scans a list/index sub-route (Priority: P1)

After landing on a module, the operator drills into a list (events list, recipes index, scheduled shifts, invoices, requisitions, audit log entries, search results). The list must be a `ResearchTable` with editorial typography and hairline row dividers — not a generic shadcn `<Table>` and not a card grid.

**Why this priority**: Lists are the second most-touched surface in the app. They are also where decorative shadows, pastel chips, and `<Card>` wrapper soup most often slip in.

**Independent Test**: A list page passes when its rendered row markup is `<a href> {title-left} {pill-center} {mono-date-right}` separated by 1px `border-hairline` and contains zero `<Card>` or `<CardContent>` openers, zero `shadow-*` classes, and zero `bg-*-(50|100|200)` decoratives.

**Acceptance Scenarios**:

1. **Given** the operator opens `/events`, **When** the events list renders, **Then** rows use `ResearchTable` semantics (title left, status pill center, date right, hairline divider) — not a `<Card>` per row.
2. **Given** the operator opens `/accounting/invoices`, **When** the list renders, **Then** the rows use the same ResearchTable contract as `/events`. The status pill uses `BlogFilterChip` (coral taxonomy) for invoice state (`draft/sent/paid/overdue`), not generic shadcn `<Badge>`.
3. **Given** the operator filters a list by taxonomy (event type, client type, employee status, shift state, invoice state, search result type), **When** filter chips render, **Then** they use `BlogFilterChip` (coral or active tone), not generic `<Button variant="ghost">` or shadcn `<Tabs>`.

---

### User Story 3 — Operator runs a create/edit flow (Priority: P2)

The operator opens a "create event", "edit recipe", "new requisition", "schedule shift", or similar form. The form must sit inside a 22px-radius (`rounded-lg` once §0.1 lands) white card on the page canvas, with a single `DisplayHeading`, a near-black pill submit, and pill-outline (30px) cancel — matching the `ContactFormCard` pattern from `packages/design-system/components/blocks/contact-form-card.tsx`.

**Why this priority**: Forms are mutating surfaces — getting the visual contract right matters for trust signals (large radius = "card you can submit", hairline = "field you can edit") but they ship behind feature work, not standalone.

**Independent Test**: A form page passes when the outer container is a `ContactFormCard` (or matching primitive), the field stack uses `space-y-{md|lg}` from the spacing tokens (not arbitrary `gap-3`), and the action row places primary on the right and secondary as a text-link or pill-outline on the left.

**Acceptance Scenarios**:

1. **Given** the operator clicks "New event" on `/events`, **When** the form opens (modal or page), **Then** the panel uses 22px radius, white canvas, 32px padding, pill primary submit.
2. **Given** the operator opens "New requisition" in procurement, **When** the form renders, **Then** the same panel contract applies. Field labels use `MonoLabel` for taxonomy fields (status, vendor type) and plain caption for free-text fields.
3. **Given** the operator hits the keyboard shortcut to confirm submit, **When** the form is in `disabled` state, **Then** the pill primary surface drops to 50% opacity per the existing Button cva opacity rule — no custom disabled-state colors.

---

### User Story 4 — Operator hits an empty state (Priority: P2)

The operator opens a module before any data exists (empty events list, no recipes yet, no scheduled shifts). The empty state must be the soft-stone `bg-soft-stone px-6 py-16 rounded-[22px]` panel with a central icon, heading, body, and a pill primary CTA — matching the existing `kitchen/recipes` empty state.

**Why this priority**: Empty states are first-run surfaces. Getting them wrong damages trust during onboarding when the rest of the visual system is still loading from the user's mental model.

**Independent Test**: Every list page that can be empty has an empty-state branch returning a soft-stone tile with the four documented elements (icon / heading / body / CTA). No empty state uses a generic shadcn `<Card>` or `<EmptyState>` from the prior design.

**Acceptance Scenarios**:

1. **Given** the operator opens `/kitchen/recipes` for a tenant with zero recipes, **When** the page renders, **Then** the empty state matches the soft-stone tile contract.
2. **Given** every other module hits an empty state, **When** that branch renders, **Then** it composes the same `Empty` primitive from `packages/design-system` (which already exists per the cva extension landed in §0.7).

---

### User Story 5 — Operator switches to dark mode (Priority: P3)

The operator toggles dark mode (system or manual). Module shells must respect `next-themes` `class="dark"` overrides, but content areas explicitly marked `editorial-surface-reset` (forms, list pages, dashboards) must stay on the light canvas because the editorial typography system was designed against canvas, not ink.

**Why this priority**: Dark mode is a comfort feature for operators on long shifts, but it is not the primary visual target. Keep the contract narrow: chrome flips to dark, content stays editorial.

**Independent Test**: A dark-mode toggle test verifies that `(authenticated)/layout.tsx` shell goes dark, but every page rendered with the `editorial-surface-reset` class stays on canvas.

**Acceptance Scenarios**:

1. **Given** the operator toggles dark mode, **When** the layout re-renders, **Then** `GlobalSidebar` shows the deep-green sidebar token (`--sidebar`) and the topbar inverts to ink, but `/events`, `/kitchen`, `/inventory` content areas stay on canvas.

---

### Edge Cases

- **What happens when a module ships before its spec exists** (e.g. `tools` ships ahead of `specs/general/tools.md` from §5.5)? Per §1.x, the landing must still delegate to `ModuleLanding` and surface a "Spec pending" mono-eyebrow caption inside the operational column so the spec gap is visible to operators and reviewers, not hidden.
- **What happens when a third-party widget cannot be themed** (Recharts, MapboxGL, FullCalendar, Stripe Elements)? The widget must be wrapped in a `PageCanvas`-compatible container (white background, hairline border, no shadow) and its internal palette must use the `--ds-*` tokens via the existing `chart.tsx` palette mapping. If that is impossible, the widget is the documented exception (e.g. `unified-calendar.tsx` retains 9 pastel tokens that map to event-type taxonomy and are explicitly out-of-scope per §2C.6).
- **What happens on a route whose visual pattern is operational, not editorial** (`kitchen/page.tsx` → `ProductionBoardClient`, the dev-console, the mobile-kitchen agent surface)? The route does NOT delegate to `ModuleLanding`. Instead it must declare its operational pattern in `IMPLEMENTATION_PLAN.md` §1.x with a one-line justification, and the landing must still expose a `data-design-system-shell="operational"` attribute so audits can distinguish the documented exception from drift.
- **What happens on a sub-route whose parent module is `1/3` (broken)** (e.g. `cycle-counting/[sessionId]/page.tsx` while `cycle-counting/layout.tsx` still uses `bg-gray-50`)? The sub-route fixes the local file but does not block on the layout. The layout migration is tracked under §2A.1, sub-route under §3.x cross-cutting sweep.
- **What happens when an existing page imports both `Header` and `CommandBand`** (the current `events/page.tsx` historic state)? The duplicate is a 2/3 score, not 3/3. The fix is to remove the legacy import — never to "merge" the two patterns into a hybrid.

## Requirements *(mandatory)*

### Functional Requirements

#### FR-1xx — Composition primitives (what every shell MUST use)

- **FR-101**: Every module landing in `apps/app/app/(authenticated)/*` MUST compose its top-level shell using primitives exported from `packages/design-system/components/blocks/page-shell.tsx` (`PageCanvas`, `CommandBand`, `CommandBandHeader`, `CommandBandLede`, `CommandBandActions`, `DisplayHeading`, `MonoLabel`, `MetricBand`, `OperationalColumn`, `OperationalRow`, `OperationalLine`, `SectionHeader`, `StatusPill`, `FilterRail`) or via the higher-order `ModuleLanding` from `packages/design-system/components/blocks/module-landing.tsx`. Bespoke local imitations are forbidden.
- **FR-102**: Every list/index sub-route MUST use `ResearchTable` from `packages/design-system/components/blocks/research-table.tsx` for the row stack. Generic shadcn `<Table>` is allowed only for dashboards rendering true tabular numeric data (e.g. `analytics/finance/components/...`), never for browseable record lists.
- **FR-103**: Every create/edit form panel MUST use `ContactFormCard` from `packages/design-system/components/blocks/contact-form-card.tsx` for its outer surface. Form fields are caller-supplied; the panel owns the radius, padding, and action row contract.
- **FR-104**: Every taxonomy filter (status, type, channel, segment, tier, role, employment-type, shift-state, invoice-state, etc.) MUST use `BlogFilterChip` from `packages/design-system/components/blocks/blog-filter-chip.tsx`. `Badge` is reserved for binary or rarely-mutating semantic states (e.g. "verified", "archived").
- **FR-105**: Every empty state MUST use the `Empty` primitive (cva-extended in §0.7) with the soft-stone tile contract: `bg-soft-stone px-6 py-16 rounded-[22px]`, central icon, heading, body, pill primary CTA.
- **FR-106**: Every dark feature band (deep-green or navy) MUST use `DarkFeatureBand` (with `tone="deep-green"|"navy"`) or `NavyFeatureBand` from `packages/design-system/components/blocks/`. Do not hand-author dark bands inline.

#### FR-2xx — Forbidden patterns (what every shell MUST NOT use)

- **FR-201**: No file under `apps/app/app/(authenticated)/*` MUST contain a `text-3xl font-bold` or `text-4xl font-bold` opener. Use `DisplayHeading` (or one of the typographic utilities `ds-section-display`, `ds-section-heading`, `ds-card-heading` per §0.4). Audit count target: 0 (currently 114/106 per §3.6).
- **FR-202**: No file MUST contain `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, or `shadow-2xl` on a non-overlay surface. Overlays (Dropdown, Tooltip, Popover, Dialog) are the only documented exception. Audit count target: 0 on non-overlay (currently 66/52 per §3.7).
- **FR-203**: No file MUST contain a decorative pastel surface in the `bg-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200)` range. Saturated 500/600 status colors are allowed for status pills (e.g. `kitchen/task-card.tsx` status indicators); pastels are forbidden as broad fill. Audit count target: 0 (currently 375/86 per §3.8).
- **FR-204**: No file MUST contain a bare shadcn `<Card>` opener without a `tone` prop. Once §0.7 has landed, every `<Card>` MUST declare `tone="canvas|stone|ink|media"`. Audit count target: 0 strict bare-Card (currently 183/96 per §3.11).
- **FR-205**: No file MUST contain a `border-b` tab strip when shadcn `<Tabs>` already provides pill-outline tabs. Three offenders remain (`payroll/layout.tsx:59`, `payroll/approvals/page.tsx:525`, `staffing/layout.tsx:28`) plus one new offender at `kitchen/recipes/[recipeId]/mobile/mobile-recipe-client.tsx:500`. Audit count target: 0 (currently 4 per §3.12).
- **FR-206**: No file MUST hand-author a font-loading import. Fonts are loaded once in `apps/app/app/layout.tsx` (and the equivalent for `apps/web` and `apps/api`); shared packages MUST NOT import `next/font/google`. The boundary rule is enforced by §3.10 / `AGENTS.md`.
- **FR-207**: No file MUST import `next/link`, `next/dynamic`, `next/server`, `@next/third-parties/*`, or `@vercel/analytics/*` from a path under `packages/`. App-only Next.js APIs MUST be injected via DI (`linkComponent` prop, etc.). The boundary rule is enforced by §3.10 / `AGENTS.md`.

#### FR-3xx — Tokens (what every surface MUST consume)

- **FR-301**: Radius MUST consume the DESIGN.md scale exclusively: `rounded-xs` (4px), `rounded-sm` (8px), `rounded-md` (16px), `rounded-lg` (22px), `rounded-xl` (30px), `rounded-pill` (32px), `rounded-full` (9999px). Hardcoded `rounded-[NNpx]` is forbidden except for the documented `rounded-[22px]` empty-state shorthand.
- **FR-302**: Spacing MUST consume the DESIGN.md scale: `xxs=2`, `xs=6`, `sm=8`, `md=12`, `lg=16`, `xl=24`, `xxl=32`, `section=80`. Tailwind spacing utilities map to these values via the design-system theme extension (§0.2).
- **FR-303**: Color MUST consume the `--ds-*` token surface (`--ds-canvas`, `--ds-soft-stone`, `--ds-deep-green`, `--ds-dark-navy`, `--ds-primary`, `--ds-ink`, `--ds-coral`, `--ds-action-blue`, `--ds-hairline`, `--ds-card-border`, `--ds-muted`, `--ds-slate`, `--ds-body-muted`). Hardcoded hex colors are forbidden in app-level files (the design-system itself owns the hex declarations).
- **FR-304**: Typography MUST consume the `ds-*` utility scale (`ds-hero-display`, `ds-product-display`, `ds-section-display`, `ds-section-heading`, `ds-card-heading`, `ds-feature-heading`, `ds-body-large`, `ds-body`, `ds-button`, `ds-caption`, `ds-micro`) plus the `MonoLabel` primitive for mono-uppercase eyebrows. Inline `text-{size}` + `font-{weight}` is forbidden on any element that has a typographic role.

#### FR-4xx — Sidebar nav contract

- **FR-401**: The authenticated shell MUST be a left collapsible sidebar, not the marketing three-zone nav. The sidebar surface uses the deep-green token (`--sidebar = --ds-deep-green`). The active item is rendered as a near-black pill on canvas (`bg-canvas text-deep-green rounded-pill`). Inactive items are canvas-on-deep-green with no shadow.
- **FR-402**: Sidebar section eyebrows MUST use `MonoLabel` (mono-uppercase, 14px, 0.28px tracking). Section dividers MUST be 1px hairlines on `--sidebar-border`, not gray-200 fills.
- **FR-403**: Sidebar icon glyphs MUST be lucide-react stroke icons sized 20×20 with the canvas token as their `currentColor`. Filled icons or pastel icon-tile backgrounds are forbidden.

#### FR-5xx — Module landing scoring rubric

- **FR-501**: A module landing scores **3/3** if and only if it satisfies FR-101..106, FR-201..207, and FR-301..304 with zero exceptions. Missing/legacy `Header` import demotes to 2/3.
- **FR-502**: A module landing scores **2/3** if it composes ≥4 of the page-shell primitives correctly but mixes them with at least one legacy pattern (typically a residual `Header` import or a single `text-3xl font-bold` opener). Track residuals in §2B of `IMPLEMENTATION_PLAN.md`.
- **FR-503**: A module landing scores **1/3** if its top-level shell is generic shadcn (`Card` + `CardHeader` + `CardContent` ladder), uses `bg-gray-*` semantic surfaces, or fails any FR-2xx forbidden-pattern rule on the landing file itself. Track in §2A of `IMPLEMENTATION_PLAN.md`.
- **FR-504**: An operational landing that intentionally departs from `ModuleLanding` (e.g. `kitchen/page.tsx → ProductionBoardClient`) MUST declare the exception in `IMPLEMENTATION_PLAN.md` §1.x with a one-line justification AND attach `data-design-system-shell="operational"` to its top-level container. Without both, it is scored as 1/3 drift.

#### FR-6xx — Authoring workflow

- **FR-601**: When authoring a new module landing, the author MUST first check whether `ModuleLanding` from `packages/design-system/components/blocks/module-landing.tsx` already covers the use case. Only when the module has a specific operational pattern (kitchen, dev-console, mobile-kitchen) is it allowed to bypass `ModuleLanding`.
- **FR-602**: When introducing a new shared shell primitive (e.g. a new "command bar variant", "metric tile", "filter rail group"), the author MUST add it to `packages/design-system/components/blocks/page-shell.tsx` (or a sibling file under `blocks/`) — not to `apps/app/app/(authenticated)/components/`. App-local shell components are tech debt by definition.
- **FR-603**: Every PR that touches a module landing MUST run the §3.6/§3.7/§3.8/§3.11/§3.12 cross-cutting counts on the touched files and assert that none of those counts increased. The CI workflow `e2e-workflows` (per `AGENTS.md`) is the enforcement surface.

### Key Entities

- **PageCanvas**: The white-canvas outer container. Owns top/bottom padding (`section=80px`), max-width, and the `editorial-surface-reset` reset.
- **CommandBand**: The hero region — `Header` (eyebrow + heading), `Body` (lede paragraph), `Actions` (primary + secondary CTA cluster), `Lede` (caption row).
- **MetricBand**: The KPI row — `MetricCell` × N, each with `Label` (mono uppercase), `Value` (numeric display), `Delta` (% change pill).
- **OperationalColumn**: The vertical operational ladder — section heads + lists + nested rows + lines.
- **ResearchTable**: Editorial row stack — title left, taxonomy pill center, mono date right, hairline divider.
- **BlogFilterChip**: Coral taxonomy pill — `tone="coral|active|ghost"` + optional `selected`.
- **ContactFormCard**: 22px-radius white form panel — owns header + form body slot + submit pill + footnote.
- **DarkFeatureBand / NavyFeatureBand**: Deep-green or navy hero band for the operations command-center pattern.
- **ModuleLanding**: The high-order primitive at `packages/design-system/components/blocks/module-landing.tsx` that composes the above ladder for the common case (settings, tools, logistics, payroll). Apps inject `linkComponent` to wire `next/link`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of `apps/app/app/(authenticated)/*` module landings score 3/3 against FR-501. Current baseline: 13 of 25 score 3/3 (per §2 module scoring, pass #12). Target: 25 of 25.
- **SC-002**: §3.6 `text-3xl|4xl + font-bold` count drops to 0 across `apps/app/app/(authenticated)/*`. Current baseline: 114/106. Target: 0.
- **SC-003**: §3.7 `shadow-{sm,md,lg,xl,2xl}` count on non-overlay surfaces drops to 0. Current baseline: 66/52. Target: 0.
- **SC-004**: §3.8 decorative pastel `bg-*-(50|100|200)` count drops to ≤ 5 (calendar event-type taxonomy + analytics chart palette are documented exceptions). Current baseline: 375/86. Target: ≤ 5.
- **SC-005**: §3.11 strict bare-`<Card>` opener count drops to 0. Current baseline: 183/96. Target: 0.
- **SC-006**: §3.12 `border-b` tab-strip count drops to 0. Current baseline: 4. Target: 0.
- **SC-007**: §3.10 `next/*` boundary violations in `packages/` stay at 0 (already achieved 2026-05-02 per `AGENTS.md`). Target: 0 (regression budget).
- **SC-008**: Every new module landing PR adds zero new occurrences to the §3 counts on the touched files (enforced by the §3.6/§3.7/§3.8/§3.11/§3.12 sweep ratchet).
- **SC-009**: The cross-cutting audit subagent re-run on `IMPLEMENTATION_PLAN.md` (the next pass after this spec lands) reports a non-zero net improvement on at least 4 of the 5 §3 sweeps. If counts regress on 2+ sweeps, the §1.x exception list is auto-reviewed and tightened.
- **SC-010**: An operator unfamiliar with the system can identify the four "where am I / what is this / what can I do / what is the state" anchors on any module landing within 2 seconds of viewport load (User Story 1 acceptance). Verified by 5-operator usability test, ≥ 4 of 5 succeeding.

## Cross-references

- `DESIGN.md` (root) — color, typography, radius, spacing, component tokens.
- `IMPLEMENTATION_PLAN.md` §0 (foundations), §1 (global shell), §2 (module shells), §3 (cross-cutting patterns), §5 (missing specs — this is §5.1).
- `AGENTS.md` — package boundary rules, validation commands, hygiene baselines.
- `packages/design-system/components/blocks/page-shell.tsx` — primitive exports (`PageCanvas`, `CommandBand`, `MetricBand`, `OperationalColumn`, `SectionHeader`, `StatusPill`, `FilterRail`, plus 11 flagship Cohere blocks landed in §0.5).
- `packages/design-system/components/blocks/module-landing.tsx` — the high-order shell primitive (§0.11).
- `packages/design-system/components/blocks/{announcement-bar,hero-photo-card,agent-console-card,dark-feature-band,navy-feature-band,trust-logo-strip,capability-card,product-card,blog-filter-chip,research-table,contact-form-card,footer-newsletter}.tsx` — the 11 flagship blocks (§0.5).
- `packages/design-system/components/ui/{button,card,dialog,form}.tsx` — primitive surfaces with cva variant systems (§0.6, §0.7, §0.8).

## Out of scope

- Marketing site shell (three-zone nav) — owned by `apps/web`, distinct contract.
- Mobile-kitchen agent surface (`apps/app/app/(mobile-kitchen)/*`) — operational pattern, documented exception per FR-504.
- Native mobile app (§4.28) — platform unspecified, separate spec required.
- Dev-console (`apps/app/app/(dev-console)/*`) — internal admin, separate spec required.
