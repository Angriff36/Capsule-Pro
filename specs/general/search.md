# Feature Specification: Global Search (Cross-Entity Search, Filters, Saved Searches)

**Feature Branch**: `general/search`
**Created**: 2026-05-02
**Status**: Draft
**Input**: User description: "Codify the search semantics, filter pill taxonomy, saved searches, and search history for the `/search` module so the existing implementation in `apps/app/app/(authenticated)/search/page.tsx` and `apps/api/app/api/search/route.ts` can be migrated to the editorial pattern (`ResearchTable` + `BlogFilterChip`) and extended with saved/recent state per `IMPLEMENTATION_PLAN.md` §2A.11."

> **Why this spec exists.** The current `/search` module ships a generic Card-grid + `<Select>` dropdown filter, no `layout.tsx`, and no saved-search or history surface. The API surface (`GET /api/search`) does a tenant-scoped multi-entity `contains` query across 7 entity groups (events, clients, contacts, venues, inventory, knowledge, tasks) and returns grouped results. Per §2A.11 of `IMPLEMENTATION_PLAN.md`, this module is "a near-perfect fit for the editorial pattern" — `ResearchTable` for results and `BlogFilterChip` (coral pill) for the type filter. This spec also adds the saved-searches and search-history capabilities the current implementation does not have so the module can graduate from 1/3 to 3/3 in §2A scoring.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Operator searches across all entities (Priority: P1)

An operator types a query into the global search input (or navigates to `/search?q=<term>`). The system queries every entity type the operator's tenant owns and returns a grouped, paginated result set. The operator must be able to identify, within 1 second of viewport load:

1. **What did the system match.** The query string is echoed back inside a `CommandBand` lede ("12 results for 'smith'").
2. **Which entity types matched.** Coral `BlogFilterChip` row exposes one chip per non-empty result group (Events, Clients, Contacts, Venues, Inventory, Knowledge, Tasks, plus future Recipes/Dishes/Staff/Leads/Proposals/Invoices/Prep Tasks per §FR-101).
3. **What are the actual results.** A `ResearchTable` for each non-empty group renders rows with title left, type+status pill center, mono date right.

**Why this priority**: Search is the operator's escape hatch — when navigation fails, search is how they find anything. The cross-entity pivot is the core value.

**Independent Test**: Given a tenant with at least one record per supported entity type, when the operator queries a term that matches at least one record per type, then a single page render returns one `ResearchTable` per group, separated by `SectionHeader`, with hairline row dividers, with **zero** `<Card>` row wrappers and **zero** `bg-*-(50|100|200)` decoratives, matching the design-system shell contract from `specs/general/design-system-shell.md`.

**Acceptance Scenarios**:

1. **Given** the operator types `"smith"` into the topbar search and submits, **When** `/search?q=smith` renders, **Then** the page composes `PageCanvas → CommandBand → DisplayHeading → CommandBandLede → BlogFilterChip row → ResearchTable × N` (one per non-empty group), with no legacy `Header` import and no `text-3xl font-bold` opener.
2. **Given** the query matches 0 records across all entity types, **When** the page renders, **Then** the empty state is the soft-stone tile primitive (`bg-soft-stone px-6 py-16 rounded-[22px]`) with icon + heading "No results for '<query>'" + body "Try a broader term or different filter" + pill primary CTA "Clear search".
3. **Given** the query is empty (`?q=` or no query param), **When** the page renders, **Then** the page surface is the saved-searches + recent-searches dashboard (US 4 + US 5), not the empty zero-results tile.

---

### User Story 2 — Operator narrows by entity type with filter pills (Priority: P1)

The operator runs a query and sees results across 5+ entity types. They tap a single coral `BlogFilterChip` (e.g. "Clients") to narrow the result list to a single type. Tapping the chip a second time deselects it; tapping a different chip switches selection.

**Why this priority**: Without filtering, a noisy query (e.g. `"smith"` against a 5,000-client tenant) is unusable. The filter pill is the visual contract for taxonomy filters across the entire app per `specs/general/design-system-shell.md` FR-104.

**Independent Test**: A `/search?q=<term>&type=clients` URL renders only the Clients `ResearchTable`, all other groups suppressed. The Clients chip renders in `tone="active"` (selected). Removing the `type` param re-renders all non-empty groups and returns the chip to `tone="coral"`.

**Acceptance Scenarios**:

1. **Given** the operator is on `/search?q=smith` with results across Events, Clients, Contacts, **When** they tap the "Clients" chip, **Then** the URL updates to `?q=smith&type=clients`, only the Clients table renders, and the chip's `tone` prop is `active`.
2. **Given** the operator has `?type=clients` selected, **When** they tap the same "Clients" chip again, **Then** the `type` param is removed and all non-empty groups re-render.
3. **Given** the operator types a new query while a type filter is active, **When** the new query returns zero matches in that type but matches in another, **Then** the filter is preserved and the zero-results state for that type is shown — the system does NOT auto-switch the filter.

---

### User Story 3 — Operator narrows by status, date range, or tag (Priority: P2)

After selecting an entity type (e.g. Events), the operator further narrows with secondary filters: status (e.g. `confirmed | pending | cancelled`), date range (event date from/to), and tags (free-form taxonomy on the underlying entity).

**Why this priority**: Status/date/tag filters are the second axis after entity-type filter. They reduce a 200-row result list to the 5 rows the operator cares about. They are P2 because the entity-type axis (US 2) already cuts the largest noise.

**Independent Test**: With `?q=smith&type=events&status=confirmed&from=2026-05-01&to=2026-12-31`, the Events `ResearchTable` returns only events whose `status === "confirmed"` AND whose `eventDate ∈ [from, to]`. Status chips and a `DateRangePicker` render alongside the entity-type chip row.

**Acceptance Scenarios**:

1. **Given** the operator has filtered to `type=events`, **When** the secondary filter rail renders, **Then** it shows status chips (`BlogFilterChip` per status value) plus a single `DateRangePicker` constrained to `eventDate`.
2. **Given** the operator selects two non-mutually-exclusive status chips (e.g. `confirmed` AND `pending`), **When** the result re-fetches, **Then** the predicate is `status IN (confirmed, pending)` — additive, not exclusive.
3. **Given** the operator clears the date range, **When** the date picker resets, **Then** the URL drops `from`/`to` params and the result re-fetches without date constraint.

---

### User Story 4 — Operator saves a search for re-run (Priority: P2)

The operator builds a useful filter combination (e.g. `q="rehearsal" + type=events + status=confirmed + from=this-quarter`) and saves it under a name ("Q3 confirmed rehearsals"). The saved search appears on the empty-query landing (`/search` with no `q` param) and on a "Saved" filter tab.

**Why this priority**: Saved searches are the difference between "I have to remember the filter combination" and "I tap once to re-run my saved view". This is mid-priority because the underlying entity-type and secondary filters (US 2 + US 3) must be solid first.

**Independent Test**: Given a saved search named "Q3 confirmed rehearsals" with filters `{q, type, status, from, to}`, when the operator opens `/search` (no query), the saved search renders as a `ResearchTable` row (title = name, pill = scope, mono right = "saved 3d ago"). Tapping the row navigates to `/search?<filter-spec>` and re-runs.

**Acceptance Scenarios**:

1. **Given** the operator has built a filtered query, **When** they tap "Save search" in `CommandBandActions`, **Then** a `ContactFormCard` modal opens asking for a name (max 80 chars) and an optional description.
2. **Given** the operator submits the save form, **When** the save succeeds, **Then** a toast confirms and the page surface adds the new saved search to the saved list at the top.
3. **Given** the operator opens the empty-query landing, **When** the saved-searches section renders, **Then** it uses a `ResearchTable` titled "Saved searches" with `MonoLabel` eyebrow.
4. **Given** the operator deletes a saved search via the row's overflow menu, **When** they confirm in the dialog, **Then** the saved search is soft-deleted and the row disappears.
5. **Given** another operator on the same tenant opens `/search`, **When** the saved-searches section renders, **Then** [NEEDS CLARIFICATION: sharing scope? Per-user only, per-tenant shareable, or per-team? The current schema does not have a `SavedSearch` model — this needs a product decision before authoring the migration.]

---

### User Story 5 — Operator re-runs a recent query from history (Priority: P3)

The operator opens `/search` (no query). The page surfaces the operator's last N queries as a "Recent searches" `ResearchTable`. Tapping a row navigates to `/search?q=<term>` and re-runs.

**Why this priority**: History is a convenience feature — saved searches (US 4) cover the explicit-intent case; history covers the implicit-intent case ("I searched for that thing this morning, what was it?"). P3 because losing it does not block daily operation.

**Independent Test**: After running 5 distinct queries in a session, when the operator opens `/search`, the recent-searches section renders the 5 queries with their result counts and timestamps. Tapping the most recent re-runs the query.

**Acceptance Scenarios**:

1. **Given** the operator has run queries `["smith", "rehearsal", "invoice 2024"]` in the last 7 days, **When** they open `/search`, **Then** the recent-searches section renders those three queries, most-recent first, deduplicated.
2. **Given** the operator runs the same query a second time, **When** the page reloads, **Then** the recent-searches list does NOT add a duplicate row — it updates the existing row's `lastRunAt` timestamp instead.
3. **Given** the operator's history is older than the retention window, **When** the page renders, **Then** [NEEDS CLARIFICATION: retention window? 30 days, 90 days, or "last 50 queries regardless of age"? Affects whether this is a TTL on a Postgres table, a capped-size buffer, or a Redis sliding window.] entries beyond the window are pruned.

---

### Edge Cases

- **What happens when the query is shorter than the minimum length** (e.g. `"a"` against a 100k-record tenant)? The API returns an early `400 Bad Request` with `manifestErrorResponse("Query too short", 400)`. The UI debounces on input and does not fetch until the query length is ≥ 2 characters. [NEEDS CLARIFICATION: minimum query length — the current API accepts any non-empty string, which is a perf risk on large tenants.]
- **What happens when the operator has zero permission to read one of the entity types** (e.g. an operator role without `inventory:read`)? The API MUST suppress that entity group from the response — not 403 the entire query. The UI MUST hide the chip for that entity type, not render it disabled. Current implementation does not enforce this — only RLS tenant scoping is enforced. [NEEDS CLARIFICATION: per-entity RBAC for search results — is this owned by this spec, or by the existing RBAC layer?]
- **What happens when the query matches more than the per-group page limit** (currently 50 hard-cap, 10 default)? The `ResearchTable` for that group shows a "View all <N> results" pill-outline link at the bottom of the group, navigating to `/search?q=<term>&type=<group>` (already-filtered URL).
- **What happens on a fuzzy/typo query** (e.g. `"smiht"` instead of `"smith"`)? The current API uses Prisma `contains` with `mode: "insensitive"` — no fuzzy match. [NEEDS CLARIFICATION: search index technology — is fuzzy match in scope (Postgres `pg_trgm` / `fuzzystrmatch`, or a dedicated index like Meilisearch/Typesense), or is exact-substring acceptable for v1?]
- **What happens when the tenant has 100k+ records in a single entity type** (e.g. inventory)? The current `contains` query without an index on the searched columns is O(N) per type per request. Performance budget per FR-901 is <200ms p95. [NEEDS CLARIFICATION: which columns get GIN/GiST/`pg_trgm` indexes? This is a follow-up migration outside the scope of this spec, but the spec should call out the perf risk explicitly.]
- **What happens when the operator pastes a multi-word query** (e.g. `"john smith catering"`)? Current implementation `contains` matches the literal substring `"john smith catering"` against each searched column — almost always returns zero results because no column contains that exact phrase. The spec must define whether multi-word queries AND-chain across columns, OR-chain across tokens, or use phrase matching. [NEEDS CLARIFICATION: tokenization semantics — token-AND, token-OR, or phrase-match?]
- **What happens when an entity is soft-deleted between query and click** (`deletedAt` set after the search returns)? The result row navigates to a 404 detail page. The result API filters `deletedAt: null` already, but TOCTOU is unavoidable — the destination route handles the 404 gracefully (existing behavior).

## Requirements *(mandatory)*

### Functional Requirements

#### FR-1xx — Search semantics

- **FR-101**: The search API MUST query every entity type owned by the tenant via Prisma read models, scoped by `tenantId` (RLS-enforced) and `deletedAt: null`. Current covered entities: `Event`, `Client`, `ClientContact`, `Venue`, `InventoryItem`, `KnowledgeBaseEntry`, plus `AdminTask` + `KitchenTask` via the unified `Task` shape. **Missing entities to add (per `prisma/schema.prisma` inventory):** `Recipe`, `Dish`, `User` (staff directory), `Lead`, `Proposal`, `Invoice`, `PrepTask`, `Equipment` (where Prisma model exists), `Ingredient`, `Menu`, `MenuDish`, `PurchaseOrder`, `PurchaseRequisition`, `VendorContract`, `CateringOrder`. Out of scope for this spec: `EntityVersion`, `OverrideAudit`, `Notification` (audit/system entities).
- **FR-102**: Each entity's searched-columns set MUST be defined in the API once and shared between the `findMany` and `count` queries. Current implementation duplicates the `baseFilter([...])` array between paired queries — that pattern is acceptable but the column lists per entity MUST be a named constant, not inline literals. The current 7 entities have these column lists: `Event {title, eventNumber, venueName}`, `Client {company_name, first_name, last_name, email, phone}`, `ClientContact {first_name, last_name, email, phone, phoneMobile}`, `Venue {name, city, contactName, contactEmail}`, `InventoryItem {name, item_number, description, category}`, `KnowledgeBaseEntry {title, content, category}`. Newly-added entities MUST publish their column lists in the same module.
- **FR-103**: All matches MUST be case-insensitive substring matches (`mode: "insensitive"`). Match scoring/weighting (e.g. title match > body match) is OUT OF SCOPE for v1 and tracked as [NEEDS CLARIFICATION: ranking — is alpha-by-recency acceptable for v1, or is relevance ranking required?].
- **FR-104**: Tenant scoping MUST be enforced in two places: (a) the Prisma `where: { tenantId }` clause, and (b) the underlying Postgres RLS policy on each `tenant_*` schema table. Search MUST never bypass RLS via `$queryRawUnsafe`.
- **FR-105**: The API response shape MUST stay backward-compatible with the current envelope: `{ groups: Record<entityType, { items, total }>, total, page, limit }`. Adding new entity types adds new keys to `groups` — does not change the envelope.
- **FR-106**: Multi-word query semantics MUST be defined explicitly. v1 default: split the query on whitespace and AND-chain tokens across the union of searched columns per entity (each token must match SOME column). [NEEDS CLARIFICATION: confirm AND vs OR vs phrase-match for v1.]
- **FR-107**: The API MUST reject queries with length < 2 characters (after trim) with `400 Bad Request` to protect the database from `O(N)` scans on a single-character `contains`.

#### FR-2xx — Filter pill taxonomy

- **FR-201**: The entity-type filter MUST render as a horizontal row of `BlogFilterChip` per non-empty result group (not a `<Select>` dropdown). Selected chip uses `tone="active"`, unselected use `tone="coral"`. The chip row is sticky beneath the `CommandBand` so it stays visible when the operator scrolls through results.
- **FR-202**: Status filters (per-entity) MUST render as a secondary `BlogFilterChip` row beneath the entity-type row, ONLY when an entity-type is selected (otherwise the status taxonomy is ambiguous across types). Status values per entity:
  - `Event { confirmed, pending, cancelled, completed, draft }`
  - `Client { active, inactive, archived }`
  - `Invoice { draft, sent, paid, overdue, voided }`
  - `Proposal { draft, sent, accepted, rejected, expired }`
  - `Lead { new, contacted, qualified, won, lost }`
  - `PrepTask { pending, in_progress, completed, blocked }`
  - other entities: status filter not exposed in v1.
- **FR-203**: Date-range filter MUST render as a single `DateRangePicker` primitive (existing in design-system) bound to the entity's primary date field (`Event.eventDate`, `Invoice.dueDate`, `Proposal.validUntil`, etc.). The bound field is per-entity and MUST be documented in the same module-local constant as FR-102 column lists.
- **FR-204**: Tag filter MUST be a free-form multi-select rendering as additional `BlogFilterChip` per active tag. Tags are sourced from the entity's `tags: string[]` Prisma column where present. [NEEDS CLARIFICATION: not all entities have a `tags` column — is this filter a v1 requirement or v2?]
- **FR-205**: Filter state MUST round-trip via URL params (`q`, `type`, `status`, `from`, `to`, `tags`). Bookmarking and sharing a filtered URL MUST reproduce the exact result set on the same tenant.
- **FR-206**: Filter chips MUST never use shadcn `<Tabs>` or `<Select>`. The current `<Select>` dropdown in `apps/app/app/(authenticated)/search/page.tsx:258-270` is the legacy pattern this spec replaces.

#### FR-3xx — Saved searches

- **FR-301**: A saved search MUST persist `{ id, tenantId, ownerId, name, description?, filterSpec: JSON, createdAt, updatedAt, deletedAt }` in a new Prisma model `SavedSearch` under the `tenant_*` schema appropriate for cross-cutting user data. `filterSpec` is the serialized URL-param map (`{ q, type, status, from, to, tags }`).
- **FR-302**: Saved searches MUST be listable, creatable, deletable per the manifest command pattern (`POST /api/saved-searches/commands/create`, `POST /api/saved-searches/commands/delete`, `GET /api/saved-searches`). Updates rename or modify `filterSpec` via `commands/update`.
- **FR-303**: Saved searches MUST appear on `/search` (no query) as a `ResearchTable` titled "Saved searches" with `MonoLabel` eyebrow `OPERATIONS / SAVED`. Row layout: title (name) left, scope pill (type filter or "All types") center, mono right ("saved <relative-time>" + overflow menu).
- **FR-304**: Sharing scope of a saved search MUST be defined. v1 default: per-user (only the `ownerId` operator sees their own saved searches). [NEEDS CLARIFICATION: do we want per-tenant shared saved searches in v1? If so, add `visibility: 'private' | 'shared'` field. If shared, who can edit/delete — owner only, or any tenant member?]
- **FR-305**: A saved search whose `filterSpec` becomes invalid (e.g. references a deleted tag, a status value the entity no longer supports) MUST still render in the list but with a `BlogFilterChip tone="ghost"` "Filters out of date" chip beneath the row. Tapping the row re-runs the search; invalid params are silently dropped server-side.

#### FR-4xx — Search history

- **FR-401**: Search history MUST persist per-user with shape `{ ownerId, tenantId, query, filterSpec, resultCount, lastRunAt, runCount }`. Distinct (ownerId, query, filterSpec) combinations are deduplicated — re-running the same query updates `lastRunAt` and increments `runCount` rather than creating a new row.
- **FR-402**: History MUST surface on `/search` (no query) as a `ResearchTable` titled "Recent searches" with `MonoLabel` eyebrow `OPERATIONS / RECENT`. Row layout: title (query string + scope pill) left, mono right ("<resultCount> results · <relative time>").
- **FR-403**: History retention MUST be capped to [NEEDS CLARIFICATION: last 50 queries per user, OR 30-day TTL, OR both? The choice affects whether the storage is a Postgres table with a cleanup job or an in-memory Redis-backed sliding window.]
- **FR-404**: History entries MUST be pruned when the operator's account is deleted (foreign-key cascade or soft-delete sweep — whichever the existing user-deletion flow uses).
- **FR-405**: A "Clear history" pill-outline button MUST appear in `CommandBandActions` on the empty-query landing. Tapping opens a `Dialog` confirmation and on confirm deletes all history rows for the operator.

#### FR-5xx — Results UI (editorial pattern)

- **FR-501**: Each non-empty result group MUST render as a `ResearchTable` per `specs/general/design-system-shell.md` FR-102. Row layout: title left, entity-type-and-status pill center, mono date right, hairline divider. The current `<Card>` grid (`grid auto-rows-min gap-6 md:grid-cols-3`) is the legacy pattern this spec replaces.
- **FR-502**: Each group MUST be preceded by a `SectionHeader` with `MonoLabel` eyebrow (`OPERATIONS / EVENTS`, `OPERATIONS / CLIENTS`, etc.) and a count pill (e.g. `12`).
- **FR-503**: When a group's `total` exceeds the per-page limit, a "View all <N> results" `BlogFilterChip tone="ghost"` MUST render at the bottom of the group, linking to `/search?q=<term>&type=<group>`.
- **FR-504**: Pagination MUST use the existing `pageIdx`-style pill pair (Previous / Next pill-outline buttons + "Page <N>" mono caption), not a numbered page selector. Pagination state lives in the URL (`?page=`).
- **FR-505**: Loading state MUST use 3 `Skeleton` rows per group (not the current Card-shaped skeletons), matching the `ResearchTable` row height.
- **FR-506**: The empty-query landing (no `?q=`) MUST surface saved searches + recent searches stacked vertically in `OperationalColumn` order: saved first (more intentful), recent second. If both are empty, show the soft-stone tile primitive with an icon, heading "Search", body "Use the topbar search to find events, clients, recipes, and more", and a pill primary CTA pointing at the topbar.
- **FR-507**: The zero-results state (with `?q=` set, total=0) MUST use the soft-stone tile primitive per `specs/general/design-system-shell.md` FR-105: `bg-soft-stone px-6 py-16 rounded-[22px]`, central icon, heading "No results for '<query>'", body "Try a broader term or different filter", pill primary CTA "Clear search" (clears `q` and re-renders the empty-query landing).

#### FR-6xx — Module shell contract (inherited)

- **FR-601**: The `/search` module MUST satisfy every requirement in `specs/general/design-system-shell.md` (FR-101..106 composition, FR-201..207 forbidden patterns, FR-301..304 tokens). Specifically: replace the legacy `Header` import with `CommandBand`, replace `text-3xl font-bold` opener with `DisplayHeading`, replace `<Select>` with `BlogFilterChip` row, replace `<Card>` grid with `ResearchTable`, replace `<Empty>` empty state with the soft-stone tile primitive.
- **FR-602**: A `layout.tsx` MUST be added at `apps/app/app/(authenticated)/search/layout.tsx` to host the `PageCanvas` and shared chrome (mono-eyebrow taxonomy crumb `Operations / Search`). Currently absent — see §2A.11 of `IMPLEMENTATION_PLAN.md`.
- **FR-603**: Score target: 3/3 per `specs/general/design-system-shell.md` FR-501. Current baseline: 1/3.

#### FR-9xx — Performance and observability

- **FR-901**: Median query latency target: <100ms p50, <200ms p95, <500ms p99 for typical queries (single token, 7-entity sweep, default 10-row limit) on a tenant with up to 100k records per primary entity. Breaches MUST emit a `search.slow_query` event to `@repo/analytics` and trigger a Sentry breadcrumb.
- **FR-902**: Every search query MUST emit `analytics.capture("search:query", { query, type?, status?, resultCount, latencyMs })`. Already partially implemented (`search:query` is captured client-side in `apps/app/app/(authenticated)/search/page.tsx:183`); extend to include the resolved filter spec and server-measured latency.
- **FR-903**: Search index strategy MUST be documented as a follow-up. v1 default is Postgres `contains` with no fuzzy match — acceptable below ~50k records per entity. Above that threshold, [NEEDS CLARIFICATION: search index technology — `pg_trgm` GIN indexes, dedicated Meilisearch/Typesense service, or Postgres `tsvector` full-text? Affects relevance ranking, fuzzy match, and infra ownership.]

### Key Entities

- **SearchQuery (request)**: `{ q, type?, status?, from?, to?, tags?, page, limit }`. Round-trips via URL params.
- **SearchResult (response)**: `{ groups: Record<entityType, { items, total }>, total, page, limit }`. Items shape is per-entity-type and uses a thin Prisma `select` projection (id, tenantId, plus 4–6 display fields per FR-102).
- **EntityGroup**: One key in the `groups` map. Currently 7 (events, clients, contacts, venues, inventory, knowledge, tasks). Target: ≥ 15 once FR-101 missing entities are added.
- **SavedSearch (Prisma model — to add)**: `{ id, tenantId, ownerId, name, description?, filterSpec: Json, createdAt, updatedAt, deletedAt }`. Indexed by `(tenantId, ownerId, deletedAt)`.
- **SearchHistoryEntry (Prisma model — to add)**: `{ id, tenantId, ownerId, query, filterSpec: Json, resultCount, lastRunAt, runCount, createdAt }`. Indexed by `(tenantId, ownerId, lastRunAt DESC)`. Unique on `(ownerId, query, filterSpec_hash)`.
- **BlogFilterChip**: Coral taxonomy pill — used for entity-type, status, and tag filters. Inherited from design-system.
- **ResearchTable**: Editorial row stack — used for every result group AND for saved/recent search lists on the empty landing. Inherited from design-system.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `/search` module score in `IMPLEMENTATION_PLAN.md` §2A scoring goes from 1/3 to 3/3. Verified by: zero `<Card>` row wrappers, zero `bg-*-(50|100|200)` decoratives, zero `text-3xl font-bold` openers, zero `<Select>` filter, presence of `ResearchTable` + `BlogFilterChip` + `layout.tsx`.
- **SC-002**: Cross-entity search covers ≥ 15 entity types (currently 7). Verified by `GET /api/search?q=<term>` returning a `groups` map with ≥ 15 keys when matches exist for each.
- **SC-003**: p95 query latency stays under 200ms on a fixture tenant of 50k records per entity. Verified by an automated perf test in `apps/api/__tests__/search/perf.test.ts` (to add).
- **SC-004**: Saved searches and search history are persisted, listable, deletable. Verified by an E2E test (`e2e/workflows/search.workflow.spec.ts` to add) that runs a query, saves it, reloads `/search`, taps the saved row, and verifies the filter is re-applied.
- **SC-005**: The recent-searches list deduplicates by `(ownerId, query, filterSpec)`. Verified by running the same query twice and asserting `runCount === 2` on the single history row.
- **SC-006**: Operator can identify the four shell anchors ("where am I / what is this / what can I do / what is the state") on `/search` within 2 seconds of viewport load, per `specs/general/design-system-shell.md` SC-010.
- **SC-007**: Zero new occurrences of forbidden patterns (FR-201..207 of design-system-shell) in the touched files after migration. Enforced by the CI ratchet per design-system-shell SC-008.
- **SC-008**: Multi-word queries return results matching the documented tokenization semantics (FR-106). Verified by unit tests covering single-token, multi-token AND, and mismatched-token scenarios.

## Cross-references

- `specs/general/design-system-shell.md` — shell composition, forbidden patterns, tokens, scoring rubric (this spec inherits the shell contract).
- `specs/general/events.md` — `Event` entity searched columns (FR-102) and status taxonomy (FR-202) source.
- `specs/general/calendar.md` — date-range semantics shared with calendar filters.
- `IMPLEMENTATION_PLAN.md` §2A.11 — `/search` module 1/3 baseline and the editorial-pattern adoption plan.
- `IMPLEMENTATION_PLAN.md` §5.9 — this spec's quest marker.
- `apps/app/app/(authenticated)/search/page.tsx` — current legacy implementation (Card grid + Select).
- `apps/api/app/api/search/route.ts` — current API surface (7-entity tenant-scoped Prisma `contains` sweep).
- `packages/database/prisma/schema.prisma` — entity inventory for FR-101 expansion target.
- `packages/design-system/components/blocks/research-table.tsx` — `ResearchTable` primitive.
- `packages/design-system/components/blocks/blog-filter-chip.tsx` — `BlogFilterChip` primitive.

## Out of scope

- **Relevance ranking / weighting beyond date-recency.** v1 orders results by the entity's primary recency field (`createdAt`, `updatedAt`, `eventDate`, etc.). Score-based ranking is a v2 concern tracked under FR-903.
- **Fuzzy matching / typo tolerance.** v1 is exact-substring case-insensitive. Fuzzy is gated on the search-index decision (FR-903).
- **Cross-tenant search.** Search MUST never return cross-tenant results. Multi-tenant operator surfaces (e.g. a future support-console) are a separate spec.
- **Search inside file attachments / OCR'd documents.** Out of scope — would require a dedicated indexing pipeline.
- **Natural-language query parsing.** "Find events in May with revenue over 10k" is a v3 concern, not v1.
- **Saved-search sharing UI for cross-team collaboration.** Gated on the FR-304 sharing-scope decision; v1 ships per-user only if the decision lands as `private`.
- **Marketing site search** (`apps/web`) — distinct surface, distinct corpus.
- **Mobile-kitchen agent search** — operational pattern, separate spec required per `specs/general/design-system-shell.md` FR-504.
