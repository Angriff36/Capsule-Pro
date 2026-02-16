# Platform Schema

> **First documented**: 2025-01-29
> **Last updated**: 2025-01-29
> **Last verified by**: spec-executor
> **Verification status**: ⚠️ Needs verification

---

## Purpose

The `platform` schema contains **platform-level entities** that form the foundation of the multi-tenant system. These tables manage the SaaS platform itself, not tenant-specific business data.

**Scope**:
- Tenant account management (Account, Tenant)
- Cross-tenant audit trail (audit_log, audit_archive)
- Platform-wide email tracking (sent_emails)

**Responsibility**: Owns the multi-tenant infrastructure, providing the tenant registry that all tenant-scoped tables reference.

## Goals

- **Multi-tenant foundation**: Provide Account model as the single source of truth for tenant identity
- **Audit trail**: Track all data mutations across the entire platform for compliance and debugging
- **Email observability**: Track all sent emails for debugging and deliverability monitoring
- **Tenant lifecycle**: Manage tenant creation, tier upgrades, and deletion

## Rules

**Invariant rules - MUST always be true**:

- ✅ **Platform tables have NO `tenantId`** - They exist above the tenant isolation layer
- ✅ **Account.id is immutable** - Once assigned, never changes (referenced by 84+ tenant tables)
- ✅ **Account.slug is unique** - Human-readable identifier for subdomains/routing
- ✅ **Audit logs are append-only** - Records are never updated or deleted (only archived)
- ✅ **RLS policies on audit tables** - Restrict access based on tenant_id in the record

**Enforcement**:
- **Database level**: Unique constraints on Account.slug, NOT NULL on required fields
- **Application level**: Auth middleware ensures tenants can only see their own audit records
- **Migration level**: Audit log partitioning requires manual setup (see Prisma warnings)

## Decisions

### Decision: Partitioned Audit Logs

**Context**: Audit logs grow indefinitely and would become unqueryable in a single table.

**Decision**: Use PostgreSQL table partitioning by `created_at` (monthly partitions).

**Why**:
- Enables efficient pruning of old audit data
- Queries can use partition pruning for massive performance gains
- Allows archiving old partitions to cheaper storage

**Alternatives considered**:
- Single table with timestamps: Rejected - queries would slow down over time
- Application-level archiving: Rejected - adds complexity to app code
- Separate database: Rejected - operational overhead

**Tradeoffs**:
- Migrations require manual partition management
- Cannot use standard Prisma migration tooling for partition creation
- Must implement partition creation automation (cron job or migration hook)

### Decision: Separate Account and Tenant Tables

**Context**: Need both a rich tenant model (Account with subscription details) and a lightweight registry (Tenant).

**Decision**: Two tables - `Account` (full tenant data) and `Tenant` (lightweight registry).

**Why**:
- Account can evolve with subscription fields without breaking references
- Tenant provides minimal identifier for systems that don't need subscription details
- Separation of concerns: Account = business entity, Tenant = technical identifier

**Alternatives considered**:
- Single table: Rejected - would couple subscription logic to all tenant references
- No separate Tenant table: Rejected - some systems need lightweight tenant reference

**Tradeoffs**:
- Two sources of truth for tenant identity (must keep in sync)
- Application code must choose which table to reference
- Risk of divergence if Account.slug != Tenant.slug

### Decision: audit_archive vs Deletion

**Context**: Compliance requirements may require retaining audit logs forever, but storage costs grow indefinitely.

**Decision**: Move old audit records to `audit_archive` table (cold storage) instead of deletion.

**Why**:
- Preserves audit trail for compliance
- Allows cheaper storage for archive table (different tablespace)
- Archive table can have different indexes (or none) to save space

**Alternatives considered**:
- Delete old records: Rejected - breaks compliance requirements
- Keep everything in audit_log: Rejected - storage costs explode
- S3/Glacier archiving: Rejected - adds complexity to restore process

**Tradeoffs**:
- Must implement archiving job (cron or migration)
- Archived data not immediately queryable (must restore first)
- Doubles storage requirements during archiving window

### Decision: sent_emails in Platform Schema

**Context**: Need to track all sent emails for debugging and deliverability monitoring.

**Decision**: Place `sent_emails` in platform schema (not tenant schema).

**Why**:
- Emails are system-level events (transactional notifications, password resets)
- Platform-wide analytics (email deliverability across all tenants)
- Simplifies email aggregation for abuse detection

**Alternatives considered**:
- tenant.sent_emails: Rejected - would scatter email data across 100+ tables
- Separate email service database: Rejected - operational overhead

**Tradeoffs**:
- Platform schema grows faster (can mitigate with partitioning)
- Tenant-specific email queries require filtering by tenant_id

## Anti-patterns

- ❌ **Adding tenantId to platform tables**
  - **Why bad**: Breaks the entire schema architecture - platform tables exist ABOVE tenant isolation
  - **Correct pattern**: Platform tables have NO tenantId (except audit_log.sent_emails which use it for filtering)

- ❌ **Direct Account.id references in cross-tenant queries**
  - **Why bad**: Breaks tenant isolation - one tenant could query another's Account
  - **Correct pattern**: Use RLS policies to ensure queries filter by current user's tenant

- ❌ **Updating audit_log records**
  - **Why bad**: Breaks audit trail integrity - logs must be immutable
  - **Correct pattern**: Insert new record for corrections, never update existing

- ❌ **Hardcoding Account.id in application code**
  - **Why bad**: Breaks multi-tenancy - code would only work for one tenant
  - **Correct pattern**: Always resolve Account from auth context (Clerk, session, JWT)

## Relations

### Internal Relations

```
Account (platform)
  ├── audit_log (N) - via tenant_id (optional)
  ├── audit_archive (N) - via tenant_id (optional)
  └── sent_emails (N) - via tenant_id

Tenant (platform)
  (lightweight registry, no FKs to Account)
```

### Cross-Schema Relations

**Referenced by ALL tenant schemas**:
- Every tenant table has `tenantId` → `Account.id`

**Example relations**:
- [`tenant.Location.tenantId`](../tables/tenant/Location.md) → `Account.id`
- [`tenant_events.Event.tenantId`](../tables/tenant_events/Event.md) → `Account.id`
- [`tenant_kitchen.KitchenTask.tenantId`](../tables/tenant_kitchen/KitchenTask.md) → `Account.id`
- [`tenant_staff.User.tenantId`](../tables/tenant_staff/User.md) → `Account.id`

**Total references**: 84+ tenant tables reference Account.id

### Click-to-Navigate

All table references above are clickable links. Ctrl+click (Cmd+click on Mac) to jump to table documentation.

## Lifecycle

### Creation

**Account creation**:
1. User signs up via Clerk (auth platform)
2. Application creates Account record with:
   - `id`: UUID from auth user
   - `slug`: Generated from name (unique constraint)
   - `subscriptionTier`: "trial" (default)
   - `subscriptionStatus`: "active" (default)
3. Tenant record created in parallel (lightweight registry)
4. Initial Location created (required for operations)

**Defaults**:
- `defaultTimezone`: "UTC"
- `weekStart`: 1 (Monday)
- `maxLocations`: 1
- `maxEmployees`: 10

### Updates

**Mutable fields**:
- `name`: Can be updated (business name changes)
- `slug`: Can be updated (rare - affects routing)
- `subscriptionTier`: Can be upgraded/downgraded
- `subscriptionStatus`: Can be suspended/cancelled
- `maxLocations`, `maxEmployees`: Updated on tier change
- `metadata`: JSON field for flexible settings

**Immutable fields**:
- `id`: Never changes (primary key, referenced everywhere)
- `createdAt`: Set at creation, never updated

### Deletion

**Soft delete only**:
- `deletedAt` timestamp set when Account is "deleted"
- Actual data retained for compliance/audit
- All tenant tables' `deletedAt` also set (cascade in application layer)

**Hard delete policy**:
- Never hard-delete Accounts (referential integrity)
- After retention period, may anonymize data (GDPR)
- Audit logs preserved indefinitely in audit_archive

### Archival

**Audit log archival**:
1. Scheduled job identifies old audit_log records (e.g., > 90 days)
2. Copies records to audit_archive (append-only)
3. Deletes from audit_log (releases space in hot partition)
4. May drop old partitions after archive confirmed

**Restore process**:
- Copy records from audit_archive back to audit_log
- Rare operation (compliance investigations, audits)

## Performance

### Index Strategy

**Account table**:
- **Primary key**: `id` (UUID, clustered)
- **Unique index**: `slug` (for subdomain lookups)
- **No tenant_id**: Platform table doesn't need it

**audit_log**:
- **Composite index**: `(tenant_id, created_at)` - Tenant-scoped time queries
- **Composite index**: `(table_name, record_id)` - Reconstruct record history
- **Partitioning key**: `created_at` (monthly partitions)

**audit_archive**:
- **Composite index**: `(tenant_id, archived_at)` - Archive retrieval
- **Minimal indexes**: Cold storage, query speed not critical

**sent_emails**:
- **Index**: `tenant_id` - Tenant-specific email history
- **No time-based index**: Query pattern not yet established

### Query Patterns

**Hot queries**:
- `SELECT * FROM platform.accounts WHERE slug = $1` - Subdomain routing (every request)
- `SELECT * FROM platform.accounts WHERE id = $1` - Tenant resolution (auth middleware)
- `INSERT INTO platform.audit_log ...` - Every write operation (high frequency)

**Cold queries**:
- `SELECT * FROM platform.audit_log WHERE tenant_id = $1 AND created_at > $2` - Compliance audits
- `SELECT * FROM platform.sent_emails WHERE tenant_id = $1 AND sent_at > $2` - Email debugging

**Optimization opportunities**:
- Add GIN index on `audit_log(old_values, new_values)` for JSON queries
- Consider BRIN index on `audit_log(created_at)` for partition pruning
- Add composite index on `sent_emails(tenant_id, sent_at)` if email analytics added

### Data Volume

**Expected growth**:
- **Account**: 1 record per tenant, ~100-1000 tenants total
- **audit_log**: ~10,000 records/day per active tenant (multiplied by tenant count)
- **audit_archive**: Grows indefinitely (archived audit logs)
- **sent_emails**: ~100 records/day per active tenant

**Retention policy**:
- **Account**: Retain forever (soft delete only)
- **audit_log**: 90 days in hot storage, archive to cold storage
- **audit_archive**: 7 years (compliance), then anonymize
- **sent_emails**: 1 year (debugging), then delete

**Purge strategy**:
- **audit_log**: Automated archiving job drops old partitions
- **audit_archive**: Manual review before deletion (compliance)
- **sent_emails**: Cron job deletes records older than retention period

### TODOs: Performance

```markdown
- [ ] Add BRIN index on `audit_log(created_at)` for partition pruning - due: 2025-02-15
- [ ] Review audit_log partition size after 90 days - planned: 2025-04-29
- [ ] Consider adding GIN index on `audit_log(old_values, new_values)` for JSON queries - low priority
- [ ] Implement automated partition creation for audit_log - critical for production
- [ ] Add composite index on `sent_emails(tenant_id, sent_at)` if email analytics feature added
```

## TODOs

### High Priority

```markdown
- [ ] [P0] Implement automated audit_log partition creation - required for production - due: 2025-02-15
- [ ] [P0] Add RLS policies to audit_log and audit_archive - security requirement - due: 2025-02-01
- [ ] [P1] Document partitioning strategy in migration docs - ops handoff - due: 2025-02-01
```

### Medium Priority

```markdown
- [ ] [P2] Add migration to ensure Account.slug is unique across all schemas - data integrity
- [ ] [P2] Implement audit log archival job - operations automation
- [ ] [P2] Add monitoring for audit_log partition size - ops visibility
```

### Low Priority

```markdown
- [ ] [P3] Add GIN index on audit_log JSON columns for advanced queries
- [ ] [P3] Consider adding sent_emails status tracking (delivered, bounced, etc.)
- [ ] [P3] Document Account tier limits in a separate tier_limits table
```

### Migration Required

```markdown
- [ ] **MIGRATION REQUIRED**: Add RLS policies to audit_log
  - Current: No RLS policies (anyone can query all audit records)
  - Should be: RLS policy ensures tenants only see their own audit_log.tenant_id
  - Impact: Security vulnerability - tenant data leakage
  - Migration: `20250201_add_audit_log_rls`
  - Assigned: spec-executor

- [ ] **MIGRATION REQUIRED**: Add RLS policies to audit_archive
  - Current: No RLS policies (anyone can query all archived records)
  - Should be: RLS policy ensures tenants only see their own audit_archive.tenant_id
  - Impact: Security vulnerability - historical data leakage
  - Migration: `20250201_add_audit_archive_rls`
  - Assigned: spec-executor

- [ ] **MIGRATION REQUIRED**: Add RLS policies to sent_emails
  - Current: No RLS policies (anyone can query all sent emails)
  - Should be: RLS policy ensures tenants only see their own sent_emails.tenant_id
  - Impact: Security vulnerability - email data leakage
  - Migration: `20250201_add_sent_emails_rls`
  - Assigned: spec-executor
```

## Tables

### Core Tables

| Table | Purpose | Documentation | Status |
|-------|---------|---------------|--------|
| [`Account`](../tables/platform/Account.md) | Tenant account (subscription tier, limits) | ⚠️ needs documentation | - |
| [`Tenant`](../tables/platform/Tenant.md) | Lightweight tenant registry | ⚠️ needs documentation | - |

### Audit Tables

| Table | Purpose | Documentation | Status |
|-------|---------|---------------|--------|
| [`audit_log`](../tables/platform/audit_log.md) | Cross-tenant audit trail (partitioned) | ⚠️ needs documentation | - |
| [`audit_archive`](../tables/platform/audit_archive.md) | Cold storage for old audit logs | ⚠️ needs documentation | - |

### Observability Tables

| Table | Purpose | Documentation | Status |
|-------|---------|---------------|--------|
| [`sent_emails`](../tables/platform/sent_emails.md) | Email tracking for Resend integration | ⚠️ needs documentation | - |

## See Also

- **Schema Overview**: [`../SCHEMAS.md`](../SCHEMAS.md)
- **Known Issues**: [`../KNOWN_ISSUES.md`](../KNOWN_ISSUES.md)
- **Prisma Schema**: [`../../../packages/database/prisma/schema.prisma`](../../../packages/database/prisma/schema.prisma)
- **Migration History**: [`../migrations/README.md`](../migrations/README.md)
- **Account (Tenant) Model**: This is the central tenant model referenced by all 84+ tenant tables
