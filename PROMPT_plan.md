# Events UI Planning Prompt

## Context
Focus area: Events page UI analysis and planning for `apps/web/app/events/*`.

0a. Study @IMPLEMENTATION_PLAN_SUMMARY.md for the comprehensive analysis already performed.
0b. Study @IMPLEMENTATION_PLAN.md (if present) to understand current progress.
0c. Study the Events area source code in `apps/web/app/events/*` with up to 250 parallel Sonnet subagents.
0d. Study shared components in `packages/ui/src/*` and `apps/web/components/*`.

## Primary Task

1. Analyze the Events UI codebase against the issues identified in @IMPLEMENTATION_PLAN_SUMMARY.md:

   **P0 Critical Issues to verify/update:**
   - [ ] Hardcoded dark theme in `event-details-client.tsx` (`bg-[#0b0f1a] text-slate-50`)
   - [ ] Missing sidebar navigation items (Budgets, Battle Boards, Contracts, Reports)
   - [ ] Breadcrumb navigation using hardcoded arrays
   - [ ] `any` types in Reports and other components
   - [ ] `event-details-client.tsx` size (target: split into <500 line components)

   **P1 High Priority Issues:**
   - [ ] Missing loading skeletons on event pages
   - [ ] Missing error boundaries
   - [ ] Accessibility gaps (ARIA labels, keyboard navigation)
   - [ ] Incomplete form handlers in event details sections

2. Use up to 500 Sonnet subagents to search for:
   - `TODO` comments in events area
   - `any` type usages
   - Hardcoded color values (hex codes, specific Tailwind colors)
   - Missing loading states
   - Large components (>500 lines)

3. Use an Opus subagent to analyze findings, update priorities based on current state, and create/update @IMPLEMENTATION_PLAN.md with actionable items sorted by priority.

## Output Requirements

**IMPORTANT:** Plan only. Do NOT implement anything. Do NOT assume functionality is missing; confirm with code search first.

Update @IMPLEMENTATION_PLAN.md with:
- Current state assessment for each P0/P1 item
- Specific file paths and line numbers for issues
- Estimated effort for each fix
- Dependencies between tasks
- Any new issues discovered

## Success Criteria Validation

Check progress against @IMPLEMENTATION_PLAN_SUMMARY.md success criteria:
- P0: Theme system compliance, navigation completeness, type safety, component sizes
- P1: Loading states coverage, error boundaries, accessibility compliance
- Track metrics: component line counts, useState hook counts, type violations

## Ultimate Goal

We want to achieve a polished, maintainable, accessible Events UI that:
1. Respects the platform theme system (light/dark mode)
2. Has complete navigation to all Events sub-pages
3. Follows project type safety standards (no `any`)
4. Has manageable component sizes (<500 lines)
5. Provides proper loading and error states
6. Meets WCAG AA accessibility standards

If you discover new issues not in the summary, document them in @IMPLEMENTATION_PLAN.md with appropriate priority.
