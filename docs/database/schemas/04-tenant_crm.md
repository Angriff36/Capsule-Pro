# tenant_crm Schema

> **First documented**: 2025-01-29
> **Last updated**: 2025-01-29
> **Last verified by**: spec-executor
> **Verification status**: ✅ Documented from Prisma schema

---

## Purpose

The `tenant_crm` schema contains **customer relationship management** entities for tracking leads, clients, and the sales pipeline from prospect to paying customer.

**Scope**:
- Lead management (prospects in the sales funnel)
- Client records (converted leads and direct customers)
- Client contacts and preferences
- Interaction history (calls, emails, meetings)
- Proposal generation and tracking

**Responsibility**: Owns the customer lifecycle from first contact through proposal acceptance to event booking. Integrates with `tenant_events` for confirmed bookings.

## Goals

- **Lead-to-client pipeline**: Track prospects through the sales funnel with status progression
- **Client relationship management**: Maintain comprehensive customer records with contacts, preferences, and history
- **Proposal workflow**: Generate, send, and track proposals with line items and acceptance workflows
- **Activity tracking**: Log all client interactions for sales team visibility and follow-up reminders
- **Conversion analytics**: Measure lead conversion rates, sales velocity, and pipeline value

## Rules

**Invariant rules - MUST always be true**:

- ✅ **All tables have `tenantId`** - Tenant isolation is mandatory
- ✅ **Leads convert to clients, never the reverse** - One-way data flow (prospect → customer)
- ✅ **Proposal links to either client OR lead** - Never both (checked by application logic)
- ✅ **ClientInteraction requires clientId OR leadId** - One must be null, the other set
- ✅ **Soft deletes via `deletedAt`** - Records never removed from database
- ✅ **Proposal numbers are unique per tenant** - Format: PROP-YYYY-NNNN

**Lead conversion rules**:
- ✅ **`Lead.convertedToClientId` is immutable** - Once set, cannot be cleared
- ✅ **`Lead.convertedAt` timestamp is set** - Conversion time is recorded
- ✅ **Original Lead record preserved** - Never deleted after conversion
- ✅ **Proposals transfer to Client** - Lead proposals remain visible in client history

**Data integrity rules**:
- ✅ **ClientContact requires valid clientId** - FK ensures orphan prevention
- ✅ **ProposalLineItem requires valid proposalId** - Cascade delete on proposal removal
- ✅ **ClientPreference uniqueness** - One preference per type/key per client

## Decisions

### Decision: Proposal in Both tenant_crm and tenant_events

**Context**: Proposals are CRM artifacts (sales), but also link to Events (operations).

**Decision**: Place `Proposal` table in `tenant_crm` schema with nullable `eventId` foreign key.

**Why**:
- Proposals are sales tools first, operational documents second
- Sales team "owns" the proposal through acceptance workflow
- Event may not exist yet (proposals often precede event creation)
- Keeps sales pipeline logic within CRM schema

**Alternatives considered**:
- tenant_events.proposals: Rejected - sales team doesn't work in events schema
- Separate proposal schema: Rejected - over-engineering for 2 tables
- Duplicate proposal records: Rejected - synchronization nightmare

**Tradeoffs**:
- Event team must query CRM schema for proposal details
- Cross-schema FK (Proposal.eventId → Event.id) adds complexity
- Proposal lifecycle spans sales AND operations phases

### Decision: Lead and Client as Separate Tables

**Context**: Need distinct entities for prospects (Lead) vs customers (Client).

**Decision**: Two separate tables with conversion workflow.

**Why**:
- Different fields (Lead has status/pipeline, Client has billing/tax info)
- Different access patterns (sales queries leads, ops queries clients)
- Clear separation of concerns (prospecting vs account management)
- Preserves lead history after conversion

**Alternatives considered**:
- Single table with status field: Rejected - muddies data model, allows reversion
- View-based separation: Rejected - can't enforce different field sets
- Delete lead on conversion: Rejected - loses lead source/attribution data

**Tradeoffs**:
- Must maintain Lead.convertedToClientId reference
- Proposals must handle both leadId and clientId FKs
- Application code checks both tables for customer lookups

### Decision: ClientContact as Separate Table

**Context**: Clients (companies) have multiple contacts with different roles.

**Decision**: Normalize contacts into separate `ClientContact` table.

**Why**:
- One client has many contacts (sales, billing, event coordination)
- Contacts need individual fields (name, email, phone, title)
- Flags for primary contact and billing contact
- Allows contact history preservation

**Alternatives considered**:
- JSON array in Client: Rejected - can't query/index efficiently
- Single contact field: Rejected - doesn't match real-world use case
- Separate contact table without client FK: Rejected - orphan risk

**Tradeoffs**:
- Extra JOIN required for client contact list
- Must enforce "at least one contact" in application logic
- Primary contact flag requires validation (only one per client)

### Decision: ClientPreference with JSON Value

**Context**: Clients have diverse preferences (dietary, venues, scheduling) that don't fit fixed columns.

**Decision**: EAV pattern with `preferenceType`, `preferenceKey`, and JSON `preferenceValue`.

**Why**:
- Flexible - add preferences without schema changes
- Type-safe keys per preference type (e.g., "dietary:gluten_free")
- JSON value supports complex data (arrays, nested objects)
- Unique constraint prevents duplicate preferences

**Alternatives considered**:
- Fixed columns: Rejected - requires migration for each new preference
- JSONB column with all preferences: Rejected - can't index/query individual prefs
- Separate table per preference type: Rejected - too many tables

**Tradeoffs**:
- Can't enforce validation at DB level (application responsibility)
- Queries require filtering by type/key
- JSON value not searchable without GIN index (future optimization)

### Decision: ClientInteraction Nullable Polymorphism

**Context**: Interactions happen with leads AND clients, but never both simultaneously.

**Decision**: `ClientInteraction` has nullable `clientId` and `leadId` with CHECK constraint.

**Why**:
- Unified interaction timeline for sales team
- No need for separate LeadInteraction and ClientInteraction tables
- CHECK constraint ensures data integrity (one or the other)
- Simplifies "my interactions today" queries

**Alternatives considered**:
- Separate tables: Rejected - splits interaction timeline
- Single polymorphic FK: Rejected - PostgreSQL doesn't support
- JSON field for target: Rejected - loses referential integrity

**Tradeoffs**:
- Can't add FK constraint at DB level (nullable FKs not enforced)
- Application must ensure exactly one of clientId/leadId is set
- Queries must check both columns

## Anti-patterns

- ❌ **Converting Client back to Lead**
  - **Why bad**: Breaks sales pipeline model - customers can't become prospects
  - **Correct pattern**: Create new Lead for new opportunity, link to existing Client

- ❌ **Setting both clientId and leadId on Proposal**
  - **Why bad**: Ambiguous ownership - proposal belongs to sales OR ops, not both
  - **Correct pattern**: Use leadId for pre-sale proposals, clientId for post-sale

- ❌ **Hard-deleting converted Leads**
  - **Why bad**: Loses source attribution and conversion analytics
  - **Correct pattern**: Set `convertedToClientId`, preserve lead record forever

- ❌ **Storing preferences as fixed columns**
  - **Why bad**: Requires migration for each new preference type
  - **Correct pattern**: Use ClientPreference table with flexible JSON value

- ❌ **Skipping ClientContact for individual clients**
  - **Why bad**: Inconsistent data model - all clients need at least one contact
  - **Correct pattern**: Create ClientContact record even for individual clients

## Relations

### Internal Relations (within tenant_crm)

```
Client
  ├── ClientContact (N) - via client_id
  ├── ClientPreference (N) - via client_id
  ├── Proposal (N) - via client_id
  └── ClientInteraction (N) - via client_id

Lead
  ├── Proposal (N) - via lead_id
  └── ClientInteraction (N) - via lead_id

Proposal
  └── ProposalLineItem (N) - via proposal_id (cascade delete)
```

### Cross-Schema Relations

**tenant_crm → tenant_events**:
- `Proposal.eventId` → `tenant_events.Event.id` (nullable)
- Rationale: Proposals can exist before event creation

**tenant_events → tenant_crm**:
- `Event.clientId` → `Client.id` (nullable)
- Rationale: Events may not have client yet (lead stage)

**Referenced by tenant_crm**:
- `ClientInteraction.employeeId` → User/staff tables (future implementation)
- Rationale: Track which staff member had each interaction

### Relations Diagram

```
tenant_crm                    tenant_events
-----------                   ------------
Lead ──────┐
           │
           ├── Proposal ────────┐
           │                   │
Client ─────┘                   ├── Event
           │                   │
           ├── Proposal ────────┘
           │
           ├── ClientContact
           ├── ClientPreference
           └── ClientInteraction
```

## Lifecycle

### Lead Lifecycle

**Creation**:
1. Inquiry received (web form, phone, referral)
2. Lead created with:
   - `source`: "website", "referral", "cold_call", etc.
   - `status`: "new" (default)
   - `contactName`, `contactEmail`, `contactPhone`
   - `eventType`, `eventDate`, `estimatedGuests`, `estimatedValue`

**Status progression**:
- `new` → `contacted` → `qualified` → `proposal_sent` → `negotiation` → `won` / `lost`

**Won status** (conversion):
1. Set `Lead.status = "won"`
2. Create `Client` record from lead data
3. Set `Lead.convertedToClientId = new_client_id`
4. Set `Lead.convertedAt = now()`
5. Transfer proposals to client (update `Proposal.clientId`)

**Lost status**:
1. Set `Lead.status = "lost"`
2. Record reason in `Lead.notes`
3. DO NOT delete lead (retains analytics data)

### Client Lifecycle

**Creation**:
1. Via Lead conversion (see above) OR direct client creation
2. Client created with:
   - `clientType`: "company" or "individual"
   - Company name OR individual first_name/last_name
   - Contact info (email, phone, website)
   - Billing fields (defaultPaymentTerms, taxExempt, taxId)
   - `assignedTo`: sales/account manager user ID

**Updates**:
- Edit contact info, address, billing terms
- Add/remove ClientContact records
- Set ClientPreference records (dietary, venues, etc.)
- Log ClientInteraction records (calls, meetings)

**Deletion**:
- Soft delete only (set `deletedAt`)
- Never hard-delete (has historical data)

### Proposal Lifecycle

**Creation**:
1. Create `Proposal` with:
   - `proposalNumber`: Auto-generated (PROP-YYYY-NNNN)
   - `clientId` OR `leadId` (never both)
   - `eventId`: NULL initially (set when event created)
   - `title`, `eventDate`, `eventType`, `guestCount`
   - Venue info
   - Financials (subtotal, taxRate, discountAmount, total)
   - `status`: "draft"

2. Create `ProposalLineItem` records:
   - `item_type`: "food", "beverage", "rental", "labor", "fee"
   - `description`: Item name
   - `quantity`, `unitPrice`, `total`
   - `sortOrder`: Display order

**Status progression**:
- `draft` → `sent` → `viewed` → `accepted` / `rejected`

**Sent**:
1. Set `Proposal.status = "sent"`
2. Set `Proposal.sentAt = now()`
3. Generate PDF and email to client

**Viewed**:
1. Client opens proposal link
2. Set `Proposal.viewedAt = now()`

**Accepted**:
1. Client signs proposal (digital signature or acceptance)
2. Set `Proposal.status = "accepted"`
3. Set `Proposal.acceptedAt = now()`
4. Create `Event` record in tenant_events
5. Link `Proposal.eventId = Event.id`

**Rejected**:
1. Set `Proposal.status = "rejected"`
2. Set `Proposal.rejectedAt = now()`
3. Record reason in `Proposal.notes`

### ClientInteraction Lifecycle

**Creation**:
1. Interaction occurs (call, meeting, email)
2. Create `ClientInteraction` with:
   - `clientId` OR `leadId` (never both)
   - `employeeId`: User who performed interaction
   - `interactionType`: "call", "email", "meeting", "site_visit"
   - `interactionDate`: Timestamp (default now)
   - `subject`, `description`: Interaction details
   - `followUpDate`: Optional reminder
   - `followUpCompleted`: false (default)

**Follow-up completion**:
1. Task completed
2. Set `ClientInteraction.followUpCompleted = true`

## Performance

### Index Strategy

**Client**:
- **Primary key**: `(tenantId, id)` (composite, clustered)
- **Index needed**: `tenantId` for tenant-scoped queries
- **Future**: Add index on `clientType` for filtering

**Lead**:
- **Primary key**: `(tenantId, id)`
- **Index needed**: `tenantId` for tenant filtering
- **Future**: Add index on `status` for pipeline queries
- **Future**: Add composite index on `(tenantId, status, convertedAt)` for conversion analytics

**ClientContact**:
- **Primary key**: `(tenantId, id)`
- **Composite index needed**: `(tenantId, clientId)` for contact list queries

**ClientInteraction**:
- **Primary key**: `(tenantId, id)`
- **Index**: `employeeId` (for "my interactions" queries)
- **Future**: Add composite index on `(tenantId, clientId, interactionDate)` for timeline queries

**Proposal**:
- **Primary key**: `(tenantId, id)`
- **Unique constraint**: `(tenantId, proposalNumber)` for number lookups
- **Future**: Add composite index on `(tenantId, clientId, status)` for sales pipeline
- **Future**: Add composite index on `(tenantId, eventId)` for event-proposal lookups

**ProposalLineItem**:
- **Primary key**: `(tenantId, id)`
- **Foreign key**: `(proposalId, tenantId)` references `Proposal`

### Query Patterns

**Hot queries** (high frequency):
- `SELECT * FROM tenant_crm.clients WHERE tenant_id = $1 AND id = $2` - Client lookup
- `SELECT * FROM tenant_crm.leads WHERE tenant_id = $1 AND status = 'new'` - New leads list
- `SELECT * FROM tenant_crm.proposals WHERE tenant_id = $1 AND client_id = $2` - Client proposals
- `SELECT * FROM tenant_crm.client_interactions WHERE tenant_id = $1 AND client_id = $2 ORDER BY interaction_date DESC` - Client timeline

**Cold queries** (low frequency):
- `SELECT * FROM tenant_crm.leads WHERE tenant_id = $1 AND converted_at BETWEEN $2 AND $3` - Conversion analytics
- `SELECT * FROM tenant_crm.proposals WHERE tenant_id = $1 AND status = 'accepted' AND accepted_at > $2` - Won proposals report

**Optimization opportunities**:
- Add composite index on `Lead(tenantId, status, convertedAt)` for pipeline velocity queries
- Add composite index on `ClientInteraction(tenantId, clientId, interactionDate)` for timeline queries
- Add index on `Proposal(clientId)` if event team frequently queries proposals by client
- Consider GIN index on `ClientPreference(preferenceValue)` for JSON queries (if needed)

### Data Volume

**Expected growth**:
- **Client**: ~500-2000 records per tenant (accumulates over years)
- **Lead**: ~2000-10000 records per tenant (includes lost leads)
- **ClientContact**: ~2-5 per client (~1000-10000 per tenant)
- **ClientPreference**: ~5-20 per client (~2500-40000 per tenant)
- **ClientInteraction**: ~10-50 per client/year (~5000-100000 per tenant)
- **Proposal**: ~1-3 per lead/client (~500-6000 per tenant)
- **ProposalLineItem**: ~10-30 per proposal (~5000-180000 per tenant)

**Retention policy**:
- **Client**: Retain forever (soft delete only)
- **Lead**: Retain forever (conversion analytics)
- **ClientContact**: Retain forever (history)
- **ClientPreference**: Retain forever (client knowledge)
- **ClientInteraction**: Retain forever (communication history)
- **Proposal**: Retain forever (legal/compliance)
- **ProposalLineItem**: Retain forever (proposal history)

**Purge strategy**:
- None - CRM data is retained indefinitely for business intelligence
- Consider archiving old ClientInteraction records to cold storage after 7 years

### TODOs: Performance

```markdown
- [ ] Add composite index on Lead(tenantId, status, convertedAt) for pipeline queries - due: 2025-02-28
- [ ] Add composite index on ClientContact(tenantId, clientId) for contact list queries - due: 2025-02-28
- [ ] Add composite index on ClientInteraction(tenantId, clientId, interactionDate) for timeline queries - due: 2025-02-28
- [ ] Add composite index on Proposal(tenantId, clientId, status) for sales pipeline queries - due: 2025-02-28
- [ ] Review query patterns after 6 months of production usage - planned: 2025-08-29
- [ ] Consider archiving ClientInteraction records older than 7 years - low priority
```

## TODOs

### High Priority

```markdown
- [ ] [P0] Add proposal number generation system - required for production - due: 2025-02-15
- [ ] [P0] Implement lead-to-client conversion workflow - required for sales pipeline - due: 2025-02-15
- [ ] [P1] Add validation for proposal client/lead exclusivity - data integrity - due: 2025-02-28
```

### Medium Priority

```markdown
- [ ] [P2] Add proposal PDF generation - sales automation - due: 2025-03-15
- [ ] [P2] Implement proposal acceptance workflow (digital signature) - sales automation - due: 2025-03-15
- [ ] [P2] Add lead source analytics - sales intelligence - due: 2025-03-30
- [ ] [P2] Create client-facing proposal portal - customer experience - due: 2025-04-15
```

### Low Priority

```markdown
- [ ] [P3] Add GIN index on ClientPreference(preferenceValue) for JSON queries - if needed
- [ ] [P3] Implement automated follow-up reminders from ClientInteraction - sales productivity
- [ ] [P3] Add lead scoring system - sales prioritization
- [ ] [P3] Create client interaction timeline UI - sales visibility
```

### Migration Required

```markdown
- [ ] **MIGRATION REQUIRED**: Add Venue table to tenant_crm
  - Current: No Venue table (referenced in Event but not in CRM)
  - Should be: tenant_crm.venues table for venue library
  - Impact: Can't reuse venue data across proposals/events
  - Migration: `20250215_add_venues_table`
  - Assigned: spec-executor

- [ ] **MIGRATION REQUIRED**: Add indexes for performance
  - Current: Missing composite indexes for hot queries
  - Should be: Add indexes on Lead, ClientContact, ClientInteraction, Proposal
  - Impact: Slow queries as data volume grows
  - Migration: `20250228_add_crm_indexes`
  - Assigned: spec-executor
```

## Tables

### Core Tables

| Table | Purpose | Documentation | Status |
|-------|---------|---------------|--------|
| [`Client`](../tables/tenant_crm/Client.md) | Customer records (company/individual) | ⚠️ needs documentation | - |
| [`Lead`](../tables/tenant_crm/Lead.md) | Prospects in sales funnel | ⚠️ needs documentation | - |

### Supporting Tables

| Table | Purpose | Documentation | Status |
|-------|---------|---------------|--------|
| [`ClientContact`](../tables/tenant_crm/ClientContact.md) | Client contact persons (multiple per client) | ⚠️ needs documentation | - |
| [`ClientPreference`](../tables/tenant_crm/ClientPreference.md) | Flexible client preferences (dietary, venues) | ⚠️ needs documentation | - |
| [`ClientInteraction`](../tables/tenant_crm/ClientInteraction.md) | Activity log (calls, emails, meetings) | ⚠️ needs documentation | - |

### Proposal Tables

| Table | Purpose | Documentation | Status |
|-------|---------|---------------|--------|
| [`Proposal`](../tables/tenant_crm/Proposal.md) | Sales proposals with financials | ⚠️ needs documentation | - |
| [`ProposalLineItem`](../tables/tenant_crm/ProposalLineItem.md) | Proposal line items (food, rental, labor) | ⚠️ needs documentation | - |

## See Also

- **Schema Overview**: [`../SCHEMAS.md`](../SCHEMAS.md)
- **Known Issues**: [`../KNOWN_ISSUES.md`](../KNOWN_ISSUES.md)
- **Prisma Schema**: [`../../../packages/database/prisma/schema.prisma`](../../../packages/database/prisma/schema.prisma)
- **Migration History**: [`../migrations/README.md`](../migrations/README.md)
- **Schema Contract**: [`../../legacy-contracts/schema-contract-v2.txt`](../../legacy-contracts/schema-contract-v2.txt)
- **tenant_events Schema**: [`./03-tenant_events.md`](./03-tenant_events.md) - Proposals link to Events
