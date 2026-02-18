# Spec: Connection & Relationship Visualization

> Priority: P2 — Connections work but need visual polish and interaction design

## Current State

### Derived Connections

The `derive-connections` server action auto-generates edges from database relationships:

- `client_to_event` — Client has events
- `event_to_task` — Event includes prep/kitchen tasks
- `event_to_employee` — Employee assigned to event
- `event_to_shipment` — Shipment for event
- `client_to_proposal` — Client has proposals

These are rendered as React Flow edges with color-coded strokes and optional dash patterns (defined in `RELATIONSHIP_STYLES`).

### Annotations

Manual connections created by users (stored in `BoardAnnotation` table). Types: connection, label, region.

### What Works

- Edges render between connected projections
- Color coding per relationship type
- Dash patterns for certain relationship types
- Edges update when nodes are dragged

### What's Missing

1. No edge labels visible (relationship type/label not shown)
2. No hover interaction on edges
3. No way to create manual connections (annotation UI not built)
4. No way to delete connections
5. No edge animation (flow direction)
6. Connection routing is basic (straight or default bezier)

## Improvements

### Phase 1: Visual Polish

#### 1.1 Edge Labels

- Show relationship label on the edge midpoint
- Use `edgeLabel` or custom edge component
- Label should be small (text-[10px]), semi-transparent, and become fully opaque on hover
- Background pill behind label for readability

#### 1.2 Edge Hover State

- On hover: increase stroke width from 1.5 to 3
- Show label (if hidden by default)
- Show a small tooltip with: relationship type, source entity name, target entity name

#### 1.3 Edge Animation

- Subtle animated dash pattern showing flow direction (from source to target)
- Use CSS `stroke-dashoffset` animation
- Only animate on hover to avoid visual noise

#### 1.4 Smart Routing

- Use React Flow's `smoothstep` or `bezier` edge type instead of default
- Avoid edges crossing through nodes where possible
- Consider `elkjs` layout engine for automatic edge routing on complex boards

### Phase 2: Interaction

#### 2.1 Edge Context Menu

- Right-click on edge → context menu
- Options: "View Relationship", "Hide Connection", "Delete" (for annotations only)
- Derived connections can be hidden but not deleted (they're auto-generated)

#### 2.2 Manual Connection Creation

- Drag from a node handle to another node handle
- On connection, show a dialog to set relationship type and label
- Save as `BoardAnnotation` with type "connection"
- Use React Flow's `onConnect` handler

#### 2.3 Connection Filtering

- Toggle visibility of connection types in the board header or a filter panel
- E.g., show only "event_to_employee" connections to see staffing
- Useful for reducing visual clutter on busy boards

### Phase 3: Advanced

#### 3.1 Connection Strength Visualization

- Vary edge thickness based on relationship strength/count
- E.g., a client with 10 events gets a thicker line than one with 1 event

#### 3.2 Path Highlighting

- Click a node → highlight all connected edges and their target nodes
- Dim unconnected nodes
- Shows the "neighborhood" of an entity

#### 3.3 Relationship Legend

- Small legend panel showing color/dash meanings
- Toggleable from board header

## Acceptance Criteria (Phase 1)

- [x] Edge labels visible (at least on hover)
- [x] Edges thicken on hover
- [x] Tooltip shows relationship details on edge hover
- [x] Edges use smooth routing (not straight lines)

> **Status**: All Phase 1 criteria completed (2026-02-18). See `board-edge.tsx` for implementation.
