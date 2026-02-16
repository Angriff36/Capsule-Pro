# Client Table

> **First documented**: 2026-01-30
> **Last updated**: 2026-01-30
> **Last verified by**: spec-executor (T026)
> **Verification status**: ✅ Verified

## Overview

The `Client` table stores customer and company information for catering operations. Clients represent established business relationships that have been converted from leads or created directly. Each client can be either a company (with multiple contacts) or an individual, and supports comprehensive contact information, billing preferences, tax settings, and tagging for categorization.

**Business Context**: Customer relationship management (CRM) and billing
**Scope**: Tenant-wide (not location-scoped)
**Key Use Cases**:
- Store client contact and billing information
- Track client source and assignment to sales reps
- Manage tax-exempt status and payment terms
- Support multiple contacts per client via ClientContact
- Store flexible preferences via ClientPreference
- Link to events, proposals, and contracts

**Lifecycle**: Lead → Converted to Client → Active → Inactive (soft delete)

## Schema Reference

```sql
-- PostgreSQL schema reference
CREATE TABLE tenant_crm.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Business columns
  client_type VARCHAR NOT NULL DEFAULT 'company',
  company_name VARCHAR,
  first_name VARCHAR,
  last_name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  website VARCHAR,
  address_line1 VARCHAR,
  address_line2 VARCHAR,
  city VARCHAR,
  state_province VARCHAR,
  postal_code VARCHAR,
  country_code CHAR(2),
  default_payment_terms SMALLINT DEFAULT 30,
  tax_exempt BOOLEAN DEFAULT false,
  tax_id VARCHAR,
  notes TEXT,
  tags TEXT[],
  source VARCHAR,
  assigned_to UUID,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  -- Foreign Keys
  CONSTRAINT fk_clients_tenant FOREIGN KEY (tenant_id)
    REFERENCES platform.accounts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_clients_assigned_to FOREIGN KEY (assigned_to)
    REFERENCES platform.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE UNIQUE INDEX clients_tenant_id_idx ON clients(tenant_id, id);
CREATE INDEX idx_clients_email ON clients(email) WHERE email IS NOT NULL;
CREATE INDEX idx_clients_tags ON clients USING GIN(tags);
CREATE INDEX idx_clients_assigned_to ON clients(assigned_to) WHERE assigned_to IS NOT NULL;

-- Prisma model reference
// File: packages/database/prisma/schema.prisma
// Model: Client (line ~493)
```

**Click-to-navigate**: Ctrl+click (Cmd+click on Mac) the Prisma schema path above to jump to the model definition.

## Columns

| Column | Type | Nullable | Default | Purpose | Notes |
|--------|------|----------|---------|---------|-------|
| `id` | UUID | No | gen_random_uuid() | Primary key | Auto-generated, composite unique index with tenantId |
| `tenantId` | UUID | No | - | Tenant FK | Required for multi-tenancy, references Account.id |
| `clientType` | String | No | "company" | Client type | "company" or "individual" |
| `company_name` | String | Yes | NULL | Company name | Required for company clients |
| `first_name` | String | Yes | NULL | Contact first name | Required for individual clients |
| `last_name` | String | Yes | NULL | Contact last name | Required for individual clients |
| `email` | String | Yes | NULL | Email address | Optional, must be unique if provided |
| `phone` | String | Yes | NULL | Phone number | Free-form text field |
| `website` | String | Yes | NULL | Website URL | Optional company/individual website |
| `addressLine1` | String | Yes | NULL | Street address line 1 | |
| `addressLine2` | String | Yes | NULL | Street address line 2 | Apartment, suite, etc. |
| `city` | String | Yes | NULL | City | |
| `stateProvince` | String | Yes | NULL | State or province | |
| `postalCode` | String | Yes | NULL | Postal/ZIP code | |
| `countryCode` | String | Yes | NULL | ISO 3166-1 alpha-2 | 2-letter country code (e.g., "US") |
| `defaultPaymentTerms` | Int | Yes | 30 | Payment terms in days | Net 30 by default |
| `taxExempt` | Boolean | No | false | Tax-exempt status | If true, no tax charged on invoices |
| `taxId` | String | Yes | NULL | Tax ID / VAT number | For tax-exempt organizations |
| `notes` | String | Yes | NULL | Internal notes | Free-form notes about client |
| `tags` | String[] | No | [] | Searchable tags | GIN indexed for efficient tag queries |
| `source` | String | Yes | NULL | Lead source | How client was acquired (referral, website, etc.) |
| `assignedTo` | UUID | Yes | NULL | Assigned user FK | References User.id (sales rep/account manager) |
| `createdAt` | Timestamptz | No | now() | Creation timestamp | Auto-managed |
| `updatedAt` | Timestamptz | No | now() | Last update | Auto-managed by Prisma @updatedAt |
| `deletedAt` | Timestamptz | Yes | NULL | Soft delete | Filter: `WHERE deleted_at IS NULL` |

### Column Details

#### `clientType`
- **Type**: String (VARCHAR)
- **Nullable**: No
- **Default**: "company"
- **Purpose**: Distinguish between company and individual clients
- **Valid Values**:
  - `company` - Business client with multiple contacts
  - `individual` - Person/client (may still have ClientContact records)
- **Usage**: Determines display logic, required fields

#### `company_name` / `first_name` / `last_name`
- **Type**: String (VARCHAR)
- **Nullable**: Yes
- **Purpose**: Client identification
- **Validation**:
  - Company clients: `company_name` required, `first_name`/`last_name` optional
  - Individual clients: At least one of `first_name` or `last_name` required
- **Display**: Used in client lists, event associations

#### `email`
- **Type**: String (VARCHAR)
- **Nullable**: Yes
- **Purpose**: Primary email contact
- **Uniqueness**: Must be unique within tenant (if provided)
- **Validation**: Checked at application layer
- **Usage**: Invoicing, communications

#### `defaultPaymentTerms`
- **Type**: SmallInt
- **Nullable**: Yes
- **Default**: 30
- **Purpose**: Net payment terms in days
- **Examples**: 30 (Net 30), 15 (Net 15), 0 (due on receipt)
- **Usage**: Invoice generation, payment tracking

#### `taxExempt` / `taxId`
- **Type**: Boolean / String
- **Purpose**: Tax exemption tracking
- **Business rule**: If `taxExempt = true`, `taxId` should be provided
- **Usage**: Invoice calculations, tax reporting

#### `tags`
- **Type**: String[] (TEXT[])
- **Nullable**: No
- **Default**: []
- **Purpose**: Searchable categorization
- **Index**: GIN index for efficient array queries
- **Examples**: `["vip", "repeat", "corporate", "wedding"]`
- **Usage**: Filtering, grouping clients

#### `source`
- **Type**: String (VARCHAR)
- **Nullable**: Yes
- **Purpose**: Lead source tracking
- **Examples**: "website", "referral", "trade-show", "cold-call"
- **Usage**: Marketing analytics, conversion tracking

#### `assignedTo`
- **Type**: UUID
- **Nullable**: Yes
- **Purpose**: Sales rep or account manager assignment
- **References**: User.id (platform schema)
- **On Delete**: SET NULL (assignment cleared if user deleted)
- **Usage**: Task filtering, ownership, commission tracking

## Relations

### Belongs To

- **References** [`platform.Account`](../../tables/platform/Account.md) via `tenantId`
  - **Required**: Yes
  - **On Delete**: RESTRICT (prevents orphaned clients)
  - **Composite Key**: `(tenantId, id)` ensures tenant isolation

- **References** [`platform.User`](../../tables/platform/User.md) via `assignedTo`
  - **Required**: No
  - **On Delete**: SET NULL (assignment cleared if user deleted)
  - **Purpose**: Sales rep/account manager assignment

### Has Many

- **Has many** [`ClientContact`](../tenant_crm/ClientContact.md) via `clientId`
  - **Cascade**: Application-managed
  - **Purpose**: Multiple contacts per client (primary, billing, etc.)

- **Has many** [`ClientPreference`](../tenant_crm/ClientPreference.md) via `clientId`
  - **Cascade**: Application-managed
  - **Purpose**: Flexible key-value preferences (dietary, venue, etc.)

- **Has many** [`ClientInteraction`](../tenant_crm/ClientInteraction.md) via `clientId`
  - **Cascade**: Application-managed
  - **Purpose**: Communication history, meeting notes

- **Has many** [`tenant_events.Event`](../tenant_events/Event.md) via `clientId`
  - **Relation Name**: "EventClient"
  - **Cascade**: Application-managed
  - **Purpose**: Events associated with this client

- **Has many** [`Proposal`](../tenant_crm/Proposal.md) via `clientId`
  - **Cascade**: Application-managed
  - **Purpose**: Proposals sent to this client

- **Has many** [`EventContract`](../tenant_events/EventContract.md) via `clientId`
  - **Cascade**: Application-managed
  - **Purpose**: Contracts associated with this client

### Click-to-Navigate

All table references above are clickable links. Ctrl+click (Cmd+click on Mac) to jump to related table documentation.

## Business Rules

### Client-to-Lead Conversion Pattern

Clients are typically created by converting a `Lead` record:

```typescript
// Conversion flow (pseudo-code)
await database.$transaction(async (tx) => {
  // 1. Create client from lead data
  const client = await tx.client.create({
    data: {
      tenantId: lead.tenantId,
      clientType: lead.companyName ? "company" : "individual",
      company_name: lead.companyName,
      first_name: lead.contactName.split(" ")[0],
      last_name: lead.contactName.split(" ").slice(1).join(" "),
      email: lead.contactEmail,
      phone: lead.contactPhone,
      source: lead.source,
      tags: ["converted-lead"],
    },
  });

  // 2. Update lead with conversion reference
  await tx.lead.update({
    where: { tenantId_id: { tenantId: lead.tenantId, id: lead.id } },
    data: {
      convertedToClientId: client.id,
      convertedAt: new Date(),
      status: "converted",
    },
  });

  // 3. Create initial interaction record
  await tx.clientInteraction.create({
    data: {
      tenantId: lead.tenantId,
      clientId: client.id,
      interactionType: "lead_conversion",
      subject: `Converted from lead: ${lead.companyName || lead.contactName}`,
      description: `Original lead value: ${lead.estimatedValue}`,
    },
  });
});
```

**Key points**:
- Lead retains `convertedToClientId` and `convertedAt` for audit trail
- Initial `ClientInteraction` created for history
- Lead status set to "converted" (not deleted)

### Email Uniqueness

- **Rule**: Email must be unique within tenant (if provided)
- **Enforcement**: Application layer (checked before create/update)
- **Violation**: If violated, duplicate clients with same email cause confusion

```typescript
// Email uniqueness check (from apps/app/app/(authenticated)/crm/clients/actions.ts)
if (input.email?.trim()) {
  const existingClient = await database.client.findFirst({
    where: {
      AND: [
        { tenantId },
        { email: input.email.trim() },
        { deletedAt: null },
        ...(id ? [{ id: { not: id } }] : []), // Exclude self on update
      ],
    },
  });

  invariant(!existingClient, "A client with this email already exists");
}
```

### Client Type Validation

- **Company clients**: Should provide `company_name`
- **Individual clients**: Should provide at least `first_name` or `last_name`
- **Enforcement**: Application layer (no database constraint)

### Data Integrity

- **Uniqueness**: Composite unique key on `(tenantId, id)` prevents cross-tenant ID collisions
- **Required fields**: `tenantId`, `clientType` cannot be null
- **Referential integrity**: FK to `Account` ensures valid tenant
- **Soft deletes**: Queries must filter `WHERE deleted_at IS NULL`

## Client Preferences JSON Structure

### Overview

The `ClientPreference` table stores flexible key-value pairs for client-specific settings. The `preferenceValue` column uses PostgreSQL JSONB to store various data types.

### PreferenceValue Type Definition

```typescript
// From apps/app/app/(authenticated)/crm/clients/[id]/components/client-detail-client.tsx
type PreferenceValue =
  | string        // Simple text values
  | number        // Numeric values (quantities, prices)
  | boolean       // Yes/no flags
  | null          // Explicitly unset values
  | Record<string, unknown>  // Nested objects
  | unknown[];    // Arrays
```

### Common Preference Patterns

#### Dietary Preferences

```json
{
  "preferenceType": "dietary",
  "preferenceKey": "restrictions",
  "preferenceValue": ["vegetarian", "nut-free", "gluten-free"],
  "notes": "Strict dietary requirements for all events"
}
```

#### Venue Requirements

```json
{
  "preferenceType": "venue",
  "preferenceKey": "accessibility",
  "preferenceValue": {
    "rampRequired": true,
    "accessibleRestrooms": true,
    "notes": "Wheelchair access needed"
  },
  "notes": "ADA compliance requirements"
}
```

#### Service Preferences

```json
{
  "preferenceType": "service",
  "preferenceKey": "staffing",
  "preferenceValue": {
    "serversPerGuest": 0.1,
    "bartendersRequired": true,
    "uniform": "black-tie"
  },
  "notes": "High-end service expectations"
}
```

#### Equipment Needs

```json
{
  "preferenceType": "equipment",
  "preferenceKey": "audioVisual",
  "preferenceValue": {
    "projector": true,
    "soundSystem": true,
    "microphones": 4,
    "wireless": true
  },
  "notes": "Corporate presentation requirements"
}
```

### Preference Types Convention

While the schema does not enforce `preferenceType` values, common patterns include:

| preferenceType | Usage | Example Keys |
|----------------|-------|--------------|
| `dietary` | Food restrictions, allergies | restrictions, allergies, servings |
| `venue` | Location requirements | accessibility, parking, setup |
| `service` | Staffing, service levels | staffing, uniform, timing |
| `equipment` | AV, furniture, rentals | audioVisual, furniture, linens |
| `billing` | Invoice preferences | format, frequency, contact |
| `communication` | Contact preferences | method, frequency, timezone |

### TODO: JSON Schema Validation

> **Migration TODO**: Add PostgreSQL JSON schema constraint for `preferenceValue`

```sql
-- Proposed migration (not yet implemented)
ALTER TABLE tenant_crm.client_preferences
ADD CONSTRAINT valid_preference_value CHECK (
  jsonb_typeof(preference_value) IN (
    'string', 'number', 'boolean', 'null', 'object', 'array'
  )
);
```

**Priority**: P2 (Medium)
**Benefit**: Ensures type safety at database level
**Status**: Application layer enforces types, database validation pending

## Type Fixing

### Type Audit Results

**No `any` types found** in CRM client-related code.

**Files reviewed**:
- `apps/app/app/(authenticated)/crm/clients/actions.ts` - All types properly imported from `@repo/database`
- `apps/app/app/(authenticated)/crm/clients/components/clients-client.tsx` - Client type defined inline, properly typed
- `apps/app/app/(authenticated)/crm/clients/[id]/components/client-detail-client.tsx` - PreferenceValue type properly defined
- `apps/app/app/(authenticated)/crm/clients/[id]/components/tabs/preferences-tab.tsx` - PreferenceValue type reused
- `packages/database/prisma/schema.prisma` - Client model properly typed
- `packages/database/index.ts` - Exports Client, ClientContact, ClientPreference

**Type safety verified**:
- `PreferenceValue` type union covers all JSONB value types
- Proper type imports from `@repo/database`
- No `any` types in client-related components or actions

### Schema Type Consistency

| Column | Prisma Type | PostgreSQL Type | Consistent |
|--------|-------------|-----------------|------------|
| `id` | String @db.Uuid | UUID | ✅ |
| `tenantId` | String @map("tenant_id") @db.Uuid | UUID | ✅ |
| `clientType` | String | VARCHAR | ✅ |
| `company_name` | String? | VARCHAR | ✅ |
| `first_name` | String? | VARCHAR | ✅ |
| `last_name` | String? | VARCHAR | ✅ |
| `email` | String? | VARCHAR | ✅ |
| `phone` | String? | VARCHAR | ✅ |
| `website` | String? | VARCHAR | ✅ |
| `addressLine1` | String? | VARCHAR | ✅ |
| `addressLine2` | String? | VARCHAR | ✅ |
| `city` | String? | VARCHAR | ✅ |
| `stateProvince` | String? | VARCHAR | ✅ |
| `postalCode` | String? | VARCHAR | ✅ |
| `countryCode` | String? @db.Char(2) | CHAR(2) | ✅ |
| `defaultPaymentTerms` | Int? @db.SmallInt | SMALLINT | ✅ |
| `taxExempt` | Boolean | BOOLEAN | ✅ |
| `taxId` | String? | VARCHAR | ✅ |
| `notes` | String? | TEXT | ✅ |
| `tags` | String[] | TEXT[] | ✅ |
| `source` | String? | VARCHAR | ✅ |
| `assignedTo` | String? @map("assigned_to") @db.Uuid | UUID | ✅ |
| `createdAt` | DateTime @map("created_at") @db.Timestamptz | TIMESTAMPTZ | ✅ |
| `updatedAt` | DateTime @updatedAt @map("updated_at") @db.Timestamptz | TIMESTAMPTZ | ✅ |
| `deletedAt` | DateTime? @map("deleted_at") @db.Timestamptz | TIMESTAMPTZ | ✅ |

All types consistent. No issues found.

## Queries

### Fetch All Clients with Filters

```typescript
// Prisma (from apps/app/app/(authenticated)/crm/clients/actions.ts)
await database.client.findMany({
  where: {
    AND: [
      { tenantId },
      { deletedAt: null },
      ...(filters?.search ? [{
        OR: [
          { company_name: { contains: searchLower, mode: "insensitive" } },
          { first_name: { contains: searchLower, mode: "insensitive" } },
          { last_name: { contains: searchLower, mode: "insensitive" } },
          { email: { contains: searchLower, mode: "insensitive" } },
        ],
      }] : []),
      ...(filters?.tags ? [{ tags: { hasSome: filters.tags } }] : []),
      ...(filters?.clientType ? [{ clientType: filters.clientType }] : []),
    ],
  },
  orderBy: { createdAt: "desc" },
  take: limit,
  skip: offset,
});

// SQL
SELECT * FROM tenant_crm.clients
WHERE tenant_id = $1
  AND deleted_at IS NULL
  AND ($2::text[] IS NULL OR tags && $2::text[])
  AND ($3::varchar IS NULL OR client_type = $3)
ORDER BY created_at DESC
LIMIT $4 OFFSET $5;
```

**Index used**: Composite unique index on `(tenant_id, id)`, GIN index on `tags`

### Fetch Client by ID with Related Data

```typescript
// Prisma (from actions.ts)
const client = await database.client.findFirst({
  where: {
    AND: [{ tenantId }, { id }, { deletedAt: null }],
  },
});

// Fetch related data separately
const contacts = await database.clientContact.findMany({
  where: {
    AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
  },
  orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
});

const preferences = await database.clientPreference.findMany({
  where: {
    AND: [{ tenantId }, { clientId: id }, { deletedAt: null }],
  },
  orderBy: [{ preferenceType: "asc" }, { preferenceKey: "asc" }],
});
```

**Index used**: Composite unique index on `(tenant_id, id)`

### Search by Email

```sql
-- Email uniqueness check
SELECT * FROM tenant_crm.clients
WHERE tenant_id = $1
  AND email = $2
  AND deleted_at IS NULL
LIMIT 1;
```

**Index used**: `idx_clients_email` (partial index on `email WHERE email IS NOT NULL`)

### Tag-Based Search

```sql
-- Prisma tag query (GIN indexed)
SELECT * FROM tenant_crm.clients
WHERE tenant_id = $1
  AND deleted_at IS NULL
  AND tags @> '["vip"]';  -- Contains tag
```

**Index used**: `idx_clients_tags` (GIN)

### Assignment Filtering

```sql
-- Clients assigned to specific user
SELECT * FROM tenant_crm.clients
WHERE tenant_id = $1
  AND assigned_to = $2
  AND deleted_at IS NULL
ORDER BY created_at DESC;
```

**Index used**: `idx_clients_assigned_to` (partial index on `assigned_to WHERE assigned_to IS NOT NULL`)

### Gotchas

- **Forgot tenant filter**: Cross-tenant data leakage risk - always include `tenant_id` in WHERE clause
- **Soft delete oversight**: Queries must include `deleted_at IS NULL` or risk returning deleted clients
- **Email uniqueness**: Application-layer enforcement only - database allows duplicates
- **Client type validation**: No database constraint enforcing company_name vs first_name/last_name logic
- **assignedTo nullable**: Must handle NULL in queries and UI (unassigned clients)

## Related Tables

- [`ClientContact`](ClientContact.md) - Multiple contacts per client (primary, billing)
- [`ClientPreference`](ClientPreference.md) - Flexible key-value preferences
- [`ClientInteraction`](ClientInteraction.md) - Communication history
- [`tenant_crm.Lead`](Lead.md) - Lead-to-client conversion pipeline
- [`tenant_events.Event`](../../tables/tenant_events/Event.md) - Events associated with client
- [`tenant_crm.Proposal`](Proposal.md) - Proposals sent to client
- [`tenant_events.EventContract`](../../tables/tenant_events/EventContract.md) - Contracts with client
- [`platform.Account`](../../tables/platform/Account.md) - Tenant reference (multi-tenancy)
- [`platform.User`](../../tables/platform/User.md) - Assigned user reference

## Related Code

- **Prisma Model**: [`packages/database/prisma/schema.prisma`](../../../../packages/database/prisma/schema.prisma#L493)
- **Business Logic**: `apps/app/app/(authenticated)/crm/clients/actions.ts`
- **Client List Component**: `apps/app/app/(authenticated)/crm/clients/components/clients-client.tsx`
- **Client Detail Component**: `apps/app/app/(authenticated)/crm/clients/[id]/components/client-detail-client.tsx`
- **Preferences Tab**: `apps/app/app/(authenticated)/crm/clients/[id]/components/tabs/preferences-tab.tsx`

## See Also

- **Schema Documentation**: [`../../schemas/08-tenant_crm.md`](../../schemas/08-tenant_crm.md)
- **Schema Overview**: [`../../SCHEMAS.md`](../../SCHEMAS.md)
- **Known Issues**: [`../../KNOWN_ISSUES.md`](../../KNOWN_ISSUES.md)
- **Migration History**: [`../migrations/README.md`](../migrations/README.md)
