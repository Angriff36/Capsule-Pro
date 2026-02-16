# Technical Plan: Recipes & Menu Overhaul

Feature ID: 002
Spec Version: 1.0
Constitution Version: 1.0.0

---

## Executive Summary

Comprehensive overhaul of the recipes, dishes, ingredients, and menus module to reach enterprise catering software parity (benchmarked against Parsley Software). The plan prioritizes:

1. **Phase 1** - Recipe Editing & UI Polish (critical foundation)
2. **Phase 2** - Menus Module (major missing feature)
3. **Phase 3** - Bulk Operations & Import (efficiency gains)
4. **Phase 4** - Advanced Features (scaling, sub-recipes, unit conversion UI)

**Critical Path**: Phase 1 must complete before Phase 2 since menus depend on polished dish/recipe cards.

---

## 1. Architecture Overview

### 1.1 High-Level Design

```
+-------------------+     +------------------+     +------------------+
|   Recipe Editor   |---->|  RecipeVersion   |---->|   Ingredients    |
|   (Edit Modal)    |     |  (Versioning)    |     |   (Library)      |
+-------------------+     +------------------+     +------------------+
         |                        |                        |
         v                        v                        v
+-------------------+     +------------------+     +------------------+
|   Recipe Detail   |     |   Recipe Steps   |     |   Allergen/Unit  |
|   (Tabbed View)   |     |   (Ordered)      |     |   (core schema)  |
+-------------------+     +------------------+     +------------------+
         |
         v
+-------------------+     +------------------+     +------------------+
|      Dishes       |---->|      Menus       |---->|     Events       |
|   (Service-ready) |     |  (Dish bundles)  |     |   (Scheduling)   |
+-------------------+     +------------------+     +------------------+
```

### 1.2 Key Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Menus in `tenant_kitchen` schema | Follows domain grouping [C§4.1] | `tenant_events` - rejected: menus are kitchen assets |
| Version on save (not auto-draft) | Simpler UX, explicit user control | Auto-save with drafts - more complex |
| Soft delete only | Required by constitution [C§2.1] | Hard delete - prohibited |
| Server Actions for mutations | Existing pattern in codebase | API routes - less consistency |
| Outbox for realtime events | Required by constitution [C§2.1] | Direct Ably - prohibited |

---

## 2. Database Changes

### 2.1 New Models

#### Menu (tenant_kitchen schema)

```prisma
model Menu {
  tenantId        String    @map("tenant_id") @db.Uuid
  id              String    @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name            String
  description     String?
  category        String?
  imageUrl        String?   @map("image_url")
  isActive        Boolean   @default(true) @map("is_active")
  basePrice       Decimal?  @map("base_price") @db.Decimal(10, 2)
  pricePerPerson  Decimal?  @map("price_per_person") @db.Decimal(10, 2)
  minGuests       Int?      @map("min_guests")
  maxGuests       Int?      @map("max_guests")
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt       DateTime? @map("deleted_at") @db.Timestamptz(6)
  tenant          Account   @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  menuDishes      MenuDish[]

  @@id([tenantId, id])
  @@map("menus")
  @@schema("tenant_kitchen")
}
```

#### MenuDish (tenant_kitchen schema)

```prisma
model MenuDish {
  tenantId    String    @map("tenant_id") @db.Uuid
  id          String    @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  menuId      String    @map("menu_id") @db.Uuid
  dishId      String    @map("dish_id") @db.Uuid
  course      String?   // appetizer, main, dessert, etc.
  sortOrder   Int       @default(0) @map("sort_order") @db.SmallInt
  isOptional  Boolean   @default(false) @map("is_optional")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt   DateTime? @map("deleted_at") @db.Timestamptz(6)
  tenant      Account   @relation(fields: [tenantId], references: [id], onDelete: Restrict)

  @@id([tenantId, id])
  @@unique([tenantId, menuId, dishId])
  @@index([menuId])
  @@index([dishId])
  @@map("menu_dishes")
  @@schema("tenant_kitchen")
}
```

### 2.2 Schema Modifications

#### Recipe Model (add sub-recipe support)

```prisma
// Add to existing Recipe model
isSubRecipe   Boolean   @default(false) @map("is_sub_recipe")
```

#### RecipeIngredient Model (add sub-recipe reference)

```prisma
// Add to existing RecipeIngredient model
subRecipeId   String?   @map("sub_recipe_id") @db.Uuid
```

### 2.3 Migration Strategy

| Migration | Phase | Risk | Rollback Plan |
|-----------|-------|------|---------------|
| `add_menus_table` | P2 | Low | Drop table |
| `add_menu_dishes_table` | P2 | Low | Drop table |
| `add_is_sub_recipe_to_recipes` | P4 | Low | Drop column |
| `add_sub_recipe_to_ingredients` | P4 | Low | Drop column |

---

## 3. Components

### 3.1 Phase 1 Components

#### Component: RecipeEditModal
- **Purpose**: Full recipe editing in modal form
- **Location**: `apps/app/app/(authenticated)/kitchen/recipes/components/recipe-edit-modal.tsx`
- **Dependencies**: @repo/design-system, existing actions.ts
- **Constitution**: [C§2.1] - uses soft deletes, tenant isolation

**Interface:**
```typescript
interface RecipeEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeId: string;
  onSave: () => void;
}
```

#### Component: RecipeDetailTabs
- **Purpose**: Tabbed view (Overview | Ingredients | Steps | Costing | History)
- **Location**: `apps/app/app/(authenticated)/kitchen/recipes/[recipeId]/components/recipe-detail-tabs.tsx`
- **Dependencies**: @repo/design-system tabs

#### Component: RecipeScaleControl
- **Purpose**: Slider/input for scaling recipe servings
- **Location**: `apps/app/app/(authenticated)/kitchen/recipes/[recipeId]/components/recipe-scale-control.tsx`
- **Dependencies**: Existing scale API route

#### Component: RecipeVersionHistory
- **Purpose**: Version diff viewer
- **Location**: `apps/app/app/(authenticated)/kitchen/recipes/[recipeId]/components/recipe-version-history.tsx`

#### Component: RecipeCardEnhanced
- **Purpose**: Polished card with shadows, hover states, visual weight
- **Location**: `apps/app/app/(authenticated)/kitchen/recipes/components/recipe-card-enhanced.tsx`

### 3.2 Phase 2 Components

#### Component: MenuCard
- **Purpose**: Display menu with dish count, price range, dietary icons
- **Location**: `apps/app/app/(authenticated)/kitchen/recipes/components/menu-card.tsx`

#### Component: MenuEditor
- **Purpose**: Menu creation/editing form with dish picker
- **Location**: `apps/app/app/(authenticated)/kitchen/recipes/menus/components/menu-editor.tsx`

#### Component: MenuDishSelector
- **Purpose**: Multi-select dish picker with course assignment
- **Location**: `apps/app/app/(authenticated)/kitchen/recipes/menus/components/menu-dish-selector.tsx`

#### Component: MenuPricingBreakdown
- **Purpose**: Price calculator from dishes
- **Location**: `apps/app/app/(authenticated)/kitchen/recipes/menus/components/menu-pricing-breakdown.tsx`

#### Component: MenuDietarySummary
- **Purpose**: Aggregated allergen/dietary display
- **Location**: `apps/app/app/(authenticated)/kitchen/recipes/menus/components/menu-dietary-summary.tsx`

### 3.3 Phase 3 Components

#### Component: IngredientBulkToolbar
- **Purpose**: Bulk action buttons (merge, categorize, delete, tag)
- **Location**: `apps/app/app/(authenticated)/kitchen/recipes/components/ingredient-bulk-toolbar.tsx`

#### Component: IngredientMergeModal
- **Purpose**: Merge confirmation with conflict detection
- **Location**: `apps/app/app/(authenticated)/kitchen/recipes/components/ingredient-merge-modal.tsx`

#### Component: ImportWizard
- **Purpose**: Step-by-step CSV import
- **Location**: `apps/app/app/(authenticated)/kitchen/recipes/import/components/import-wizard.tsx`

#### Component: ImportColumnMapper
- **Purpose**: CSV column mapping UI
- **Location**: `apps/app/app/(authenticated)/kitchen/recipes/import/components/import-column-mapper.tsx`

### 3.4 Shared Components

#### Component: UnitToggle
- **Purpose**: Metric/imperial switch
- **Location**: `apps/app/app/(authenticated)/kitchen/recipes/components/unit-toggle.tsx`

#### Component: DifficultyStars
- **Purpose**: Star rating display (1-5)
- **Location**: `apps/app/app/(authenticated)/kitchen/recipes/components/difficulty-stars.tsx`

#### Component: TimeBadges
- **Purpose**: Prep/cook time badges
- **Location**: `apps/app/app/(authenticated)/kitchen/recipes/components/time-badges.tsx`

#### Component: SkeletonCard
- **Purpose**: Loading placeholder matching card dimensions
- **Location**: `apps/app/app/(authenticated)/kitchen/recipes/components/skeleton-card.tsx`

---

## 4. Server Actions

### 4.1 Phase 1 Actions

```typescript
// apps/app/app/(authenticated)/kitchen/recipes/actions.ts

// Recipe editing (ADD to existing file)
export async function updateRecipe(recipeId: string, formData: FormData): Promise<void>
export async function duplicateRecipe(recipeId: string): Promise<{ newRecipeId: string }>
export async function archiveRecipe(recipeId: string): Promise<void>
export async function toggleRecipeFavorite(recipeId: string): Promise<void>
```

### 4.2 Phase 2 Actions

```typescript
// apps/app/app/(authenticated)/kitchen/recipes/menus/actions.ts

export async function createMenu(formData: FormData): Promise<void>
export async function updateMenu(menuId: string, formData: FormData): Promise<void>
export async function deleteMenu(menuId: string): Promise<void>
export async function addDishToMenu(menuId: string, dishId: string, course?: string): Promise<void>
export async function removeDishFromMenu(menuId: string, dishId: string): Promise<void>
export async function reorderMenuDishes(menuId: string, dishOrder: string[]): Promise<void>
```

### 4.3 Phase 3 Actions

```typescript
// apps/app/app/(authenticated)/kitchen/recipes/ingredients/actions.ts

export async function bulkMergeIngredients(targetId: string, sourceIds: string[]): Promise<void>
export async function bulkCategorizeIngredients(ids: string[], category: string): Promise<void>
export async function bulkDeleteIngredients(ids: string[]): Promise<void>
export async function bulkTagAllergens(ids: string[], allergens: string[]): Promise<void>

// apps/app/app/(authenticated)/kitchen/recipes/import/actions.ts
export async function previewImport(formData: FormData): Promise<ImportPreview>
export async function commitImport(formData: FormData): Promise<void>
```

---

## 5. API Routes

### 5.1 New Routes

| Route | Method | Purpose | Phase |
|-------|--------|---------|-------|
| `/api/kitchen/recipes/[id]/duplicate` | POST | Clone recipe | P1 |
| `/api/kitchen/recipes/[id]/archive` | POST | Soft delete | P1 |
| `/api/kitchen/menus` | GET/POST | List/Create menus | P2 |
| `/api/kitchen/menus/[id]` | GET/PUT/DELETE | CRUD menu | P2 |
| `/api/kitchen/menus/[id]/dishes` | POST | Add dish | P2 |
| `/api/kitchen/menus/[id]/dishes/[dishId]` | DELETE | Remove dish | P2 |
| `/api/kitchen/menus/[id]/export/pdf` | GET | PDF export | P2 |
| `/api/kitchen/ingredients/bulk/merge` | POST | Merge ingredients | P3 |
| `/api/kitchen/ingredients/bulk/categorize` | POST | Bulk categorize | P3 |
| `/api/kitchen/ingredients/bulk/allergens` | POST | Bulk tag | P3 |
| `/api/kitchen/recipes/import/preview` | POST | Preview CSV | P3 |
| `/api/kitchen/recipes/import` | POST | Commit import | P3 |

---

## 6. Phase Breakdown

### Phase 1: Recipe Editing & UI Polish (Foundation)

**Duration**: ~2 weeks
**Dependencies**: None
**User Stories**: US1, US2, US9 (partial)

#### Tasks

| # | Task | Files | Est. |
|---|------|-------|------|
| 1.1 | Add `updateRecipe` server action | `actions.ts` | 4h |
| 1.2 | Wire edit button to open modal with pre-populated data | `page.tsx`, new modal | 4h |
| 1.3 | Implement ingredient add/remove/reorder in edit modal | modal component | 4h |
| 1.4 | Implement step add/remove/reorder in edit modal | modal component | 4h |
| 1.5 | Add recipe versioning (create new version on save) | `actions.ts`, schema | 4h |
| 1.6 | Enqueue `recipe.updated` outbox event | `actions.ts` | 1h |
| 1.7 | Create RecipeDetailTabs component | new component | 6h |
| 1.8 | Build Overview tab with hero image overlay | component | 3h |
| 1.9 | Build Ingredients tab with unit toggle | component | 3h |
| 1.10 | Build Steps tab with numbered instructions | component | 3h |
| 1.11 | Build Costing tab | component | 4h |
| 1.12 | Build History tab (version diff) | component | 6h |
| 1.13 | Add quick actions (Scale, Print, Duplicate, Archive) | component | 4h |
| 1.14 | Polish recipe cards (shadows, borders, hover) | `recipe-card-enhanced.tsx` | 3h |
| 1.15 | Add skeleton loaders | `skeleton-card.tsx` | 2h |
| 1.16 | Add success/error toasts for all actions | throughout | 2h |
| 1.17 | Consistent icon usage audit | throughout | 2h |
| 1.18 | Keyboard navigation (arrow keys, enter) | components | 4h |
| 1.19 | Responsive design polish | components | 4h |

**Total**: ~67h

#### Quality Gate P1

- [ ] Recipe edit flow works end-to-end
- [ ] Versioning creates new version on save
- [ ] Outbox events enqueued correctly
- [ ] All tabs render correctly
- [ ] Cards have proper visual weight
- [ ] No console errors
- [ ] `pnpm check` passes

---

### Phase 2: Menus Module (Major Feature)

**Duration**: ~2 weeks
**Dependencies**: Phase 1 complete (for polished dish cards)
**User Stories**: US3

#### Tasks

| # | Task | Files | Est. |
|---|------|-------|------|
| 2.1 | Create Prisma migration for Menu, MenuDish | schema.prisma, migration | 2h |
| 2.2 | Add Menu relation to Account | schema.prisma | 1h |
| 2.3 | Create menu server actions | `menus/actions.ts` | 4h |
| 2.4 | Build MenuCard component | `menu-card.tsx` | 4h |
| 2.5 | Build MenuEditor form | `menu-editor.tsx` | 6h |
| 2.6 | Build MenuDishSelector (multi-select dishes) | `menu-dish-selector.tsx` | 6h |
| 2.7 | Implement course assignment (appetizer, main, dessert) | editor | 2h |
| 2.8 | Build MenuPricingBreakdown | `menu-pricing-breakdown.tsx` | 4h |
| 2.9 | Build MenuDietarySummary (aggregate allergens) | `menu-dietary-summary.tsx` | 4h |
| 2.10 | Create menu detail page | `menus/[menuId]/page.tsx` | 6h |
| 2.11 | Replace menus placeholder in main page | `page.tsx` | 2h |
| 2.12 | Add menu count to tabs | `page.tsx` | 1h |
| 2.13 | Implement menu-event linking (optional FK) | schema, actions | 4h |
| 2.14 | Build PDF export endpoint | `api/kitchen/menus/[id]/export/pdf/route.ts` | 8h |
| 2.15 | Add menu to outbox events | actions | 1h |

**Total**: ~55h

#### Quality Gate P2

- [ ] Menu CRUD works end-to-end
- [ ] Dishes can be added/removed from menus
- [ ] Pricing calculation correct
- [ ] Dietary summary aggregates allergens
- [ ] PDF export generates valid document
- [ ] `pnpm check` passes
- [ ] Migration applies cleanly

---

### Phase 3: Bulk Operations & Import

**Duration**: ~2 weeks
**Dependencies**: Phase 1 complete
**User Stories**: US4, US5

#### Tasks

| # | Task | Files | Est. |
|---|------|-------|------|
| 3.1 | Add multi-select mode to ingredients grid | `page.tsx`, new state | 4h |
| 3.2 | Build IngredientBulkToolbar | `ingredient-bulk-toolbar.tsx` | 4h |
| 3.3 | Implement bulkMergeIngredients action | `ingredients/actions.ts` | 6h |
| 3.4 | Build IngredientMergeModal with conflict detection | `ingredient-merge-modal.tsx` | 6h |
| 3.5 | Implement bulkCategorizeIngredients action | actions | 3h |
| 3.6 | Implement bulkDeleteIngredients action | actions | 2h |
| 3.7 | Implement bulkTagAllergens action | actions | 3h |
| 3.8 | Build ImportWizard step container | `import/components/import-wizard.tsx` | 4h |
| 3.9 | Build ImportColumnMapper | `import-column-mapper.tsx` | 6h |
| 3.10 | Build ImportPreviewTable | `import-preview-table.tsx` | 4h |
| 3.11 | Build ImportConflictResolver | `import-conflict-resolver.tsx` | 6h |
| 3.12 | Implement previewImport action | `import/actions.ts` | 4h |
| 3.13 | Implement commitImport action | actions | 4h |
| 3.14 | Add import history log | schema addition, UI | 4h |
| 3.15 | Ingredient auto-matching to library | import logic | 4h |

**Total**: ~64h

#### Quality Gate P3

- [ ] Multi-select works correctly
- [ ] Merge shows affected recipes before confirming
- [ ] Bulk operations update all selected items
- [ ] CSV import maps columns correctly
- [ ] Preview shows validation errors
- [ ] Import creates valid records
- [ ] `pnpm check` passes

---

### Phase 4: Advanced Features

**Duration**: ~2 weeks
**Dependencies**: Phase 1 complete
**User Stories**: US6, US7, US8, US10

#### Tasks

| # | Task | Files | Est. |
|---|------|-------|------|
| 4.1 | Build RecipeScaleControl UI | `recipe-scale-control.tsx` | 4h |
| 4.2 | Connect to existing scale API | component | 2h |
| 4.3 | Real-time ingredient quantity updates | component | 3h |
| 4.4 | "Scaled" badge indicator | component | 1h |
| 4.5 | Save scaled as new recipe action | `actions.ts` | 3h |
| 4.6 | Build UnitToggle component | `unit-toggle.tsx` | 3h |
| 4.7 | Implement unit conversion using density | logic | 4h |
| 4.8 | User preference for default unit system | settings, localStorage | 3h |
| 4.9 | Hover tooltip for alternative units | component | 2h |
| 4.10 | Add isSubRecipe migration | schema, migration | 1h |
| 4.11 | Add subRecipeId to RecipeIngredient migration | schema, migration | 1h |
| 4.12 | Show sub-recipes in ingredient autocomplete | component | 4h |
| 4.13 | Visual indicator for sub-recipe ingredients | component | 2h |
| 4.14 | Cascading costing through sub-recipes | logic | 6h |
| 4.15 | Sub-recipe prep task generation | logic | 4h |
| 4.16 | PrepMethods CRUD page | new page | 6h |
| 4.17 | Container CRUD with capacity | new page | 6h |
| 4.18 | Link prep methods to recipe steps | UI | 3h |
| 4.19 | Link containers to prep tasks | UI | 3h |

**Total**: ~61h

#### Quality Gate P4

- [ ] Scaling updates quantities in real-time
- [ ] Unit toggle converts correctly
- [ ] Sub-recipes appear in ingredient picker
- [ ] Costing cascades correctly
- [ ] PrepMethods CRUD works
- [ ] Container CRUD works
- [ ] `pnpm check` passes

---

## 7. Security Considerations

### 7.1 Authentication
- All routes require Clerk authentication [C§2.1]
- Use `requireTenantId()` pattern from existing code

### 7.2 Authorization
- Tenant isolation at application layer [C§2.1]
- All queries include `tenant_id = ${tenantId}` filter
- No cross-tenant data access possible

### 7.3 Data Protection
- Soft deletes only (never hard delete) [C§2.1]
- Image uploads via `@repo/storage` with tenant-scoped paths
- No PII in outbox event payloads

---

## 8. Testing Strategy

### 8.1 Unit Tests

| Component | Test File | Coverage |
|-----------|-----------|----------|
| RecipeEditModal | `recipe-edit-modal.test.tsx` | Form validation, state |
| MenuPricingBreakdown | `menu-pricing-breakdown.test.ts` | Calculation logic |
| ImportColumnMapper | `import-column-mapper.test.tsx` | Mapping logic |
| Unit conversion | `unit-conversion.test.ts` | Conversion accuracy |

### 8.2 Integration Tests

| Flow | Test File |
|------|-----------|
| Recipe edit save | `recipe-edit.test.ts` |
| Menu CRUD | `menu-crud.test.ts` |
| Bulk merge | `ingredient-merge.test.ts` |
| CSV import | `recipe-import.test.ts` |

### 8.3 E2E Tests (if time permits)

| Flow | Scenario |
|------|----------|
| Recipe lifecycle | Create > Edit > Duplicate > Archive |
| Menu workflow | Create menu > Add dishes > Export PDF |
| Bulk operations | Select > Merge > Verify |

---

## 9. Implementation Notes

### 9.1 POC Shortcuts

| Feature | Shortcut | Future Fix |
|---------|----------|------------|
| PDF export | Simple HTML-to-PDF | Professional template engine |
| Version diff | Text-based comparison | Rich diff UI |
| Import validation | Basic regex | AI-assisted matching |
| Unit conversion | Fixed density values | Ingredient-specific densities |

### 9.2 Technical Debt

| Item | Impact | Fix Priority |
|------|--------|--------------|
| Raw SQL in actions.ts | Maintainability | Medium |
| No input validation schemas | Type safety | High |
| Missing error boundaries | UX | Medium |
| No optimistic updates | Performance | Low |

### 9.3 Dependencies to Install

| Package | Purpose | Version |
|---------|---------|---------|
| `@react-pdf/renderer` | PDF generation | ^4.x |
| `papaparse` | CSV parsing | ^5.x |
| `diff` | Version comparison | ^5.x |

---

## 10. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Schema migration conflicts | Medium | High | Test on staging first |
| PDF generation performance | Medium | Medium | Async generation, caching |
| Large CSV import timeout | Low | Medium | Chunked processing |
| Sub-recipe circular deps | Low | High | Validation check on save |
| Breaking existing recipe flow | Medium | High | Feature flag rollout |

---

## 11. Open Questions

- [ ] Should menus support seasonal availability dates?
- [ ] How should version history handle ingredient deletions?
- [ ] PDF export: include nutritional info?
- [ ] Import: support Excel (.xlsx) in addition to CSV?
- [ ] Sub-recipes: max nesting depth?

---

## 12. Dependency Graph

```
Phase 1 (Foundation)
    |
    +---> Phase 2 (Menus)
    |         |
    |         +---> Menu-Event linking (depends on Events module)
    |
    +---> Phase 3 (Bulk/Import)
    |
    +---> Phase 4 (Advanced)
              |
              +---> Sub-recipes (independent)
              +---> Scaling UI (independent)
              +---> Unit conversion (independent)
              +---> Prep methods/Containers (independent)
```

---

## Summary

| Phase | Stories | Est. Hours | Priority |
|-------|---------|------------|----------|
| P1 | US1, US2, US9 | 67h | Critical |
| P2 | US3 | 55h | High |
| P3 | US4, US5 | 64h | Medium |
| P4 | US6, US7, US8, US10 | 61h | Low |
| **Total** | | **247h** | |

Next: Run `/speckit:tasks` to generate implementation tasks from this plan.
