---
tags: [database]
summary: database implementation decisions and patterns
relevantTo: [database]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 0
  referenced: 0
  successfulFeatures: 0
---
# database

#### [Gotcha] Tenant-scoped Prisma client blocks findUnique to prevent tenant bypass (2026-01-17)
- **Situation:** Initial implementation attempted findUnique queries on KitchenTask but tenant client doesn't allow it
- **Root cause:** findUnique lets you query by ID directly without where clauses, which could bypass tenant filtering
- **How to avoid:** findFirst is slightly more verbose but maintains mandatory tenant filtering; requires always passing ID in where clause

#### [Gotcha] Outbox events must use tenantDatabase, not raw database client (2026-01-17)
- **Situation:** Initially used database.enqueueOutboxEvent but codebase architect corrected to tenantDatabase(tenantId)
- **Root cause:** Outbox events are tenant-scoped records; using raw database mixes events across tenants
- **How to avoid:** Extra parameter passing for every event; ensures real-time events stay isolated per tenant

#### [Pattern] Capture state BEFORE mutations for audit trail completeness (2026-01-17)
- **Problem solved:** updateKitchenTaskStatus needed previousStatus for the outbox event but initially captured it after update
- **Why this works:** After the mutation completes, the previous state is gone; audit events need both from and to states
- **Trade-offs:** Extra database query before mutation; provides complete audit trail showing what changed and why

#### [Pattern] All exported functions must start with requireTenantId(), not rely on caller to pass tenantId (2026-01-17)
- **Problem solved:** All 14 exported server actions call requireTenantId() as first line before any database operations
- **Why this works:** Forces tenant authentication at the module boundary; prevents bypass by internal functions or future refactors
- **Trade-offs:** Every function has the same boilerplate; eliminates entire class of tenant bypass bugs

#### [Gotcha] Hard delete on KitchenTask vs soft delete on Event - model schema dictates approach (2026-01-17)
- **Situation:** KitchenTask uses delete() while Event uses soft delete with deletedAt field
- **Root cause:** KitchenTask schema doesn't have deletedAt field; Event schema does
- **How to avoid:** Hard delete is simpler and irreversible; soft delete enables recovery but complicates queries