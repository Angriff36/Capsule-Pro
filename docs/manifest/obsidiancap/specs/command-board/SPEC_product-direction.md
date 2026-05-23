# Spec: Product Direction — Where the Command Board Is Going

> This is a vision document, not an implementation spec. It defines the north star for the board's evolution.

## Core Thesis

The Command Board is not a canvas tool. It's an **operational dashboard** that happens to be spatial. The spatial layout is a feature, not the product. The product is: **run your catering operation from one screen**.

Every interaction should answer: "What do I need to do next?" and "What's the state of my business right now?"

## Current Reality vs. Vision

| Aspect       | Current               | Vision                                                        |
| ------------ | --------------------- | ------------------------------------------------------------- |
| Cards        | Static data display   | Live, updating, actionable                                    |
| Connections  | Visual lines          | Operational dependencies                                      |
| Layout       | Manual drag           | Smart auto-layout + manual override                           |
| Browser      | Add entities to board | Drag, filter, bulk-add, smart suggest                         |
| Detail Panel | View-only             | Edit-in-place, quick actions                                  |
| AI Chat      | General assistant     | Board-aware operations assistant                              |
| Boards       | Generic canvas        | Purpose-built views (event prep, weekly ops, client overview) |

## Evolution Roadmap

### Near Term (Next 2-4 weeks)

**Theme: Make it not clunky**

1. **Wire up entity detail panel** (BUG-01) — Clicking cards should show real data
2. **Entity Browser polish** — Search, already-on-board indicators, drag-to-add
3. **Card visual polish** — Consistent widths, hover actions, better typography
4. **Connection labels** — Show what relationships mean

### Medium Term (1-2 months)

**Theme: Make it operational**

1. **Live card updates** — Cards should reflect real-time data changes (via Liveblocks or polling)
2. **Quick actions on cards** — Mark task complete, change event status, reassign employee — without opening detail panel
3. **Board templates** — Pre-built board configurations:
   - "This Week's Events" — auto-populates with events in the next 7 days + their tasks + assigned staff
   - "Client Overview" — all clients with their events and proposals
   - "Kitchen Prep" — all prep tasks grouped by event, sorted by due date
4. **Smart grouping** — Auto-group cards by event, by date, by status
5. **Filters** — Filter visible cards by status, date range, entity type, assigned person
6. **Notifications on board** — Show badges on cards when something needs attention (overdue task, unconfirmed event, low inventory)

### Long Term (3-6 months)

**Theme: Make it intelligent**

1. **AI-powered layout** — "Organize my board by event date" / "Group by client" / "Show me what's overdue"
2. **AI suggestions** — "You have 3 events next week with no assigned chef" shown as a board notification
3. **Timeline view** — Toggle between spatial view and timeline view (same data, different layout)
4. **Board sharing** — Share a board view with a client (read-only, filtered to their events)
5. **Mobile board** — Touch-optimized board for on-site operations
6. **Automations** — "When an event is confirmed, auto-add its tasks to the Prep Board"

## Design Principles

1. **Every card is live** — No stale data. If the underlying entity changes, the card updates.
2. **Actions, not just views** — The board should be where you DO things, not just where you SEE things.
3. **Spatial = meaningful** — Position on the board should convey information (timeline left-to-right, priority top-to-bottom, grouping by proximity).
4. **Progressive disclosure** — Show the minimum useful info on cards. Details on click. Full page on demand.
5. **Keyboard-first** — Every action should be reachable via keyboard. The command palette is the power-user interface.
6. **Don't make me think** — The board should be obvious to a new user. No training required for basic operations.

## Anti-Patterns to Avoid

- **Generic sticky notes** — Every card must represent a real entity. No freeform cards (notes are the exception, and even those are stored entities).
- **Canvas as art tool** — This is not Miro or FigJam. No drawing, no freeform shapes, no stickers.
- **Feature creep on canvas** — The canvas is for layout. Complex editing happens in the detail panel or full page.
- **Performance death** — Boards with 100+ cards must remain smooth. Virtualize, lazy-load, paginate.
