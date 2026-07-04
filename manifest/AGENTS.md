AGENTS.md

AI agents developing or coding in the Capsule-pro app must read this and use the planning with files skill and its accompanying files in this directory before proceeding with any Manifest or Capsule-pro work.

---

## ⚠️ RECONCILIATION 2026-07-04 — Manifest 3.1.3 native surfaces (PR #78)

`@angriff36/manifest` is now at **3.1.3** (branch `feat/manifest-3.0-native`, PR #78 open). The native
package now ships first-class: GenericPrismaStore (`stores/prisma-generic`), companion modules
(`projections/shared/companions.js` emits `createManifestRuntime` + `manifest-response` + database +
auth/tenant helpers), native Next.js dispatcher (incl. `externalExecutor` mode), and full `RuntimeOptions`
(middleware, storeProvider, idempotencyStore, auditSink, outboxStore, approvalStore, eventBus,
customBuiltins, requireTenantContext, encryptionProvider, threaded transaction handle).

**Capsule currently runs all of these as hand-rolled code** — `manifest.config.yaml` has
`emitCompanions:false`, `dispatcher.enabled:false`, `concreteCommandRoutes.enabled:false`. The deletion
directive (2026-07-04): flip those on, then delete every local file that exists only because the native
generated files used to be missing. Deletion targets: `manifest-runtime-factory.ts` (2,050 LOC),
`apps/api/lib/manifest-runtime.ts`, `apps/api/lib/manifest/execute-command.ts`,
`apps/api/lib/manifest-response.ts`, the bespoke `prisma-stores/*`, and middleware that only mirrors
native reactions/fan-out/schedules/webhooks/outbox/eventBus. What remains: a thin Capsule options/binding
module. **Decision is Ryan's** — tracked at `canonical/manifest/runtime-native-ownership/`. Until then,
the "Final directory shape" below showing Capsule owning `runtime-engine.ts`/`prisma-store.ts`/etc. is the
*current* state, NOT the target state.

---

## ⛔ STOP — READ THE OFFICIAL DOCS. THIS IS THE #1 REPEATED FAILURE.

Agents in this repo have, OVER AND OVER, given confident answers about Manifest based on
codebase greps + context7 (the GitHub repo mirror) WITHOUT reading the actual official docs the
user links or that govern the feature. This wastes the user's time and produces WRONG answers.
It has happened across multiple sessions. Do not be the next one.

**The official Manifest docs are at: https://manifest-b1e8623f.mintlify.app/**
Key pages: `/cli/configuration`, `/integration/prisma`, `/integration/nextjs`,
`/language/*`, `/adapters/*`, `/cli/overview`.

HARD RULES (non-negotiable):
1. Before answering ANY question about how Manifest works (config, projections, CLI, store
   wiring, create/command semantics, tenancy), or before editing Manifest-related code, you MUST
   `WebFetch` the relevant mintlify doc page(s). Codebase greps and context7 are SUPPLEMENTARY, not
   a substitute. If the user links a specific doc URL, FETCH THAT EXACT URL before responding.
2. Do NOT assert "Manifest can't do X" or "Manifest doesn't do Y" until you have read the doc page
   for X/Y. The default assumption is that the OFFICIAL METHOD EXISTS and we should be using it —
   if the repo isn't, find out WHY from the planning files, don't invent a justification.
3. If you catch yourself reasoning from `node_modules/@angriff36/manifest/dist/*.js` alone, STOP and
   fetch the doc — the dist code tells you WHAT it does, the docs tell you the INTENDED usage.
4. When the repo diverges from the official method (e.g. a hand-rolled wrapper, hand-authored
   schema instead of the Prisma projection), treat that divergence as SUSPECT/legacy until the
   planning files prove it's required. The bias is toward the official generate path.

Lessons logged (do not repeat): (a) answered config/projection questions 3x from greps before
reading the linked `/cli/configuration` + `/integration/prisma` pages — was wrong about the
dispatcher (it IS config-native) and under-credited the Prisma projection. (b) The Prisma schema
projection IS the official Prisma method; the repo not using it is a STALLED MIGRATION (IR
incompleteness — see notes.md §14), not a deliberate rejection. Know the difference before you speak.

---

# Route Strategy

Capsule-Pro should prefer one generic Manifest command route:

```http
POST /api/manifest/[entity]/commands/[command]
```

In Next.js App Router terms, this belongs under an app route handler file such as:

```txt
apps/api/app/api/manifest/[entity]/commands/[command]/route.ts
```

Next route handlers are file-based handlers that export HTTP methods from `route.ts` / `route.js`, so this single command door fits the framework without generating hundreds of bespoke route files.

Generated feature routes are allowed only as thin adapters. They must call the Manifest runtime command executor. They must not contain independent business logic, independent permission logic, or guessed Prisma accessors.

Bad:

```ts
apps/api/app/api/events/staff/assign/route.ts directly calls prisma.eventStaffAssignment.create(...)
```

Good:

```ts
apps/api/app/api/manifest/EventStaff/commands/assign/route.ts calls executeManifestCommand("EventStaff", "assign", input)
```

Acceptable compatibility shim:

```ts
apps/api/app/api/events/staff/assign/route.ts forwards to executeManifestCommand("EventStaff", "assign", input)
```

Fully wired up, Capsule-Pro has one command doorway and Manifest decides what the command actually means.

## The route is generic

The route is not “the event route” or “the staff route.” It is just a generic command router:

```txt
apps/api/app/api/manifest/[entity]/commands/[command]/route.ts
```

Next.js supports this because App Router route handlers live as `route.ts` files inside the app directory and export HTTP methods like `POST`, `GET`, `PATCH`, etc.

So this URL:

```http
POST /api/manifest/Event/commands/create
```

does not mean there is a custom handwritten file for `Event.create`.

It means the one generic route receives:

```txt
entity = Event
command = create
body = event details
```

Then it asks Manifest runtime:

> Does the IR say `Event.create` exists? What fields does it need? What permission does it require? What store/projection should it use? What events should it emit afterward?

Same route, different command:

```http
POST /api/manifest/StaffMember/commands/create
POST /api/manifest/Event/commands/publish
POST /api/manifest/Event/commands/assignStaff
```

The file does not multiply. The behavior comes from Manifest.

For the current problem, this matters because the pasted agent output says Capsule-Pro currently has route generation calling direct Prisma accessors like `database.eventStaff`, while the store layer already has separate mapping knowledge.

That means routes, stores, and schema are still deciding names independently, which is the drift source.

## Generic command route shape

A fully wired generic route would look conceptually like this:

```ts
// apps/api/app/api/manifest/[entity]/commands/[command]/route.ts

export async function POST(request, context) {
  const entity = context.params.entity;
  const command = context.params.command;
  const input = await request.json();

  const actor = await requireCurrentUser(request);
  const tenant = await requireTenant(actor);

  return executeManifestCommand({
    entity,
    command,
    input,
    actor,
    tenant,
    source: "api",
  });
}
```

The important part is what is not in that file.

It does not say:

```ts
prisma.eventStaffAssignment.create(...)
```

It does not say:

```ts
if (user.role !== "admin") throw error
```

It does not say:

```ts
after event create, also create kitchen prep, calendar entry, forecast row, invoice draft...
```

All of that belongs behind Manifest runtime, IR, policy, projection, and event propagation.

## Example surface 1: Events

The Manifest source defines the entity and commands:

```manifest
entity Event durable {
  property id string required
  property title string required
  property clientId string required
  property venueId string
  property startsAt datetime required
  property endsAt datetime
  property guestCount int
  property status string required

  command create
  command updateDetails
  command assignStaff
  command publish
  command cancel

  event EventCreated
  event EventDetailsUpdated
  event EventStaffAssigned
  event EventPublished
  event EventCancelled
}
```

The user fills out an event form in the UI. The frontend posts this:

```http
POST /api/manifest/Event/commands/create
```

Body:

```json
{
  "title": "Smith Wedding",
  "clientId": "client_123",
  "venueId": "venue_456",
  "startsAt": "2026-06-20T18:00:00.000Z",
  "guestCount": 145
}
```

The generic route sends that to Manifest runtime.

Manifest runtime then does the work in a standard order:

1. Validate `Event` exists in IR.
2. Validate `create` is a real command for `Event`.
3. Validate required fields.
4. Check the user can create event drafts.
5. Write the `Event` record through the generated/projected persistence layer.
6. Emit `EventCreated`.
7. Write one audit entry.
8. Trigger propagation rules.

The audit log should say something human-useful like:

> Ryan created event draft “Smith Wedding” for 145 guests.

Not:

```txt
field title set
field guestCount set
field status set
row inserted
tenantId set
createdAt set
```

Then propagation happens from the domain event, not from the route.

`EventCreated` can tell other systems:

- Calendar: reserve the event date.
- CRM: attach event to the client profile.
- Proposal: create proposal draft shell.
- Kitchen: create empty production plan.
- Inventory: create demand placeholder.
- Staffing: estimate staffing needs.
- Forecasting: update future revenue/demand.
- Tasks: create missing-info tasks.

That is the interconnected product value. The user creates the event once, and the rest of the app becomes aware of it.

## Example surface 2: Staff

Manifest source defines staff as its own surface:

```manifest
entity StaffMember durable {
  property id string required
  property displayName string required
  property email string
  property phone string
  property role string
  property status string required

  command create
  command updateProfile
  command setAvailability
  command deactivate

  event StaffMemberCreated
  event StaffAvailabilityUpdated
  event StaffMemberDeactivated
}
```

The UI creates a staff member through the same generic command door:

```http
POST /api/manifest/StaffMember/commands/create
```

Body:

```json
{
  "displayName": "Alex Rivera",
  "email": "alex@example.com",
  "role": "Server",
  "status": "active"
}
```

Same route file. Different entity and command.

The runtime checks `StaffMember.create`, validates the fields, checks permission, writes the staff record, emits `StaffMemberCreated`, and writes a clean audit entry:

> Ryan added staff member Alex Rivera as Server.

## Connecting Events and Staff

You probably need a join/assignment entity. The domain name should be Manifest-owned, for example:

```manifest
entity EventStaff durable {
  property id string required
  property eventId string required
  property staffMemberId string required
  property role string required
  property status string required

  command assign
  command updateRole
  command remove

  event EventStaffAssigned
  event EventStaffRoleUpdated
  event EventStaffRemoved
}
```

The physical database table can still be old or ugly, like `event_staff_assignments`, but Prisma should hide that through `@@map`.

Prisma explicitly supports mapping model names and field names to different database names through `@@map` and `@map`.

So generated Prisma should be conceptually:

```prisma
model EventStaff {
  id            String @id
  eventId       String
  staffMemberId String
  role          String
  status        String

  @@map("event_staff_assignments")
}
```

Now the UI assigns staff to an event:

```http
POST /api/manifest/EventStaff/commands/assign
```

Body:

```json
{
  "eventId": "event_123",
  "staffMemberId": "staff_456",
  "role": "Lead Server"
}
```

Runtime result:

1. It validates `EventStaff.assign`.
2. It checks whether the user can assign staff.
3. It checks the event exists.
4. It checks the staff member exists and is active.
5. It creates the assignment.
6. It emits `EventStaffAssigned`.
7. It writes one useful audit entry.
8. It notifies related modules.

Audit entry:

> Ryan assigned Alex Rivera as Lead Server for Smith Wedding.

Propagation:

- Event timeline now shows staff assignment.
- Staff profile now shows upcoming event.
- Calendar can add staff call time.
- Payroll/labor estimate updates.
- Notifications may send Alex the assignment.
- Forecasting updates labor coverage.
- Prep/event sheet includes assigned staff.

The product effect is that the user does not have to go to five places and manually sync the same fact.

## The route layer stays boring

```http
/api/manifest/Event/commands/create
/api/manifest/StaffMember/commands/create
/api/manifest/EventStaff/commands/assign
```

One route implementation handles all of them. Manifest decides which commands exist and what they do.

Feature-specific routes can still exist for nice URLs or old UI compatibility, but they should be wrappers only.

Example compatibility route:

```txt
apps/api/app/api/events/[eventId]/staff/assign/route.ts
```

It should only translate the nicer URL into the Manifest command:

```ts
export async function POST(request, context) {
  const input = await request.json();

  return executeManifestCommand({
    entity: "EventStaff",
    command: "assign",
    input: {
      eventId: context.params.eventId,
      staffMemberId: input.staffMemberId,
      role: input.role,
    },
    source: "api.compat.events.staff.assign",
  });
}
```

That wrapper is acceptable because it does not own business logic. It is just an adapter for a nice URL.

## Fully wired rule

Manifest owns the meaning.

Generic route owns HTTP entry.

Runtime owns validation, permission, audit, transaction, and command execution.

Projection owns Prisma model names and database mapping.

Domain events own propagation.

UI owns presentation only.

What breaks today is when the route owns too much. If a generated route directly calls `prisma.eventStaffAssignment`, the route has now become a second source of truth. If the store says one thing, Prisma says another, and Manifest says another, TypeScript catches the mismatch only after the architecture has already drifted.

What improves with the generic command route is that adding a new command does not require inventing a new route file, Prisma accessor, permission check, audit shape, and propagation hook.

The agent writes the Manifest command, the build validates/projects it, and the same runtime path handles it.

## One shared backend command route

Capsule-Pro should have one shared backend command route for all Manifest entities.

Event, StaffMember, and EventStaff should not each get their own backend route folder unless it is just a compatibility wrapper.

Next.js supports this because one `route.ts` file can receive dynamic path params like `[entity]` and `[command]`. Official docs show route handlers using dynamic route segments and exporting HTTP methods from `route.ts`.

## Final directory shape

```txt
C:\Projects\capsule-pro
├─ manifest
│  ├─ source
│  │  ├─ event.manifest
│  │  ├─ staff-member.manifest
│  │  └─ event-staff.manifest
│  │
│  ├─ ir
│  │  ├─ capsule.ir.json
│  │  ├─ command-registry.generated.json
│  │  ├─ route-contracts.generated.json
│  │  ├─ prisma-projection.generated.prisma
│  │  ├─ audit-policy.generated.json
│  │  └─ propagation-graph.generated.json
│  │
│  ├─ runtime
│  │  ├─ src
│  │  │  ├─ manifest-runtime-factory.ts
│  │  │  ├─ runtime-engine.ts
│  │  │  ├─ prisma-store.ts
│  │  │  ├─ permission-guard.ts
│  │  │  ├─ audit-log-writer.ts
│  │  │  └─ propagation-dispatcher.ts
│  │  │
│  │  └─ dist
│  │     └─ compiled build output only
│  │
│  └─ governance
│     └─ audit and drift reports only
│
├─ packages
│  └─ database
│     └─ prisma
│        └─ schema.prisma
│
└─ apps
   └─ api
      ├─ app
      │  └─ api
      │     └─ manifest
      │        └─ [entity]
      │           ├─ route.ts
      │           ├─ [id]
      │           │  └─ route.ts
      │           └─ commands
      │              └─ [command]
      │                 └─ route.ts
      │
      └─ lib
         └─ manifest
            ├─ execute-command.ts
            ├─ read-entity.ts
            ├─ manifest-context.ts
            └─ manifest-response.ts
```

The key part is this directory:

```txt
C:\Projects\capsule-pro\apps\api\app\api\manifest\[entity]\commands\[command]\route.ts
```

That is one real backend file. It handles all of these:

```http
POST /api/manifest/Event/commands/create
POST /api/manifest/Event/commands/updateDetails
POST /api/manifest/Event/commands/publish
POST /api/manifest/StaffMember/commands/create
POST /api/manifest/StaffMember/commands/setAvailability
POST /api/manifest/EventStaff/commands/assign
POST /api/manifest/EventStaff/commands/remove
```

So no, the final backend should not need this:

```txt
C:\Projects\capsule-pro\apps\api\app\api\events\route.ts
C:\Projects\capsule-pro\apps\api\app\api\events\[id]\route.ts
C:\Projects\capsule-pro\apps\api\app\api\events\staff\assign\route.ts
C:\Projects\capsule-pro\apps\api\app\api\staff\route.ts
C:\Projects\capsule-pro\apps\api\app\api\staff\[id]\route.ts
```

Those can exist only as old compatibility wrappers, not as the real architecture.

## Full Event surface

```txt
C:\Projects\capsule-pro\manifest\source\event.manifest
```

This is the only authored business definition for Event. It defines fields like title, client, venue, start time, guest count, status, commands, emitted events, audit labels, and propagation rules.

Generated IR output:

```txt
C:\Projects\capsule-pro\manifest\ir\capsule.ir.json
```

Inside that generated IR, Event exists as an entity record:

```json
{
  "entities": {
    "Event": {
      "name": "Event",
      "storage": "durable",
      "commands": ["create", "updateDetails", "publish", "cancel"],
      "events": ["EventCreated", "EventDetailsUpdated", "EventPublished", "EventCancelled"]
    }
  }
}
```

Generated command registry:

```txt
C:\Projects\capsule-pro\manifest\ir\command-registry.generated.json
```

Example entries:

```json
{
  "Event.create": {
    "entity": "Event",
    "command": "create",
    "method": "POST",
    "route": "/api/manifest/Event/commands/create",
    "permission": "event.create",
    "auditLevel": "summary",
    "emits": ["EventCreated"]
  },
  "Event.publish": {
    "entity": "Event",
    "command": "publish",
    "method": "POST",
    "route": "/api/manifest/Event/commands/publish",
    "permission": "event.publish",
    "auditLevel": "important",
    "emits": ["EventPublished"]
  }
}
```

Generated Prisma projection:

```txt
C:\Projects\capsule-pro\manifest\ir\prisma-projection.generated.prisma
```

Then merged or written into:

```txt
C:\Projects\capsule-pro\packages\database\prisma\schema.prisma
```

The generated Prisma model should be named after the Manifest entity:

```prisma
model Event {
  id         String   @id
  tenantId   String
  title      String
  clientId   String
  venueId    String?
  startsAt   DateTime
  endsAt     DateTime?
  guestCount Int?
  status     String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@map("events")
}
```

Prisma supports `@@map`, so the Prisma/API model can stay clean as `Event` even if the physical table name is `events`.

Prisma’s docs specifically say `@map` and `@@map` decouple Prisma model/field names from database table/column names, and that Prisma Client then exposes the schema names rather than the mapped database names.

The generated Prisma Client accessor becomes:

```ts
prisma.event
```

But the generic route should not be hand-coding this:

```ts
prisma.event.create(...)
```

It should call the runtime:

```http
POST /api/manifest/Event/commands/create
```

That goes through:

```txt
C:\Projects\capsule-pro\apps\api\app\api\manifest\[entity]\commands\[command]\route.ts
→ C:\Projects\capsule-pro\apps\api\lib\manifest\execute-command.ts
→ C:\Projects\capsule-pro\manifest\runtime\src\runtime-engine.ts
→ C:\Projects\capsule-pro\manifest\runtime\src\prisma-store.ts
→ prisma.event
```

## Full Staff surface

```txt
C:\Projects\capsule-pro\manifest\source\staff-member.manifest
```

Generated IR:

```json
{
  "entities": {
    "StaffMember": {
      "name": "StaffMember",
      "storage": "durable",
      "commands": ["create", "updateProfile", "setAvailability", "deactivate"],
      "events": ["StaffMemberCreated", "StaffAvailabilityUpdated", "StaffMemberDeactivated"]
    }
  }
}
```

Generated command registry:

```json
{
  "StaffMember.create": {
    "entity": "StaffMember",
    "command": "create",
    "method": "POST",
    "route": "/api/manifest/StaffMember/commands/create",
    "permission": "staff.create",
    "auditLevel": "summary",
    "emits": ["StaffMemberCreated"]
  },
  "StaffMember.setAvailability": {
    "entity": "StaffMember",
    "command": "setAvailability",
    "method": "POST",
    "route": "/api/manifest/StaffMember/commands/setAvailability",
    "permission": "staff.availability.update",
    "auditLevel": "summary",
    "emits": ["StaffAvailabilityUpdated"]
  }
}
```

Generated Prisma model:

```prisma
model StaffMember {
  id          String   @id
  tenantId    String
  displayName String
  email       String?
  phone       String?
  role        String?
  status      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("staff_members")
}
```

Generated Prisma Client accessor:

```ts
prisma.staffMember
```

The API URL is not `/api/staff/create`. It is:

```http
POST /api/manifest/StaffMember/commands/create
POST /api/manifest/StaffMember/commands/updateProfile
POST /api/manifest/StaffMember/commands/setAvailability
POST /api/manifest/StaffMember/commands/deactivate
```

## EventStaff relationship surface

The connection between Events and Staff needs a third Manifest entity:

```txt
C:\Projects\capsule-pro\manifest\source\event-staff.manifest
```

This is not extra bullshit. It is the actual relationship between the two surfaces.

It means:

> This staff member is assigned to this event.

Generated Prisma model:

```prisma
model EventStaff {
  id            String   @id
  tenantId      String
  eventId       String
  staffMemberId String
  role          String
  status        String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  event       Event       @relation(fields: [eventId], references: [id])
  staffMember StaffMember @relation(fields: [staffMemberId], references: [id])

  @@map("event_staff_assignments")
}
```

This is the exact fix for the `EventStaff` / `EventStaffAssignment` confusion.

The Manifest/Prisma/API name is `EventStaff`.

The old physical table name can remain `event_staff_assignments` behind `@@map`.

Prisma Client is generated from the Prisma schema models, so the generated client API follows `EventStaff`, not the mapped table name.

Generated Prisma Client accessor:

```ts
prisma.eventStaff
```

The command URL:

```http
POST /api/manifest/EventStaff/commands/assign
```

Body:

```json
{
  "eventId": "event_123",
  "staffMemberId": "staff_456",
  "role": "Lead Server"
}
```

That request still hits the same one file:

```txt
C:\Projects\capsule-pro\apps\api\app\api\manifest\[entity]\commands\[command]\route.ts
```

The route receives:

```json
{
  "entity": "EventStaff",
  "command": "assign"
}
```

Then the runtime looks up:

```json
{
  "EventStaff.assign": {
    "entity": "EventStaff",
    "command": "assign",
    "permission": "event.staff.assign",
    "auditLevel": "important",
    "emits": ["EventStaffAssigned"]
  }
}
```

The route does not know or care whether the database table is called `event_staff_assignments`.

That is projection/runtime/store knowledge.

## Generic read routes

For reads, use generic routes too, but separate from commands:

```txt
C:\Projects\capsule-pro\apps\api\app\api\manifest\[entity]\route.ts
C:\Projects\capsule-pro\apps\api\app\api\manifest\[entity]\[id]\route.ts
```

Those handle:

```http
GET /api/manifest/Event
GET /api/manifest/Event/event_123
GET /api/manifest/StaffMember
GET /api/manifest/StaffMember/staff_456
GET /api/manifest/EventStaff?eventId=event_123
```

So the final backend route count for Event + Staff + EventStaff is still basically three shared backend route files total, not three route files per entity.

Command route:

```txt
C:\Projects\capsule-pro\apps\api\app\api\manifest\[entity]\commands\[command]\route.ts
```

Collection read route:

```txt
C:\Projects\capsule-pro\apps\api\app\api\manifest\[entity]\route.ts
```

Item read route:

```txt
C:\Projects\capsule-pro\apps\api\app\api\manifest\[entity]\[id]\route.ts
```

That is the clean version: three shared backend route files total, not three route files per entity.

## UI pages are different

The frontend can still have real product-specific pages because users need normal screens:

```txt
C:\Projects\capsule-pro\apps\app\app\events\page.tsx
C:\Projects\capsule-pro\apps\app\app\events\[eventId]\page.tsx
C:\Projects\capsule-pro\apps\app\app\events\new\page.tsx

C:\Projects\capsule-pro\apps\app\app\staff\page.tsx
C:\Projects\capsule-pro\apps\app\app\staff\[staffMemberId]\page.tsx
C:\Projects\capsule-pro\apps\app\app\staff\new\page.tsx
```

Those UI pages call the generic API:

```txt
events/new/page.tsx
→ POST /api/manifest/Event/commands/create

events/[eventId]/page.tsx assign staff button
→ POST /api/manifest/EventStaff/commands/assign

staff/new/page.tsx
→ POST /api/manifest/StaffMember/commands/create
```

So yes: frontend has separate Event and Staff pages. Backend command handling does not.

## Final create-event flow

```txt
C:\Projects\capsule-pro\apps\app\app\events\new\page.tsx
→ POST /api/manifest/Event/commands/create
→ C:\Projects\capsule-pro\apps\api\app\api\manifest\[entity]\commands\[command]\route.ts
→ C:\Projects\capsule-pro\apps\api\lib\manifest\execute-command.ts
→ C:\Projects\capsule-pro\manifest\runtime\src\runtime-engine.ts
→ generated registry says Event.create exists
→ generated projection says Prisma model is Event
→ prisma.event.create(...)
→ audit log writes "Ryan created event draft Smith Wedding"
→ EventCreated propagation runs
```

## Final assign-staff flow

```txt
C:\Projects\capsule-pro\apps\app\app\events\[eventId]\page.tsx
→ POST /api/manifest/EventStaff/commands/assign
→ C:\Projects\capsule-pro\apps\api\app\api\manifest\[entity]\commands\[command]\route.ts
→ C:\Projects\capsule-pro\apps\api\lib\manifest\execute-command.ts
→ C:\Projects\capsule-pro\manifest\runtime\src\runtime-engine.ts
→ generated registry says EventStaff.assign exists
→ generated projection says Prisma model is EventStaff
→ prisma.eventStaff.create(...)
→ database writes to physical table event_staff_assignments through @@map
→ audit log writes "Ryan assigned Alex Rivera to Smith Wedding as Lead Server"
→ EventStaffAssigned propagation updates Event, Staff, Calendar, Payroll/Labor, and Notifications
```

## Current issue

The current pasted agent output says Capsule-Pro has the bad version right now:

- Handwritten Prisma stores.
- A big provider switch.
- Unused Prisma projection.
- Generated routes directly guessing `database.eventStaff`.

That is exactly why this should move to the shared route + generated registry/projection model.