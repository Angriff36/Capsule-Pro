# Governance Scan Summary

**Generated:** From MCP tools `governance_scanRoutes` and `governance_scanBypass` (scope: all)

## governance_scanRoutes

Scans API routes against `routes.manifest.json`.

### Findings

- **ROUTE_NOT_IN_MANIFEST** (warning): Many API routes exist but are not in the manifest. Examples:
  - `/api/accounting/accounts`, `/api/accounting/accounts/:id`
  - `/api/administrative/chat/threads`, `/api/administrative/tasks`
  - `/api/ai/suggestions`, `/api/ai/summaries/:eventId`
  - `/api/analytics/*` (events/profitability, finance, kitchen, staff)
  - `/api/collaboration/auth`, `/api/collaboration/notifications/commands/*`
  - And many more across the codebase

- **Suggestion:** Add routes to manifest or remove if obsolete. Regenerate routes with manifest compile.

### Nonconforming Write Paths

Routes that perform writes but are not in the manifest may bypass the manifest runtime for governed entities. The scan does not flag routes that *are* in manifest but bypass runtime — those would be identified by `governance_scanBypass`.

---

## governance_scanBypass

Scans for patterns that bypass manifest commands.

### Findings

| Code | Severity | Description |
|------|----------|-------------|
| **DIRECT_DB_ACCESS** | error | Direct database access bypasses manifest runtime. Found in `packages/manifest-adapters` — PrismaStore exports for `AllergenWarning`, `Dish`, `Ingredient`, `InventoryItem`, `KitchenTask`, `MenuDish`, `Menu`, `PrepListItem`, `PrepList`, `PrepTask`, etc. These are used by the manifest runtime but can be accessed directly if imported elsewhere. |
| **HARDCODED_TENANT** | warning | Test files and fixtures may contain hardcoded tenant IDs. |

### Nonconforming Write Paths (Bypass Runtime)

1. **PrismaStore / direct Prisma usage:** The manifest-adapters package exports PrismaStore implementations. Any code that imports and uses these stores directly (e.g. `database.event.create(...)`) instead of invoking the manifest runtime (`execute_command`) bypasses guards, constraints, and event emission.

2. **Routes not in manifest:** Write handlers that are not in `routes.manifest.json` may perform direct database writes without going through the manifest command engine.

---

## Summary for Tier-2 Board Commands

For the curated Tier-2 board entities (Event, PrepTask, KitchenTask, PrepList, InventoryItem, EventStaff, CateringOrder, Schedule):

- **Commands in manifest:** All 25 Tier-2 commands are defined in the IR and have corresponding route handlers when part of the kitchen manifest.
- **Bypass risk:** Direct Prisma/database usage in server actions or API routes that do not call `execute_command` would bypass governance for these entities.
- **Recommendation:** Ensure all board-facing write operations go through the manifest runtime (`execute_command` or equivalent) rather than direct Prisma calls.
