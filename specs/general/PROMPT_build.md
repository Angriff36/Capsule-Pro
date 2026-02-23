0a. Study `specs/command-board/*.md` with up to 500 parallel Sonnet subagents.
0b. Study `specs/command-board/IMPLEMENTATION_PLAN_commandboard_hardening.md` and pick the highest-priority incomplete item.
0c. Before coding, use Sonnet subagents to search for existing implementations in: - `apps/api/app/api/conflicts/detect/route.ts` - `apps/app/app/api/command-board/` - `apps/app/app/(authenticated)/command-board/` - `apps/app/__tests__/api/command-board/` - related shared packages in `packages/*`

Your task is to implement exactly one highest-priority incomplete item from `specs/command-board/IMPLEMENTATION_PLAN_commandboard_hardening.md` per iteration. Use parallel Sonnet subagents for discovery/analysis and one Sonnet subagent for final verification runs.

After implementing:

1. Run targeted tests for touched Command Board API/UI modules.
2. Run related typecheck/lint only as needed for touched surfaces.
3. Verify behavior on empty/new board and seeded board paths where relevant.
4. Update `specs/command-board/IMPLEMENTATION_PLAN_commandboard_hardening.md` (mark complete, add concise learnings).
5. `git add -A && git commit -m "fix(command-board): <concise why-focused message>"`
6. `git push`

IMPORTANT:

- Keep behavior compatible unless the plan explicitly calls for changed behavior.
- Never throw raw internal errors to assistant users; return safe actionable guidance.
- For conflict checks, one failing detector must not fail the whole response; return partial results with warnings.
- No placeholder stubs. Ship complete increments with tests.
- Keep `AGENTS.md` operational only; put progress and findings in the implementation plan.
- If spec inconsistencies are found, update the relevant spec file and implementation plan in the same iteration.

ULTIMATE GOAL: Command Board remains reliable under malformed input, empty data, partial subsystem failures, and large-board load while providing searchable observability and CI smoke confidence.
