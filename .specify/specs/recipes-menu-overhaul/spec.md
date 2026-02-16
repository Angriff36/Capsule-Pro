# Feature Specification: Recipes & Menu Overhaul

**Feature ID**: 002
**Feature Name**: recipes-menu-overhaul
**Created**: 2026-01-25
**Status**: Draft

## Executive Summary

Comprehensive overhaul of the recipes, dishes, ingredients, and menus module to match enterprise catering software standards (benchmarked against Parsley Software). Focus on UI/UX polish, missing CRUD operations, bulk operations, import/export, and the completely unimplemented Menus feature.

## Problem Statement

The current recipes/menu implementation has significant gaps:

1. **Menus Tab**: Completely unimplemented (placeholder only)
2. **Recipe Editing**: Can create but cannot edit recipes
3. **UI Polish**: Lacks visual weight, poor feature distinction, unpolished feel
4. **Bulk Operations**: No bulk combining ingredients, no batch operations
5. **Import/Export**: Minimal import cleanup, no proper import wizard
6. **Interactive Elements**: Many UI elements are not clickable/actionable
7. **Sub-recipes**: No support for recipes within recipes
8. **Recipe Comparison**: Cannot compare recipe versions or alternatives
9. **Unit Conversion UI**: Backend exists but no user-facing conversion tools
10. **Scaling UI**: API exists but no UI for scaling recipes

## Research: Parsley Software Analysis

**Key Features to Emulate:**

### Recipe Management
- Centralized repository with search, edit, compare
- Automatic unit conversion (volume/weight, metric/imperial)
- Recipe scaling with auto-adjusted prep instructions
- Nutrition facts and allergen auto-calculation
- Read-only access for kitchen staff
- Recipe versioning with comparison

### Production Planning
- Automated prep lists from recipes
- Production planning for multiple events
- Par level calculations
- Scaled prep instructions

### Cost Control
- Instant cost calculations
- Visual impact of changes on bottom line
- Cost comparison tools

### Ingredient Library
- Built-in ingredient library with conversion factors
- Supplier packaging alignment
- Allergen tracking
- Yield tracking

### Menus (Our Gap)
- Bundle dishes into event-ready collections
- Menu pricing tiers
- Dietary breakdowns
- Serving calculations per event size

## User Stories

### US1: Recipe Editing
**As a** kitchen manager
**I want to** edit existing recipes
**So that** I can update ingredients, steps, and metadata without recreating recipes

**Acceptance Criteria:**
- [ ] AC-1.1: Edit button on recipe cards opens edit modal pre-populated with data
- [ ] AC-1.2: Can modify all fields: name, category, tags, yield, times, difficulty
- [ ] AC-1.3: Can add/remove/reorder ingredients
- [ ] AC-1.4: Can add/remove/reorder steps
- [ ] AC-1.5: Can replace recipe image
- [ ] AC-1.6: Creates new version on save (versioning)
- [ ] AC-1.7: Outbox event enqueued: `recipe.updated`

### US2: Recipe Detail Page Enhancement
**As a** chef
**I want to** view comprehensive recipe details
**So that** I can see all information in one place with proper visual hierarchy

**Acceptance Criteria:**
- [ ] AC-2.1: Hero image with recipe name overlay
- [ ] AC-2.2: Metadata bar: prep time, cook time, servings, difficulty stars
- [ ] AC-2.3: Tabbed interface: Overview | Ingredients | Steps | Costing | History
- [ ] AC-2.4: Ingredients tab shows quantities with unit conversion toggle
- [ ] AC-2.5: Steps tab shows numbered instructions with timers and images
- [ ] AC-2.6: Costing tab shows ingredient costs and total
- [ ] AC-2.7: History tab shows version changes (diff view)
- [ ] AC-2.8: Quick actions: Scale, Print, Duplicate, Archive

### US3: Menus Module Implementation
**As a** catering manager
**I want to** create menus bundling dishes
**So that** I can offer event-ready collections with pricing

**Acceptance Criteria:**
- [ ] AC-3.1: Menu model in schema: id, name, description, category, dishes[], pricing tiers
- [ ] AC-3.2: Menu creation form with dish selection
- [ ] AC-3.3: Menu card grid showing: name, dish count, price range, dietary icons
- [ ] AC-3.4: Menu detail page with dish breakdown
- [ ] AC-3.5: Per-person pricing calculation from dishes
- [ ] AC-3.6: Dietary/allergen summary aggregated from dishes
- [ ] AC-3.7: Menu can be linked to events
- [ ] AC-3.8: Menu PDF export with dish descriptions and pricing

### US4: Bulk Ingredient Operations
**As a** kitchen manager
**I want to** perform bulk operations on ingredients
**So that** I can efficiently manage large ingredient lists

**Acceptance Criteria:**
- [ ] AC-4.1: Multi-select mode on ingredients grid
- [ ] AC-4.2: Bulk merge: combine duplicate ingredients into one
- [ ] AC-4.3: Bulk categorize: assign category to multiple ingredients
- [ ] AC-4.4: Bulk delete: soft-delete selected ingredients
- [ ] AC-4.5: Bulk allergen tagging: add allergens to multiple
- [ ] AC-4.6: Conflict detection during merge (shows affected recipes)

### US5: Recipe Import Wizard
**As a** kitchen manager
**I want to** import recipes from external sources
**So that** I can migrate existing recipe libraries

**Acceptance Criteria:**
- [ ] AC-5.1: CSV import with column mapping UI
- [ ] AC-5.2: Preview import results before committing
- [ ] AC-5.3: Duplicate detection with merge/skip/rename options
- [ ] AC-5.4: Ingredient auto-matching to existing library
- [ ] AC-5.5: Import validation with error highlighting
- [ ] AC-5.6: Import history log for audit

### US6: Recipe Scaling UI
**As a** chef
**I want to** scale recipes in the UI
**So that** I can adjust quantities for different serving sizes

**Acceptance Criteria:**
- [ ] AC-6.1: Scale control on recipe detail page
- [ ] AC-6.2: Input target servings or multiplier
- [ ] AC-6.3: Ingredient quantities update in real-time
- [ ] AC-6.4: Scaled view clearly marked as "scaled" (not original)
- [ ] AC-6.5: Option to save scaled version as new recipe
- [ ] AC-6.6: Maintain original recipe unchanged

### US7: Unit Conversion Display
**As a** chef
**I want to** see ingredients in my preferred units
**So that** I can work with familiar measurements

**Acceptance Criteria:**
- [ ] AC-7.1: Unit toggle on ingredient list (metric/imperial)
- [ ] AC-7.2: Conversion uses ingredient density where applicable
- [ ] AC-7.3: User preference saved for default unit system
- [ ] AC-7.4: Hover shows alternative unit on ingredients

### US8: Sub-Recipes Support
**As a** chef
**I want to** use recipes as ingredients in other recipes
**So that** I can build complex dishes from components

**Acceptance Criteria:**
- [ ] AC-8.1: Recipe can be marked as "sub-recipe"
- [ ] AC-8.2: Sub-recipes appear in ingredient autocomplete
- [ ] AC-8.3: Adding sub-recipe includes its yield as quantity
- [ ] AC-8.4: Costing cascades through sub-recipes
- [ ] AC-8.5: Prep task generation includes sub-recipe prep
- [ ] AC-8.6: Visual indicator for sub-recipe ingredients

### US9: UI/UX Polish
**As a** user
**I want** a polished, professional interface
**So that** the software feels enterprise-grade

**Acceptance Criteria:**
- [ ] AC-9.1: Recipe cards have visual weight (shadows, borders, hover states)
- [ ] AC-9.2: Clear visual distinction between tabs (Recipes/Dishes/Menus/Ingredients)
- [ ] AC-9.3: Empty states have helpful illustrations and CTAs
- [ ] AC-9.4: Loading states with skeleton loaders
- [ ] AC-9.5: Success/error toasts for all actions
- [ ] AC-9.6: Consistent icon usage across module
- [ ] AC-9.7: Keyboard navigation support (arrow keys, enter to select)
- [ ] AC-9.8: Responsive design for tablet/mobile

### US10: Prep Method & Container Management
**As a** kitchen manager
**I want to** manage prep methods and containers
**So that** I can assign them to prep tasks

**Acceptance Criteria:**
- [ ] AC-10.1: Prep Methods CRUD in settings or dedicated page
- [ ] AC-10.2: Container CRUD with capacity tracking
- [ ] AC-10.3: Link prep methods to recipe steps
- [ ] AC-10.4: Link containers to prep tasks
- [ ] AC-10.5: Filter prep tasks by method or container

## Technical Design

### Database Changes

```prisma
// New Menu model (tenant_kitchen schema)
model Menu {
  tenantId      String
  id            String   @default(dbgenerated("gen_random_uuid()"))
  name          String
  description   String?
  category      String?
  isActive      Boolean  @default(true)
  basePrice     Decimal? @db.Decimal(10, 2)
  pricePerPerson Decimal? @db.Decimal(10, 2)
  minGuests     Int?
  maxGuests     Int?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?

  menuDishes    MenuDish[]

  @@id([tenantId, id])
  @@schema("tenant_kitchen")
}

model MenuDish {
  tenantId      String
  id            String   @default(dbgenerated("gen_random_uuid()"))
  menuId        String
  dishId        String
  course        String?  // appetizer, main, dessert
  sortOrder     Int      @default(0)
  isOptional    Boolean  @default(false)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?

  menu          Menu     @relation(fields: [tenantId, menuId], references: [tenantId, id])
  dish          Dish     @relation(fields: [tenantId, dishId], references: [tenantId, id])

  @@id([tenantId, id])
  @@unique([tenantId, menuId, dishId])
  @@schema("tenant_kitchen")
}

// Add to Recipe model
model Recipe {
  // ... existing fields
  isSubRecipe   Boolean  @default(false)
  parentRecipeIngredients RecipeIngredient[] @relation("SubRecipeIngredients")
}

// Modify RecipeIngredient
model RecipeIngredient {
  // ... existing fields
  subRecipeId   String?  // If this ingredient is actually a sub-recipe
  subRecipe     Recipe?  @relation("SubRecipeIngredients", fields: [tenantId, subRecipeId], references: [tenantId, id])
}
```

### New Server Actions

```typescript
// apps/app/app/(authenticated)/kitchen/recipes/actions.ts

// Recipe editing
export async function updateRecipe(recipeId: string, formData: FormData)
export async function duplicateRecipe(recipeId: string)
export async function archiveRecipe(recipeId: string)

// Recipe scaling
export async function scaleRecipe(recipeVersionId: string, targetServings: number)
export async function saveScaledRecipe(recipeVersionId: string, targetServings: number, newName: string)

// Menus
export async function createMenu(formData: FormData)
export async function updateMenu(menuId: string, formData: FormData)
export async function addDishToMenu(menuId: string, dishId: string, course?: string)
export async function removeDishFromMenu(menuId: string, dishId: string)

// Bulk operations
export async function bulkMergeIngredients(targetId: string, sourceIds: string[])
export async function bulkCategorizeIngredients(ingredientIds: string[], category: string)
export async function bulkDeleteIngredients(ingredientIds: string[])
export async function bulkTagAllergens(ingredientIds: string[], allergens: string[])

// Import
export async function importRecipesFromCSV(formData: FormData)
export async function previewImport(formData: FormData)
```

### New API Routes

```
POST /api/kitchen/recipes/[recipeId]/duplicate
POST /api/kitchen/recipes/[recipeId]/archive
POST /api/kitchen/recipes/import
POST /api/kitchen/recipes/import/preview

GET/POST /api/kitchen/menus
GET/PUT/DELETE /api/kitchen/menus/[menuId]
POST /api/kitchen/menus/[menuId]/dishes
DELETE /api/kitchen/menus/[menuId]/dishes/[dishId]
GET /api/kitchen/menus/[menuId]/export/pdf

POST /api/kitchen/ingredients/bulk/merge
POST /api/kitchen/ingredients/bulk/categorize
POST /api/kitchen/ingredients/bulk/delete
POST /api/kitchen/ingredients/bulk/allergens
```

### UI Components Needed

```
components/
  kitchen/
    recipes/
      recipe-edit-modal.tsx        # Full edit modal
      recipe-detail-tabs.tsx       # Tabbed detail view
      recipe-scale-control.tsx     # Scaling slider/input
      recipe-version-history.tsx   # Version diff viewer
      recipe-card-enhanced.tsx     # Polished card component
    menus/
      menu-card.tsx                # Menu display card
      menu-editor.tsx              # Menu creation/edit form
      menu-dish-selector.tsx       # Dish picker for menus
      menu-pricing-breakdown.tsx   # Price calculator
      menu-dietary-summary.tsx     # Allergen/dietary aggregator
    ingredients/
      ingredient-bulk-toolbar.tsx  # Bulk action buttons
      ingredient-merge-modal.tsx   # Merge confirmation
      ingredient-multi-select.tsx  # Selection state manager
    import/
      import-wizard.tsx            # Step-by-step import
      import-column-mapper.tsx     # CSV column mapping
      import-preview-table.tsx     # Preview before commit
      import-conflict-resolver.tsx # Duplicate handling
    shared/
      unit-toggle.tsx              # Metric/imperial switch
      difficulty-stars.tsx         # Star rating display
      time-badges.tsx              # Prep/cook time badges
      skeleton-card.tsx            # Loading placeholder
```

## Phases

### Phase 1: Recipe Editing & UI Polish (Foundation)
- US1: Recipe Editing
- US2: Recipe Detail Page Enhancement
- US9: UI/UX Polish (partial - cards, loading states)

### Phase 2: Menus Module (Major Feature)
- US3: Menus Module Implementation

### Phase 3: Bulk Operations & Import
- US4: Bulk Ingredient Operations
- US5: Recipe Import Wizard

### Phase 4: Advanced Features
- US6: Recipe Scaling UI
- US7: Unit Conversion Display
- US8: Sub-Recipes Support
- US10: Prep Method & Container Management

## Success Metrics

1. **Usability**: Users can complete recipe CRUD without support requests
2. **Feature Parity**: Menus module fully functional
3. **Efficiency**: Bulk operations reduce ingredient management time by 50%
4. **Polish**: No "unpolished" feedback in user testing
5. **Import**: Users can migrate recipe libraries from other systems

## Out of Scope

- Nutrition tracking (future feature)
- Label printing/generation
- POS integration
- Multi-location support (future)
- Mobile-native app (web responsive only)

## Dependencies

- @repo/database: Schema migrations
- @repo/realtime: Outbox events for recipe changes
- @repo/storage: Image uploads
- Existing auth/tenant infrastructure

## References

- Parsley Software: https://www.parsleysoftware.com/
- Parsley Videos: https://www.parsleysoftware.com/videos/
- Current implementation: apps/app/app/(authenticated)/kitchen/recipes/
- Schema: packages/database/prisma/schema.prisma
