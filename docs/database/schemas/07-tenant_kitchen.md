# tenant_kitchen Schema

## Purpose

The `tenant_kitchen` schema provides comprehensive kitchen operations management for catering businesses. It handles recipe management and versioning, prep list generation and tracking, task coordination across events, ingredient and dish catalogs, menu planning, waste tracking, allergen management, and bulk preparation optimization. The schema enables chefs and kitchen staff to scale recipes, plan prep work, track task completion, manage food safety (allergens), and analyze waste for cost control.

## Goals

- **Recipe Management**: Maintain recipe versions with ingredients, steps, costs, and yield calculations
- **Prep Tracking**: Generate prep lists from events/menus, track item completion, manage station assignments
- **Task Coordination**: Create and assign kitchen tasks, support real-time claims and progress updates
- **Menu Planning**: Build menus from dishes, manage dietary tags and allergens, track costs
- **Waste Reduction**: Log waste entries, analyze reasons, track costs for sustainability and profitability
- **Allergen Safety**: Detect allergen conflicts, generate warnings for events and dishes
- **Bulk Preparation**: Combine similar prep tasks across events for efficiency
- **Method Documentation**: Store prep method videos and instructions for staff training

## Rules

### Recipe Management

- Every `Recipe` must have unique `name` per tenant
- `RecipeVersion` uniquely identified by `tenantId + recipeId + versionNumber`
- Recipes can have multiple versions (version numbers auto-increment per recipe)
- `RecipeVersion.isLocked = true` prevents further edits (versioning complete)
- Locked versions record `lockedAt` timestamp and `lockedBy` user
- Recipe ingredients reference `Ingredient.id` and track `quantity`, `unitId`, `wasteFactor`
- `recipe_steps` use snake_case (unique pattern in schema), linked to `recipe_version_id`
- Cost tracking: `RecipeVersion.costPerYield` and `RecipeVersion.totalCost` calculated from ingredients

### Prep Lists and Items

- `PrepList` generated from `Event` menus with `batchMultiplier` for guest count scaling
- `PrepListItem` stores base quantities (from recipe) and scaled quantities (after multiplier)
- Items grouped by `stationId` and `stationName` (e.g., "Hot Line", "Garde Manger")
- `PrepListItem.isCompleted` tracks completion with `completedAt` and `completedBy`
- Dietary substitutions tracked in `PrepListItem.dietarySubstitutions`
- `PrepList.status` workflow: `draft` → `finalized` → `in_progress` → `completed`

### Task Management

- `KitchenTask` represents general kitchen tasks (event-agnostic)
- `PrepTask` represents event-specific prep tasks linked to `dishId`, `recipeVersionId`, `methodId`, `containerId`
- Tasks claimable via `KitchenTaskClaim` (one active claim per task, `releasedAt` null)
- `KitchenTaskProgress` tracks status changes, quantity completions, and notes
- `PrepTask.quantityCompleted` vs `PrepTask.quantityTotal` for progress percentage
- `PrepTask.isEventFinish = true` marks tasks that must complete before event service

### Task Bundling

- `task_bundles` group related tasks for bulk assignment or template reuse
- `task_bundle_items` junction table links bundles to tasks (N:M relationship)
- Bundles can be event-specific or templates (`is_template = true`)

### Menus and Dishes

- `Dish` links to `Recipe.recipeId` (one recipe → multiple dish variants)
- `Dish` stores presentation, service style, dietary tags, allergens, pricing
- `Menu` groups dishes with course ordering via `MenuDish`
- `MenuDish` unique constraint on `tenantId + menuId + dishId` (no duplicates)
- `Dish.minPrepLeadDays` triggers prep list generation in advance

### Waste Tracking

- `WasteEntry` records inventory items discarded with `quantity`, `unitId`, `reasonId`
- `WasteReason` is in `core` schema (shared across tenants)
- Waste entries link to `InventoryItem`, `Event` (if event-related), `Location`
- `unitCost` and `totalCost` calculated for financial reporting
- `loggedBy` tracks employee accountability

### Allergen Management

- `AllergenWarning` generated when dish allergens conflict with guest restrictions
- `warningType`: `dish_contains_allergen`, `substitution_available`, `cross_contamination_risk`
- `severity`: `info`, `warning`, `critical`
- `isAcknowledged` requires chef acknowledgment before service
- `resolved` tracks if warning was addressed (e.g., dish removed, substitution made)

### Ingredients and Methods

- `Ingredient` stores base catalog with `allergens[]`, `defaultUnitId`, `densityGPerMl`, `shelfLifeDays`
- `PrepMethod` defines preparation techniques (e.g., "Blanch", "Sauté", "Brine")
- `PrepMethod.requiresCertification[]` tracks required staff certifications
- `Container` tracks physical containers ( gastronorm pans, hotel pans, serving platters)
- `Container.capacityVolumeMl`, `capacityWeightG`, `capacityPortions` for yield planning

### Bulk Combine Rules

- `bulk_combine_rules` defines criteria to combine similar prep tasks across events
- `match_criteria` JSON stores matching logic (e.g., same ingredient, similar quantity ranges)
- `is_automatic = true` triggers auto-combination during prep list generation
- Used for efficiency: e.g., combine " dice 10kg onions" across 3 events into single 30kg batch

### Import Tracking

- `prep_list_imports` tracks external system imports (e.g., from legacy catering software)
- `source_system` identifies origin (e.g., "caterease", "flexible")
- `external_id` links to source system record ID
- `import_metadata` JSON stores additional context

## Decisions

### Why Separate Recipe and Dish?

- **Tradeoff**: More joins vs cleaner separation of concerns
- **Decision**: `Recipe` = culinary instructions, `Dish` = menu presentation variant
- **Rationale**: One recipe (e.g., "Beef Tenderloin") can become multiple dishes (e.g., "Beef Tenderloin with Red Wine Reduction", "Beef Slider", "Beef Carpaccio")
- **Benefit**: Recipe versioning independent of menu pricing/presentation changes

### Why Recipe Versioning with Locking?

- **Tradeoff**: Complexity vs audit trail integrity
- **Decision**: `RecipeVersion.isLocked` prevents edits after versioning
- **Rationale**: Catering requires reproducible results; changing a recipe mid-event causes disasters
- **Benefit**: Cost calculations, prep lists, and allergen data remain consistent for locked versions

### Why PrepTask Separate from KitchenTask?

- **Tradeoff**: Two task tables vs single table with type flag
- **Decision**: `PrepTask` for event-specific prep, `KitchenTask` for general tasks
- **Rationale**: Prep tasks have event context, scaling, dish/method/container references; kitchen tasks are simpler
- **Benefit**: Prep tasks can be auto-generated from menus; kitchen tasks manually created

### Why Separate PrepList and PrepTask?

- **Tradeoff**: Potential duplication vs clear separation of planning and execution
- **Decision**: `PrepList` = ingredient aggregation (what to prep), `PrepTask` = actionable tasks (who does what)
- **Rationale**: Prep lists organize ingredients by station; tasks assign work to employees with timing
- **Benefit**: Prep lists can be generated without employee assignments; tasks added later

### Why WasteEntry in tenant_kitchen Not tenant_inventory?

- **Tradeoff**: Cross-schema dependency vs domain alignment
- **Decision**: `WasteEntry` lives in `tenant_kitchen` but references `InventoryItem`
- **Rationale**: Waste logging is a kitchen operation (staff during prep/service), not pure inventory
- **Benefit**: Waste queries join with kitchen tasks, events, and menus for context

### Why BulkCombineRules in tenant_kitchen?

- **Tradeoff**: Cross-schema dependency vs domain alignment
- **Decision**: `bulk_combine_rules` lives in `tenant_kitchen` but optimizes inventory usage
- **Rationale**: Recipe consolidation is a kitchen workflow concern (batching prep)
- **Note**: Creates cross-schema dependency handled at application layer

### Why recipe_steps Uses snake_case?

- **Tradeoff**: Inconsistent naming vs legacy compatibility
- **Decision**: `recipe_steps` uses snake_case to match legacy database
- **Rationale**: Salvaged from legacy project; renaming would break migrations
- **TODO**: Standardize to camelCase in future migration

## Relations

### Internal to tenant_kitchen

- `Recipe` ← `RecipeVersion` (1:N) - version history
- `RecipeVersion` ← `RecipeIngredient` (1:N) - ingredient list
- `RecipeVersion` ← `recipe_steps` (1:N) - preparation instructions
- `Recipe` ← `Dish` (1:N) - menu presentation variants
- `Ingredient` ← `RecipeIngredient` (1:N) - used in recipes
- `PrepMethod` ← `PrepTask` (1:N) - preparation technique
- `Container` ← `PrepTask` (1:N) - storage/holding containers
- `Dish` ← `MenuDish` (1:N) - menu membership
- `Menu` ← `MenuDish` (1:N) - dishes in menu
- `MenuDish` ← `Dish` (N:1 via `dishId`) - dish reference
- `MenuDish` ← `Menu` (N:1 via `menuId`) - menu reference
- `PrepList` ← `PrepListItem` (1:N) - prep list items
- `KitchenTask` ← `KitchenTaskClaim` (1:N) - task claims (active/inactive)
- `KitchenTask` ← `KitchenTaskProgress` (1:N) - progress history
- `PrepTask` ← `PrepComment` (1:N) - staff comments
- `task_bundles` ← `task_bundle_items` (1:N) - bundled tasks
- `PrepMethod` ← `method_videos` (1:N) - training videos
- `AllergenWarning` → `Dish` (optional) - dish-specific warnings

### Cross-Schema Relations

#### tenant_events

- `PrepList` → `Event` (prep lists for events)
- `PrepTask` → `Event` (event-specific prep tasks)
- `task_bundles` → `Event` (event-specific bundles)
- `AllergenWarning` → `Event` (event-level warnings)
- `WasteEntry` → `Event` (event-related waste)
- `Menu` → `Event` (menus assigned to events via events table)

#### tenant_inventory

- `RecipeIngredient` → `InventoryItem` (ingredients from inventory catalog)
- `WasteEntry` → `InventoryItem` (waste logged against items)
- `PrepListItem` → `Ingredient` (ingredient references)
- `Container` → `Location` (containers located at kitchens)

#### tenant_staff

- `KitchenTaskClaim.employeeId` → `Employee` (staff claiming tasks)
- `KitchenTaskProgress.employeeId` → `Employee` (staff updating progress)
- `PrepComment.employeeId` → `Employee` (staff comments)
- `PrepListItem.completedBy` → `Employee` (completion tracking)

#### public

- All tables → `Account` (tenant isolation via `tenantId`)
- `PrepMethod` → `User` (via `lockedBy` for certification validation)

## Lifecycle

### Recipe Creation and Versioning

1. Create `Recipe` with `name`, `category`, `cuisineType`, `tags`
2. Create initial `RecipeVersion` with `versionNumber = 1`
3. Add `RecipeIngredient` records for each ingredient (quantity, unit, waste factor)
4. Add `recipe_steps` for preparation instructions (step_number, instruction, duration, temperature)
5. Calculate costs: `RecipeIngredient.ingredientCost` × `quantity` → `RecipeVersion.totalCost`
6. Calculate `RecipeVersion.costPerYield` = `totalCost / yieldQuantity`
7. When recipe finalized: set `RecipeVersion.isLocked = true`, `lockedAt = now()`, `lockedBy = userId`
8. To edit: create new `RecipeVersion` with incremented `versionNumber`

### Dish and Menu Creation

1. Create `Recipe` and `RecipeVersion` (culinary instructions)
2. Create `Dish` linked to `Recipe.recipeId`
3. Set dish attributes: `serviceStyle`, `defaultContainerId`, `dietaryTags`, `allergens`, `pricePerPerson`
4. Create `Menu` with `name`, `category`, `basePrice`, `minGuests`, `maxGuests`
5. Add `MenuDish` records linking dishes to menu with `course` and `sortOrder`
6. Assign menu to `Event` via event-menu relationship

### Event Prep List Generation

1. Event confirmed with menu selection
2. Calculate `batchMultiplier` based on guest count vs menu base
3. Create `PrepList` linked to `Event` with `batchMultiplier`
4. For each dish in menu:
   - Fetch `RecipeVersion` ingredients
   - Scale quantities by `batchMultiplier`
   - Create `PrepListItem` with `baseQuantity`, `scaledQuantity`, `stationId`
   - Set `PrepListItem.allergens` from dish and ingredient allergens
5. Apply `bulk_combine_rules` to merge similar items across dishes
6. Finalize `PrepList` (set `status = finalized`, `finalizedAt`)

### Task Assignment and Execution

1. Generate `PrepTask` records from `PrepListItem` (one task per item or grouped)
2. Set `PrepTask.startByDate` and `dueByDate` based on event timing
3. Staff claims task: create `KitchenTaskClaim` with `claimedAt = now()`, `releasedAt = null`
4. Real-time updates: publish claim to Ably via outbox pattern
5. Staff updates progress: create `KitchenTaskProgress` records
   - `progressType = "status_change"`: `oldStatus → newStatus`
   - `progressType = "quantity_update"`: `quantityCompleted` delta
6. Complete task: set `PrepTask.status = "done"`, `completedAt = now()`
7. Release claim: set `KitchenTaskClaim.releasedAt`, `releaseReason`
8. Publish progress updates to Ably for real-time dashboard

### Waste Logging

1. Staff discards food item during prep/service
2. Create `WasteEntry` with `inventoryItemId`, `quantity`, `unitId`, `reasonId`
3. Set `locationId` (kitchen), `eventId` (if event-related), `loggedBy` (employee)
4. Calculate `unitCost` from `InventoryItem.unitCost`
5. Calculate `totalCost = quantity × unitCost`
6. (Optional) Attach to event for profitability analysis
7. Generate waste report by reason, item, employee for cost control

### Allergen Warning Generation

1. Event created with guest dietary restrictions (`EventGuest.allergenRestrictions`)
2. Menu selected with dishes containing allergens (`Dish.allergens`, `Ingredient.allergens`)
3. System detects conflicts: dish allergens intersect guest restrictions
4. Create `AllergenWarning` with:
   - `eventId`, `dishId` (if dish-specific)
   - `allergens[]` (conflicting allergens)
   - `affectedGuests[]` (guest IDs with restrictions)
   - `severity = "critical"` if life-threatening allergen (nuts, shellfish)
5. Chef acknowledges: set `isAcknowledged = true`, `acknowledgedBy`, `acknowledgedAt`
6. Resolution: mark `resolved = true`, add `overrideReason` if dish kept on menu
7. Prevent event confirmation if unacknowledged critical warnings exist

## Performance

### Indexes

**Hot Paths:**

- `kitchen_tasks_tags_idx` (GIN) - tag-based filtering
- `prep_tasks_event_idx` - event prep list queries
- `prep_tasks_location_idx` - location-specific tasks
- `prep_list_items_prep_list_idx` - prep list item retrieval
- `prep_list_items_is_completed_idx` - completion tracking
- `task_claims_task_idx` - active claim lookups
- `task_progress_tenant_task_created_idx` - progress history queries
- `recipe_ingredients_ingredient_idx` - reverse lookup (what recipes use this ingredient?)
- `allergen_warnings_event_idx` - event allergen checks
- `allergen_warnings_is_acknowledged_idx` - unacknowledged warnings
- `allergen_warnings_allergens_idx` (GIN) - allergen-based filtering
- `waste_entries_inventory_item_idx` - item waste history
- `waste_entries_tenant_logged_at_idx` - recent waste queries
- `task_bundle_items_tenant_bundle_idx` - bundle task lookups
- `task_bundle_items_tenant_task_idx` - reverse lookup (task in which bundles?)
- `containers_location_idx` - location-specific containers

**Compound Index Strategy:**

- Most queries filter by `tenantId` first (isolation)
- Second filter: eventId, locationId, status, completion flags
- GIN indexes on array columns: `tags`, `allergens`, `dietaryTags`

### Query Patterns

**Recipe Costing:**
```sql
-- Calculate recipe version cost
SELECT
  rv.id,
  SUM(ri.quantity * ii.unit_cost * ri.waste_factor) as total_cost
FROM recipe_versions rv
JOIN recipe_ingredients ri ON ri.recipe_version_id = rv.id
JOIN ingredients i ON i.id = ri.ingredient_id
JOIN inventory_items ii ON ii.id = i.inventory_item_id  -- assumed link
WHERE rv.tenant_id = ? AND rv.recipe_id = ? AND rv.version_number = ?
GROUP BY rv.id
```

**Prep List Generation:**
```sql
-- Generate prep list items from menu dishes
WITH menu_dishes AS (
  SELECT md.dish_id, md.course, md.sort_order
  FROM menu_dishes md
  WHERE md.menu_id = ? AND md.deleted_at IS NULL
),
recipe_ingredients AS (
  SELECT
    ri.ingredient_id,
    ri.quantity * pl.batch_multiplier as scaled_quantity,
    ri.unit_id,
    i.name as ingredient_name,
    i.category
  FROM recipe_ingredients ri
  JOIN recipe_versions rv ON rv.id = ri.recipe_version_id
  JOIN dishes d ON d.recipe_id = rv.recipe_id
  JOIN ingredients i ON i.id = ri.ingredient_id
  JOIN menu_dishes md ON md.dish_id = d.id
  JOIN prep_lists pl ON pl.id = ?
  WHERE rv.tenant_id = ? AND rv.is_locked = true
)
SELECT
  ingredient_id,
  ingredient_name,
  category,
  SUM(scaled_quantity) as total_quantity,
  unit_id
FROM recipe_ingredients
GROUP BY ingredient_id, ingredient_name, category, unit_id
ORDER BY category, ingredient_name
```

**Active Task Claims:**
```sql
-- Fetch tasks with active claims (for real-time dashboard)
SELECT
  kt.id,
  kt.title,
  kt.status,
  kc.employee_id,
  kc.claimed_at
FROM kitchen_tasks kt
JOIN task_claims kc ON kc.task_id = kt.id
WHERE kt.tenant_id = ?
  AND kc.released_at IS NULL
  AND kt.deleted_at IS NULL
ORDER BY kc.claimed_at DESC
```

**Allergen Conflict Detection:**
```sql
-- Find allergen conflicts for event
SELECT
  d.id as dish_id,
  d.name as dish_name,
  array_agg(DISTINCT unnest(d.allergens) || i.allergens) as conflicting_allergens,
  array_agg(DISTINCT eg.id) as affected_guests
FROM dishes d
JOIN menu_dishes md ON md.dish_id = d.id
JOIN menus m ON m.id = md.menu_id
JOIN events e ON e.menu_id = m.id
JOIN event_guests eg ON eg.event_id = e.id
JOIN recipe_versions rv ON rv.id = (SELECT id FROM recipe_versions WHERE recipe_id = d.recipe_id ORDER BY version_number DESC LIMIT 1)
JOIN recipe_ingredients ri ON ri.recipe_version_id = rv.id
JOIN ingredients i ON i.id = ri.ingredient_id
WHERE e.id = ?
  AND (eg.allergen_restrictions && d.allergens OR eg.allergen_restrictions && i.allergens)
GROUP BY d.id, d.name
```

**Waste Analytics:**
```sql
-- Waste by reason for last 30 days
SELECT
  wr.name as reason,
  COUNT(we.id) as entry_count,
  SUM(we.quantity) as total_quantity,
  SUM(we.total_cost) as total_cost
FROM waste_entries we
JOIN waste_reasons wr ON wr.id = we.reason_id
WHERE we.tenant_id = ?
  AND we.logged_at >= NOW() - INTERVAL '30 days'
  AND we.deleted_at IS NULL
GROUP BY wr.name
ORDER BY total_cost DESC
```

### N+1 Query Risks

**Fetching prep list items:**
- ❌ Bad: Query prep list, then N queries for items
- ✅ Good: Single query with `WHERE prep_list_id = ?`

**Recipe ingredient costs:**
- ❌ Bad: Fetch ingredients, then N queries for current unit costs
- ✅ Good: Single query JOIN with `inventory_items`

**Task progress history:**
- ❌ Bad: Fetch tasks, then N queries per task for progress
- ✅ Good: Fetch progress with `task_id IN (...)`, group in application

**Menu dish allergies:**
- ❌ Bad: Fetch dishes, then N queries for allergens
- ✅ Good: Single query with dish IDs, aggregate allergens in application

## TODOs

### High Priority

- [ ] Rename `recipe_steps` to `recipeSteps` for consistency (migration required)
- [ ] Add `RecipeVersion.approvedBy` and `approvedAt` for approval workflow
- [ ] Implement `PrepListItem.dependency_on` for task dependencies (e.g., "make sauce before assembling dish")
- [ ] Add `KitchenTask.recurring_schedule` for repeating tasks (e.g., "Daily prep")
- [ ] Create `PrepList.template` flag for reusable prep list templates

### Medium Priority

- [ ] Add `Container.current_location` tracking (containers move between kitchens)
- [ ] Implement `RecipeIngredient.substitution_id` for ingredient alternatives
- [ ] Add `PrepTask.assigned_employee_id` for pre-assignment (vs claim-based)
- [ ] Create `MethodVideo.transcript` and `MethodVideo.chapters` for searchability
- [ ] Add `AllergenWarning.notification_sent` to track chef alerts

### Low Priority

- [ ] Implement `RecipeVersion.nutrition_info` JSON for nutritional analysis
- [ ] Add `Dish.plating_image_url` for presentation reference
- [ ] Create `PrepMethod.difficulty_rating` for training prioritization
- [ ] Add `task_bundles.auto_assign` flag for automatic employee assignment
- [ ] Implement `PrepList.export_pdf` for printable prep lists

### Technical Debt

- [ ] Move `bulk_combine_rules` to `tenant_inventory` for consistency
- [ ] Standardize `tenant_id` vs `tenantId` naming (currently mixed)
- [ ] Add `recipe_steps.tenant_id` relation to `Account` (currently missing)
- [ ] Consider materialized view for recipe costs (current vs historical)
- [ ] Add `WasteEntry.approval_status` for manager validation before recording
- [ ] Implement soft delete cascade for `recipe_steps` (currently hard delete)

## Schema Diagram

```
tenant_kitchen
│
├── Recipe Management
│   ├── Recipe (recipe catalog)
│   ├── RecipeVersion (versioned recipes with locking)
│   ├── RecipeIngredient (ingredients per version)
│   ├── recipe_steps (preparation instructions)
│   └── Ingredient (ingredient catalog with allergens)
│
├── Menu & Dish
│   ├── Dish (presentation variants of recipes)
│   ├── Menu (menu groups)
│   └── MenuDish (dish-menu junction)
│
├── Prep Planning
│   ├── PrepList (aggregated prep for events)
│   ├── PrepListItem (ingredients to prep by station)
│   ├── PrepListImports (external system imports)
│   └── bulk_combine_rules (batch optimization)
│
├── Task Execution
│   ├── KitchenTask (general tasks)
│   ├── PrepTask (event-specific prep tasks)
│   ├── KitchenTaskClaim (task claims for accountability)
│   ├── KitchenTaskProgress (progress updates)
│   ├── PrepComment (staff communication)
│   ├── task_bundles (task grouping)
│   └── task_bundle_items (bundle-task junction)
│
├── Resources
│   ├── PrepMethod (preparation techniques)
│   ├── method_videos (training videos)
│   └── Container (physical containers)
│
└── Safety & Analytics
    ├── AllergenWarning (allergen conflict detection)
    └── WasteEntry (waste tracking and cost analysis)
```

## Notes

- **Multi-tenant**: All tables include `tenantId` with indexes for isolation
- **Soft Deletes**: Tables use `deletedAt` (filter with `WHERE deleted_at IS NULL`)
- **Audit Trail**: Most tables have `createdAt`, `updatedAt` timestamps
- **ID Strategy**: UUIDs generated via `gen_random_uuid()` PostgreSQL function
- **Naming Inconsistency**: `recipe_steps` uses snake_case (legacy), should be `recipeSteps`
- **Real-time**: Task claims and progress updates published to Ably via outbox pattern
- **Cross-Schema**: `WasteEntry` links to `InventoryItem` (tenant_inventory), `Event` (tenant_events)
- **Cost Tracking**: Recipe costs calculated from ingredients; waste costs from inventory
- **Allergen Safety**: Multi-layer allergen tracking (ingredients → dishes → menus → events → guests)
- **Bulk Prep**: `bulk_combine_rules` optimizes prep across events for efficiency
- **Mobile Priority**: `PrepListItem` designed for mobile-first kitchen displays
- **Versioning**: Recipe versions locked to prevent mid-event changes
- **Task Claims**: One active claim per task ensures accountability
- **Station-based**: Prep items organized by station (hot line, cold station, pastry)
