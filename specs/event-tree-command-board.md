# Event Tree Command Board — Design Spec

**Date:** 2026-06-11
**Status:** Approved by user (brainstorming session)
**Mockups:** `.superpowers/brainstorm/40974-1781178318/` (`event-tree-combined-v2.html` is the approved layout)

## Problem

Capsule-Pro's data is already connected at the schema level (Event ↔ BattleBoard snapshot propagation, Event.clientId → CRM, analytics live queries), but the product doesn't *feel* connected:

- Every screen rolls its own event data fetch; nothing presents the event as one coherent whole.
- The command board was reimplemented but is a skeleton: the entity-browser sidebar is a stub (category labels, no data), the AI chat backend (44KB agent loop, can execute manifest commands) has **no UI**, `CommandBoard.eventId` and `autoPopulate` exist but per-event boards were never finished.
- Designing an event means visiting many modules (staff, menu, vehicles, equipment) and manually keeping them in sync; nothing shows what an event still *needs*.
- Manifest validation failures surface as arbitrary-feeling errors during data entry.

## Goal

Each event gets its own **Command Board tab** that renders the event as a living tree: the event hub with template-driven branches (Staff, Menu, Vehicles, Equipment, Battle Board, …). Users drag real entities onto branches to **stage drafts**, see the **impact and conflicts** before anything is real, and **commit atomically** through governed Manifest commands. An AI assistant stages drafts through the same pipeline. The battle board's pickers auto-fill from the committed tree.

## Approved UX (from mockups)

- **Layout:** three-pane workspace.
  - **Left pane (top):** the event tree *outline* — every template branch with completeness bar ("Staff 4/6", "Vehicles ⚠ needs 1", "Rentals — n/a"), overall % ready.
  - **Left pane (bottom):** drag palette — Staff / Menus / Vehicles / Equipment with counts and search, backed by live data.
  - **Center canvas:** the tree. Event hub at the bottom (name, date, guest count, venue — live event data), central trunk, **rounded-elbow branches** per category rendered as thin gradient strokes with an opalescent glow (violet blending into each category's color). Leaf boxes are outlined in their branch color. Required-but-empty branches glow amber with dashed borders; template-excluded branches render ghosted ("not in this template").
  - **Right rail:** **Draft impact** panel (labor delta, per-guest food cost, conflicts/availability) + **AI assistant** chat.
  - **Top bar:** event identity, template selector, "% ready", draft count, conflict count, **Review & Commit** button.
- **Items render as avatar tokens** (36px circles, photo/initials) inside leaf boxes. Status: amber dashed outline = draft, green dot = committed. Clicking a token **expands it in place** into a mini card with details, conflict warnings, quick actions (set role/hours, swap, remove draft), and links to the entity's home screen.

## Architecture

### Drafts are board cards (Approach A, approved)

A draft assignment is a real `CommandBoardCard` row created via the **governed** `CommandBoardCard.create` command. **The draft envelope lives entirely in the card's `metadata` JSON field** — the card's governed `status` property keeps its existing enum (`pending`/`in_progress`/`done`/…) untouched, so **no `.manifest` source change is needed** for the card entity. Metadata shape:

```jsonc
// CommandBoardCard.metadata (JSON string field)
{
  "draftAction": {
    "kind": "assign-staff",          // assign-staff | add-dish | assign-vehicle | assign-equipment
    "entityType": "User",            // the dragged entity's type
    "entityId": "…",                 // the dragged entity's id
    "params": { "role": "server", "shiftStart": "…", "shiftEnd": "…" }
  },
  "draftState": "draft",             // draft | committed | failed
  "committedRecordId": null          // set on commit (e.g. the created EventStaff id)
}
```

Why: drafts persist across sessions/devices for free (board cards already persist), the AI already knows how to create board cards via existing manifest commands, and the canvas already renders cards. The board is the draft store; **real domain records are never touched until commit**. The UI derives draft/committed rendering from `metadata.draftState`, not from the card's `status` enum. (Rejected alternative: extending the card's `validStatus` constraint with draft states — that drags in a manifest source change, IR/schema drift gates, and the full-field-`update` mutate gotcha for no benefit.)

### Impact preview (read path)

A read-side endpoint (`apps/app` server action or API GET) takes `eventId` + the board's draft cards and computes:

- **Labor delta:** draft staff × hours × rates.
- **Food cost:** dishes × guest count × per-portion cost.
- **Conflicts:** staff double-booked (other `EventStaff`/`ScheduleShift` on the same date), vehicle/equipment double-allocated to other events that day.

Pure Convex queries — allowed to bypass the runtime per constitution §10. It defines **no domain semantics**: it renders information, never blocks or mutates. Recomputed on every draft change (Convex reactive query / React, debounced).

### Commit (governed, atomic)

"Review & Commit" shows the impact summary + the full draft list, then executes each draft's corresponding governed command through the canonical path (`runManifestCommand` core / dispatcher):

- `assign-staff` → `EventStaff.assign`
- `add-dish` → `EventDish.create` (verify the command contract carries all params per §14 before wiring)
- `assign-vehicle` / `assign-equipment` → commands on a **new** `EventResourceAssignment` entity (see below)

Commit is a **dedicated server action / API route** (not N HTTP dispatcher calls): it invokes `runManifestCommand` core once per draft inside a single Convex transaction boundary via the store adapter. The card flips (`metadata.draftState: draft → committed`, `committedRecordId` set, via governed `CommandBoardCard` update) execute **inside the same transaction**, so domain writes and card state can never diverge. Any failure → the whole transaction rolls back, nothing flips, and the failing card shows the runtime's structured error (kept client-side until retried).

Removing a committed token = the corresponding governed unassign/remove command (immediate, with confirm dialog) — v1 does not stage removals as drafts.

### New manifest entity: `EventResourceAssignment`

Vehicles and equipment have no event-assignment entity today. Define source-first (constitution §14): new `.manifest` source with `tenant` declaration, properties (`eventId`, `resourceType: "vehicle" | "equipment"`, `resourceId`, `quantity`, `notes`, timestamps, soft delete), `belongsTo event`, commands `assign` / `updateQuantity` / `unassign`, durable store → compile → schema projection → migration via `pnpm db:dev --create-only`. Keep invariants minimal (real conflicts are surfaced by the impact preview, not block constraints).

### Templates: advisory, not constraints

`EventBoardTemplate` defines, per event type, the branch list with `required | optional | excluded` and minimum rules (e.g. Plated Dinner: staff ≥ ceil(guests/20), vehicles ≥ 1; Drop-off: no Equipment branch, Packaging required). v1 ships built-in template definitions (code/JSON, keyed off `Event.eventType`); tenant-editable templates are a follow-up.

**Hard rule:** template requirements are UI guidance (completeness %, amber glows) — they never block commands and are never encoded as Manifest constraints. This is deliberate: the user's core frustration is validation failing on rules a user shouldn't think about. Manifest enforces real invariants; templates only *suggest*.

### Battle board autofill

The battle board remains its own feature, reachable from its branch leaf ("open ↗"). Its pickers become event-aware reads:

- Timeline staff assignment list sources from the event's committed `EventStaff` records.
- Menu rows source from `EventDish`.

Live reads (no new snapshot duplication); the existing `syncFromEvent` propagation continues to cover event-core fields (date, guest count, venue, client).

### AI staging

The existing `/api/command-board/chat` agent loop gets its first UI: the right-rail chat panel. The AI:

- Reads event context + current tree state (read tools).
- Stages drafts by creating draft `CommandBoardCard`s through the same governed card commands — suggestions appear on the tree identically to manual drags and flow into the same impact summary.
- **Never commits.** The Commit button is the only path to real mutations. No privileged bypass (constitution §10 AI-surface rules; tool allowlist restricted to card commands + reads).

### Board lifecycle

Lazy get-or-create: first visit to an event's Command Board tab looks up a board by `eventId` (read path) and creates one via governed `CommandBoard.create` if none exists — covers pre-existing events with no backfill. `CommandBoard.eventId` has no uniqueness guarantee, so the lookup-then-create is best-effort: if a concurrent first visit produces a duplicate, the tab deterministically uses the oldest board (`createdAt` ascending) and the duplicate is harmless/deletable. The tenant-wide command board list stays as-is; event boards appear there too, badged with their event.

## Constitution compliance summary

| Surface | Classification |
|---|---|
| Draft card create/update/delete | Governed mutation via `CommandBoardCard` commands |
| Impact preview endpoint | Read path (§10), advisory only |
| Commit cascade | Governed commands via canonical dispatcher/wrapper, shared tx |
| Template completeness | UI orchestration, no domain semantics |
| Battle board pickers | Read path |
| AI chat | AI surface; reads + card commands only; commit is human-only |

## Build order (v1 slices)

1. **Board tab + tree rendering:** event tab, lazy board create, template definitions, tree canvas (hub, branches, leaf boxes, outline pane), palette with live data for Staff.
2. **Staff branch end-to-end:** drag → draft card → impact (labor + double-booking) → commit (`EventStaff.assign`, shared tx) → token states + expandable card.
3. **Menu branch:** dishes/menus palette, food-cost impact, `EventDish` commit.
4. **Vehicles & Equipment:** `EventResourceAssignment` entity (source-first, migration), palette, double-allocation conflicts, commit.
5. **AI panel:** wire chat UI to the agent loop, restrict tools, AI-staged drafts.
6. **Battle board picker integration.**

## Testing

- **Runtime conformance tests** (storeProvider pattern) for each commit command, including the new `EventResourceAssignment` commands.
- **Atomicity test:** a commit batch where one command fails must roll back all (assert no partial `EventStaff`/`EventDish` rows).
- **Impact correctness tests:** double-booking detection, labor math, fixed-cost items not re-proportioned by guest count.
- **Integration test:** drag → draft → commit → assignment visible via the event detail and battle board reads.
- **AI fence test:** the chat agent's tool registry cannot execute non-card mutation commands.

## Out of scope (v1)

- Inventory auto-ordering / stock impact branch (read-only inventory impact is a later additive branch).
- Tenant-editable template builder.
- Staged removals/edits of committed assignments (immediate governed commands instead).
- Formal `EventChangeOrder` lifecycle entity (the commit step can later write change-order records without re-architecting).
- Real-time multi-user collaboration on the board.
