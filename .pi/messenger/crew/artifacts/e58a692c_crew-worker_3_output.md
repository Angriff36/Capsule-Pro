## Task-4 Complete — Summary of Findings

**Output:** `.pi/messenger/crew/tasks/task-4-findings.md`

### Critical Findings (3)

1. **F1 — Proposal frontend does NOT call manifest command routes.** The CRM proposals UI uses Server Actions with direct Prisma calls (`database.proposal.create(...)`, `database.proposal.update(...)`). Zero references to `/api/crm/proposals` exist in `apps/app/`. Step 1's premise (manifest writes vs Prisma reads split) is wrong — both paths already use Prisma.

2. **F2 — PurchaseOrder frontend is under `procurement/`, not `inventory/`.** The plan says `apps/app/app/(authenticated)/inventory/purchase-orders/` but the actual path is `procurement/purchase-orders/`.

3. **F3 — PurchaseOrder frontend-facing routes use raw SQL (`$queryRaw`), not manifest runtime.** The plan claims "Commands — manifest runtime" but the actual `/api/procurement/purchase-orders/commands/create` route uses raw SQL directly. Adding a `PurchaseOrderPrismaStore` won't fix routes the frontend actually calls.

### Blocker Accuracy (2)

4. **F4 — Generator vs generated-file contradiction in Blocker #1.** AGENTS.md says "never edit generated files" but the plan says fix `instanceId` in generated routes. The fix needs to be at the generator level, not the file level.

5. **F5 — Blocker #2 polarity bug is real** (`isNegativeType` check is dead code — zero constraints start with "severity"), but the description should clarify entity-level vs command-level constraint evaluation paths.

### Moderate/Low (5)

6. Quarantined manifests count stale (17 → 12 active)
7. Open Followups E1/E3/E5 are unresolvable references
8-9. Missing `pnpm biome check` and done criteria gaps
10. Redundant blocker instructions in Required Pattern

**Commit:** `86ca69cd1`