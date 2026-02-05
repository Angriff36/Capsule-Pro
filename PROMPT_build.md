# Events UI Build Prompt

## Context
Focus area: Events page UI fixes, primarily `apps/web/app/events/[eventId]/*` and secondary areas in `apps/web/app/events/*` (budgets, battle-boards, contracts, reports, kitchen-dashboard, imports).

0a. Study @IMPLEMENTATION_PLAN.md to understand current priorities and progress.
0b. Study @IMPLEMENTATION_PLAN_SUMMARY.md for the overall architecture analysis.
0c. For reference, the Events UI source code is in `apps/web/app/events/*`.

## Primary Task

1. Your task is to fix Events UI issues per @IMPLEMENTATION_PLAN.md. Choose the highest priority incomplete item (P0 > P1 > P2 > P3). Before making changes, search the codebase to understand current implementation using Sonnet subagents. You may use up to 500 parallel Sonnet subagents for searches/reads and only 1 Sonnet subagent for build/tests. Use Opus subagents for complex refactoring decisions.

2. **Critical P0 Issues to prioritize:**
   - Fix hardcoded dark theme in `event-details-client.tsx` (replace `bg-[#0b0f1a] text-slate-50` with theme-aware classes)
   - Update sidebar navigation (`module-nav.ts`) to include missing pages: Budgets, Battle Boards, Contracts, Reports
   - Fix breadcrumb navigation to use URL-based generation
   - Eliminate `any` types in Reports and other components
   - Split `event-details-client.tsx` (3054 lines) into focused components (<500 lines each)

3. After implementing a fix, run relevant tests. Commands:
   - Typecheck: `pnpm typecheck`
   - Lint: `pnpm lint`
   - Tests: `pnpm test -- --filter=web`

4. When you fix an issue, update @IMPLEMENTATION_PLAN.md marking items complete. When tests pass: `git add -A`, `git commit` with descriptive message, `git push`.

## Important Guidelines

99999. Theme fixes: Use Tailwind's `dark:` variants and existing theme tokens from the design system. Never hardcode colors.
999999. Component splitting: Extract logical sections (EventHeader, EventDetails, EventTimeline, EventBudget, etc.) as separate files in `components/event/`.
9999999. Type safety: Replace all `any` with proper types. Use existing types from `@capsule/types` package.
99999999. Keep @IMPLEMENTATION_PLAN.md current — mark items complete, add discovered issues.
999999999. Loading states: Use existing Skeleton components from `@capsule/ui`.
9999999999. Accessibility: Add ARIA labels, keyboard navigation support, proper heading hierarchy.
99999999999. When you learn something about the codebase, update @AGENTS.md briefly.
999999999999. Focus on one P0 item per iteration. Complete it fully before moving to next.
9999999999999. Test your changes visually if possible: `pnpm dev --filter=web`
99999999999999. Document component relationships and data flow when splitting large components.
