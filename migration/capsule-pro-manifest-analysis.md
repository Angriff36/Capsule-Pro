# Capsule Pro — Manifest Entity Analysis & TPP Migration Mapping

**Created:** 2026-04-20
**Source:** github.com/Angriff36/capsule-pro (public repo, cloned locally)
**Scope:** Active manifest definitions in `packages/manifest-adapters/manifests/`

---

## 1. What Manifest Actually Is

Bill built his own domain modeling language. It's not a library — it's a compiler + runtime that:

- **Compiles** declarative `.manifest` files into an Intermediate Representation (IR)
- **Generates** API routes from that IR via "projections" (Next.js route generators)
- **Enforces** business rules at runtime: guards, policies, constraints, events
- **Stores** data via adapters (memory, localStorage, PostgreSQL)

This means Capsule's business logic lives in `.manifest` files, not scattered across route handlers. The 1346 API routes are a mix of auto-generated (from manifests) and hand-written (for complex flows).

---

## 2. Active Manifest Entities (64 files)

### CRM & Sales (7 entities)
| Entity | TPP Equivalent | Status |
|--------|---------------|--------|
| **Lead** | TPP CRM Leads | ✅ Full lifecycle: new → contacted → qualified → proposal → won/lost/disqualified |
| **Client** | TPP Contact | ✅ Company + individual types, full address, source tracking, archiving |
| **ClientContact** | TPP Contact sub-records | ✅ Multiple contacts per client, primary/billing roles |
| **ClientPreference** | — | ✅ NEW — TPP has no equivalent. Tracks dietary, venue, service preferences |
| **ClientInteraction** | TPP CRM Inbox | ✅ Communication tracking |
| **Proposal** | TPP Event/Quote | ✅ Full lifecycle: draft → sent → viewed → accepted/rejected/withdrawn/expired |
| **ProposalLineItem** | TPP Menu items on event | ✅ Per-proposal line items with quantities, pricing, categories |

### Events & Catering (8 entities)
| Entity | TPP Equivalent | Status |
|--------|---------------|--------|
| **Event** | TPP Events | ✅ Core entity. Statuses: draft → confirmed → completed → archived/cancelled |
| **EventProfitability** | — | ✅ NEW — Budget vs actual, food/labor/overhead cost tracking, margin analysis |
| **EventSummary** | — | ✅ NEW — AI-generated event summaries with highlights, issues, feedback |
| **EventReport** | TPP Event Checklist | ✅ Pre-event review checklists with completion tracking |
| **EventBudget** | — | ✅ Budget line items per event |
| **EventContract** | — | ✅ Contract tracking with status lifecycle |
| **EventDish** | TPP Event Menu | ✅ Links dishes to events |
| **EventGuest** | — | ✅ Guest list management |
| **EventStaff** | — | ✅ Staff assignments per event |

### Kitchen Ops (12 entities)
| Entity | TPP Equivalent | Status |
|--------|---------------|--------|
| **Menu** | TPP Menu Catalog | ✅ Name, category, pricing (base + per person), guest range, active/inactive |
| **MenuDish** | TPP Menu Items | ✅ Links dishes to menus with course ordering |
| **Dish** | TPP Menu Items | ✅ Individual dish definitions |
| **Recipe** | TPP Recipes | ✅ Versioned recipes (RecipeVersion entity) |
| **Ingredient** | — | ✅ Ingredient catalog linked to inventory |
| **PrepList** | TPP Pack Lists | ✅ Per-event prep lists with batch multiplier, dietary restrictions |
| **PrepListItem** | TPP Pack List Items | ✅ Per-item with station, scaling, allergens, completion tracking |
| **PrepTask** | — | ✅ Task-level prep operations |
| **KitchenTask** | — | ✅ Real-time kitchen task board |
| **Station** | — | ✅ Kitchen station definitions |
| **WasteEntry** | — | ✅ Waste tracking |
| **CycleCountSession** | — | ✅ Inventory cycle counts |

### Workflows (4 entities)
| Entity | Purpose |
|--------|---------|
| **EventImportWorkflow** | 6-step import: parse → extract → validate → propose → reserve → activate |
| **PrepTaskPlanWorkflow** | Auto-generate prep task plans from events |
| **EmailWorkflow** | Email automation execution |
| **WorkforceOptimization** | Staff scheduling optimization |

### Staff & Payroll (8 entities)
| Entity | TPP Equivalent |
|--------|---------------|
| **User** | TPP Users |
| **Schedule** | — |
| **EmployeeAvailability** | — |
| **EmployeeCertification** | — |
| **TimeEntry** | — |
| **Timecard** | — |
| **PayrollRun** | — |
| **LaborBudget** | — |
| **TimeOffRequest** | — |
| **TrainingModule** | — |
| **TrainingAssignment** | — |

### Inventory & Procurement (6 entities)
| Entity | TPP Equivalent |
|--------|---------------|
| **InventoryItem** | — |
| **InventoryTransaction** | — |
| **PurchaseOrder** | — |
| **VendorCatalog** | — |
| **BulkOrderRule** | — |
| **InventorySupplier** | — |

### Other
| Entity | Purpose |
|--------|---------|
| **BattleBoard** | Real-time kitchen execution board (Ably-powered) |
| **CommandBoard** | Real-time kanban |
| **Notification** | Notification system |
| **SmsAutomationRule** | SMS automation |
| **EmailTemplate** | Email templates |
| **ChartOfAccount** | Accounting |

### Disabled Manifests (14 files in `manifests-disabled/`)
These are defined but NOT active:
- invoice-rules, payment-rules, payment-reconciliation, revenue-recognition
- procurement-requisition, vendor-contract, shipment, collections
- equipment, facility, rate-limit, knowledge-base, quality-control
- version-control, digital-twin, prep-task-dependency

---

## 3. TPP → Capsule Status Mapping

### TPP Event Status → Capsule Event Status

| TPP Status | TPP Code | Capsule Status | Notes |
|-----------|----------|---------------|-------|
| Quote | 0 | `draft` | ✅ Direct mapping |
| Confirmed | 1 | `confirmed` | ✅ Direct mapping |
| Sales Lock | 2 | `confirmed` | ⚠️ No exact match — "Sales Lock" means price locked but not yet confirmed. Maps to confirmed. |
| Final | 3 | `completed` | ✅ "Final" in TPP = event done = `completed` in Capsule |
| Closed | 00 | `archived` | ⚠️ TPP "Closed" ≈ Capsule `archived`. Need to confirm semantics match. |
| Cancelled | 9 | `cancelled` | ✅ Direct mapping |
| Quote (Lost) | QUOTE (LOST) | `cancelled` | ⚠️ Lost quotes ≠ cancelled events. Need separate handling. |

**Gap:** TPP has "Sales Lock" (2) and "Quote (Lost)" statuses that don't have exact Capsule equivalents. Sales Lock is particularly important — it means the proposal is locked and the client has verbally committed but hasn't signed. For Mangia's workflow, this is a meaningful distinction.

### TPP Lead Pipeline → Capsule Lead Status

| TPP Concept | Capsule Lead Status | Match? |
|------------|-------------------|-------|
| New inquiry | `new` | ✅ |
| Contacted | `contacted` | ✅ |
| Qualified | `qualified` | ✅ |
| Proposal sent | `proposal` | ✅ |
| Won (converted to event) | `won` | ✅ |
| Lost | `lost` | ✅ |
| Disqualified | `disqualified` | ✅ |

**Verdict:** Lead pipeline maps cleanly. ✅

### TPP Proposal/Quote → Capsule Proposal

| TPP Concept | Capsule Proposal Status | Match? |
|------------|----------------------|-------|
| Draft quote | `draft` | ✅ |
| Sent to client | `sent` | ✅ |
| Client viewed | `viewed` | ✅ |
| Accepted/signed | `accepted` | ✅ |
| Rejected | `rejected` | ✅ |
| Withdrawn | `withdrawn` | ✅ |
| Expired | `expired` | ✅ (computed from validUntil) |

**Verdict:** Proposal lifecycle maps cleanly. ✅ Better than TPP actually — TPP doesn't track "viewed" status.

---

## 4. Critical Findings for Migration

### 🔴 CONFIRMED: Menu Snapshot Gap
**Manifest confirms the problem.** The `Menu` entity is a standalone object. `EventDish` links dishes to events, but if a `Dish` definition changes (price, ingredients, allergens), it changes for ALL events using that dish. There is NO `EventMenuSnapshot` or versioning at the event level.

**Impact for migration:** When we import historical events, we need to freeze the menu data as it was at event time. If we just link EventDish → Dish, future dish edits will retroactively alter historical event records.

**Recommendation:** Bill needs to build an `EventMenuSnapshot` entity that captures dish name, description, price, and ingredients at the time the proposal is accepted. This should be a Manifest entity with a command triggered on `ProposalAccepted` event.

### 🔴 CONFIRMED: Pack List ≠ PrepList
TPP's "pack list" and Capsule's "PrepList" are NOT the same thing:
- **TPP Pack List:** Equipment/supply checklist per event (plates, forks, chafing dishes, linens, etc.)
- **Capsule PrepList:** Food preparation task list per event (prep ingredients, scale quantities by guest count)

These are complementary, not equivalent. Capsule is missing the equipment/supply pack list concept entirely. The `PrepList` is food-focused. Mangia needs BOTH — the food prep list AND the equipment/supply pack list.

**Recommendation:** Either extend PrepList to support equipment items (type field: "food" vs "equipment"), or create a separate `PackList` entity.

### 🟡 TPP "Sales Lock" Status Has No Home
Mangia uses "Sales Lock" (TPP code 2) to indicate a verbally committed event where pricing is locked but contract isn't signed. Capsule doesn't have this intermediate state between `draft` and `confirmed`.

**Options:**
1. Add `sales_lock` to the Event status constraint (requires Bill to modify event-rules.manifest)
2. Use the Proposal `sent` status + a flag on the Event to indicate verbal commitment
3. Map Sales Lock to `confirmed` and lose the distinction

**Recommendation:** Option 1 is cleanest. One line change in the manifest constraint.

### 🟡 No Service Style Entity
TPP has Service Style as a core concept (Full Service, Limited Service, Drop Off, Vending). Capsule's Event has an `eventFormat` field but no dedicated Service Style entity with predefined values.

**Impact:** Service style drives pricing, staffing, and equipment needs. Without a structured service style, you lose the ability to auto-calculate staffing ratios or equipment needs based on service type.

### 🟢 Event Profitability is a Major Upgrade
Capsule has `EventProfitability` with budget vs actual tracking for food cost, labor cost, overhead, and gross margin. TPP has nothing like this. This is a significant reporting advantage.

### 🟢 Lead Source Tracking is Better in Capsule
Capsule's Lead entity has a `source` field. Client also has a `source` field. TPP only has `Referred From` on events (and it's 15% empty). Capsule's approach is cleaner — source lives on the lead/client, not the event.

---

## 5. Event Import Workflow — Migration Path

The `EventImportWorkflow` is a 6-step pipeline:

1. **Parse** — Parse uploaded CSV/PDF documents
2. **Extract** — Extract event data from parsed documents
3. **Validate** — Validate extracted data (errors + warnings)
4. **Propose** — Propose prep tasks from validated event
5. **Reserve** — Reserve inventory for proposed tasks
6. **Activate** — Activate the event and tasks

**Key features for migration:**
- Idempotency key prevents duplicate imports
- Confidence scoring on parsing (warns if < 70%)
- Pause/resume for manual intervention
- Retry from failed state
- Per-step error and warning tracking

**This is our migration tool.** The workflow accepts CSV input (matches our TPP export format). We need to:
1. Map TPP CSV columns to the workflow's expected input format
2. Test with a small subset (10-20 events)
3. Validate output against TPP data
4. Run full import

---

## 6. Role/Permission Mapping

| Role | Capabilities |
|------|-------------|
| `sales` | Manage leads, clients, proposals, line items |
| `event_coordinator` | Manage events, summaries |
| `kitchen_staff` | Manage menus (limited), prep lists, reports |
| `kitchen_lead` | Full menu management, finalize prep lists, approve reports |
| `manager` | Everything except admin functions |
| `admin` | Full access |
| `finance` | Manage profitability |
| `staff` | Create import workflows |

**For Mangia:**
- **Kayden** → `event_coordinator` + `sales`
- **Josh** → `manager`
- **Tim** → `admin` (or `manager` with finance access)
- **Kitchen staff** → `kitchen_staff` or `kitchen_lead`

---

## 7. Disabled Manifests Worth Activating

For Mangia's operations, these disabled manifests should be activated:

| Manifest | Why |
|----------|-----|
| `payment-rules` | Track payments per event (currently in QB only) |
| `invoice-rules` | Generate invoices from proposals |
| `payment-reconciliation` | Reconcile TPP/QB payment data |
| `equipment-rules` | Equipment tracking (bridges pack list gap) |

---

## 8. What I'm Reading Next

- `packages/database/prisma/schema.prisma` — Full database schema (5,493 lines)
- `packages/mcp-server/` — The MCP server for direct integration
- `packages/sales-reporting/` — How reports are actually generated
- `apps/api/app/` — Route handlers to understand API structure
- `packages/manifest-adapters/manifests-disabled/` — Review disabled rules

---

_This is a living document. Updates as I read more of the codebase._
