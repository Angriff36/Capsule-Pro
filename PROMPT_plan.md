0a. Study `specs/mobile/mobile-kitchen-app_TODO/` using up to 200 parallel Sonnet subagents to fully understand the mobile kitchen app spec.
0b. Study `specs/mobile/mobile-task-claim-interface_TODO/mobile-task-claim-interface.md` for additional task claiming requirements.
0c. Study @IMPLEMENTATION_PLAN.md (if present) to understand what's already done.
0d. Study existing mobile kitchen code using up to 300 parallel Sonnet subagents: - `apps/app/app/(authenticated)/kitchen/mobile/` — existing mobile pages - `apps/app/app/(authenticated)/kitchen/prep-lists/` — existing prep list pages - `apps/api/app/api/kitchen/tasks/` — task APIs - `apps/api/app/api/kitchen/prep-tasks/` — prep task APIs - `apps/api/app/api/kitchen/prep-lists/` — prep list APIs - `apps/api/app/api/kitchen/kitchen-tasks/` — kitchen task command APIs - `packages/database/prisma/schema.prisma` — database models

1. Study @IMPLEMENTATION_PLAN.md (it may be incomplete) and use up to 500 Sonnet subagents to map existing code against the spec. Use an Opus subagent to analyze findings, identify gaps, and create/update @IMPLEMENTATION_PLAN.md with a prioritized list of what remains. Ultrathink. Confirm before claiming anything is missing — search first.

IMPORTANT: Plan only. Do NOT implement anything. Treat `packages/design-system` as the UI component library — use existing components, do not build new ones from scratch.

ULTIMATE GOAL: A complete mobile-first kitchen app for daily prep workflow at `apps/app/app/(authenticated)/kitchen/mobile/` with:

- Today tab: daily overview of events, urgency indicators, prep status
- Tasks tab: available tasks with station filter, multi-select bundle claiming, offline support
- Prep Lists tab: event prep lists with item completion (single tap), swipe gestures, offline queue
- My Work tab: all claimed tasks/bundles/prep tasks with start/complete/release actions

Key new capabilities over what exists:

- Bottom nav shell routing between tabs
- Task bundle claiming (select multiple → claim at once, atomically)
- Prep list item interaction (tap/swipe complete, notes, per-station grouping)
- Daily overview with event urgency
- My Work unified view across kitchen tasks AND prep tasks
