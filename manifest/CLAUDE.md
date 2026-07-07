This file is the **master TypeScript shape of Manifest’s compiled IR**: the formal list of everything the compiler is allowed to put into the intermediate representation. It is essentially the contract between:

`Manifest source files → compiler → IR JSON/object → runtime + generators/projections`

The single most important thing to understand is this:

**This file defines what Manifest can describe. It does not prove that every described feature actually works end to end.**

An interface can say `retry`, `webhooks`, `sagas`, or `realtime` exists, while the runtime, Prisma generator, Next.js generator, or other adapter may still ignore it. 

## 1. The top-level `IR` object

```ts
export interface IR {
  version: '1.0';
  provenance: IRProvenance;
  tenant?: IRTenant;
  modules: IRModule[];
  values: IRValueObject[];
  entities: IREntity[];
  enums: IREnum[];
  stores: IRStore[];
  events: IREvent[];
  commands: IRCommand[];
  policies: IRPolicy[];
  reactions?: IRReactionRule[];
  sagas?: IRSaga[];
  roles?: IRRole[];
  schedules?: IRSchedule[];
  webhooks?: IRWebhook[];
}
```

This is the whole compiled Manifest application.

In plain English, Manifest expects one compiled IR to be capable of containing:

* the application's data types and entities
* database/storage choices
* commands that change things
* authorization rules
* emitted events
* automatic reactions to events
* multi-step workflows
* scheduled work
* inbound webhooks
* roles and permissions

For Capsule-Pro, conceptually:

```text
Event
Dish
PrepList
StaffMember
```

would live in `entities`.

```text
CreateEvent
FinalizeEvent
GeneratePrepList
```

would live in `commands`.

```text
EventFinalized
PrepListGenerated
```

would live in `events`.

Everything else points back to those canonical definitions.

---

# 2. Provenance: where this IR came from

```ts
export interface IRProvenance {
  contentHash: string;
  irHash?: string;
  compilerVersion: string;
  schemaVersion: string;
  compiledAt: string;
  sources?: IRProvenanceSource[];
}
```

This is traceability information.

It records:

* which Manifest source content produced the IR
* which compiler version compiled it
* which IR schema version it follows
* when compilation happened
* optionally, every source file involved

The hashes matter because they allow Manifest to detect:

```text
Source changed
↓
IR should have changed
↓
Generated output may now be stale
```

`contentHash` hashes the source.

`irHash` hashes the compiled result itself.

`sources` is especially important when a large application is split across many Manifest files.

Real app impact: this is the foundation for a real drift check. It could let CI prove that the Prisma schema, clients, APIs, or other generated output came from the exact current Manifest source.

It does not itself perform that check. It merely provides the information needed.

---

# 3. Tenant configuration

```ts
export interface IRTenant {
  property: string;
  type: IRType;
  contextPath: string;
}
```

This defines application-wide multi-tenancy.

Example:

```text
property: tenantId
type: String
contextPath: context.tenantId
```

That means Manifest knows:

1. persisted entities should have a `tenantId`
2. the active tenant comes from runtime context
3. operations can use that value for isolation

This is substantially better than every page and API route manually remembering:

```ts
where: {
  tenantId: currentTenant.id
}
```

But again, this interface alone does not guarantee isolation.

For tenant isolation to actually work:

```text
Manifest source
→ compiler emits tenant config
→ runtime reads contextPath
→ store filters reads/writes
→ projections generate tenant-aware code
→ tests prove cross-tenant access fails
```

If one of those layers ignores `IR.tenant`, tenant safety can still be broken.

---

# 4. Modules

```ts
export interface IRModule {
  name: string;
  entities: string[];
  enums: string[];
  commands: string[];
  stores: string[];
  events: string[];
  policies: string[];
  ...
}
```

Modules group related application concepts.

Example:

```text
Kitchen module
  Dish
  PrepList
  GeneratePrepList
  PrepListGenerated
```

Another:

```text
Events module
  Event
  Venue
  FinalizeEvent
  EventFinalized
```

Notice these arrays contain names, not full definitions.

The actual `Event` object remains in `ir.entities`; the module says:

> Event belongs to this module.

That lets generators organize output and prevents the entire application from becoming one giant undifferentiated pile.

---

# 5. Value objects

```ts
export interface IRValueObject {
  name: string;
  properties: IRProperty[];
}
```

A value object is structured data embedded inside something else rather than a standalone database record.

Example:

```text
Address
  street
  city
  province
  postalCode
```

An Event or Venue can contain an Address.

But Address does not necessarily have:

```text
its own ID
its own table
its own CRUD page
```

The comment explicitly says they are:

* embedded
* immutable by design
* not separate tables

This is useful for concepts that belong together but are not independent business records.

---

# 6. Entities: the main business objects

`IREntity` is one of the most important structures in the entire file.

```ts
export interface IREntity {
  name: string;
  module?: string;
  parent?: string;
  mixins?: string[];
  properties: IRProperty[];
  computedProperties: IRComputedProperty[];
  relationships: IRRelationship[];
  commands: string[];
  constraints: IRConstraint[];
  policies: string[];
  ...
}
```

An entity is something like:

```text
Event
Employee
Recipe
PrepList
Invoice
InventoryItem
```

The entity definition can describe much more than database columns.

## `parent`

```ts
parent?: string;
```

Inheritance.

Example:

```text
Employee extends Person
```

The child inherits from the parent.

## `mixins`

```ts
mixins?: string[];
```

Composition.

Example:

```text
Event mixes in Auditable
Event mixes in TenantScoped
```

Unlike inheritance, multiple reusable sets of behavior/properties can be combined.

## `properties`

Normal stored fields.

Example:

```text
Event.name
Event.eventDate
Event.guestCount
```

## `computedProperties`

Values derived from other information rather than necessarily stored directly.

Example:

```text
invoice.total = subtotal + tax
```

## `relationships`

Connections to other entities.

Example:

```text
Event belongsTo Client
Event hasMany Dishes
```

## `commands`

The operations this entity supports.

Example:

```text
Event:
  CreateEvent
  FinalizeEvent
  CancelEvent
```

## `constraints`

Business rules.

Example:

```text
guestCount must be greater than zero
```

## `policies`

Authorization rules affecting the entity.

Example:

```text
Only managers can delete an Event
```

---

# 7. Entity inheritance and composition

These two fields deserve emphasis:

```ts
parent?: string;
mixins?: string[];
```

They mean Manifest's IR is not merely describing database tables.

It is representing a proper domain model.

Example:

```text
Person
├── Employee
└── ClientContact
```

Or composition:

```text
Event
+ TenantScoped
+ Timestamped
+ Auditable
```

That gives the compiler enough information to flatten or preserve these concepts depending on the target projection.

A Prisma generator might produce columns.

A TypeScript generator might produce inherited types.

A documentation generator might show the relationship directly.

---

# 8. Primary keys and alternate keys

```ts
key?: string[];
alternateKeys?: string[][];
```

`key` allows composite primary keys.

Example:

```text
["tenantId", "id"]
```

Meaning this pair uniquely identifies the record.

`alternateKeys` defines other unique combinations that foreign keys are allowed to reference.

Example:

```text
["tenantId", "externalId"]
```

This is important for serious database generation because relationships do not always point to a single universal `id` column.

For Capsule-Pro, this means Manifest's IR can represent tenant-aware uniqueness structurally rather than bolting it onto Prisma afterward.

---

# 9. Optimistic concurrency

```ts
versionProperty?: string;
versionAtProperty?: string;
```

This is for preventing two users from silently overwriting each other's changes.

Suppose:

```text
Ryan opens Event version 4
Manager opens Event version 4
Ryan saves → version becomes 5
Manager saves old version 4
```

The runtime can reject the second save:

```text
Expected version: 4
Actual version: 5
```

The later `ConcurrencyConflict` interface describes the exact information returned.

Without this, the manager's stale form might silently overwrite Ryan's newer changes.

---

# 10. Automatic timestamps

```ts
timestamps?: boolean;
```

When enabled, Manifest can inject and maintain:

```text
createdAt
updatedAt
```

The important word in the comment is **runtime**.

It is not merely:

> Add two columns to Prisma.

The stated intent is:

```text
Manifest understands timestamps
→ runtime populates them
→ projections represent them
```

That makes them a Manifest semantic rather than database-specific configuration.

---

# 11. Realtime

```ts
realtime?: boolean;
```

This comment is extremely important:

```text
Projection hint.
No runtime execution semantics.
```

That means this field does not itself make anything realtime.

It tells a generator:

> Generate an SSE subscription surface for this entity.

So:

```text
realtime: true
```

does not mean the Manifest runtime automatically watches changes.

A projection must see it and generate the required subscription code.

This is a perfect example of why finding a feature in `ir.ts` does not prove it is implemented.

---

# 12. External entities

```ts
external?: boolean;
```

This means:

> Manifest knows this entity exists, but another system owns it.

The comment says persistence projections should skip it.

Example:

```text
StripeCustomer
```

You may need to reference a Stripe customer in domain rules, but you do not want Manifest generating:

```text
StripeCustomer Prisma table
StripeCustomer database CRUD
```

because Stripe owns that record.

That is what `external entity` is for.

---

# 13. State transitions

```ts
export interface IRTransition {
  property: string;
  from: string;
  to: string[];
}
```

This defines legal state changes.

Example:

```text
Event.status:

draft
  → confirmed
  → cancelled

confirmed
  → completed
  → cancelled
```

It can prevent nonsense like:

```text
completed → draft
```

unless that transition was explicitly permitted.

For Capsule-Pro, this could govern:

```text
Event
PrepList
Invoice
PurchaseOrder
TrainingAssignment
```

The critical architecture difference is:

Bad:

```text
Page A allows Draft → Confirmed
Page B accidentally allows Draft → Completed
API route C allows anything
```

Manifest approach:

```text
The transition graph is canonical
Everything uses the same rule
```

Again, only if the runtime actually enforces `transitions`.

---

# 14. Approval workflows

Manifest can represent multi-stage approvals directly.

```ts
export interface IRApproval {
  name: string;
  command: string;
  stages: IRApprovalStage[];
  timeout?: number;
  onTimeout?: 'cancel' | 'escalate';
  emits: string[];
}
```

Example:

```text
ApproveLargePurchase
```

Stage one:

```text
Department manager
Required approvals: 1
```

Stage two:

```text
Finance director
Only when amount > $10,000
Required approvals: 1
```

An approval stage contains:

```ts
policy: IRExpression;
required: number;
when?: IRExpression;
```

So Manifest can express:

```text
Who may approve?
How many approvals are needed?
When does this stage apply?
```

It also supports timeout behavior:

```text
cancel
or
escalate
```

and lifecycle events.

This is genuinely sophisticated domain behavior.

But this file only proves the IR has somewhere to store it.

You would still need to verify:

```text
parser
compiler
runtime execution
persistence
generated UI/API support
```

---

# 15. Properties

```ts
export interface IRProperty {
  name: string;
  type: IRType;
  defaultValue?: IRValue;
  autoNow?: boolean;
  modifiers: PropertyModifier[];
  maskStrategy?: IRMaskStrategy;
}
```

A property represents a field.

Example:

```text
Event.name: String
```

It can carry:

* type
* static default
* current-time default
* modifiers
* masking rules

---

# 16. Property modifiers

```ts
'required'
'unique'
'indexed'
'private'
'readonly'
'optional'
'searchable'
'encrypted'
'masked'
```

These are semantic facts about a field.

For example:

```text
email required unique searchable
```

Or:

```text
salary private encrypted
```

Or:

```text
ssn masked
```

The intended benefit is enormous: these facts can theoretically feed multiple outputs.

```text
unique
→ database unique constraint
→ validation
→ generated form behavior

searchable
→ search index projection

private
→ API/read filtering

encrypted
→ persistence behavior

masked
→ read transformation
```

But each target system must actually consume the modifier.

A modifier sitting unused in IR changes nothing.

---

# 17. Dynamic time defaults

```ts
autoNow?: boolean;
```

This handles:

```text
createdAt = now()
```

You cannot compile the current time into a static value because the current time changes every time a record is created.

So instead of:

```json
"defaultValue": "2026-07-06T..."
```

the compiler records:

```text
autoNow: true
```

The runtime can then stamp the current time when execution occurs.

A Prisma projection can also emit:

```prisma
@default(now())
```

This is another example where one semantic meaning can be projected differently depending on the target.

---

# 18. Field masking

```ts
maskStrategy?: IRMaskStrategy;
```

Supported strategies:

```text
redact
partial
email
phone
last4
```

Examples:

```text
redact:
********

partial:
Ry******rt

email:
r***@example.com

phone:
(***) ***-1234

last4:
********1234
```

`unmaskWhen` can allow the real value conditionally.

Example:

```text
Managers see the complete phone number
Other users see a masked value
```

The comment says an error or false condition results in masking.

That is the safer failure mode:

```text
Authorization check breaks
→ hide sensitive value
```

rather than:

```text
Authorization check breaks
→ expose sensitive value
```

---

# 19. Computed properties and caching

```ts
export interface IRComputedProperty {
  name: string;
  type: IRType;
  expression: IRExpression;
  dependencies: string[];
  cache?: IRComputedPropertyCache;
}
```

Example:

```text
remainingQuantity =
requiredQuantity - preparedQuantity
```

`dependencies` records what must change before the computed value could change.

Caching options:

```text
request
session
ttl
```

`request` means reuse during one request.

`session` means reuse through a user session.

`ttl` means reuse for a specified period.

For TTL:

```ts
ttlSeconds?: number;
```

This is a performance feature, but only if some runtime layer actually implements the cache semantics.

---

# 20. Relationships and foreign keys

```ts
kind:
'hasMany'
'hasOne'
'belongsTo'
'ref'
```

Example:

```text
Event hasMany Dish
Dish belongsTo Event
```

A relationship can use a direct foreign key:

```ts
foreignKey?: {
  fields: string[];
  references?: string[];
}
```

Example:

```text
local:
eventId

references:
id
```

Or a many-to-many join entity:

```ts
through?: string;
```

Example:

```text
Recipe
Ingredient
RecipeIngredient
```

`RecipeIngredient` is the joining entity.

The interface explicitly says `foreignKey` and `through` are mutually exclusive.

That is good because these represent two different relationship structures.

---

# 21. Delete and update behavior

```ts
export type RefAction =
  'cascade'
  | 'restrict'
  | 'setNull'
  | 'setDefault'
  | 'noAction';
```

These answer:

> What happens to related data when the record it references changes or disappears?

Example:

```text
Delete Event
```

`cascade`:

```text
Delete related child rows too
```

`restrict`:

```text
Refuse to delete Event while children exist
```

`setNull`:

```text
Keep child rows but remove their Event reference
```

These semantics matter enormously to database correctness.

---

# 22. Constraints

```ts
export interface IRConstraint {
  name: string;
  code: string;
  expression: IRExpression;
  severity?: 'ok' | 'warn' | 'block';
  message?: string;
  messageTemplate?: string;
  detailsMapping?: Record<string, IRExpression>;
  overrideable?: boolean;
  overridePolicyRef?: string;
}
```

A constraint is a business rule.

Example:

```text
Inventory cannot fall below zero
```

Possible severity:

```text
ok
warn
block
```

`block`:

```text
Do not execute the operation
```

`warn`:

```text
Allow it but report the problem
```

The constraint can include:

* stable error code
* normal message
* interpolated message
* structured details for UI
* override support
* authorization rule for the override

Example:

```text
Constraint:
EVENT_CAPACITY_EXCEEDED

Message:
Guest count 320 exceeds venue capacity 250

Overrideable:
yes

Override policy:
GeneralManagerOverride
```

This is much richer than a random:

```ts
if (...) throw new Error("Bad")
```

scattered in a page or API route.

---

# 23. Constraint overrides

The later types show what happens at runtime.

```ts
export interface OverrideRequest {
  constraintCode: string;
  reason: string;
  authorizedBy: string;
  timestamp: number;
}
```

An override is not simply:

```text
ignore error = true
```

It records:

* what rule was overridden
* why
* who authorized it
* when

`ConstraintOutcome` then records the result:

```ts
passed: boolean;
overridden?: boolean;
overriddenBy?: string;
```

That could support an audit trail like:

```text
Venue capacity exceeded
Blocked normally
Overridden by Ryan
Reason: Additional licensed outdoor capacity
```

This is the kind of behavior that should not be rewritten independently on every page.

---

# 24. Retry behavior

```ts
export interface IRRetry {
  maxAttempts: number;
  backoff: 'fixed' | 'linear' | 'exponential';
  delayMs: number;
  jitter?: boolean;
  retryOn?: string[];
}
```

This controls automatic retries for commands.

Example:

```text
SendSupplierOrder
```

Configuration:

```text
max attempts: 5
backoff: exponential
starting delay: 1000 ms
retry only on:
NETWORK_TIMEOUT
SUPPLIER_UNAVAILABLE
```

Exponential backoff roughly means waiting progressively longer:

```text
1 sec
2 sec
4 sec
8 sec
```

`jitter` adds randomness so thousands of failed requests do not all retry simultaneously.

Important distinction:

This makes sense for transient failures.

It should not retry things like:

```text
invalid guest count
unauthorized user
missing required field
```

That is what `retryOn` is for.

---

# 25. Rate limiting

```ts
export interface IRRateLimit {
  maxRequests: number;
  windowMs: number;
  scope: 'user' | 'tenant' | 'global';
  burstAllowance?: number;
}
```

Example:

```text
100 requests per minute per tenant
```

or:

```text
5 password-reset requests per hour per user
```

Scope determines who shares the limit:

`user`:
one person's usage

`tenant`:
everyone in one business shares the limit

`global`:
the whole application shares the limit

Rate limits can apply to commands and policies.

Again, some actual runtime or infrastructure must enforce them.

---

# 26. Stores

```ts
export interface IRStore {
  entity: string;
  target: BuiltinStoreTarget | custom string;
  config: Record<string, IRValue>;
}
```

Built-in targets listed here:

```text
memory
localStorage
postgres
supabase
durable
mongodb
```

A store says where an entity lives.

Example:

```text
Event → postgres
DraftForm → localStorage
TemporaryCalculation → memory
```

The target also allows custom adapter schemes.

This is the abstraction that should let Manifest describe persistence without forcing the domain model to be Prisma-specific.

But this file does not say how complete each adapter is.

You still need to verify:

```text
Can it create?
Can it query?
Can it update?
Can it enforce relationships?
Can it run transactions?
Can it handle tenant isolation?
```

for each actual target.

---

# 27. Events

```ts
export interface IREvent {
  name: string;
  channel: string;
  payload: IRType | IREventField[];
}
```

An event records that something happened.

Example:

```text
EventFinalized
InvoicePaid
PrepListGenerated
```

An event has:

* name
* channel
* payload

Payload example:

```text
EventFinalized:
  eventId
  finalizedBy
  finalizedAt
```

A command can emit events.

That creates a clean separation:

```text
FinalizeEvent
does its job
↓
emits EventFinalized
↓
other systems react
```

instead of `FinalizeEvent` manually calling every secondary side effect itself.

---

# 28. Reactions

```ts
export interface IRReactionRule {
  event: string;
  targetEntity: string;
  targetCommand: string;
  resolve?: IRExpression;
  params?: IRReactionParam[];
  fanOut?: ...
}
```

A reaction is:

> When event X happens, automatically run command Y.

Example:

```text
When EventFinalized
→ GeneratePrepList
```

`resolve` finds one target record.

Example:

```text
EventFinalized.eventId
→ load that Event
→ invoke command
```

`fanOut` means run a command on many matching records.

Example:

```text
When RecipeChanged
→ find every active PrepList using that recipe
→ run RecalculatePrepList
```

That is a collection reaction rather than a single-target reaction.

This is major application wiring.

The intended effect is that the causal relationship is declared in Manifest, rather than hidden inside random route handlers and background jobs.

---

# 29. Sagas

A saga coordinates several commands.

```ts
export interface IRSaga {
  name: string;
  steps: IRSagaStep[];
  onFailure: 'compensate' | 'abort';
  emits: string[];
}
```

Example:

```text
BookEvent saga:

1. ReserveVenue
2. CreateInvoice
3. ReserveStaff
4. ConfirmEvent
```

Suppose step 3 fails.

With:

```text
onFailure: compensate
```

Manifest can run reverse operations:

```text
CancelInvoice
ReleaseVenue
```

That is compensation.

This is needed when several operations cannot all live inside one normal database transaction.

A saga step therefore contains both:

```text
forward command
compensating command
```

Example:

```text
ReserveVenue
compensate with ReleaseVenue
```

`abort` means stop on failure without compensating completed steps.

---

# 30. Schedules

```ts
export interface IRSchedule {
  commandName: string;
  trigger: IRTrigger;
  params?: IRScheduleParam[];
}
```

Schedules invoke commands automatically.

Trigger kinds:

```text
cron
interval
every
```

Example:

```text
Every Monday at 9 AM
→ GenerateWeeklyInventoryReport
```

or:

```text
Every 15 minutes
→ RefreshSupplierStatus
```

The key design point is that a schedule invokes a normal Manifest command.

That avoids creating one business logic path for users and another unrelated implementation for background jobs.

Ideally:

```text
Button click
Scheduled execution
Webhook
Event reaction
```

can all reach the same canonical command.

---

# 31. Webhooks

```ts
export interface IRWebhook {
  name: string;
  path: string;
  method?: string;
  command: string;
  entity?: string;
  signature?: IRWebhookSignature;
  idempotencyHeader?: string;
  transform?: IRWebhookParam[];
}
```

This maps an inbound HTTP request to a Manifest command.

Example:

```text
POST /webhooks/stripe
↓
verify signature
↓
extract payment data
↓
invoke MarkInvoicePaid
```

It supports:

* path
* HTTP method
* target command
* entity context
* HMAC verification
* idempotency
* payload transformation

That is important because external systems send data in their own format.

For example:

```text
Stripe:
data.object.id
```

might be transformed into:

```text
paymentId
```

for the Manifest command.

Again, this interface does not prove there is an actual HTTP server implementation registering the routes.

---

# 32. Webhook signatures

Supported algorithms:

```text
hmac-sha256
hmac-sha512
```

Configuration says:

```text
Which header contains the signature?
Where does the secret come from?
Which algorithm verifies it?
```

Example:

```text
Header:
X-Hub-Signature-256

Secret:
context.webhookSecret
```

This is designed so the secret is not compiled directly into IR as plaintext.

Instead it points to runtime context.

---

# 33. Idempotency

```ts
idempotencyHeader?: string;
```

This is specifically for preventing duplicate webhook processing.

Example:

Stripe sends the same webhook three times.

Without idempotency:

```text
Payment received
Payment received
Payment received
```

Potential result:

```text
3 invoices updated
3 emails sent
3 downstream operations
```

With the same idempotency key:

```text
First request executes
Duplicates are recognized
```

The field only tells the runtime where the key comes from.

A real idempotency implementation must still:

```text
store keys
check keys
handle concurrent duplicates
record result
```

---

# 34. Commands

`IRCommand` is probably the most important runtime structure.

```ts
export interface IRCommand {
  name: string;
  entity?: string;
  parameters: IRParameter[];
  guards: IRExpression[];
  constraints?: IRConstraint[];
  policies?: string[];
  retry?: IRRetry;
  rateLimit?: IRRateLimit;
  actions: IRAction[];
  emits: string[];
  emitPayloads?: IREmitPayload[];
  returns?: IRType;
  async?: boolean;
  completionEvent?: string;
  failureEvent?: string;
}
```

A command represents an intentional operation:

```text
CreateEvent
FinalizeEvent
AssignEmployee
GeneratePrepList
ApproveInvoice
```

It can define the entire execution contract:

```text
inputs
↓
guards
↓
constraints
↓
authorization
↓
rate limit
↓
actions
↓
events
↓
return value
```

This is why your goal of a single Manifest-defined command path makes sense.

A page button should not contain a second independent implementation of `FinalizeEvent`.

It should invoke the command that Manifest defines.

---

# 35. Parameters

```ts
export interface IRParameter {
  name: string;
  type: IRType;
  required: boolean;
  defaultValue?: IRValue;
}
```

These are command inputs.

Example:

```text
CreateEvent:
  clientId: String required
  eventDate: DateTime required
  guestCount: Int required
  notes: String optional
```

A generator could theoretically use this same information to produce:

```text
TypeScript types
validation
API contract
forms
documentation
```

That is exactly where Manifest can eliminate disagreement between layers.

---

# 36. Guards versus constraints

Commands have both:

```ts
guards: IRExpression[];
constraints?: IRConstraint[];
```

They are related, but constraints have far richer structure.

A guard is basically:

```text
This condition must be true
```

Example:

```text
self.status == "draft"
```

A constraint can additionally have:

```text
stable code
severity
message
structured details
override behavior
override authorization
```

So a guard is the simpler gate.

A constraint is a full business-rule object.

---

# 37. Command actions

```ts
kind:
'mutate'
'emit'
'compute'
'effect'
'publish'
'persist'
```

These are the operations a command performs.

Conceptually:

`mutate`:
change state

`emit`:
create an event

`compute`:
calculate a value

`effect`:
perform a side effect

`publish`:
send something outward

`persist`:
save data

Each action stores its logic as an `IRExpression`.

The exact meaning of each depends on runtime implementation. This is another part I would audit carefully rather than assuming all six are fully implemented.

---

# 38. Explicit event payloads

```ts
emitPayloads?: IREmitPayload[];
```

This lets a command explicitly define what data goes into an emitted event.

Example:

```text
FinalizeEvent emits EventFinalized {
  eventId: self.id
  finalizedBy: context.userId
  guestCount: self.guestCount
}
```

That is safer than each event consumer guessing what data the event contains.

---

# 39. Async commands

```ts
async?: boolean;
completionEvent?: string;
failureEvent?: string;
```

An async command does not finish all work in the user's request.

Instead:

```text
User invokes command
↓
job is queued
↓
worker executes later
↓
completion or failure event emitted
```

Example:

```text
GenerateLargeCateringReport
```

The web request does not need to stay open while report generation runs.

The compiler apparently auto-derives event names for completion and failure.

---

# 40. The job queue

The later interfaces are the runtime representation of async work.

```ts
export interface JobRecord {
  jobId: string;
  commandName: string;
  ...
  status:
    'pending'
    | 'running'
    | 'completed'
    | 'failed';
}
```

It records:

* which command to run
* target entity
* target instance
* input
* tracing information
* when it was queued
* current state

`correlationId` and `causationId` let systems track chains like:

```text
Webhook
→ command
→ event
→ reaction
→ async command
```

The `JobQueue` interface defines what a storage adapter must support:

```text
enqueue
get pending jobs
change job status
```

The optional transaction handle is important.

It allows:

```text
database change
+
job enqueue
```

to join the same transaction when supported.

Otherwise you can get:

```text
Database saved
Job never queued
```

or:

```text
Job queued
Database save failed
```

which causes inconsistent behavior.

---

# 41. Policies

```ts
export interface IRPolicy {
  name: string;
  entity?: string;
  action:
    'read'
    | 'write'
    | 'delete'
    | 'execute'
    | 'all'
    | 'override';
  expression: IRExpression;
  rateLimit?: IRRateLimit;
  message?: string;
}
```

A policy is an authorization rule.

Example:

```text
Managers can execute FinalizeEvent
```

Or:

```text
Users can read Events belonging to their tenant
```

Policies can cover:

* reading
* writing
* deletion
* command execution
* all actions
* constraint overrides

The `expression` determines whether access is allowed.

This is the declarative authorization part of Manifest.

---

# 42. Roles and permissions

Roles contain:

```ts
parent?: string;
allow: IRRolePermission[];
deny: IRRolePermission[];
effectivePermissions: IRRolePermission[];
```

Example:

```text
Employee
  allow: read Event

Manager extends Employee
  allow: write Event
  allow: execute FinalizeEvent
```

The compiler flattens inheritance into:

```text
effectivePermissions
```

This is explicitly designed so the runtime does not repeatedly calculate the role hierarchy.

The comment says runtime checks become effectively direct lookups.

Deny permissions are resolved during compilation too.

---

# 43. Custom permissions

Role actions are not limited to standard CRUD.

This:

```ts
| (string & {});
```

means arbitrary permission names are allowed.

Example:

```text
approve_high_value_invoice
view_payroll
override_venue_capacity
```

These are opaque tokens.

Manifest does not need built-in knowledge of them; it just checks exact permission matches.

That is useful for real applications, where permissions are often more specific than:

```text
read
write
delete
```

---

# 44. Types

```ts
export interface IRType {
  name: string;
  generic?: IRType;
  nullable: boolean;
  params?: {
    precision?: number;
    scale?: number;
  };
}
```

This is Manifest's normalized type representation.

Examples:

```text
String
Int
DateTime
Decimal(12, 2)
List<Event>
nullable String
```

`generic` supports nested types.

Example:

```text
List<String>
```

`precision` and `scale` support decimals.

Example:

```text
Decimal(10, 2)
```

meaning roughly:

```text
up to 10 total digits
2 after the decimal
```

This is important for money.

---

# 45. Literal values

`IRValue` is data, not executable logic.

It supports:

```text
string
number
boolean
null
array
object
```

Example:

```json
{
  "kind": "string",
  "value": "draft"
}
```

or:

```json
{
  "kind": "array",
  "elements": [...]
}
```

This is how defaults and configuration values survive compilation in a structured form.

---

# 46. Expressions: the executable logic tree

`IRExpression` is the language's logic after parsing.

Instead of keeping:

```text
guestCount > venue.capacity
```

as raw text, the compiler can represent it structurally:

```text
binary >
├── identifier guestCount
└── member
    ├── identifier venue
    └── capacity
```

Supported expression nodes include:

```text
literal
identifier
member access
binary operation
unary operation
function call
conditional
array
object
lambda
aggregate
```

This is called an abstract syntax tree.

Why it matters:

The runtime does not have to parse Manifest source code every time a command runs.

The compiler has already converted the expression into structured data.

---

# 47. Aggregate expressions

```ts
{
  kind: 'aggregate';
  op: 'count';
  entity: string;
  predicates: ...
}
```

Currently this shape explicitly supports `count`.

Example:

```text
count Reservation
where eventId == self.id
```

That can support rules like:

```text
Do not exceed 20 active reservations
```

or:

```text
Event may only be deleted when count(Invoice) == 0
```

Notably, the IR type shown here supports only:

```text
op: 'count'
```

It does not show:

```text
sum
avg
min
max
```

So based strictly on this file, those aggregates are not represented by this specific node.

---

# 48. Diagnostics

```ts
export interface IRDiagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
}
```

These are compiler messages.

Example:

```text
ERROR line 28:
Unknown entity "Evnt"
```

or:

```text
WARNING:
Command declares an event with no consumers
```

`CompileToIRResult` returns:

```ts
{
  ir: IR | null;
  diagnostics: IRDiagnostic[];
}
```

If compilation fails:

```text
ir = null
diagnostics = errors
```

This is the proper compiler boundary.

---

# 49. Concurrency conflicts

```ts
export interface ConcurrencyConflict {
  entityType: string;
  entityId: string;
  expectedVersion: number;
  actualVersion: number;
  conflictCode: string;
}
```

This is the structured result of stale-write detection.

Real app effect:

Instead of the user seeing:

```text
500 Internal Server Error
```

the app could say:

```text
This Event was changed by someone else after you opened it.
Reload the latest version before saving.
```

The structured data is there to support that.

---

# What this file actually tells you about Manifest

The IR is far more ambitious than:

```text
define entities
→ generate database schema
```

It is trying to model almost the entire behavior layer of an application:

```text
DATA
entities
properties
relationships
keys

BUSINESS RULES
constraints
transitions
computed values

OPERATIONS
commands
parameters
actions

SECURITY
policies
roles
permissions
masking

AUTOMATION
events
reactions
sagas
schedules
webhooks
async jobs

INFRASTRUCTURE
stores
retry
rate limits
tenant isolation
concurrency

TRACEABILITY
source hashes
IR hashes
compiler versions
```

That is why the missing runtime you discovered was such a massive issue.

The IR can contain all of this, but something has to **execute its meaning**.

The complete path is:

```text
1. Language supports syntax
2. Parser reads it
3. Compiler validates it
4. Compiler puts it in IR
5. Runtime executes it
6. Stores/adapters support it
7. Projections generate useful target code
8. App invokes the generated/runtime surface
9. Tests prove the complete path
```

A feature can exist at any one of those levels while being completely useless to the actual app.

## The exact mistake agents kept making

They could find:

```ts
retry?: IRRetry;
```

and report:

> Manifest supports retry.

That conclusion is not justified.

The only justified conclusion from this file is:

> The IR data model has a place to represent retry configuration.

To prove actual support, they must trace:

```text
Manifest syntax
→ compiler output
→ IR field
→ runtime consumer
→ real adapter behavior
→ test exercising actual execution
```

The same applies to:

```text
tenant
transitions
approvals
realtime
encrypted
masked
reactions
sagas
schedules
webhooks
async
rateLimit
retry
```

## The architectural conclusion for Capsule-Pro

This file shows that your intended architecture is reasonable:

```text
Manifest source
      ↓
Canonical IR
      ↓
Runtime execution + projections
      ↓
Database / API / application
```

Your problem has not been that Manifest lacks a place to express application behavior.

Your repeated problem has been determining which things are:

```text
A. represented in the IR

B. compiled correctly into the IR

C. actually executed by the runtime

D. actually supported by each projection

E. actually used by Capsule-Pro instead of bypassed with handwritten code
```

Those five things are completely different.

For every capability in this file, the right audit question is therefore:

> **Show me the full production path from Manifest source syntax to compiler output to IR field to runtime/projection consumer to the exact Capsule-Pro code using that output, plus a test proving it works.**

Anything less can falsely label an interface definition as a completed feature.

Confidence: 98% — this explanation is grounded directly in the uploaded IR type definitions; only actual implementation coverage requires tracing the rest of the Manifest repository.


# === COGNILAYER (auto-generated, do not delete) ===

## CogniLayer v4 Active
Persistent memory + code intelligence is ON.
ON FIRST USER MESSAGE in this session, briefly tell the user:
  'CogniLayer v4 active — persistent memory is on. Type /cognihelp for available commands.'
Say it ONCE, keep it short, then continue with their request.

## Tools — HOW TO WORK

FIRST RUN ON A PROJECT:
When DNA shows "[new session]" or "[first session]":
1. Run /onboard — indexes project docs (PRD, README), builds initial memory
2. Run code_index() — builds AST index for code intelligence
Both are one-time. After that, updates are incremental.
If file_search or code_search return empty → these haven't been run yet.

UNDERSTAND FIRST (before making changes):
- memory_search(query) → what do we know? Past bugs, decisions, gotchas
- code_context(symbol) → how does the code work? Callers, callees, dependencies
- file_search(query) → search project docs (PRD, README) without reading full files
- code_search(query) → find where a function/class is defined
Use BOTH memory + code tools for complete picture. They are fast — call in parallel.

BEFORE RISKY CHANGES (mandatory):
- Renaming, deleting, or moving a function/class → code_impact(symbol) FIRST
- Changing a function's signature or return value → code_impact(symbol) FIRST
- Modifying shared utilities used across multiple files → code_impact(symbol) FIRST
- ALSO: memory_search(symbol) → check for related decisions or known gotchas
Both required. Structure tells you what breaks, memory tells you WHY it was built that way.

AFTER COMPLETING WORK:
- memory_write(content) → save important discoveries immediately
  (error_fix, gotcha, pattern, api_contract, procedure, decision)
- session_bridge(action="save", content="Progress: ...; Open: ...")
DO NOT wait for /harvest — session may crash.

SUBAGENT MEMORY PROTOCOL:
When spawning Agent tool for research or exploration:
- Include in prompt: synthesize findings into consolidated memory_write(content, type, tags="subagent,<task-topic>") facts
  Assign a descriptive topic tag per subagent (e.g. tags="subagent,auth-review", tags="subagent,perf-analysis")
- Do NOT write each discovery separately — group related findings into cohesive facts
- Write to memory as the LAST step before return, not incrementally — saves turns and tokens
- Each fact must be self-contained with specific details (file paths, values, code snippets)
- When findings relate to specific files, include domain and source_file for better search and staleness detection
- End each fact with 'Search: keyword1, keyword2' — keywords INSIDE the fact survive context compaction
- Record significant negative findings too (e.g. 'no rate limiting exists in src/api/' — prevents repeat searches)
- Return: actionable summary (file paths, function names, specific values) + what was saved + keywords for memory_search
- If MCP tools unavailable or fail → include key findings directly in return text as fallback
- Launch subagents as foreground (default) for reliable MCP access — user can Ctrl+B to background later
Why: without this protocol, subagent returns dump all text into parent context (40K+ tokens).
With protocol, findings go to DB and parent gets ~500 token summary + on-demand memory_search.

BEFORE DEPLOY/PUSH:
- verify_identity(action_type="...") → mandatory safety gate
- If BLOCKED → STOP and ask the user
- If VERIFIED → READ the target server to the user and request confirmation

## VERIFY-BEFORE-ACT
When memory_search returns a fact marked ⚠ STALE:
1. Read the source file and verify the fact still holds
2. If changed → update via memory_write
3. NEVER act on STALE facts without verification

## Process Management (Windows)
- NEVER use `taskkill //F //IM node.exe` — kills ALL Node.js INCLUDING Claude Code CLI!
- Use: `npx kill-port PORT` or find PID via `netstat -ano | findstr :PORT` then `taskkill //F //PID XXXX`

## Git Rules
- Commit often, small atomic changes. Format: "[type] what and why"
- commit = Tier 1 (do it yourself). push = Tier 3 (verify_identity).

## Project DNA: manifest
Stack: unknown
Style: [unknown]
Structure: governance, ir, reports, runtime, schema-partials, scripts, source
Deploy: [NOT SET]
Active: [new session]
Last: [first session]

# === END COGNILAYER ===
