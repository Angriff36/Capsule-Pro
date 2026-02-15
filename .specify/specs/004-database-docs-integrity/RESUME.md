# Ralph Loop Resumption Guide

**Feature:** 004-database-docs-integrity
**Status:** Ready to execute
**Session Date:** 2025-01-29

## Quick Resume

When you return, simply say:

> "Continue the Ralph Loop for feature 004-database-docs-integrity"

Or reference the current feature:
> "Check .specify/.current-feature - I want to continue that feature"

## What's Been Created

### Feature Specification
- **Location:** `.specify/specs/004-database-docs-integrity/`
- **Files:**
  - `spec.md` - Feature specification (goals, scope, success metrics)
  - `plan.md` - Technical plan (directory structure, templates, strategy)
  - `tasks.md` - 35+ tasks (expandable to ~220)
  - `.coordinator-prompt.md` - Ralph Loop coordinator instructions
  - `.speckit-state.json` - Current state (taskIndex: 0, ready to start)
  - `.progress.md` - Progress tracking (type fix counter, TODOs)

### Planning Files
- **Location:** `claude-code-plans/`
- **Files:**
  - `task_plan.md` - Original planning phases with key findings
  - `notes.md` - Detailed investigation findings (schema vs DB vs migrations)
  - `database-zod-alignment-report.md` - Comprehensive analysis report

## Current State

```json
{
  "featureId": "004",
  "name": "database-docs-integrity",
  "taskIndex": 0,
  "totalTasks": 35,
  "globalIteration": 1,
  "awaitingApproval": false
}
```

**Status:** Ready to execute (no approval needed)

## What the Ralph Loop Will Do

1. **Phase 1:** Create directory structure and templates
2. **Phase 2:** Document all 9 schemas (rich documentation with purpose/goals/rules)
3. **Phase 3:** Document all 118 tables (one .md per table + fix `any` types)
4. **Phase 4:** Document all 16 migrations (what changed, why, rollback)
5. **Phase 5:** Document all 12 enums (values and purposes)
6. **Phase 6:** Create validation hooks
7. **Phase 7:** Verification and quality gates

**Estimated:** ~45 iterations, 8-15 hours of agent work

## Key Enhancements

✅ **Rich Schema Documentation** - Purpose, goals, rules, decisions, anti-patterns
✅ **Individual Table Docs** - 118 separate .md files with full details
✅ **Type Fixing Integration** - Fix 100+ `any` types as we document
✅ **Migration TODOs** - Track schema inconsistencies with SQL solutions
✅ **Living Metadata** - first_documented, last_updated, last_verified_by

## Critical Issues Already Identified

From investigation (see notes.md):

1. **Missing Foreign Keys:**
   - `OutboxEvent.tenantId` → NO FK to platform.accounts (uses camelCase!)
   - `settings.tenant_id` → NO FK to platform.accounts
   - `documents.tenant_id` → NO FK to platform.accounts
   - Only `Location` has proper FK as reference pattern

2. **Naming Inconsistencies:**
   - `OutboxEvent` uses `tenantId` (camelCase) instead of `tenant_id` (snake_case)

3. **Schema Contract Gaps:**
   - No RLS policies (app-layer isolation only)
   - Missing composite unique constraints with `WHERE deleted_at IS NULL`
   - 65% alignment with schema contract

## To Start After Session Restart

Simply tell me:

> "Continue the Ralph Loop for feature 004-database-docs-integrity"

I will:
1. Read `.specify/specs/004-database-docs-integrity/.speckit-state.json`
2. Read `.coordinator-prompt.md` for instructions
3. Start delegating tasks from tasks.md
4. Run autonomously until ALL_TASKS_COMPLETE

## What You'll See

During execution, I'll output:
- `Starting task T001: Create directory structure...`
- `Delegating to spec-executor...`
- `Verification passed, advancing to T002...`
- `Types fixed so far: 0`
- `Migration TODOs created: 0`

## How to Monitor Progress

Check progress anytime:
```bash
# View progress
cat .specify/specs/004-database-docs-integrity/.progress.md

# Check current state
cat .specify/specs/004-database-docs-integrity/.speckit-state.json

# See completed tasks
grep '^\- \[x\]' .specify/specs/004-database-docs-integrity/tasks.md
```

## Important Context for Next Session

**User Requirements:**
1. Each table gets its own .md file (not just listed in schema doc)
2. VS Code ctrl+click linking must work (relative paths)
3. Schema docs must have rich explanations (logic, goals, rules, NOT just table lists)
4. Type fixing integrated - fix `any` types as we encounter them
5. Migration TODOs for schema inconsistencies (with SQL solutions)

**Known Issues to Document:**
- 3 missing foreign keys in tenant schema
- 1 naming inconsistency (OutboxEvent camelCase)
- 6000+ `any` types in codebase (target: fix 100+)

**Files to Reference:**
- Prisma schema: `packages/database/prisma/schema.prisma` (2770 lines)
- Schema contract: `docs/legacy-contracts/schema-contract-v2.txt`
- Planning notes: `claude-code-plans/notes.md`

---

**Ready when you are!** Just say "continue" when you get back.
