# Convoy Salvage + Integration Spec

Purpose
- Capture working pieces from prior repos and map them into the Convoy (next-forge) foundation.
- Define a phased migration path for web/admin vs mobile without losing the working core systems.

Scope
- Web/admin SaaS + CRM + operations dashboard.
- Mobile/kitchen app for prep tasks + shift scheduling + time clock.
- Multi-tenant data model with strict isolation and real-time where required.

Setup Discipline (Required)
- Follow all relevant setup steps from official docs end-to-end (install, env, scripts, generators, integration).
- No minimal patterns or partial installs; wire into the actual repo files.
- If blocked or missing secrets, stop and ask before proceeding.

Sources (legacy repos)
- C:\Projects\Capsule (Supabase schema contract + multi-module schema + syncing between modules)
- C:\Projects\Shift-Stream (scheduling app with clear data model)
- C:\Projects\Battle-Boards (battle board parsing + print-ready UI)
- C:\Projects\Kitchen-Manager-Module (JSON schemas + policies for event/run reports)
- C:\Projects\Mikes Module (TPP PDF parsing pipeline + allergen/policy configs)
- C:\Projects\PrepChefApp (prep lists, recipes, events, tasks + mobile focus)
- C:\Projects\caterkingapp (API contracts + migrations, multi-tenant Supabase)
- C:\Projects\codemachine (monorepo blueprint, system scope + docs)
- C:\Projects\hq-operations (module separation + architecture diagrams)
- C:\Projects\CaterKing (Nx migration intent)

Convoy Foundation (current)
- apps/app: main Next.js app (use for admin/web SaaS)
- apps/web: marketing site (port 2222)
- packages/database: Prisma stub only (needs real schema)
- packages/auth: default next-forge auth (needs Supabase alignment if staying with RLS)
- packages/design-system: shared UI kit
- apps/api: API server (if used)

Working Assets to Salvage

1) Capsule
- Value: strongest multi-tenant schema + RLS contract + module boundaries.
- Key artifacts:
  - supabase/Schema Contract v2.txt: mandatory patterns for tenant schemas, RLS, audit, realtime, and FK strategy.
  - supabase/migrations: tenant_kitchen, tenant_events, tenant_inventory, tenant_staff, tenant_crm, tenant_admin, platform.*
- Port to Convoy:
  - Use as database source of truth and migration ordering.
  - Recreate schema contract in Convoy migrations (prefer SQL migrations to keep RLS patterns).

2) Shift-Stream
- Value: clean scheduling data model and flows.
- Key entities: companies, users, venues, shifts, shift_team_members, breaks, time_off_requests, time_adjustment_requests.
- Port to Convoy:
  - tenant_staff schema tables (shifts, availability, time entries, time off) in Supabase.
  - Mobile app: staff shift view + clock in/out.

3) Battle-Boards
- Value: document parsing + printable battle board.
- Key assets: shared parsers (CSV staff schedule, TPP PDF parser, PDF extraction), battle board types.
- Port to Convoy:
  - Create an ingestion pipeline that takes CSV/TPP PDF, normalizes into event + staffing + menu blocks.
  - Battle Board module in web/admin (print preview + PDF export).

4) Kitchen-Manager-Module
- Value: schemas and policies for event/run reports.
- Key assets: event.schema.json, runreport.schema.json, policies for allergens and staffing ratios.
- Port to Convoy:
  - Use schemas as validation targets after parsing.
  - Use policies in ingestion pipeline and kitchen dashboards.

5) Mikes Module
- Value: complete PDF parsing pipeline + state model + UI review flow.
- Key assets: PDF extraction, TPP parser, allergen/policy configs, validation flags, report export.
- Port to Convoy:
  - Extract parsing logic into packages (server or worker) and reuse in battle boards + kitchen manager.

6) PrepChefApp
- Value: working prep list + event integration + mobile-first kitchen flows.
- Port to Convoy:
  - Use as product behavior reference for kitchen tasks, prep lists, recipes, event-prep links.
  - Mobile app scope (kitchen prep + shift scheduling).

7) caterkingapp
- Value: API contracts and multi-tenant endpoints.
- Key assets: specs/001-catering-ops-platform/contracts/*.yaml (prep lists, recipes, events, tasks, CRM).
- Port to Convoy:
  - Use OpenAPI contracts as API reference while wiring Convoy endpoints.

8) codemachine
- Value: blueprint for full system scope and module list.
- Port to Convoy:
  - Use as feature inventory; prefer actual working code from Capsule/PrepChef/Mikes for implementation.

9) hq-operations
- Value: separation between admin/web and mobile, plus cross-module data flow diagrams.
- Port to Convoy:
  - Use architecture diagram to validate module boundaries + event-driven integrations.

Domain Model Baseline (authoritative)
- Use Capsule schema contract as the canonical model.
- Multi-tenancy pattern:
  - platform.accounts for tenant records (no tenant_id).
  - tenant.* schemas for operational tables (all include tenant_id + soft delete + RLS).
  - tenant.locations for location scoping where needed (events, inventory, equipment).
- Core modules (schemas):
  - tenant_staff: employees, shifts, time entries, availability, time off, assignments.
  - tenant_events: events, menus, timelines, staffing assignments.
  - tenant_kitchen: prep tasks, recipes, recipe versions, task claims, kitchen realtime.
  - tenant_inventory: items, locations, stock, transactions.
  - tenant_crm: companies, contacts, deals, activities.
  - tenant_admin: reports, workflows, audits, notifications.

Module Split (Convoy)
- Web/admin (apps/app):
  - Events + Battle Boards + Kitchen Manager + Inventory + CRM + Scheduling + Admin.
  - Print-ready battle board and event briefing export.
- Mobile (new app to add under apps/mobile):
  - Kitchen tasks, prep lists, recipe view, shift scheduling, time clock.
  - Offline-first considerations later; start with realtime updates.

Key Cross-Module Flows
- Event created -> battle board auto-populates -> printable export.
- Event created -> prep tasks generated -> kitchen task claims + realtime progress.
- Event menu + allergens -> kitchen run report + staffing ratios check -> flags.
- Shifts + time entries -> payroll/export pipeline.

Decisions (proposed defaults)
- Database: Supabase Postgres + SQL migrations aligned to Capsule Schema Contract v2 (for RLS, audit, realtime).
- Auth: Supabase Auth to match RLS model; adjust next-forge auth package accordingly.
- API style: REST endpoints matching caterkingapp OpenAPI contracts (later add event-driven jobs if needed).

Phased Migration Plan

Phase 0: Inventory + alignment (now)
- Freeze this spec and treat it as source of truth for migration.
- Identify any missing capabilities in Convoy foundation that block Supabase usage.

Phase 1: Data model + migrations
- Port Capsule migrations into Convoy (SQL migrations first; keep schema contract intact).
- Add tenant schemas, RLS, audit, and realtime settings.
- Confirm core tables for events, kitchen tasks, inventory, staff, CRM.

Phase 2: Shared domain packages
- Create shared domain types (events, tasks, recipes, shifts) under packages/.
- Port parsing/policy logic into a shared package (from Mikes Module + Battle-Boards + Kitchen-Manager-Module).

Phase 3: Web/admin modules
- Implement Events + Battle Boards first (highest leverage).
- Wire ingestion pipeline for TPP/CSV -> event entities -> battle board print.
- Add Kitchen Manager UI for prep tasks and inventory.

Phase 4: Mobile app
- Add Expo app under apps/mobile.
- Implement kitchen tasks + shift scheduling + time clock using Supabase realtime.

Phase 5: Integrations + reliability
- Add GoodShuffle/Nowsta integrations when core scheduling data model is stable.
- Add alerting, audit review, and reports.

Open Gaps (to fill as we implement)
- Confirm which external systems must sync first (GoodShuffle, Nowsta, TPP).
- Define minimum data model for Events, Dishes, and Staffing in Convoy (before parsing import).
- Decide how to handle legacy UI issues (keep data/logic, rebuild UI in Convoy design system).

Design Goals and Edge Cases (Owner Notes)
- Events are the shared anchor across modules; event fields stay consistent everywhere.
- Module-specific data (kitchen tasks, prep lists, staffing, CRM notes) lives in its own tables and does not appear in other modules by default.
- Future-proof for cross-module sync: allow all related tables to sync later without re-architecture.
- Real-time collaboration should work across devices and roles (e.g., kitchen mobile staff ask questions on tasks/dishes; office/admin users can respond immediately in web/admin).
- Ensure cross-module visibility paths can be enabled for edge cases without forcing full UI parity across apps.

Immediate Next Actions
- Decide on Supabase + RLS as the primary database layer (assumed here).
- Start porting Capsule schema contract and migrations into Convoy.
- Extract parsers and schemas into a shared package for reuse.

