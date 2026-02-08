# Command Board Feature - Implementation Plan

## Executive Summary

The Command Board feature has a **strong foundation** with approximately **95% completion**. Core canvas, all 7 entity card types, real-time sync (via **Liveblocks**, not Ably), relationship visualization, named layouts, bulk edit, and grouping are functional. **Key gaps**: Connection visibility toggle has UI but could be enhanced, Manual connection creation is missing.

---

## Feature-by-Feature Status

| Feature | Status | Completion | Key Gaps |
|---------|--------|------------|----------|
| **Strategic Foundation** | Functional | 90% | Browser fullscreen mode, enhanced grid snapping guides |
| **Entity Cards** | Complete | 100% (7/7 types) | All card types implemented |
| **Layout Persistence** | Complete | 100% | Named layouts with database persistence |
| **Real-time Sync** | Mostly Complete | 75% | No offline queue, no conflict resolution UI, events not persisted to database |
| **Connection Lines** | Mostly Complete | 80% | Visibility toggle exists, no manual connection creation |
| **Bulk Edit** | Complete | 100% | Multi-select, drag selection, bulk edit dialog all functional |
| **Grouping** | Complete | 100% | Database model, components, actions all implemented |

---

## Specification-by-Specification Status

### 1. Strategic Command Board Foundation
**Status: COMPLETE (90%)**

| Feature | Status | Notes |
|---------|--------|-------|
| Full-screen canvas | Complete | `CanvasViewport` with 4000x4000px canvas |
| Drag-and-drop functionality | Complete | `DraggableCard` with react-moveable |
| Grid system | Complete | `GridLayer` with configurable sizes (20/40/60px) |
| Zoom controls | Complete | 0.25x to 2x zoom with wheel/buttons |
| Pan functionality | Complete | Middle-click or Space+drag |
| Multiple entity types | Partial | 5/7 card types implemented (missing: note, recipe) |
| Grid snapping | Partial | Basic snap to grid, no enhanced snapping guides |
| Full-screen mode | Missing | No browser fullscreen API integration |

**Files:**
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\canvas-viewport.tsx` - Zoom/pan viewport component
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\draggable-card.tsx` - Drag/resize with react-moveable
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\grid-layer.tsx` - Grid background with configurable size
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\viewport-controls.tsx` - Zoom controls UI

**Acceptance Status:**
- Canvas renders with grid and zoom controls
- Drag entity moves smoothly, position updates
- Zoom in/out works correctly (0.25x-2x range)
- Pan board works (middle-click or Space+drag)
- Fit to screen functionality exists
- Keyboard shortcuts (Space to pan, +/- to zoom, Escape to deselect)
- Missing: Browser fullscreen mode, enhanced grid snapping guides

---

### 2. Command Board Entity Cards
**Status: PARTIAL (71% - 5 of 7 types)**

| Feature | Status | Notes |
|---------|--------|-------|
| Display entity cards for 5 types | Complete | TaskCard, EventCard, ClientCard, EmployeeCard, InventoryCard |
| Show key information | Complete | Each specialized card shows relevant data |
| Support dragging cards | Complete | Via DraggableCard wrapper |
| Quick actions | Complete | Edit, view details buttons on cards |
| Color-code by type/status | Complete | Status badges, type indicators |
| Card selection (single) | Complete | Click to select, Escape to deselect |
| Card selection (multiple) | Partial | Only Ctrl+A works; missing Shift+click, drag selection |
| Visual selection feedback | Missing | No selection border highlight on cards |

**Files:**
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\cards\task-card.tsx` - Task card with priority, status, due dates
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\cards\event-card.tsx` - Event card with date, venue, guest count
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\cards\client-card.tsx` - Client card with contact details
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\cards\employee-card.tsx` - Employee card with role, avatar
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\cards\inventory-card.tsx` - Inventory card with quantity, reorder level
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\board-card.tsx` - Card wrapper with routing logic

**MISSING Card Types (use generic fallback):**
- `components/cards/note-card.tsx` - Falls back to generic renderer with "Note" label
- `components/cards/recipe-card.tsx` - Falls back to generic renderer showing "recipe" as type

**Missing Multi-Select Features:**
- Shift+click additive selection
- Visual drag-selection box (marquee)
- Visual selection border on selected cards

---

### 3. Command Board Layout Persistence
**Status: PARTIAL (40%)**

| Feature | Status | Notes |
|---------|--------|-------|
| Save entity positions per user | Complete | Database persistence via updateCard action |
| Save zoom/view preferences | Complete | localStorage persistence in board-canvas-realtime.tsx |
| Restore saved layout | Complete | Auto-restores from localStorage on mount |
| Support multiple saved layouts (named views) | Missing | No database model or UI |
| Auto-persist layout changes | Partial | Positions persist, but not named layouts |
| Tenant isolation | Complete | Prisma queries filtered by tenantId |

**Files:**
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\board-canvas-realtime.tsx` (lines 204-236) - LocalStorage persistence
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\actions\cards.ts` - Position persistence via updateCard

**CRITICAL MISSING:** Named layouts feature requires:
1. Database model: `CommandBoardLayout` (does not exist)
2. API actions: `saveLayout`, `listLayouts`, `deleteLayout`, `applyLayout`
3. UI components: Layout switcher, save layout dialog

**Missing Database Schema:**
```prisma
model CommandBoardLayout {
  tenantId     String   @map("tenant_id") @db.Uuid
  id           String   @default(gen_random_uuid()) @db.Uuid
  boardId      String   @map("board_id") @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  name         String
  viewport     Json
  visibleCards String[]
  gridSize     Int      @default(40)
  showGrid     Boolean  @default(true)
  snapToGrid   Boolean  @default(true)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@id([tenantId, id])
  @@unique([boardId, userId, name])
  @@index([boardId])
  @@index([userId])
  @@map("command_board_layouts")
  @@schema("tenant_events")
}
```

**Acceptance Status:**
- Entity positions saved automatically
- Refresh page restores layout
- Create named view - NOT IMPLEMENTED
- Switch between saved views - NOT IMPLEMENTED
- View board as different user shows their layout - Works via localStorage
- Layout save fails with error message - NOT IMPLEMENTED (silent failures)

---

### 4. Real-time Command Board Sync
**Status: MOSTLY COMPLETE (75%)**

| Feature | Status | Notes |
|---------|--------|-------|
| Sync entity positions | Complete | Broadcasts CARD_MOVED events via Liveblocks |
| Show cursor positions | Complete | `LiveCursors` from @repo/collaboration |
| Sync entity updates | Complete | CARD_UPDATED event handling |
| Handle concurrent edits | Complete | Last-write-wins via Liveblocks |
| Presence indicators | Complete | `useCommandBoardPresence` hook |
| Reconnection handling | Partial | Liveblocks handles basic reconnection, no offline queue |
| Conflict resolution UI | Missing | No manual merge interface |
| Network interruption recovery | Missing | No offline edit queue, no debouncing |

**Technology Stack:**
- **Liveblocks** (NOT Ably) - `@liveblocks/client`, `@liveblocks/node`, `@liveblocks/react`
- Custom `@repo/collaboration` package wrapping Liveblocks

**Files:**
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\command-board-realtime-client.tsx` - Real-time client setup
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\board-canvas-realtime.tsx` (lines 246-285) - Event listeners for CARD_MOVED, CARD_ADDED, CARD_DELETED
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\command-board-wrapper.tsx` - Liveblocks Room integration
- `C:\projects\capsule-pro\packages\collaboration\` - Custom collaboration package

**Real-time Events Implemented:**
- `CARD_MOVED` - Position sync during drag
- `CARD_ADDED` - New card appearance
- `CARD_DELETED` - Card removal
- Presence/cursor tracking via `LiveCursors` component

**Missing:**
- Explicit offline edit queue (edits lost if offline)
- Conflict resolution UI for manual merge decisions
- Debouncing for rapid position updates
- Network status indicator
- Optimistic UI updates with rollback on conflict
- Event persistence to database (events only broadcast via Liveblocks, not stored)

---

### 5. Visual Relationship Connectors
**Status: MOSTLY COMPLETE (80%)**

| Feature | Status | Notes |
|---------|--------|-------|
| Display relationship lines | Complete | `ConnectionLines` SVG component |
| Different line styles per type | Complete | 5 relationship types with colors/dash arrays |
| Auto-update on drag | Complete | Lines recalculate on card position change |
| Support multiple relationships | Complete | Auto-generates all valid connections |
| Highlight on hover/selection | Complete | Selected state with glow effect |
| Toggle visibility | Partial | Code supports it but NO UI checkbox in settings |
| Manual connection creation | Missing | No drag-to-connect or context menu |
| Delete individual connections | Missing | No connection context menu |

**Files:**
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\connection-lines.tsx` - SVG connection rendering with 5 types
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\board-canvas-realtime.tsx` (lines 79-198) - Auto-connection detection logic

**Auto-connection Logic (Automatic based on metadata):**
- Client -> Event (via `metadata.entityId`)
- Event -> Task (via `metadata.eventId`)
- Event -> Inventory (via `metadata.eventId`)
- Task -> Employee (via `metadata.assignee`)

**Connection Types Implemented:**
- `client_to_event` (blue solid - "has")
- `event_to_task` (green solid - "includes")
- `task_to_employee` (orange dashed - "assigned")
- `event_to_inventory` (purple solid - "uses")
- `generic` (gray dotted - "related")

**QUICK WIN:** Add "Show Connections" checkbox to toolbar settings panel (code already has `showConnections` state, just needs UI control)

**Missing:**
- UI toggle for connection visibility (settings panel has no checkbox)
- Manual relationship creation UI (drag from card edge to another card)
- Delete/hide individual connections (no connection context menu)
- Edit connection properties (label, type)

---

### 6. Bulk Edit Operations
**Status: COMPLETE (100%)**

| Feature | Status | Notes |
|---------|--------|-------|
| Select multiple entities | Complete | Single click, Shift+click, Ctrl+A, drag selection |
| Shift+click selection | Complete | Additive keyboard selection |
| Drag selection box (marquee) | Complete | Visual selection rectangle |
| Identify common properties | Complete | Bulk edit dialog analyzes common values |
| Apply bulk edits | Complete | Bulk update endpoint implemented |
| Preview changes | Complete | Dialog shows current values before edit |
| Support undo/redo | Missing | No history stack |
| Validate bulk edits | Complete | Validates at least one field is modified |
| Visual selection feedback | Complete | Selection borders on selected cards |

**Current Implementation:**
- Single card selection: Click to select, Escape to deselect
- Shift+click: Toggle selection for individual cards
- Drag selection: Visual marquee selects cards in rectangle
- Ctrl+A: Select all cards
- Delete key: Removes selected cards
- Ctrl+E / Cmd+E: Opens bulk edit dialog (when 2+ cards selected)
- Selection state: `selectedCardIds` in `board-canvas-realtime.tsx`

**Database Schema:**
- No changes needed (uses existing cards table)

**Files Created:**
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\bulk-edit-dialog.tsx` - Dialog for editing multiple cards ✅
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\actions\bulk-update-cards.ts` - Server action for bulk updates ✅

**Acceptance Status:**
- Bulk Edit button appears when 2+ cards selected ✅
- Dialog shows common properties across selected cards ✅
- Can update status, color, title, content for all selected cards ✅
- "Mixed" indicator when cards have different values ✅
- Changes apply to all selected cards ✅
- Keyboard shortcut Ctrl+E / Cmd+E opens dialog ✅

**Still Missing:**
- Undo/redo stack for bulk operations (nice-to-have)

---

### 7. Bulk Grouping and Combining
**Status: COMPLETE (100%)** ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Select and group entities | Complete | "Create Group" button when 2+ cards selected |
| Create named groups | Complete | CreateGroupDialog with name and color picker |
| Visual clustering | Complete | GroupContainer with colored borders |
| Expand/collapse groups | Complete | Collapse button hides contained cards |
| Move groups as unit | Complete | Dragging group moves all contained cards |
| Delete groups | Complete | Delete button in group context menu |
| Ungroup entities | Partial | Can delete group to ungroup (no explicit "ungroup" action) |

**Database Schema:** ✅ Implemented
```prisma
model CommandBoardGroup {
  tenantId  String   @map("tenant_id") @db.Uuid
  id        String   @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  boardId   String   @map("board_id") @db.Uuid
  name      String
  color     String?
  collapsed Boolean  @default(false)
  positionX Int      @default(0) @map("position_x")
  positionY Int      @default(0) @map("position_y")
  width     Int      @default(300)
  height    Int      @default(200)
  zIndex    Int      @default(0) @map("z_index")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)

  board     CommandBoard @relation(fields: [tenantId, boardId], references: [tenantId, id], onDelete: Cascade)
  cards     CommandBoardCard[]

  @@id([tenantId, id])
  @@index([boardId])
  @@map("command_board_groups")
  @@schema("tenant_events")
}
```

**Schema Update to CommandBoardCard:** ✅ Implemented
```prisma
// Added to CommandBoardCard model:
groupId String? @map("group_id") @db.Uuid
group   CommandBoardGroup? @relation("CardGroup", fields: [tenantId, groupId], references: [tenantId, id])
```

**Files Created:** ✅
- `apps/app/app/(authenticated)/command-board/actions/groups.ts` - Server actions for CRUD operations
- `apps/app/app/(authenticated)/command-board/components/create-group-dialog.tsx` - Group creation dialog
- `apps/app/app/(authenticated)/command-board/components/group-container.tsx` - Group rendering component

**Files Modified:**
- `apps/app/app/(authenticated)/command-board/components/board-canvas-realtime.tsx` - Group rendering, handlers, UI integration
- `apps/app/app/(authenticated)/command-board/types.ts` - Group types and utilities
- `packages/database/prisma/schema.prisma` - CommandBoardGroup model

**Acceptance Status:**
- Can select cards and create group ✅
- Groups render as visual containers ✅
- Dragging group moves all contained cards ✅
- Groups can be expanded/collapsed ✅
- Cards can be added/removed from groups ✅ (via create dialog)
- Groups can be deleted ✅

**Implementation Details:**
- Groups are rendered on canvas before cards (so cards appear on top)
- Cards inside collapsed groups are hidden from view
- When a group is dragged, all contained cards move by the same delta
- Group position changes are persisted to database
- "Create Group" button appears in toolbar when 2+ cards are selected

**Still Missing:**
- Explicit "ungroup" action (can only delete group to ungroup)
- Drag-and-drop cards into/out of groups
- Individual card removal from group via UI

---

## Database Schema Status

### Existing Models (COMPLETE)
```prisma
model CommandBoard {
  tenantId    String   @map("tenant_id") @db.Uuid
  id          String   @default(gen_random_uuid()) @db.Uuid
  eventId     String?  @map("event_id") @db.Uuid
  name        String
  description String?
  status      String   @default("draft")
  isTemplate  Boolean  @default(false) @map("is_template")  // UNUSED - requires template feature
  tags        String[]
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt   DateTime? @map("deleted_at") @db.Timestamptz(6)

  cards CommandBoardCard[]

  @@id([tenantId, id])
  @@index([eventId])
  @@index([tags], map: "idx_command_boards_tags_gin", type: Gin)
  @@map("command_boards")
  @@schema("tenant_events")
}

model CommandBoardCard {
  tenantId  String   @map("tenant_id") @db.Uuid
  id        String   @default(gen_random_uuid()) @db.Uuid
  boardId   String   @map("board_id") @db.Uuid
  title     String
  content   String?
  cardType  String   @default("task") @map("card_type")
  status    String   @default("pending")
  positionX Int      @default(0) @map("position_x")
  positionY Int      @default(0) @map("position_y")
  width     Int      @default(200)
  height    Int      @default(150)
  zIndex    Int      @default(0) @map("z_index")
  color     String?
  metadata  Json     @default("{}")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)

  board CommandBoard @relation(fields: [tenantId, boardId], references: [tenantId, id], onDelete: Cascade)

  @@id([tenantId, id])
  @@index([boardId])
  @@index([zIndex])
  @@map("command_board_cards")
  @@schema("tenant_events")
}
```

**IMPORTANT SCHEMA NOTE:** The project uses `dbgenerated("gen_random_uuid()")` throughout the schema. Follow this existing pattern for consistency when adding new models.

### Missing Models
- `CommandBoardTemplate` (for template system - optional)

### Models Added During Implementation
- `CommandBoardLayout` (for named views feature) ✅
- `CommandBoardGroup` (for grouping feature) ✅

---

## File Structure Reference

```
C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board/
├── page.tsx                          # Root page (redirects to default)
├── [boardId]/page.tsx                # Dynamic board page
├── layout.tsx                        # Layout wrapper
├── command-board-wrapper.tsx         # Main wrapper component (Liveblocks Room)
├── command-board-realtime-client.tsx # Real-time client setup
├── types.ts                          # TypeScript types and utilities
├── actions/
│   ├── boards.ts                     # Board CRUD operations
│   ├── cards.ts                      # Card CRUD operations
│   ├── entity-cards.ts               # Entity card creation
│   ├── conflicts.ts                  # Conflict detection
│   ├── suggestions.ts                # AI suggestions
│   ├── suggestions-types.ts          # Suggestion types
│   ├── layouts.ts                    # [COMPLETE] Named layouts CRUD
│   ├── bulk-update-cards.ts          # [COMPLETE] Bulk edit operations
│   └── groups.ts                     # [COMPLETE] Group CRUD operations
├── components/
│   ├── board-canvas.tsx              # Non-realtime canvas
│   ├── board-canvas-realtime.tsx     # Realtime canvas with Liveblocks
│   ├── board-card.tsx                # Card wrapper component (handles note/recipe fallback)
│   ├── canvas-viewport.tsx           # Zoom/pan viewport
│   ├── connection-lines.tsx          # SVG connection rendering
│   ├── draggable-card.tsx            # Drag/resize with react-moveable
│   ├── grid-layer.tsx                # Grid background
│   ├── viewport-controls.tsx         # Zoom controls UI
│   ├── conflict-warning-panel.tsx    # Conflict warnings
│   ├── suggestions-panel.tsx         # AI suggestions UI
│   ├── selection-box.tsx             # [RENDERED INLINE] Drag selection box
│   ├── bulk-edit-dialog.tsx          # [COMPLETE] Bulk edit dialog
│   ├── group-container.tsx           # [COMPLETE] Group rendering
│   ├── create-group-dialog.tsx       # [COMPLETE] Group creation
│   ├── layout-switcher.tsx           # [COMPLETE] Layout switcher
│   └── save-layout-dialog.tsx        # [COMPLETE] Save layout dialog
│   └── cards/
│       ├── task-card.tsx             # Task card (COMPLETE)
│       ├── event-card.tsx            # Event card (COMPLETE)
│       ├── client-card.tsx           # Client card (COMPLETE)
│       ├── employee-card.tsx         # Employee card (COMPLETE)
│       ├── inventory-card.tsx        # Inventory card (COMPLETE)
│       ├── note-card.tsx             # [MISSING] Falls back to generic
│       └── recipe-card.tsx           # [MISSING] Falls back to generic
└── hooks/
    ├── use-suggestions.ts            # AI suggestions hook
    ├── use-bulk-selection.ts         # [MISSING] Bulk selection hook
    └── use-undo-redo.ts              # [MISSING] Undo/redo hook

C:\projects\capsule-pro\packages\collaboration/
├── index.ts                          # Main exports
├── room.tsx                          # Liveblocks Room wrapper
├── hooks.ts                          # Custom hooks (useBroadcastEvent, useEventListener)
├── live-cursors.tsx                  # Cursor display component
├── live-cursor.tsx                   # Single cursor component
├── live-presence-indicator.tsx       # Presence indicator
├── use-command-board-presence.ts     # Board-specific presence hook
├── auth.ts                           # Liveblocks authentication
├── config.ts                         # Liveblocks configuration
└── keys.ts                           # API keys

C:\projects\capsule-pro\packages\database\prisma\
└── schema.prisma                     # Database schema (uses dbgenerated("gen_random_uuid()"))
```

---

## Implementation Tasks (Prioritized by Impact vs Effort)

### Phase 1: Quick Wins (Low Effort, High Visibility) ✅ COMPLETE

#### Task 1: Add Connection Visibility Toggle UI ✅ COMPLETE
**Status:** Already implemented - checkbox exists in settings panel (lines 741-751)

#### Task 2: Complete Missing Card Types (Note and Recipe) ✅ COMPLETE
**Status:** Implemented in commit c5b83e3ec
- NoteCard with color-coded sticky note design (yellow, blue, green, pink, purple)
- RecipeCard with difficulty badges, prep/cook time, ingredients, and steps
- Both cards route through board-card.tsx

#### Task 3: Shift+Click Selection ✅ COMPLETE
**Status:** Already implemented in handleCardClick (lines 357-365)
- Shift+click toggles card selection
- Visual border feedback on selected cards

#### Task 4: Drag Selection Box (Marquee) ✅ COMPLETE
**Status:** Implemented in commit 193a43552
- Drag on canvas background creates selection rectangle
- Shift+drag for additive selection
- Visual selection rectangle with primary border and background
- Esc key cancels selection

**Phase 1 Summary:** All Quick Wins complete! Multi-select workflow fully functional.

---

### Phase 2: High Impact Features (Medium Effort) ✅ COMPLETE

#### Task 5: Implement Named Layouts ✅ COMPLETE
**Status:** Implemented in commit 3b96274a8
- Database: CommandBoardLayout model added, migration deployed
- Server Actions: saveLayout, listLayouts, getLayout, deleteLayout
- UI Components: LayoutSwitcher dropdown, SaveLayoutDialog
- Layouts save viewport, visible cards, grid settings
- Per-user isolation (different users have different layouts)

**Phase 2 Summary:** Named Layouts feature complete! Users can save and switch between different board views.

---

### Phase 3: Bulk Operations (Higher Effort, High Impact) ✅ COMPLETE

#### Task 6: Bulk Edit System ✅ COMPLETE
**Estimated: 12-16 hours** | Impact: High | Effort: High
**Status:** Implemented

**Prerequisites:** Task 3 (Shift+click) and Task 4 (Drag selection) must be complete ✅

**Implementation:**

**Server Action:** Create `bulk-update-cards.ts` ✅
```typescript
// C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\actions\bulk-update-cards.ts
- bulkUpdateCards(cardIds, updates) - Update multiple cards in transaction
- Supports updating: status, color, title, content
- Returns updated count and error messages
```

**UI Component:** Create `bulk-edit-dialog.tsx` ✅
```typescript
// C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\bulk-edit-dialog.tsx
- Shows selected cards count
- Identifies common editable properties (status, color, title, content)
- Shows "mixed" indicator for properties with different values
- Uses expand-to-edit pattern (click "Change status" to edit)
- Validation for at least one field being modified
```

**Toolbar Integration:** ✅
- "Bulk Edit" button appears when 2+ cards selected
- Button shows count: "Edit 3 Cards"
- Keyboard shortcut: Ctrl+E / Cmd+E

**Files created:**
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\actions\bulk-update-cards.ts` ✅
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\bulk-edit-dialog.tsx` ✅

**Files modified:**
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\board-canvas-realtime.tsx` ✅

**Acceptance Criteria:**
- Bulk Edit button appears when 2+ cards selected ✅
- Dialog shows common properties across selected cards ✅
- Can update status, color, title, content for all selected cards ✅
- "Mixed" indicator when cards have different values ✅
- Changes apply to all selected cards ✅
- Keyboard shortcut Ctrl+E / Cmd+E opens dialog ✅

**Dependencies:** Tasks 3, 4 ✅

**Phase 3 Summary:** Bulk Edit System complete! Users can now efficiently edit multiple cards at once.

---

### Phase 4: Advanced Grouping ✅ COMPLETE

#### Task 7: Bulk Grouping System ✅ COMPLETE
**Estimated: 20-28 hours** | Impact: Medium | Effort: Very High
**Status:** Implemented in commit c0ff993d8

**Prerequisites:** Task 3 and Task 4 (multi-select) ✅ Complete

**Implementation Complete:**

**Database:** ✅
- Added `CommandBoardGroup` model to Prisma schema
- Added `groupId` field to `CommandBoardCard` model
- Created migration

**Server Actions:** ✅ Created `groups.ts`
```typescript
// C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\actions\groups.ts
- createGroup(boardId, name, color, cardIds) ✅
- updateGroup(groupId, updates) ✅
- deleteGroup(groupId) ✅
- addCardsToGroup(groupId, cardIds) ✅
- removeCardsFromGroup(groupId, cardIds) ✅
- toggleGroupCollapsed(groupId) ✅
- getGroupsForBoard(boardId) ✅
```

**UI Components:** ✅
- Created `group-container.tsx`
  - Visual box with border and label
  - Drag group moves all contained cards
  - Expand/collapse animation
  - Resize group bounds
- Created `create-group-dialog.tsx`
  - Group name input
  - Color picker for group border/background
- Updated `board-canvas-realtime.tsx` to render groups at appropriate z-index

**Files created:**
- `apps/app/app/(authenticated)/command-board/components/group-container.tsx` ✅
- `apps/app/app/(authenticated)/command-board/components/create-group-dialog.tsx` ✅
- `apps/app/app/(authenticated)/command-board/actions/groups.ts` ✅

**Files modified:**
- `packages/database/prisma/schema.prisma` (add CommandBoardGroup model) ✅
- `apps/app/app/(authenticated)/command-board/components/board-canvas-realtime.tsx` (render groups) ✅
- `apps/app/app/(authenticated)/command-board/types.ts` (add group types) ✅

**Acceptance Criteria:**
- Can select cards and create group ✅
- Groups render as visual containers ✅
- Dragging group moves all contained cards ✅
- Groups can be expanded/collapsed ✅
- Cards can be added/removed from groups ✅
- Groups can be deleted ✅

**Dependencies:** Tasks 3, 4 ✅ Complete, database migration ✅ Deployed

**Phase 4 Summary:** Grouping feature complete! Users can now organize cards into groups, move them together, and collapse them for cleaner views.

---

### Phase 5: Optional Enhancements (Nice to Have)

#### Task 8: Connection Management UI
**Estimated: 8-10 hours** | Impact: Medium | Effort: Medium

- Add "Create Connection" mode/tool to toolbar
- Create connection creation dialog
  - Select source and target cards
  - Select relationship type
  - Optional label
- Delete connection (with confirmation)
- Edit connection properties
- Connection context menu (right-click on connection)

#### Task 9: Board Template System
**Estimated: 10-12 hours** | Impact: Medium | Effort: Medium

- Implement `isTemplate` field usage in CommandBoard model
- Create `templates.ts` actions
  - `saveAsTemplate(boardId, name, description)`
  - `listTemplates()`
  - `applyTemplate(templateId, boardId)`
- Create template gallery UI
- Add template thumbnail generation

#### Task 10: Advanced Canvas Features
**Estimated: 20-24 hours** | Impact: Low-Medium | Effort: High

- Undo/redo stack (Command pattern)
- Copy/paste cards (clipboard API)
- Card alignment tools (align left, right, top, bottom, distribute)
- Minimap component
- Filter cards by type/status
- Canvas search

#### Task 11: Export/Import
**Estimated: 8-10 hours** | Impact: Low | Effort: Medium

- Export board as JSON
- Export canvas as image (html2canvas or similar)
- Import board from JSON
- Share board link

---

## Key Technologies Used

- **Drag/Resize**: `react-moveable` - Already installed
- **Real-time**: Liveblocks via `@repo/collaboration` (NOT Ably)
  - `@liveblocks/client` - v3.13.3
  - `@liveblocks/node` - v3.13.3
  - `@liveblocks/react` - v3.13.3
- **Database**: Prisma with Neon PostgreSQL
- **Styling**: Tailwind CSS v4
- **UI Components**: `@repo/design-system` (shadcn/ui)

---

## Dependencies Between Tasks

- **Task 3 (Shift+click)** and **Task 4 (Drag selection)** must be completed before **Task 6 (Bulk Edit)**
- **Task 5 (Named Layouts)** is independent - can be done anytime
- **Task 7 (Grouping)** requires Task 3 and Task 4 (multi-select) to be useful
- **Task 8 (Connection Management)** can be done independently
- **Tasks 9-11 (Optional)** can be done in any order after core features

---

## Estimated Total Effort

| Phase | Tasks | Estimated Hours |
|-------|-------|-----------------|
| Phase 1: Quick Wins | 3 tasks | 7-11 hours |
| Phase 2: High Impact | 2 tasks | 16-20 hours |
| Phase 3: Bulk Operations | 1 task | 12-16 hours |
| Phase 4: Grouping | 1 task | 20-28 hours |
| Phase 5: Optional | 4 tasks | 46-56 hours |
| **Total (Phases 1-4)** | **7 tasks** | **55-75 hours** |
| **Total (All Phases)** | **11 tasks** | **101-131 hours** |

---

## Next Steps

### Immediate Actions (This Week):
1. **Task 1: Add Connection Toggle** (1-2 hours) - Quick visible win
2. **Task 2: Complete Missing Cards** (4-6 hours) - Finish card type coverage
3. **Task 3: Shift+Click Selection** (2-3 hours) - Enable multi-select workflow

### Short Term (Next 2 Weeks):
4. **Task 4: Drag Selection Box** (6-8 hours) - True multi-selection
5. **Task 5: Named Layouts** (10-12 hours) - Major feature completion

### Medium Term (Next Month):
6. **Task 6: Bulk Edit System** (12-16 hours) - Power user features
7. **Task 7: Grouping System** (20-28 hours) - Advanced organization

### Development Workflow:
- Test each feature thoroughly before moving to the next
- Run validation after each task: `pnpm lint && pnpm format && pnpm build`
- Consider creating separate feature branches for major features
- Update this plan as implementation progresses

---

## Critical Implementation Notes

### Database Migration Requirements:
1. **CommandBoardLayout** - Required for Task 5 (Named Layouts)
2. **CommandBoardGroup** + **CommandBoardCard.groupId** - Required for Task 7 (Grouping)

### Prisma Schema Rules (CRITICAL):
- Follow existing pattern: `dbgenerated("gen_random_uuid()")` NOT `gen_random_uuid()`
- Field names: camelCase with `@map("snake_case")`
- Relation references use Prisma field names, NOT DB column names

### Real-time Considerations:
- Uses **Liveblocks** (NOT Ably) for real-time features
- New features should broadcast events via Liveblocks for collaborative editing
- Connection state is handled by `@repo/collaboration` package
- Consider offline queues for critical operations (future enhancement)
- Events are currently NOT persisted to database - only broadcast via Liveblocks

### Multi-tenancy:
- All database models MUST include `tenantId`
- All queries MUST filter by `tenantId`
- Follow existing patterns in `boards.ts` and `cards.ts`

---

## Known Issues and Limitations

### Current State (As of Exploration):
1. **Note and Recipe cards** fall back to generic renderer - poor UX
2. **Connection visibility toggle** has no UI control despite code support
3. **Liveblocks events** are not persisted to database (only broadcast)
4. **No offline support** - changes lost if network fails during edit
5. **No conflict resolution UI** - last-write-wins only
6. **No bulk operations** beyond basic multi-select
7. **No grouping functionality** at all
8. **No named layouts** - only localStorage persistence

### Technical Debt:
- Consider migrating from `dbgenerated("gen_random_uuid()")` to `gen_random_uuid()` for cleaner schema
- Liveblocks integration could benefit from offline queue for reliability
- Connection management lacks user controls (create, delete, edit)
