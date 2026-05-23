# Spec: Entity Detail Panel — Wire Up & Polish

> Priority: P0 — This is the most impactful quick fix. The component exists but isn't connected.

## Problem

Clicking a card on the board opens a Sheet with "Entity detail panel coming soon" placeholder text. The `EntityDetailPanel` component is fully built but not rendered.

## Fix (Minimal)

Replace the inline Sheet in `board-shell.tsx` (lines 247-268) with:

```tsx
import { EntityDetailPanel } from "./entity-detail-panel";

// In the JSX:
<EntityDetailPanel
  entityType={openDetailEntity?.entityType as EntityType}
  entityId={openDetailEntity?.entityId ?? ""}
  open={openDetailEntity !== null}
  onOpenChange={(open) => {
    if (!open) handleCloseDetail();
  }}
/>;
```

Remove the inline `<Sheet>` block, the `detailEntityTitle` memo, and the `SheetContent` placeholder.

## Polish (After Wiring)

### 1. Quick Actions in Detail Panel

Each entity type should have contextual quick actions in the panel footer:

- **Event**: "View Timeline", "Assign Staff", "Generate Proposal"
- **Client**: "View Events", "Send Email", "Create Proposal"
- **Task**: "Mark Complete", "Reassign", "Set Priority"
- **Employee**: "View Schedule", "Assign to Event"

### 2. Related Entities Section

Show a "Related" section at the bottom of each detail view listing other entities connected to this one (derived from the same relationship data that generates board edges).

### 3. Edit-in-Place

Allow inline editing of key fields directly in the detail panel without navigating to the full page. Start with:

- Event: title, status, date
- Task: status, priority, assignee
- Note: title, content

### 4. Activity Feed

Show recent changes to the entity (audit log) at the bottom of the detail panel.

## Acceptance Criteria

- [x] Clicking a card opens the detail panel with real entity data
- [x] Loading skeleton shows while fetching
- [x] Error state shows with retry button on failure
- [x] "Open Full Page" link navigates to the correct module page
- [x] Panel closes cleanly (no stale state on reopen)

> All criteria verified and completed (2026-02-18). See `entity-detail-panel.tsx` for implementation.
