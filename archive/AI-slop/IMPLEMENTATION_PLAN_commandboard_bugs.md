# Command Board Bug Fixes — Implementation Plan

> **Goal**: Fix critical and high-priority bugs in the Command Board
>
> **Spec**: `specs/command-board/SPEC_bug-fixes.md`

## Phase 1: Critical Fixes (P0)

### Task 1.1: Wire Up Entity Detail Panel [high]

**Bug**: BUG-01 — Entity Detail Panel shows placeholder instead of actual details

**Files**:

- `apps/app/app/(authenticated)/command-board/components/board-shell.tsx` (lines 247-268)

**Changes**:

1. Remove the inline `<Sheet>` with placeholder content
2. Import and use `<EntityDetailPanel>` component
3. Pass props from existing `openDetailEntity` state:
   - `entityType={openDetailEntity?.type}`
   - `entityId={openDetailEntity?.id}`
   - `open={!!openDetailEntity}`
   - `onOpenChange={(open) => !open && setOpenDetailEntity(null)}`

**Acceptance**:

- [ ] Clicking a card opens Entity Detail Panel with actual details
- [ ] Panel shows loading state while fetching
- [ ] Panel shows error state with retry on failure
- [ ] Panel routes to correct detail view by entity type
- [ ] "Open Full Page" link works
- [ ] Closing panel returns to board cleanly

**Status**: ⏳ Pending

---

## Phase 2: High-Priority Fixes (P1)

### Task 2.1: Add Error Boundary [high]

**Bug**: BUG-05 — Board crashes completely on React Flow errors

**Files**:

- Create: `apps/app/app/(authenticated)/command-board/components/board-error-boundary.tsx`
- Modify: `apps/app/app/(authenticated)/command-board/components/board-shell.tsx`

**Changes**:

1. Create `BoardErrorBoundary` component with:
   - Error state capture
   - Fallback UI with error message
   - Retry button to reset error boundary
   - Error logging
2. Wrap React Flow canvas in `<BoardErrorBoundary>`

**Acceptance**:

- [ ] Board errors caught by boundary
- [ ] Fallback UI displays with error message and retry
- [ ] User can recover without page refresh
- [ ] Errors logged to console

**Status**: ⏳ Pending

---

### Task 2.2: Prevent Duplicate Entities [high]

**Bug**: BUG-02 — Same entity can be added to board multiple times

**Files**:

- `apps/app/app/(authenticated)/command-board/components/entity-browser.tsx`
- `apps/app/app/(authenticated)/command-board/actions/projections.ts`

**Changes**:

1. Modify Entity Browser to track which entities are projected
2. Add visual indicator (badge or opacity) for entities already on board
3. OR: Add duplicate check in `addProjection` action to prevent duplicates

**Acceptance**:

- [ ] User cannot add same entity twice (OR sees clear indicator)
- [ ] Visual feedback shows which entities are already projected

**Status**: ⏳ Pending

---

### Task 2.3: Fix Entity Browser Staleness [high]

**Bug**: BUG-04 — Entity Browser doesn't update when entities added/removed

**Files**:

- `apps/app/app/(authenticated)/command-board/components/entity-browser.tsx`
- `apps/app/app/(authenticated)/command-board/hooks/use-board-sync.ts` (if exists)

**Changes**:

1. Add subscription to projection changes (Liveblocks or React Flow store)
2. Update Entity Browser state when projections change
3. Re-render indicators for "already on board" status

**Acceptance**:

- [ ] Browser updates when entities added to board
- [ ] Browser updates when entities removed from board
- [ ] Indicators stay accurate in realtime

**Status**: ⏳ Pending

---

### Task 2.4: Implement Undo/Redo [medium]

**Bug**: BUG-03 — No undo/redo functionality after canvas replacement

**Files**:

- Create: `apps/app/app/(authenticated)/command-board/hooks/use-board-history.ts`
- Modify: `apps/app/app/(authenticated)/command-board/components/board-shell.tsx`

**Changes**:

1. Create `useBoardHistory` hook with:
   - History stack (past states)
   - Current state
   - Redo stack (future states)
   - `undo()` and `redo()` functions
2. Wrap board actions (move, add, delete) to record history
3. Connect undo/redo to keyboard shortcuts (Cmd+Z, Cmd+Shift+Z)
4. Update `canUndo` and `canRedo` from history state

**Acceptance**:

- [ ] Users can undo moves, adds, deletes
- [ ] Users can redo after undo
- [ ] Undo/redo buttons enable/disable correctly
- [ ] Keyboard shortcuts work

**Status**: ⏳ Pending

---

## Phase 3: Polish Fixes (P2)

### Task 3.1: Smart Entity Placement [low]

**Bug**: BUG-06 — Random placement causes overlapping cards

**Files**:

- `apps/app/app/(authenticated)/command-board/components/entity-browser.tsx` (lines 178-180)

**Changes**:

1. Replace `Math.random() * 300` with smart placement algorithm
2. Options: grid-based, spiral from center, or overlap detection
3. Prefer simple grid or spiral for predictability

**Acceptance**:

- [ ] New entities placed in predictable pattern
- [ ] No overlapping cards
- [ ] Placement feels intentional

**Status**: ⏳ Pending

---

### Task 3.2: Consistent Card Width [low]

**Bug**: BUG-07 — Cards have inconsistent widths

**Files**:

- `apps/app/app/(authenticated)/command-board/nodes/projection-node.tsx`
- `apps/app/app/(authenticated)/command-board/nodes/cards/*.tsx`

**Changes**:

1. Set explicit width in node data or card components
2. Standard width: 280px or 320px
3. Apply to all card types

**Acceptance**:

- [ ] All cards have same width
- [ ] Width is predictable and looks good

**Status**: ⏳ Pending

---

### Task 3.3: Fix MiniMap Styling [low]

**Bug**: BUG-08 — MiniMap uses fragile !important overrides

**Files**:

- `apps/app/app/(authenticated)/command-board/components/board-flow.tsx`

**Changes**:

1. Remove `!important` from MiniMap/Controls classes
2. Use proper CSS classes that respect theme
3. Apply brand color palette

**Acceptance**:

- [ ] MiniMap styled without `!important`
- [ ] Styling respects theme colors

**Status**: ⏳ Pending

---

## Testing Checklist

After each fix:

- [ ] Verify bug is fixed
- [ ] Test with all entity types (event, client, task, employee, inventory, note)
- [ ] Check for regressions in board operations (drag, delete, select, add)
- [ ] Test with multiple users (Liveblocks realtime)
- [ ] Test edge cases (empty board, many entities, network errors)
- [ ] Verify keyboard shortcuts still work
- [ ] Check mobile/tablet layouts (if applicable)

## Commit Format

Each commit should follow:

```
fix(command-board): [brief description]

- Fixed [specific issue]
- Added [specific change]

Fixes BUG-XX
```

## Notes

- Focus on P0 (critical) first, then P1 (high priority)
- P2 (cosmetic) fixes are nice-to-have
- Preserve existing functionality
- Maintain realtime collaboration (Liveblocks)
- Add error handling where needed
- Test thoroughly before moving to next task

## Current Status

🔴 **Not Started** — Awaiting planning phase completion
