# audit_log

> **First documented**: 2025-01-30
> **Last updated**: 2025-01-30
> **Last verified by**: spec-executor (T015)
> **Verification status**: ✅ Documented from schema

**Purpose**: Hot storage for recent audit trail of all data mutations

**Schema**: `platform`

---

## Business Context

The `audit_log` table stores real-time audit records of all INSERT, UPDATE, and DELETE operations across tenant-scoped tables. This is the active, hot storage layer for compliance, debugging, and security auditing.

**Key characteristics**:
- **Append-only**: Records are never updated or deleted (only added)
- **Hot storage**: Optimized for query performance on recent data
- **Partitioned**: Uses table partitioning by `created_at` for efficient data lifecycle management
- **Tenant-scoped**: Records include `tenant_id` for multi-tenancy
- **Platform-wide**: Tracks mutations across all tenant schemas (tenant_events, tenant_kitchen, tenant_staff, etc.)

**Retention policy**:
- **audit_log** (hot): 90 days
- **audit_archive** (cold): 7 years for compliance

## Columns

| Column | Type | Purpose | Notes |
|--------|------|---------|-------|
| `id` | UUID | Primary key | Auto-generated via `gen_random_uuid()` |
| `tenant_id` | UUID? | Tenant FK | Optional - NULL for platform-level operations |
| `table_schema` | TEXT | Target table schema | e.g., "tenant_events", "tenant_kitchen", "tenant_staff" |
| `table_name` | TEXT | Target table name | e.g., "Event", "KitchenTask", "Shift" |
| `record_id` | UUID | Affected record ID | ID of the row that was modified |
| `action` | ActionType | Operation performed | One of: `insert`, `update`, `delete` |
| `old_values` | JSON? | Previous state | NULL for insert operations |
| `new_values` | JSON? | New state | NULL for delete operations |
| `performed_by` | UUID? | User who performed action | NULL for system operations |
| `ip_address` | INET? | Client IP address | Optional - for security auditing |
| `user_agent` | TEXT? | Client user agent | Optional - for debugging |
| `created_at` | TIMESTAMPTZ(6) | Audit timestamp | When the action occurred (default: now) |

**ActionType enum values**:
- `insert`: New record created
- `update`: Existing record modified
- `delete`: Record deleted (soft or hard delete)

## Indexes

| Index | Columns | Rationale |
|-------|---------|-----------|
| `audit_log_table_record_idx` | `(table_name, record_id)` | Retrieve full audit trail for a specific record |
| `audit_log_tenant_created_idx` | `(tenant_id, created_at)` | Tenant-scoped time-series queries for compliance audits |
| Primary key | `(id, created_at)` | Composite PK for partitioning support |

**Partitioning**:
- **Partition key**: `created_at` (monthly partitions)
- **Partition type**: Range partitioning
- **Purpose**: Enables efficient dropping of old partitions and query performance on recent data

**Partition management**:
- New partitions created automatically via scheduled job
- Old partitions (> 90 days) moved to `audit_archive` then dropped
- Partition naming: `audit_log_2025_01`, `audit_log_2025_02`, etc.

## Foreign Keys

No explicit foreign keys defined (audit tables are append-only and may reference deleted records).

## Relationships

- **Many-to-One** with `Account` via `tenant_id` (optional)
- **Siblings** with `audit_archive` - same schema, different storage tier

## Usage Patterns

### Audit Log Creation

Audit records are typically created via database triggers:

```sql
-- Example trigger for tenant_events.events
CREATE OR REPLACE FUNCTION tenant_events.audit_events()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO platform.audit_log (
    tenant_id,
    table_schema,
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    performed_by
  ) VALUES (
    NEW.tenant_id,
    TG_TABLE_SCHEMA,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP::ActionType,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' THEN row_to_json(NEW) ELSE NULL END,
    current_setting('app.current_user_id', true)::UUID
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Query Patterns

**Recent audit trail for a record**:
```sql
SELECT *
FROM platform.audit_log
WHERE table_schema = 'tenant_events'
  AND table_name = 'Event'
  AND record_id = $1
ORDER BY created_at DESC;
```

**Tenant-specific audit activity**:
```sql
SELECT *
FROM platform.audit_log
WHERE tenant_id = $1
  AND created_at >= $2  -- e.g., now() - interval '30 days'
ORDER BY created_at DESC;
```

**Compliance audit (all tenants)**:
```sql
SELECT
  tenant_id,
  table_schema,
  table_name,
  action,
  COUNT(*) as operation_count
FROM platform.audit_log
WHERE created_at >= $1
GROUP BY tenant_id, table_schema, table_name, action
ORDER BY operation_count DESC;
```

**Security investigation**:
```sql
-- Find all actions by a specific user
SELECT *
FROM platform.audit_log
WHERE performed_by = $1
  AND created_at >= $2
ORDER BY created_at DESC;
```

## Data Volume

**Expected growth**:
- ~10,000 records/day per active tenant
- ~90 days retention = ~900,000 records per tenant
- Estimated: ~90 million records for 100 active tenants

**Storage optimization**:
- Monthly partitions enable efficient data lifecycle management
- Indexes optimized for time-series queries
- Consider compression for older partitions

## Performance

**Query characteristics**:
- **Fast queries**: < 100ms for indexed queries on recent data
- **Slow queries**: > 1s for full table scans or historical data
- **Use case**: Real-time audit dashboards, security monitoring, compliance reporting

**Optimization opportunities**:
- Partition pruning automatically filters to relevant partitions
- Time-series indexes optimize date range queries
- Consider connection pooling for high-volume audit writes

## Security

**Row-Level Security (RLS)**:
- ⚠️ **TODO**: Add RLS policies to ensure tenants only see their own `tenant_id` records
- Current: No RLS policies (security vulnerability)
- Should be: Policy filters by `tenant_id = current_tenant_id()`

**Access control**:
- Platform admins can query all audit records
- Tenant users can only query records where `tenant_id` matches their tenant
- System operations have `tenant_id = NULL` (platform-visible only)

**Audit-sensitive operations**:
- All mutations to tenant data must create audit_log entries
- DELETE operations are especially critical to audit
- Sensitive fields (passwords, tokens) should be redacted from `old_values`/`new_values`

## Compliance

**Regulatory requirements**:
- **SOX**: Audit trail for all financial data mutations
- **GDPR**: Right to access (users can see their data access logs)
- **HIPAA**: Access logging for protected health information
- **ISO 27001**: Audit trail for all data mutations

**Data residency**:
- Audit logs must respect tenant data residency requirements
- Consider partitioning by region for compliance
- Cross-border data transfer restrictions may apply

## Lifecycle Management

### Archival Process

1. **Scheduled job** identifies old audit_log records (e.g., > 90 days)
2. **Copy records** to audit_archive (INSERT SELECT)
3. **Verify** archive copy successful
4. **Delete from audit_log** (releases space in hot partition)
5. **Drop old partitions** after archive confirmed

### Partition Creation

New monthly partitions created automatically:

```sql
-- Create partition for next month
CREATE TABLE platform.audit_log_2025_02
PARTITION OF platform.audit_log
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

## Anti-patterns

- ❌ **Querying audit_log for historical data (> 90 days)**
  - **Why bad**: Old partitions may be dropped, data incomplete
  - **Correct pattern**: Query audit_archive for historical data

- ❌ **Updating audit_log records**
  - **Why bad**: Breaks audit trail integrity, violates compliance
  - **Correct pattern**: Never update audit_log, only insert corrections

- ❌ **Deleting from audit_log**
  - **Why bad**: Violates compliance requirements, loses audit trail
  - **Correct pattern**: Archive to audit_archive, then drop partitions

- ❌ **Hardcoding tenant_id in queries**
  - **Why bad**: Breaks multi-tenancy, leaks data across tenants
  - **Correct pattern**: Always filter by current user's tenant context

- ❌ **Storing sensitive data in old_values/new_values**
  - **Why bad**: Security risk, passwords/tokens should not be logged
  - **Correct pattern**: Redact sensitive fields before logging

## See Also

- **Schema docs**: [`../../schemas/00-platform.md`](../../schemas/00-platform.md)
- **Cold storage**: [`audit_archive.md`](./audit_archive.md)
- **Account model**: [`Account.md`](./Account.md)
- **Prisma schema**: [`../../../packages/database/prisma/schema.prisma`](../../../packages/database/prisma/schema.prisma)
- **Migration docs**: [`../../migrations/README.md`](../../migrations/README.md)

## TODOs

### High Priority

```markdown
- [ ] [P0] Add RLS policies to audit_log - security requirement - due: 2025-02-01
- [ ] [P0] Implement audit triggers for all tenant tables - completeness - due: 2025-02-15
- [ ] [P1] Implement automated partition creation job - ops automation - due: 2025-02-01
```

### Medium Priority

```markdown
- [ ] [P2] Implement automated archival job - ops automation - due: 2025-02-15
- [ ] [P2] Add redaction for sensitive fields in audit JSON - security
- [ ] [P2] Add monitoring for audit_log table size - ops visibility
```

### Low Priority

```markdown
- [ ] [P3] Add metrics for audit write latency - monitoring
- [ ] [P3] Consider compression for old partitions - storage optimization
- [ ] [P3] Implement audit log export feature for compliance - feature
```
