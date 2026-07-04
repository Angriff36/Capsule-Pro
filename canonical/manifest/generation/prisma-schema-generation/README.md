# Manifest → Prisma Schema Generation

Canonical ID: `manifest.generation.prisma-schema-generation`

Type: `generator`

Owner decision status: `needs-ryan` (two blockers are upstream `@angriff36/manifest` fixes)

Implementation status: `partial` — schema is hand-authored; manifest validates (does not own) it

Last reviewed: `2026-06-28`

Last updated by: `agent`

---

## 1. What This Is

```text
How the live Prisma schema relates to the Manifest. INTENT: the manifest is the source of truth
and `manifest generate -p prisma` emits packages/database/prisma/schema.prisma. REALITY (2026-06-28):
schema.prisma is HAND-AUTHORED; the manifest emits a separate CI validation artifact
(manifest/ir/generated-schema.prisma) and a 600-line wrapper (generate-full-schema.mjs) drift-checks
+ post-processes it. The wrapper is glue that exists only because the manifest is incomplete.
```

---

## 2. Ryan Final Decision

```text
NEEDS-RYAN. Goal: make `manifest generate -p prisma` emit a valid schema directly so the wrapper
(generate-full-schema.mjs) can be deleted. Two of the four remaining blockers are fixes in the
@angriff36/manifest package (projection + validator), not the capsule manifests.
```

---

## 3. Current Status (verified 2026-06-28, manifest 2.18.6)

```text
Relationship graph: COMPLETE on the capsule side. The raw `-p prisma` projection now emits
ZERO warnings (was 126 missing back-relations). Fixed by adding 122 hasMany back-relations,
wiring 4 real unwired FKs, and removing 4 spurious one-sided hasMany (commits 178c028d1, cafada789).

Remaining blockers to a valid manifest-generated schema:
```

### Blocker A — 17 ambiguous relations (UPSTREAM projection fix)
```text
Entity pairs with 2+ legitimate relations to the same target need Prisma named relations:
  CommandBoardConnection fromCard+toCard → CommandBoardCard
  CycleCountRecord countedBy+verifiedBy → User ; CycleCountSession createdBy+approvedBy → User
  Event venue+venueEntity → Venue ; InventoryTransfer fromLocation+toLocation → StorageLocation
  PerformanceReview employee+reviewer → User ; StaffPerformance employee+reviewer → User
  TrainingAssignment attempts+lastAttempt → TrainingAttempt ; TrainingAttempt.assignment → TrainingAssignment

These are real (a connection has a from-card AND a to-card) — cannot refactor to one. The DSL has
NO relation-naming syntax, and the prisma projection does not emit names.

FIX (in @angriff36/manifest, dist/manifest/projections/prisma/generator.js ~line 410-425):
The PRISMA_RELATION_AMBIGUOUS branch currently pushes a `// … see PRISMA_RELATION_AMBIGUOUS` comment
and `return`s — DROPPING the relation. It already has rel.name, rel.kind, rel.target, and
findOppositeRelations(). Instead it should emit `@relation("<deterministic-name>", fields:…, references:…)`
on BOTH matched sides with a SHARED name (e.g. `${entity}_${rel.name}`), so Prisma can pair them.
~10 lines. Capsule cannot fix this (it's the published package).
```

### Blocker B — 6 validate-ai DOMAIN_UNWIRED_FK false positives (UPSTREAM validator fix)
```text
validate-ai flags budgetId→Budget, venueId→Venue, scheduleId→Schedule, staffMemberId→StaffMember etc.
as unwired, but they are CORRECTLY wired to differently-named parents:
  BudgetAlert.budgetId → LaborBudget   BudgetLineItem.budgetId → EventBudget
  ProcurementBudgetAlert.budgetId → ProcurementBudget   FacilityArea.venueId → Facility
  RevenueRecognitionLine.scheduleId → RevenueRecognitionSchedule   TrainingAssignment.staffMemberId = command param, mutated to employeeId (no FK)
The validator's FK-name→entity-name heuristic is wrong; it should resolve the FK via the declared
belongsTo target, not the field name. Validator fix, not a manifest gap.
```

### Blocker C — 85 DOMAIN_ORPHAN_CREATE (capsule manifest work)
```text
`create` commands take an FK param that should come from parent-context/nested-create/reaction.
Per-case command wiring (real domain work).
```

### Blocker D — 74 infra-core models (capsule manifest work, largest)
```text
Hand-authored Prisma models not in the manifest at all (generate-full-schema.mjs appends them as
pass-throughs). Bringing them into the manifest is what finally retires the wrapper.
```

---

## 4. Where It Lives

```text
Wrapper (glue, target to retire): manifest/scripts/generate-full-schema.mjs
Validation artifact:               manifest/ir/generated-schema.prisma (committed; drift-gated)
Live hand-authored schema:         packages/database/prisma/schema.prisma
Raw projection:                    `pnpm exec manifest generate <ir> -p prisma -s prisma.schema -o <dir>`
Drift gate:                        manifest/scripts/check-schema-drift.mjs
Upstream projection (blocker A):   node_modules/@angriff36/manifest/dist/manifest/projections/prisma/generator.js
```

---

## 11. Decision History

| Date | Decision | Made by | Reason |
|---|---|---|---|
| 2026-06-28 | Completed the relationship graph (0 projection warnings); recorded the 4 remaining schema-ownership blockers (A/B upstream, C/D capsule). | agent | Make the manifest own the schema + retire the wrapper |
