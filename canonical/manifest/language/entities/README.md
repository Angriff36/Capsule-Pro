# Manifest Entities

Canonical ID: `manifest.language.entities`

Type: `manifest-capability`

Owner decision status: `needs-ryan`

Implementation status: `working`

Last reviewed: `2026-06-26`

Last updated by: `agent`

---

## 1. What This Is

Plain-English purpose:

```text
Entities are the core domain objects in the Manifest DSL. Every entity is authored in a .manifest source file, compiled into the merged IR, and projected into Prisma schema + runtime artifacts. Entities define properties, relationships, commands, events, constraints, and policies in one declarative surface.
```

Real app impact:

```text
When correct:
- All governed domain mutations flow through entity-bound commands.
- Prisma schema, TypeScript types, and runtime accessors stay in sync with the single source of truth.
- Agents can count entities, list their commands, and resolve entity-to-model mappings from the IR.

When wrong:
- Entities drift between .manifest source, Prisma schema, and runtime (schema-mismatch bugs).
- Agents hand-write Prisma queries that bypass governed commands.
- Table name mismatches cause P3018 migration failures (@@map surprises).
```

---

## 2. Ryan Final Decision

Decision:

```text
NEEDS-RYAN
```

Reason:

```text
Entity authoring is established, but the entity-to-table mapping convention (PascalCase model vs @@map overrides vs snake_case) has burned past sessions repeatedly. A final decision on whether to standardize naming or keep the current mixed convention is open.
```

Do not do:

```text
Do not hand-author Prisma models outside manifest-driven generation.
Do not guess table names — always grep for @@map in schema.prisma before writing raw SQL.
Do not create entities in code without a corresponding .manifest source definition.
```

---

## 3. Current Status

> **2026-07-11 — EntityVersion nullable string defaults corrected.** `EntityVersion.snapshotData`
> and `EntityVersion.metadata` are nullable serialized-string fields backed by Prisma `String?` /
> PostgreSQL `TEXT`. `EntityVersion.create(snapshot: string)` persists the supplied snapshot into
> `snapshotData`; omitted `metadata` materializes as `null`. The Capsule source therefore declares
> both fields without defaults. Empty object defaults were invalid under Manifest 3.4.25 and did not
> represent the persistence contract.

Current recorded status:

```text
Entity system is fully operational. 104 .manifest source files, 213 entities in IR, 311 Prisma models (including non-manifest models).
```

Known gaps:

```text
- 311 Prisma models vs 213 IR entities — ~98 models have no manifest governance (legacy, infra, test-only).
- Table naming is mixed: some entities use @@map (snake_case), others default to PascalCase model name.
- constitution.md §9 governs all mutations; reads bypass runtime per §10.
```

Confidence: `high`

Evidence:

```text
- Source: manifest/source/**/*.manifest (104 files, 13 domain subdirectories)
- IR: manifest/ir/kitchen.ir.json (213 entities, compiler 2.18.0)
- Schema: packages/database/prisma/schema.prisma (311 models)
- Governance registries: manifest/governance/entities.json
- Runtime generated: manifest/runtime/src/generated/entity-accessor.generated.ts, entity-to-prisma-model.generated.ts
```

---

## 4. Where It Lives

Canonical decision file:

```text
canonical/manifest/language/entities/README.md
```

Source location:

```text
manifest/source/**/*.manifest (104 files across ai/, core/, crm/, events/, finance/, inventory/, kitchen/, operations/, platform/, procurement/, quality/, staff/)
```

Generated output location:

```text
manifest/ir/kitchen.ir.json (merged IR)
packages/database/prisma/schema.prisma (Prisma projection)
```

Runtime location:

```text
manifest/runtime/src/generated/entity-accessor.generated.ts
manifest/runtime/src/generated/entity-to-prisma-model.generated.ts
manifest/runtime/src/generated/prisma-model-metadata.generated.ts
```

UI location:

```text
NONE
```

Test location:

```text
manifest/runtime/src/__tests__/ (entity-level command smoke tests)
```

Docs location:

```text
docs/database/SCHEMAS.md, docs/database/CONTRIBUTING.md
```

---

## 5. Entry Points

User-facing route:

```text
NONE (entities are not directly user-facing; commands on entities are dispatched via /api/manifest/[entity]/commands/[command])
```

Route file:

```text
NONE
```

API route / dispatcher:

```text
apps/api/app/api/manifest/[entity]/commands/[command]/route.ts (command dispatch, not entity listing)
```

CLI command:

```text
pnpm manifest:compile (runs manifest/scripts/compile.mjs → emits IR + registry + generated artifacts)
```

Background job / cron / worker:

```text
NONE
```

---

## 6. What Consumes It

Direct consumers:

```text
- manifest/scripts/compile.mjs (compiles all .manifest files into merged IR — see [ir-compilation](../../generation/ir-compilation/README.md); NB the stock CLI's old "last file wins" glob bug is FIXED ≥2.10.0, the CLI is not broken)
- manifest/runtime/src/runtime-engine.ts (loads IR, executes entity commands)
- manifest/governance/entities.json (governance registry)
- apps/api/lib/manifest/execute-command.ts (dispatches commands on entities)
```

Indirect consumers:

```text
- All app routes that read/write entity data (reads bypass runtime per §10; writes go through governed commands)
- Generated TypeScript types and hooks
- Prisma schema (projected from entity definitions)
```

Generated consumers:

```text
- entity-accessor.generated.ts, entity-to-prisma-model.generated.ts, prisma-model-metadata.generated.ts
- commands.registry.json, routes.manifest.json
```

Human consumers:

```text
Ryan, coding agents, domain authors writing .manifest files.
```

---

## 7. What It Is Wired To

Manifest entities:

```text
All 213 entities in IR (e.g., Event, Invoice, Payment, PrepTask, Proposal, Client, etc.)
```

Manifest commands:

```text
1,059 commands across 211 entities (see commands/README.md)
```

Manifest events:

```text
~1,054 event types declared inside entity command blocks (see events/README.md)
```

Manifest policies / access rules:

```text
Role-based policies per entity defined in .manifest source files (see policies/README.md)
```

Database tables / collections:

```text
311 Prisma models in tenant_staff, tenant_admin, and other schemas. Table names vary: some use @@map overrides, others default to PascalCase model name.
```

Generated types:

```text
manifest/runtime/src/generated/*.generated.ts
```

Generated client/hooks:

```text
manifest/runtime/src/generated/* (projected from IR)
```

Forms/pages/components:

```text
apps/app/app/ (entity-specific UI surfaces)
```

---

## 8. Canonical Behavior

Happy path:

```text
Author defines entity in .manifest source → compile emits IR + Prisma schema + runtime artifacts → governed commands mutate entity state via RuntimeEngine → reads bypass runtime per §10 → table names resolved via @@map or default.
```

Failure behavior:

```text
- Missing @@map lookup → wrong table name in raw SQL → P3018 migration failure.
- Entity in code but not in .manifest → ungoverned mutation (nonconforming per §9).
- Compiler version drift → stale generated artifacts → manifest:ci catches via drift gates.
```

Forbidden behavior:

```text
- Hand-authoring Prisma models that duplicate .manifest entities.
- Guessing table names without verifying @@map in schema.prisma.
- Creating raw-Prisma mutations that bypass governed commands (§9 violation unless in bypass registry).
- Using PascalCase model name as table name without verification.
```

---

## 9. Naming Rules

Canonical name:

```text
Manifest Entities
```

Allowed aliases:

```text
Entity DSL, Domain Entities, Manifest Entity Definitions
```

Forbidden aliases:

```text
Prisma models (these are the projection, not the definition), database tables
```

Casing / slug rules:

```text
- Entity name in DSL: PascalCase (e.g., EventStaff, Invoice, PrepTask)
- Entity name in registry: PascalCase (e.g., "EventStaff")
- Table name in Prisma: varies — check @@map in schema.prisma (may be snake_case, PascalCase, or custom)
- File name in source: kebab-case (e.g., event-rules.manifest)
- Route segment: kebab-case (e.g., /api/manifest/event-staff/commands/...)
```

---

## 10. Open Questions

Agents may add rows. Agents may not decide for Ryan.

| ID   | Question | Why it matters | Evidence found | Options | Ryan decision |
| ---- | -------- | -------------- | -------------- | ------- | ------------- |
| Q001 | Should table naming be standardized (all @@map snake_case vs current mixed)? | Mixed naming causes P3018 failures and agent confusion. | 311 Prisma models: some use @@map (snake_case), others default to PascalCase. No standard enforced. | A: Mandate @@map for all entities; B: Keep current mixed; C: Migrate to all-PascalCase | NEEDS-RYAN |
| Q002 | What to do with the ~98 Prisma models that have no manifest entity? | These are ungoverned — reads are fine per §10 but writes need governance or explicit bypass. | 311 Prisma models vs 213 IR entities. Legacy/infra models exist outside manifest governance. | A: Govern all; B: Register as bypass-approved; C: Leave ungoverned with documentation | NEEDS-RYAN |

---

## 11. Decision History

| Date       | Decision | Made by | Reason |
| ---------- | -------- | ------- | ------ |
| 2026-07-11 | Keep EntityVersion snapshotData and metadata as nullable serialized strings with no source default | agent | Prisma, migrations, runtime command behavior, and generated contracts agree; Manifest 3.4.25 rejects the former object literals |
| 2026-06-26 | Initial evidence gathered | agent | Canonical unit created with real repo evidence |
