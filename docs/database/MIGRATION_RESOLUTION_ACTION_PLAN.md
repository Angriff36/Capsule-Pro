# Migration Mismatch Resolution Action Plan

**Issue**: Local and database migration histories are out of sync
**Priority**: CRITICAL - Blocks development and deployment
**Date Identified**: 2026-02-12
**Estimated Resolution Time**: 30 minutes

---

## Problem Summary

```
Last common migration:          20260212031131_repair_drift
Unapplied local migration:      20260212031132_add_user_preferences_fks
Orphaned in database:           20260203213621_repair_drift
```

**Impact**:
- Developers cannot rely on migration status
- CI/CD deployment pipeline may fail
- Schema state is ambiguous (which is authoritative?)

---

## Root Cause Analysis

### 1. Orphaned Database Migration
**Migration**: `20260203213621_repair_drift` exists in database but not in `prisma/migrations/`

**How it got there** (likely):
- a. Auto-generated repair migration via `db:repair`
- b. Applied directly to database without committing locally
- c. Git cleanup/rebase removed it from version control
- d. Deployed to production without being tracked locally

**Why it's a problem**:
- Prisma can't reproduce the migration locally
- Re-running migrations from scratch would skip this change
- Database state no longer matches documented history

### 2. Unapplied Local Migration
**Migration**: `20260212031132_add_user_preferences_fks` exists locally but not applied

**How it got there** (likely):
- Migration was created (via `pnpm db:dev` or auto-repair)
- Committed to git
- But `pnpm db:deploy` was never run
- Or CI/CD deployment step was skipped

**Why it's a problem**:
- Database is out of sync with committed code
- Developers working locally have different schema than database
- Deployment would fail if this migration has unmet preconditions

---

## Resolution Strategy

### Phase 1: Investigate Orphaned Migration (5 min)

**Goal**: Understand why `20260203213621_repair_drift` exists in database

**Steps**:
```bash
# 1. Check what this repair migration did
# Query database for migration details
psql $DATABASE_URL -c "SELECT migration, installed_on FROM _prisma_migrations WHERE migration = '20260203213621_repair_drift';"

# 2. Search git history for this migration
git log --oneline --all | grep -i "20260203213621\|repair_drift"

# 3. Check if it's referenced in CLAUDE.md or comments
grep -r "20260203213621" docs/ packages/

# 4. Look at surrounding migrations
ls -lah packages/database/prisma/migrations/ | grep 202602
```

**Decision Tree**:
- ✅ **If migration was intentional repair**: Create local mirror (Phase 2a)
- ❌ **If migration was accidental**: Remove from database (Phase 2b)
- 🤔 **If unclear**: Consult with team lead

### Phase 2a: Create Local Mirror (if keeping orphaned migration)

**Goal**: Add local record of orphaned migration so Prisma knows about it

```bash
# 1. Create the migration directory with empty SQL
mkdir -p packages/database/prisma/migrations/20260203213621_repair_drift

# 2. Create empty migration.sql
touch packages/database/prisma/migrations/20260203213621_repair_drift/migration.sql

# 3. Verify Prisma recognizes it
pnpm migrate:status

# 4. Expected output now:
# "All migrations applied"
```

**Why this works**:
- Prisma sees the local migration exists
- Marks it as "already applied" (because it's in database)
- Next migrations can reference it
- Restores consistency

### Phase 2b: Remove Orphaned Migration (if it was accidental)

**Goal**: Delete from database and from schema tracking

**Option 1: Remove via SQL (Recommended)**
```bash
# 1. Connect to database and remove migration record
PGPASSWORD=$POSTGRES_PASSWORD psql \
  -h $POSTGRES_HOST \
  -U $POSTGRES_USER \
  -d $POSTGRES_DB \
  -c "DELETE FROM _prisma_migrations WHERE migration = '20260203213621_repair_drift';"

# 2. Verify removal
pnpm migrate:status

# 3. Expected: One fewer migration in database
```

**Option 2: Reset Database (ONLY for dev/staging)**
```bash
# WARNING: This deletes all data
# ONLY use for development or staging databases

pnpm --filter @repo/database exec prisma migrate reset --force
```

---

## Phase 3: Deploy Pending Migration (10 min)

**Goal**: Apply `20260212031132_add_user_preferences_fks` to database

**Steps**:
```bash
# 1. Verify migration exists locally
ls -la packages/database/prisma/migrations/20260212031132_add_user_preferences_fks/

# 2. Review migration contents
cat packages/database/prisma/migrations/20260212031132_add_user_preferences_fks/migration.sql

# 3. Verify checklist entry exists
grep "20260212031132" packages/database/DATABASE_PRE_MIGRATION_CHECKLIST.md

# 4. Deploy migration
pnpm db:deploy

# 5. Verify deployment succeeded
pnpm migrate:status
# Expected: "All migrations applied"
```

**If deployment fails**:
```bash
# 1. Check error message
pnpm migrate:status --verbose

# 2. Common errors and fixes:
# - Foreign key constraint: Ensure referenced tables exist
# - Unique constraint: Ensure no duplicate values in column
# - Column already exists: Check if already applied
# - Syntax error: Review migration.sql for typos

# 3. Rollback if necessary (data loss possible)
pnpm --filter @repo/database exec prisma migrate resolve --rolled-back 20260212031132_add_user_preferences_fks

# 4. Fix the migration
# Edit packages/database/prisma/migrations/20260212031132_add_user_preferences_fks/migration.sql

# 5. Try deploy again
pnpm db:deploy
```

---

## Phase 4: Verify Clean State (5 min)

**Goal**: Confirm all migrations are applied and no drift exists

```bash
# 1. Check migration status
pnpm migrate:status

# Expected output:
# "34 migrations found in prisma/migrations"
# "Your local migration history and the migrations table from your database are identical."

# 2. Check for schema drift
pnpm db:check

# Expected output:
# (exits cleanly with no output, or says "No drift detected")

# 3. Verify Prisma client is up to date
pnpm prisma:check

# Expected:
# Prisma client generates successfully
```

**If issues persist**:
```bash
# See Troubleshooting section below
```

---

## Complete Commands to Run (In Order)

```bash
# 1. Verify problem
pnpm migrate:status

# 2. Investigate orphaned migration
psql $DATABASE_URL -c "SELECT migration FROM _prisma_migrations WHERE migration = '20260203213621_repair_drift';"

# 3a. (If keeping) Create local mirror
mkdir -p packages/database/prisma/migrations/20260203213621_repair_drift
touch packages/database/prisma/migrations/20260203213621_repair_drift/migration.sql

# 3b. OR (If removing) Delete from database
# psql $DATABASE_URL -c "DELETE FROM _prisma_migrations WHERE migration = '20260203213621_repair_drift';"

# 4. Deploy pending migration
pnpm db:deploy

# 5. Verify all applied
pnpm migrate:status

# 6. Check for drift
pnpm db:check

# 7. Generate Prisma client
pnpm prisma:check
```

---

## Troubleshooting

### Issue: "Migration 20260212031132 failed"

**Symptoms**:
```
ERROR: Foreign key constraint violation on user_preferences table
```

**Fix**:
```bash
# 1. Check what foreign key it's trying to create
cat packages/database/prisma/migrations/20260212031132_add_user_preferences_fks/migration.sql | grep -i "foreign key"

# 2. Verify referenced tables exist and have correct columns
psql $DATABASE_URL -c "\dt tenant_staff.user_preferences"

# 3. Check if columns already have constraints
psql $DATABASE_URL -c "\d tenant_staff.user_preferences"

# 4. If already exists, edit migration to skip adding it
# Edit packages/database/prisma/migrations/20260212031132_add_user_preferences_fks/migration.sql
# Wrap ALTER in: "IF NOT EXISTS" or "DO $$ BEGIN IF ... THEN ... END IF; END $$;"

# 5. Retry
pnpm db:deploy
```

### Issue: "Cannot remove orphaned migration - it's in use"

**Symptoms**:
```
ERROR: Cannot delete from _prisma_migrations - migration is referenced
```

**Fix**:
```bash
# 1. Identify what depends on it
# (This shouldn't happen - migrations are independent)

# 2. Force removal if safe
psql $DATABASE_URL << EOF
BEGIN;
DELETE FROM _prisma_migrations WHERE migration = '20260203213621_repair_drift';
COMMIT;
EOF

# 3. Verify
pnpm migrate:status
```

### Issue: "Status still shows mismatch after fixes"

**Symptoms**:
```
The last common migration is: 20260212031131_repair_drift
The migration have not yet been applied: 20260212031132_add_user_preferences_fks
```

**Fix**:
```bash
# 1. Clear local cache
rm -rf node_modules/.pnpm
pnpm install

# 2. Regenerate Prisma client
pnpm prisma:check

# 3. Try again
pnpm migrate:status

# 4. If still failing, check database connection
echo $DATABASE_URL
# Verify URL is correct and database is accessible

# 5. Last resort: Reset and rebuild
pnpm --filter @repo/database exec prisma migrate reset --force
```

---

## Checklist for Completion

After following this plan, verify:

- [ ] **Phase 1**: Orphaned migration investigated and decision made
  - [ ] Keep it (Phase 2a) OR Remove it (Phase 2b)?
  - [ ] Decision documented in KNOWN_ISSUES.md

- [ ] **Phase 2**: Orphaned migration resolved
  - [ ] Local mirror created (Phase 2a) OR removed from database (Phase 2b)
  - [ ] `pnpm migrate:status` shows orphaned migration resolved

- [ ] **Phase 3**: Pending migration deployed
  - [ ] `pnpm db:deploy` completed successfully
  - [ ] No deployment errors in output
  - [ ] `pnpm migrate:status` shows all applied

- [ ] **Phase 4**: Clean state verified
  - [ ] `pnpm migrate:status` says "All migrations applied"
  - [ ] `pnpm db:check` detects no drift
  - [ ] `pnpm prisma:check` succeeds
  - [ ] Git status is clean (no unexpected changes)

- [ ] **Documentation**:
  - [ ] Updated KNOWN_ISSUES.md with what happened
  - [ ] Added note to this action plan explaining resolution
  - [ ] Committed changes to git

---

## Prevention for Future

Add to your workflow:

1. **After every schema change**:
   ```bash
   pnpm migrate:status  # Before committing
   ```

2. **After every merge**:
   ```bash
   pnpm db:deploy      # Deploy any pending migrations
   ```

3. **Before every deployment**:
   ```bash
   pnpm migrate:status  # Ensure all applied
   pnpm db:check        # Ensure no drift
   ```

---

## Escalation Path

If stuck:

1. **First**: Review MIGRATION_STATUS_PLAN.md (detailed reference)
2. **Second**: Check QUICK_MIGRATION_REFERENCE.md (common tasks)
3. **Third**: Review KNOWN_ISSUES.md in database package
4. **Fourth**: Contact database team / on-call engineer
5. **Last Resort**: Contact Prisma support or Neon support (if database issue)

---

## Documentation

| Document | Purpose |
|----------|---------|
| MIGRATION_STATUS_PLAN.md | Complete reference guide |
| QUICK_MIGRATION_REFERENCE.md | Quick commands and scenarios |
| MIGRATION_RESOLUTION_ACTION_PLAN.md | This document - specific to current issue |
| docs/workflows/database.md | Official database workflow |
| packages/database/README.md | Database architecture |

---

## Timeline

- **Immediately**: Run Phase 1 (investigate) - 5 min
- **Today**: Complete Phases 2-4 (resolve) - 20 min
- **Before Next Deployment**: Ensure checklist complete
- **This Week**: Add prevention measures to CI/CD

---

**Status**: Ready to execute
**Owner**: [Assign to responsible engineer]
**Started**: [Date]
**Completed**: [Date]
**Notes**: [Add any issues encountered]
