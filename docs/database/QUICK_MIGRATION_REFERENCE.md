# Quick Prisma Migration Reference

**TL;DR** - Common migration tasks and commands

---

## Check Status (Do This First)

```bash
# Check if local and database migrations match
pnpm migrate:status

# Check if Prisma schema matches database
pnpm db:check
```

**Expected**: ✅ "All migrations applied" + ✅ "No drift detected"

---

## Common Scenarios

### "I just started work"
```bash
pnpm db:check          # Any drift?
# If drift: pnpm db:repair && pnpm db:deploy
```

### "I modified the Prisma schema"
```bash
pnpm migrate           # Create migration + deploy
# OR: pnpm db:dev      # Interactive (for dev only)
```

### "I need to deploy pending migrations"
```bash
pnpm db:deploy         # Apply all unapplied migrations
pnpm migrate:status    # Verify all applied
```

### "Database has drift"
```bash
pnpm db:check          # Confirm drift exists
pnpm db:repair         # Generate safe migration
pnpm db:deploy         # Apply it
pnpm db:check          # Verify fixed
```

### "Migration history is messed up"
```bash
pnpm migrate:status    # See what's wrong
# Then follow Troubleshooting in MIGRATION_STATUS_PLAN.md
```

---

## All Database Commands

| Command | What it does |
|---------|------------|
| `pnpm migrate:status` | ✅ Check status (always safe) |
| `pnpm db:check` | ✅ Check drift (always safe) |
| `pnpm db:repair` | ✅ Generate repair (always safe) |
| `pnpm db:deploy` | 🚀 Apply pending migrations (MODIFIES DB) |
| `pnpm migrate` | 🚀 Full workflow: format + check + dev (MODIFIES DB) |
| `pnpm db:dev` | 🚀 Interactive migration (MODIFIES DB) |
| `pnpm db:push` | ❌ DISABLED (don't use) |

---

## Before Each Commit

```bash
# 1. Check migrations
pnpm migrate:status

# 2. Check drift
pnpm db:check

# 3. Add checklist entry (if you changed schema)
# Edit: packages/database/DATABASE_PRE_MIGRATION_CHECKLIST.md
```

---

## Before Each Deploy

```bash
# 1. Verify migration status
pnpm migrate:status      # Should say "All migrations applied"

# 2. Verify no drift
pnpm db:check            # Should say "No schema drift"

# 3. Check what you're deploying
pnpm --filter @repo/database exec prisma migrate status --verbose
```

---

## What Migrations Are

Located in: `packages/database/prisma/migrations/`

Each migration is a folder with:
- `migration.sql` - The SQL that gets applied
- `dev.sql` - (Generated automatically)

Example flow:
```
1. Modify packages/database/prisma/schema.prisma
2. Run pnpm db:dev
3. Migration folder created: 20260212000000_my_change/
4. You edit migration.sql if needed
5. Run pnpm db:deploy to apply to DB
```

---

## Key Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Desired state (edit this) |
| `prisma/migrations/` | Migration history (don't edit) |
| `DATABASE_PRE_MIGRATION_CHECKLIST.md` | Review log (update this) |
| `schema-registry-v2.txt` | Table docs (update before migration) |

---

## Current Issues

### 🔴 Migration Mismatch
- Local: `20260212031132_add_user_preferences_fks` (not applied)
- Database: Has orphaned `20260203213621_repair_drift`

**Fix**:
```bash
# Deploy pending
pnpm db:deploy

# Check status
pnpm migrate:status
```

---

## Help

- **Full Plan**: See `docs/database/MIGRATION_STATUS_PLAN.md`
- **Workflow**: See `docs/workflows/database.md`
- **Database Docs**: See `packages/database/README.md`
- **Known Issues**: See `packages/database/KNOWN_ISSUES.md`

---

## Golden Rules

✅ **DO**:
- Run `pnpm migrate:status` before and after migrations
- Run `pnpm db:check` daily during development
- Add checklist entry before committing
- Deploy unapplied migrations immediately

❌ **DON'T**:
- Use `pnpm db:push` (it's disabled for a reason)
- Edit migration files after deployment
- Commit Prisma schema changes without running `pnpm migrate`
- Skip the pre-migration checklist

---

Last updated: 2026-02-12
