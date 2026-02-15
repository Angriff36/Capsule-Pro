0a. Study `specs/manifest/prisma-adapter/prisma-adapter.md` to understand the Prisma adapter specification (v1 generic JSON-backed store, v2 generator roadmap).
0b. Study `@IMPLEMENTATION_PLAN.md` (if present) to understand the plan so far.
0c. Study `packages/manifest-adapters/src/*`, `packages/manifest-runtime/dist/manifest/runtime-engine.d.ts`, and `apps/api/lib/manifest-runtime.ts` with up to 250 parallel Sonnet subagents to understand the existing Store implementations, runtime integration surface, and outbox wiring.
0d. For reference, the relevant code lives in `packages/manifest-adapters/src/`, `packages/manifest-runtime/dist/`, `packages/database/prisma/schema.prisma`, and `apps/api/lib/manifest-runtime.ts`.

1. Study `@IMPLEMENTATION_PLAN.md` (if present; it may be incorrect) and use up to 500 Sonnet subagents (using the Task tool with subagent_type='Explore') to study existing source code and compare it against `specs/manifest/prisma-adapter/prisma-adapter.md`. Use an Opus subagent (Task tool with subagent_type='Opus') to analyze findings, prioritize tasks, and create/update `@IMPLEMENTATION_PLAN.md` as a bullet point list sorted in priority of items yet to be implemented. Ultrathink. Specifically investigate:

   a. **Store interface conformance**: Compare the `Store<EntityInstance>` interface in `runtime-engine.d.ts` against what the spec requires for `PrismaJsonStore`. Confirm the 6 methods (getAll, getById, create, update, delete, clear) and the `EntityInstance` shape (id, version?, versionAt?, [key: string]: unknown).

   b. **Schema additions needed**: Check `packages/database/prisma/schema.prisma` for whether `ManifestEntity`, `ManifestOutboxEvent`, or `ManifestIdempotency` models already exist. Compare against the spec's schema definitions.

   c. **Existing outbox pattern**: Study `createPrismaOutboxWriter` in `prisma-store.ts` and the `OutboxEvent` model in schema.prisma. Determine whether the new `ManifestOutboxEvent` model should coexist with or replace the existing `OutboxEvent`. Document the relationship.

   d. **Idempotency integration**: Check if `IdempotencyStore` is used anywhere in the codebase today. Study the `RuntimeOptions.idempotencyStore` interface in `runtime-engine.d.ts`. Determine if any routes or commands currently use idempotency keys.

   e. **storeProvider coexistence**: Study how `createPrismaStoreProvider` and `_createPrismaStoreProvider` are used in `apps/api/lib/manifest-runtime.ts` and across route handlers. Confirm the coexistence strategy (hand-written stores for existing entities, generic store as fallback) is compatible with current wiring.

   f. **Test infrastructure**: Search for existing store tests, conformance tests, or test utilities in `apps/api/__tests__/` and `packages/manifest-adapters/`. Identify what test patterns exist for the current stores.

   g. **Transaction patterns**: Study how `prisma.$transaction` is used in the existing outbox writer and in route handlers. Confirm the spec's transactional outbox approach matches Prisma's interactive transaction API.

   Consider searching for TODO, minimal implementations, placeholders, skipped/flaky tests, and inconsistent patterns related to stores, outbox, and idempotency.

IMPORTANT: Plan only. Do NOT implement anything. Do NOT assume functionality is missing; confirm with code search first. The existing 12 hand-written stores in `prisma-store.ts` are production code and must not be modified. The generic adapter is additive.

ULTIMATE GOAL: Deliver a zero-config, generic JSON-backed Prisma adapter (`PrismaJsonStore`) that implements the Manifest `Store<EntityInstance>` interface, supports transactional outbox via `ManifestOutboxEvent`, and provides `PrismaIdempotencyStore` for command deduplication. The adapter must coexist with the existing 12 hand-written entity-specific stores. New entities and external adopters get a plug-and-play path that requires adding 1-3 Prisma models and zero per-entity configuration. Consider missing elements and plan accordingly. If an element is missing, search first to confirm it doesn't exist, then if needed author the specification at `specs/manifest/prisma-adapter/FILENAME.md`. If you create a new element then document the plan to implement it in `@IMPLEMENTATION_PLAN.md` using a subagent.
