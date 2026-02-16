# Spec: UI Polish — Cards, Canvas, and Visual Design

> Priority: P1 — The board works but doesn't feel premium. This spec covers visual refinement.

## Brand Context

- **Charcoal**: #1e1c1a (primary dark)
- **Almost White**: #f7f4ef (primary light)
- **Avocado Mash**: #a9b388 (accent)
- Design system: shadcn/ui New York + CVA + Radix, Tailwind v4

## Card Design

### Current State

Cards are functional but visually basic:

- 4px colored left border (entity type accent)
- Light background tint per entity type
- Basic text layout with icons
- No consistent width
- No hover micro-interactions beyond shadow

### Improvements

#### 1. Consistent Card Dimensions

- Set default node width: 280px (via React Flow `style` or `width` prop)
- Min height: 80px (prevent tiny cards for minimal data)
- Max height: 200px with overflow hidden + fade gradient
- Cards with `collapsed: true` in projection should show compact mode (title + type badge only, ~48px height)

#### 2. Card Header Refinement

- Entity type icon + label on the left
- Status badge on the right (already exists for events)
- Standardize status badges across ALL entity types that have status (events, tasks, proposals, shipments)
- Use brand-aligned badge colors:
  - Active/Confirmed: avocado mash bg
  - Draft/Pending: muted bg
  - Cancelled/Overdue: destructive

#### 3. Card Content Density

- **Compact mode** (collapsed): Title + type icon + status badge. Single line.
- **Default mode**: Title + 2-3 key fields. Current layout.
- **Expanded mode** (future): Full detail with all fields. Triggered by double-click or expand button.

#### 4. Hover & Selection States

- **Hover**: Subtle lift (translateY -1px), shadow increase, border brightens
- **Selected**: Ring-2 primary (already exists), add subtle pulse animation on first select
- **Dragging**: Slight scale(1.02), increased shadow, reduced opacity on original position
- **Stale**: Current opacity-60 is good, add a subtle striped background pattern

#### 5. Card Actions (on hover)

Show a small action bar on card hover (top-right corner):

- Remove from board (X icon)
- Open detail panel (expand icon)
- Pin/unpin (pin icon) — pinned cards can't be dragged
- These should be small (20x20) icon buttons with tooltips

## Canvas Polish

### 1. Background

- Current: Dots variant, 20px gap, 1px size
- Change to: Subtle cross pattern or very faint grid lines
- Background should use Almost White (#f7f4ef) in light mode
- Background should use near-black in dark mode

### 2. Controls Styling

- Remove `!important` overrides
- Style Controls and MiniMap using CSS custom properties or wrapper classes
- Match brand palette: charcoal borders, avocado accent on active states

### 3. Empty State

- Current empty state is functional but plain
- Add an illustration or icon composition
- Add quick action buttons: "Add from Browser", "Auto-Populate", "Import"
- Animate the empty state icon subtly (gentle float)

### 4. Connection Lines

- Current: Colored lines with optional dash pattern
- Add: Animated flow direction (subtle moving dash pattern)
- Add: Label on hover (relationship type)
- Add: Thicker lines on hover for better visibility
- Connection endpoints should align with card edges, not center

### 5. Zoom Level Indicators

- Show current zoom percentage in the corner
- At low zoom (<0.3), switch cards to ultra-compact mode (colored dot + label)
- At high zoom (>1.5), show expanded card details

## Typography

### Card Text

- Title: `text-sm font-semibold leading-tight` (current, good)
- Subtitle/metadata: `text-xs text-muted-foreground` (current, good)
- Consider using the brand font if one is defined in the design system

### Browser Text

- Category headers: `text-sm font-medium` (current, good)
- Item titles: `text-xs font-medium` — could be slightly larger for readability
- Item subtitles: `text-[10px]` — too small, bump to `text-xs` with lighter weight

## Animation & Transitions

### Card Animations

- **Add to board**: Scale from 0.8 to 1.0 with opacity fade-in (200ms ease-out)
- **Remove from board**: Scale to 0.8 with opacity fade-out (150ms ease-in)
- **Position change (remote)**: Smooth 300ms transition (already handled by React Flow)

### Panel Animations

- Entity Browser: Slide in from right (already handled by conditional render, but add transition)
- Detail Panel: Sheet already animates via Radix

### Canvas Animations

- Fit view on load: Smooth 500ms transition (React Flow `fitView` with `duration`)

## Acceptance Criteria

- [ ] All cards render at consistent 280px width
- [ ] Hover states show lift + shadow on all cards
- [ ] Card action buttons appear on hover (remove, detail, pin)
- [ ] Background uses brand colors
- [ ] Controls/MiniMap styled without !important
- [ ] Empty state has quick action buttons
- [ ] Connection lines show labels on hover
- [ ] Browser item text is readable (no text-[10px])
