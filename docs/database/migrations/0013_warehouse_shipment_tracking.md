# Migration 0013: Warehouse Shipment Tracking

## Migration Metadata

- **Migration ID**: `20260125000000_warehouse_shipment_tracking`
- **Created**: 2026-01-25
- **Author**: Database Team
- **Status**: Deployed

## Overview

Introduces warehouse shipment tracking functionality to monitor inventory deliveries from suppliers. Includes shipment status tracking, item-level details, and comprehensive receipt management.

**Business Context**: Catering operations receive regular inventory shipments. Tracking shipment status, contents, and delivery details is critical for inventory management and supplier relationships.

## Dependencies

**Requires:**
- `0_init`: Base schemas
- Previous inventory migrations (inventory_items, storage_locations, inventory_suppliers)

**Required by:**
- `20260129120000_add_foreign_keys`: Foreign key constraints

## Changes

### Enums Added

| Enum Name | Values | Purpose |
|-----------|--------|---------|
| ShipmentStatus (public) | draft, scheduled, preparing, in_transit, delivered, returned, cancelled | Shipment lifecycle states |

### Tables Added

| Table Name | Schema | Description |
|------------|--------|-------------|
| shipments | tenant_inventory | Shipment headers with status and tracking |
| shipment_items | tenant_inventory | Line items for shipment contents |

### Columns Added: shipments

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| tenant_id | UUID | NO | - | Tenant identifier (composite PK) |
| id | UUID | NO | gen_random_uuid() | Shipment identifier (composite PK) |
| shipment_number | TEXT | NO | - | Unique shipment number |
| status | ShipmentStatus | NO | 'draft' | Current shipment status |
| event_id | UUID | YES | - | Associated event (optional) |
| supplier_id | UUID | YES | - | Supplier reference (FK) |
| location_id | UUID | YES | - | Delivery location (FK) |
| scheduled_date | TIMESTAMPTZ(6) | YES | - | Scheduled shipment date |
| shipped_date | TIMESTAMPTZ(6) | YES | - | Actual ship date |
| estimated_delivery_date | TIMESTAMPTZ(6) | YES | - | Expected delivery |
| actual_delivery_date | TIMESTAMPTZ(6) | YES | - | Actual delivery date |
| total_items | INTEGER | NO | 0 | Total item count |
| shipping_cost | NUMERIC(12,2) | YES | - | Shipping charges |
| total_value | NUMERIC(12,2) | YES | - | Total shipment value |
| tracking_number | TEXT | YES | - | Carrier tracking number |
| carrier | TEXT | YES | - | Shipping carrier |
| shipping_method | TEXT | YES | - | Shipping method (ground, air, etc.) |
| delivered_by | UUID | YES | - | Employee who received delivery |
| received_by | TEXT | YES | - | Name of person who received |
| signature | TEXT | YES | - | Delivery signature (base64) |
| notes | TEXT | YES | - | Shipment notes |
| reference | TEXT | YES | - | Supplier reference number |
| created_at | TIMESTAMPTZ(6) | NO | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMPTZ(6) | NO | CURRENT_TIMESTAMP | Update timestamp |
| deleted_at | TIMESTAMPTZ(6) | YES | - | Soft delete timestamp |

### Columns Added: shipment_items

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| tenant_id | UUID | NO | - | Tenant identifier (composite PK) |
| id | UUID | NO | gen_random_uuid() | Shipment item identifier (composite PK) |
| shipment_id | UUID | NO | - | Reference to shipments (FK) |
| item_id | UUID | NO | - | Reference to inventory_items (FK) |
| quantity_shipped | NUMERIC(12,3) | NO | 0 | Quantity shipped |
| quantity_received | NUMERIC(12,3) | NO | 0 | Quantity actually received |
| quantity_damaged | NUMERIC(12,3) | NO | 0 | Damaged quantity |
| unit_id | SMALLINT | YES | - | Unit of measure |
| unit_cost | NUMERIC(10,4) | YES | - | Cost per unit |
| total_cost | NUMERIC(12,2) | NO | 0 | Total line item cost |
| condition | TEXT | YES | 'good' | Item condition |
| condition_notes | TEXT | YES | - | Condition details |
| lot_number | TEXT | YES | - | Lot/batch number |
| expiration_date | TIMESTAMPTZ(6) | YES | - | Expiration date |
| created_at | TIMESTAMPTZ(6) | NO | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMPTZ(6) | NO | CURRENT_TIMESTAMP | Update timestamp |
| deleted_at | TIMESTAMPTZ(6) | YES | - | Soft delete timestamp |

### Indexes Added

| Index Name | Table | Columns | Unique | Purpose |
|------------|-------|---------|--------|---------|
| shipments_shipment_number_key | shipments | shipment_number | YES | Unique shipment number |
| shipments_tenant_id_id_key | shipments | tenant_id, id | YES | Composite primary key |
| shipments_status_idx | shipments | tenant_id, status | NO | Filter by status |
| shipments_event_idx | shipments | tenant_id, event_id | NO | Event shipments |
| shipments_supplier_idx | shipments | tenant_id, supplier_id | NO | Supplier shipments |
| shipments_tracking_number_idx | shipments | tracking_number | NO | Carrier tracking |
| shipment_items_tenant_id_id_key | shipment_items | tenant_id, id | YES | Composite primary key |
| shipment_items_shipment_idx | shipment_items | tenant_id, shipment_id | NO | Items by shipment |
| shipment_items_item_idx | shipment_items | tenant_id, item_id | NO | Items by inventory item |
| shipment_items_lot_number_idx | shipment_items | tenant_id, lot_number | NO | Lot tracking |

### RLS Policies Added

**shipments**:
- `shipments_select`: Filter by tenant_id, exclude deleted
- `shipments_insert`: Require tenant_id match
- `shipments_update`: Tenant isolation + soft delete aware
- `shipments_delete`: Prevent hard deletes
- `shipments_service`: Service role bypass

**shipment_items**:
- `shipment_items_select`: Filter by tenant_id, exclude deleted
- `shipment_items_insert`: Require tenant_id match
- `shipment_items_update`: Tenant isolation + soft delete aware
- `shipment_items_delete`: Prevent hard deletes
- `shipment_items_service`: Service role bypass

### Triggers Added

| Trigger Name | Table | Event | Timing | Function | Purpose |
|--------------|-------|-------|--------|----------|---------|
| shipments_update_timestamp | shipments | UPDATE | BEFORE | core.fn_update_timestamp() | Auto-update updated_at |
| shipments_prevent_tenant_mutation | shipments | UPDATE | BEFORE | core.fn_prevent_tenant_mutation() | Prevent tenant_id changes |
| shipment_items_update_timestamp | shipment_items | UPDATE | BEFORE | core.fn_update_timestamp() | Auto-update updated_at |
| shipment_items_prevent_tenant_mutation | shipment_items | UPDATE | BEFORE | core.fn_prevent_tenant_mutation() | Prevent tenant_id changes |

### Replication Identity

- **shipments**: REPLICA IDENTITY FULL (for real-time)
- **shipment_items**: REPLICA IDENTITY FULL (for real-time)

## Rollback Plan

### Automated Rollback

```sql
-- Drop triggers
DROP TRIGGER IF EXISTS shipments_update_timestamp ON tenant_inventory.shipments;
DROP TRIGGER IF EXISTS shipments_prevent_tenant_mutation ON tenant_inventory.shipments;
DROP TRIGGER IF EXISTS shipment_items_update_timestamp ON tenant_inventory.shipment_items;
DROP TRIGGER IF EXISTS shipment_items_prevent_tenant_mutation ON tenant_inventory.shipment_items;

-- Drop RLS policies
DROP POLICY IF EXISTS shipments_select ON tenant_inventory.shipments;
DROP POLICY IF EXISTS shipments_insert ON tenant_inventory.shipments;
DROP POLICY IF EXISTS shipments_update ON tenant_inventory.shipments;
DROP POLICY IF EXISTS shipments_delete ON tenant_inventory.shipments;
DROP POLICY IF EXISTS shipments_service ON tenant_inventory.shipments;
DROP POLICY IF EXISTS shipment_items_select ON tenant_inventory.shipment_items;
DROP POLICY IF EXISTS shipment_items_insert ON tenant_inventory.shipment_items;
DROP POLICY IF EXISTS shipment_items_update ON tenant_inventory.shipment_items;
DROP POLICY IF EXISTS shipment_items_delete ON tenant_inventory.shipment_items;
DROP POLICY IF EXISTS shipment_items_service ON tenant_inventory.shipment_items;

-- Drop indexes
DROP INDEX IF EXISTS tenant_inventory.shipments_shipment_number_key;
DROP INDEX IF EXISTS tenant_inventory.shipments_tenant_id_id_key;
DROP INDEX IF EXISTS tenant_inventory.shipments_status_idx;
DROP INDEX IF EXISTS tenant_inventory.shipments_event_idx;
DROP INDEX IF EXISTS tenant_inventory.shipments_supplier_idx;
DROP INDEX IF EXISTS tenant_inventory.shipments_tracking_number_idx;
DROP INDEX IF EXISTS tenant_inventory.shipment_items_tenant_id_id_key;
DROP INDEX IF EXISTS tenant_inventory.shipment_items_shipment_idx;
DROP INDEX IF EXISTS tenant_inventory.shipment_items_item_idx;
DROP INDEX IF EXISTS tenant_inventory.shipment_items_lot_number_idx;

-- Drop tables
DROP TABLE IF EXISTS tenant_inventory.shipment_items CASCADE;
DROP TABLE IF EXISTS tenant_inventory.shipments CASCADE;

-- Drop enum
DROP TYPE IF EXISTS public.ShipmentStatus;
```

### Data Migration Impact

- **Rows affected**: 0 (new tables)
- **Data loss risk**: NONE (new tables only)
- **Rollback data needed**: NO

## Verification

### Post-Deployment Verification

```sql
-- Verify enum created
SELECT typname, typnamespace::regnamespace::text AS schema_name
FROM pg_type
WHERE typname = 'ShipmentStatus'
AND typnamespace = 'public'::regnamespace;

-- Verify enum values
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'public.ShipmentStatus'::regtype
ORDER BY enumsortorder;

-- Verify tables created
SELECT table_name, table_schema
FROM information_schema.tables
WHERE table_name IN ('shipments', 'shipment_items')
AND table_schema = 'tenant_inventory';

-- Verify indexes
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'tenant_inventory'
AND tablename IN ('shipments', 'shipment_items');

-- Verify RLS policies
SELECT tablename, policyname, permissive
FROM pg_policies
WHERE schemaname = 'tenant_inventory'
AND tablename IN ('shipments', 'shipment_items');

-- Test shipment status workflow
BEGIN;
    -- Create test shipment
    INSERT INTO tenant_inventory.shipments (
        tenant_id, id, shipment_number, status
    ) VALUES (
        'test-tenant'::uuid,
        gen_random_uuid(),
        'TEST-001',
        'draft'
    );

    -- Update status through workflow
    UPDATE tenant_inventory.shipments
    SET status = 'scheduled'
    WHERE shipment_number = 'TEST-001';

    UPDATE tenant_inventory.shipments
    SET status = 'in_transit'
    WHERE shipment_number = 'TEST-001';

    UPDATE tenant_inventory.shipments
    SET status = 'delivered'
    WHERE shipment_number = 'TEST-001';

    -- Verify final status
    SELECT status FROM tenant_inventory.shipments WHERE shipment_number = 'TEST-001';
    -- Expected: 'delivered'

ROLLBACK;
```

### Application Verification

- [ ] Application starts without errors
- [ ] Shipment creation works
- [ ] Status transitions function correctly
- [ ] Item tracking operates properly
- [ ] Receipt management functions
- [ ] Carrier tracking integration works

## Performance Impact

### Expected Impact

- **Query performance**: NO CHANGE (new tables, indexed)
- **Storage**: Minimal increase (new empty tables)
- **Index maintenance**: LOW overhead (10 indexes)

### Mitigation

None required for new tables.

## Security Considerations

- [x] RLS policies applied to all tables
- [x] Service role bypass defined
- [x] Tenant isolation enforced
- [x] Soft deletes enabled
- [x] Audit trail maintained
- [x] Unique shipment numbers prevent conflicts

## Breaking Changes

### API Changes

- [ ] NONE - New tables and enum only

### Data Access Changes

- [ ] NONE - New functionality only

### Migration Required

- [ ] NO - New tables only

## Notes

**Design Decisions**:
- **Shipment number**: Human-readable identifier (not UUID)
- **Status enum**: Enforces valid workflow states
- **Event linkage**: Optional, supports event-specific shipments
- **Lot tracking**: Supports food safety traceability
- **Condition tracking**: Records damaged/missing items
- **Signature capture**: Proof of delivery (base64 encoded)

**Shipment Status Workflow**:
1. **draft**: Initial creation
2. **scheduled**: Confirmed with supplier
3. **preparing**: Being packed by supplier
4. **in_transit**: Shipped, en route
5. **delivered**: Received and processed
6. **returned**: Returned to supplier
7. **cancelled**: Cancelled before shipment

**Item Condition Values** (application-defined):
- `good`: No issues
- `damaged`: Damaged in transit
- `missing`: Not received
- `wrong_item`: Incorrect item shipped
- `expired`: Past expiration date
- `short`: Less than ordered quantity

**Use Cases**:
1. **Regular deliveries**: Weekly inventory restocking
2. **Event-specific**: Direct-to-event shipments
3. **Emergency**: Rush orders for critical items
4. **Returns**: Sending items back to suppliers
5. **Transfers**: Moving between locations

## Related Issues

- Enables inventory receiving workflow
- Supports supplier performance tracking
- Integrates with event planning (direct shipments)

## References

- [PostgreSQL CREATE TYPE](https://www.postgresql.org/docs/current/sql-createtype.html)
- [PostgreSQL ENUM](https://www.postgresql.org/docs/current/datatype-enum.html)
- Schema Contract: `docs/legacy-contracts/schema-contract-v2.txt`
