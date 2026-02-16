# Command Board — Bug Fixes

> **Priority**: P0 bugs block usage, P1 bugs degrade experience, P2 bugs are cosmetic
>
> **Goal**: Fix critical and high-priority bugs that prevent the Command Board from functioning as intended

## Overview

The Command Board is feature-complete but has several bugs that need to be addressed. This spec focuses on fixing the most critical issues first.

## Priority P0 — Critical (Blocks Usage)

### BUG-01: Entity Detail Panel Not Wired Up

**Location**: `apps/app/app/(authenticated)/command-board/components/board-shell.tsx` lines 247-268

**Problem**:

- When a user clicks a card on the board, the Sheet opens but shows placeholder text "Entity detail panel coming soon"
- The `EntityDetailPanel` component (`entity-detail-panel.tsx`) is fully built but not being used
- The component has: loading skeleton, error state with retry, detail view routing (event, client, task, employee, generic), "Open Full Page" link in footer

**Root Cause**:
`BoardShell` renders a raw `<Sheet>` with placeholder content instead of using the `<EntityDetailPanel>` component.

**Fix**:
Replace the inline Sheet in `BoardShell` (lines 247-268) with `<EntityDetailPanel>` component, passing:

- `entityType` from `openDetailEntity?.type`
- `entityId` from `openDetailEntity?.id`
- `open` from `!!openDetailEntity`
- `onOpenChange` handler that sets `openDetailEntity` to `null` on close

**Files to modify**:

- `apps/app/app/(authenticated)/command-board/components/board-shell.tsx`

**Acceptance criteria**:

- [ ] Clicking a card opens the Entity Detail Panel showing actual entity details
- [ ] Panel shows loading state while fetching
- [ ] Panel shows error state with retry if fetch fails
- [ ] Panel routes to correct detail view based on entity type
- [ ] "Open Full Page" link navigates to entity's full page
- [ ] Closing panel returns to board without side effects

## Priority P1 — Degrades Experience

### BUG-02: Duplicate Entities on Board

**Problem**:

- Entity Browser allows adding the same entity to the board multiple times
- No duplicate check, no visual indicator that an entity is already projected

**Expected**:
Either prevent duplicates OR show an "already on board" badge/indicator in the browser list

**Files to check**:

- `apps/app/app/(authenticated)/command-board/components/entity-browser.tsx`
- `apps/app/app/(authenticated)/command-board/actions/projections.ts`

**Fix approach**:

1. Modify `entity-browser.tsx` to track which entities are already on the board
2. Add visual indicator (badge or disabled state) for entities already projected
3. OR: Add duplicate check in `addProjection` action to prevent adding same entity twice

**Acceptance criteria**:

- [ ] User cannot add the same entity to the board twice
- [ ] Visual feedback shows which entities are already on the board

### BUG-03: Undo/Redo Disconnected

**Location**: `apps/app/app/(authenticated)/command-board/components/board-shell.tsx` line 199-200

**Problem**:

- `canUndo` and `canRedo` are hardcoded to `false`
- Old undo system (UndoManager, command pattern) was removed when custom canvas was replaced with React Flow
- No new undo system has been implemented

**Impact**:
Users cannot undo accidental moves or deletions

**Fix approach**:

1. Implement a simple history stack for board actions (move, add, delete)
2. Store previous state before each action
3. Implement undo/redo handlers that restore previous state
4. Connect to keyboard shortcuts (Cmd+Z, Cmd+Shift+Z)

**Acceptance criteria**:

- [ ] Users can undo moves, adds, and deletes
- [ ] Users can redo after undo
- [ ] Undo/redo buttons enable/disable based on history state
- [ ] Keyboard shortcuts work (Cmd+Z, Cmd+Shift+Z)

### BUG-04: Entity Browser Stale After Board Changes

**Problem**:

- When entities are added to the board via Entity Browser, the browser doesn't update to reflect which items are already on board
- If an entity is removed from the board, the browser doesn't know

**Fix approach**:

1. Add state management to track projections in real-time
2. Refresh Entity Browser when board projections change
3. Use React Flow's store or Liveblocks to listen for projection changes

**Acceptance criteria**:

- [ ] Entity Browser updates when entities are added to board
- [ ] Entity Browser updates when entities are removed from board
- [ ] Visual indicators stay accurate in real-time

### BUG-05: No Error Boundary on Board

**Problem**:
If React Flow canvas throws an error (e.g., bad node data, missing entity), the entire page crashes. No error boundary catches and recovers gracefully.

**Fix approach**:

1. Add React Error Boundary around React Flow canvas
2. Catch errors and display fallback UI with retry option
3. Log errors to console for debugging

**Files to modify**:

- `apps/app/app/(authenticated)/command-board/components/board-shell.tsx` or `board-flow.tsx`

**Acceptance criteria**:

- [ ] Board errors are caught by error boundary
- [ ] Fallback UI displays with error message and retry button
- [ ] User can recover from errors without page refresh
- [ ] Errors are logged for debugging

## Priority P2 — Cosmetic / Minor

### BUG-06: Random Placement Offset

**Location**: `apps/app/app/(authenticated)/command-board/components/entity-browser.tsx` lines 178-180

**Problem**:
When adding entities from the browser, position uses `Math.random() * 300` offset from viewport center. This can cause overlapping cards and doesn't feel intentional.

**Expected**:
Use a smarter placement algorithm — grid-based, spiral, or at least check for overlaps

**Acceptance criteria**:

- [ ] New entities are placed in a predictable, non-overlapping pattern
- [ ] Placement feels intentional and organized

### BUG-07: Card Width Not Constrained

**Problem**:
`ProjectionNode` doesn't set explicit width on React Flow node. Cards auto-size based on content, leading to inconsistent widths across entity types.

**Fix approach**:
Set consistent width in node data or card components

**Acceptance criteria**:

- [ ] All cards have consistent, predictable width

### BUG-08: MiniMap/Controls Styling

**Problem**:
MiniMap and Controls use `!important` overrides (`!bg-card !border-border !shadow-md`) which is fragile and doesn't respect the brand color palette.

**Fix approach**:
Replace `!important` overrides with proper CSS classes

**Acceptance criteria**:

- [ ] MiniMap and Controls styled without `!important`
- [ ] Styling respects theme/brand colors

## Testing Strategy

1. Manual testing for each bug fix
2. Verify no regressions in existing functionality
3. Test across different entity types
4. Test with multiple simultaneous board users (Liveblocks realtime)

## Implementation Order

1. **BUG-01** (P0) — Wire up Entity Detail Panel
2. **BUG-05** (P1) — Add Error Boundary
3. **BUG-02** (P1) — Prevent duplicate entities
4. **BUG-04** (P1) — Entity Browser staleness
5. **BUG-03** (P1) — Undo/Redo (larger effort)
6. **BUG-06** (P2) — Smart placement
7. **BUG-07** (P2) — Consistent card width
8. **BUG-08** (P2) — MiniMap/Controls styling

## Success Metrics

- [ ] All P0 bugs fixed and tested
- [ ] At least 3 P1 bugs fixed
- [ ] No new bugs introduced
- [ ] User can perform core board operations without errors
