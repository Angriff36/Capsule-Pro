# Manifest Constraints

Canonical ID: `manifest.language.constraints`

Type: `manifest-capability`

Owner decision status: `needs-ryan`

Implementation status: `working`

Last reviewed: `2026-06-26`

Last updated by: `agent`

---

## 1. What This Is

Plain-English purpose:

```text
Constraints are invariant rules and guards that enforce domain correctness. Defined in .manifest source files, constraints come in two flavors: entity-level invariants (e.g., `constraint validStatus: self.status in [...]`) and command-level guards (evaluated before command execution). Constraints support severity levels (block, warn, ok), overrideable policies, and cross-entity relationship traversal.
```

Real app impact:

```text
When correct:
- Domain invariants are enforced at compile time (compiler validates syntax) and runtime (engine evaluates constraints).
- Guard failures return structured error responses with source locations (file:line).
- Overrideable constraints allow authorized actors to bypass specific invariants.

When wrong:
- Missing constraints → invalid state accepted (e.g., wrong status transitions).
- Constraint failures swallowed silently → data corruption.
- Cross-entity constraints traverse relationships incorrectly → false positives/negatives.
```

---

## 2. Ryan Final Decision

Decision:

```text
NEEDS-RYAN
```

Reason:

```text
Constraint system is fully operational. Open question: whether constraint evaluation should support async predicates (e.g., checking a related entity's state that requires a DB lookup) and whether the current three-severity model (block/warn/ok) should be expanded.
```

Do not do:

```text
Do not bypass constraints in route handlers without registering the bypass.
Do not add constraints that require async DB lookups without verifying the engine supports them.
Do not use constraint severity "ok" to silence legitimate validation warnings.
```

---

## 3. Current Status

Current recorded status:

```text
Constraints are defined across 104 .manifest source files. Enforcement pipeline: before-policy → before-guard → guards → actions → after-emit. Constraint severity levels: block (default, halts execution), warn (logs but continues), ok (acknowledges). Overrideable constraints supported with paired overridePolicy.
```

Known gaps:

```text
- Unknown whether constraint evaluation supports async predicates for cross-entity DB lookups.
- Command-source-map tracks constraint source locations, but the coverage of all constraints in the map is unverified.
- Some constraint expressions may be complex enough to cause performance issues during bulk command execution.
```

Confidence: `medium`

Evidence:

```text
- Source: manifest/source/**/*.manifest (constraint blocks, e.g., proposal-draft-rules.manifest: `constraint validStatus: self.status in [...]`)
- Runtime engine: manifest/runtime/src/runtime-engine.ts (constraint evaluation in command execution pipeline)
- Guard hook: manifest/runtime/src/permission-guard.ts (injects at before-guard)
- Source map: manifest/runtime/src/command-source-map.ts (maps constraint:Entity.name to file:line)
```

---

## 4. Where It Lives

Canonical decision file:

```text
canonical/manifest/language/constraints/README.md
```

Source location:

```text
manifest/source/**/*.manifest (constraint blocks inside entity and command declarations)
Example: manifest/source/ai/proposal-draft-rules.manifest
```

Generated output location:

```text
manifest/ir/kitchen.ir.json (constraints embedded in entity IR)
```

Runtime location:

```text
manifest/runtime/src/runtime-engine.ts (constraint evaluation)
manifest/runtime/src/command-source-map.ts (source location lookup for constraint error messages)
```

UI location:

```text
NONE
```

Test location:

```text
manifest/runtime/src/__tests__/ (constraint-related tests)
```

Docs location:

```text
constitution.md §9 (governed writes)
```

---

## 5. Entry Points

User-facing route:

```text
NONE (constraints are evaluated transparently during command execution)
```

Route file:

```text
NONE
```

API route / dispatcher:

```text
apps/api/app/api/manifest/[entity]/commands/[command]/route.ts (constraints evaluated during command dispatch)
```

CLI command:

```text
pnpm manifest:compile (validates constraint syntax, emits to IR)
```

Background job / cron / worker:

```text
NONE
```

---

## 6. What Consumes It

Direct consumers:

```text
- manifest/runtime/src/runtime-engine.ts (evaluates constraints during command execution)
- manifest/scripts/compile.mjs (validates constraint syntax at compile time)
- manifest/runtime/src/command-source-map.ts (maps constraint names to source locations)
```

Indirect consumers:

```text
- All command dispatch paths (constraints block or warn during execution)
- Error response formatting (constraint violations include source locations)
```

Generated consumers:

```text
- Constraint metadata in IR
- Constraint source locations in command-source-map.json
```

Human consumers:

```text
Ryan, coding agents authoring new constraints or debugging constraint failures.
```

---

## 7. What It Is Wired To

Manifest entities:

```text
All 213 entities (constraints are per-entity)
```

Manifest commands:

```text
All 1,059 commands (constraints evaluated before command execution)
```

Manifest events:

```text
NONE (constraints do not emit events)
```

Manifest policies / access rules:

```text
Overrideable constraints paired with overridePolicy for authorized bypass
```

Database tables / collections:

```text
NONE (constraints are runtime-evaluated, not persisted)
```

Generated types:

```text
NONE specific to constraints
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
Command dispatched → RuntimeEngine evaluates entity constraints → block constraints pass (or execution halts with constraint_violation) → warn constraints logged → command guards evaluated → command executes. Overrideable constraints: if actor has overridePolicy permission, block constraint is skipped.
```

Failure behavior:

```text
- Block constraint fails → execution halts, returns constraint_violation with source location (file:line from source-map).
- Warn constraint fails → logged, execution continues.
- Invalid constraint expression → compile error from manifest compiler.
- Cross-entity constraint on missing relationship → runtime error.
```

Forbidden behavior:

```text
- Silencing constraint violations in route handlers.
- Bypassing constraints without overridePolicy.
- Adding constraints with side effects (constraints must be pure evaluation, no mutations).
```

---

## 9. Naming Rules

Canonical name:

```text
Manifest Constraints
```

Allowed aliases:

```text
Domain Constraints, Invariants, Guards, Validation Rules
```

Forbidden aliases:

```text
Business rules (too broad), validation (implies form-level, not domain-level), assertions
```

Casing / slug rules:

```text
- Constraint name in DSL: camelCase (e.g., validStatus, warnNoClientEmail, positiveVersion)
- Severity prefix: appended to name for warn constraints (e.g., warnNoClientEmail)
- Source map key: constraint:Entity.constraintName
```

---

## 10. Open Questions

Agents may add rows. Agents may not decide for Ryan.

| ID   | Question | Why it matters | Evidence found | Options | Ryan decision |
| ---- | -------- | -------------- | -------------- | ------- | ------------- |
| Q001 | Do constraints support async predicates (cross-entity DB lookups)? | Some invariants may need to check related entity state, requiring async DB access. | Current constraint syntax appears synchronous. No async examples found in source. | A: Add async support; B: Move cross-entity checks to before-guard middleware; C: Keep synchronous only | NEEDS-RYAN |

---

## 11. Decision History

| Date       | Decision | Made by | Reason |
| ---------- | -------- | ------- | ------ |
| 2026-06-26 | Initial evidence gathered | agent | Canonical unit created with real repo evidence |
