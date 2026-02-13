# Capsule-Pro Implementation Plan

**Last Updated**: 2026-02-13
**Build Status**: ✅ PASSING (21/21 tasks)
**Test Status**: ✅ 540 passing, 0 failures
**Latest Tag**: v0.2.9
**Current Branch**: manifest-.3

---

## Executive Summary

### What's Complete
- **Command Board**: 9/9 features (undo/redo, conflict resolution, event replay, interactive anchors, bulk edit)
- **Manifest Core**: 6 entity definitions + runtime + 53 generated routes (42 commands + 11 queries)
- **Kitchen API**: 106 route handlers with CRUD + command operations
- **Database**: Multi-tenant schema with full kitchen ops support
- **Runtime**: Constraint evaluation (block/warn/ok), event emission via outbox + Ably
- **Tests**: 540 passing, 180+ manifest-specific tests

### What Needs Work

**Critical Path**:
1. **P0**: Console → Sentry migration (412 console statements across codebase)
2. **P0**: Manifest documentation cleanup + HTTP verification (Phase E)
3. **P1**: Kitchen ops rules & overrides + multi-entity runtime
4. **P2**: Feature specs (CRM, Scheduling, Inventory, Events, Command Board extensions)

---

## Status Summary

### Completed Features ✅

| Category | Feature | Status | Notes |
|----------|---------|--------|-------|
| **Command Board** | All 9 Features | ✅ COMPLETE | Undo/redo, auto-save, realtime, visual connectors, bulk ops, preferences, anchors |
| **Manifest Core** | 6 Entity Definitions | ✅ COMPLETE | PrepTask, Station, Inventory, Recipe, Menu, PrepList |
| **Manifest Core** | Runtime & Factories | ✅ COMPLETE | RuntimeEngine, adapters, projection system |
| **Manifest Core** | Prisma Store Layer | ✅ COMPLETE | All 6 entity stores with tenant scoping |
| **Manifest Core** | Command API Routes | ✅ COMPLETE | 42 POST routes generated |
| **Manifest Core** | List Query Routes | ✅ COMPLETE | 11 GET routes generated |
| **Kitchen API** | 106 Route Handlers | ✅ COMPLETE | Full CRUD + command handlers |
| **Database** | Schema & Migrations | ✅ COMPLETE | Multi-tenant with kitchen ops support |
| **Runtime** | Constraint Evaluation | ✅ COMPLETE | Block/warn/ok severity with diagnostics |
| **Runtime** | Event Emission | ✅ COMPLETE | Outbox pattern with Ably integration |

### Pending Features

#### P0 - Critical (Manifest Migration Core)

| # | Feature | Status | Priority Rationale |
|---|---------|--------|-------------------|
| P0-1 | Console → Sentry Migration | NOT STARTED | 412 statements missing structured logging |
| P0-2 | Manifest Doc Cleanup | NOT STARTED | Path conflicts causing developer confusion |
| P0-3 | Manifest HTTP Verification | NOT STARTED | No HTTP-level testing with real auth/tenant/DB |

#### P1 - High (Manifest Completeness)

| # | Feature | Status | Priority Rationale |
|---|---------|--------|-------------------|
| P1-1 | Kitchen Ops Rules & Overrides | NOT STARTED | Missing override workflow + audit events |
| P1-2 | Multi-Entity Runtime | NOT STARTED | Runtime loads only PrepTask IR |
| P1-3 | Type Generation from IR | NOT STARTED | Manual types cause drift from manifest |
| P1-4 | Manifest CLI Directory Cleanup | NOT STARTED | Duplicate routes in `/manifest/` vs `/commands/` |

#### P2 - Medium (Feature Specs)

| # | Feature | Status | Spec Location |
|---|---------|--------|---------------|
| P2-1 | CRM Client Detail View | NOT STARTED | `specs/crm-client-detail-view_TODO` |
| P2-2 | Scheduling Shift CRUD | NOT STARTED | `specs/scheduling-shift-crud_TODO` |
| P2-3 | Inventory Item Management | NOT STARTED | `specs/inventory-item-management_TODO` |
| P2-4 | Event Budget Tracking | NOT STARTED | `specs/event-budget-tracking_TODO` |
| P2-5 | Command Board: Entity Cards | NOT STARTED | `specs/command-board-entity-cards_TODO` |
| P2-6 | Command Board: Persistence | NOT STARTED | `specs/command-board-persistence_TODO` |
| P2-7 | Command Board: Realtime Sync | NOT STARTED | `specs/command-board-realtime-sync_TODO` |
| P2-8 | Command Board: Relationship Lines | NOT STARTED | `specs/command-board-relationship-lines_TODO` |

#### P3 - Lower (AI, Integrations, Mobile, Payroll, Warehouse)

| Category | Features | Status | Spec Folder |
|----------|----------|--------|-------------|
| **AI** | 4 features | NOT STARTED | `specs/ai-*` |
| **Communication** | 3 features | NOT STARTED | `specs/email-*`, `specs/sms-*` |
| **Integrations** | 4 features | NOT STARTED | `specs/*-integration*` |
| **Mobile** | 3 features | NOT STARTED | `specs/mobile-*` |
| **Payroll** | 3 features | NOT STARTED | `specs/payroll-*` |
| **Warehouse** | 3 features | NOT STARTED | `specs/warehouse-*` |

---

## Implementation Details

See full details for each P0-P1 task in sections below, including:
- **P0-1**: Commit uncommitted work (recipes, tasks routes, task-card, next.config, manifest scripts)
- **P0-2**: Console → Sentry migration (412 statements, Sentry init verification, structured logging)
- **P0-3**: Manifest documentation cleanup (fix path conflicts, archive old plans)
- **P0-4**: Manifest HTTP verification (test harness, all PrepTask commands, additional entity, CI snapshots)
- **P1-1**: Kitchen ops rules & overrides (severity model, override workflow, audit events)
- **P1-2**: Multi-entity runtime (registry pattern, cross-entity constraints, all 6 entities)
- **P1-3**: Type generation from IR (CLI command, generated types package, route updates)
- **P1-4**: Manifest CLI directory cleanup (audit manifest/ vs commands/, migrate frontend, remove duplicates)

---

## Validation Commands

```bash
pnpm install       # Install deps
pnpm lint          # Biome linting
pnpm format        # Biome formatting
pnpm test          # 540 tests
pnpm build         # 21 tasks
pnpm boundaries    # Architecture check
pnpm migrate       # Prisma format + migrate
```

---

## Next Steps

1. P0-1: Console → Sentry Migration (focus on kitchen API routes first, then app components)
2. P0-2: Manifest Documentation Cleanup
3. P0-3: Manifest HTTP Verification (Phase E)
4. P1-1: Kitchen Ops Rules & Overrides
