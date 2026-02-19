0a. Study `specs/mobile/mobile-kitchen-app_TODO/` using up to 200 parallel Sonnet subagents to understand the full mobile kitchen app spec.
0b. Study @IMPLEMENTATION_PLAN.md — this is your task list. Follow it strictly. Pick the highest-priority incomplete item.
0c. Before writing any code, use up to 300 parallel Sonnet subagents to study the relevant existing code: - `apps/app/app/(authenticated)/kitchen/mobile/` — existing mobile pages to build on (not replace) - `apps/app/app/(authenticated)/kitchen/prep-lists/` — prep list pages and patterns - `apps/app/app/(authenticated)/kitchen/tasks/` — desktop task page for reference patterns - `apps/api/app/api/kitchen/tasks/` — task listing and claim APIs - `apps/api/app/api/kitchen/prep-tasks/commands/` — prep task command endpoints - `apps/api/app/api/kitchen/prep-lists/` — prep list and item endpoints - `apps/api/app/api/kitchen/kitchen-tasks/commands/` — kitchen task commands - `packages/database/prisma/schema.prisma` — to understand KitchenTask, PrepTask, PrepList, PrepListItem models - `packages/design-system/components/` — UI components available (use these, don't build from scratch)

1. Implement the highest-priority incomplete item from @IMPLEMENTATION_PLAN.md using parallel subagents for research, a single subagent for writing code. Do not implement multiple items in one iteration — focus and finish one thing completely.

2. After implementing, run validation:
   - `pnpm --filter @capsule/app test kitchen` (or relevant test file)
   - `pnpm tsc --noEmit`
   - `pnpm biome check`
     Fix all errors before committing.

3. When tests pass: update @IMPLEMENTATION_PLAN.md (mark item complete, note any new findings), then:
   `git add -A && git commit -m "feat(mobile-kitchen): <concise description>"`
   `git push`

4. After commit: bump the git tag (patch increment from current highest tag).

5. Implement completely — no stubs, no TODOs, no "this will be wired up later". Every piece of UI must be connected to real API calls.
6. Single source of truth — do not duplicate API response types. Define shared types in `apps/app/app/(authenticated)/kitchen/mobile/types.ts` and import them everywhere.
7. The existing `/kitchen/mobile/page.tsx` task claiming logic is good — preserve it and extend it. Do not rewrite what works.
8. Use `apiFetch` from `@/app/lib/api` for all API calls (handles auth headers automatically).
9. Mobile UX rules: minimum 44px tap targets, large text (text-lg minimum for actions), high contrast. Every action must be reachable in ≤ 2 taps.
10. Offline pattern: use the same queue+sync pattern already in `/kitchen/mobile/page.tsx` for any new offline operations.
11. Keep @AGENTS.md operational only (build commands, patterns). Progress goes in @IMPLEMENTATION_PLAN.md.
12. If you discover bugs in existing code unrelated to your task, add them to @IMPLEMENTATION_PLAN.md under a "Bugs" section — do not fix them unless they block your current task.
13. When @IMPLEMENTATION_PLAN.md gets large, prune completed items.
14. Treat `packages/design-system` as the standard library — Button, Badge, Sheet, Tabs, Card etc. all exist there. Check before building custom UI.
15. CRITICAL: The mobile shell layout must use a bottom navigation bar (not the desktop sidebar). The mobile layout file must suppress the authenticated layout's sidebar for these routes.

ULTIMATE GOAL: Kitchen staff on their phone can see what prep is needed today, claim tasks individually or in bundles by station, work through event prep lists marking items complete with a single tap, and manage everything they've claimed — all while handling intermittent connectivity gracefully.
