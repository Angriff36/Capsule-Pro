# Command Board — Implementation Plan

> Last updated: 2026-02-18
> See `STATUS.md` for current state, `BUGS.md` for known issues

## Priority Order

Work items ordered by impact and dependency. Each item references its spec.

### P0 — Do First

| #   | Item                                       | Spec                          | Effort | Status      |
| --- | ------------------------------------------ | ----------------------------- | ------ | ----------- |
| 1   | Wire up EntityDetailPanel in BoardShell    | `SPEC_entity-detail-panel.md` | 15 min | **DONE** |
| 2   | Entity Browser: already-on-board indicator | `SPEC_entity-browser.md` §1.1 | 30 min | **DONE** |
| 3   | Entity Browser: search within browser      | `SPEC_entity-browser.md` §1.2 | 1 hr   | **DONE** |

### P1 — Do Next

| #   | Item                                            | Spec                            | Effort | Status      |
| --- | ----------------------------------------------- | ------------------------------- | ------ | ----------- |
| 4   | Entity Browser: pre-load category counts        | `SPEC_entity-browser.md` §1.3   | 30 min | **DONE** |
| 5   | Entity Browser: refresh button                  | `SPEC_entity-browser.md` §1.4   | 15 min | **DONE** |
| 6   | Card consistent width (280px)                   | `SPEC_ui-polish.md` §Cards.1    | 30 min | **DONE** |
| 7   | Card hover action buttons (remove, detail, pin) | `SPEC_ui-polish.md` §Cards.5    | 1 hr   | **DONE** |
| 8   | Connection edge labels (tooltip on hover)       | `SPEC_connections.md` §1.1      | 1 hr   | **DONE** |
| 9   | Browser text size fix (text-[10px] → text-xs)   | `SPEC_ui-polish.md` §Typography | 10 min | **DONE** |
| 10  | Smart placement algorithm                       | `SPEC_entity-browser.md` §2.2   | 1 hr   | **DONE** |

### P2 — Polish

| #   | Item                                         | Spec                          | Effort | Status      |
| --- | -------------------------------------------- | ----------------------------- | ------ | ----------- |
| 11  | Card hover/selection animations              | `SPEC_ui-polish.md` §Cards.4  | 1 hr   | **DONE** |
| 12  | Edge hover state (thicken + tooltip)         | `SPEC_connections.md` §1.2    | 1 hr   | **DONE** |
| 13  | Smooth edge routing                          | `SPEC_connections.md` §1.4    | 30 min | **DONE** |
| 14  | Canvas background brand colors               | `SPEC_ui-polish.md` §Canvas.1 | 30 min | **DONE** |
| 15  | Controls/MiniMap styling (remove !important) | `SPEC_ui-polish.md` §Canvas.2 | 30 min | **DONE** |
| 16  | Empty state with quick actions               | `SPEC_ui-polish.md` §Canvas.3 | 1 hr   | **DONE** |
| 17  | Entity Browser drag-to-add                   | `SPEC_entity-browser.md` §2.1 | 2 hr   | **DONE** |
| 18  | Entity Browser keyboard navigation           | `SPEC_entity-browser.md` §2.3 | 1 hr   | **DONE** |
| 19  | Error boundary on board                      | `BUGS.md` BUG-05              | 30 min | **DONE** |

### P3 — Future

| #   | Item                                     | Spec                             | Effort | Status      |
| --- | ---------------------------------------- | -------------------------------- | ------ | ----------- |
| 20  | Quick actions on cards                   | `SPEC_product-direction.md`      | 2-3 hr | NOT STARTED |
| 21  | Board templates                          | `SPEC_product-direction.md`      | 4-6 hr | NOT STARTED |
| 22  | Manual connection creation               | `SPEC_connections.md` §2.2       | 2 hr   | NOT STARTED |
| 23  | Connection filtering                     | `SPEC_connections.md` §2.3       | 2 hr   | NOT STARTED |
| 24  | Path highlighting                        | `SPEC_connections.md` §3.2       | 2 hr   | NOT STARTED |
| 25  | Undo/Redo system (React Flow compatible) | `BUGS.md` BUG-03                 | 4-6 hr | **DONE** |
| 26  | Live card updates (polling/realtime)     | `SPEC_product-direction.md`      | 4-6 hr | NOT STARTED |
| 27  | Edit-in-place in detail panel            | `SPEC_entity-detail-panel.md` §3 | 4-6 hr | NOT STARTED |

## Remaining Work Summary

### P1 - All Completed ✅

### P2 - All Completed ✅

## Historical Archive

The following features were part of the OLD custom canvas system (pre-React Flow). They were fully implemented but have been **replaced** by the React Flow rewrite. The code was removed in the squash merge (PR #19). These are listed for historical reference only — do NOT re-implement them.

- Undo/Redo System (UndoManager, command pattern) — replaced by React Flow's built-in state management
- Auto-Save/Draft Recovery — replaced by Liveblocks storage sync
- Connection Context Menu — replaced by React Flow edge interactions
- Connection Events (realtime package) — replaced by Liveblocks events
- Event Replay System — removed (not needed with Liveblocks)
- Conflict Resolution (vector clocks) — replaced by Liveblocks CRDT
- Interactive Anchor Points — replaced by React Flow Handles
- Bulk Edit Command — removed (will be re-implemented differently)
- board-canvas-realtime.tsx (2233 lines) — the old monolith canvas, fully replaced
