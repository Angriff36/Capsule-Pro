# Manifest Events

Canonical ID: `manifest.language.events`

Type: `manifest-capability`

Owner decision status: `needs-ryan`

Implementation status: `working`

Last reviewed: `2026-06-26`

Last updated by: `agent`

---

## 1. What This Is

Plain-English purpose:

```text
Semantic domain events represent the result of successful governed command execution. Events are declared inside command blocks via `emit EventName` in .manifest source files, emitted by the RuntimeEngine after command success, and consumed by cross-entity middleware (reactions) registered in the middleware registry. Events are runtime-only — they cannot be synthesized outside the Manifest runtime (constitution § Semantic Events).
```

Real app impact:

```text
When correct:
- Cross-entity side effects (e.g., EventFinalized → release reserved inventory) are captured as declarative reactions, not scattered route handlers.
- Event emission is atomic with command execution — if the command rolls back, the event is not emitted.
- Reactions dispatch governed commands, maintaining the full governance chain.

When wrong:
- Routes or jobs fabricate domain events outside runtime (nonconforming per constitution).
- Reactions bypass governed commands (raw Prisma writes inside middleware).
- Event naming drifts from PastTense convention, making reaction wiring fragile.
```

---

## 2. Ryan Final Decision

Decision:

```text
NEEDS-RYAN
```

Reason:

```text
Event system is established. Open question: whether reaction middleware should be promoted from a runtime-sidecar pattern to a first-class DSL construct (e.g., `reaction EventFinalized → InventoryItem.releaseReservation` in .manifest source).
```

Do not do:

```text
Do not synthesize semantic events outside Manifest runtime (constitution violation).
Do not use operational logs, analytics events, or telemetry as semantic events.
Do not bypass governed commands inside reaction middleware.
Do not create events that are not emitted by a governed command.
```

---

## 3. Current Status

Current recorded status:

```text
~1,054 event types declared across 104 manifest source files. Events are emitted inside command blocks and consumed by ~67 middleware files registered in middleware-registry.ts. Pipeline: author in .manifest → compile to IR → emit at runtime → react via middleware.
```

Known gaps:

```text
- Reactions are defined in TypeScript middleware files, NOT in .manifest source files. The DSL has no first-class `reaction` keyword.
- middleware-registry.ts is 1,377 lines — large, manually maintained.
- Some orphan events have no registered reaction (expected for terminal events like EventFinalized that have multiple reaction legs).
- Event count (~1,054) is approximate — derived from agent survey, not directly counted.
```

Confidence: `high`

Evidence:

```text
- Source: manifest/source/**/*.manifest (104 files, events co-located with commands)
- Runtime emission: manifest/runtime/src/runtime-engine.ts (runCommand emits events)
- Middleware registry: manifest/runtime/src/middleware/middleware-registry.ts (1,377 lines)
- Middleware files: manifest/runtime/src/middleware/ (~67 files)
- Constitution: constitution.md "Semantic event" section (runtime-only emission rule)
- Event naming: PastTense pattern (EventCreated, PaymentApplied, EventFinalized, etc.)
```

---

## 4. Where It Lives

Canonical decision file:

```text
canonical/manifest/language/events/README.md
```

Source location:

```text
manifest/source/**/*.manifest (events declared via `emit EventName` inside command blocks)
manifest/source/events/event-rules.manifest (event lifecycle rules)
manifest/source/platform/reactions.manifest (cross-entity reaction documentation)
```

Generated output location:

```text
manifest/ir/kitchen.ir.json (events embedded in entity IR)
```

Runtime location:

```text
manifest/runtime/src/runtime-engine.ts (event emission)
manifest/runtime/src/middleware/middleware-registry.ts (reaction registration)
manifest/runtime/src/middleware/ (67 reaction implementation files)
```

UI location:

```text
NONE
```

Test location:

```text
manifest/runtime/src/__tests__/ (event-related tests)
tools/reactions-log/ (reaction execution log dashboard)
```

Docs location:

```text
constitution.md "Semantic event" section
```

---

## 5. Entry Points

User-facing route:

```text
NONE (events are internal; not directly user-facing)
```

Route file:

```text
NONE (events emitted by runtime engine, not by routes)
```

API route / dispatcher:

```text
NONE (events trigger middleware reactions internally)
```

CLI command:

```text
pnpm manifest:compile (compiles event declarations into IR)
```

Background job / cron / worker:

```text
NONE (reactions are synchronous or async middleware, not background jobs)
```

---

## 6. What Consumes It

Direct consumers:

```text
- manifest/runtime/src/runtime-engine.ts (emits events after command success)
- manifest/runtime/src/middleware/middleware-registry.ts (routes events to reaction handlers)
- manifest/runtime/src/middleware/*.ts (67 reaction implementation files)
```

Indirect consumers:

```text
- Domain workflows that depend on cross-entity side effects (e.g., finalize → release inventory → create followup)
- Reaction log dashboard (tools/reactions-log/)
- Telemetry (onCommandSettled hook tracks emitted events)
```

Generated consumers:

```text
- Event type declarations in IR (manifest/ir/kitchen.ir.json)
```

Human consumers:

```text
Ryan, coding agents writing new reactions or event declarations.
```

---

## 7. What It Is Wired To

Manifest entities:

```text
All entities that have commands emitting events (most of the 213 entities)
```

Manifest commands:

```text
Commands that contain `emit EventName` statements
```

Manifest events:

```text
~1,054 event types (EventCreated, EventUpdated, PaymentApplied, EventFinalized, LeadConverted, etc.)
```

Manifest policies / access rules:

```text
Policies evaluated on the originating command, not on events directly
```

Database tables / collections:

```text
Events are not persisted as separate records. They trigger middleware reactions that may persist side effects.
```

Generated types:

```text
Event type metadata in IR
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
Governed command succeeds → RuntimeEngine emits declared events → middleware-registry routes events to registered reactions → reactions dispatch governed commands or perform async side effects → entire chain maintains governance boundary.
```

Failure behavior:

```text
- If command fails or rolls back, semantic events are NOT emitted (constitutional guarantee).
- If a reaction's governed command fails, the middleware handles retries per registered retry policy.
- Orphan events (no registered reaction) are silently ignored — not an error.
```

Forbidden behavior:

```text
- Synthesizing semantic events outside Manifest runtime (routes, jobs, scripts).
- Fabricating domain events in tests that bypass the runtime engine.
- Using operational/analytics/telemetry events as semantic events.
- Bypassing governed commands inside reaction handlers (raw Prisma writes).
```

---

## 9. Naming Rules

Canonical name:

```text
Manifest Events
```

Allowed aliases:

```text
Domain Events, Semantic Events, Manifest Event System
```

Forbidden aliases:

```text
Webhook events, analytics events, operational events, telemetry events (these are NOT semantic events per constitution)
```

Casing / slug rules:

```text
- Event name in DSL: PascalCase PastTense (e.g., EventCreated, PaymentApplied, EventFinalized)
- Event key in IR: entity.event-type (e.g., "event.finalized", "payment.processed", "staff.lead.created")
- Middleware registry name: kebab-case (e.g., "payment-processed-invoice-apply")
```

---

## 10. Open Questions

Agents may add rows. Agents may not decide for Ryan.

| ID   | Question | Why it matters | Evidence found | Options | Ryan decision |
| ---- | -------- | -------------- | -------------- | ------- | ------------- |
| Q001 | Should reactions become a first-class DSL construct (e.g., `reaction` keyword in .manifest)? | Current middleware-registry.ts is 1,377 lines of hand-maintained TypeScript. A DSL keyword would make reactions authorable alongside commands. | Reactions are TypeScript middleware files, not .manifest source. 67 reaction files exist. | A: Add DSL reaction keyword; B: Keep TypeScript middleware; C: Auto-generate registry from code | NEEDS-RYAN |

---

## 11. Decision History

| Date       | Decision | Made by | Reason |
| ---------- | -------- | ------- | ------ |
| 2026-06-26 | Initial evidence gathered | agent | Canonical unit created with real repo evidence |
