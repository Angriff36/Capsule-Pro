# Manifest Commands

Canonical ID: `manifest.language.commands`

Type: `manifest-capability`

Owner decision status: `needs-ryan`

Implementation status: `working`

Last reviewed: `2026-06-26`

Last updated by: `agent`

---

## 1. What This Is

Plain-English purpose:

```text
Commands are the governed mutation interface for every entity. Authored as `command verb(params) { guards; actions; emit events }` blocks inside entity declarations in .manifest source files, compiled into a flat sorted registry, and dispatched at runtime through a single dynamic catch-all API route. Every governed write must go through a registered command.
```

Real app impact:

```text
When correct:
- All domain mutations are governed: policy-checked, guard-validated, constraint-enforced, event-emitted.
- Error responses include DSL source locations (file:line from source-map).
- Dead commands (FSM-unreachable) are caught by the audit-dead-commands CI gate.

When wrong:
- Ungoverned mutations bypass the registry → drift, data corruption, nonconforming writes (§9 violation).
- Duplicate route-specific business logic reimplements what commands should do.
- Stale registry allows executing commands that no longer exist in source.
```

---

## 2. Ryan Final Decision

Decision:

```text
NEEDS-RYAN
```

Reason:

```text
Command system is established and working. Open question: whether the dead-command FSM scanner should be promoted from review-only to hard-blocking in CI, and whether unregistered commands should be auto-rejected at runtime (currently soft-fail).
```

Do not do:

```text
Do not create direct Prisma writes that bypass the command dispatcher (unless in the approved bypass registry per §9).
Do not invent route-specific business logic that reimplements command behavior.
Do not hand-write command payloads without verifying against the registry.
```

---

## 3. Current Status

Current recorded status:

```text
1,059 commands across 211 entities, authored in 101 .manifest source files. Registry is flat JSON, sorted lexicographically by entity then command. Dispatch is a single dynamic catch-all route.
```

Known gaps:

```text
- 33 guarded dead-command findings from audit-dead-commands.mjs (3 fixed, 30 review-only). Most are unguarded transitions that need manual review.
- Command resolver handles kebab-to-camelCase URL normalization (route segment soft-delete → command softDelete).
- Registry coverage gate test enforces >= 500 entries (current: 1,059).
```

Confidence: `high`

Evidence:

```text
- Registry: manifest/runtime/commands.registry.json (1,059 entries)
- IR copy: manifest/ir/kitchen.commands.json (identical content)
- Typed exports: @repo/manifest-runtime/commands-registry, command-source-map, command-resolver
- Dispatch route: apps/api/app/api/manifest/[entity]/commands/[command]/route.ts
- Core executor: apps/api/lib/manifest/execute-command.ts → @repo/manifest-runtime/run-manifest-command-core
- Compile logging: manifest/scripts/compile.mjs emits "Emitted 1059 entries to commands.registry.json"
- Coverage gate: manifest/runtime/src/__tests__/commands-registry.test.ts (>= 500)
- Dead-command scanner: manifest/scripts/audit-dead-commands.mjs
```

---

## 4. Where It Lives

Canonical decision file:

```text
canonical/manifest/language/commands/README.md
```

Source location:

```text
manifest/source/**/*.manifest (command blocks inside entity declarations, 101 files across 13 domain subdirectories)
```

Generated output location:

```text
manifest/runtime/commands.registry.json (flat sorted registry)
manifest/ir/kitchen.commands.json (IR copy)
```

Runtime location:

```text
manifest/runtime/src/commands-registry.ts (typed loader)
manifest/runtime/src/command-source-map.ts (source file:line lookup)
manifest/runtime/src/command-resolver.ts (resolveCommand, isRegisteredCommand)
apps/api/lib/manifest/execute-command.ts (dispatch wrapper)
```

UI location:

```text
NONE (commands invoked via API from UI components using executeCommand helper)
```

Test location:

```text
manifest/runtime/src/__tests__/commands-registry.test.ts
manifest/runtime/src/__tests__/manifest-command-smoke/ (per-entity smoke tests)
```

Docs location:

```text
constitution.md §9 (governed writes)
```

---

## 5. Entry Points

User-facing route:

```text
POST /api/manifest/[entity]/commands/[command]
```

Route file:

```text
apps/api/app/api/manifest/[entity]/commands/[command]/route.ts (singular dynamic catch-all, @generated)
```

API route / dispatcher:

```text
apps/api/lib/manifest/execute-command.ts → @repo/manifest-runtime/run-manifest-command-core
```

CLI command:

```text
pnpm manifest:compile (emits commands.registry.json)
pnpm manifest:audit:strict (runs audit-dead-commands.mjs)
```

Background job / cron / worker:

```text
NONE (commands are synchronous request-response, though some are declared `async command` in DSL)
```

---

## 6. What Consumes It

Direct consumers:

```text
- manifest/runtime/src/runtime-engine.ts (executes commands via runCommand)
- apps/api/app/api/manifest/[entity]/commands/[command]/route.ts (HTTP dispatch)
- manifest/scripts/audit-dead-commands.mjs (dead-command FSM scanner)
- manifest/runtime/src/command-resolver.ts (registry lookup + URL normalization)
```

Indirect consumers:

```text
- All UI components that call executeCommand(entity, command, payload)
- All middleware reactions that dispatch governed commands (via runManifestCommandCore)
- Apps that import from @repo/manifest-runtime/commands-registry
```

Generated consumers:

```text
- commands.registry.json (flat registry, consumed by runtime and CI)
- command-source-map.json (source location lookup for error annotations)
```

Human consumers:

```text
Ryan, coding agents, CI pipelines.
```

---

## 7. What It Is Wired To

Manifest entities:

```text
All 211 entities that have at least one command (of 213 total entities)
```

Manifest commands:

```text
1,059 registered commands (e.g., Event.create, Event.update, PrepTask.claim, Invoice.voidInvoice)
```

Manifest events:

```text
Events emitted inside command blocks (see events/README.md)
```

Manifest policies / access rules:

```text
Policies evaluated before command execution (see policies/README.md)
```

Database tables / collections:

```text
Tables backing the 211 command-bearing entities
```

Generated types:

```text
RegistryEntry type from @repo/manifest-runtime/commands-registry
ResolvedCommand from @repo/manifest-runtime/command-resolver
SourceLocation from @repo/manifest-runtime/command-source-map
```

Generated client/hooks:

```text
executeCommand helper used across apps/app
```

Forms/pages/components:

```text
All UI forms that submit domain mutations via executeCommand
```

---

## 8. Canonical Behavior

Happy path:

```text
Client POSTs /api/manifest/Event/commands/create → route resolves "Event"."create" against registry → runManifestCommandCore bootstraps RuntimeEngine from IR → engine evaluates policies, guards, constraints → executes command → emits events → returns structured result. Error responses include source-map file:line for the failing guard/constraint.
```

Failure behavior:

```text
- Unknown command (not in registry) → structured error: unknown_command.
- Policy denied → policy_denied.
- Guard failed → guard_failed (with source location).
- Constraint violated → constraint_violation (with source location).
- Dead-command (FSM-unreachable) → caught by CI audit gate (review-only or guarded depending on finding).
```

Forbidden behavior:

```text
- Direct Prisma mutations outside governed commands (§9 violation).
- Route-specific business logic that duplicates command behavior.
- Hand-writing command payloads without registry verification.
- Invoking commands not present in commands.registry.json.
```

---

## 9. Naming Rules

Canonical name:

```text
Manifest Commands
```

Allowed aliases:

```text
Command DSL, Domain Commands, Governed Commands
```

Forbidden aliases:

```text
API endpoints, REST actions, Prisma mutations
```

Casing / slug rules:

```text
- Command in DSL: camelCase verb (e.g., create, update, softDelete, markOverdue)
- Command in registry: Entity.command (PascalCase entity dot camelCase verb, e.g., "Event.create")
- URL segment: kebab-case (e.g., /commands/soft-delete resolves to softDelete)
- Entity prefix: PascalCase (e.g., Event, PrepTask)
```

---

## 10. Open Questions

Agents may add rows. Agents may not decide for Ryan.

| ID   | Question | Why it matters | Evidence found | Options | Ryan decision |
| ---- | -------- | -------------- | -------------- | ------- | ------------- |
| Q001 | Should dead-command FSM scanner be promoted from review-only to hard-blocking in CI? | 30 unguarded dead-command findings exist. Currently review-only; promotion would fail CI until fixed. | audit-dead-commands.mjs produces guarded (hard) and unguarded (review-only) findings. Current: 0 guarded / 31 unguarded. | A: Promote all to hard-blocking; B: Keep review-only; C: Promute guarded-only | NEEDS-RYAN |
| Q002 | Should unregistered commands be rejected at runtime (currently soft-fail)? | An unregistered command returns an error but the system could be stricter. | command-resolver.ts returns null for unregistered commands; execute-command.ts handles this. | A: Hard reject; B: Keep current soft-fail | NEEDS-RYAN |

---

## 11. Decision History

| Date       | Decision | Made by | Reason |
| ---------- | -------- | ------- | ------ |
| 2026-06-26 | Initial evidence gathered | agent | Canonical unit created with real repo evidence |
