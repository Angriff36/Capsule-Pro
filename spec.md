# Convoy Salvage + Integration Spec

Purpose

- Preserve the legacy features we still care about (landing page, docs, API,
  admin) while wiring the work into the existing Convoy stack (Prisma + Neon +
  Clerk).
- Capture what needs to land inside the deployed foundation so future automation
  has the right targets.

Scope

- Web/admin SaaS dashboard, CRM, and operations tooling served from `apps/app`
  (Next.js).
- Mobile kitchen prep + scheduling companion app (Android + iOS) that
  reads/writes the same database and surfaces the workflows kitchen staff need.
- Multi-tenant data model with Prisma/Neon backing, audit metadata, and realtime
  updates where the product demands them.

Setup Discipline (Required)

- Follow every relevant step documented for this repo; run `pnpm` (never `npm`
  or `yarn`) and honor the scripts that build docs, API, and UI.
- Keep changes inside the current repo structure (`apps/app`, `apps/web`,
  `apps/api`, `docs`, `packages/*`) so the deployed pipelines stay healthy.
- If you encounter missing secrets, blocked services, or anything unexpected,
  pause and ask before continuing.

Sources (legacy repos)

- C:\Projects\Capsule (schema registry + contract that mostly moved into
  Prisma/Neon + metadata about tenancy, policies, and realtime expectations)
- C:\Projects\Shift-Stream (scheduling data model and mobile-friendly shift
  flows)
- C:\Projects\Battle-Boards (PDF ingestion + print-ready battle board export)
- C:\Projects\Kitchen-Manager-Module (event/run report schema + policy
  enforcement)
- C:\Projects\Mikes Module (PDF parsing logic, TPP, allergen configs)
- C:\Projects\PrepChefApp (prep lists + combination logic for batch prep)
- C:\Projects\caterkingapp (REST API contracts for recipes, prep lists, events,
  tasks, CRM)
- C:\Projects\codemachine (deep architectural notes and attempted
  implementations)
- C:\Projects\hq-operations (module boundaries + event flow diagrams)
- C:\Projects\CaterKing (Nx migration intent and multi-app lessons)

Convoy Foundation (current)

- `apps/app`: main Next.js admin/operator portal (deployed, working). Continues
  hosting Events, Kitchen, Battle Boards, Scheduling, Inventory, CRM, etc.
- `apps/web`: marketing/landing site (port 2222 locally, production ready).
- `apps/api`: REST API that already talks to Prisma/Neon and backs the UI
  layers.
- `docs/`: Mintlify-hosted documentation (runs on port 2232 locally); treat it
  as part of the delivery.
- `packages/database`: Prisma schema + generated client wired to Neon; schema
  already contains tenant, event, kitchen, outbox tables.
- `packages/auth`: Clerk provider (with theming) is authoritative for
  session/auth flows.
- `packages/design-system`: shared UI primitives.
- Deployments already include landing page, app, API, and docs, so keep any
  changes aligned with that pipeline.

Highlighted Legacy Assets

1. Capsule

- Value: Schema registry/contract plus tenant-aware catalog.
- Key artifacts:
  - `supabase/Schema Contract v2.txt`: tenant patterns, audit columns, realtime
    expectations.
  - `supabase/migrations`: event, kitchen, inventory, staff, CRM tables.
- Keep the tenant model in Prisma/Neon while honoring the original contract for
  audits and realtime columns.

2. Shift-Stream

- Value: proven scheduling data model and mobile shift flows.
- Key entities: companies, users, venues, shifts, shift_team_members, breaks,
  time_off_requests, time_adjustment_requests.
- Reuse the logical model for Prisma and the new mobile scheduling screens.

3. Battle-Boards

- Value: document parsing and print-ready battle board exports.
- Key assets: CSV staff schedule parser, TPP/PDF parser, extraction modules.
- Re-implement the ingestion pipeline so `apps/app` can normalize TPP/CSV/PDF
  data into events, staffing, and printable briefs.

4. Kitchen-Manager-Module

- Value: event/run report schema plus policies for allergens and staffing
  ratios.
- Key assets: `event.schema.json`, `runreport.schema.json`, policy rules.
- Surface those schemas and policies in the parsing/validation flow and show
  violations in the Kitchen Manager dashboards.

5. Mikes Module

- Value: PDF parsing, TPP logic, allergen configs, validation flags, report
  exports.
- Key assets: PDF extractor + parser + validation pipeline.
- Extract these pieces into a shared package or worker so both battle board and
  kitchen manager layers can reuse them.

6. PrepChefApp

- Value: bulk combination logic for prep lists and event integration.
- Use the prep/recipe behavior as a reference for the web UI and upcoming mobile
  prep lists.

7. caterkingapp

- Value: REST API contracts for recipes, prep lists, events, tasks, CRM.
- Keep the OpenAPI specs nearby to guide `apps/api` so we stay aligned with the
  existing ops contracts.

8. codemachine

- Value: deep planning docs and possible blockers for phased delivery.
- Keep the architecture notes for reference and salvage any reusable insights.

9. hq-operations

- Value: diagrams that show how admin/web vs. mobile should interact.
- Use those diagrams to validate how realtime data and shared packages glue the
  modules together.

Domain Model Baseline (authoritative)

- The Capsule schema contract remains canonical, but it now lives inside
  Prisma/Neon (`packages/database/prisma/schema.prisma`).
- Multi-tenancy pattern uses `tenant_id` on all operational tables plus
  audit/soft delete columns.
- Core modules:
  - `tenant_staff`: users, shifts, availability, time entries, time off,
    assignments.
  - `tenant_events`: events, menus, timelines, staffing assignments.
  - `tenant_kitchen`: prep tasks, recipes, recipe versions, task claims,
    realtime progress.
  - `tenant_inventory`: items, locations, stock, transactions.
  - `tenant_crm`: companies, contacts, deals, activities.
  - `tenant_admin`: reports, workflows, audits, notifications.

Module Split (Convoy)

- Web/admin (`apps/app`): Events + Battle Boards + Kitchen Manager + Inventory +
  CRM + Scheduling + Admin. Print-ready battle boards and event briefs remain
  here. Kitchen task data also surfaces in the admin experience so owners and
  operators can follow a live production board, drill into recipes, and monitor
  the mobile crews.
- Mobile companion (Android + iOS): Focus on the tap-first kitchen prep and
  scheduling flows (recipes, prep lists, task claims, time clock). Share the
  same Prisma/Neon data, Clerk sessions, and Ably/Knock realtime streams as the
  web app while keeping the UI streamlined for small screens. Itemize which
  capabilities stay mobile-only (task claiming, quick completion, time clock)
  vs. what the web app must mirror (read-only boards, reporting, event
  supervision).

Key Cross-Module Flows

- Event created/updated in `apps/app` -> ingestion pipeline normalizes
  TPP/CSV/PDF data -> battle board + kitchen run report + print exports.
- Event metadata (menu, allergens, staffing) -> prep tasks + kitchen task claims
  with realtime progress streaming to the mobile companion.
- Prep lists + bulk combination logic -> inventory adjustments -> run reports
  with allergen/staff policies.
- Shift scheduling/time entries (web + mobile) -> payroll/export pipelines
  feeding accounting systems.
- Kitchen tasks claimed/completed on mobile -> Ably/Outbox events refresh the
  web-based production board and owner dashboards; web actions (notes,
  approvals) feed back to mobile staff through the same realtime bus so both
  surface consistent states.

Decisions (proposed defaults)

- Database: Prisma/Neon with the schema under
  `packages/database/prisma/schema.prisma`; keep tenant-aware tables, audit
  fields, outbox/realtime support.
- Auth: Clerk (as implemented) is the session/auth source of truth; plan
  web/mobile auth flows around Clerk tokens or session bridging.
- API style: REST endpoints in `apps/api`, matching the contracts in
  `caterkingapp` when practical; docs hosted in `docs/` should mirror the same
  surface.

Phased Migration Plan

Phase 0: Inventory + alignment (now)

- Treat this spec as the current plan for the Prisma/Neon + Clerk stack.
- Identify the gaps between legacy capabilities (parsing, prep logic, battle
  board) and the running codebase.

Phase 1: Domain model embodiment

- Ensure the Prisma schema reflects the Capsule tenant tables, audit columns,
  realtime expectations, and outbox patterns.
- Validate the schema against the existing contracts for events, kitchen tasks,
  inventory, staff, and CRM.

Phase 2: Shared packages + parsing

- Create shared domain types (events, tasks, recipes, shifts) under `packages/`
  to prevent duplication.
- Move parsing/policy logic (Battle Boards, Kitchen Manager, Mikes Module) into
  reusable packages/workers.
- Surface prep combination logic from PrepChefApp so all clients share the same
  rules.

Phase 3: Web/admin refinement

- Expand Events + Battle Boards in `apps/app`, include print-ready exports, and
  reintroduce ingestion from TPP/CSV/PDF briefs.
- Build Kitchen Manager dashboards for prep tasks, inventory, and policy
  validation.

Phase 4: Mobile kitchen companion

- Add Android/iOS mobile app under `apps/mobile` (can be Expo or another
  framework compatible with the repo).
- Support kitchen prep + scheduling flows only (recipes, prep lists, task
  claims, time clock).
- Connect to the same Prisma/Neon database via `apps/api` and reuse Clerk for
  auth.

Phase 5: Integrations + reliability

- Layer in GoodShuffle/Nowsta integrations when scheduling/prep data stabilize.
- Improve observability, alerting, audit review dashboards, and export-ready
  reports.

Open Gaps (to fill as we implement)

- Which parsing features (Capsule, Battle-Boards, Mikes Module) should be
  prioritized for reintroduction?
- What is the minimal schema for Events + Recipes + Staffing that both web and
  mobile prep experiences rely on?
- How much of the legacy UI needs recreation versus a redesign in the current
  design system?

Design Goals and Edge Cases (Owner Notes)

- Events remain the shared anchor; every module consumes identical event fields.
- Module-specific data (prep lists, staffing notes, CRM comments) stays in its
  dedicated tables but connects via shared events.
- Cross-module sync should be achievable without rearchitecting (shared
  packages + event hooks).
- Real-time collaboration across web and mobile (kitchen staff vs. office
  operators) is essential; refresh points should respect the prep workflow.
- Provide targeted visibility for edge cases without forcing UI parity across
  apps.

Immediate Next Actions

- Collect parsing/TPP/combination logic (PrepChefApp + Mikes) and place it into
  shared packages so the web/mobile apps can reuse it.
