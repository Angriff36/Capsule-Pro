# Command Board — Known Bugs & Issues

> Priority: P0 = blocks usage, P1 = degrades experience, P2 = cosmetic/minor
> Last updated: 2026-02-18

## P0 — Critical

### BUG-01: Entity Detail Panel Not Wired Up ✅ FIXED

**Location**: `board-shell.tsx` lines 247-268

**Problem**: ~~When a user clicks a card on the board, the Sheet opens but shows placeholder text "Entity detail panel coming soon" instead of actual entity details. The `EntityDetailPanel` component (`entity-detail-panel.tsx`) is fully built with:~~

**Fix Applied**: EntityDetailPanel is now properly wired in BoardShell with loading states, error handling, detail view routing, and "Open Full Page" links.

---

## P1 — Degrades Experience

### BUG-02: Duplicate Entities on Board ✅ FIXED

**Problem**: ~~The Entity Browser allows adding the same entity to the board multiple times. No duplicate check, no visual indicator that an entity is already projected.~~

**Fix Applied**: Entity Browser now shows "On board" badge for entities already projected and prevents duplicates with toast notification.

### BUG-03: Undo/Redo Disconnected ✅ FIXED

**Location**: `board-shell.tsx` line 199-200

**Problem**: ~~`canUndo` and `canRedo` are hardcoded to `false`. The old undo system (UndoManager, command pattern) was removed when the custom canvas was replaced with React Flow. No new undo system has been implemented.~~

**Fix Applied**: useBoardHistory hook now properly implements canUndo/canRedo with keyboard shortcuts (Cmd+Z, Cmd+Shift+Z).

### BUG-04: Entity Browser Stale After Board Changes ✅ FIXED

**Problem**: ~~When entities are added to the board via the Entity Browser, the browser doesn't update to reflect which items are already on the board. If an entity is removed from the board, the browser doesn't know.~~

**Fix Applied**: Entity Browser now tracks projections in real-time and updates "On board" indicators accordingly.

### BUG-05: No Error Boundary on Board ✅ FIXED

**Problem**: ~~If the React Flow canvas throws an error (e.g., bad node data, missing entity), the entire page crashes. No error boundary catches and recovers gracefully.~~

**Fix Applied**: ErrorBoundary component now wraps BoardFlow for graceful error recovery with retry option.

---

## P2 — Cosmetic / Minor

### BUG-06: Random Placement Offset ✅ FIXED

**Location**: `entity-browser.tsx` lines 178-180

**Problem**: ~~When adding entities from the browser, position uses `Math.random() * 300` offset from viewport center. This can cause overlapping cards and doesn't feel intentional.~~

**Fix Applied**: Grid-based placement algorithm now used - entities are placed in a 3-column grid pattern based on existing projection count.

### BUG-07: Card Width Not Constrained

**Status**: OPEN

**Problem**: `ProjectionNode` doesn't set explicit width on the React Flow node. Cards auto-size based on content, leading to inconsistent widths across entity types.

### BUG-08: MiniMap/Controls Styling

**Status**: OPEN

**Problem**: MiniMap and Controls use `!important` overrides (`!bg-card !border-border !shadow-md`) which is fragile and doesn't respect the brand color palette.
