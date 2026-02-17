# Command Board — Current State

> Last updated: 2026-02-17

## What Is the Command Board?

The Command Board is the **primary interface** for Convoy — a spatial, relational operations dashboard built on React Flow (`@xyflow/react`). It replaces traditional spreadsheet/list/form UI with a visual canvas where every card represents a live entity (event, client, task, employee, etc.).

The board is the default route: `/` redirects to `/command-board`.

## Architecture

```
BoardShell (client component, wraps everything)
├── ReactFlowProvider
├── BoardRoom (Liveblocks realtime wrapper)
│   ├── BoardHeader (name, status, actions, entity browser toggle)
│   ├── BoardFlow (React Flow canvas)
│   │   ├── ProjectionNode → entity-specific card components
│   │   ├── Derived connection edges (auto-generated from relationships)
│   │   ├── Annotation edges (manual connections)
│   │   ├── MiniMap, Controls, Background
│   │   └── Drag persistence, batch position updates
│   ├── EntityBrowser (right sidebar, Ctrl+E)
│   ├── CommandPalette (Cmd+K)
│   ├── AiChatPanel (Cmd+J)
│   └── Entity Detail Sheet (slide-over panel)
```

## Data Model

### Database Tables

- `CommandBoard` — Board definition (name, status, scope, tags, autoPopulate)
- `BoardProjection` — Entity placement on a board (position, size, zIndex, color, collapsed, pinned, groupId)
- `BoardAnnotation` — Manual connections/labels/regions between projections

All tables use composite PKs `(tenantId, id)` and soft deletes.

### Type System

- `EntityType` — 13 entity types: event, client, prep_task, kitchen_task, employee, inventory_item, recipe, dish, proposal, shipment, note, risk, financial_projection
- `ResolvedEntity` — Discriminated union of all resolved entity data
- `BoardProjection` — Position + metadata for an entity on a board
- `DerivedConnection` — Auto-generated relationship edges
- `ProjectionNode` / `BoardEdge` — React Flow node/edge types

## What's Built and Working

| Feature             | Status      | Notes                                                   |
| ------------------- | ----------- | ------------------------------------------------------- |
| React Flow canvas   | Done        | Replaced entire custom canvas stack                     |
| 7 entity card types | Done        | event, client, task, employee, inventory, risk, financial, note, generic |
| Entity resolution   | Done        | Batched server action resolves all entity types         |
| Derived connections | Done        | Auto-generates edges from DB relationships              |
| Drag persistence    | Done        | Single + batch position updates                         |
| Keyboard delete     | Done        | Backspace/Delete removes projections                    |
| Multi-select        | Done        | Shift+click, drag selection                             |
| Entity Browser      | Done        | Collapsible categories, lazy loading, add-to-board      |
| Command Palette     | Done        | Cmd+K, quick actions                                    |
| AI Chat Panel       | Done        | Cmd+J, streaming responses                              |
| Entity Detail Panel | Done        | Fully wired with loading states, error handling         |
| Liveblocks realtime | Done        | Cursor presence, position sync, add/remove broadcast    |
| Auto-population     | Done        | Smart board seeding based on scope                      |
| Board CRUD          | Done        | Create, update, delete boards                           |
| MiniMap             | Done        | Color-coded by entity type                              |
| Snap to grid        | Done        | 20px grid                                               |
| Fit view            | Done        | Auto-fits on load                                       |

## Known Bugs

All previously documented bugs have been resolved:

1. ~~**Entity Detail Panel not wired up**~~ — **FIXED**: EntityDetailPanel is now properly wired in BoardShell with loading states, error handling, detail view routing, and "Open Full Page" links.

2. ~~**Entity Browser has no "already on board" indicator**~~ — **FIXED**: Entity Browser now shows "On board" badge for entities already projected and prevents duplicates with toast notification.

3. **Entity Browser has no search/filter** — With many entities per category, there's no way to find a specific one without scrolling.

4. ~~**Undo/Redo not connected**~~ — **FIXED**: useBoardHistory hook now properly implements canUndo/canRedo with keyboard shortcuts.

5. ~~**No Error Boundary**~~ — **FIXED**: ErrorBoundary component now wraps BoardFlow for graceful error recovery.

## Keyboard Shortcuts

| Shortcut         | Action                      |
| ---------------- | --------------------------- |
| Cmd/Ctrl+K       | Toggle Command Palette      |
| Cmd/Ctrl+J       | Toggle AI Chat Panel        |
| Cmd/Ctrl+E       | Toggle Entity Browser       |
| Backspace/Delete | Remove selected projections |
| Shift+Click      | Multi-select                |
| Drag on canvas   | Selection box               |

## File Structure

```
apps/app/app/(authenticated)/command-board/
├── [boardId]/page.tsx          # Board detail page (server component)
├── page.tsx                    # Board list / create page
├── layout.tsx                  # Layout wrapper
├── types/
│   ├── entities.ts             # EntityType, ResolvedEntity, colors, labels
│   ├── board.ts                # BoardProjection, DerivedConnection, styles
│   ├── flow.ts                 # React Flow node/edge types, converters
│   └── index.ts                # Re-exports
├── actions/
│   ├── boards.ts               # Board CRUD
│   ├── projections.ts          # Projection CRUD, position updates
│   ├── resolve-entities.ts     # Batched entity resolver
│   ├── derive-connections.ts   # Auto-generate relationship edges
│   ├── search-entities.ts      # Search for Cmd+K
│   ├── browse-entities.ts      # Browse for Entity Browser
│   ├── auto-populate.ts        # Smart board seeding
│   ├── execute-command.ts      # Command execution
│   └── command-definitions.ts  # Command registry
├── components/
│   ├── board-shell.tsx          # Main client wrapper
│   ├── board-flow.tsx           # React Flow canvas
│   ├── board-room.tsx           # Liveblocks Room wrapper
│   ├── board-header.tsx         # Top bar
│   ├── command-palette.tsx      # Cmd+K
│   ├── ai-chat-panel.tsx        # Cmd+J
│   ├── entity-search.tsx        # Search component
│   ├── entity-browser.tsx       # Right sidebar browser
│   ├── entity-detail-panel.tsx  # Slide-over detail panel
│   ├── boards-list-client.tsx   # Board list page
│   ├── add-to-board-dialog.tsx  # Add entity dialog
│   └── detail-views/
│       ├── event-detail.tsx
│       ├── client-detail.tsx
│       ├── employee-detail.tsx
│       ├── task-detail.tsx
│       └── generic-detail.tsx
├── nodes/
│   ├── projection-node.tsx      # Card wrapper (handles, selection, click)
│   ├── node-types.ts            # React Flow nodeTypes registry
│   └── cards/
│       ├── event-card.tsx
│       ├── client-card.tsx
│       ├── employee-card.tsx
│       ├── task-card.tsx
│       ├── inventory-card.tsx
│       ├── risk-card.tsx
│       ├── financial-projection-card.tsx
│       ├── note-card.tsx
│       └── generic-card.tsx
└── hooks/
    ├── use-board-sync.ts        # Realtime sync event system
    ├── use-board-history.ts     # Undo/Redo history management
    ├── use-inventory-realtime.ts # Real-time inventory updates
    └── use-liveblocks-sync.ts   # Liveblocks integration
```
