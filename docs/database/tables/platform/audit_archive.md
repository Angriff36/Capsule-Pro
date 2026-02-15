# audit_archive

> **First documented**: 2025-01-30
> **Last updated**: 2025-01-30
> **Last verified by**: spec-executor
> **Verification status**: ✅ Documented from schema

**Purpose**: Cold storage for historical audit logs

**Schema**: `platform`

---

## Business Context

The `audit_archive` table stores historical audit logs that have been moved from the hot `audit_log` table to reduce storage costs and improve query performance on active data. This is the long-term retention layer for compliance and audit trail purposes.

**Key characteristics**:
- **Append-only**: Records are never updated or deleted (only added)
- **Cold storage**: Optimized for storage cost, not query speed
- **Partitioned**: Uses table partitioning by `created_at` for efficient archival
- **Tenant-scoped**: Records include `tenant_id` for multi-tenancy

**Retention policy**:
- **audit_log** (hot): 90 days
- **audit_archive** (cold): 7 years for compliance, then anonymize

## Columns

| Column | Type | Purpose | Notes |
|--------|------|---------|-------|
| `id` | UUID | Primary key | Auto-generated via `gen_random_uuid()` |
| `tenant_id` | UUID? | Tenant FK | Optional - NULL for platform-level operations |
| `table_schema` | TEXT | Target table schema | e.g., "tenant_events", "tenant_kitchen" |
| `table_name` | TEXT | Target table name | e.g., "Event", "KitchenTask" |
| `record_id` | UUID | Affected record ID | ID of the row that was modified |
| `action` | ActionType | Operation performed | One of: insert, update, delete |
| `old_values` | JSON? | Previous state | NULL for insert operations |
| `new_values` | JSON? | New state | NULL for delete operations |
| `performed_by` | UUID? | User who performed action | NULL for system operations |
| `ip_address` | INET? | Client IP address | Optional - for security auditing |
| `user_agent` | TEXT? | Client user agent | Optional - for debugging |
| `created_at` | TIMESTAMPTZ(6) | Original audit log timestamp | When the original action occurred |
| `archived_at` | TIMESTAMPTZ(6) | Archive timestamp | When the record was moved to archive (default: now) |

## Indexes

| Index | Columns | Rationale |
|-------|---------|-----------|
| `audit_archive_tenant_idx` | `tenant_id` | Tenant-scoped archive retrieval for compliance audits |
| Primary key | `(id, created_at)` | Composite PK for partitioning support |

**Partitioning**:
- **Partition key**: `created_at` (monthly partitions)
- **Partition type**: Range partitioning
- **Purpose**: Enables efficient dropping of old partitions and storage optimization

## Foreign Keys

No explicit foreign keys defined (audit tables are append-only and may reference deleted records).

## Relationships

- **Many-to-One** with `Account` via `tenant_id` (optional)
- **Siblings** with `audit_log` - same schema, different storage tier

## Usage Patterns

### Archival Flow

1. **Scheduled job** identifies old audit_log records (e.g., > 90 days)
2. **Copy records** to audit_archive (INSERT SELECT)
3. **Delete from audit_log** (releases space in hot partition)
4. **Drop old partitions** after archive confirmed

### Restore Flow

For compliance investigations:

```sql
-- Restore archived records to audit_log temporarily
INSERT INTO platform.audit_log
SELECT * FROM platform.audit_archive
WHERE tenant_id = $1
  AND created_at >= $2
  AND created_at <= $3;
```

### Query Patterns

**Tenant-specific historical audit**:
```sql
SELECT *
FROM platform.audit_archive
WHERE tenant_id = $1
  AND created_at >= $2
ORDER BY created_at DESC;
```

**Record history reconstruction**:
```sql
SELECT *
FROM platform.audit_archive
WHERE table_schema = $1
  AND table_name = $2
  AND record_id = $3
ORDER BY created_at ASC;
```

## Data Volume

**Expected growth**:
- ~10,000 records/day per active tenant (from audit_log archival)
- Grows indefinitely (7-year retention policy)
- Estimated: ~25 million records/year per 100 active tenants

**Storage optimization**:
- Minimal indexes (cold storage)
- Consider different tablespace for cheaper storage
- Compress old partitions if supported

## Performance

**Query characteristics**:
- **Slow queries**: Expected (cold storage)
- **Typical latency**: 100-1000ms (vs 10-100ms for audit_log)
- **Use case**: Compliance audits, rare historical queries

**Optimization opportunities**:
- Add composite index on `(tenant_id, created_at)` if query performance critical
- Consider BRIN index instead of B-tree for time-series data
- Move to cheaper storage class (AWS S3 Glacier, GCS Coldline)

## Security

**Row-Level Security (RLS)**:
- ⚠️ **TODO**: Add RLS policies to ensure tenants only see their own `tenant_id` records
- Current: No RLS policies (security vulnerability)
- Should be: Policy filters by `tenant_id = current_tenant_id()`

**Access control**:
- Platform admins can query all audit records
- Tenant users can only query records where `tenant_id` matches their tenant
- System operations have `tenant_id = NULL` (platform-visible only)

## Compliance

**Regulatory requirements**:
- **SOX**: 7-year retention for financial audit trail
- **GDPR**: Right to be forgotten (anonymize after retention period)
- **HIPAA**: Access logging for protected health information
- **ISO 27001**: Audit trail for all data mutations

**Anonymization** (after retention period):
```sql
-- Anonymize old archived records
UPDATE platform.audit_archive
SET old_values = '{"anonymized": true}',
    new_values = '{"anonymized": true}',
    performed_by = NULL,
    ip_address = NULL,
    user_agent = NULL
WHERE archived_at < $1;  -- e.g., 7 years ago
```

## Anti-patterns

- ❌ **Querying audit_archive for recent data**
  - **Why bad**: Slow queries, defeats the purpose of hot/cold separation
  - **Correct pattern**: Query audit_log for recent data (< 90 days)

- ❌ **Updating archived records**
  - **Why bad**: Breaks audit trail integrity, archive must be immutable
  - **Correct pattern**: Never update archive, only insert corrections

- ❌ **Deleting from audit_archive**
  - **Why bad**: Violates compliance requirements, loses audit trail
  - **Correct pattern**: Anonymize after retention period, never delete

- ❌ **Hardcoding tenant_id in queries**
  - **Why bad**: Breaks multi-tenancy, leaks data across tenants
  - **Correct pattern**: Always filter by current user's tenant context

## See Also

- **Schema docs**: [`../../schemas/00-platform.md`](../../schemas/00-platform.md)
- **Hot storage**: [`audit_log.md`](./audit_log.md)
- **Account model**: [`Account.md`](./Account.md)
- **Prisma schema**: [`../../../packages/database/prisma/schema.prisma`](../../../packages/database/prisma/schema.prisma)
- **Migration docs**: [`../../migrations/README.md`](../../migrations/README.md)

## TODOs

### High Priority

```markdown
- [ ] [P0] Add RLS policies to audit_archive - security requirement - due: 2025-02-01
- [ ] [P1] Implement automated archival job - ops automation - due: 2025-02-15
- [ ] [P1] Document partitioning strategy - ops handoff - due: 2025-02-01
```

### Medium Priority

```markdown
- [ ] [P2] Add monitoring for archive table size - ops visibility
- [ ] [P2] Implement anonymization job for post-retention records - compliance
- [ ] [P2] Add composite index on (tenant_id, created_at) - query optimization
```

### Low Priority

```markdown
- [ ] [P3] Consider BRIN index instead of B-tree for created_at - storage optimization
- [ ] [P3] Move archive tablespace to cheaper storage - cost reduction
- [ ] [P3] Add metrics for archival job performance - monitoring
```
