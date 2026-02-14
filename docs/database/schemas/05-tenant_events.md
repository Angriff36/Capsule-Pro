# Tenant Events Schema

**Schema:** `tenant_events`

## Purpose

The tenant_events schema contains **event management and execution** data for catering operations. This is the operational core where leads become booked events, menus are planned, staff are assigned, budgets are tracked, and post-event analysis is performed.

## Goals

1. **End-to-End Event Management**: From lead/proposal through execution to post-event review
2. **Battle Board Integration**: Real-time operational boards for event execution (CSV/TPP PDF imports)
3. **Financial Tracking**: Budgeting, profitability, variance analysis, and reporting
4. **Staff Coordination**: Assign staff to events with roles and time tracking
5. **Document Management**: Contracts, signatures, and event imports (PDF/CSV parsing)
6. **Guest Management**: Track guest lists, dietary restrictions, and meal preferences
7. **Menu Planning**: Link dishes to events with courses and service styles

## Tables

### `Event`

Core event record representing a catering job.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Event identifier
- `eventNumber` (String?): Human-readable event number (e.g., "EVT-2024-001")
- `title` (String): Event name (default: "Untitled Event")
- `clientId` (Uuid?, FK): References Client (tenant_crm.clients)
- `locationId` (Uuid?, FK): References Location (tenant.locations) - **WHERE EVENT IS HELD**
- `venueId` (Uuid?, FK): References Location (tenant.locations) - **DUPLICATE OF LOCATION_ID**
- `eventType` (String): Type of event (wedding, corporate, etc.)
- `eventDate` (Date): When the event occurs
- `guestCount` (Int): Expected number of guests (default: 1)
- `status` (String): Event status (default: "confirmed")
- `budget` (Decimal?): Total event budget
- `assignedTo` (Uuid?, FK): Staff member assigned to event
- `venueName` (String?): **REDUNDANT** - duplicated from Location.name
- `venueAddress` (String?): **REDUNDANT** - duplicated from Location address
- `notes` (String?): Free-form notes
- `tags` (String[]): Searchable tags
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `client` → Client (tenant_crm)
- `location` → Location (tenant) - where event is held
- `venue` → Location (tenant) - **DUPLICATE RELATION** (same as location)

**CRITICAL ISSUE - venue_id vs location_id Confusion:**
- **BOTH `locationId` AND `venueId` REFERENCE THE SAME `Location` TABLE**
- `locationId` uses relation name "EventLocation"
- `venueId` uses relation name "LocationVenue"
- **Semantic confusion**: Are these different concepts or the same?
- **Recommendation**: Choose ONE and remove the other. Location is clearer (where event happens).
- **Data migration needed**: Determine if any events have different values for locationId vs venueId

**Indexes:**
- PK: `(tenantId, id)`
- Index: `(tenantId, venueId)` - **WHY NOT locationId?**

---

### `EventProfitability`

Financial performance tracking per event (budgeted vs actual).

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Profitability record ID
- `eventId` (Uuid, FK): References Event
- `budgetedRevenue` (Decimal): Expected revenue
- `budgetedFoodCost` (Decimal): Expected food cost
- `budgetedLaborCost` (Decimal): Expected labor cost
- `budgetedOverhead` (Decimal): Expected overhead
- `budgetedTotalCost` (Decimal): Total expected cost
- `budgetedGrossMargin` (Decimal): Expected gross margin
- `budgetedGrossMarginPct` (Decimal): Expected margin percentage
- `actualRevenue` (Decimal): Actual revenue
- `actualFoodCost` (Decimal): Actual food cost
- `actualLaborCost` (Decimal): Actual labor cost
- `actualOverhead` (Decimal): Actual overhead
- `actualTotalCost` (Decimal): Total actual cost
- `actualGrossMargin` (Decimal): Actual gross margin
- `actualGrossMarginPct` (Decimal): Actual margin percentage
- `revenueVariance` (Decimal): Revenue difference
- `foodCostVariance` (Decimal): Food cost difference
- `laborCostVariance` (Decimal): Labor cost difference
- `totalCostVariance` (Decimal): Total cost difference
- `marginVariancePct` (Decimal): Margin percentage difference
- `calculatedAt` (Timestamptz): When calculation was performed
- `calculationMethod` (String): How values were calculated (default: "auto")
- `notes` (String?): Additional context
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Indexes:**
- PK: `(tenantId, id)`
- Index: `(eventId)` - **MISSING tenantId prefix**
- Index: `(tenantId, eventId)`
- Index: `(calculatedAt DESC)` - **MISSING tenantId prefix**

---

### `EventSummary`

AI-generated event summaries with highlights, issues, and insights.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Summary record ID
- `eventId` (Uuid, FK): References Event
- `highlights` (Json?): Key event highlights
- `issues` (Json?): Problems or concerns
- `financialPerformance` (Json?): Financial metrics
- `clientFeedback` (Json?): Customer feedback
- `insights` (Json?): AI-generated insights
- `overallSummary` (String?): Text summary
- `generatedAt` (Timestamptz): When summary was generated
- `generationDurationMs` (Int?): How long generation took
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Indexes:**
- PK: `(tenantId, id)`
- Index: `(eventId)` - **MISSING tenantId prefix**
- Index: `(tenantId, eventId)`
- Index: `(generatedAt DESC)` - **MISSING tenantId prefix**

---

### `EventReport`

Post-event reports with configurable auto-fill and completion tracking.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Report ID
- `eventId` (Uuid, FK): References Event
- `name` (String): Report name
- `status` (String): Report status (default: "draft")
- `completion` (Int): Percentage complete (0-100, default: 0)
- `autoFillScore` (SmallInt?): Auto-fill confidence score
- `report_config` (Json?): Report configuration
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)
- `event` → Event (tenant_events)

**Indexes:**
- PK: `(tenantId, id)`
- Index: `(eventId)` - **MISSING tenantId prefix**

---

### `EventBudget`

Budget tracking with versioning for change history.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Budget ID
- `eventId` (Uuid, FK): References Event
- `version` (Int): Budget version number (default: 1)
- `status` (String): Budget status (default: "draft")
- `totalBudgetAmount` (Decimal): Total budgeted amount
- `totalActualAmount` (Decimal): Total actual amount spent
- `varianceAmount` (Decimal): Difference between budget and actual
- `variancePercentage` (Decimal): Variance as percentage
- `notes` (String?): Additional context
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)
- `event` → Event (tenant_events)
- `lineItems` → BudgetLineItem[]
- `alerts` → BudgetAlert[] (tenant_staff - **WRONG SCHEMA**)

**Indexes:**
- PK: `(tenantId, id)`
- Index: `(tenantId, eventId)`
- Index: `(tenantId, status)`

**CRITICAL ISSUE - BudgetAlert Schema:**
- `BudgetAlert` table is in `tenant_staff` schema
- Should be in `tenant_events` schema (belongs with budgets)
- Creates cross-schema dependency for no reason

---

### `BudgetLineItem`

Individual line items within an event budget.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Line item ID
- `budgetId` (Uuid, FK): References EventBudget
- `category` (String): Line item category (e.g., "food", "labor", "rentals")
- `name` (String): Line item name
- `description` (String?): Detailed description
- `budgetedAmount` (Decimal): Budgeted amount
- `actualAmount` (Decimal): Actual amount spent
- `varianceAmount` (Decimal): Difference
- `sortOrder` (Int): Display order (default: 0)
- `notes` (String?): Additional context
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)
- `budget` → EventBudget (tenant_events)

**Indexes:**
- PK: `(tenantId, id)`
- Index: `(tenantId, budgetId)`
- Index: `(tenantId, category)`

---

### `EventGuest`

Guest list management with dietary restrictions and meal preferences.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Guest ID
- `eventId` (Uuid, FK): References Event
- `guestName` (String): Guest name
- `guestEmail` (String?): Guest email
- `guestPhone` (String?): Guest phone
- `isPrimaryContact` (Boolean): Is this the primary contact? (default: false)
- `dietaryRestrictions` (String[]): Dietary restrictions (e.g., "vegetarian", "gluten-free")
- `allergenRestrictions` (String[]): Allergen restrictions (e.g., "nuts", "dairy")
- `notes` (String?): Additional notes
- `specialMealRequired` (Boolean): Does guest need special meal? (default: false)
- `specialMealNotes` (String?): Special meal details
- `tableAssignment` (String?): Table number/assignment
- `mealPreference` (String?): Meal preference
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)

**Indexes:**
- PK: `(tenantId, id)`
- Index: `(eventId)` - **MISSING tenantId prefix**
- Index: `(dietaryRestrictions)` - **MISSING tenantId prefix** (GIN)
- Index: `(allergenRestrictions)` - **MISSING tenantId prefix** (GIN)

**MISSING FOREIGN KEY:**
- `eventId` has no FK constraint to Event
- Allows orphaned guest records

---

### `EventContract`

Contract management for events with document storage.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Contract ID
- `eventId` (Uuid?, FK): References Event
- `clientId` (Uuid, FK): References Client (tenant_crm)
- `contractNumber` (String?): Human-readable contract number
- `title` (String): Contract title (default: "Untitled Contract")
- `status` (String): Contract status (default: "draft")
- `documentUrl` (String?): URL to contract document
- `documentType` (String?): Type of document (PDF, DocuSign, etc.)
- `notes` (String?): Additional notes
- `expiresAt` (Timestamptz?): Contract expiration
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)
- `event` → Event (tenant_events) - **OPTIONAL**
- `client` → Client (tenant_crm)
- `signatures` → ContractSignature[]

**Indexes:**
- PK: `(tenantId, id)`
- Index: `(tenantId, status)`
- Index: `(tenantId, eventId)`
- Index: `(tenantId, clientId)`
- Index: `(tenantId, expiresAt)`
- Index: `(tenantId, contractNumber)`
- Index: `(tenantId, documentType)`

**MISSING FOREIGN KEYS:**
- `clientId` has no FK constraint to Client
- Allows orphaned contracts

---

### `ContractSignature`

Digital signatures for event contracts.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Signature ID
- `contractId` (Uuid, FK): References EventContract
- `signedAt` (Timestamptz): When signature was captured
- `signatureData` (String): Signature image/data (base64 or SVG)
- `signerName` (String): Name of signer
- `signerEmail` (String?): Email of signer
- `ipAddress` (String?): IP address when signed
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)
- `contract` → EventContract (tenant_events)

**Indexes:**
- PK: `(tenantId, id)`
- Index: `(tenantId, contractId)`
- Index: `(tenantId, signedAt)`
- Index: `(tenantId, signerEmail)`

---

### `EventStaffAssignment`

Staff assignments to events with roles and time tracking.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Assignment ID
- `eventId` (Uuid, FK): References Event
- `employeeId` (Uuid, FK): References User (tenant.users)
- `role` (String): Staff role (e.g., "chef", "server", "bartender")
- `startTime` (Timestamptz?): Shift start time
- `endTime` (Timestamptz?): Shift end time
- `notes` (String?): Additional notes
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)

**Indexes:**
- PK: `(tenantId, id)`

**MISSING:**
- Foreign key to Event
- Foreign key to User
- Indexes on `eventId`, `employeeId`, `startTime` for queries

---

### `EventTimeline`

Timeline checkpoints and milestones for event execution.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Timeline entry ID
- `eventId` (Uuid, FK): References Event
- `timelineTime` (Time): Time of day for this checkpoint
- `description` (String): What should happen at this time
- `responsibleRole` (String?): Who is responsible
- `isCompleted` (Boolean): Is this checkpoint done? (default: false)
- `completedAt` (Timestamptz?): When it was completed
- `notes` (String?): Additional notes
- `sortOrder` (SmallInt): Display order (default: 0)
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)

**Indexes:**
- PK: `(tenantId, id)`

**MISSING:**
- Foreign key to Event
- Indexes on `eventId`, `timelineTime`, `sortOrder` for queries

---

### `EventImport`

Imported event documents (PDF/CSV) for parsing and data extraction.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Import ID
- `eventId` (Uuid?, FK): References Event (nullable - imports before event creation)
- `fileName` (String): Original filename
- `mimeType` (String): File MIME type (e.g., "application/pdf")
- `fileSize` (Int): File size in bytes
- `content` (Bytes): File content (BLOB storage in database)
- `createdAt` (Timestamptz): Upload timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)

**Indexes:**
- PK: `(tenantId, id)`
- Index: `(tenantId, createdAt DESC)`
- Index: `(tenantId, eventId)`

**MISSING FOREIGN KEY:**
- `eventId` has no FK constraint to Event

**DECISION NOTE - BLOB Storage:**
- Storing file content in database as `Bytes` type
- Alternative: Store in object storage (S3) and keep URL only
- Trade-off: Database storage vs. external service dependency

---

### `BattleBoard`

Real-time operational boards imported from TPP PDFs or CSV files.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Battle board ID
- `eventId` (Uuid?, FK): References Event (nullable - templates exist without events)
- `board_name` (String): Board name
- `board_type` (String): Board type (default: "event-specific")
- `schema_version` (String): Data schema version (default: "mangia-battle-board@1")
- `boardData` (Json): Board content (tasks, stations, assignments)
- `document_url` (String?): URL to source document (if imported)
- `source_document_type` (String?): Type of source document (TPP PDF, CSV, etc.)
- `document_imported_at` (Timestamptz?): When document was imported
- `status` (String): Board status (default: "draft")
- `is_template` (Boolean): Is this a template board? (default: false)
- `description` (String?): Board description
- `notes` (String?): Additional notes
- `tags` (String[]): Searchable tags
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)

**Indexes:**
- PK: `(tenantId, id)`
- Index: `(boardData)` - **MISSING tenantId prefix** (GIN)
- Index: `(tags)` - **MISSING tenantId prefix** (GIN)

**MISSING FOREIGN KEY:**
- `eventId` has no FK constraint to Event

**DECISION NOTE - JSON Storage:**
- `boardData` stored as JSON for flexibility
- Schema versioning allows migration of old board formats
- Trade-off: Query complexity vs. schema flexibility

---

### `CommandBoard`

Kanban-style command boards for event task management.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Command board ID
- `eventId` (Uuid?, FK): References Event (nullable - templates exist without events)
- `name` (String): Board name
- `description` (String?): Board description
- `status` (String): Board status (default: "draft")
- `isTemplate` (Boolean): Is this a template? (default: false)
- `tags` (String[]): Searchable tags
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)
- `cards` → CommandBoardCard[]

**Indexes:**
- PK: `(tenantId, id)`
- Index: `(eventId)` - **MISSING tenantId prefix**
- Index: `(tags)` - **MISSING tenantId prefix** (GIN)

**MISSING FOREIGN KEY:**
- `eventId` has no FK constraint to Event

---

### `CommandBoardCard`

Individual cards on command boards (tasks, notes, etc.).

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Card ID
- `boardId` (Uuid, FK): References CommandBoard
- `title` (String): Card title
- `content` (String?): Card content/description
- `cardType` (String): Type of card (default: "task")
- `status` (String): Card status (default: "pending")
- `positionX` (Int): X position on board (default: 0)
- `positionY` (Int): Y position on board (default: 0)
- `width` (Int): Card width (default: 200)
- `height` (Int): Card height (default: 150)
- `zIndex` (Int): Z-index for layering (default: 0)
- `color` (String?): Card color (hex code)
- `metadata` (Json): Additional card metadata
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)
- `board` → CommandBoard (tenant_events)

**Indexes:**
- PK: `(tenantId, id)`
- Index: `(boardId)` - **MISSING tenantId prefix**
- Index: `(zIndex)` - **MISSING tenantId prefix**

---

### `TimelineTask`

Project management tasks with dependencies and critical path tracking.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Task ID
- `eventId` (Uuid, FK): References Event
- `title` (String): Task title
- `description` (String?): Task description
- `startTime` (Timestamptz): Task start time
- `endTime` (Timestamptz): Task end time
- `status` (String): Task status (default: "not_started")
- `priority` (String): Task priority (default: "medium")
- `category` (String): Task category
- `assigneeId` (Uuid?, FK): References User (tenant.users)
- `progress` (Int): Task progress percentage (default: 0)
- `dependencies` (String[]): IDs of tasks this depends on
- `isOnCriticalPath` (Boolean): Is this on critical path? (default: false)
- `slackMinutes` (Int): Slack time available (default: 0)
- `notes` (String?): Additional notes
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)

**Indexes:**
- PK: `(tenantId, id)`
- Index: `(eventId)` - **MISSING tenantId prefix**
- Index: `(assigneeId)` - **MISSING tenantId prefix**
- Index: `(status)` - **MISSING tenantId prefix**
- Index: `(priority)` - **MISSING tenantId prefix**
- Index: `(startTime)` - **MISSING tenantId prefix**
- Index: `(isOnCriticalPath)` - **MISSING tenantId prefix**
- Index: `(dependencies)` - **MISSING tenantId prefix** (GIN)

**MISSING FOREIGN KEYS:**
- `eventId` has no FK constraint to Event
- `assigneeId` has no FK constraint to User

---

### `CateringOrder`

Catering orders with venue, delivery, and payment details.

**Columns:**
- `tenantId` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK, Unique): Order ID
- `customer_id` (Uuid): Customer ID - **MISSING FK TO CLIENT OR USER**
- `eventId` (Uuid?, FK): References Event
- `orderNumber` (String, Unique): Human-readable order number
- `order_status` (String): Order status (default: "draft")
- `order_date` (Timestamptz): Order date (default: now())
- `delivery_date` (Timestamptz): Delivery date
- `delivery_time` (String): Delivery time
- `subtotal_amount` (Decimal): Subtotal (default: 0)
- `tax_amount` (Decimal): Tax amount (default: 0)
- `discount_amount` (Decimal): Discount (default: 0)
- `service_charge_amount` (Decimal): Service charge (default: 0)
- `totalAmount` (Decimal): Total amount (default: 0)
- `deposit_required` (Boolean): Is deposit required? (default: false)
- `deposit_amount` (Decimal?): Deposit amount
- `deposit_paid` (Boolean): Is deposit paid? (default: false)
- `deposit_paid_at` (Timestamptz?): When deposit was paid
- `venue_name` (String?): **REDUNDANT** - should reference Location
- `venue_address` (String?): **REDUNDANT** - should reference Location
- `venue_city` (String?): **REDUNDANT** - should reference Location
- `venue_state` (String?): **REDUNDANT** - should reference Location
- `venue_zip` (String?): **REDUNDANT** - should reference Location
- `venue_contact_name` (String?): Venue contact
- `venue_contact_phone` (String?): Venue phone
- `guest_count` (Int): Number of guests (default: 0)
- `special_instructions` (String?): Special delivery instructions
- `dietary_restrictions` (String?): Dietary restrictions
- `staff_required` (Int?): Staff needed (default: 0)
- `staff_assigned` (Int?): Staff assigned (default: 0)
- `createdAt` (Timestamptz): Creation timestamp
- `updatedAt` (Timestamptz): Last update timestamp
- `deletedAt` (Timestamptz?): Soft delete timestamp

**Relations:**
- `tenant` → Account (platform)

**Indexes:**
- PK: `(tenantId, id)`

**CRITICAL ISSUES:**
1. **Redundant venue fields**: `venue_name`, `venue_address`, `venue_city`, `venue_state`, `venue_zip` should be replaced with `locationId` FK to Location table
2. **Missing FK**: `customer_id` has no FK constraint (should reference Client or User)
3. **Missing FK**: `eventId` has no FK constraint to Event
4. **Missing indexes**: No indexes on `order_status`, `delivery_date`, `customer_id`

---

### `event_dishes`

Junction table linking dishes to events (many-to-many).

**Columns:**
- `tenant_id` (Uuid, PK): Tenant identifier
- `id` (Uuid, PK): Junction record ID
- `event_id` (Uuid, FK): References Event
- `dish_id` (Uuid, FK): References Dish (tenant_kitchen.dishes)
- `course` (String?): Course name (e.g., "appetizer", "main", "dessert")
- `quantity_servings` (Int): Number of servings (default: 1)
- `service_style` (String?): Service style (e.g., "plated", "buffet", "family-style")
- `special_instructions` (String?): Special instructions for this dish
- `created_at` (Timestamptz): Creation timestamp
- `updated_at` (Timestamptz): Last update timestamp
- `deleted_at` (Timestamptz?): Soft delete timestamp

**MISSING:**
- Foreign key to Event
- Foreign key to Dish
- Indexes on `event_id`, `dish_id`, `course` for queries

**NAMING INCONSISTENCY:**
- Table name uses snake_case (`event_dishes`)
- All other tenant_events tables use PascalCase
- **Recommendation**: Rename to `EventDish` for consistency

---

## Rules

### Event Requirements
- **Every event MUST have a client** (after conversion from lead)
- **Events must have type and date** (required fields)
- **Guest count defaults to 1** (minimum valid value)

### Budget Versioning
- **Budgets use version numbers** (start at 1, increment on changes)
- **Only one budget can be active per event at a time**
- **Budget line items cascade delete when budget is deleted**

### Contract Signatures
- **Multiple signatures allowed per contract**
- **Signature data stored as base64 or SVG string**
- **IP address logged for audit purposes**

### Guest Management
- **Primary contact flag: only one guest per event should be `isPrimaryContact: true`**
- **Dietary and allergen restrictions stored as arrays** (multi-select)

### Staff Assignments
- **Staff can be assigned to multiple events**
- **Roles are free-form strings** (no enum - allows flexibility)
- **Time tracking via startTime/endTime**

### Battle Boards
- **Can exist without events** (templates)
- **JSON storage allows flexible schema evolution**
- **Schema version field critical for migrations**

### Command Boards
- **Freeform positioning** (positionX, positionY, width, height, zIndex)
- **Cards can be tasks, notes, or other types** (cardType field)
- **Metadata JSON for extensibility**

---

## Decisions

### Why JSON for BattleBoard and CommandBoard?

**Problem:**
- Battle boards evolve frequently (new fields, new structures)
- Different event types need different board layouts
- Schema migrations would be constant overhead

**Solution:**
- Store board data as JSON (`boardData`, `metadata`)
- Use `schema_version` field to track format version
- Application handles serialization/deserialization

**Benefits:**
- Schema changes without database migrations
- Backward compatibility via version checking
- Flexibility for different event types

**Trade-offs:**
- No database-level validation of JSON structure
- More complex queries (need to navigate JSON)
- Type safety enforced at application layer only

---

### Why Separate Budgets Table (not inline in Event)?

**Problem:**
- Budgets change frequently
- Need to track budget history (what was promised vs. what was spent)
- Multiple budget versions for approvals/change orders

**Solution:**
- Separate `EventBudget` table with `version` field
- One-to-many relationship (event → budgets)
- Active budget determined by `status` field

**Benefits:**
- Full audit trail of budget changes
- Can compare versions (budget v1 vs budget v2)
- Supports change order workflow

**Trade-offs:**
- Extra join required to get current budget
- Need to manage which version is "active"
- More complex queries

---

### Why `locationId` AND `venueId` in Event?

**PROBLEM - THIS IS A BUG, NOT A FEATURE:**

**Current State:**
- Both `locationId` and `venueId` reference the SAME `Location` table
- Semantic confusion: are these different concepts?
- Redundant data: `venueName` and `venueAddress` duplicate Location fields

**Hypothesis:**
- Originally intended to differentiate:
  - `locationId` = customer's venue (where event happens)
  - `venueId` = caterer's location (where food is prepared)
- **BOTH RELATIONSHIPS POINT TO THE SAME TABLE**

**Recommendation:**
1. **Choose one name and remove the other**
2. **Add `preparationLocationId` if you need to track where food is prepared**
3. **Remove redundant `venueName` and `venueAddress` fields**
4. **Query Location table directly for address info**

**Migration Strategy:**
1. Audit data: find events where `locationId != venueId`
2. Determine correct semantics
3. Migrate data to chosen field
4. Remove unused field and relations
5. Remove redundant columns

---

### Why BLOB Storage for EventImport.content?

**Problem:**
- Need to parse TPP PDFs and CSV files
- Files need to be stored somewhere
- Two options: database BLOB or object storage (S3, etc.)

**Solution:**
- Store file content as `Bytes` column in database
- Keep `mimeType` and `fileSize` for validation

**Benefits:**
- No external service dependency
- Transactions include file storage
- Simpler deployment (no S3 buckets needed)

**Trade-offs:**
- Database size grows faster
- Backup/restore includes large files
- No CDN for file downloads
- Database performance may degrade with many large files

**Alternative:**
- Store files in S3/cloud storage
- Keep only URL in database
- Better for production at scale

---

## Relations

### Internal Relations (tenant_events)

```
Event (1) ──┬── (N) EventBudget ── (N) BudgetLineItem
            ├── (N) EventReport
            ├── (1) EventProfitability
            ├── (1) EventSummary
            ├── (N) EventGuest
            ├── (N) EventContract ── (N) ContractSignature
            ├── (N) EventStaffAssignment
            ├── (N) EventTimeline
            ├── (N) EventImport
            ├── (N) BattleBoard
            ├── (N) CommandBoard ── (N) CommandBoardCard
            ├── (N) TimelineTask
            ├── (N) CateringOrder
            └── (N) event_dishes

EventBudget (1) ── (N) BudgetAlert (tenant_staff - WRONG SCHEMA)
```

### Cross-Schema Relations

**tenant_events → tenant_crm:**
- `Event.clientId` → `Client.id`
- `EventContract.clientId` → `Client.id`

**tenant_events → tenant:**
- `Event.locationId` → `Location.id` (where event happens)
- `Event.venueId` → `Location.id` (DUPLICATE of above)
- `Event.assignedTo` → `User.id` (staff member)

**tenant_events → tenant_kitchen:**
- `event_dishes.dish_id` → `Dish.id`
- `Event.wasteEntries` → `WasteEntry[]`

**tenant_events → tenant_staff:**
- `EventStaffAssignment.employeeId` → `Employee.id` (if Employee table exists)
- `EventBudget` → `BudgetAlert[]` (WRONG SCHEMA - should be tenant_events)

**tenant_events → platform:**
- All tables have `tenantId` → `Account.id`

---

## Lifecycle

### Event Creation Flow

```
1. Lead (tenant_crm) created
2. Proposal created from lead
3. Client accepts proposal → Event created
4. Event assigned to staff member
5. Menu selected (event_dishes records created)
6. Budget created (version 1)
7. Contract generated and signed
8. Event imported (PDF/CSV) → BattleBoard created
9. Staff assigned (EventStaffAssignment)
10. Timeline created (EventTimeline, TimelineTask)
11. Event executed
12. Post-event: EventProfitability calculated
13. Post-event: EventSummary generated (AI)
14. Post-event: EventReport completed
```

### Budget Versioning

```
1. Initial budget created (version: 1, status: "draft")
2. Budget approved (status: "active")
3. Client requests change → new version created (version: 2, status: "draft")
4. Version 2 approved (status: "active")
5. Old version remains for audit trail (status: "superseded")
```

### Contract Signature Flow

```
1. EventContract created (status: "draft")
2. Document generated (PDF, DocuSign, etc.)
3. Document URL stored in `documentUrl`
4. Client signs → ContractSignature record created
5. Contract status updated to "signed"
6. All signatures captured (multiple signers possible)
```

### Battle Board Import Flow

```
1. TPP PDF or CSV uploaded → EventImport record created
2. Parser extracts data → creates BattleBoard record
3. boardData populated with parsed JSON
4. schema_version set to current format
5. Event linked (if exists) or board saved as template
6. Command boards created from battle board data
7. Timeline tasks created from battle board milestones
```

---

## Performance

### Hot Paths

**Event Dashboard Queries:**
- Filter events by date range, status, assigned staff
- **Index needed**: `(tenantId, eventDate, status, assignedTo)`
- **Current**: Only `(tenantId, venueId)` indexed

**Budget Queries:**
- Get active budget for event
- **Index exists**: `(tenantId, eventId)` ✓
- **Query pattern**: `WHERE status = 'active' AND eventId = ?`

**Guest List Queries:**
- Filter by dietary restrictions for allergen checking
- **Index exists**: `(dietaryRestrictions)` GIN - **MISSING tenantId prefix**
- **Query pattern**: `WHERE dietaryRestrictions @> '["nuts"]'`

**Battle Board Queries:**
- Search boards by tags
- **Index exists**: `(tags)` GIN - **MISSING tenantId prefix**
- **Query pattern**: `WHERE tags @> '["wedding"]'`

### Missing Indexes

**Critical:**
- `Event`: `(tenantId, eventDate, status)` for dashboard queries
- `Event`: `(tenantId, clientId)` for client event history
- `EventGuest`: `(tenantId, eventId)` for guest list queries
- `EventStaffAssignment`: `(tenantId, eventId)` for staff assignments
- `EventTimeline`: `(tenantId, eventId, sortOrder)` for timeline queries
- `TimelineTask`: `(tenantId, eventId, status)` for task tracking
- `CateringOrder`: `(tenantId, order_status, delivery_date)` for order management

**Secondary:**
- All GIN indexes should include `tenantId` prefix
- `EventProfitability`: `(tenantId, eventId, calculatedAt DESC)`
- `EventSummary`: `(tenantId, eventId, generatedAt DESC)`

---

## TODOs

### Critical Priority

- [ ] **FIX venue_id vs location_id confusion**
  - [ ] Audit data: Compare locationId vs venueId values
  - [ ] Decide semantics: preparation location vs event location
  - [ ] Migrate data to chosen field
  - [ ] Remove duplicate relation and unused field
  - [ ] Remove redundant `venueName` and `venueAddress` columns

- [ ] **Move BudgetAlert to tenant_events schema**
  - [ ] Currently in tenant_staff (wrong domain)
  - [ ] Create migration to move table
  - [ ] Update foreign keys in EventBudget

- [ ] **Add missing foreign keys**
  - [ ] EventGuest.eventId → Event.id
  - [ ] EventContract.clientId → Client.id
  - [ ] EventStaffAssignment.eventId → Event.id
  - [ ] EventStaffAssignment.employeeId → User.id
  - [ ] EventTimeline.eventId → Event.id
  - [ ] TimelineTask.eventId → Event.id
  - [ ] TimelineTask.assigneeId → User.id
  - [ ] CateringOrder.eventId → Event.id
  - [ ] CateringOrder.customer_id → Client.id or User.id
  - [ ] event_dishes.event_id → Event.id
  - [ ] event_dishes.dish_id → Dish.id

- [ ] **Add missing indexes (see Performance section)**
  - [ ] All tenant-prefixed composite indexes
  - [ ] GIN indexes with tenantId prefix

### High Priority

- [ ] **Rename event_dishes to EventDish**
  - [ ] Consistency with other table names
  - [ ] Migration required

- [ ] **Remove redundant venue fields from CateringOrder**
  - [ ] Add locationId FK to Location table
  - [ ] Migrate data from venue_name, venue_address, etc.
  - [ ] Drop redundant columns

- [ ] **Add database constraints**
  - [ ] EventGuest: Only one `isPrimaryContact: true` per event
  - [ ] EventBudget: Only one `status: 'active'` budget per event
  - [ ] Check constraints on status fields

### Medium Priority

- [ ] **Consider moving EventImport.content to object storage**
  - [ ] Large files will degrade database performance
  - [ ] Use S3 or similar for production
  - [ ] Keep URL only in database

- [ ] **Add JSON schema validation**
  - [ ] BattleBoard.boardData schema validation
  - [ ] CommandBoardCard.metadata schema validation
  - [ ] Use PostgreSQL JSONB constraints or application layer

- [ ] **Improve EventProfitability calculation**
  - [ ] Add trigger to auto-calculate on budget changes
  - [ ] Or use application layer calculation
  - [ ] Document calculation method in code

### Low Priority

- [ ] **Add event numbering**
  - [ ] Auto-generate `eventNumber` (e.g., "EVT-2024-001")
  - [ ] Use sequence or trigger
  - [ ] Make unique per tenant

- [ ] **Add contract numbering**
  - [ ] Auto-generate `contractNumber`
  - [ ] Use sequence or trigger
  - [ ] Make unique per tenant

- [ ] **Add command board templates**
  - [ ] Seed common board templates
  - [ ] Allow tenants to create custom templates
  - [ ] Template gallery

---

## Related Documentation

- [Schema Contract v2](../../legacy-contracts/schema-contract-v2.txt) - Core patterns and conventions
- [Schema Registry v2](../../legacy-contracts/schema-registry-v2.txt) - Table registry
- [Platform Schema](./00-platform.md) - Account and platform tables
- [Core Schema](./01-core.md) - Shared enums and types
- [Tenant CRM Schema](./tenant-crm.md) - Clients, leads, proposals
- [Tenant Kitchen Schema](./03-tenant-kitchen.md) - Menus, dishes, recipes
