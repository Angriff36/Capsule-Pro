# Command Board Feature - Implementation Plan

## Executive Summary

The Command Board feature has a **solid foundation** with approximately **60-65% completion**. Core canvas, 5 of 7 entity card types, real-time sync (via **Liveblocks**, not Ably), and relationship visualization are functional. **Key gaps**: Note and Recipe card types fall back to generic renderer (missing specialized components), Named layouts lack database model and UI (only localStorage exists), Bulk edit is minimal (only basic multi-select), Grouping is completely missing (0% complete).

---

## Feature-by-Feature Status

| Feature | Status | Completion | Key Gaps |
|---------|--------|------------|----------|
| **Strategic Foundation** | Functional | 90% | Browser fullscreen mode, enhanced grid snapping guides |
| **Entity Cards** | Partial | 71% (5/7 types) | Missing Note Card, Recipe Card specialized components |
| **Layout Persistence** | Partial | 40% | No database model, no named layouts UI |
| **Real-time Sync** | Mostly Complete | 75% | No offline queue, no conflict resolution UI, events not persisted to database |
| **Connection Lines** | Mostly Complete | 80% | No visibility toggle UI, no manual connection creation |
| **Bulk Edit** | Minimal | 10% | No Shift+click, no drag selection, no bulk dialog |
| **Grouping** | Missing | 0% | No database model, no components, no actions |

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
**Status: MINIMAL (10%)**

| Feature | Status | Notes |
|---------|--------|-------|
| Select multiple entities | Partial | Only single selection + Ctrl+A |
| Shift+click selection | Missing | No additive keyboard selection |
| Drag selection box (marquee) | Missing | No visual selection rectangle |
| Identify common properties | Missing | No bulk edit analysis |
| Apply bulk edits | Missing | No bulk update endpoint |
| Preview changes | Missing | No preview dialog |
| Support undo/redo | Missing | No history stack |
| Validate bulk edits | Missing | No validation logic |
| Visual selection feedback | Missing | No border on selected cards |

**Current Implementation:**
- Single card selection: Click to select, Escape to deselect
- Select all: Ctrl+A works
- Delete selected: Delete key removes selected cards
- Selection state: `selectedCardIds` in `board-canvas-realtime.tsx`

**Database Schema:**
- No changes needed (can use existing cards table)

**Required Files to Create:**
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\bulk-edit-dialog.tsx` - Dialog for editing multiple cards
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\selection-box.tsx` - Drag selection rectangle
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\actions\bulk-update-cards.ts` - Server action for bulk updates
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\hooks\use-bulk-selection.ts` - Hook for bulk selection logic

---

### 7. Bulk Grouping and Combining
**Status: MISSING (0%)**

| Feature | Status | Notes |
|---------|--------|-------|
| Select and group entities | Missing | No grouping functionality |
| Create named groups | Missing | No group entity |
| Visual clustering | Missing | No group container |
| Expand/collapse groups | Missing | No group state |
| Move groups as unit | Missing | No group drag logic |
| Ungroup entities | Missing | No ungroup action |

**Missing Database Schema:**
```prisma
model CommandBoardGroup {
  tenantId  String   @map("tenant_id") @db.Uuid
  id        String   @default(gen_random_uuid()) @db.Uuid
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

**Required Schema Update to CommandBoardCard:**
```prisma
// Add to CommandBoardCard model:
groupId String? @map("group_id") @db.Uuid
group   CommandBoardGroup? @relation(fields: [groupId], references: [id], onDelete: SetNull)
```

**Required Files to Create:**
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\group-container.tsx`
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\create-group-dialog.tsx`
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\actions\groups.ts`
- Update `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\board-canvas-realtime.tsx` to render groups

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
- `CommandBoardLayout` (for named views feature)
- `CommandBoardGroup` (for grouping feature)
- `CommandBoardTemplate` (for template system - optional)

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
│   ├── layouts.ts                    # [MISSING] Named layouts CRUD
│   ├── bulk-update-cards.ts          # [MISSING] Bulk edit operations
│   └── groups.ts                     # [MISSING] Group CRUD operations
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
│   ├── selection-box.tsx             # [MISSING] Drag selection box
│   ├── bulk-edit-dialog.tsx          # [MISSING] Bulk edit dialog
│   ├── group-container.tsx           # [MISSING] Group rendering
│   ├── create-group-dialog.tsx       # [MISSING] Group creation
│   ├── layout-switcher.tsx           # [MISSING] Layout switcher
│   └── save-layout-dialog.tsx        # [MISSING] Save layout dialog
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

### Phase 1: Quick Wins (Low Effort, High Visibility)

#### Task 1: Add Connection Visibility Toggle UI
**Estimated: 1-2 hours** | Impact: High | Effort: Low

**Why this is first:** Code already has `showConnections` state in `board-canvas-realtime.tsx`. Only needs UI checkbox in settings panel.

**Implementation:**
- Add "Show Connections" checkbox to toolbar/settings panel
- Wire up to existing `showConnections` state
- Toggle re-renders `ConnectionLines` component

**Files to modify:**
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\board-canvas-realtime.tsx` (add checkbox to settings panel)

**Acceptance Criteria:**
- Settings panel displays "Show Connections" checkbox
- Toggling checkbox shows/hides connection lines
- Preference persists in localStorage

---

#### Task 2: Complete Missing Card Types (Note and Recipe)
**Estimated: 4-6 hours** | Impact: High | Effort: Medium

**Why this matters:** Currently note and recipe cards fall back to generic renderer, providing poor UX for these entity types.

**Implementation:**

**Create Note Card:**
```typescript
// C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\cards\note-card.tsx
- Rich text editing support (textarea or lightweight editor)
- Note-specific styling (yellow sticky note aesthetic)
- Color picker for note background (yellow, blue, green, pink)
- Display note content from metadata or content field
- Edit button to open full note editor
```

**Create Recipe Card:**
```typescript
// C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\cards\recipe-card.tsx
- Ingredients display from metadata.ingredients array
- Steps/preparation display from metadata.steps
- Preparation time and servings from metadata
- Link to inventory items (for ingredients)
- View recipe details button
```

**Update board-card.tsx:**
```typescript
// Add to switch statement in renderCardContent():
case "note":
  return <NoteCard card={card} />;
case "recipe":
  return <RecipeCard card={card} />;
```

**Files to create:**
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\cards\note-card.tsx`
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\cards\recipe-card.tsx`

**Files to modify:**
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\board-card.tsx` (add cases to switch statement)

**Acceptance Criteria:**
- Note cards render with sticky note styling
- Recipe cards display ingredients and prep steps
- Both card types have specialized quick actions
- Generic fallback no longer used for these types

---

#### Task 3: Implement Shift+Click Selection
**Estimated: 2-3 hours** | Impact: Medium | Effort: Low

**Why this matters:** Enables basic multi-select workflow without complex drag selection.

**Implementation:**
- Add Shift+click handler to `board-card.tsx`
- Toggle selection state when Shift is held
- Add visual border to selected cards (CSS class update)
- Update selection state management in `board-canvas-realtime.tsx`

**Files to modify:**
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\board-card.tsx` (add Shift+click logic)
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\board-canvas-realtime.tsx` (selection state)

**Acceptance Criteria:**
- Shift+click adds/removes card from selection
- Selected cards show visual border highlight
- Ctrl+A still selects all cards
- Escape deselects all cards

---

### Phase 2: High Impact Features (Medium Effort)

#### Task 4: Implement Drag Selection Box (Marquee)
**Estimated: 6-8 hours** | Impact: High | Effort: Medium

**Why this matters:** Enables true bulk operations workflow with visual selection.

**Implementation:**

**Create Selection Box Component:**
```typescript
// C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\selection-box.tsx
- Visual rectangle overlay on canvas drag
- Calculate intersection with card bounds
- Add/remove cards from selection based on intersection
```

**Add Selection Mode:**
- Listen for mouse events on canvas background
- Draw SVG rect overlay during drag
- Calculate card intersections using bounding box logic
- Update `selectedCardIds` state on drag end

**Files to create:**
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\selection-box.tsx`

**Files to modify:**
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\board-canvas-realtime.tsx` (add selection mode)

**Acceptance Criteria:**
- Ctrl+drag or Shift+drag creates selection rectangle
- Cards within rectangle are selected
- Selection supports additive selection (Shift+drag adds to selection)
- Visual feedback shows selection area

**Dependencies:** None (can be done in parallel with Task 3)

---

#### Task 5: Implement Named Layouts
**Estimated: 10-12 hours** | Impact: High | Effort: Medium-High

**Why this matters:** Major feature gap - users expect to save different board views.

**Implementation:**

**Database:**
- Add `CommandBoardLayout` model to Prisma schema
- Create migration using `pnpm migrate`

**Server Actions:** Create `layouts.ts`
```typescript
// C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\actions\layouts.ts
- saveLayout(boardId, userId, name, viewport, visibleCards, gridSize, showGrid, snapToGrid)
- listLayouts(boardId, userId)
- deleteLayout(layoutId)
- applyLayout(layoutId) - restores viewport and card visibility
```

**UI Components:**
- Add layout switcher dropdown to toolbar (shows saved layouts)
- Add "Save Current Layout" dialog (name input)
- Layout thumbnail preview (optional - can use canvas screenshot)

**Files to create:**
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\actions\layouts.ts`
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\layout-switcher.tsx`
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\save-layout-dialog.tsx`

**Files to modify:**
- `C:\projects\capsule-pro\packages\database\prisma\schema.prisma` (add CommandBoardLayout model)
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\board-canvas-realtime.tsx` (integrate layout switching)

**Acceptance Criteria:**
- User can save current layout with custom name
- Layout switcher shows all saved layouts
- Switching layout restores viewport and card positions
- Deleting layout removes it from list
- Layouts are per-user (different users have different layouts)

**Dependencies:** Requires database migration

---

### Phase 3: Bulk Operations (Higher Effort, High Impact)

#### Task 6: Bulk Edit System
**Estimated: 12-16 hours** | Impact: High | Effort: High

**Prerequisites:** Task 3 (Shift+click) and Task 4 (Drag selection) must be complete

**Implementation:**

**Server Action:** Create `bulk-update-cards.ts`
```typescript
// C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\actions\bulk-update-cards.ts
- bulkUpdateCards(cardIds, updates) - Update multiple cards in transaction
- Validation logic (check common editable properties)
- Return validation errors for conflicting values
```

**UI Component:** Create `bulk-edit-dialog.tsx`
```typescript
// C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\bulk-edit-dialog.tsx
- Show selected cards count
- Identify common editable properties (status, color, assignee, due date)
- Show "mixed" indicator for properties with different values
- Preview changes before applying
- Validation for conflicting values
```

**Toolbar Integration:**
- Add "Bulk Edit" button (enabled when 2+ cards selected)
- Keyboard shortcut: Ctrl+E or Cmd+E

**Files to create:**
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\actions\bulk-update-cards.ts`
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\bulk-edit-dialog.tsx`

**Files to modify:**
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\board-canvas-realtime.tsx` (add bulk edit button)

**Acceptance Criteria:**
- Bulk Edit button appears when 2+ cards selected
- Dialog shows common properties across selected cards
- Can update status, color, priority for all selected cards
- Validation prevents conflicting updates
- Changes apply to all selected cards

**Dependencies:** Tasks 3, 4

---

### Phase 4: Advanced Grouping (Highest Effort, Lower Priority)

#### Task 7: Bulk Grouping System
**Estimated: 20-28 hours** | Impact: Medium | Effort: Very High

**Prerequisites:** Task 3 and Task 4 (multi-select) must be complete

**Implementation:**

**Database:**
- Add `CommandBoardGroup` model to Prisma schema
- Add `groupId` field to `CommandBoardCard` model
- Create migration

**Server Actions:** Create `groups.ts`
```typescript
// C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\actions\groups.ts
- createGroup(boardId, name, color, cardIds)
- updateGroup(groupId, updates)
- deleteGroup(groupId)
- addToGroup(groupId, cardIds)
- removeFromGroup(groupId, cardIds)
- expandGroup(groupId) / collapseGroup(groupId)
```

**UI Components:**
- Create `group-container.tsx`
  - Visual box with border and label
  - Drag group moves all contained cards
  - Expand/collapse animation
  - Resize group bounds
- Create `create-group-dialog.tsx`
  - Group name input
  - Color picker for group border/background
- Update `board-canvas-realtime.tsx` to render groups at appropriate z-index

**Files to create:**
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\group-container.tsx`
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\create-group-dialog.tsx`
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\actions\groups.ts`

**Files to modify:**
- `C:\projects\capsule-pro\packages\database\prisma\schema.prisma` (add CommandBoardGroup model)
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\command-board\components\board-canvas-realtime.tsx` (render groups)

**Acceptance Criteria:**
- Can select cards and create group
- Groups render as visual containers
- Dragging group moves all contained cards
- Groups can be expanded/collapsed
- Cards can be added/removed from groups
- Groups can be deleted

**Dependencies:** Tasks 3, 4, requires database migration

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
