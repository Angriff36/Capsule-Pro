All 4 tasks are complete. Here's a summary of what was accomplished:

## Summary of All Completed Tasks

### Task-1: Review IMPLEMENTATION_PLAN.md structure and archive discipline
- **Report:** `.pi/messenger/crew/tasks/task-1-report.md`
- Structure is sound (207 lines, all 15 archive paths exist, Recently Resolved is concise)
- Found 4 issues: inaccurate "verified" claims, misleading Step 2 label, missing server action guidance, out-of-scope contradiction

### Task-2: Validate Proposal current-task claims against code
- **Report:** `.pi/messenger/crew/tasks/task-2-report.md`
- **Key finding:** Frontend uses server actions (direct Prisma), NOT API routes — plan's fetch URL claims are entirely wrong
- **Key finding:** ALL 7 command routes lack `instanceId` (not just "several"), so ALL status-transition mutates silently no-op
- Store claims verified correct: no `ProposalPrismaStore`, `ProposalLineItemPrismaStore` exists, `ENTITIES_WITH_SPECIFIC_STORES` correctly excludes Proposal

### Task-3: Validate PurchaseOrder current-task claims against code
- **Report:** `.pi/messenger/crew/tasks/task-3-report.md`
- **Key finding:** Frontend is under `procurement/` not `inventory/`, calls raw SQL routes, NOT manifest-backed routes
- **Key finding:** Frontend-active `procurement/` routes use raw SQL (`$queryRawUnsafe`), working but outside ORM/RLS
- **Key finding:** Same `instanceId` bug on ALL 6 non-create manifest commands
- **Key finding:** Item-level routes are PUT not PATCH, neither called from frontend

### Task-4: Review blockers, followups, and verification criteria
- **Report:** `.pi/messenger/crew/tasks/task-4-report.md`
- Blocker #1 undersells scope (ALL routes affected, not "several"; `executeManifestCommand` helper also broken)
- Found 3 contradictions in the plan (out-of-scope vs active work, trace-from-frontend vs inventory/ routes, done criteria vs frontend path)
- Proposed new Blocker #5: frontend-active routes may differ from manifest-backed routes
- Missing followups: server actions bypass, procurement raw SQL concerns