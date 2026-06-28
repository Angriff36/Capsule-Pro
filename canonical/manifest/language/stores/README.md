# Manifest Stores

Canonical ID: `manifest.language.stores`

Type: `manifest-capability`

Owner decision status: `needs-ryan`

Implementation status: `working`

Last reviewed: `2026-06-26`

Last updated by: `agent`

---

## 1. What This Is

Plain-English purpose:

```text
Stores are the storage abstraction layer between Manifest entities and Prisma. Each entity maps to a Prisma-backed durable store. Most entities use the GenericPrismaStore (metadata-driven CRUD), while a few entities with special business logic use bespoke store classes. Store resolution happens via a factory that switches on entity name.
```

Real app impact:

```text
When correct:
- All entity reads/writes go through typed Prisma stores with automatic field name translation (PascalCase ↔ snake_case).
- Bespoke stores handle special logic (advisory locks, sequence generation, cross-table mappings) without polluting generic logic.
- Store registry provides a single place to understand entity-to-table mappings.

When wrong:
- GenericPrismaStore OCC bug: version stuffed into tenantId_id compound key → Prisma rejects → catch swallows → silent data loss (known bug, fixed for Event, 7 others need producer fix).
- Bespoke stores accumulate unmaintained special cases.
- Store classification drifts (some entities still declared `store ... in memory` in .manifest but flipped to durable).
```

---

## 2. Ryan Final Decision

Decision:

```text
NEEDS-RYAN
```

Reason:

```text
Store system works but has a known GenericPrismaStore OCC bug affecting 7 entities (Event fixed, others pending). The "all-durable flip" in June 2026 eliminated in-memory stores but some .manifest source files may still declare `in memory`.
```

Do not do:

```text
Do not create new bespoke stores without documenting why GenericPrismaStore is insufficient.
Do not bypass the store layer with raw Prisma queries for governed mutations.
Do not modify the GenericPrismaStore OCC handling without fixing all 7 affected entities.
```

---

## 3. Current Status

Current recorded status:

```text
210+ entities backed by durable Prisma stores. 4 bespoke stores (Event, InventoryTransfer, PrepTask, KitchenTask) for special business logic. All entities flipped from in-memory to durable on 2026-06-03. GenericPrismaStore is the default for entities without bespoke stores.
```

Known gaps:

```text
- GenericPrismaStore OCC bug: version stuffed into tenantId_id compound key → silent data loss. Fixed for Event (bespoke store), 7 others need fix. Affected entities: Invoice, Payment, InventoryItem, and others.
- Some .manifest source files may still declare `store ... in memory` despite the all-durable flip.
- Bespoke store count (4) is small but each has non-trivial business logic that's hard to test.
```

Confidence: `high`

Evidence:

```text
- Store registry: manifest/runtime/src/generated/prisma-store-registry.generated.ts (210+ DURABLE_ENTITY_NAMES, lines 10-210)
- Store factory: manifest/runtime/src/prisma-stores/prisma-store.ts (createPrismaStoreProvider, lines 824-858)
- GenericPrismaStore: imported from @angriff36/manifest/stores/prisma-generic
- Bespoke stores:
  - manifest/runtime/src/prisma-stores/event-prisma-store.ts (advisory-lock eventNumber)
  - manifest/runtime/src/prisma-stores/inventory-transfer-prisma-store.ts (TRF- sequence generation)
  - manifest/runtime/src/prisma-stores/prisma-store.ts lines 65-292 (PrepTaskPrismaStore, cross-table mapping)
  - KitchenTaskPrismaStore (referenced in factory switch)
- All-durable flip: manifest/runtime/src/__tests__/test-helpers.ts lines 13-16
```

---

## 4. Where It Lives

Canonical decision file:

```text
canonical/manifest/language/stores/README.md
```

Source location:

```text
manifest/source/**/*.manifest (store declarations inside entity blocks, e.g., `store PrepTask in durable`)
manifest/runtime/src/prisma-stores/prisma-store.ts (store factory + PrepTaskPrismaStore)
manifest/runtime/src/prisma-stores/event-prisma-store.ts
manifest/runtime/src/prisma-stores/inventory-transfer-prisma-store.ts
```

Generated output location:

```text
manifest/runtime/src/generated/prisma-store-registry.generated.ts (DURABLE_ENTITY_NAMES list)
```

Runtime location:

```text
manifest/runtime/src/prisma-stores/ (store implementations)
manifest/runtime/src/generated/prisma-store-registry.generated.ts (entity-to-store mapping)
```

UI location:

```text
NONE
```

Test location:

```text
manifest/runtime/src/__tests__/test-helpers.ts (in-memory test store for command verification)
```

Docs location:

```text
NONE
```

---

## 5. Entry Points

User-facing route:

```text
NONE
```

Route file:

```text
NONE
```

API route / dispatcher:

```text
apps/api/app/api/manifest/[entity]/commands/[command]/route.ts (commands use stores internally)
```

CLI command:

```text
pnpm manifest:compile (generates prisma-store-registry.generated.ts)
```

Background job / cron / worker:

```text
NONE
```

---

## 6. What Consumes It

Direct consumers:

```text
- manifest/runtime/src/runtime-engine.ts (uses stores for entity CRUD during command execution)
- manifest/runtime/src/prisma-stores/prisma-store.ts (createPrismaStoreProvider factory)
- manifest/runtime/src/__tests__/test-helpers.ts (in-memory test store)
```

Indirect consumers:

```text
- All governed commands (they read/write entities through stores)
- All reaction middleware (dispatches commands that use stores)
```

Generated consumers:

```text
- prisma-store-registry.generated.ts (DURABLE_ENTITY_NAMES list, consumed by store factory)
```

Human consumers:

```text
Ryan, coding agents adding new bespoke stores or debugging store-related issues.
```

---

## 7. What It Is Wired To

Manifest entities:

```text
All 213 entities (each maps to a store)
```

Manifest commands:

```text
All 1,059 commands (use stores for entity state access)
```

Manifest events:

```text
NONE (stores do not interact with events directly)
```

Manifest policies / access rules:

```text
NONE (stores do not enforce policies; policies are evaluated before store access)
```

Database tables / collections:

```text
All Prisma-backed tables for 213 entities (via entity-to-prisma-model mapping)
```

Generated types:

```text
NONE specific to stores
```

Generated client/hooks:

```text
NONE
```

Forms/pages/components:

```text
NONE
```

---

## 8. Canonical Behavior

Happy path:

```text
Command execution → RuntimeEngine resolves entity to store via createPrismaStoreProvider → bespoke store or GenericPrismaStore handles CRUD → GenericPrismaStore uses PRISMA_MODEL_METADATA for field name translation. Bespoke stores handle special logic (advisory locks, sequence generation, cross-table queries) before/after generic operations.
```

Failure behavior:

```text
- GenericPrismaStore OCC bug (7 entities): version stuffed into tenantId_id → Prisma rejects → catch swallows → write dropped but HTTP 200 returned. Silent data loss.
- Store resolution failure for unknown entity name → falls back to GenericPrismaStore → may fail on non-existent Prisma model.
- In-memory store used in tests but all production stores are durable.
```

Forbidden behavior:

```text
- Creating raw Prisma queries for governed mutations that bypass the store layer.
- Adding bespoke stores without documenting why GenericPrismaStore is insufficient.
- Declaring `store ... in memory` for production entities (all flipped to durable 2026-06-03).
```

---

## 9. Naming Rules

Canonical name:

```text
Manifest Stores
```

Allowed aliases:

```text
Entity Stores, Prisma Stores, Storage Layer
```

Forbidden aliases:

```text
Database connections, ORM models, Prisma client
```

Casing / slug rules:

```text
- Store class: PascalCase + "PrismaStore" suffix (e.g., EventPrismaStore, PrepTaskPrismaStore)
- Entity name in store registry: PascalCase (e.g., "Event", "PrepTask")
- Factory function: camelCase (e.g., createPrismaStoreProvider, createGenericPrismaStore)
```

---

## 10. Open Questions

Agents may add rows. Agents may not decide for Ryan.

| ID   | Question | Why it matters | Evidence found | Options | Ryan decision |
| ---- | -------- | -------------- | -------------- | ------- | ------------- |
| Q001 | Fix GenericPrismaStore OCC bug for remaining 7 entities? | Silent data loss on version mismatch. Event fixed via bespoke store; others still vulnerable. | prisma-store.ts uses version in compound key. 7 entities affected (Invoice, Payment, InventoryItem, etc.). Memory has full list. | A: Bespoke store per entity (like Event); B: Fix GenericPrismaStore upstream; C: Remove OCC for these entities | NEEDS-RYAN |
| Q002 | Should bespoke stores be governed or remain implementation detail? | Bespoke stores contain business logic (sequence generation, advisory locks) that could drift from .manifest definitions. | 4 bespoke stores with non-trivial logic not declared in .manifest source. | A: Declare bespoke logic in .manifest; B: Keep as implementation detail; C: Auto-generate bespoke store stubs | NEEDS-RYAN |

---

## 11. Decision History

| Date       | Decision | Made by | Reason |
| ---------- | -------- | ------- | ------ |
| 2026-06-26 | Initial evidence gathered | agent | Canonical unit created with real repo evidence |
