# Feature Specification: Recipe Popover Links

Feature ID: 005
Status: Draft
Constitution Version: 1.0.0

## 1. Overview

### 1.1 Goal
Enable users viewing event details to quickly access recipe instructions through clickable recipe names that open in a popover.

### 1.2 Problem Statement
Currently, events display dishes with their associated recipe names as plain text. Kitchen staff viewing events must navigate to the full recipe page to view cooking instructions, disrupting their workflow and context.

### 1.3 Success Metrics
- Recipe names in event dish lists are clickable
- Clicking opens popover with recipe details
- Popover displays ingredients and instructions
- No page navigation required
- Mobile-friendly display

## 2. Constitution Alignment

### 2.1 Relevant Principles

| Principle | Section | Alignment |
|-----------|---------|-----------|
| [MUST] Use Prisma + Neon | C§2.1 | Recipe queries use Prisma client |
| [MUST] All tenant tables include tenantId | C§2.1 | Recipe queries enforce tenant isolation |
| [SHOULD] Prefer server components | C§2.2 | Server fetch, client popover |
| [SHOULD] Authenticate API routes | C§2.2 | Recipe API validates access |

### 2.2 Technology Constraints
- Database: tenant_kitchen.recipes, tenant_kitchen.recipe_versions
- UI: @repo/design-system/components/ui/dialog
- Tenant Isolation: Filter by tenantId
- No any types: Use Prisma-inferred types
- Auth: Required via Clerk

## 3. User Stories

### US1: Clickable Recipe Names
**As a** kitchen coordinator reviewing an event
**I want to** click on recipe names in the dish list
**So that** I can quickly view cooking instructions without leaving the event page

**Acceptance Criteria:**
- AC-1.1: Recipe names are clickable links with hover state
- AC-1.2: Non-linkable dishes show "No recipe linked" in amber
- AC-1.3: Links accessible via keyboard (tab, enter)
- AC-1.4: Clicking opens centered dialog
- AC-1.5: Dialog has close button (X)
- AC-1.6: Dialog closes on outside click

### US2: Recipe Details in Popover
**As a** kitchen staff viewing recipe instructions
**I want to** see ingredients and cooking steps in popover
**So that** I can quickly reference preparation details

**Acceptance Criteria:**
- AC-2.1: Popover displays recipe name as title
- AC-2.2: Popover shows metadata (prep time, cook time, yield)
- AC-2.3: Ingredients list with quantities and units
- AC-2.4: Cooking steps in numbered order
- AC-2.5: Content scrollable if exceeds viewport
- AC-2.6: Loading state while fetching

### US3: Mobile-Friendly Popover
**As a** mobile user viewing event details
**I want to** view recipe details in full-screen dialog
**So that** I can read recipe content on small screens

**Acceptance Criteria:**
- AC-3.1: On screens < 768px, dialog takes full viewport
- AC-3.2: Close button accessible on mobile
- AC-3.3: Content readable without horizontal scroll
- AC-3.4: Touch gestures work to dismiss

### US4: Link to Full Page
**As a** kitchen staff needing detailed information
**I want to** navigate to full recipe page from popover
**So that** I can access advanced features

**Acceptance Criteria:**
- AC-4.1: Popover includes "View Full Recipe" button
- AC-4.2: Link navigates to /kitchen/recipes/[recipeId]
- AC-4.3: Link opens in same tab

## 4. Scope

### 4.1 In Scope
- Clickable recipe names in event dish list
- Dialog component for recipe details
- Fetch and display recipe data
- Loading and error states
- Mobile-responsive display
- Link to full recipe page
- Tenant isolation

### 4.2 Out of Scope
- Recipe editing from popover
- Version selection (uses latest only)
- Recipe printing
- Recipe sharing
- Ingredient substitutions
- Yield scaling
- Video playback

### 4.3 Future Considerations
- Quick Scale button
- Allergen warnings
- Cost per serving
- Timer integration
- Embedded video

## 5. Dependencies

### 5.1 Internal Dependencies
- packages/database/prisma/schema.prisma
- apps/app/app/(authenticated)/events/[eventId]/event-details-client.tsx
- apps/app/app/(authenticated)/events/actions/event-dishes.ts
- packages/design-system/components/ui/dialog.tsx
- @repo/auth/server

### 5.2 External Dependencies
- None

## 6. Technical Design

### 6.1 Data Models

Recipes: tenant_id, id, name, category, description, tags, is_active
RecipeVersions: tenant_id, id, recipe_id, version_number, yield_quantity, yield_unit_id, prep_time_minutes, cook_time_minutes, rest_time_minutes
RecipeIngredients: tenant_id, recipe_version_id, ingredient_id, quantity, unit_id, notes, sort_order
recipe_steps: tenant_id, recipe_version_id, step_number, instruction, duration_minutes, tips
Dishes: tenant_id, id, recipe_id, name
event_dishes: tenant_id, event_id, dish_id

### 6.2 API Design

New Action: getRecipeDetails(recipeId: string)

Returns RecipeDetails:
- id, name, description, category
- prepTimeMinutes, cookTimeMinutes, restTimeMinutes
- yieldQuantity, yieldUnit
- ingredients: Array of {name, quantity, unit, notes}
- steps: Array of {stepNumber, instruction, durationMinutes, tips}

### 6.3 Component Structure

event-details-client.tsx
  └── EventDishesList (new)
      └── EventDishItem (modified)
          └── RecipeLinkPopover (new)
              ├── Dialog
              ├── RecipeDialogContent (new)
              │   ├── RecipeMetadata
              │   ├── IngredientsList
              │   └── RecipeStepsList
              └── ViewFullRecipeLink

### 6.4 Implementation Approach

Use Dialog component for mobile support and accessibility.

### 6.5 SQL Queries

Fetch Recipe: SELECT from recipes LEFT JOIN LATERAL recipe_versions (latest) LEFT JOIN units
Fetch Ingredients: SELECT from recipe_ingredients JOIN ingredients LEFT JOIN units ORDER BY sort_order
Fetch Steps: SELECT from recipe_steps ORDER BY step_number

## 7. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Recipe with no versions | Medium | Low | Show "No active version" |
| Large content overflow | Medium | Medium | Add max-height scroll |
| Mobile covers context | Low | Medium | Use full-screen dialog |
| Slow fetch | Medium | Low | Add skeleton loader |
| Deleted recipe | Medium | Low | Handle 404 gracefully |

## 8. Open Questions

- [ ] Cache fetched recipes in session?
- [ ] Show recipe images?
- [ ] Include "Add to Prep List" button?
- [ ] Max height before scrolling?

## 9. Implementation Notes

### 9.1 Files to Modify

1. apps/app/app/(authenticated)/events/[eventId]/event-details-client.tsx
2. apps/app/app/(authenticated)/events/actions/event-dishes.ts - Add getRecipeDetails
3. apps/app/app/(authenticated)/events/components/recipe-link-popover.tsx (new)

### 9.2 Type Safety

- Use Prisma-generated types from @repo/database
- Create shared types for RecipeDetails
- No any types

### 9.3 Testing

- Unit test: getRecipeDetails action
- Integration test: RecipeLinkPopover
- E2E test: Click link, verify popover
- Accessibility test: Keyboard navigation

## Appendix

### A. Related Features

- Feature 003: Events Audit and Fix
- Feature 004: Database Docs Integrity

### B. References

- Constitution: .specify/memory/constitution.md
- Schema: packages/database/prisma/schema.prisma
- Event Details: apps/app/app/(authenticated)/events/[eventId]/page.tsx
- Recipe Details: apps/app/app/(authenticated)/kitchen/recipes/[recipeId]/page.tsx
- Dialog: packages/design-system/components/ui/dialog.tsx

### C. UI Mock

**Desktop (>768px):**
- Blue link with hover underline
- Centered modal (max-width: 600px)
- Recipe title, metadata, ingredients, steps
- Close button top-right
- "View Full Recipe" button bottom

**Mobile (<768px):**
- Full viewport dialog
- Prominent close button
- Vertical scroll
- Bottom sheet dismissal
