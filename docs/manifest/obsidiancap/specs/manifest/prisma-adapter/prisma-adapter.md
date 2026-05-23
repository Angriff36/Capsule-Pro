# Prisma Adapter for Manifest — Specification

**Status**: Draft
**Last Updated**: 2026-02-15
**Scope**: `packages/manifest-adapters/src/prisma-store.ts` (existing), new generic adapter (v1), optional Prisma generator (v2)

---

## Problem

The current Prisma adapter requires a hand-written `*PrismaStore` class for every Manifest entity. Today there are 12 of these (2,200+ lines), each mapping Prisma model fields to Manifest entity fields by hand. This works but doesn't scale: every new entity needs a new class, a new `mapToManifestEntity` method, a new `load*FromPrisma`/`sync*ToPrisma` pair, and a new case in the `createPrismaStoreProvider` switch.

For external adopters the situation is worse. They'd need to understand their Prisma schema's tenant field naming, soft-delete conventions, composite key shapes, and per-model field mappings before the adapter does anything. That's two weeks of config nobody will actually do. They'll ship it half-wired and get duplicate rows forever.

## Design Direction

### v1 — Generic JSON-backed Store (zero per-entity config)

A single Prisma model (`ManifestEntity`) stores Manifest state as a JSON blob. The adapter implements the `Store<EntityInstance>` interface from `@manifest/runtime` by reading/writing rows in that one table. No per-entity Prisma model mapping. No guessing tenant fields. No heuristics.

**Why this works**: Prisma handles CRUD on a known model. JSON fields are first-class in Prisma. The adapter doesn't need to know anything about the consumer's domain schema.

**What you add once** (schema.prisma):

```prisma
model ManifestEntity {
  tenantId    String
  entityType  String
  id          String
  data        Json
  version     Int       @default(1)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@id([tenantId, entityType, id])
  @@index([tenantId, entityType])
  @@schema("tenant")
}

model ManifestOutboxEvent {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String
  entityType    String
  aggregateId   String
  eventType     String
  payload       Json
  channel       String?
  correlationId String?
  causationId   String?
  emitIndex     Int?
  status        String   @default("pending")
  createdAt     DateTime @default(now())
  publishedAt   DateTime?

  @@index([status, createdAt])
  @@index([tenantId, entityType])
  @@schema("tenant")
}

model ManifestIdempotency {
  tenantId  String
  key       String
  result    Json
  createdAt DateTime @default(now())
  expiresAt DateTime

  @@id([tenantId, key])
  @@index([expiresAt])
  @@schema("tenant")
}
```

**What the adapter does**:

```ts
import type { Store, EntityInstance } from "@manifest/runtime";
import type { PrismaClient } from "@prisma/client";

interface PrismaAdapterConfig {
  prisma: PrismaClient;
  tenantId: string;
  entityType: string;
  generateId?: () => string;
}

class PrismaJsonStore implements Store<EntityInstance> {
  // getAll()  → findMany where tenantId + entityType, return data JSON
  // getById() → findUnique on composite key, return data JSON
  // create()  → create row with data as JSON blob
  // update()  → update row, merge data JSON, bump version
  // delete()  → delete row (or soft-delete via flag in data)
  // clear()   → deleteMany where tenantId + entityType
}
```

**Transactional outbox**: When outbox is enabled, `create`/`update` wrap both the entity write and the `ManifestOutboxEvent` write in a single `prisma.$transaction(async (tx) => { ... })`. Atomic. No vibes.

**Idempotency**: When `IdempotencyStore` is configured, it reads/writes `ManifestIdempotency` rows. The runtime already supports `idempotencyStore` in `RuntimeOptions`.

**Integration with RuntimeEngine**: The adapter plugs in via `storeProvider` in `RuntimeOptions`, same as the existing hand-written stores:

```ts
const runtime = new RuntimeEngine(ir, context, {
  storeProvider: (entityName) =>
    new PrismaJsonStore({
      prisma,
      tenantId,
      entityType: entityName,
    }),
});
```

### v2 — Optional Prisma Generator (auto-mapping into domain tables)

A Prisma generator that reads the schema during `prisma generate` and produces an optional mapping file. This is for teams that want Manifest entities stored in their existing domain tables (like Capsule-Pro does today with the 12 hand-written stores).

The generator would:

1. Read the Prisma schema's models
2. Match them against Manifest entity names (configurable)
3. Produce a typed mapping file with field-level transforms
4. Fail loudly when ambiguous (no silent guessing)

**This is a v2 optimization, not the v1 that people will actually use.**

---

## Current State (Capsule-Pro)

The existing `packages/manifest-adapters/src/prisma-store.ts` contains:

| Component                     | Count | Purpose                                          |
| ----------------------------- | ----- | ------------------------------------------------ |
| Entity-specific Store classes | 12    | `PrepTaskPrismaStore`, `RecipePrismaStore`, etc. |
| `mapToManifestEntity` methods | 12    | Hand-written Prisma → Manifest field mapping     |
| `load*FromPrisma` functions   | 12    | Load entity from Prisma into runtime             |
| `sync*ToPrisma` functions     | 12    | Sync runtime state back to Prisma                |
| `createPrismaStoreProvider`   | 1     | Switch-case factory routing entity names         |
| `PrismaStore` wrapper class   | 1     | Delegates to entity-specific stores + outbox     |
| `createPrismaOutboxWriter`    | 1     | Writes to existing `OutboxEvent` model           |

This is the "v2 approach done manually." It works, it's in production, and it's not going away. The v1 generic adapter is **additive** — it provides a zero-config path for new entities and external adopters without replacing the existing hand-written stores.

### Coexistence Strategy

Both approaches use the same `storeProvider` hook in `RuntimeOptions`. The factory can route some entities to hand-written stores and others to the generic JSON store:

```ts
storeProvider: (entityName) => {
  // Existing hand-written stores for entities that need custom mapping
  const specific = createPrismaStoreProvider(prisma, tenantId)(entityName);
  if (specific) return specific;

  // Fall back to generic JSON store for everything else
  return new PrismaJsonStore({ prisma, tenantId, entityType: entityName });
};
```

---

## Store Interface Contract

From `@manifest/runtime` (`runtime-engine.d.ts`):

```ts
interface EntityInstance {
  id: string;
  version?: number;
  versionAt?: number;
  [key: string]: unknown;
}

interface Store<T extends EntityInstance = EntityInstance> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | undefined>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | undefined>;
  delete(id: string): Promise<boolean>;
  clear(): Promise<void>;
}
```

The generic adapter must implement this exactly. No extensions, no extra methods on the public surface.

---

## Functional Requirements

### FR-1: ManifestEntity CRUD

The `PrismaJsonStore` class implements `Store<EntityInstance>` against the `ManifestEntity` Prisma model.

- `getAll()` returns all rows matching `tenantId` + `entityType`, deserializing `data` JSON into `EntityInstance` (with `id` promoted from the row, not just from JSON)
- `getById(id)` uses the composite primary key `[tenantId, entityType, id]`
- `create(data)` generates an ID if not provided, stores the full entity as `data` JSON, sets `version: 1`
- `update(id, data)` merges into existing `data` JSON (shallow merge), bumps `version`
- `delete(id)` removes the row and returns `true`, or returns `false` if not found
- `clear()` deletes all rows matching `tenantId` + `entityType`

### FR-2: Transactional Outbox

When an `outboxWriter` or `eventCollector` is configured:

- `create` and `update` wrap entity write + outbox writes in `prisma.$transaction(async (tx) => { ... })`
- Events from the collector are written to `ManifestOutboxEvent` with `createMany`
- The event collector array is cleared after flush (prevents double-write on nested calls)
- When no outbox is configured, operations are simple single-table writes (no transaction overhead)

### FR-3: Idempotency Store

A `PrismaIdempotencyStore` class implements `IdempotencyStore` from `@manifest/runtime`:

- `has(key)` checks existence in `ManifestIdempotency` for the tenant
- `set(key, result)` upserts a row with the `CommandResult` as JSON
- `get(key)` retrieves and deserializes the cached result
- Rows have a configurable TTL via `expiresAt`

### FR-4: Tenant Isolation

Every query includes `tenantId` in the WHERE clause. The composite primary key `[tenantId, entityType, id]` makes cross-tenant access structurally impossible at the database level.

### FR-5: Version Support

The `version` column supports optimistic concurrency control:

- `create` sets `version: 1`
- `update` increments `version` and includes the current version in the WHERE clause (optimistic lock)
- If the WHERE doesn't match (concurrent modification), `update` returns `undefined`

---

## Non-Goals (v1)

- Auto-detecting existing Prisma models (v2 generator)
- Soft-delete support (the generic store uses hard deletes; soft-delete is a domain concern for hand-written stores)
- Custom field mapping or transforms (v2 generator)
- Migration tooling from hand-written stores to generic store
- Query/projection support beyond the Store interface (use Prisma directly for reads)

---

## File Layout

```
packages/manifest-adapters/src/
  prisma-store.ts              # Existing 12 hand-written stores (unchanged)
  prisma-json-store.ts         # NEW: Generic JSON-backed PrismaJsonStore
  prisma-idempotency-store.ts  # NEW: PrismaIdempotencyStore
  prisma-outbox.ts             # NEW: Shared outbox writer for ManifestOutboxEvent
```

---

## Acceptance Criteria

1. `PrismaJsonStore` passes the same conformance tests as `MemoryStore` (the runtime's built-in store)
2. Transactional outbox writes are atomic with entity mutations (verified by test that asserts rollback on outbox failure)
3. Tenant isolation is enforced — a store created with tenant A cannot read/write tenant B's data
4. Version-based optimistic concurrency rejects stale updates
5. `PrismaIdempotencyStore` correctly deduplicates repeated command executions
6. Existing hand-written stores continue to work unchanged
7. The `storeProvider` factory can mix hand-written and generic stores

---

## References

- [Prisma JSON fields](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-json-fields)
- [Prisma models](https://www.prisma.io/docs/orm/prisma-schema/data-model/models)
- [Prisma interactive transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- [Prisma generators](https://www.prisma.io/docs/orm/prisma-schema/overview/generators)
- Runtime Store interface: `packages/manifest-runtime/dist/manifest/runtime-engine.d.ts` lines 138-145
- Existing stores: `packages/manifest-adapters/src/prisma-store.ts`
- Runtime wiring: `apps/api/lib/manifest-runtime.ts`
