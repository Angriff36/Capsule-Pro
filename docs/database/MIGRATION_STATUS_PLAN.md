# Prisma Migration Status Checking Plan

**Last Updated**: 2026-02-12
**Status**: Current migration state shows inconsistencies that need resolution
**Priority**: High - blocks development and deployment workflows

---

## Executive Summary

The Capsule-Pro database uses **Prisma Migrate** for schema management with a multi-schema PostgreSQL architecture on Neon. Current status shows:

- **34 migrations** in local `prisma/migrations/` directory
- **Migration mismatch detected**: Local state diverges from database state
- **Last common migration**: `20260212031131_repair_drift`
- **Unapplied local migration**: `20260212031132_add_user_preferences_fks`
- **Orphaned database migration**: `20260203213621_repair_drift` (exists in DB, not in local)

---

## Current Status

### Database State
```
Last applied migration:  20260212031131_repair_drift
DB-only migration:       20260203213621_repair_drift (orphaned)
```

### Local State
```
Latest local migration:  20260212031132_add_user_preferences_fks
Unapplied migration:     20260212031132_add_user_preferences_fks
```

### Issue
Migration divergence indicates:
1. A migration was applied to the database that doesn't exist locally
2. A local migration hasn't been deployed yet
3. Potential data inconsistency between schema and database state

---

## Migration Status Check Points

### 1. **Migration History Alignment**
Check if local migrations match database migration history:
```bash
pnpm migrate:status
```

**Expected Output**:
```
✓ All migrations applied
✓ Local and database are in sync
```

**Current Output**:
```
⚠️  Migration mismatch detected
- Unapplied: 20260212031132_add_user_preferences_fks
- Orphaned: 20260203213621_repair_drift
```

### 2. **Schema Drift Detection**
Check if database schema matches Prisma schema:
```bash
pnpm db:check
```

**Expected**: No drift detected
**Current**: May detect drift if schema.prisma is out of sync with database

### 3. **Migration Files Inventory**

**Location**: `packages/database/prisma/migrations/`
**Count**: 34 directories (one per migration)
**Pattern**: `{timestamp}_{description}/migration.sql`

**Recent Migrations**:
- `20260212031132_add_user_preferences_fks/` (unapplied) ← **NEEDS DEPLOYMENT**
- `20260212031131_repair_drift/` (applied)
- `20260211001758_repair_drift/`
- `20260211000000_add_user_preferences/`
- ... (and 29 more)

**Orphaned in Database**:
- `20260203213621_repair_drift` (NOT in local `prisma/migrations/`)

### 4. **Pre-Migration Checklist**
Check `DATABASE_PRE_MIGRATION_CHECKLIST.md` for documented migrations:
- **Purpose**: Ensures every SQL migration has been reviewed against Schema Contract
- **Last entry**: User preferences migrations (multiple entries)
- **Status**: Comprehensive (62 entries documented)

---

## Root Causes & Resolution Strategy

### Root Cause 1: Orphaned Database Migration
**Migration**: `20260203213621_repair_drift` exists in database but not locally

**Possible Causes**:
1. Migration was applied directly to database (e.g., via SQL script or Neon console)
2. Migration directory was deleted/reset and not re-synced
3. Git history was rebased/cleaned, removing migration from version control

**Resolution Options**:

#### Option A: Remove Orphaned Migration (Recommended if data is safe)
```bash
# 1. Connect to database and manually remove from _prisma_migrations table
# 2. Verify no business logic depends on orphaned migration
# 3. Re-run migrate:status to confirm removal
```

#### Option B: Create Local Mirror Migration
```bash
# 1. Query database for orphaned migration SQL
# 2. Create local migration with same name
# 3. Mark as applied without re-running
```

#### Option C: Full Database Reset (Destructive)
```bash
# Only viable for development/staging databases
pnpm --filter @repo/database exec prisma migrate reset --force
```

### Root Cause 2: Unapplied Local Migration
**Migration**: `20260212031132_add_user_preferences_fks` is local but not applied

**Possible Causes**:
1. Migration was created but not yet deployed to database
2. Deployment step was skipped in CI/CD pipeline
3. Developer hasn't run `pnpm db:deploy` since migration was created

**Resolution** (High Priority):
```bash
# 1. Review migration contents
cat packages/database/prisma/migrations/20260212031132_add_user_preferences_fks/migration.sql

# 2. Verify checklist entry exists
grep "20260212031132" packages/database/DATABASE_PRE_MIGRATION_CHECKLIST.md

# 3. Deploy migration
pnpm db:deploy

# 4. Verify deployment
pnpm migrate:status
```

---

## Complete Migration Status Workflow

### Step 1: Detect Current State
```bash
pnpm migrate:status
```

**Interpret Output**:
- ✅ Green: All migrations applied, no drift
- ⚠️  Yellow: Unapplied local migrations (need deploy)
- ❌ Red: Database/local mismatch (critical)

### Step 2: Check for Schema Drift
```bash
pnpm db:check
```

**If drift detected**:
```bash
# Generate safe repair migration (additive only)
pnpm db:repair

# Review repair migration
cat packages/database/prisma/migrations/<timestamp>_repair_drift/migration.sql

# Add checklist entry
echo "- [x] packages/database/prisma/migrations/<timestamp>_repair_drift/migration.sql — Repair migration details..." >> packages/database/DATABASE_PRE_MIGRATION_CHECKLIST.md

# Deploy
pnpm db:deploy
```

### Step 3: Verify Clean State
```bash
# Should show all migrations applied
pnpm migrate:status

# Should show no drift
pnpm db:check
```

### Step 4: Resolve Orphaned/Unapplied Migrations

#### For Unapplied Migrations:
```bash
# Deploy all pending migrations
pnpm db:deploy

# Verify
pnpm migrate:status
```

#### For Orphaned Migrations:
```bash
# Option 1: Remove from database (SQL)
# Connect to Neon console and run:
DELETE FROM _prisma_migrations
WHERE migration = '20260203213621_repair_drift';

# Option 2: Create empty local migration with same timestamp
# Then mark as applied in database
```

---

## Migration Commands Reference

| Command | Purpose | Scope | When to Use |
|---------|---------|-------|-----------|
| `pnpm migrate:status` | Check migration state | Local vs DB | Before dev, deploy, or troubleshooting |
| `pnpm db:check` | Detect schema drift | Prisma ↔ DB | Daily during dev, before commits |
| `pnpm db:repair` | Generate repair migration | Safe/additive | After drift detected |
| `pnpm db:deploy` | Apply all pending migrations | DB update | After migration created, before deploy |
| `pnpm migrate` | Full workflow | Schema creation | When modifying Prisma schema |
| `pnpm db:dev` | Interactive migration | Dev-only | Creating new migrations locally |

---

## Recommended Status Checking Strategy

### Daily Development
```bash
# Before starting work
pnpm db:check

# If drift detected
pnpm db:repair && pnpm db:deploy

# Verify clean state
pnpm migrate:status
```

### Before Committing
```bash
# Ensure all changes are deployed
pnpm migrate:status

# Ensure no drift
pnpm db:check

# Add checklist entry if needed
# Commit only after both pass
```

### Before Deployment
```bash
# Verify migration history
pnpm migrate:status

# Check for drift
pnpm db:check

# List pending migrations
pnpm --filter @repo/database exec prisma migrate status --verbose
```

### In CI/CD Pipeline
```bash
# Pre-build verification
pnpm prisma:check
pnpm db:check

# Pre-deploy verification
pnpm migrate:status

# Deployment
pnpm db:deploy
```

---

## Current Action Items

### Immediate (Critical)
- [ ] **Resolve orphaned migration** `20260203213621_repair_drift`
  - [ ] Determine why it exists in database
  - [ ] Decide: Keep (create local mirror) or Remove (delete from _prisma_migrations)
  - [ ] Document decision in KNOWN_ISSUES.md

- [ ] **Deploy pending migration** `20260212031132_add_user_preferences_fks`
  - [ ] Verify checklist entry exists
  - [ ] Run `pnpm db:deploy`
  - [ ] Confirm `pnpm migrate:status` shows all applied

### Short-term (This Week)
- [ ] Update CI/CD pipeline to check migration status before deploy
- [ ] Add pre-commit hook to warn about unapplied migrations
- [ ] Document migration troubleshooting in runbook

### Long-term (Best Practices)
- [ ] Implement automated migration status checks in GitHub Actions
- [ ] Create dashboard for monitoring migration health
- [ ] Establish migration review SLA (24h max for unapplied migrations)
- [ ] Document recovery procedures for each migration failure scenario

---

## Troubleshooting Guide

### Scenario 1: "Local and database are different"
```bash
# Root cause: Orphaned or unapplied migration
pnpm migrate:status

# If unapplied: Run deploy
pnpm db:deploy

# If orphaned: Contact DBA or resolve manually
```

### Scenario 2: "Database drift detected"
```bash
# Generate repair (safe, additive only)
pnpm db:repair

# Review and deploy
cat packages/database/prisma/migrations/*/migration.sql | tail -1
pnpm db:deploy

# Add checklist entry
```

### Scenario 3: "Migration failed mid-way"
```bash
# Status shows partial state
pnpm migrate:status

# Check for transactions that rolled back
# Either retry or create repair migration
pnpm db:repair
```

### Scenario 4: "Lost migration from git history"
```bash
# Migration is in database but not locally
# Two options:
# 1. Create empty local migration with same timestamp
# 2. Remove from database via SQL

# Safer: Create local migration
mkdir -p packages/database/prisma/migrations/TIMESTAMP_lost_migration
echo "" > packages/database/prisma/migrations/TIMESTAMP_lost_migration/migration.sql

# Then manually mark as applied
```

---

## Files & References

### Core Database Files
- **Schema**: `packages/database/prisma/schema.prisma`
- **Migrations**: `packages/database/prisma/migrations/`
- **Checklist**: `packages/database/DATABASE_PRE_MIGRATION_CHECKLIST.md`
- **Registry**: `packages/database/schema-registry-v2.txt`
- **Known Issues**: `packages/database/KNOWN_ISSUES.md`

### Documentation
- **Workflow**: `docs/workflows/database.md`
- **README**: `packages/database/README.md`
- **This Plan**: `docs/database/MIGRATION_STATUS_PLAN.md`

### Scripts
- **Drift Check**: `scripts/db-drift-check.mjs`
- **Drift Repair**: `scripts/db-drift-repair.mjs`

### Configuration
- **Root package.json**: Database scripts at `pnpm db:*` and `pnpm migrate:*`
- **Prisma config**: `packages/database/prisma/schema.prisma` with datasource
- **Neon database**: Check env var `DATABASE_URL`

---

## Next Steps

1. **Immediate**: Resolve orphaned database migration by end of day
2. **Short-term**: Deploy pending `add_user_preferences_fks` migration
3. **Long-term**: Implement automated migration status monitoring in CI/CD
4. **Documentation**: Add this plan to onboarding docs for new developers

---

## Summary

**Current State**: ⚠️ Migration mismatch
**Root Causes**:
1. Orphaned DB migration (20260203213621_repair_drift) not in local history
2. Unapplied local migration (20260212031132_add_user_preferences_fks)

**Resolution**:
- Remove orphaned migration from database OR create local mirror
- Deploy pending migration via `pnpm db:deploy`
- Verify with `pnpm migrate:status`

**Prevention**:
- Run `pnpm migrate:status` before starting work
- Run `pnpm db:deploy` immediately after creating migrations
- Add pre-commit hooks to warn about migration mismatches
