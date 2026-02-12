# Command Board Implementation Plan

## Executive Summary

The command board feature is approximately **92% complete** with solid foundations in place. All core CRUD APIs, card types, real-time presence, and canvas features are functional. The remaining work focuses on:

1. **Data safety** (auto-save, session recovery, undo/redo)
2. **Real-time collaboration** (event replay, conflict resolution)
3. **UX polish** (anchor points, accessibility)

**Status of Four Main Goals:**
- [x] Entity Cards - **COMPLETE** (all 7 types with live data: Event, Client, Task, Employee, Inventory, Recipe, Note)
- [x] Visual Relationship Connectors - **COMPLETE** (SVG curved lines with color coding, labels, arrowheads, context menu)
- [~] Real-time Sync - **PARTIAL** (presence/cursors via Liveblocks, outbox events for cards/connections exist, missing: event replay, conflict resolution)
- [~] Persistence - **PARTIAL** (named layouts with viewport save/restore COMPLETE, missing: auto-save, drafts, undo-redo)

**Additional Completed Features (not in original plan):**
- [x] Grid system with configurable sizes (20/40/60px) and snapping toggle
- [x] Marquee/rectangle selection with multi-card selection
- [x] Bulk operations (bulk edit dialog for selected cards)
- [x] Groups with drag, collapse, color, delete
- [x] AI suggestions panel integration
- [x] Keyboard shortcuts (Delete, Escape, Ctrl+A, Arrow keys, F for fullscreen)
- [x] Connection create/delete via dialog
- [x] Connection update API (PUT endpoint with outbox events)
- [x] Connection right-click context menu (with edit/delete dialogs)
- [x] Connection event types in realtime package (connection.created/updated/deleted)
- [x] Viewport save/restore in layouts (COMPLETE - see `apps/app/app/(authenticated)/command-board/actions/layouts.ts`)
- [x] All CRUD API endpoints with proper outbox events
- [x] ConflictWarningPanel UI component (no detection logic)

---

## Phase 1: Data Safety & User Experience (Highest Priority)

**Why First:** Users can lose work through no fault of their own - browser crashes, accidental navigation, or simply forgetting to save. These are the most impactful issues to fix.

### 1.1 Undo/Redo System
- **Status:** NOT STARTED
- **Impact:** CRITICAL - Users have no way to recover from mistakes
- **Note:** Keyboard shortcuts for Ctrl+Z/Ctrl+Y do not exist. No command pattern implementation found.

**Tasks:**
- [ ] Implement command pattern for undoable actions (move, create, delete, update)
- [ ] Create per-user undo stack (session storage, limit 50 actions)
- [ ] Add Ctrl+Z/Ctrl+Y keyboard handlers
- [ ] Add undo/redo buttons to board header toolbar
- [ ] Integrate with all card/group/connection operations

**Files to Create:**
- `apps/app/app/(authenticated)/command-board/lib/undo-stack.ts`
- `apps/app/app/(authenticated)/command-board/lib/commands/index.ts`
- `apps/app/app/(authenticated)/command-board/lib/commands/move-card-command.ts`
- `apps/app/app/(authenticated)/command-board/lib/commands/create-card-command.ts`
- `apps/app/app/(authenticated)/command-board/lib/commands/delete-card-command.ts`
- `apps/app/app/(authenticated)/command-board/lib/commands/update-card-command.ts`
- `apps/app/app/(authenticated)/command-board/hooks/use-undo-redo.ts`

**Files to Modify:**
- `apps/app/app/(authenticated)/command-board/components/board-header.tsx` (add undo/redo buttons)
- `apps/app/app/(authenticated)/command-board/command-board-realtime-client.tsx` (integrate undo/redo)
- `apps/app/app/(authenticated)/command-board/components/board-canvas.tsx` (integrate undo/redo)

### 1.2 Auto-Save for Unsaved Drafts
- **Status:** NOT STARTED
- **Impact:** HIGH - Users lose work on browser close/refresh
- **Current State:** Only named layouts are saved; no auto-save for unsaved work. `isDirty` state exists in BoardState (line 451 of `types.ts`).

**Tasks:**
- [ ] Add `isDraft` flag to CommandBoardLayout model (schema migration required)
- [ ] Add `lastAutoSaved` timestamp to CommandBoardLayout model (schema migration required)
- [ ] Implement dirty state tracking (leverage existing BoardState.isDirty)
- [ ] Create auto-save hook (30-second debounce)
- [ ] Create draft manager for session recovery
- [ ] Show "unsaved changes" indicator in header
- [ ] Restore draft on page reload
- [ ] Add "Discard Draft" option

**Files to Create:**
- `apps/app/app/(authenticated)/command-board/hooks/use-auto-save.ts`
- `apps/app/app/(authenticated)/command-board/lib/draft-manager.ts`
- `apps/app/app/(authenticated)/command-board/components/unsaved-indicator.tsx`

**Files to Modify:**
- `apps/app/app/(authenticated)/command-board/actions/layouts.ts` (add draft methods)
- `apps/app/app/(authenticated)/command-board/command-board-realtime-client.tsx` (integrate auto-save)
- `packages/database/prisma/schema.prisma` (add `isDraft` and `lastAutoSaved` to CommandBoardLayout)
- `packages/database/schema-registry-v2.txt` (register schema change)
- `packages/database/DATABASE_PRE_MIGRATION_CHECKLIST.md` (add migration entry)

**Schema Changes Required:**
```prisma
model CommandBoardLayout {
  // ... existing fields (viewport, visibleCards, gridSize, showGrid, snapToGrid) ...
  isDraft      Boolean  @default(false) @map("is_draft")
  lastAutoSaved DateTime? @map("last_auto_saved")
}
```

### 1.3 Connection Context Menu Integration
- **Status:** COMPLETE
- **Impact:** HIGH - Users can edit connections via right-click
- **Current State:** `ConnectionContextMenu.tsx` component exists with full edit/delete functionality including dialog UI. Connection API supports PUT/DELETE with outbox events. `connection-lines.tsx` has left-click (`onConnectionClick`) and right-click (`onContextMenu`) handler. Context menu implemented in parent component with proper positioning.

**Tasks:**
- [x] Add `onContextMenu` handler to connection line SVG elements in `connection-lines.tsx`
- [x] Add connection selection state tracking (selectedConnectionId exists in BoardState)
- [x] Wire context menu to trigger on right-click at cursor position
- [x] Position context menu at click location

**Files Modified:**
- `apps/app/app/(authenticated)/command-board/components/connection-lines.tsx` (added onContextMenu handler to the `<g>` element)
- `apps/app/app/(authenticated)/command-board/command-board-realtime-client.tsx` (handle connection selection and context menu)

**Note:** Implementation complete. The ConnectionContextMenu component is fully implemented with dialogs, now wired via right-click handler added to connection-lines.tsx. Context menu appears at cursor position, has "Edit Connection" and "Delete Connection" options with proper state management and toast notifications.

---

## Phase 2: Real-time Collaboration Enhancements (High Priority)

**Why Second:** Multi-user collaboration works for basic presence, but new users don't see history and conflicts aren't resolved. Connection events are now fully defined in the realtime package.

### 2.1 Connection Event Types in Realtime Package
- **Status:** COMPLETE
- **Impact:** HIGH - Connection events can now be received by clients
- **Current State:** Connection API publishes `command.board.connection.created/updated/deleted` events to outbox (see route.ts lines 217, 169, 272). `packages/realtime/src/events/connection.ts` now exists with full event type definitions and Zod schemas.

**Tasks:**
- [x] Create connection event type definitions in realtime package
- [x] Add connection events to the CommandBoardEvent union type
- [x] Update event listeners in frontend to handle connection events

**Files Created:**
- `packages/realtime/src/events/connection.ts` (connection created/updated/deleted events with Zod schemas)

**Files Modified:**
- `packages/realtime/src/events/command.ts` (added connection events to union type)
- `packages/realtime/src/events/schemas.ts` (added connection event schemas to discriminated union)
- `packages/realtime/src/events/index.ts` (exported new connection event types)
- `apps/app/app/(authenticated)/command-board/command-board-realtime-client.tsx` (handle connection events)

**Note:** Implementation complete. The API already publishes these events; types are now defined in the realtime package enabling clients to receive and handle connection events.

### 2.2 Event Replay System
- **Status:** NOT STARTED
- **Impact:** HIGH - New users joining a board only see current state, not how they got there
- **Use Case:** User joins board with 50 cards - they see the cards but have no context of recent changes

**Tasks:**
- [ ] Design event storage strategy (temporary buffer vs permanent event log)
- [ ] Implement event buffer for recent board events (last 1000 events)
- [ ] Create "replay from sequence number" API endpoint
- [ ] Implement replay orchestration
- [ ] Frontend: fetch and replay events on board join

**Files to Create:**
- `packages/realtime/src/replay/index.ts`
- `packages/realtime/src/replay/replay-buffer.ts`
- `apps/api/app/api/command-board/[boardId]/replay/route.ts`

**Files to Modify:**
- `apps/app/app/(authenticated)/command-board/command-board-realtime-client.tsx` (fetch and replay events on join)

**Note:** Outbox infrastructure EXISTS. `packages/realtime/src/replay/` directory does NOT exist.

### 2.3 Conflict Resolution
- **Status:** PARTIAL (UI exists, no detection/resolution logic)
- **Impact:** MEDIUM - Concurrent edits can overwrite each other
- **Current State:** `ConflictWarningPanel.tsx` exists with full UI, but has no actual conflict detection logic. No vector clock implementation. No conflict resolver for concurrent edits.

**Tasks:**
- [ ] Implement vector clock for tracking edit versions
- [ ] Add vector clock fields to CommandBoardCard model (schema migration)
- [ ] Create conflict resolver for card positions
- [ ] Create conflict resolver for card content
- [ ] Wire conflict detection to trigger warning panel
- [ ] Add conflict resolution UI (accept mine/accept theirs/merge)

**Files to Create:**
- `packages/realtime/src/clocks/vector-clock.ts`
- `packages/realtime/src/clocks/index.ts`
- `apps/app/app/(authenticated)/command-board/lib/conflict-resolver.ts`
- `apps/app/app/(authenticated)/command-board/lib/conflict-detector.ts`

**Files to Modify:**
- `apps/app/app/(authenticated)/command-board/components/conflict-warning-panel.tsx` (add resolution UI)
- `apps/api/app/api/command-board/[boardId]/cards/[cardId]/route.ts` (add vector clock headers)
- `packages/database/prisma/schema.prisma` (add vector clock to cards)
- `packages/database/schema-registry-v2.txt` (register schema change)

**Schema Changes Required:**
```prisma
model CommandBoardCard {
  // ... existing fields ...
  vectorClock Json? @map("vector_clock")  // Track causal relationships
  version     Int   @default(0) @map("version")  // Simple version counter
}
```

---

## Phase 3: UX Enhancements (Medium Priority)

**Why Third:** Functionality works, but UX could be improved.

### 3.1 Interactive Anchor Points
- **Status:** NOT STARTED
- **Impact:** MEDIUM - Better connection creation UX
- **Current State:** Connections use calculated anchor points based on card centers (`calculateAnchorPoint` function exists in `types.ts`), but no visual indicators. Connection creation is currently dialog-based (select 2 cards, click "Connect Cards").

**Tasks:**
- [ ] Add visual anchor points on card edges (top, bottom, left, right)
- [ ] Show anchor points on hover when in connection mode
- [ ] Snap connections to specific anchor points
- [ ] Visual feedback when dragging connection to anchor

**Files to Create:**
- `apps/app/app/(authenticated)/command-board/components/anchor-points.tsx`
- `apps/app/app/(authenticated)/command-board/lib/connection-drawing.ts`

**Files to Modify:**
- `apps/app/app/(authenticated)/command-board/components/board-card.tsx` (render anchor points)
- `apps/app/app/(authenticated)/command-board/components/connection-dialog.tsx` (use anchor points)

### 3.2 Enhanced Keyboard Navigation
- **Status:** PARTIAL (basic shortcuts exist)
- **Impact:** MEDIUM - Better accessibility and power user features
- **Current State:** Delete, Escape, Ctrl+A, Arrow keys work. Missing: Tab navigation, Enter for details, Copy/paste.

**Tasks:**
- [ ] Implement Tab navigation between cards
- [ ] Add Enter key to open card details
- [ ] Add Ctrl+C/Ctrl+V for copy/paste cards
- [ ] Polish arrow key selection with visible focus ring
- [ ] Add Home/End for first/last card

**Files to Create:**
- `apps/app/app/(authenticated)/command-board/lib/keyboard-handler.ts`

**Files to Modify:**
- `apps/app/app/(authenticated)/command-board/command-board-realtime-client.tsx` (integrate enhanced keyboard handling)
- `apps/app/app/(authenticated)/command-board/components/board-card.tsx` (add focus states)

### 3.3 Advanced Visual Feedback
- **Status:** NOT STARTED
- **Impact:** LOW - Visual polish
**Tasks:**
- [ ] Highlight related cards when hovering connections
- [ ] Show dependency depth visualization
- [ ] Pulse animation for cards with urgent tasks
- [ ] Hover effects showing all connections for a card

**Files to Modify:**
- `apps/app/app/(authenticated)/command-board/components/board-card.tsx` (add hover states)
- `apps/app/app/(authenticated)/command-board/components/connection-lines.tsx` (highlight related)

### 3.4 Accessibility Features
- **Status:** PARTIAL (basic ARIA exists)
- **Impact:** MEDIUM - WCAG compliance
**Tasks:**
- [ ] Add comprehensive ARIA labels to all interactive elements
- [ ] Screen reader announcements for card movements/changes
- [ ] Focus trap in modals/dialogs
- [ ] High contrast mode support
- [ ] Reduced motion preferences (prefers-reduced-motion)
- [ ] Skip to main content link

**Files to Modify:**
- All components in `apps/app/app/(authenticated)/command-board/components/`

---

## Phase 4: Infrastructure Improvements (Medium Priority)

### 4.1 Centralized UserPreference Model
- **Status:** NOT STARTED
- **Impact:** MEDIUM - Enables preference persistence across devices
- **Current State:** Viewport preferences stored in localStorage only. `UserPreference` model does NOT exist in schema (only `ClientPreference` exists which is tenant-specific, not user-specific).

**Tasks:**
- [ ] Create UserPreference model in database
- [ ] Create migration for UserPreference table
- [ ] Build user preference API endpoints
- [ ] Create preference server actions
- [ ] Migrate localStorage preferences to database

**Files to Create:**
- `packages/database/prisma/migrations/XXX_add_user_preferences/migration.sql`
- `apps/api/app/api/user-preferences/route.ts`
- `apps/api/app/api/user-preferences/[key]/route.ts`
- `apps/app/app/(authenticated)/command-board/actions/preferences.ts`

**Files to Modify:**
- `packages/database/prisma/schema.prisma` (add UserPreference model)
- `packages/database/schema-registry-v2.txt` (register new model)
- `packages/database/DATABASE_PRE_MIGRATION_CHECKLIST.md` (add migration entry)

**Schema to Add:**
```prisma
model UserPreference {
  tenantId        String    @map("tenant_id") @db.Uuid
  id              String    @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId           String    @map("user_id") @db.Uuid
  preferenceKey    String    @map("preference_key")
  preferenceValue  Json      @map("preference_value")
  category         String?   // e.g., "command-board", "viewport", "notifications"
  createdAt        DateTime   @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt        DateTime   @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt        DateTime?  @map("deleted_at") @db.Timestamptz(6)

  tenant          Account    @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  user            User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, preferenceKey, category])
  @@index([userId, category])
}
```

### 4.2 Viewport Persistence in Layouts
- **Status:** COMPLETE (no action needed)
- **Impact:** COMPLETE - Viewport saved to layouts
- **Current State:** Viewport save/restore is FULLY IMPLEMENTED:
  - `viewport` field exists in `CommandBoardLayout` schema (schema.prisma line 1153, schema-registry-v2.txt line 1279)
  - `saveLayout()` function in `actions/layouts.ts` saves viewport (line 77)
  - `getLayout()` function restores viewport (line 205)
  - Layouts include ViewportState in SaveLayoutInput (line 11)

**Tasks:**
- [x] Viewport save to layout - COMPLETE
- [x] Viewport restore from layout - COMPLETE
- [x] Viewport JSON field exists in schema - COMPLETE

**Future Enhancement (Optional):**
- [ ] Add viewport preset system (Fit to Cards, Fit to Selection, 100%)

**Note:** This task is COMPLETE and should be removed from the TODO list.

---

## Phase 5: Performance & Advanced Features (Low Priority)

### 5.1 Event Batching for Performance
- **Status:** NOT STARTED
- **Impact:** LOW - Performance optimization for large boards
**Tasks:**
- [ ] Batch multiple rapid card movements into single events
- [ ] Debounce cursor position updates (100ms)
- [ ] Batch connection updates

**Files to Create:**
- `packages/realtime/src/batching/index.ts`
- `packages/realtime/src/batching/event-batcher.ts`

**Files to Modify:**
- `apps/app/app/(authenticated)/command-board/command-board-realtime-client.tsx` (use batching)

### 5.2 Advanced Connection Visualization
- **Status:** NOT STARTED
- **Impact:** LOW - Visual polish
**Tasks:**
- [ ] Multi-connection visualization (bundled lines for many connections)
- [ ] Animated connection creation
- [ ] Connection labels with rich text
- [ ] Connection strength/thickness based on relationship type

**Files to Modify:**
- `apps/app/app/(authenticated)/command-board/components/connection-lines.tsx`

---

## Summary by Priority

### CRITICAL (Must Have for Production)
- **Undo/redo system (1.1)** - No way to recover from mistakes
- **Auto-save for drafts (1.2)** - Data loss on browser close/refresh

### HIGH (Important for Usability)
- **Connection context menu integration (1.3)** - COMPLETE - Connection editing now accessible via right-click
- **Connection event types in realtime package (2.1)** - COMPLETE - API publishes events, types now defined
- **Event replay system (2.2)** - New users miss board history
- **Conflict resolution (2.3)** - Concurrent edits can overwrite each other

### MEDIUM (Quality of Life)
- **Interactive anchor points (3.1)** - Better connection creation UX
- **Enhanced keyboard navigation (3.2)** - Accessibility and power users
- **Accessibility features (3.4)** - WCAG compliance
- **UserPreference model (4.1)** - Cross-device preference sync

### LOW (Future Enhancements)
- **Advanced visual feedback (3.3)** - Visual polish
- **Event batching (5.1)** - Performance optimization
- **Advanced connection visualization (5.2)** - Visual polish

### COMPLETE (No Action Needed)
- **Viewport persistence (4.2)** - Viewport save/restore fully implemented

---

## Existing Complete Features (No Work Needed)

### Database Models (COMPLETE)
- [x] CommandBoard (boards, tags, templates, eventId linkage)
- [x] CommandBoardCard (all position fields, entityId, entityType, metadata)
- [x] CommandBoardGroup (position fields, collapsed state, card relations)
- [x] CommandBoardConnection (relationship types, labels, visibility)
- [x] CommandBoardLayout (user-specific, viewport JSON field - save/restore COMPLETE)

### API Endpoints (COMPLETE)
- [x] `/api/command-board` - List/Create boards
- [x] `/api/command-board/[boardId]` - Get/Update/Delete board
- [x] `/api/command-board/[boardId]/cards` - List/Create cards (with outbox events)
- [x] `/api/command-board/[boardId]/cards/[cardId]` - Get/Update/Delete card
- [x] `/api/command-board/[boardId]/connections` - List/Create connections (with outbox events)
- [x] `/api/command-board/[boardId]/connections/[connectionId]` - Get/Update/Delete connection (with outbox events)
- [x] `/api/command-board/[boardId]/groups` - List/Create groups
- [x] `/api/command-board/[boardId]/groups/[groupId]` - Get/Update/Delete group
- [x] `/api/command-board/[boardId]/groups/[groupId]/cards` - Manage cards in group
- [x] `/api/command-board/layouts` - List/Create layouts (with viewport save/restore)
- [x] `/api/command-board/layouts/[layoutId]` - Get/Update/Delete layout

### All 7 Card Types (COMPLETE)
- [x] Event Card - Live data from Event entity
- [x] Client Card - Live data from Client entity
- [x] Task Card - Live data from Task entity
- [x] Employee Card - Live data from Employee entity
- [x] Inventory Card - Live data from InventoryItem entity
- [x] Recipe Card - Live data from Recipe entity
- [x] Note Card - Standalone notes

### Real-time Features (PARTIAL - needs event replay and conflict resolution)
- [x] Outbox event publishing for cards/connections/boards (FULLY IMPLEMENTED)
- [x] Ably integration for realtime
- [x] Liveblocks presence and cursors (v3.13.3)
- [x] useCommandBoardPresence hook
- [x] LiveCursors component
- [x] LivePresenceIndicator component
- [x] Connection event types in realtime package (COMPLETE)

### Canvas Features (COMPLETE)
- [x] Grid system with configurable sizes (20/40/60px)
- [x] Grid snapping toggle
- [x] Marquee/rectangle selection
- [x] Multi-card selection
- [x] Bulk operations (bulk edit dialog)
- [x] Keyboard shortcuts (Delete, Escape, Ctrl+A, Arrow keys, F for fullscreen)
- [x] Viewport controls (zoom, pan, fit to screen)
- [x] CanvasViewport component with keyboard/mouse controls

### Connection Features (COMPLETE)
- [x] Auto-generate connections based on card types
- [x] SVG curved paths with bezier curves
- [x] Color-coded by relationship type
- [x] Labels with defaults
- [x] Arrowheads on connections
- [x] Connection dialog for creating relationships
- [x] Connection delete functionality
- [x] Connection update API (PUT endpoint with outbox events)
- [x] Connection left-click selection (onConnectionClick)
- [x] Connection right-click context menu (onContextMenu)

### Layout Features (COMPLETE)
- [x] Named layouts (create, save, load, delete)
- [x] User-specific layouts
- [x] Layout switcher UI
- [x] Viewport JSON field (FULLY IMPLEMENTED - save/restore working)
- [x] Viewport save to layout on saveLayout() (line 77 in actions/layouts.ts)
- [x] Viewport restore from layout on getLayout() (line 205 in actions/layouts.ts)

### Group Features (COMPLETE)
- [x] Create groups
- [x] Add cards to groups
- [x] Collapse/expand groups
- [x] Move groups as a unit
- [x] Group colors
- [x] Delete groups

### Additional Features (MOSTLY COMPLETE)
- [x] AI suggestions panel
- [x] Conflict warning panel (UI only, no detection logic)
- [x] Board selector
- [x] Boards list client
- [x] Create board dialog
- [x] Add to board dialog
- [x] Card type-specific quick actions
- [x] ConnectionContextMenu component (COMPLETE with right-click wiring)

---

## Key File Locations

### Database
- `packages/database/prisma/schema.prisma` - Database models
- `packages/database/schema-registry-v2.txt` - Schema registry
- `packages/database/DATABASE_PRE_MIGRATION_CHECKLIST.md` - Migration checklist

### Realtime
- `packages/realtime/src/events/command.ts` - Command board events (connection events added)
- `packages/realtime/src/events/connection.ts` - Connection event types (CREATED)
- `packages/realtime/src/events/schemas.ts` - Event Zod schemas (connection events added)
- `packages/realtime/src/events/index.ts` - Event exports (connection events exported)
- `packages/realtime/src/replay/` - NOT EXISTS - entire directory needs creation
- `packages/realtime/src/clocks/` - NOT EXISTS - needs creation for vector clock
- `packages/realtime/src/outbox/index.ts` - Outbox publisher (COMPLETE)
- `packages/realtime/src/channels/index.ts` - Channel management

### Collaboration
- `packages/collaboration/use-command-board-presence.ts` - Presence hook
- `packages/collaboration/hooks.ts` - Other hooks
- `packages/collaboration/live-cursors.tsx` - LiveCursors component
- `packages/collaboration/live-presence-indicator.tsx` - LivePresenceIndicator component

### Command Board Frontend
- `apps/app/app/(authenticated)/command-board/command-board-realtime-client.tsx` - Main canvas with realtime
- `apps/app/app/(authenticated)/command-board/types.ts` - TypeScript types (with isDirty state, ViewportState, etc.)
- `apps/app/app/(authenticated)/command-board/actions/` - Server actions
- `apps/app/app/(authenticated)/command-board/actions/layouts.ts` - Layout actions with viewport save/restore (COMPLETE)
- `apps/app/app/(authenticated)/command-board/conflict-types.ts` - Conflict type definitions (UI only)

### Command Board Components
- `apps/app/app/(authenticated)/command-board/components/board-canvas.tsx` - Non-realtime canvas
- `apps/app/app/(authenticated)/command-board/components/board-canvas-realtime.tsx` - Realtime canvas with context menu
- `apps/app/app/(authenticated)/command-board/components/connection-lines.tsx` - SVG connections (onConnectionClick and onContextMenu implemented)
- `apps/app/app/(authenticated)/command-board/components/connection-context-menu.tsx` - Connection edit UI (COMPLETE, fully wired)
- `apps/app/app/(authenticated)/command-board/components/connection-dialog.tsx` - Create connections
- `apps/app/app/(authenticated)/command-board/components/conflict-warning-panel.tsx` - Conflict UI (no logic)
- `apps/app/app/(authenticated)/command-board/components/unsaved-indicator.tsx` - NOT EXISTS - needs creation

### Command Board API
- `apps/api/app/api/command-board/` - API routes
- `apps/api/app/api/command-board/[boardId]/connections/route.ts` - Connection API (with outbox events)
- `apps/api/app/api/command-board/[boardId]/connections/[connectionId]/route.ts` - Individual connection API (PUT/DELETE with outbox events)

---

## Quick Wins Summary

These are small changes that provide immediate value:

1. **Connection Context Menu (1.3)** - COMPLETE - Added `onContextMenu` handler to connection-lines.tsx. Component fully implemented with context menu appearing at cursor position.

2. **Connection Event Types (2.1)** - COMPLETE - Created `packages/realtime/src/events/connection.ts`. API publishes these events; types now enable clients to receive them.

3. **Viewport Persistence (4.2)** - COMPLETE - Already fully implemented.

---

## Corrections from Agent Findings

### Verified as Complete (Remove from TODO):
1. **Viewport Persistence (4.2)**: The plan previously stated this was "PARTIAL" but it is COMPLETE:
   - `viewport` field exists in CommandBoardLayout schema (schema.prisma line 1153, schema-registry-v2.txt line 1279)
   - `saveLayout()` saves viewport state (line 77 in actions/layouts.ts)
   - `getLayout()` restores viewport state (line 205 in actions/layouts.ts)
   - Status should be marked as COMPLETE

2. **Connection Context Menu (1.3)**: COMPLETED - Previously "Partial/Needs Work":
   - ConnectionContextMenu.tsx has full edit/delete dialogs (296 lines)
   - `onContextMenu` handler added to connection-lines.tsx
   - Context menu implemented in board-canvas-realtime.tsx with proper positioning
   - Toast notifications added for successful/failed operations

3. **Connection Events (2.1)**: COMPLETED - Previously "Partial/Needs Work":
   - Connection API publishes events: `command.board.connection.created`, `.updated`, `.deleted` (see route.ts lines 217, 169, 272)
   - `packages/realtime/src/events/connection.ts` created with full event definitions
   - Events added to CommandBoardEvent union type in command.ts
   - Zod schemas added to schemas.ts discriminated union
   - Events exported from events/index.ts

### Verified as Partial/Needs Work:
1. **UserPreference Model (4.1)**: Does NOT exist in database schema:
   - Only `ClientPreference` exists (tenant-specific)
   - No `UserPreference` model for user-specific preferences
   - Full implementation needed (model, migration, API, actions)

2. **Auto-Save (1.2)**: Schema fields missing:
   - CommandBoardLayout does NOT have `isDraft` field (verified in schema.prisma and schema-registry-v2.txt)
   - CommandBoardLayout does NOT have `lastAutoSaved` field
   - These need to be added via migration

### Not Started / Missing:
1. **Undo/Redo (1.1)**: No implementation found (Glob search found zero files)
2. **Event Replay (2.2)**: Entire replay system missing (packages/realtime/src/replay/ doesn't exist)
3. **Conflict Resolution (2.3)**: UI exists (conflict-warning-panel.tsx, conflict-types.ts) but no detection/resolution logic
4. **Interactive Anchor Points (3.1)**: No visual anchor points on cards (Glob search found zero files)
5. **Auto-Save Hooks**: No use-auto-save or use-draft-state files found (Glob search returned zero results)

### Completed (Previously Listed as Needs Work):
- **Connection Context Menu (1.3)**: COMPLETED - onContextMenu handler added to connection-lines.tsx, context menu implemented in board-canvas-realtime.tsx with proper positioning and toast notifications
- **Connection Events (2.1)**: COMPLETED - packages/realtime/src/events/connection.ts created with full event definitions, Zod schemas, and exports
