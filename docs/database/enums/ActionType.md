# ActionType

**Purpose**: Tracks the type of action performed on database records for audit trails

**Schema**: `core`
**PostgreSQL Name**: `action_type`
**Last Updated**: 2026-01-30

## Values

| Value | Description | Usage Context |
|-------|-------------|---------------|
| `insert` | A new record was created | Used when a row is added to a table |
| `update` | An existing record was modified | Used when any field in a row changes |
| `delete` | A record was deleted or soft-deleted | Used when a row is removed |

## Business Context

The `ActionType` enum is used primarily in audit logging and the outbox pattern to track what type of operation occurred on a record. This enables:

1. **Audit Trails**: Track all changes to critical data
2. **Event Sourcing**: Reconstruct state changes over time
3. **Real-time Events**: Notify subscribers of data changes
4. **Compliance**: Maintain audit logs for business requirements

## Usage

### In Models

Used in:
- `OutboxEvent.action` - Indicates what operation triggered the real-time event
- Audit trail tables (conceptual) - Track history of record changes

### Default Values

No defaults - set explicitly when creating audit records or outbox events.

## Validation

### Application-Level

- **Required Field**: All audit records must specify an action type
- **Valid Transitions**: Generally enforced by database constraints

### Database-Level

- **PostgreSQL Enum**: Only defined values allowed
- **NOT NULL Constraints**: Audit columns typically require action type

## Migration History

| Date | Migration | Change |
|------|-----------|--------|
| 2026-01-30 | Initial enum creation | Part of core schema setup |

## Future Changes

- [ ] Consider adding `upsert` value if needed for merge operations
- [ ] Consider adding `bulk_operation` for batch operations

## Related

- **OutboxEvent**: Uses ActionType to track changes
- **Admin Module**: Uses for audit logging
- **Real-time Pipeline**: Converts ActionType to Ably event types

## See Also

- [Prisma Schema](../../../packages/database/prisma/schema.prisma) - Line 2643
- [Outbox Pattern Documentation](../../docs/legacy-contracts/) - Outbox implementation
