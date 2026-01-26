# Tasks: Recipes & Menu Overhaul

Feature ID: 002
Total Tasks: 34
Constitution: 1.0.0

---

## Phase 1: Setup & Foundation

- [x] T001 [P] [US1] Create recipe-edit-modal component shell `apps/app/app/(authenticated)/kitchen/recipes/components/recipe-edit-modal.tsx`
  - **Do**:
    1. Create `components/` directory under recipes
    2. Create modal component with Sheet from design-system
    3. Add form fields matching createRecipe: name, category, description, tags, yield, times, difficulty
    4. Wire open/close state from props
  - **Files**: `apps/app/app/(authenticated)/kitchen/recipes/components/recipe-edit-modal.tsx`
  - **Done when**: Modal renders with all form fields, opens/closes correctly
  - **Verify**: `pnpm check && cd apps/app && npx tsc --noEmit`
  - **Commit**: `feat(recipes): create recipe edit modal component shell`

- [x] T002 [P] [US9] Create shared UI components `apps/app/app/(authenticated)/kitchen/recipes/components/`
  - **Do**:
    1. Create `skeleton-card.tsx` with shimmer animation matching recipe card dimensions
    2. Create `difficulty-stars.tsx` for 1-5 star rating display
    3. Create `time-badges.tsx` for prep/cook/rest time badges
  - **Files**:
    - `apps/app/app/(authenticated)/kitchen/recipes/components/skeleton-card.tsx`
    - `apps/app/app/(authenticated)/kitchen/recipes/components/difficulty-stars.tsx`
    - `apps/app/app/(authenticated)/kitchen/recipes/components/time-badges.tsx`
  - **Done when**: All 3 components export correctly, render without errors
  - **Verify**: `pnpm check`
  - **Commit**: `feat(recipes): add shared UI components (skeleton, stars, time badges)`

- [x] T003 [VERIFY] Quality checkpoint - Phase 1 Setup
  - **Do**: Run lint/typecheck, verify new components
  - **Verify**: `pnpm check && cd apps/app && npx tsc --noEmit`
  - **Done when**: No errors, components importable
  - **Commit**: `chore(recipes): pass phase 1 setup checkpoint` (if fixes needed)

---

## Phase 2: Recipe Editing (Core POC)

- [x] T004 [US1] Implement updateRecipe server action `apps/app/app/(authenticated)/kitchen/recipes/actions.ts`
  - **Do**:
    1. Add `updateRecipe(recipeId: string, formData: FormData)` function
    2. Fetch existing recipe to verify ownership
    3. Create new RecipeVersion with incremented version_number
    4. Update recipe table (name, category, description, tags)
    5. Insert new recipe_ingredients for the new version
    6. Insert new recipe_steps for the new version
    7. Soft-delete old version's ingredients/steps
    8. Enqueue `recipe.updated` outbox event
    9. Call `revalidatePath`
  - **Files**: `apps/app/app/(authenticated)/kitchen/recipes/actions.ts`
  - **Done when**: updateRecipe saves changes, creates new version, enqueues event
  - **Verify**: `pnpm check && cd apps/app && npx tsc --noEmit`
  - **Commit**: `feat(recipes): implement updateRecipe server action with versioning`

- [x] T005 [US1] Fetch recipe data for edit modal
  - **Do**:
    1. Create `getRecipeForEdit(recipeId)` data fetcher in actions.ts
    2. Fetch recipe, latest version, ingredients, steps
    3. Return structured object for form pre-population
  - **Files**: `apps/app/app/(authenticated)/kitchen/recipes/actions.ts`
  - **Done when**: Function returns all recipe data needed for edit form
  - **Verify**: `pnpm check`
  - **Commit**: `feat(recipes): add getRecipeForEdit data fetcher`

- [x] T006 [US1] Wire edit modal to recipe cards `apps/app/app/(authenticated)/kitchen/recipes/page.tsx`
  - **Do**:
    1. Import RecipeEditModal component
    2. Add state for selected recipeId and modal open state
    3. Wire Edit button click to open modal with recipeId
    4. Pass onSave callback to refresh page
    5. Move client interactivity to separate client component if needed
  - **Files**:
    - `apps/app/app/(authenticated)/kitchen/recipes/page.tsx`
    - `apps/app/app/(authenticated)/kitchen/recipes/recipes-page-client.tsx` (modify)
  - **Done when**: Clicking Edit on card opens modal with recipe data
  - **Verify**: `pnpm check && pnpm dev:apps` then manual navigation
  - **Commit**: `feat(recipes): wire edit modal to recipe cards`

- [x] T007 [US1] Implement ingredient management in edit modal
  - **Do**:
    1. Add ingredient list state with add/remove/reorder
    2. Create ingredient row component with quantity, unit, name
    3. Add drag-and-drop reorder (use native HTML drag or simple buttons)
    4. Wire to form submission
  - **Files**: `apps/app/app/(authenticated)/kitchen/recipes/components/recipe-edit-modal.tsx`
  - **Done when**: Can add, remove, reorder ingredients in modal
  - **Verify**: `pnpm check`
  - **Commit**: `feat(recipes): implement ingredient management in edit modal`

- [x] T008 [US1] Implement step management in edit modal
  - **Do**:
    1. Add steps list state with add/remove/reorder
    2. Create step row component with instruction textarea
    3. Add reorder capability
    4. Wire to form submission
  - **Files**: `apps/app/app/(authenticated)/kitchen/recipes/components/recipe-edit-modal.tsx`
  - **Done when**: Can add, remove, reorder steps in modal
  - **Verify**: `pnpm check`
  - **Commit**: `feat(recipes): implement step management in edit modal`

- [x] T009 [VERIFY] Quality checkpoint - Recipe Editing POC
  - **Do**: Run quality commands, test edit flow end-to-end
  - **Verify**: `pnpm check && cd apps/app && npx tsc --noEmit`
  - **Done when**: Can edit recipe, save creates new version
  - **Commit**: `chore(recipes): pass recipe editing POC checkpoint` (if fixes needed)

---

## Phase 3: Recipe Detail Enhancement

- [x] T010 [US2] Create tabbed interface for recipe detail `apps/app/app/(authenticated)/kitchen/recipes/[recipeId]/components/recipe-detail-tabs.tsx`
  - **Do**:
    1. Create components directory
    2. Create RecipeDetailTabs component using Tabs from design-system
    3. Define tabs: Overview, Ingredients, Steps, Costing, History
    4. Pass recipe data as props
  - **Files**: `apps/app/app/(authenticated)/kitchen/recipes/[recipeId]/components/recipe-detail-tabs.tsx`
  - **Done when**: Tabs render, switching works
  - **Verify**: `pnpm check`
  - **Commit**: `feat(recipes): create recipe detail tabbed interface`

- [x] T011 [US2] Refactor recipe detail page to use tabs `apps/app/app/(authenticated)/kitchen/recipes/[recipeId]/page.tsx`
  - **Do**:
    1. Replace current card-based layout with RecipeDetailTabs
    2. Keep hero image with name overlay
    3. Add metadata bar (prep, cook, yield, difficulty)
    4. Fetch recipe steps for Steps tab
    5. Move existing content into appropriate tabs
  - **Files**: `apps/app/app/(authenticated)/kitchen/recipes/[recipeId]/page.tsx`
  - **Done when**: Recipe detail shows tabbed interface with all content
  - **Verify**: `pnpm check && pnpm dev:apps`
  - **Commit**: `feat(recipes): refactor recipe detail to tabbed layout`

- [x] T012 [US2] Build Costing tab content
  - **Do**:
    1. Fetch ingredient costs from recipe_ingredients
    2. Display cost breakdown table
    3. Show total cost per yield and per serving
    4. Add placeholder for "costs not calculated" state
  - **Files**: `apps/app/app/(authenticated)/kitchen/recipes/[recipeId]/components/recipe-detail-tabs.tsx`
  - **Done when**: Costing tab shows ingredient costs if available
  - **Verify**: `pnpm check`
  - **Commit**: `feat(recipes): add costing tab to recipe detail`

- [ ] T013 [US2] Build History tab (version list)
  - **Do**:
    1. Fetch all recipe versions for recipe
    2. Display version list with created_at, version_number
    3. Show what changed (ingredient count, step count)
    4. Add "view version" capability (simple text display)
  - **Files**: `apps/app/app/(authenticated)/kitchen/recipes/[recipeId]/components/recipe-detail-tabs.tsx`
  - **Done when**: History tab shows version list
  - **Verify**: `pnpm check`
  - **Commit**: `feat(recipes): add version history tab to recipe detail`

- [ ] T014 [VERIFY] Quality checkpoint - Recipe Detail
  - **Do**: Run quality commands, verify tabs work
  - **Verify**: `pnpm check && cd apps/app && npx tsc --noEmit`
  - **Done when**: All tabs render correctly with data
  - **Commit**: `chore(recipes): pass recipe detail enhancement checkpoint` (if fixes needed)

---

## Phase 4: UI Polish

- [ ] T015 [P] [US9] Polish recipe cards `apps/app/app/(authenticated)/kitchen/recipes/page.tsx`
  - **Do**:
    1. Add stronger shadows (shadow-md on hover)
    2. Add subtle border
    3. Improve hover state (scale or lift effect)
    4. Add difficulty stars to card
    5. Improve badge styling
  - **Files**: `apps/app/app/(authenticated)/kitchen/recipes/page.tsx`
  - **Done when**: Cards have visual weight, clear hover feedback
  - **Verify**: `pnpm check && pnpm dev:apps` visual inspection
  - **Commit**: `style(recipes): polish recipe card visual design`

- [ ] T016 [P] [US9] Add loading states with skeletons
  - **Do**:
    1. Add Suspense boundary around recipe grid
    2. Create loading.tsx with skeleton cards
    3. Match skeleton dimensions to actual cards
  - **Files**:
    - `apps/app/app/(authenticated)/kitchen/recipes/loading.tsx`
    - `apps/app/app/(authenticated)/kitchen/recipes/[recipeId]/loading.tsx`
  - **Done when**: Loading states show skeleton cards
  - **Verify**: `pnpm check`
  - **Commit**: `feat(recipes): add skeleton loading states`

- [ ] T017 [P] [US9] Improve empty states
  - **Do**:
    1. Enhance empty state illustrations (use lucide icons creatively)
    2. Add more descriptive CTAs
    3. Ensure consistent styling across all tabs
  - **Files**: `apps/app/app/(authenticated)/kitchen/recipes/page.tsx`
  - **Done when**: Empty states look polished with clear actions
  - **Verify**: `pnpm check`
  - **Commit**: `style(recipes): improve empty state designs`

- [ ] T018 [VERIFY] Quality checkpoint - UI Polish
  - **Do**: Run quality commands, visual review
  - **Verify**: `pnpm check && pnpm dev:apps`
  - **Done when**: UI feels polished, no console errors
  - **Commit**: `chore(recipes): pass UI polish checkpoint` (if fixes needed)

---

## Phase 5: Menus Module - Database

- [ ] T019 [US3] Create Prisma migration for Menu and MenuDish models
  - **Do**:
    1. Add Menu model to schema.prisma in tenant_kitchen schema
    2. Add MenuDish model with FK to Menu and Dish
    3. Add relation to Account model
    4. Run `pnpm migrate` to create migration
    5. Run `pnpm prisma:generate` to update client
  - **Files**:
    - `packages/database/prisma/schema.prisma`
    - `packages/database/prisma/migrations/*` (auto-generated)
  - **Done when**: Migration created and applies cleanly
  - **Verify**: `pnpm migrate:status && pnpm prisma:generate && pnpm check`
  - **Commit**: `feat(database): add Menu and MenuDish models`

- [ ] T020 [VERIFY] Quality checkpoint - Database Migration
  - **Do**: Verify migration applies, Prisma client regenerated
  - **Verify**: `cd packages/database && npx prisma migrate status && pnpm check`
  - **Done when**: Migration shows as applied
  - **Commit**: `chore(database): verify menu migration` (if fixes needed)

---

## Phase 6: Menus Module - Server Actions

- [ ] T021 [US3] Create menu server actions `apps/app/app/(authenticated)/kitchen/recipes/menus/actions.ts`
  - **Do**:
    1. Create menus directory
    2. Add `createMenu(formData)` - insert menu with basic fields
    3. Add `updateMenu(menuId, formData)` - update menu fields
    4. Add `deleteMenu(menuId)` - soft delete
    5. Add `getMenus()` - list menus for tenant
    6. Add `getMenuById(menuId)` - single menu with dishes
    7. Enqueue outbox events for CRUD operations
  - **Files**: `apps/app/app/(authenticated)/kitchen/recipes/menus/actions.ts`
  - **Done when**: All CRUD actions work, return proper types
  - **Verify**: `pnpm check && cd apps/app && npx tsc --noEmit`
  - **Commit**: `feat(menus): implement menu CRUD server actions`

- [ ] T022 [US3] Add menu-dish management actions
  - **Do**:
    1. Add `addDishToMenu(menuId, dishId, course?)` - create MenuDish
    2. Add `removeDishFromMenu(menuId, dishId)` - soft delete MenuDish
    3. Add `reorderMenuDishes(menuId, dishIds[])` - update sort_order
  - **Files**: `apps/app/app/(authenticated)/kitchen/recipes/menus/actions.ts`
  - **Done when**: Can add/remove/reorder dishes in menus
  - **Verify**: `pnpm check`
  - **Commit**: `feat(menus): add menu-dish management actions`

- [ ] T023 [VERIFY] Quality checkpoint - Menu Actions
  - **Do**: Run quality commands
  - **Verify**: `pnpm check && cd apps/app && npx tsc --noEmit`
  - **Done when**: All actions type-check, no lint errors
  - **Commit**: `chore(menus): pass menu actions checkpoint` (if fixes needed)

---

## Phase 7: Menus Module - UI Components

- [ ] T024 [P] [US3] Create MenuCard component `apps/app/app/(authenticated)/kitchen/recipes/components/menu-card.tsx`
  - **Do**:
    1. Create card showing menu name, description
    2. Display dish count, price range
    3. Show dietary/allergen icons (aggregate from dishes)
    4. Add hover state, click to navigate to detail
  - **Files**: `apps/app/app/(authenticated)/kitchen/recipes/components/menu-card.tsx`
  - **Done when**: Card renders menu info attractively
  - **Verify**: `pnpm check`
  - **Commit**: `feat(menus): create menu card component`

- [ ] T025 [P] [US3] Create MenuEditor component `apps/app/app/(authenticated)/kitchen/recipes/menus/components/menu-editor.tsx`
  - **Do**:
    1. Create menus/components directory
    2. Build form with name, description, category, pricing fields
    3. Add dish selector (multi-select from existing dishes)
    4. Add course assignment (appetizer, main, dessert dropdown per dish)
    5. Wire to createMenu/updateMenu actions
  - **Files**: `apps/app/app/(authenticated)/kitchen/recipes/menus/components/menu-editor.tsx`
  - **Done when**: Can create/edit menus with dishes
  - **Verify**: `pnpm check`
  - **Commit**: `feat(menus): create menu editor component`

- [ ] T026 [US3] Replace menus placeholder with menu grid `apps/app/app/(authenticated)/kitchen/recipes/page.tsx`
  - **Do**:
    1. Fetch menus when activeTab === "menus"
    2. Replace Empty placeholder with MenuCard grid
    3. Add "Add Menu" primary action button
    4. Show empty state when no menus
  - **Files**: `apps/app/app/(authenticated)/kitchen/recipes/page.tsx`
  - **Done when**: Menus tab shows menu cards
  - **Verify**: `pnpm check && pnpm dev:apps`
  - **Commit**: `feat(menus): replace placeholder with menu grid`

- [ ] T027 [US3] Create menu detail page `apps/app/app/(authenticated)/kitchen/recipes/menus/[menuId]/page.tsx`
  - **Do**:
    1. Create page with header showing menu name
    2. Display menu metadata (description, category, pricing)
    3. Show dish list grouped by course
    4. Display dietary summary (aggregated allergens)
    5. Add Edit button linking to editor
  - **Files**: `apps/app/app/(authenticated)/kitchen/recipes/menus/[menuId]/page.tsx`
  - **Done when**: Menu detail page renders with all info
  - **Verify**: `pnpm check && pnpm dev:apps`
  - **Commit**: `feat(menus): create menu detail page`

- [ ] T028 [US3] Create new menu page `apps/app/app/(authenticated)/kitchen/recipes/menus/new/page.tsx`
  - **Do**:
    1. Create new page with MenuEditor
    2. Wire to createMenu action
    3. Redirect to menus list on success
  - **Files**: `apps/app/app/(authenticated)/kitchen/recipes/menus/new/page.tsx`
  - **Done when**: Can create new menu from UI
  - **Verify**: `pnpm check && pnpm dev:apps`
  - **Commit**: `feat(menus): create new menu page`

- [ ] T029 [VERIFY] Quality checkpoint - Menus UI
  - **Do**: Run quality commands, test menu flow
  - **Verify**: `pnpm check && cd apps/app && npx tsc --noEmit`
  - **Done when**: Menu CRUD works end-to-end in UI
  - **Commit**: `chore(menus): pass menus UI checkpoint` (if fixes needed)

---

## Phase 8: Testing

- [ ] T030 [US1] Add unit tests for updateRecipe action
  - **Do**:
    1. Create test file `apps/app/__tests__/recipes/update-recipe.test.ts`
    2. Test versioning (new version created on update)
    3. Test ingredient updates
    4. Test validation errors
  - **Files**: `apps/app/__tests__/recipes/update-recipe.test.ts`
  - **Done when**: Tests pass, cover main flows
  - **Verify**: `cd apps/app && npx vitest run __tests__/recipes/update-recipe.test.ts`
  - **Commit**: `test(recipes): add updateRecipe action tests`

- [ ] T031 [US3] Add unit tests for menu actions
  - **Do**:
    1. Create test file `apps/app/__tests__/menus/menu-actions.test.ts`
    2. Test createMenu, updateMenu, deleteMenu
    3. Test addDishToMenu, removeDishFromMenu
  - **Files**: `apps/app/__tests__/menus/menu-actions.test.ts`
  - **Done when**: Tests pass for menu CRUD
  - **Verify**: `cd apps/app && npx vitest run __tests__/menus/menu-actions.test.ts`
  - **Commit**: `test(menus): add menu actions tests`

- [ ] T032 [VERIFY] Quality checkpoint - Testing
  - **Do**: Run full test suite
  - **Verify**: `pnpm test`
  - **Done when**: All tests pass
  - **Commit**: `chore(tests): pass testing checkpoint` (if fixes needed)

---

## Phase 9: Final Quality Gates

- [ ] T033 [VERIFY] Full local CI verification
  - **Do**: Run complete local CI suite
  - **Verify**: `pnpm check && pnpm build && pnpm test`
  - **Done when**: All commands pass
  - **Commit**: `chore(recipes-menus): pass local CI` (if fixes needed)

- [ ] T034 [VERIFY] Acceptance criteria checklist
  - **Do**: Verify all ACs from spec.md
    - Recipe editing works (AC-1.1 through AC-1.7)
    - Recipe detail tabs work (AC-2.1 through AC-2.8)
    - Menus CRUD works (AC-3.1 through AC-3.7)
    - UI polish applied (AC-9.1 through AC-9.5)
  - **Verify**: Manual review + `pnpm dev:apps` functional test
  - **Done when**: All Phase 1 & 2 ACs confirmed
  - **Commit**: None (verification only)

---

## Notes

### POC Shortcuts
- Version diff in History tab: simple text comparison (no rich diff UI)
- Menu PDF export: deferred to Phase 2+ (AC-3.8)
- Menu-event linking: placeholder only (AC-3.7 partial)
- Keyboard navigation: deferred (AC-9.7)
- Responsive polish: basic only (AC-9.8)

### Constitution Alignment
- [C2.1] All mutations use soft deletes
- [C2.1] All tenant tables include tenantId filter
- [C2.1] Outbox events for recipe.updated, menu.created, etc.
- [C5.1] Critical paths tested (updateRecipe, menu CRUD)
- [C6.2] Conventional commits throughout

### Technical Debt
- Raw SQL in actions.ts (maintainability concern from plan.md)
- No Zod validation schemas for form data
- No optimistic updates for menu dish reordering

### Parallel Batches
- Batch 1: T001, T002 (setup components)
- Batch 2: T015, T016, T017 (UI polish)
- Batch 3: T024, T025 (menu components)
