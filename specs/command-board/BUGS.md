# Command Board — Known Bugs & Issues

> Priority: P0 = blocks usage, P1 = degrades experience, P2 = cosmetic/minor

## P0 — Critical

### BUG-01: Entity Detail Panel Not Wired Up

**Location**: `board-shell.tsx` lines 247-268

**Problem**: When a user clicks a card on the board, the Sheet opens but shows placeholder text "Entity detail panel coming soon" instead of actual entity details. The `EntityDetailPanel` component (`entity-detail-panel.tsx`) is fully built with:

- Loading skeleton
- Error state with retry
- Detail view routing (event, client, task, employee, generic)
- "Open Full Page" link in footer

**Root Cause**: `BoardShell` renders a raw `<Sheet>` with placeholder content instead of using the `<EntityDetailPanel>` component.

**Fix**: Replace the inline Sheet in `BoardShell` with `<EntityDetailPanel>` component, passing `entityType`, `entityId`, `open`, and `onOpenChange` props from the existing `openDetailEntity` state.

---

## P1 — Degrades Experience

### BUG-02: Duplicate Entities on Board

**Problem**: The Entity Browser allows adding the same entity to the board multiple times. No duplicate check, no visual indicator that an entity is already projected.

**Expected**: Either prevent duplicates or show an "already on board" badge/indicator in the browser list.

### BUG-03: Undo/Redo Disconnected

**Location**: `board-shell.tsx` line 199-200

**Problem**: `canUndo` and `canRedo` are hardcoded to `false`. The old undo system (UndoManager, command pattern) was removed when the custom canvas was replaced with React Flow. No new undo system has been implemented.

**Impact**: Users cannot undo accidental moves or deletions.

### BUG-04: Entity Browser Stale After Board Changes

**Problem**: When entities are added to the board via the Entity Browser, the browser doesn't update to reflect which items are already on the board. If an entity is removed from the board, the browser doesn't know.

### BUG-05: No Error Boundary on Board

**Problem**: If the React Flow canvas throws an error (e.g., bad node data, missing entity), the entire page crashes. No error boundary catches and recovers gracefully.

---

## P2 — Cosmetic / Minor

### BUG-06: Random Placement Offset

**Location**: `entity-browser.tsx` lines 178-180

**Problem**: When adding entities from the browser, position uses `Math.random() * 300` offset from viewport center. This can cause overlapping cards and doesn't feel intentional.

**Expected**: Use a smarter placement algorithm — grid-based, spiral, or at least check for overlaps.

### BUG-07: Card Width Not Constrained

**Problem**: `ProjectionNode` doesn't set explicit width on the React Flow node. Cards auto-size based on content, leading to inconsistent widths across entity types.

### BUG-08: MiniMap/Controls Styling

**Problem**: MiniMap and Controls use `!important` overrides (`!bg-card !border-border !shadow-md`) which is fragile and doesn't respect the brand color palette.
