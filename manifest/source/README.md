# `manifest/source/` — Manifest text sources

**This directory is the canonical home of the `.manifest` source files**
(constitution §4a; see [`manifest/README.md`](../README.md) for the full
artifact layout). Sources are organized by domain subdirectory (`ai/`,
`core/`, `crm/`, `events/`, `finance/`, `integrations/`, `inventory/`,
`kitchen/`, `operations/`, `platform/`, `procurement/`, `quality/`,
`staff/`) and are read by `manifest/scripts/compile.mjs`.

The legacy `packages/manifest-adapters/manifests/` location is retired
(2026-06-03) and **non-authoritative**. Like the other `packages/manifest-*`
paths, it is a forbidden resurrection path (constitution §4a/§19a) — do not
recreate it or point new code, config, or docs at it.

```bash
# Compile sources to IR:
pnpm manifest:compile

# List sources:
ls manifest/source/*/
```

<!-- BOARD_TAXONOMY_START — synced from VISION.md; edit VISION.md first -->
# Board Taxonomy Guardrail

These board concepts are intentionally separate. Do not merge, rename, or substitute one for another.

**Command Board** means the global operations control surface. It answers: "What needs attention right now?" Use it for cross-event alerts, exceptions, approvals, stuck work, operational risk, and AI-suggested interventions. Do not use it for event timeline planning, dish/station execution, or generic task pipeline work.

**Event-tree** is where administrative staff assemble an event: assign staff, build the menu, and hammer out details. Decisions made here propagate into execution specifics on the Battle Board. The tree and battle board are linked so event information flows automatically. In code today this surface uses legacy `CommandBoard*` entity names and routes under `/command-board` and `/events/{id}?tab=board` — that is **not** the global Command Board above.

**Battle Board** means the event-specific execution surface. It answers: "How does this specific event run?" Use it for one event's timeline, stations, dishes, prep/service flow, staff assignments, and execution state. Every event gets a battle board. Do not use it as a global command center or generic backlog board.

**Kanban Board** means a generic workflow pipeline. It is internal for high-level staff. It answers: "What stage is this work in?" Use it for cards moving through workflow states such as backlog, todo, doing, review, and done. Do not use it as the event execution model or the operations alert surface. It has columns, not a grid.

**Hard rule:** if a feature involves cards, statuses, tasks, assignments, or boards, first classify it as **global attention** (Command Board), **event setup** (Event-tree), **event execution** (Battle Board), or **generic workflow** (Kanban). Then use only the matching concept.

**AI surfaces:** A globally available assistant on every page handles general work (recipes, organizing, cross-module commands). Event-tree AI is scoped to one event's setup (draft → commit on the tree). Global Command Board AI (future) handles ops attention — do not conflate these.
<!-- BOARD_TAXONOMY_END -->

