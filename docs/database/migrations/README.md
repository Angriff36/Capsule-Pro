# Database Migrations

This directory contains documentation for all database migrations in the Convoy catering management system.

## Overview

Migrations are managed using **Prisma Migrate** and applied to a Neon PostgreSQL database. The project uses a multi-tenant architecture with schema-based isolation.

**Key Points:**
- Migration authority: Prisma Migrate (not manual SQL)
- All migrations are in `packages/database/prisma/migrations/`
- Each migration has a timestamp prefix: `YYYYMMDDHHMMSS_description/`
- Always use `pnpm migrate` to create new migrations (runs `db:check` first)
- Never edit existing migrations after deployment

## Migration Patterns

### Naming Convention

Migrations follow this pattern:
```
{timestamp}_{description}/migration.sql
```

- **timestamp**: `YYYYMMDDHHMMSS` format (UTC)
- **description**: snake_case description of changes
- Example: `20260129120000_add_foreign_keys/migration.sql`

### Creating Migrations

```bash
# Validate drift before changes
pnpm db:check

# Development (interactive)
pnpm migrate

# If drift exists, generate a safe repair migration
pnpm db:repair

# Production/shared deployment
pnpm db:deploy

# Check migration status
pnpm migrate:status

# Regenerate Prisma client after migrations
pnpm prisma:generate
```

### Rollback Strategy

**Prisma Migrate does NOT support automatic rollbacks.** To rollback:

1. **Create a new migration** that reverses the changes
2. **Test thoroughly** in development before deploying
3. **Document the rollback** in the migration description

**Emergency Rollback Process:**
1. Stop all application instances
2. Restore database from backup (pre-migration)
3. Verify data integrity
4. Restart applications

### Migration Best Practices

**DO:**
- Use `IF NOT EXISTS` for all CREATE statements
- Use `DO $$ blocks` for conditional constraint creation
- Include both tenant_id and id in composite foreign keys
- Add indexes on foreign key columns
- Use `gen_random_uuid()` for default UUID values
- Set appropriate ON DELETE behaviors:
  - **CASCADE**: Child records deleted with parent
  - **SET NULL**: Child records remain but lose reference
  - **RESTRICT**: Parent cannot be deleted if children exist

**DON'T:**
- Edit deployed migrations
- Use hardcoded UUIDs in migrations
- Create circular dependencies
- Skip adding RLS policies to tenant tables
- Forget to add indexes for foreign keys

### Schema Organization

The database uses multiple PostgreSQL schemas:

- **public**: Core enums and types
- **platform**: Platform-level tables (no tenant_id)
- **core**: Shared functions, types, and utilities
- **tenant**: Tenant-scoped tables (legacy, being migrated)
- **tenant_admin**: Admin and reporting tables
- **tenant_crm**: CRM operations (clients, leads, proposals)
- **tenant_events**: Events, battle boards, contracts
- **tenant_inventory**: Inventory management
- **tenant_kitchen**: Kitchen tasks, recipes, prep lists
- **tenant_staff**: Employee scheduling, time tracking, payroll

### Foreign Key Patterns

All tenant tables follow this pattern for foreign keys:

```sql
-- Composite foreign key (tenant_id + entity_id)
ALTER TABLE tenant_child_table
ADD CONSTRAINT fk_child_parent
FOREIGN KEY (tenant_id, parent_id)
REFERENCES tenant_parent_table(tenant_id, id)
ON DELETE CASCADE;

-- Always check if constraint exists first
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_child_parent'
        AND table_schema = 'tenant_schema'
    ) THEN
        -- Add constraint here
    END IF;
END $$;
```

### RLS Policy Pattern

All tenant tables must have Row Level Security:

```sql
-- Enable RLS
ALTER TABLE tenant_schema.table_name ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_schema.table_name FORCE ROW LEVEL SECURITY;

-- Select policy (soft delete aware)
CREATE POLICY "table_name_select" ON tenant_schema.table_name
    FOR SELECT USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    );

-- Insert policy
CREATE POLICY "table_name_insert" ON tenant_schema.table_name
    FOR INSERT WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "tenant_id" IS NOT NULL
    );

-- Update policy (soft delete aware)
CREATE POLICY "table_name_update" ON tenant_schema.table_name
    FOR UPDATE USING (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
        AND "deleted_at" IS NULL
    ) WITH CHECK (
        "tenant_id" = (auth.jwt() ->> 'tenant_id')::uuid
    );

-- Delete policy (prevent hard deletes)
CREATE POLICY "table_name_delete" ON tenant_schema.table_name
    FOR DELETE USING (false);

-- Service role bypass
CREATE POLICY "table_name_service" ON tenant_schema.table_name
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
```

### Trigger Patterns

Standard triggers for tenant tables:

```sql
-- Update timestamp trigger
CREATE TRIGGER "table_name_update_timestamp"
    BEFORE UPDATE ON tenant_schema.table_name
    FOR EACH ROW EXECUTE FUNCTION core.fn_update_timestamp();

-- Prevent tenant_id mutation
CREATE TRIGGER "table_name_prevent_tenant_mutation"
    BEFORE UPDATE ON tenant_schema.table_name
    FOR EACH ROW EXECUTE FUNCTION core.fn_prevent_tenant_mutation();
```

### Early Migrations (Foundation)Detailed documentation is available for the first 5 migrations that establish the database foundation:| # | Migration | Description | Date | Documentation ||---|-----------|-------------|------|---------------|| 1 | `0_init` | Initialize database schema | 2025-01-24 | **[0000_init.md](./0000_init.md)** - Complete schema setup || 2 | `20260101000000_enable_pgcrypto` | Enable pgcrypto extension | 2026-01-01 | **[0001_enable_pgcrypto.md](./0001_enable_pgcrypto.md)** - UUID generation || 3 | `20260123000001_employee_seniority` | Add employee seniority tracking | 2026-01-23 | **[0002_employee_seniority.md](./0002_employee_seniority.md)** - Rank progression || 4 | `20260124000000_labor_budget_tracking` | Add labor budget tracking | 2026-01-24 | **[0004_labor_budget_tracking.md](./0004_labor_budget_tracking.md)** - Budget & alerts || 5 | `20260124000001_seed_units_and_waste_reasons` | Seed units and waste reasons | 2026-01-24 | **[0003_seed_units_and_waste_reasons.md](./0003_seed_units_and_waste_reasons.md)** - Reference data |### All Migrations (16 total)| # | Migration | Description | Date | Schema Changes ||---|-----------|-------------|------|----------------|| 1 | `0_init` | Initialize database schema | 2025-01-24 | Creates all schemas, core functions, initial tables || 2 | `20260101000000_enable_pgcrypto` | Enable pgcrypto extension | 2026-01-01 | Enables gen_random_uuid() function || 3 | `20260123000001_employee_seniority` | Add employee seniority tracking | 2026-01-23 | tenant_staff: Adds employee_seniority table || 4 | `20260124000000_labor_budget_tracking` | Add labor budget tracking | 2026-01-24 | tenant_staff: Adds labor_budgets, budget_alerts tables || 5 | `20260124000001_seed_units_and_waste_reasons` | Seed units and waste reasons | 2026-01-24 | Adds initial data for units and waste reasons || 6 | `20260124120000_event_budget_tracking` | Add event budget tracking | 2026-01-24 | tenant_events: Adds event_budgets, budget_line_items; tenant_staff: Adds budget_alerts || 7 | `20260125000000_warehouse_shipment_tracking` | Add warehouse shipment tracking | 2026-01-25 | tenant_inventory: Adds shipments, shipment_items tables; public: Adds ShipmentStatus enum || 8 | `20260126145500_add_menu_models` | Add menu models | 2026-01-26 | tenant_kitchen: Adds menus, menu_dishes tables || 9 | `20260128000000_move_public_objects` | Move public objects to proper schemas | 2026-01-28 | Moves enums and tables from public to appropriate schemas || 10 | `20260129120000_add_foreign_keys` | Add foreign key constraints | 2026-01-29 | Adds 100+ foreign key constraints across all schemas || 11 | `20260129120001_fix_menus_id_type` | Fix menus ID type | 2026-01-29 | tenant_kitchen: Changes menus.id from TEXT to UUID || 12 | `20260129120002_add_event_reports` | Add event reports table | 2026-01-29 | tenant_events: Adds event_reports table with foreign key || 13 | `20260129120003_make_event_imports_event_id_nullable` | Make event_imports.event_id nullable | 2026-01-29 | tenant_events: Allows event_imports without events || 14 | `20260129120004_add_deleted_at_to_event_imports` | Add soft delete to event_imports | 2026-01-29 | tenant_events: Adds deleted_at column for soft deletes |**Complete Documentation Available:** All migrations now have detailed documentation files:

* [0000_init.md](./0000_init.md) - Schema initialization
* [0001_enable_pgcrypto.md](./0001_enable_pgcrypto.md) - UUID generation
* [0002_employee_seniority.md](./0002_employee_seniority.md) - Employee ranks
* [0003_seed_units_and_waste_reasons.md](./0003_seed_units_and_waste_reasons.md) - Reference data
* [0004_labor_budget_tracking.md](./0004_labor_budget_tracking.md) - Labor budgets
* [0005_add_menu_models.md](./0005_add_menu_models.md) - Menu management
* [0006_move_public_objects.md](./0006_move_public_objects.md) - Schema reorganization
* [0007_add_foreign_keys.md](./0007_add_foreign_keys.md) - 137 FK constraints
* [0008_fix_menus_id_type.md](./0008_fix_menus_id_type.md) - Type correction
* [0009_add_event_reports.md](./0009_add_event_reports.md) - Event reporting
* [0010_make_event_imports_event_id_nullable.md](./0010_make_event_imports_event_id_nullable.md) - Nullable FK
* [0011_add_deleted_at_to_event_imports.md](./0011_add_deleted_at_to_event_imports.md) - Soft deletes
* [0012_event_budget_tracking.md](./0012_event_budget_tracking.md) - Event budgets
* [0013_warehouse_shipment_tracking.md](./0013_warehouse_shipment_tracking.md) - Shipment tracking

## Verification Checklist

After running a migration, verify:

- [ ] Migration applied successfully (check `pnpm migrate:status`)
- [ ] `pnpm db:check` passes (no drift)
- [ ] Prisma client regenerated (`pnpm prisma:generate`)
- [ ] Application starts without errors
- [ ] Database queries work correctly
- [ ] RLS policies are active
- [ ] Indexes are created
- [ ] Foreign keys are enforced
- [ ] Triggers are firing

## Troubleshooting

### Migration Fails to Apply

1. **Check for conflicts:**
   ```bash
   pnpm migrate:status
   ```

2. **View failed migration details:**
   - Check migration.sql for syntax errors
   - Verify all dependencies exist

3. **Common issues:**
   - Missing schema: Create schema first
   - Conflicting constraints: Use `IF NOT EXISTS`
   - Circular dependencies: Split into multiple migrations

### Data Integrity Issues

If data is corrupted after migration:

1. Stop all applications
2. Assess the damage
3. Restore from backup if needed
4. Create fix migration
5. Test thoroughly
6. Deploy fix

### Performance Degradation

After migration, if performance is poor:

1. Check if indexes are missing
2. Analyze query plans with `EXPLAIN ANALYZE`
3. Add appropriate indexes
4. Update statistics: `ANALYZE table_name;`

## Additional Resources

- **Prisma Migration Guide**: https://www.prisma.io/docs/concepts/components/prisma-migrate
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Schema Contract**: `docs/legacy-contracts/schema-contract-v2.txt`
- **Schema Registry**: `docs/legacy-contracts/schema-registry-v2.txt`

## Template for New Migrations

Use the template in `../_templates/migration-doc-template.md` when documenting new migrations.
