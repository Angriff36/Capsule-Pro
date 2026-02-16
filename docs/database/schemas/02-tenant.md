# Tenant Schema

**Schema:** `tenant`

**First Documented:** 2025-01-29
**Last Updated:** 2025-01-29
**Last Verified By:** spec-executor (T006)

## Purpose

The `tenant` schema contains **cross-tenant shared entities** that don't belong to any specific module. These are foundational tables used across multiple domains (kitchen, events, staff, inventory, CRM) for shared concerns like locations, settings, documents, and real-time event publishing.

## Goals

1. **Shared Infrastructure**: Provide common entities (locations, settings) accessible to all modules
2. **Document Management**: Centralized storage for parsed PDF/CSV documents
3. **Real-time Events**: Outbox pattern for reliable event publishing to Ably
4. **Module Independence**: Shared resources without tight coupling to specific domains

## Tables

### `Location`

Physical locations where catering operations occur.

**Schema:** `tenant.locations`

**Columns:**
- `tenant_id` (Uuid, FK): Reference to `platform.accounts.id` ✅ **HAS FOREIGN KEY**
- `id` (Uuid, PK): Unique identifier
- `name` (String): Location name
- `address_line1` (String?, Optional): Street address
- `address_line2` (String?, Optional): Apartment/suite number
- `city` (String?, Optional): City name
- `state_province` (String?, Optional): State or province
- `postal_code` (String?, Optional): Postal/ZIP code
- `country_code` (Char(2)?, Optional): ISO 3166-1 alpha-2 country code
- `timezone` (String?, Optional): IANA timezone identifier (e.g., "America/New_York")
- `is_primary` (Boolean, Default: false): Whether this is the primary location
- `is_active` (Boolean, Default: true): Whether location is active
- `created_at` (Timestamptz, Auto): Record creation timestamp
- `updated_at` (Timestamptz, Auto): Last update timestamp
- `deleted_at` (Timestamptz?, Optional): Soft delete timestamp

**Primary Key:**
- Composite `(tenant_id, id)` - tenant-scoped uniqueness

**Foreign Keys:**
- ✅ `tenant_id → platform.accounts(id)` ON DELETE RESTRICT
  - **This is the ONLY table in the tenant schema with a proper FK to Account**

**Relations:**
- Has many `Event` (via `location_id` and `venue_id` - see [Known Issues](#known-issues))
- Has many `Shipment` (supply chain deliveries)

**Indexes:**
- Primary key `(tenant_id, id)` automatically indexed

**Business Rules:**
- Each tenant must have at least one location
- Only one location can have `is_primary: true` per tenant
- Soft deletes enabled (`deleted_at`)

**Usage Examples:**
- Event venues (kitchens, banquet halls, outdoor spaces)
- Kitchen facilities (main kitchen, prep kitchen, satellite kitchens)
- Corporate offices for B2B catering
- Client locations for off-premise catering

---

### `settings`

Key-value settings store for tenant configuration.

**Schema:** `tenant.settings`

**Columns:**
- `tenant_id` (Uuid): Reference to tenant account ❌ **MISSING FOREIGN KEY**
- `id` (Uuid, PK): Unique identifier
- `setting_key` (String): Setting name (e.g., "default_timezone", "currency")
- `setting_value` (Json): Setting value (can be string, number, boolean, object, array)
- `created_at` (Timestamptz, Auto): Record creation timestamp
- `updated_at` (Timestamptz, Auto): Last update timestamp

**Primary Key:**
- Composite `(tenant_id, id)` - tenant-scoped uniqueness

**Unique Constraint:**
- `(tenant_id, setting_key)` - One value per setting per tenant

**Indexes:**
- `settings_tenant_key_idx` on `(tenant_id, setting_key)`

**Foreign Keys:**
- ❌ **MISSING:** `tenant_id → platform.accounts(id)`
  - No referential integrity enforced at database level
  - Orphaned records possible if Account is deleted

**Business Rules:**
- Each setting key is unique per tenant
- Setting values are JSON for flexibility
- No schema validation on setting_value (application layer responsibility)

**Common Settings:**
```json
{
  "default_timezone": "America/New_York",
  "currency": "USD",
  "date_format": "MM/DD/YYYY",
  "time_format": "12h",
  "notification_email": "notifications@example.com",
  "inventory_low_threshold": 10,
  "features": {
    "advanced_analytics": true,
    "mobile_app": false
  }
}
```

---

### `documents`

Document storage for PDF/CSV parsing pipeline.

**Schema:** `tenant.documents`

**Columns:**
- `id` (Uuid, PK): Unique identifier
- `tenant_id` (Uuid): Reference to tenant account ❌ **MISSING FOREIGN KEY**
- `file_name` (String): Original filename
- `file_type` (String): MIME type (e.g., "application/pdf", "text/csv")
- `file_size` (Int?, Optional): File size in bytes
- `storage_path` (String?, Optional): Path to stored file
- `parsed_data` (Json?, Optional): Extracted data from parsing
- `parse_status` (String, Default: "pending"): Parse status (pending/parsing/complete/failed)
- `parse_error` (String?, Optional): Error message if parsing failed
- `parsed_at` (Timestamptz?, Optional): When parsing completed
- `event_id` (Uuid?, Optional): Related event ID
- `battle_board_id` (Uuid?, Optional): Related battle board ID
- `metadata` (Json, Default: "{}"): Additional metadata
- `created_at` (Timestamptz, Auto): Record creation timestamp
- `updated_at` (Timestamptz, Auto): Last update timestamp
- `deleted_at` (Timestamptz?, Optional): Soft delete timestamp

**Primary Key:**
- `id` - Unique identifier

**Unique Constraint:**
- `(tenant_id, id)` - tenant-scoped uniqueness

**Foreign Keys:**
- ❌ **MISSING:** `tenant_id → platform.accounts(id)`
  - No referential integrity enforced at database level
  - Orphaned records possible if Account is deleted

**Business Rules:**
- Documents are uploaded via event import flow
- Parsed data stored as JSON for flexibility
- Support for TPP PDFs and CSV exports from external systems
- Soft deletes enabled (`deleted_at`)

**Parse Status Flow:**
1. `pending` - Document uploaded, awaiting parsing
2. `parsing` - Parser actively processing document
3. `complete` - Successfully parsed, data available in `parsed_data`
4. `failed` - Parsing failed, error in `parse_error`

**Usage:**
- Event contract PDFs (TPP format)
- Guest list CSVs
- Menu imports
- Battle board templates
- Historical data imports from legacy systems

---

### `OutboxEvent`

Outbox pattern for reliable real-time event publishing to Ably.

**Schema:** `tenant.OutboxEvent`

**Columns:**
- `id` (String/Cuid, PK): Unique identifier
- `tenantId` (String): Reference to tenant account ❌ **MISSING FOREIGN KEY** ⚠️ **CAMELCASE INCONSISTENCY**
- `eventType` (String): Event type (e.g., "kitchen_task.claimed", "event.created")
- `payload` (Json): Event payload data
- `status` (OutboxStatus, Default: "pending"): Delivery status (pending/published/failed)
- `error` (String?, Optional): Error message if delivery failed
- `createdAt` (DateTime, Auto): Record creation timestamp
- `publishedAt` (DateTime?, Optional): When successfully published to Ably
- `aggregateId` (String): ID of the entity that triggered the event
- `aggregateType` (String): Type of entity (e.g., "KitchenTask", "Event")

**Primary Key:**
- `id` - CUID-based unique identifier

**Indexes:**
- `(status, createdAt)` - For polling pending events
- `(tenantId)` - For tenant-scoped queries
- `(aggregateType, aggregateId)` - For entity-based lookups

**Foreign Keys:**
- ❌ **MISSING:** `tenantId → platform.accounts(id)`
  - No referential integrity enforced at database level
  - Orphaned records possible if Account is deleted

**Naming Inconsistency:**
- ⚠️ **CAMELCASE:** `tenantId` (should be `tenant_id`)
- All other tenant tables use snake_case (`tenant_id`)
- This is the ONLY table using camelCase for tenant_id column
- Creates inconsistency in queries and application code

**Outbox Pattern Flow:**
1. **Write**: Application writes OutboxEvent record in same transaction as domain change
2. **Poll**: Background worker polls for `status: pending` events
3. **Publish**: Worker publishes event to Ably real-time service
4. **Update**: Worker updates `status: published` (or `failed` with error)
5. **Retry**: Failed events are retried with exponential backoff

**Benefits:**
- **Exactly-once delivery**: Transactional write guarantees no lost events
- **Ordering**: Events published in creation order
- **Resilience**: Failed events retried automatically
- **Debugging**: Full audit trail of all published events

**Common Event Types:**
- `kitchen_task.claimed` - Task claimed by staff member
- `kitchen_task.progress` - Task progress updated
- `event.created` - New event created
- `event.updated` - Event details modified
- `board.updated` - Battle board/command board changed

---

## Rules

### Foreign Key Consistency
- **Only `Location` has a proper FK to `platform.accounts`**
- `settings`, `documents`, and `OutboxEvent` are **missing FK constraints**
- All tables reference tenant_id conceptually, but only Location enforces it

### Row-Level Security (RLS)
- `settings` table has RLS enabled (Prisma comment indicates this)
- `documents` table has RLS enabled
- `Location` and `OutboxEvent` RLS status unclear (no Prisma comments)
- All tables should have tenant isolation at application layer

### Naming Conventions
- All tables use snake_case for columns **EXCEPT** `OutboxEvent.tenantId`
- `OutboxEvent` uses camelCase for `tenantId`, `createdAt`, `publishedAt` (inconsistent)
- All other tenant tables use snake_case consistently

### Lifecycle
- `Location` and `documents` support soft deletes (`deleted_at`)
- `settings` and `OutboxEvent` do not soft delete
- `OutboxEvent` records cleaned up after successful publishing (retention policy TBD)

---

## Decisions

### Why are these tables in the `tenant` schema (not module schemas)?

**Problem:**
- These entities are shared across multiple modules
- Putting them in module schemas would create circular dependencies

**Solution:**
- Create a `tenant` schema for cross-cutting concerns
- Shared infrastructure without module coupling

**Rationale:**
| Table | Used By Modules | Reason for tenant schema |
|-------|-----------------|--------------------------|
| `Location` | events, staff, inventory, kitchen | Events happen at locations, staff work at locations, inventory stored at locations |
| `settings` | ALL modules | Tenant-wide configuration, not domain-specific |
| `documents` | events, kitchen, inventory | Event contracts, kitchen prep guides, inventory manifests uploaded here |
| `OutboxEvent` | ALL modules | Real-time events generated by all modules |

**Trade-offs:**
- ✅ Pro: Avoids circular dependencies between module schemas
- ✅ Pro: Clear separation of shared vs domain-specific entities
- ❌ Con: FK constraints to module tables awkward (location_id on Event references different schema)
- ❌ Con: Harder to know which tables belong to which module

---

## Relations

### Cross-Schema References

**From `tenant` schema to other schemas:**

| Tenant Table | References | Schema | FK Status |
|--------------|------------|--------|-----------|
| `Location.tenant_id` | `platform.accounts.id` | platform | ✅ **HAS FK** |
| `settings.tenant_id` | `platform.accounts.id` | platform | ❌ Missing FK |
| `documents.tenant_id` | `platform.accounts.id` | platform | ❌ Missing FK |
| `OutboxEvent.tenantId` | `platform.accounts.id` | platform | ❌ Missing FK |

**From other schemas to `tenant` schema:**

| Module Table | References | Schema |
|--------------|------------|--------|
| `Event.location_id` | `Location.id` | tenant_events → tenant |
| `Event.venue_id` | `Location.id` | tenant_events → tenant |
| `Shipment.location_id` | `Location.id` | tenant_inventory → tenant |

### Critical Insight

**`Location` is the reference pattern:**
- It's the ONLY table in `tenant` schema with a proper FK to `platform.accounts`
- Shows the correct pattern that `settings`, `documents`, and `OutboxEvent` should follow
- All other tenant tables across all schemas are missing FKs to Account

---

## Lifecycle

### Location
1. **Creation**: Tenant creates location during onboarding
2. **Usage**: Events, staff, inventory reference location
3. **Updates**: Address, timezone, active status changed as needed
4. **Deletion**: Soft delete (`deleted_at`) if no longer used
5. **Retention**: Locations kept indefinitely for historical records

### Settings
1. **Creation**: Default settings seeded on tenant creation
2. **Runtime**: Application reads/writes settings at runtime
3. **Updates**: Settings changed via admin UI or API
4. **Deletion**: Settings deleted only if tenant deleted

### Documents
1. **Upload**: User uploads PDF/CSV via import flow
2. **Parsing**: Background worker parses document
3. **Storage**: Parsed data stored in `parsed_data` JSON field
4. **Usage**: Application uses parsed data to create/update entities
5. **Cleanup**: Old documents soft deleted based on retention policy

### OutboxEvent
1. **Creation**: Application creates event in same transaction as domain change
2. **Polling**: Background worker polls `status: pending` events
3. **Publishing**: Worker publishes to Ably, updates `status: published`
4. **Retention**: Successfully published events deleted after N days (TBD)
5. **Dead Letter**: Failed events after max retries moved to dead letter queue (TBD)

---

## Performance

### Location Queries
- **Hot Path**: Event creation, staff scheduling
- **Index Coverage**: Primary key `(tenant_id, id)` covers most queries
- **Recommendation**: Add index on `(tenant_id, is_active)` for filtering active locations

### Settings Queries
- **Hot Path**: Application startup, feature flag checks
- **Index Coverage**: Composite index `(tenant_id, setting_key)` covers lookups
- **Caching**: Settings should be cached in memory (rarely change)

### Documents Queries
- **Hot Path**: Event import flow, document management UI
- **Index Coverage**: No indexes beyond PK/unique constraints
- **Recommendation**: Add index on `(tenant_id, parse_status)` for polling pending parses

### OutboxEvent Queries
- **Hot Path**: Background worker polling (every few seconds)
- **Index Coverage**: Composite index `(status, createdAt)` optimized for polling
- **Recommendation**: Partition by `tenant_id` or `created_at` for large volumes

---

## Known Issues

### 1. Missing Foreign Keys (3 tables)

**Issue:**
- `settings.tenant_id` has no FK to `platform.accounts(id)`
- `documents.tenant_id` has no FK to `platform.accounts(id)`
- `OutboxEvent.tenantId` has no FK to `platform.accounts(id)`

**Impact:**
- No referential integrity at database level
- Orphaned records possible if Account deleted
- Application must enforce tenant isolation (error-prone)

**Migration Required:**
```sql
-- Add FK to settings
ALTER TABLE tenant.settings
ADD CONSTRAINT settings_tenant_fkey
FOREIGN KEY (tenant_id) REFERENCES platform.accounts(id) ON DELETE CASCADE;

-- Add FK to documents
ALTER TABLE tenant.documents
ADD CONSTRAINT documents_tenant_fkey
FOREIGN KEY (tenant_id) REFERENCES platform.accounts(id) ON DELETE CASCADE;

-- Add FK to OutboxEvent (after fixing camelCase)
ALTER TABLE tenant."OutboxEvent"
ADD CONSTRAINT "OutboxEvent_tenant_fkey"
FOREIGN KEY ("tenantId") REFERENCES platform.accounts(id) ON DELETE CASCADE;
```

**Status:** 📝 **TODO** - Documented in [KNOWN_ISSUES.md](../KNOWN_ISSUES.md)

---

### 2. OutboxEvent Naming Inconsistency

**Issue:**
- `OutboxEvent.tenantId` uses camelCase (should be `tenant_id`)
- All other tables use snake_case (`tenant_id`)
- Creates inconsistency in queries and application code

**Impact:**
- Developer confusion when writing queries
- Application code needs special handling
- Auto-generated SQL inconsistent with rest of schema

**Migration Required:**
```sql
-- Rename column to snake_case
ALTER TABLE tenant."OutboxEvent"
RENAME COLUMN "tenantId" TO "tenant_id";

-- Recreate index with snake_case name
DROP INDEX IF EXISTS tenant."OutboxEvent_tenantId_idx";
CREATE INDEX "OutboxEvent_tenant_id_idx" ON tenant."OutboxEvent"("tenant_id");
```

**Status:** 📝 **TODO** - Documented in [KNOWN_ISSUES.md](../KNOWN_ISSUES.md)

---

### 3. Location Referenced by Two Columns on Event

**Issue:**
- `Event` table has both `location_id` and `venue_id`
- Both reference `Location.id`
- Confusing semantic difference (if any)

**Impact:**
- Developer confusion: which column to use?
- Potential data inconsistency
- Unclear business logic

**Status:** 📝 **TODO** - Documented in tenant_events schema documentation

---

## TODOs

### High Priority (Migrations Required)

- [ ] **T019** Add FK to `OutboxEvent.tenantId` → `platform.accounts(id)`
- [ ] **T019** Rename `OutboxEvent.tenantId` to `tenant_id` (snake_case)
- [ ] **T020** Add FK to `settings.tenant_id` → `platform.accounts(id)`
- [ ] **T021** Add FK to `documents.tenant_id` → `platform.accounts(id)`
- [ ] Investigate and resolve `Event.location_id` vs `Event.venue_id` confusion

### Medium Priority (Performance)

- [ ] Add index on `Location(tenant_id, is_active)` for filtering active locations
- [ ] Add index on `documents(tenant_id, parse_status)` for polling pending parses
- [ ] Define retention policy for `OutboxEvent` (how long to keep published events)
- [ ] Implement dead letter queue for permanently failed `OutboxEvent` records

### Low Priority (Documentation & Cleanup)

- [ ] Clarify RLS status for `Location` and `OutboxEvent` (add Prisma comments if enabled)
- [ ] Document common `setting_key` values and their JSON schemas
- [ ] Create admin UI for managing documents (view, reparse, delete)
- [ ] Add metrics for outbox pattern (publish latency, failure rate, retry count)

---

## Related Documentation

- [Platform Schema](./00-platform.md) - `Account` table (referenced by all tenant tables)
- [Core Schema](./01-core.md) - Shared enums and types
- [Tenant Events Schema](./05-tenant_events.md) - `Event` table (references Location)
- [Tenant Inventory Schema](./06-tenant_inventory.md) - `Shipment` table (references Location)
- [Table Documentation: Location](../tables/tenant/Location.md) - Detailed Location table docs
- [Table Documentation: OutboxEvent](../tables/tenant/OutboxEvent.md) - Detailed OutboxEvent docs
- [Table Documentation: settings](../tables/tenant/settings.md) - Detailed settings docs
- [Table Documentation: documents](../tables/tenant/documents.md) - Detailed documents docs
- [KNOWN_ISSUES.md](../KNOWN_ISSUES.md) - All known data integrity issues
