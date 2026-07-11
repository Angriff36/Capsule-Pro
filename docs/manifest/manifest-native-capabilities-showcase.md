# From Domain Model to Executable System

## Native Manifest capabilities demonstrated by the Event example

The corrected Event example demonstrates something much larger than schema generation. It uses one Manifest source file to describe the domain's data, authority, lifecycle, automation, integration boundaries, and persistence intent. The compiler turns that source into a canonical intermediate representation (IR), and Studio and the projection system consume that same IR for different purposes.

The result is one reviewable contract that can answer all of these questions:

- What data exists, and which values are sensitive?
- Who may perform an operation?
- From which states is that operation legal?
- What changes when it succeeds?
- What fact does it publish afterward?
- What downstream work should that fact trigger?
- How does a multi-step workflow compensate when a later step fails?
- What database, API, documentation, analytics, or agent-facing artifacts can be derived from the same model?

That is why this example is more useful than a long list of rules such as “amount must be positive.” Field validation is present, but it is only the lowest layer. The real value is that behavior and authority become explicit domain data instead of being scattered across pages, route handlers, background workers, database hooks, and tribal knowledge.

## The architecture being showcased

```text
Event .manifest source
        |
        v
Compiler diagnostics + canonical IR
        |
        +--> Studio Model / Graph / Flow / Checks / Metrics / Symbols
        +--> Runtime command, policy, transition, reaction, and saga behavior
        +--> Prisma and other code/schema projections
        +--> OpenAPI, GraphQL, JSON Schema, Mermaid, analytics, and more
        +--> LLM context and generated domain documentation
```

The IR is the important seam. Studio is not separately interpreting the source to draw a graph while each generator invents its own understanding. The source compiles once into a normalized contract, and consumers operate on that contract. The IR shown in Studio also carries provenance such as the compiler version, schema version, compilation time, and content hashes. Generated artifacts can therefore be traced back to the exact compiled model.

For this example, the generated LLM context reports:

| Measure | Count |
| --- | ---: |
| Entities | 7 |
| Commands | 25 |
| Policies | 7 |
| Constraints | 8 |
| Enums | 8 |
| Events | 34 |
| Multi-tenant | Yes |

The three external entities are included in those seven entities because they are part of the domain contract even though they are not owned persistence models.

## Capability map

| Concern | What the Event source declares | What becomes inspectable or enforceable |
| --- | --- | --- |
| Domain ownership | `Event` plus reservation, financial authorization, and reminder-batch entities | A deliberately bounded Event domain instead of every Event-adjacent table |
| External references | External `Client`, `Venue`, and `UserAccount` entities | Cross-domain references remain typed without pretending this module owns their tables |
| Tenant isolation | Tenant context and tenant-scoped behavior | Tenant identity is carried into the IR and can be consumed by runtime and projections |
| Roles and capabilities | Inherited Event roles and `allow` capabilities | Commands check capabilities rather than repeating fragile role-name lists |
| Typed states | Eight enums, including `EventStatus` | Workflow values become closed sets rather than arbitrary strings |
| Value objects | `EventAddress` | A reusable structured value has domain meaning separate from primitive strings |
| Data protection | `encrypted`, `masked(email)`, `masked(phone)`, `private` | Security intent travels with the property into runtime/projection metadata |
| Derived facts | Six cached computed properties | Readiness, balance, duration, scheduling, approval, and display facts are defined once |
| Invariants | Eight entity constraints plus command guards | Always-true rules are separated from operation-specific preconditions |
| Authorization | Default execute policy plus read, write, and override policies | Authority is visible beside the domain behavior it protects |
| State machines | Explicit `transition` rules for every Event state | Legal state movement can be validated independently of UI navigation |
| Commands | Parameters, guards, computations, mutations, and emitted events | Each operation has a complete causal contract |
| Approval | Manager stage plus conditional director stage | Large-event escalation and timeout behavior are declared, not hidden in controller logic |
| Async reliability | Async command, retry policy, and tenant rate limit | Background execution intent and failure policy are part of the model |
| Reactions | Event-to-command routing and fan-out | Downstream actions are causally wired to emitted facts |
| Sagas | Four confirmation steps with compensating commands | Multi-entity workflow rollback is explicit and ordered |
| Scheduling | Fifteen-minute reminder sweep | Timer intent points to a normal domain command |
| Webhooks | Route, method, idempotency, HMAC signature, and transform | External input is normalized into a typed command boundary |
| Persistence | Four PostgreSQL stores and requested table names | Owned durable entities can be selected for projection without emitting external models; target-specific naming still needs verification |
| Concurrency and timestamps | Version properties and automatic timestamps | Conflict detection and audit metadata are modeled consistently |
| Realtime | `realtime` hint | Projections can recognize live-update intent; the flag itself has no runtime enforcement semantics |

## What the example says that a Prisma schema cannot

A Prisma schema describes persistence structure. It does not explain the complete meaning of an operation. For example, the Manifest `confirm` behavior includes all of the following concepts:

1. The caller must have the `event_confirm` capability.
2. The Event must currently be `pendingApproval`.
3. Confirmation participates in an approval workflow.
4. Every confirmation needs a manager approval.
5. A large-budget or high-guest-count Event also needs a director approval.
6. Approval times out after 72 hours and cancels on timeout.
7. A successful command changes status, records a timestamp, and emits `EventConfirmed`.
8. Confirmation is also one step of a larger saga and has a compensation command.

Database columns can store `status` and `confirmedAt`; they cannot express that causal and authorization model by themselves. Manifest retains the persistence shape and adds the behavioral contract that explains why and how those columns may change.

## Deep dive: authority without role-name sprawl

The example builds a capability hierarchy:

```text
EventViewer
    └── EventCoordinator
            └── EventManager
                    └── EventDirector

EventAutomation is a separate capability set for scheduled and webhook work.
```

Commands ask for precise capabilities such as `event_schedule`, `event_confirm`, or `event_finance`. They do not hardcode arrays of roles in every operation. Adding a new role can therefore be a role-definition change rather than a search-and-edit exercise across many endpoints.

Policies and guards have different jobs:

- The default execute policy is the common gate for every Event command.
- Read and write policies describe broad data access.
- The override policy describes exceptional authority, such as bypassing venue capacity.
- Command guards add the exact permission and current-state rules for one operation.

Studio's Flow view makes these layers visible next to the command, mutations, and emitted event. That is much easier to audit than following middleware, service methods, and database writes across unrelated files.

## Deep dive: lifecycle as a state machine

`EventStatus` is a closed enum, and the source declares the allowed transitions from every state:

```text
inquiry -> tentative | cancelled
tentative -> pendingApproval | cancelled
pendingApproval -> confirmed | tentative | cancelled
confirmed -> pendingApproval | onHold | inProgress | cancelled
onHold -> pendingApproval | confirmed | cancelled
inProgress -> completed
completed -> archived
cancelled -> archived
archived -> terminal
```

The commands add more specific context. `start`, for example, requires a confirmed Event and a non-null start time. `archive` requires a completed or cancelled Event. The transition graph answers “is this state movement structurally legal?” while the command answers “is this user allowed to cause it now, with this input?”

This separation prevents a common failure mode: a UI hides a button, but another route or worker updates the status directly without applying the same rules.

## Deep dive: declarative orchestration

### Reactions

Reactions route emitted facts into subsequent commands. In the example:

- Important Event changes trigger `Event.recalculateReadiness`.
- An authenticated external-calendar event routes to `Event.applyExternalCalendarUpdate` with mapped parameters.
- Cancellation fans out to venue reservations, financial authorizations, and reminder batches.

The source therefore records causality: not merely that these commands exist, but which fact causes each command to run and how the target instance is resolved.

### Saga compensation

The confirmation workflow coordinates four independently identified entities:

| Step | Forward command | Compensation |
| --- | --- | --- |
| Reserve venue | `EventVenueReservation.reserve` | `EventVenueReservation.release` |
| Authorize financials | `EventFinancialAuthorization.authorize` | `EventFinancialAuthorization.revoke` |
| Confirm Event | `Event.confirm` | `Event.revertConfirmation` |
| Activate reminders | `EventReminderBatch.activate` | `EventReminderBatch.cancel` |

If a later step fails, completed steps compensate in reverse. The saga also declares lifecycle events for started, step-completed, completed, compensated, and failed outcomes. This is substantially different from a transaction over one table: it describes recovery across multiple domain lifecycles and potentially external work.

### Async work, retries, and limits

`recalculateReadiness` demonstrates an async command with exponential retry, jitter, and tenant-scoped rate limiting. Its score is computed from scheduling, location, contact, deposit, and status facts before mutation and event emission.

The key design benefit is not the particular score. It is that the operational contract—validation now, queued execution, retry shape, rate-limit scope, mutation, and published result—is reviewable as one unit.

### Schedules and webhooks

The schedule runs a normal command every 15 minutes. That command emits a canonical reminder-sweep event, allowing workers or projections to process due reminders without embedding domain decisions in the scheduler.

The calendar webhook declares:

- `POST /webhooks/events/calendar`
- an idempotency header;
- an HMAC-SHA256 signature contract;
- the context-provided secret reference;
- transformation from provider payload shape to the canonical command parameters.

The external provider's JSON shape stops at the boundary. The domain receives a typed command contract and emits its own canonical event.

## Deep dive: the generated Prisma schema

### Why it looks radically different from the live schema

The supplied live Prisma excerpt contains 16 Event-related models:

`Event`, `EventBudget`, `EventContract`, `EventDish`, `EventFollowup`, `EventGuest`, `EventImport`, `EventImportWorkflow`, `EventPlanningDraft`, `EventProfitability`, `EventReport`, `EventStaff`, `EventSummary`, `EventTimeline`, `EventTimelineItem`, and `EventWaitlistEntry`.

The Manifest example is not a reverse-engineered copy of that entire persistence boundary. It deliberately models a smaller governed capability slice and emits four owned models:

- `Event`
- `EventVenueReservation`
- `EventFinancialAuthorization`
- `EventReminderBatch`

It also emits eight native enums. The difference is therefore meaningful:

| Live schema | Native Event example |
| --- | --- |
| Broad collection of current Event-adjacent persistence concerns | Focused Event lifecycle and orchestration example |
| Many status-like fields are stored as strings | Workflow states project as enums |
| Relations reflect the current application's entire database | Only owned entities are emitted; external domain references stay external |
| Database structure is the primary artifact | Database structure is one projection of a richer behavioral contract |

This does **not** mean the generated four-model schema can replace the live 16-model schema without domain migration work. It means the example reveals a cleaner way to decide what the Event domain should own and what behavior should govern it.

### What the projection preserved

The generated Prisma artifact shows that the projection carried through:

- Event fields and defaults;
- exact decimal money shapes;
- enum types and defaults;
- owned workflow entities;
- automatic timestamps, tenant fields, composite primary keys, indexes, uniqueness, and full-text intent;
- comments for runtime security semantics such as encrypted properties;
- inverse relations among the emitted owned entities.

The comparison also exposes projection gaps that are **not** reported as the type/relationship diagnostics above. The supplied Prisma artifact does not contain the source's `version` or `versionAt` concurrency properties, and it does not apply the requested snake_case store table names through Prisma `@@map` declarations. Those source capabilities are present in IR, but this particular generated artifact does not preserve them. They should be treated as projection follow-up work before using the result as a replacement persistence schema.

### What the projection deliberately refused to guess

The diagnostics are useful design feedback:

1. **External entities were skipped.** `Client`, `Venue`, and `UserAccount` belong to another ownership boundary, so the projection did not emit fake local models.
2. **Dangling relationships were skipped.** Prisma relations cannot target models absent from the generated schema. The scalar IDs can remain the integration contract, while relation wiring requires an explicit composition decision.
3. **`EventAddress` needs a mapping decision.** A Manifest value object does not have one universally correct Prisma representation. It might become JSON, a composite type, flattened columns, or a separate model.
4. **Generic `number` is ambiguous.** Counts, floating measurements, exact decimals, and money have different database semantics. `guestCount` and `readinessScore` should use precise source types or projection overrides.

The generator is doing the right kind of refusal: it preserves known intent and reports places where silently guessing could create a bad database contract.

## What each Studio surface is showing

### Model

The Model view is the inspectable domain inventory. It shows entity properties, commands, defaults, and types without requiring a reader to scan the full source file.

Use it to answer: “What does this entity contain, and what can it do?”

### Graph

The Graph view is structural topology. In this example, `Event` is central, with ownership/reference relationships to `Client`, `Venue`, and `UserAccount`, plus owned workflow entities for reservations, financial authorization, and reminders.

Use it to answer: “What is connected to what, and where are the domain boundaries?”

For a very large application-wide Manifest, the graph becomes a planet because the selected scope is too broad. This focused example shows the intended scale: one coherent domain slice at a time.

### Flow

The Flow view is behavioral topology. For `EventFinancialAuthorization`, it shows policies, guards, `authorize` and `revoke`, the properties they mutate, and the events they emit.

Use it to answer: “What must be true, what operation runs, what changes, and what happens afterward?”

### Checks

Checks are advisory analysis separate from compiler diagnostics. The screenshot catches declared-but-unused events and naming inconsistencies. A model can compile while checks still identify incomplete causal wiring or conventions that will hurt maintainability.

Use it to answer: “What is valid but suspicious, incomplete, silent, or inconsistent?”

### Project

Project runs target-specific projections from the IR. The catalog shown in Studio includes database/schema, API, language model, infrastructure, analytics, diagram, and documentation targets. Examples visible in the selector include Prisma, Drizzle, Kysely, Convex, DynamoDB, Elasticsearch, GraphQL, OpenAPI, JSON Schema, Next.js, Express, Hono, Pydantic, Dart, analytics, Mermaid, materialized views, and LLM context.

Use it to answer: “What useful artifact can this same domain contract generate for a particular consumer?”

### LLM context and generated documentation

The LLM-context projection produced both structured JSON and readable domain documentation. The structured artifact includes compiler provenance, counts, tenant metadata, entities, commands, events, policies, and relationships. The documentation version lists command signatures, guards, emitted events, computed values, and constraints.

This gives an agent a bounded, compiler-derived description of the system instead of asking it to infer business behavior from thousands of implementation files. It is also diffable: when the domain contract changes, its agent context can be regenerated from the same source.

### IR

The IR view exposes the normalized contract every other consumer sees. It is the best debugging view when source syntax looks correct but a projection or runtime behavior is surprising.

Use it to answer: “What did the compiler actually understand?”

## Native semantics, projection output, and host responsibilities

These layers should not be conflated.

| Layer | Owns | Does not imply by itself |
| --- | --- | --- |
| Manifest source/compiler | Domain structure, policies, guards, transitions, events, reactions, schedules, webhooks, saga definitions, and normalized IR | A deployed worker, database, secret store, queue, or HTTP server |
| Runtime/adapters | Executing command semantics, resolving identity/context, persistence adapters, event dispatch, reaction/saga coordination, encryption providers, concurrency behavior | That every generated target is automatically deployed |
| Projection | Turning IR into a target artifact and reporting target-specific mapping gaps | That generated code has been integrated, migrated, configured, or deployed |
| Host application/infrastructure | Supplying adapters, secrets, queues, timer/webhook delivery, database migrations, external entity resolution, observability, and deployment | Permission to bypass the domain contract |

Concrete examples:

- A schedule in IR defines timer intent; the host must still run or connect a scheduler.
- A webhook definition describes the HTTP boundary; the host must expose the endpoint and supply its secret.
- `encrypted` records security semantics; real encryption requires a configured provider and key management.
- `masked` is a runtime read transform; consumers that query a store directly must not assume the runtime masking boundary was applied.
- A PostgreSQL store declares persistence intent; the application still needs credentials, migrations, and an adapter.
- A Prisma projection generates a schema; it does not safely migrate a live production database by itself.
- External entities preserve typed references; the host or composed schema must resolve those references.

## What this suggests for Capsule Pro

Do not feed the entire application into one visualization and judge Manifest by the resulting planet. Use the Event example as the pattern for incremental domain design:

1. Choose one bounded domain, such as Event lifecycle.
2. Identify the domain's owned entities versus external references.
3. Model closed states, invariants, capabilities, commands, and emitted facts.
4. Add reactions and sagas only where causality or compensation is real.
5. Compile and inspect the IR, Graph, Flow, and Checks before generating code.
6. Compare generated Prisma to the live schema and classify every difference:
   - intentionally owned here;
   - external/owned elsewhere;
   - missing from the model;
   - obsolete persistence;
   - projection mapping decision;
   - host-only concern.
7. Integrate one projection/runtime boundary at a time and verify behavior before expanding the scope.

The native Event example should be treated as a capability exemplar and migration design tool, not as a drop-in replacement schema. Its most valuable output is the explicit decision record it forces: what the domain owns, who has authority, how state moves, what facts are emitted, and which automated work follows.

## Bottom line

The exciting difference is not that Manifest can generate a shorter Prisma schema. It is that the Prisma schema becomes only one mechanically derived view of a much more useful source of truth.

The Event source captures structure, authority, lifecycle, reliability, orchestration, integration, and projection intent together. Studio then lets different people inspect the same contract as a model, graph, causal flow, advisory report, generated target, agent context, or raw IR. That is the ability this example is actually showcasing.

## Evidence used for this guide

- Corrected source: `C:\Manifest-Test\manifest-example-native-fixed.manifest`
- Supplied live Prisma schema excerpt
- Supplied generated Prisma artifact and projection diagnostics
- Supplied `llm-context` domain documentation generated by compiler 3.4.24
- Supplied Manifest DSL reference
- Studio screenshots of Graph, Flow, Checks, Project, LLM context, and IR
