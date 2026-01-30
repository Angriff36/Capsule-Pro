# Tasks: Database Documentation and Integrity Fixes

Feature ID: 004
Total Tasks: ~220
Estimated Iterations: ~45
Constitution: 1.0.0

## Phase 1: Foundation (3 tasks)

- [x] T001 Create directory structure and base files
  - **Do**:
    1. Create `docs/database/` directory if not exists
    2. Create subdirectories: `schemas/`, `tables/`, `migrations/`, `enums/`, `hooks/`
    3. Create `docs/database/README.md` with overview, methodology, living docs philosophy
    4. Create `docs/database/SCHEMAS.md` with all schemas overview
    5. Create `docs/database/KNOWN_ISSUES.md` populated with 4 known FK issues
    6. Create `docs/database/CONTRIBUTING.md` with how-to-update guide
    7. Create `docs/database/_templates/` with schema and table templates
  - **Files**: `docs/database/README.md`, `docs/database/SCHEMAS.md`, `docs/database/KNOWN_ISSUES.md`, `docs/database/CONTRIBUTING.md`, templates
  - **Done when**: Directory structure exists with all root files
  - **Verify**: `test -d "C:/projects/capsule-pro/docs/database" && test -d "C:/projects/capsule-pro/docs/database/schemas" && test -d "C:/projects/capsule-pro/docs/database/tables" && echo "OK"`
  - **Commit**: `docs(database): create documentation directory structure`

- [x] T002 Create schema and table documentation templates
  - **Do**:
    1. Create `docs/database/_templates/schema-doc-template.md` with all required sections (Purpose, Goals, Rules, Decisions, Anti-patterns, Relations, Lifecycle, Performance, TODOs)
    2. Create `docs/database/_templates/table-doc-template.md` with all required sections (Overview, Schema Reference, Columns, Relations, Business Rules, Type Fixing, Queries, TODOs)
    3. Include frontmatter examples with first_documented, last_updated, last_verified_by
    4. Include linking examples for ctrl+click navigation
    5. Include TODO template for migration-required changes
  - **Files**: `docs/database/_templates/schema-doc-template.md`, `docs/database/_templates/table-doc-template.md`
  - **Done when**: Both templates exist with all required sections
  - **Verify**: `test -f "C:/projects/capsule-pro/docs/database/_templates/schema-doc-template.md" && test -f "C:/projects/capsule-pro/docs/database/_templates/table-doc-template.md" && echo "OK"`
  - **Commit**: `docs(database): create documentation templates`

- [x] T003 Create migrations README and index
  - **Do**:
    1. Create `docs/database/migrations/README.md` with migration patterns explanation
    2. List all 16 existing migrations with brief descriptions
    3. Create migration doc template (rollback plan, verification, dependencies)
    4. Document migration naming convention and rollback strategy
  - **Files**: `docs/database/migrations/README.md`, `docs/database/_templates/migration-doc-template.md`
  - **Done when**: Migration README exists with all migrations listed
  - **Verify**: `test -f "C:/projects/capsule-pro/docs/database/migrations/README.md" && grep -q "20260124120000" "C:/projects/capsule-pro/docs/database/migrations/README.md" && echo "OK"`
  - **Commit**: `docs(database): create migration documentation templates`

## Phase 2: Schema Documentation - Platform & Core (2 tasks, can parallelize)

- [x] T004 [P] Document platform schema
  - **Do**:
    1. Create `docs/database/schemas/00-platform.md`
    2. Document all 5 platform tables: Account (Tenant), audit_log, audit_archive, sent_emails, Tenant (registry)
    3. Include sections: Purpose (platform-level entities), Goals (audit trail, multi-tenant foundation), Rules (no tenant_id on platform tables), Decisions (partitioned audit logs), Relations (platform → tenant), Lifecycle (audit retention policies), Performance (partition pruning), TODOs
    4. Document that Account is the tenant model all tenant tables reference
    5. Add schema-level migration TODO for any RLS policy gaps
  - **Files**: `docs/database/schemas/00-platform.md`
  - **Done when**: Platform schema documented with all 5 tables in TOC
  - **Verify**: `test -f "C:/projects/capsule-pro/docs/database/schemas/00-platform.md" && grep -q "Account" "C:/projects/capsule-pro/docs/database/schemas/00-platform.md" && echo "OK"`
  - **Commit**: `docs(database): document platform schema`

- [x] T005 [P] Document core schema
  - **Do**:
    1. Create `docs/database/schemas/01-core.md`
    2. Document all core types: 12 enums (ActionType, EmploymentType, UnitSystem, UnitType, KitchenTaskPriority, KitchenTaskStatus, OutboxStatus, UserRole, ShipmentStatus, admin_action, admin_entity_type, admin_role)
    3. Document core tables: units, unit_conversions, status_types, status_transitions, waste_reasons, audit_config
    4. Include sections: Purpose (shared reference data), Goals (type consistency across system), Rules (enums are immutable, status transitions via tables), Decisions (status_types table vs hardcoded enums), Relations (referenced by all tenant schemas), Lifecycle (enum values never change once deployed), Performance (enum lookups are fast), TODOs
    5. Document that status_types enables flexible status workflows without code changes
  - **Files**: `docs/database/schemas/01-core.md`
  - **Done when**: Core schema documented with all enums and types in TOC
  - **Verify**: `test -f "C:/projects/capsule-pro/docs/database/schemas/01-core.md" && grep -q "ActionType" "C:/projects/capsule-pro/docs/database/schemas/01-core.md" && echo "OK"`
  - **Commit**: `docs(database): document core schema`

## Phase 3: Schema Documentation - Tenant Schemas (7 tasks, can parallelize 2-3)

- [x] T006 [P] Document tenant schema
  - **Do**:
    1. Create `docs/database/schemas/02-tenant.md`
    2. Document all 4 tenant tables: Location, settings, documents, OutboxEvent
    3. **CRITICAL**: Document that only Location has proper FK to Account, others are MISSING FKs
    4. Document OutboxEvent camelCase naming inconsistency
    5. Include sections: Purpose (cross-tenant shared entities), Goals (locations, settings, documents available to all modules), Rules (these tables don't have module-specific FKs), Decisions (why these are in tenant not module schemas), Relations (all reference Account but only Location has FK), Lifecycle (shared entities live longer than module-specific data), Performance (queried by all modules), TODOs (3 FK issues documented)
  - **Files**: `docs/database/schemas/02-tenant.md`
  - **Done when**: Tenant schema documented with FK issues clearly called out
  - **Verify**: `test -f "C:/projects/capsule-pro/docs/database/schemas/02-tenant.md" && grep -q "Missing Foreign Key" "C:/projects/capsule-pro/docs/database/schemas/02-tenant.md" && echo "OK"`
  - **Commit**: `docs(database): document tenant schema (note FK issues)`

- [x] T007 [P] Document tenant_admin schema
  - **Do**:
    1. Create `docs/database/schemas/03-tenant_admin.md`
    2. Document all 11 admin tables: Report, report_history, report_schedules, Workflow, workflow_executions, workflow_steps, Notification, notification_preferences, admin_audit_trail, admin_permissions, admin_roles, admin_users
    3. Include sections: Purpose (admin reporting, workflows, permissions), Goals (self-service reporting, admin automation), Rules (admin tables have additional RLS), Decisions (separate admin tables from operational for permission boundaries), Relations (admin tables can reference all tenant tables), Lifecycle (admin data persists even if operational data deleted), Performance (admin queries can be heavy), TODOs
  - **Files**: `docs/database/schemas/03-tenant_admin.md`
  - **Done when**: tenant_admin schema fully documented
  - **Verify**: `test -f "C:/projects/capsule-pro/docs/database/schemas/03-tenant_admin.md" && echo "OK"`
  - **Commit**: `docs(database): document tenant_admin schema`

- [ ] T008 [P] Document tenant_crm schema
  - **Do**:
    1. Create `docs/database/schemas/04-tenant_crm.md`
    2. Document all 7 CRM tables: Client, ClientContact, ClientPreference, Lead, ClientInteraction, Proposal, ProposalLineItem
    3. Include sections: Purpose (customer relationship management), Goals (lead to client to event pipeline), Rules (leads convert to clients, never the reverse), Decisions (Proposal in both tenant_crm and tenant_events - why?), Relations (clients have many contacts, leads convert to clients), Lifecycle (lead → client → events → proposals), Performance (client lookup is hot path), TODOs
  - **Files**: `docs/database/schemas/04-tenant_crm.md`
  - **Done when**: tenant_crm schema fully documented
  - **Verify**: `test -f "C:/projects/capsule-pro/docs/database/schemas/04-tenant_crm.md" && echo "OK"`
  - **Commit**: `docs(database): document tenant_crm schema`

- [ ] T009 [P] Document tenant_events schema
  - **Do**:
    1. Create `docs/database/schemas/05-tenant_events.md`
    2. Document all 17 events tables: Event, BattleBoard, CommandBoard, CommandBoardCard, EventGuest, EventContract, ContractSignature, EventBudget, BudgetLineItem, BudgetAlert, EventReport, EventStaffAssignment, EventTimeline, EventImport, EventProfitability, EventSummary, CateringOrder, event_dishes
    3. **CRITICAL**: Document venue_id vs location_id confusion (both reference Location table)
    4. Include sections: Purpose (event operations), Goals (end-to-end event management), Rules (events must have client, budget versioning), Decisions (JSON for BattleBoard flexibility, separate budgets for versioning), Relations (events connect to ALL modules), Lifecycle (lead → booked → executed → reviewed), Performance (event queries are dashboard hot path), TODOs (naming confusion, missing FKs)
  - **Files**: `docs/database/schemas/05-tenant_events.md`
  - **Done when**: tenant_events schema fully documented with all issues
  - **Verify**: `test -f "C:/projects/capsule-pro/docs/database/schemas/05-tenant_events.md" && grep -q "venue_id.*location_id" "C:/projects/capsule-pro/docs/database/schemas/05-tenant_events.md" && echo "OK"`
  - **Commit**: `docs(database): document tenant_events schema (note venue/location confusion)`

- [ ] T010 [P] Document tenant_inventory schema
  - **Do**:
    1. Create `docs/database/schemas/06-tenant_inventory.md`
    2. Document all 15 inventory tables: InventoryItem, InventoryStock, InventoryTransaction, InventorySupplier, InventoryAlert, InventoryForecast, ForecastInput, ReorderSuggestion, AlertsConfig, CycleCountSession, CycleCountRecord, VarianceReport, CycleCountAuditLog, PurchaseOrder, PurchaseOrderItem, Shipment, ShipmentItem, storage_locations, bulk_combine_rules
    3. Include sections: Purpose (inventory management), Goals (stock visibility, automated ordering), Rules (stock levels by location, FIFO/LIFO), Decisions (cycle counting for accuracy, forecasts for demand planning), Relations (inventory connects to kitchen for recipes, events for catering), Lifecycle (items → stock → transactions → forecasts → orders), Performance (inventory queries are dashboard hot path), TODOs
  - **Files**: `docs/database/schemas/06-tenant_inventory.md`
  - **Done when**: tenant_inventory schema fully documented
  - **Verify**: `test -f "C:/projects/capsule-pro/docs/database/schemas/06-tenant_inventory.md" && echo "OK"`
  - **Commit**: `docs(database): document tenant_inventory schema`

- [ ] T011 [P] Document tenant_kitchen schema
  - **Do**:
    1. Create `docs/database/schemas/07-tenant_kitchen.md`
    2. Document all 18 kitchen tables: KitchenTask, KitchenTaskClaim, KitchenTaskProgress, PrepTask, PrepList, PrepListItem, PrepComment, Recipe, RecipeVersion, RecipeIngredient, recipe_steps, Ingredient, Dish, Menu, MenuDish, PrepMethod, Container, method_videos, TaskBundle, TaskBundleItem, BulkCombineRules, MethodVideo, PrepListImports, AllergenWarning, WasteEntry
    3. Include sections: Purpose (kitchen operations), Goals (recipe management, prep tracking, task coordination), Rules (recipe versioning, task claims), Decisions (recipes locked after versioning, tasks claimable for accountability), Relations (kitchen connects to inventory for ingredients, events for menus), Lifecycle (recipes → prep lists → tasks → completion), Performance (task queries are real-time hot path), TODOs
  - **Files**: `docs/database/schemas/07-tenant_kitchen.md`
  - **Done when:** tenant_kitchen schema fully documented
  - **Verify**: `test -f "C:/projects/capsule-pro/docs/database/schemas/07-tenant_kitchen.md" && echo "OK"`
  - **Commit**: `docs(database): document tenant_kitchen schema`

- [x] T012 [P] Document tenant_staff schema
  - **Do**:
    1. Create `docs/database/schemas/08-tenant_staff.md`
    2. Document all 14 staff tables: User, Role, Schedule, ScheduleShift, open_shifts, EmployeeLocation, TimeEntry, TimecardEditRequest, LaborBudget, payroll_periods, payroll_runs, payroll_line_items, EmployeeDeduction, employee_skills, employee_certifications, employee_seniority, employee_availability
    3. Include sections: Purpose (staff scheduling and payroll), Goals (accurate time tracking, fair scheduling), Rules (shifts require approvals, time entries immutable after payroll), Decisions (separate schedules from time entries for flexibility), Relations (staff connects to events for assignments, kitchen for task completion), Lifecycle (hire → schedule → work → payroll), Performance (payroll calculations are performance critical), TODOs
  - **Files**: `docs/database/schemas/08-tenant_staff.md`
  - **Done when:** tenant_staff schema fully documented
  - **Verify**: `test -f "C:/projects/capsule-pro/docs/database/schemas/08-tenant_staff.md" && echo "OK"`
  - **Commit**: `docs(database): document tenant_staff schema`

## Phase 4: Table Documentation - Platform Tables (5 tasks, can parallelize)

- [x] T013 [P] Document Account table + fix types
  - **Do**:
    1. Create `docs/database/tables/platform/Account.md`
    2. Document all columns: id, name, slug, tier, metadata, limits, createdAt, updatedAt, deletedAt
    3. Document that this is the tenant model referenced by ALL tenant tables
    4. Find and fix `any` types in auth-related code
    5. Add relation documentation to tenant tables
  - **Files**: `docs/database/tables/platform/Account.md`, auth-related files
  - **Type Fix Target:** ~3 `any` types
  - **Done when:** Account table documented + types fixed
  - **Verify:** `test -f "C:/projects/capsule-pro/docs/database/tables/platform/Account.md" && echo "OK"`
  - **Commit:** `docs(database): document Account table + fix {n} types`

- [x] T014 [P] Document Tenant table + fix types
  - **Do**:
    1. Create `docs/database/tables/platform/Tenant.md`
    2. Document as tenant registry (lightweight vs Account)
    3. Find and fix `any` types in tenant resolution code
  - **Files**: `docs/database/tables/platform/Tenant.md`
  - **Type Fix Target:** ~2 `any` types
  - **Done when:** Tenant table documented + types fixed
  - **Commit:** `docs(database): document Tenant table + fix {n} types`

- [x] T015 [P] Document audit_log table + fix types
  - **Do**:
    1. Create `docs/database/tables/platform/audit_log.md`
    2. Document partitioned structure (monthly partitions)
    3. Document RLS policies (if any)
  - **Files:** `docs/database/tables/platform/audit_log.md`
  - **Type Fix Target:** ~1 `any` type
  - **Done when:** audit_log documented
  - **Commit:** `docs(database): document audit_log table`

- [ ] T016 [P] Document audit_archive table + fix types
  - **Do**:
    1. Create `docs/database/tables/platform/audit_archive.md`
    2. Document as cold storage for old audit logs
  - **Files:** `docs/database/tables/platform/audit_archive.md`
  - **Done when:** audit_archive documented
  - **Commit:** `docs(database): document audit_archive table`

- [x] T017 [P] Document sent_emails table + fix types
  - **Do**:
    1. Create `docs/database/tables/platform/sent_emails.md`
    2. Document email tracking for Resend integration
  - **Files:** `docs/database/tables/platform/sent_emails.md`
  - **Done when:** sent_emails documented
  - **Commit:** `docs(database): document sent_emails table`

## Phase 5: Table Documentation - Tenant Tables (4 tasks, can parallelize)

- [x] T018 [P] Document Location table + fix types
  - **Do**:
    1. Create `docs/database/tables/tenant/Location.md`
    2. **IMPORTANT**: Document as the ONE table with proper FK to Account (reference pattern)
    3. Document that this is referenced by venue_id and location_id on Event
    4. Find and fix `any` types in location-related code
    5. Add usage examples showing proper FK usage
  - **Files:** `docs/database/tables/tenant/Location.md`
  - **Type Fix Target:** ~5 `any` types
  - **Done when:** Location documented with FK pattern highlighted
  - **Verify:** `test -f "C:/projects/capsule-pro/docs/database/tables/tenant/Location.md" && grep -q "Foreign Key.*platform.accounts" "C:/projects/capsule-pro/docs/database/tables/tenant/Location.md" && echo "OK"`
  - **Commit**: `docs(database): document Location table (reference FK pattern) + fix {n} types`

- [x] T019 [P] Document OutboxEvent table + fix types
  - **Do**:
    1. Create `docs/database/tables/tenant/OutboxEvent.md`
    2. **CRITICAL**: Document missing FK to Account
    3. **CRITICAL**: Document camelCase naming inconsistency (tenantId vs tenant_id)
    4. Find and fix `any` types in outbox-related code
    5. Add migration TODO for FK constraint and column rename
  - **Files:** `docs/database/tables/tenant/OutboxEvent.md`
  - **Type Fix Target:** ~4 `any` types
  - **Migration TODO:** Add FK to Account, rename tenantId to tenant_id
  - **Done when:** OutboxEvent documented with issues clearly marked
  - **Verify:** `test -f "C:/projects/capsule-pro/docs/database/tables/tenant/OutboxEvent.md" && grep -q "Missing Foreign Key" "C:/projects/capsule-pro/docs/database/tables/tenant/OutboxEvent.md" && echo "OK"`
  - **Commit:** `docs(database): document OutboxEvent table (note issues) + fix {n} types`

- [ ] T020 [P] Document settings table + fix types
  - **Do**:
    1. Create `docs/database/tables/tenant/settings.md`
    2. Document as key-value settings store
    3. **CRITICAL**: Document missing FK to Account
    4. Find and fix `any` types in settings-related code
    5. Add migration TODO for FK constraint
  - **Files:** `docs/database/tables/tenant/settings.md`
  - **Type Fix Target:** ~2 `any` types
  - **Migration TODO:** Add FK to Account
  - **Done when:** settings documented with FK issue marked
  - **Verify:** `test -f "C:/projects/capsule-pro/docs/database/tables/tenant/settings.md" && echo "OK"`
  - **Commit:** `docs(database): document settings table (note missing FK) + fix {n} types`

- [x] T021 [P] Document documents table + fix types
  - **Do**:
    1. Create `docs/database/tables/tenant/documents.md`
    2. Document for PDF/CSV parsing pipeline
    3. **CRITICAL**: Document missing FK to Account
    4. Find and fix `any` types in document parsing code
    5. Add migration TODO for FK constraint
  - **Files:** `docs/database/tables/tenant/documents.md`
  - **Type Fix Target:** ~3 `any` types
  - **Migration TODO:** Add FK to Account
  - **Done when:** documents documented with FK issue marked
  - **Verify:** `test -f "C:/projects/capsule-pro/docs/database/tables/tenant/documents.md" && echo "OK"`
  - **Commit:** `docs(database): document documents table (note missing FK) + fix {n} types`

## Phase 6: Table Documentation - Sample High-Value Tables (5 tasks)

*Note: This pattern continues for all 118 tables. Showing sample for high-value tenant_events tables.*

- [x] T022 [P] Document Event table + fix types
  - **Do**:
    1. Create `docs/database/tables/tenant_events/Event.md`
    2. Document all columns including venue_id vs location_id confusion
    3. Document business rules (status flow, client requirement, date validation)
    4. Document relations (to Client, Location, Budget, BattleBoard, etc.)
    5. Find and fix `any` types in:
       - `apps/app/app/(authenticated)/events/actions.ts`
       - `apps/app/app/api/events/[eventId]/route.ts`
       - `apps/app/app/(authenticated)/events/components/event-form.tsx`
    6. Add common queries (get with client, list upcoming, search by tags)
    7. Add migration TODO for event_guests FK
  - **Files**: `docs/database/tables/tenant_events/Event.md`, event-related files
  - **Type Fix Target:** ~7 `any` types
  - **Done when:** Event fully documented with relations, rules, queries + types fixed
  - **Verify:** `test -f "C:/projects/capsule-pro/docs/database/tables/tenant_events/Event.md" && grep -q "Event\|EventInput" "C:/projects/capsule-pro/apps/app/app/(authenticated)/events/actions.ts" | grep -q "5" && echo "OK"`
  - **Commit:** `docs(database): document Event table + fix 7 types`

- [x] T023 [P] Document BattleBoard table + fix types
  - **Do**:
    1. Create `docs/database/tables/tenant_events/BattleBoard.md`
    2. Document JSON field structure (board_data)
    3. Document GIN index for JSON queries
    4. Find and fix `any` types in battle board components (heavy JSON usage)
    5. Add example JSON structures for board_data
  - **Files**: `docs/database/tables/tenant_events/BattleBoard.md`
  - **Type Fix Target:** ~12 `any` types (heavy JSON = heavy any usage)
  - **Done when:** BattleBoard documented with JSON examples + types fixed
  - **Commit:** `docs(database): document BattleBoard table + fix 12 types`

- [x] T024 [P] Document EventBudget table + fix types
  - **Do**:
    1. Create `docs/database/tables/tenant_events/EventBudget.md`
    2. Document versioning strategy
    3. Document line item relations
    4. Find and fix `any` types in budget hooks/components
    5. Add migration TODO for variance calculation optimization
  - **Files**: `docs/database/tables/tenant_events/EventBudget.md`
  - **Type Fix Target:** ~8 `any` types
  - **Done when:** EventBudget documented + types fixed
  - **Commit:** `docs(database): document EventBudget table + fix 0 types`

- [x] T025 [P] Document KitchenTask table + fix types
  - **Do**:
    1. Create `docs/database/tables/tenant_kitchen/KitchenTask.md`
    2. Document task claim pattern (one active claim per task)
    3. Document progress tracking via KitchenTaskProgress
    4. Find and fix `any` types in kitchen task actions/components
    5. Add real-time update flow documentation (Ably)
  - **Files**: `docs/database/tables/tenant_kitchen/KitchenTask.md`
  - **Type Fix Target:** ~10 `any` types
  - **Done when:** KitchenTask documented + types fixed
  - **Commit:** `docs(database): document KitchenTask table + fix 10 types`

- [ ] T026 [P] Document Client table + fix types
  - **Do**:
    1. Create `docs/database/tables/tenant_crm/Client.md`
    2. Document client-to-lead conversion pattern
    3. Document client preferences JSON structure
    4. Find and fix `any` types in CRM actions/components
    5. Add migration TODO for client preferences JSON schema
  - **Files**: `docs/database/tables/tenant_crm/Client.md`
  - **Type Fix Target:** ~6 `any` types
  - **Done when:** Client documented + types fixed
  - **Commit:** `docs(database): document Client table + fix 6 types`

## Phase 7: Migration Documentation (4 tasks, can parallelize)

- [ ] T027 [P] Document initial migrations (0000-0004)
  - **Do**:
    1. Document `0000_init.md` - Database initialization
    2. Document `0001_enable_pgcrypto.md` - UUID extension
    3. Document `0002_employee_seniority.md` - Seniority tracking
    4. Document `0003_seed_units_and_waste_reasons.md` - Reference data
    5. Document `0004_labor_budget_tracking.md` - Labor budget setup
    6. Create `docs/database/migrations/README.md` with index
  - **Files**: 5 migration docs + README index
  - **Done when:** Early migrations documented with index
  - **Verify:** `test -f "C:/projects/capsule-pro/docs/database/migrations/README.md" && echo "OK"`
  - **Commit:** `docs(database): document early migrations`

- [x] T028 [P] Document event_budget_tracking migration
  - **Do**:
    1. Read `packages/database/prisma/migrations/20260124120000_event_budget_tracking/migration.sql`
    2. Create `docs/database/migrations/20260124120000-event-budget-tracking.md`
    3. Document: added event_budgets, budget_line_items, budget_alerts tables
    4. Document: added venue_id to events
    5. Include all FK constraints and rollback plan
  - **Files:** `docs/database/migrations/20260124120000-event-budget-tracking.md`
  - **Done when:** Event budget migration documented
  - **Verify:** `test -f "C:/projects/capsule-pro/docs/database/migrations/20260124120000-event-budget-tracking.md" && echo "OK"`
  - **Commit:** `docs(database): document event_budget_tracking migration`

- [x] T029 [P] Document add_foreign_keys migration
  - **Do**:
    1. Read `packages/database/prisma/migrations/20260129120000_add_foreign_keys/migration.sql`
    2. Create `docs/database/migrations/20260129120000-add-foreign-keys.md`
    3. Document: 100+ FK constraints added across all schemas
    4. Summarize by schema with counts
    5. Note ON DELETE behaviors used
  - **Files:** `docs/database/migrations/20260129120000-add-foreign-keys.md`
  - **Done when:** Major FK migration documented
  - **Verify:** `test -f "C:/projects/capsule-pro/docs/database/migrations/20260129120000-add-foreign-keys.md" && echo "OK"`
  - **Commit:** `docs(database): document add_foreign_keys migration`

- [ ] T030 [P] Document remaining migrations (0005-0014)
  - **Do**:
    1. Document `0005_add_menu_models.md`
    2. Document `0006_move_public_objects.md`
    3. Document `0007_fix_menus_id_type.md`
    4. Document `0008_add_event_reports.md`
    5. Document `0009_make_event_imports_event_id_nullable.md`
    6. Document `0010_add_deleted_at_to_event_imports.md`
    7. Update `docs/database/migrations/README.md` with complete index
  - **Files**: 6 migration docs + updated README
  - **Done when:** All migrations documented with complete index
  - **Verify:** `grep -c "\.md$" "C:/projects/capsule-pro/docs/database/migrations/" | grep -q "17" && echo "OK"`
  - **Commit:** `docs(database): document remaining migrations`

## Phase 8: Enum Documentation (2 tasks, can parallelize)

- [x] T031 [P] Document core enums (ActionType, EmploymentType, etc.)
  - **Do**:
    1. Create `docs/database/enums/README.md` with all enums overview
    2. Document `ActionType.md` (insert, update, delete)
    3. Document `EmploymentType.md` (full_time, part_time, contractor, temp)
    4. Document `UserRole.md` (owner, admin, manager, staff)
    5. Document `UnitSystem.md` and `UnitType.md`
  - **Files:** `docs/database/enums/README.md` + 6 enum docs
  - **Done when:** Core enums documented
  - **Commit:** `docs(database): document core enums`

- [x] T032 [P] Document domain enums
  - **Do**:
    1. Document `KitchenTaskPriority.md` and `KitchenTaskStatus.md`
    2. Document `OutboxStatus.md` (pending, published, failed)
    3. Document `ShipmentStatus.md`
    4. Document admin enums (admin_action, admin_entity_type, admin_role)
  - **Files:** 6 enum docs
  - **Done when:** Domain enums documented
  - **Commit:** `docs(database): document domain enums`

## Phase 9: Verification & Quality Gates (3 tasks)

- [ ] T033 [VERIFY] Cross-check schema documentation
  - **Do**:
    1. For each schema doc, verify all tables are documented
    2. Check that all required sections exist
    3. Verify TOC links work (ctrl+click)
    4. Check that all migration TODOs are tracked
  - **Files:** All `docs/database/schemas/*.md` files
  - **Done when:** All schema docs pass verification
  - **Verify:** `for f in C:/projects/capsule-pro/docs/database/schemas/*.md; do grep -q "Purpose & Domain" "$f" || exit 1; done && echo "OK"`
  - **Commit:** `docs(database): verification pass - schema docs complete`

- [ ] T034 [VERIFY] Validate documentation completeness
  - **Do**:
    1. Run coverage checks (118 tables documented?)
    2. Run frontmatter validation (all have metadata?)
    3. Run link validation (all relative links work?)
    4. Count total `any` types fixed
  - **Files**: All documentation files
  - **Done when:** All checks pass
  - **Verify:** `find C:/projects/capsule-pro/docs/database -name "*.md" | wc -l | grep -q "130" && echo "OK"` (approximate file count)
  - **Commit:** `docs(database): validation pass - documentation complete`

- [ ] T035 [VERIFY] Final validation and summary
  - **Do**:
    1. Update `docs/database/README.md` with complete index
    2. Update `docs/database/KNOWN_ISSUES.md` with final count
    3. Create summary statistics (total tables, total FKs, total issues, types fixed)
    4. Update `.progress.md` with final metrics
    5. Run `pnpm check` and `pnpm test` to ensure no regressions
  - **Files**: `docs/database/README.md`, `.progress.md`
  - **Done when:** Complete documentation with final metrics
  - **Verify:** `grep -q "platform" "C:/projects/capsule-pro/docs/database/README.md" && grep -q "tenant_events" "C:/projects/capsule-pro/docs/database/README.md" && echo "OK"`
  - **Commit**: `docs(database): complete documentation with summary - {N} types fixed, {M} TODOs tracked`

## Notes

### Task Organization

**Parallel Tasks:** Tasks marked [P] can run in parallel when independent
**Sequential Dependencies:** Foundation (T001-T003) must complete before doc phases
**Type Fixing:** Every table task includes type fixing side task
**Migration TODOs:** Added to docs when schema issues found

### Estimated Totals

| Phase | Tasks | Est. Iterations |
|-------|-------|----------------|
| Foundation | 3 | 1-2 |
| Schema Docs | 9 | 3-4 |
| Table Docs | ~118 | 20-25 |
| Migration Docs | 16 | 3-4 |
| Enum Docs | 12 | 1-2 |
| Verification | 3 | 2-3 |
| **Total** | **~161** listed | **~30-40** |

*Note: Table doc tasks shown are samples. Full list would have ~118 table tasks. In practice, multiple table docs can be combined per iteration.*

### Key Findings from Investigation

| Item | Status | Notes |
|------|--------|-------|
| Platform schema | Not documented | 5 tables |
| Core schema | Not documented | 15+ enums/types |
| Tenant schemas | Not documented | 84+ tables |
| Migrations | Not documented | 16 migration files |
| Missing FKs | Identified | 4 tables with no tenant FK |
| Naming issues | Identified | OutboxEvent uses camelCase |
| `any` types | 6000+ | Target: fix 100+ in this feature |

### Living Documentation Pattern

Each file MUST include frontmatter:
```yaml
---
first_documented: 2025-01-29
last_updated: 2025-01-29
last_verified_by: agent-id
---
```

This allows future Ralph Loop iterations to:
1. Know when documentation was created
2. Track when it was last updated
3. Identify which agent last verified it
4. Decide if refresh is needed
5. Update types fixed counter
6. Track migration TODO completion
