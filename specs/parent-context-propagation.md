# Parent-Context Propagation

> **Status:** Active (introduced 2026-06-05)
> **Mechanism:** `manifest/runtime/src/parent-context-resolver.ts`
> **Wiring:** `manifest/runtime/src/run-manifest-command-core.ts` (before `runtime.runCommand`)
> **Governance:** `manifest/governance/parent-context-overrides.json`
> **Backpressure:** `manifest/scripts/audit-parent-context.mjs` (`pnpm manifest:audit-parent-context[:strict]`)
> **Tests:** `manifest/runtime/src/__tests__/parent-context-propagation.test.ts`,
> `manifest/runtime/src/__tests__/audit-parent-context.test.ts`,
> `apps/api/__tests__/events/battle-board-parent-context.test.ts`

---

## 1. The problem

A child entity created from a parent (a BattleBoard for an Event, a CateringOrder for an
Event, a PrepTask for a PrepList) needs the parent's context to be useful: the event date,
the client, the venue, the guest count. Three ways to get that context onto the child are all
wrong:

1. **Demand it as user input.** The UI re-collects the date/client/venue the Event already
   owns. Users re-type data the system knows, and any typo silently forks the child from the
   parent.
2. **Copy it on the client.** The frontend reads the Event and stuffs its fields into the
   create body. Now the propagation rule lives in the UI — a second source of truth that
   drifts the moment the Event shape changes, and a path that bypasses governed semantics
   (constitution §10: read models must not become hidden command paths).
3. **Hand-roll it per child.** Each child's create handler loads its parent and copies fields
   by hand. N children × M parents = NM bespoke copy blocks, each its own bug surface.

The consequence of all three is **drift**: every downstream surface (board, prep sheet,
forecast, invoice) ends up with a slightly different copy of the same Event facts, and no one
can say which is authoritative.

## 2. The invariant

> A child entity created from a parent must accept the parent id, load the parent
> server-side, and **inherit** the parent-owned fields it declares but does NOT expose as
> create-command parameters. The caller supplies only the parent FK plus child-specific
> overrides; parent values are *defaults*, so any value already present in the body wins.

This is enforced at one generic, IR-relationship-driven choke point — not per child.

## 3. Why "not a create parameter" is the inheritance gate

The mechanism inherits exactly the set of fields a child **declares but never accepts as a
create parameter**, intersected with the fields its `belongsTo` parent owns by the same name
and scalar type. That intersection is the precise definition of "parent-owned snapshot data":

- A field the child **exposes as a create parameter** is user-facing input (board name,
  notes, board type). It is the child's own, even if the parent happens to declare a property
  with the same name. So `BattleBoard.notes` is never overwritten by `Event.notes`.
- A field the child **declares but never accepts as input** can *only* be populated by
  inheritance — there is no other code path that sets it. That set is exactly the
  parent-owned snapshot.

Using "is it a create param?" as the gate also dodges the name-collision trap where parent and
child share a property name with different semantics or types — e.g. `Event.tags` (an
`array<string>`) versus `BattleBoard.tags` (a `string`). Because `tags` is a BattleBoard create
parameter, it is excluded from inheritance regardless of the type clash.

## 4. The rules (what gets inherited, what never does)

For each `belongsTo`/`ref` relationship on the child whose foreign key is present in the create
body, the resolver loads the parent and, for each child property, copies the parent's value
**only if every one of these holds**:

| Rule | Reason |
|---|---|
| The field is **not** in `ALWAYS_EXCLUDED` (`id`, `tenantId`, `status`, `createdAt`, `updatedAt`, `deletedAt`, `inheritedContext`). | Identity, tenant, lifecycle, and audit timestamps are owned by the child's own create, never the parent. |
| The field is **not** a create parameter of the child. | User-facing input — see §3. |
| The field is **not** one of the relationship's FK columns. | FK columns are linkage, not inherited content. |
| The **parent** declares a property of the same name. | The parent must actually own the field. |
| The parent property's scalar type **matches** the child's. | Type-compatible copy only — never coerce across types. List/array types are excluded entirely. |
| The child body does **not** already carry a meaningful value (`!= undefined/null/""`). | Child override wins — parent values are defaults. |
| The parent's value **is** meaningful (`!= undefined/null/""`). | Never copy empty parent values onto the child. |

`create` is the only command affected; every other verb is a no-op. When the FK is absent
(a standalone child with no parent), the resolver is a no-op — manual creation still works.

## 5. Where it runs, and why there

The resolver runs in `runManifestCommandCore`, **before** `runtime.runCommand`, because the
Manifest engine snapshots the create body (`prepareCreateData`) before any middleware fires.
Middleware therefore cannot influence what gets persisted, but the body passed into
`runCommand` can. Enriching the body at this point is the only place where inherited fields
actually reach storage.

Inference is **best-effort**: it is wrapped in a try/catch and never blocks a create. A parent
that can't be loaded, or any error in resolution, leaves the un-enriched body to proceed. A
create must never fail because inference failed.

## 6. Provenance: `inheritedContext`

When any field is inherited and the child declares an `inheritedContext` property, the resolver
writes a JSON snapshot into it:

```json
{ "source": "Event", "fk": "eventId", "parentId": "e1", "fields": ["clientId", "eventDate", "guestCount", "locationId", "venueAddress", "venueName"] }
```

This records *which* parent supplied *which* fields, so a later audit can tell inherited values
from authored ones, and so a regression that stops copying a field is visible in stored data.

## 7. Governance: documented exceptions

The audit (`audit-parent-context.mjs`) flags any child whose `create` **requires**, as user
input, a field that name+type-matches a `belongsTo` parent property — because such a field
*should* be inherited, not demanded. Genuine exceptions live in
`manifest/governance/parent-context-overrides.json` in two categories:

- **`FALSE_POSITIVE`** — a coincidental name match where the child value is semantically
  independent of the parent's. Example: `ClientContact.email` is the contact person's own
  email, distinct from the `Client` (company) record's `email`. These will never be inherited.
- **`BASELINE`** — a genuine propagation candidate that predates this mechanism (2026-06-05).
  These are real opportunities to inherit parent context, tracked in `IMPLEMENTATION_PLAN.md`
  for follow-up migration. Examples: `Proposal` (client/date/type/venue from Event),
  `CateringOrder` (venue from Event), `PrepTask` (eventId from PrepList).

Every new, undocumented case must be fixed (inherit server-side) or added to the overrides file
with an owner and reason. `pnpm manifest:audit-parent-context:strict` exits non-zero on any
unallowlisted violation and is the CI backpressure for this invariant.

## 8. First adopter: BattleBoard

`BattleBoard` is the reference implementation. Its source
(`manifest/source/battle-board-rules.manifest`) declares the parent-context snapshot fields
(`eventDate`, `clientId`, `guestCount`, `venueName`, `venueAddress`, `locationId`,
`inheritedContext`) as properties that are **not** create parameters, plus
`relationship belongsTo event: Event`. Creating a board with only `{ boardName, boardType,
eventId }` inherits the full Event snapshot server-side. The matching Prisma columns on
`battle_boards` are plain text (no `@db.Uuid`) so denormalized values never fail uuid coercion.

### 8a. Second adopter: Proposal

`Proposal` (`manifest/source/proposal-rules.manifest`) inherits `clientId`, `eventDate`,
`eventType`, `venueName`, `venueAddress` from its linked `Event` — `Proposal.create` accepts only
proposal-specific input + the `eventId` link. It illustrates two patterns beyond the BattleBoard
case: (1) a child with **two** `belongsTo` relationships (`client` via `clientId`, `event` via
`eventId`) — because `fkSet` is built per-relationship, `clientId` is still inherited while
iterating the `event` relationship, correctly linking the proposal to the event's client; and
(2) a **DB-free migration** — the `proposals` snapshot columns already existed (nullable), so no
schema change was needed. `guestCount` is deliberately kept as a create param (a quote may target
a different headcount than the event estimate).

## 9. Why the tests matter

The tests pin the **contract**, not the implementation, so a future change that quietly breaks
inheritance fails loudly:

- `parent-context-propagation.test.ts` asserts the §4 rules individually: fills snapshot fields
  from only the FK; never inherits create-param fields (`notes`/`tags`); child override wins;
  empty parent values are skipped; no-op for non-create and for absent-FK; and the end-to-end
  `runManifestCommandCore` create persists the inherited fields. If someone stops copying a
  field, or starts demanding it as input, a named test breaks.
- `audit-parent-context.test.ts` pins the backpressure: the audit detects undocumented
  violations and honors the overrides allowlist.
- `battle-board-parent-context.test.ts` proves the wired path end-to-end for the first adopter.

## 10. Adding a new adopter

1. In the child's `.manifest` source, declare the parent-owned fields as **properties that are
   not create parameters**, and add `relationship belongsTo <parent>: <Parent> fields [...]
   references [...]`.
2. Add matching Prisma columns (plain text for denormalized ids — no `@db.Uuid`); migrate via
   `pnpm db:dev --create-only`.
3. Recompile the IR (`pnpm manifest:compile`) so the runtime sees the new relationship and
   properties.
4. Run `pnpm manifest:audit-parent-context` — the child should drop off the violations list (or
   move to a documented `BASELINE`/`FALSE_POSITIVE` entry if a field genuinely should not be
   inherited).
5. No runtime code changes are needed — the resolver is generic and IR-driven.
