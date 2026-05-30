AGENTS.md

AI agents developing or coding in the Capsule-pro app must read this and use the planning with files skill and its accompanying files in this directory before proceeding with any Manifest or Capsule-pro work.

Route strategy 
Capsule-Pro should prefer one generic Manifest command route: POST /api/manifest/[entity]/commands/[command] In Next.js App Router terms, this belongs under an app route handler file such as:
 apps/api/app/api/manifest/[entity]/commands/[command]/route.ts 
 
Next route handlers are file-based handlers that export HTTP methods from route.ts / route.js, so this single command door fits the framework without generating hundreds of bespoke route files. Generated feature routes are allowed only as thin adapters. They must call the Manifest runtime command executor. They must not contain independent business logic, independent permission logic, or guessed Prisma accessors. 

Bad: apps/api/app/api/events/staff/assign/route.ts directly calls prisma.eventStaffAssignment.create(...) 
Good: apps/api/app/api/manifest/EventStaff/commands/assign/route.ts calls executeManifestCommand("EventStaff", "assign", input) 

Acceptable compatibility shim: apps/api/app/api/events/staff/assign/route.ts forwards to executeManifestCommand("EventStaff", "assign", input)

Fully wired up, Capsule-Pro has one command doorway and Manifest decides what the command actually means.

The route is not “the event route” or “the staff route.” It is just a generic command router:

apps/api/app/api/manifest/[entity]/commands/[command]/route.ts

Next.js supports this because App Router route handlers live as route.ts files inside the app directory and export HTTP methods like POST, GET, PATCH, etc.

So this URL:

POST /api/manifest/Event/commands/create

does not mean there is a custom handwritten file for Event.create.

It means the one generic route receives:

entity = Event
command = create
body = event details

Then it asks Manifest runtime: “Does the IR say Event.create exists? What fields does it need? What permission does it require? What store/projection should it use? What events should it emit afterward?”

Same route, different command:

POST /api/manifest/StaffMember/commands/create
POST /api/manifest/Event/commands/publish
POST /api/manifest/Event/commands/assignStaff

The file does not multiply. The behavior comes from Manifest.

For your current problem, this matters because the pasted agent output says Capsule-Pro currently has route generation calling direct Prisma accessors like database.eventStaff, while the store layer already has separate mapping knowledge. That means routes, stores, and schema are still deciding names independently, which is the drift source.

A fully wired generic route would look conceptually like this:

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

The important part is what is not in that file.

It does not say:

prisma.eventStaffAssignment.create(...)

It does not say:

if user.role !== "admin" throw error

It does not say:

after event create, also create kitchen prep, calendar entry, forecast row, invoice draft...

All of that belongs behind Manifest runtime, IR, policy, projection, and event propagation.

Example surface 1: Events.

The Manifest source defines the entity and commands:

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

The user fills out an event form in the UI. The frontend posts this:

POST /api/manifest/Event/commands/create

Body:

{
  "title": "Smith Wedding",
  "clientId": "client_123",
  "venueId": "venue_456",
  "startsAt": "2026-06-20T18:00:00.000Z",
  "guestCount": 145
}

The generic route sends that to Manifest runtime.

Manifest runtime then does the work in a standard order:

Validate Event exists in IR.
Validate create is a real command for Event.
Validate required fields.
Check the user can create event drafts.
Write the Event record through the generated/projected persistence layer.
Emit EventCreated.
Write one audit entry.
Trigger propagation rules.

The audit log should say something human-useful like:

“Ryan created event draft ‘Smith Wedding’ for 145 guests.”

Not:

“field title set”
“field guestCount set”
“field status set”
“row inserted”
“tenantId set”
“createdAt set”

Then propagation happens from the domain event, not from the route. EventCreated can tell other systems:

Calendar: reserve the event date.
CRM: attach event to the client profile.
Proposal: create proposal draft shell.
Kitchen: create empty production plan.
Inventory: create demand placeholder.
Staffing: estimate staffing needs.
Forecasting: update future revenue/demand.
Tasks: create missing-info tasks.

That is the interconnected product value. The user creates the event once, and the rest of the app becomes aware of it.

Example surface 2: Staff.

Manifest source defines staff as its own surface:

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

The UI creates a staff member through the same generic command door:

POST /api/manifest/StaffMember/commands/create

Body:

{
  "displayName": "Alex Rivera",
  "email": "alex@example.com",
  "role": "Server",
  "status": "active"
}

Same route file. Different entity and command.

The runtime checks StaffMember.create, validates the fields, checks permission, writes the staff record, emits StaffMemberCreated, and writes a clean audit entry:

“Ryan added staff member Alex Rivera as Server.”

Now connect Events and Staff.

You probably need a join/assignment entity. The domain name should be Manifest-owned, for example:

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

The physical database table can still be old or ugly, like event_staff_assignments, but Prisma should hide that through @@map. Prisma explicitly supports mapping model names and field names to different database names through @@map and @map.

So generated Prisma should be conceptually:

model EventStaff {
  id            String @id
  eventId       String
  staffMemberId String
  role          String
  status        String

  @@map("event_staff_assignments")
}

Now the UI assigns staff to an event:

POST /api/manifest/EventStaff/commands/assign

Body:

{
  "eventId": "event_123",
  "staffMemberId": "staff_456",
  "role": "Lead Server"
}

Runtime result:

It validates EventStaff.assign.
It checks whether the user can assign staff.
It checks the event exists.
It checks the staff member exists and is active.
It creates the assignment.
It emits EventStaffAssigned.
It writes one useful audit entry.
It notifies related modules.

Audit entry:

“Ryan assigned Alex Rivera as Lead Server for Smith Wedding.”

Propagation:

Event timeline now shows staff assignment.
Staff profile now shows upcoming event.
Calendar can add staff call time.
Payroll/labor estimate updates.
Notifications may send Alex the assignment.
Forecasting updates labor coverage.
Prep/event sheet includes assigned staff.

The product effect is that the user does not have to go to five places and manually sync the same fact.

The route layer stays boring:

/api/manifest/Event/commands/create
/api/manifest/StaffMember/commands/create
/api/manifest/EventStaff/commands/assign

One route implementation handles all of them. Manifest decides which commands exist and what they do.

Feature-specific routes can still exist for nice URLs or old UI compatibility, but they should be wrappers only.

Example compatibility route:

apps/api/app/api/events/[eventId]/staff/assign/route.ts

It should only translate the nicer URL into the Manifest command:

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

That wrapper is acceptable because it does not own business logic. It is just an adapter for a nice URL.

The fully wired rule is:

Manifest owns the meaning.
Generic route owns HTTP entry.
Runtime owns validation, permission, audit, transaction, command execution.
Projection owns Prisma model names and database mapping.
Domain events own propagation.
UI owns presentation only.

What breaks today is when the route owns too much. If a generated route directly calls prisma.eventStaffAssignment, the route has now become a second source of truth. If the store says one thing, Prisma says another, and Manifest says another, TypeScript catches the mismatch only after the architecture has already drifted.

What improves with the generic command route is that adding a new command does not require inventing a new route file, Prisma accessor, permission check, audit shape, and propagation hook. The agent writes the Manifest command, the build validates/projections it, and the same runtime path handles it.

Will Capsule-Pro should have one route per entity, or one shared route for every Manifest entity?

The answer: one shared backend command route for all Manifest entities. Event, StaffMember, and EventStaff should not each get their own backend route folder unless it is just a compatibility wrapper.

Next.js supports this because one route.ts file can receive dynamic path params like [entity] and [command]; official docs show route handlers using dynamic route segments and exporting HTTP methods from route.ts.

The final shape should look like this.

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

The key part is this directory:

C:\Projects\capsule-pro\apps\api\app\api\manifest\[entity]\commands\[command]\route.ts

That is one real backend file. It handles all of these:

POST /api/manifest/Event/commands/create
POST /api/manifest/Event/commands/updateDetails
POST /api/manifest/Event/commands/publish
POST /api/manifest/StaffMember/commands/create
POST /api/manifest/StaffMember/commands/setAvailability
POST /api/manifest/EventStaff/commands/assign
POST /api/manifest/EventStaff/commands/remove

So no, the final backend should not need this:

C:\Projects\capsule-pro\apps\api\app\api\events\route.ts
C:\Projects\capsule-pro\apps\api\app\api\events\[id]\route.ts
C:\Projects\capsule-pro\apps\api\app\api\events\staff\assign\route.ts
C:\Projects\capsule-pro\apps\api\app\api\staff\route.ts
C:\Projects\capsule-pro\apps\api\app\api\staff\[id]\route.ts

Those can exist only as old compatibility wrappers, not as the real architecture.

The full Event surface would be represented like this.

C:\Projects\capsule-pro\manifest\source\event.manifest

This is the only authored business definition for Event. It defines fields like title, client, venue, start time, guest count, status, commands, emitted events, audit labels, and propagation rules.

Generated IR output:

C:\Projects\capsule-pro\manifest\ir\capsule.ir.json

Inside that generated IR, Event exists as an entity record:

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

Generated command registry:

C:\Projects\capsule-pro\manifest\ir\command-registry.generated.json

Example entries:

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

Generated Prisma projection:

C:\Projects\capsule-pro\manifest\ir\prisma-projection.generated.prisma

Then merged or written into:

C:\Projects\capsule-pro\packages\database\prisma\schema.prisma

The generated Prisma model should be named after the Manifest entity:

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

Prisma supports @@map, so the Prisma/API model can stay clean as Event even if the physical table name is events. Prisma’s docs specifically say @map and @@map decouple Prisma model/field names from database table/column names, and that Prisma Client then exposes the schema names rather than the mapped database names.

The generated Prisma Client accessor becomes:

prisma.event

But the generic route should not be hand-coding prisma.event.create(...). It should call the runtime:

POST /api/manifest/Event/commands/create

goes through:

C:\Projects\capsule-pro\apps\api\app\api\manifest\[entity]\commands\[command]\route.ts
→ C:\Projects\capsule-pro\apps\api\lib\manifest\execute-command.ts
→ C:\Projects\capsule-pro\manifest\runtime\src\runtime-engine.ts
→ C:\Projects\capsule-pro\manifest\runtime\src\prisma-store.ts
→ prisma.event

The full Staff surface should look like this.

C:\Projects\capsule-pro\manifest\source\staff-member.manifest

Generated IR:

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

Generated command registry:

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

Generated Prisma model:

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

Generated Prisma Client accessor:

prisma.staffMember

The API URL is not /api/staff/create. It is:

POST /api/manifest/StaffMember/commands/create
POST /api/manifest/StaffMember/commands/updateProfile
POST /api/manifest/StaffMember/commands/setAvailability
POST /api/manifest/StaffMember/commands/deactivate

Now the connection between Events and Staff needs a third Manifest entity:

C:\Projects\capsule-pro\manifest\source\event-staff.manifest

This is not extra bullshit; it is the actual relationship between the two surfaces. It means “this staff member is assigned to this event.”

Generated Prisma model:

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

This is the exact fix for the EventStaff / EventStaffAssignment confusion. The Manifest/Prisma/API name is EventStaff. The old physical table name can remain event_staff_assignments behind @@map. Prisma Client is generated from the Prisma schema models, so the generated client API follows EventStaff, not the mapped table name.

Generated Prisma Client accessor:

prisma.eventStaff

The command URL:

POST /api/manifest/EventStaff/commands/assign

Body:

{
  "eventId": "event_123",
  "staffMemberId": "staff_456",
  "role": "Lead Server"
}

That request still hits the same one file:

C:\Projects\capsule-pro\apps\api\app\api\manifest\[entity]\commands\[command]\route.ts

The route receives:

{
  "entity": "EventStaff",
  "command": "assign"
}

Then the runtime looks up:

{
  "EventStaff.assign": {
    "entity": "EventStaff",
    "command": "assign",
    "permission": "event.staff.assign",
    "auditLevel": "important",
    "emits": ["EventStaffAssigned"]
  }
}

The route does not know or care whether the database table is called event_staff_assignments. That is projection/runtime/store knowledge.

For reads, I would also use generic routes, but separate from commands:

C:\Projects\capsule-pro\apps\api\app\api\manifest\[entity]\route.ts
C:\Projects\capsule-pro\apps\api\app\api\manifest\[entity]\[id]\route.ts

Those handle:

GET /api/manifest/Event
GET /api/manifest/Event/event_123
GET /api/manifest/StaffMember
GET /api/manifest/StaffMember/staff_456
GET /api/manifest/EventStaff?eventId=event_123

So the final backend route count for Event + Staff + EventStaff is still basically:

1 command route:
C:\Projects\capsule-pro\apps\api\app\api\manifest\[entity]\commands\[command]\route.ts

1 collection read route:
C:\Projects\capsule-pro\apps\api\app\api\manifest\[entity]\route.ts

1 item read route:
C:\Projects\capsule-pro\apps\api\app\api\manifest\[entity]\[id]\route.ts

That is the clean version: 3 shared backend route files total, not 3 route files per entity.

UI pages are different. The frontend can still have real product-specific pages because users need normal screens:

C:\Projects\capsule-pro\apps\app\app\events\page.tsx
C:\Projects\capsule-pro\apps\app\app\events\[eventId]\page.tsx
C:\Projects\capsule-pro\apps\app\app\events\new\page.tsx

C:\Projects\capsule-pro\apps\app\app\staff\page.tsx
C:\Projects\capsule-pro\apps\app\app\staff\[staffMemberId]\page.tsx
C:\Projects\capsule-pro\apps\app\app\staff\new\page.tsx

Those UI pages call the generic API:

events/new/page.tsx
→ POST /api/manifest/Event/commands/create

events/[eventId]/page.tsx assign staff button
→ POST /api/manifest/EventStaff/commands/assign

staff/new/page.tsx
→ POST /api/manifest/StaffMember/commands/create

So yes: frontend has separate Event and Staff pages. Backend command handling does not.

The final flow for creating an event is:

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

The final flow for assigning staff is:

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

The current pasted agent output says Capsule-Pro has the bad version right now: handwritten Prisma stores, a big provider switch, unused Prisma projection, and generated routes directly guessing database.eventStaff. That is exactly why this should move to the shared route + generated registry/projection model.