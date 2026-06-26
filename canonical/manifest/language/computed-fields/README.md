# Manifest Computed Fields

Canonical ID: `manifest.language.computed-fields`

Type: `manifest-capability`

Owner decision status: `needs-ryan`

Implementation status: `working`

Last reviewed: `2026-06-26`

Last updated by: `agent`

---

## 1. What This Is

Plain-English purpose:

```text
Computed fields are derived values declared in .manifest source files using expressions like `computed fieldName: type = expression cache scope`. They aggregate related entity data (count_of, sum_of, filter + aggregate) and cache results at request, session, or TTL scope. Computed fields exist in the compiled IR but are NOT consumed by the application layer.
```

Real app impact:

```text
When correct:
- N/A for current state. Computed fields are inert — the app layer bypasses Manifest runtime for reads per constitution §10, so computed values are never observed through the runtime path.

When wrong:
- Adding new computed fields is wasted effort — they compile into IR but zero app consumers use evaluateComputed().
- Existing 731 computed definitions in IR represent maintenance burden with no runtime benefit.
- Agents may assume computeds are live and design features around them, then discover they are unreachable.
```

---

## 2. Ryan Final Decision

Decision:

```text
NEEDS-RYAN
```

Reason:

```text
The computed-fields vein was HALTED as inert (verified 2026-06-21). Computed fields exist in IR but have zero app-layer consumers. Every app read bypasses Manifest runtime per constitution §10 and reimputes derived values in SQL/custom code. This is a deliberate fork — continuing to mint new computeds is prohibited until Ryan decides whether to (a) route reads through runtime, (b) materialize computeds as Prisma columns, or (c) accept the current inert status.
```

Do not do:

```text
⛔ DO NOT MINT NEW COMPUTED FIELDS. The vein is HALTED. This was verified across multiple sessions (through 2026-06-24). See MEMORY.md "⛔ Aggregate-computed vein HALTED" entry.
Do not design features that depend on computed fields being live at runtime.
Do not add evaluateComputed() calls to app code without Ryan's explicit approval.
```

---

## 3. Current Status

Current recorded status:

```text
731 computed field definitions across 100+ .manifest source files. Compiled into IR. ZERO app-layer consumers — only test files and one inventory command use evaluateComputed(). App reads bypass runtime per §10 and recompute derived values in SQL/custom code.
```

Known gaps:

```text
- HARD STOP: Do NOT propose new computeds. The vein is HALTED as inert (MEMORY.md, confirmed 2026-06-21 through 2026-06-24, user dismissed fork question 4x).
- Existing 731 computed definitions are maintenance burden with no observable benefit.
- evaluateComputed() exists in runtime but is effectively dead code for app-layer reads.
- Constitution §10 (Read Path Freedom) is the structural reason computeds are inert: reads bypass runtime, so runtime-evaluated computeds are never reached.
```

Confidence: `high`

Evidence:

```text
- Source: manifest/source/**/*.manifest (731 computed field definitions)
- IR: manifest/ir/kitchen.ir.json (computeds embedded)
- Runtime: manifest/runtime/src/runtime-engine.ts (evaluateComputed method exists)
- App consumers: NONE found in apps/ directory (confirmed by agent search — 20 references total, all in test files or unrelated variable names)
- Only production use: manifest/runtime/src/kitchen/commands/inventory.ts (quantityAvailable)
- Constitution: constitution.md §10 "Read Path Freedom" (reads may bypass Manifest runtime)
- Memory: MEMORY.md "⛔ Aggregate-computed vein HALTED" entry (verified through 2026-06-24)
```

---

## 4. Where It Lives

Canonical decision file:

```text
canonical/manifest/language/computed-fields/README.md
```

Source location:

```text
manifest/source/**/*.manifest (computed blocks inside entity declarations)
Example: manifest/source/staff/training-module-rules.manifest:
  computed isDeleted: boolean = self.deletedAt != null
  computed passedAttemptCount: int = count_of(filter(self.attempts, (a) => a.passed == true)) cache request
```

Generated output location:

```text
manifest/ir/kitchen.ir.json (computeds embedded in entity IR)
```

Runtime location:

```text
manifest/runtime/src/runtime-engine.ts (evaluateComputed method)
```

UI location:

```text
NONE
```

Test location:

```text
manifest/runtime/src/__tests__/manifest-builtins.test.ts (evaluateComputed tests only)
```

Docs location:

```text
constitution.md §10 (Read Path Freedom — structural reason computeds are inert)
```

---

## 5. Entry Points

User-facing route:

```text
NONE (computed fields are not exposed via API)
```

Route file:

```text
NONE
```

API route / dispatcher:

```text
NONE (app reads bypass runtime per §10)
```

CLI command:

```text
pnpm manifest:compile (compiles computed definitions into IR)
```

Background job / cron / worker:

```text
NONE
```

---

## 6. What Consumes It

Direct consumers:

```text
- manifest/runtime/src/runtime-engine.ts (evaluateComputed method — effectively dead code for app reads)
- manifest/runtime/src/kitchen/commands/inventory.ts (quantityAvailable — only production usage)
- manifest/runtime/src/__tests__/manifest-builtins.test.ts (test-only usage)
```

Indirect consumers:

```text
NONE (no app code imports or evaluates computed fields)
```

Generated consumers:

```text
- Computed field metadata in IR (unconsumed by app layer)
```

Human consumers:

```text
NONE (computed fields are invisible to users; agents are warned not to use them)
```

---

## 7. What It Is Wired To

Manifest entities:

```text
Entities that declare computed fields (100+ entities have at least one)
```

Manifest commands:

```text
NONE (computed fields are not wired to command execution)
```

Manifest events:

```text
NONE
```

Manifest policies / access rules:

```text
NONE
```

Database tables / collections:

```text
NONE (computed fields are not materialized as columns — no migration needed)
```

Generated types:

```text
Computed field type metadata in IR
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
[THEORETICAL — NOT OBSERVED IN PRACTICE]
Entity read → Manifest runtime evaluates computed field → returns derived value. Cache scope (request/session/TTL) controls recomputation frequency.
```

Failure behavior:

```text
- Computed field expression error → runtime evaluation failure (irrelevant — never reached by app reads).
- Cache staleness → stale derived values (irrelevant — never reached).
```

Forbidden behavior:

```text
⛔ DO NOT MINT NEW COMPUTED FIELDS (vein HALTED, user dismissed 4x).
Do not design features that depend on evaluateComputed() being live in app code.
Do not materialize computed fields as Prisma columns without Ryan's approval (requires migration).
Do not import evaluateComputed into app-layer code.
```

---

## 9. Naming Rules

Canonical name:

```text
Manifest Computed Fields
```

Allowed aliases:

```text
Computed Properties, Derived Fields, Aggregate Computeds
```

Forbidden aliases:

```text
Virtual columns (these are not Prisma columns), materialized views
```

Casing / slug rules:

```text
- Computed field name in DSL: camelCase (e.g., isDeleted, passedAttemptCount, totalPaidAmount)
- Cache scope: keyword after expression (request, session, ttl <seconds>)
```

---

## 10. Open Questions

Agents may add rows. Agents may not decide for Ryan.

| ID   | Question | Why it matters | Evidence found | Options | Ryan decision |
| ---- | -------- | -------------- | -------------- | ------- | ------------- |
| Q001 | What to do with 731 inert computed fields? | Maintenance burden with no observable benefit. Clutter in IR and source. | 731 computed definitions in IR, zero app consumers. evaluateComputed() effectively dead code. | A: Delete all computeds from source; B: Keep as documentation of intended logic; C: Route some reads through runtime to make them live | NEEDS-RYAN |
| Q002 | Should reads route through Manifest runtime (making computeds observable)? | Constitution §10 allows reads to bypass runtime. Routing reads through runtime would make computeds live but is a major architectural change. | §10: "Read paths may bypass Manifest runtime." Current app reads are raw DB queries. | A: Route reads through runtime; B: Keep current bypass; C: Hybrid (some reads through runtime) | NEEDS-RYAN |
| Q003 | Should high-value computeds be materialized as Prisma columns? | Some computeds (e.g., totalPaidAmount, confirmedStaffCount) are useful for list views and could be maintained via reactions. | Previous vein shipped 3 Event computeds (totalPaidAmount, confirmedStaffCount, confirmedGuestCount) to IR only — no column materialization. | A: Materialize selected computeds as columns via reactions; B: Keep IR-only; C: Delete | NEEDS-RYAN |

---

## 11. Decision History

| Date       | Decision | Made by | Reason |
| ---------- | -------- | ------- | ------ |
| 2026-06-26 | Initial evidence gathered | agent | Canonical unit created with real repo evidence |
| 2026-06-21 | Computed-fields vein HALTED | agent (per user dismissal) | User dismissed fork question 4x across 3 days. Computeds are inert — zero app consumers. |
