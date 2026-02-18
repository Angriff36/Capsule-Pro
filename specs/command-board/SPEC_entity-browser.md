# Spec: Entity Browser — UX Polish

> Priority: P1 — User feedback: "works much better than the other one" but "still pretty clunky"

## Current State

The Entity Browser is a right-side panel (272px wide) with collapsible category dropdowns. Each category lazy-loads its items on first expand. Clicking an item adds it to the board near the viewport center with random offset.

### What Works

- Collapsible categories with icons and labels
- Lazy loading per category
- Item count badges after loading
- Loading/error/empty states
- Add-to-board with toast feedback
- Ctrl+E toggle

### What's Clunky

1. No search/filter within the browser
2. No indication which entities are already on the board
3. Click-to-add with random placement feels imprecise
4. No drag-to-add (the most intuitive interaction for a spatial canvas)
5. Categories don't show counts until expanded
6. No way to refresh a category's data
7. Panel width is fixed — can't resize
8. No keyboard navigation within the browser

## Improvements

### Phase 1: Quick Wins

#### 1.1 Already-on-Board Indicator

- Cross-reference browser items against current `projections` array
- Show a checkmark or "On Board" badge next to items already projected
- Dim or de-emphasize already-added items (don't hide them — user may want duplicates intentionally)
- Pass `projections` prop to `EntityBrowser`

#### 1.2 Search Within Browser

- Add a search input at the top of the browser panel
- Filter across ALL categories simultaneously (not per-category)
- When searching, auto-expand categories that have matches
- Collapse categories with no matches
- Debounce 200ms, minimum 2 characters

#### 1.3 Pre-load Counts

- On browser open, fetch counts for all categories in a single server action
- Show counts on collapsed category headers immediately
- Don't fetch full item lists until expanded

#### 1.4 Refresh Button

- Add a refresh icon button per category header
- Clears cached items and re-fetches
- Useful when entities are created/modified in other tabs

### Phase 2: Interaction Polish

#### 2.1 Drag-to-Add

- Make browser items draggable
- On drag start, create a ghost preview matching the card appearance
- On drop onto the canvas, create the projection at the drop position
- Use React Flow's `onDrop` / `onDragOver` handlers
- Fall back to click-to-add for accessibility

#### 2.2 Smart Placement (for click-to-add)

Replace random offset with intelligent placement:

1. Find the viewport center
2. Check for existing nodes in a 400x400 area around center
3. Place in the first available gap using a spiral pattern
4. Minimum 20px gap between cards (matches snap grid)

#### 2.3 Keyboard Navigation

- Arrow keys to navigate between items
- Enter to add to board
- Escape to close browser
- Tab to move between categories
- **Status: DONE** (2026-02-18)

### Phase 3: Advanced

#### 3.1 Resizable Panel

- Drag handle on the left edge of the browser panel
- Min width: 240px, max width: 480px
- Persist width preference

#### 3.2 Category Reordering

- Allow users to drag categories to reorder them
- Persist order preference per user

#### 3.3 Bulk Add

- Checkbox selection mode
- "Add Selected" button to add multiple entities at once
- Smart layout for bulk-added entities (grid arrangement)

## Acceptance Criteria (Phase 1)

- [ ] Items already on the board show a visual indicator
- [ ] Search input filters across all categories
- [ ] Category counts show before expanding
- [ ] Refresh button re-fetches category data
- [ ] No regression in existing add-to-board flow
