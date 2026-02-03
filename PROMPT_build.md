0a. Study only the relevant spec(s) in `specs/*` for the task you choose.
0b. Study @IMPLEMENTATION_PLAN.md.
0c. For reference, the application source code is in `src/*` (or the appropriate app package for the screen).

1. Your task is to improve the visual presentation and information hierarchy of existing UI without changing any data, labels, or feature behavior. Some screens still use hardcoded mock data; do not replace or change data sources in this loop. Focus on UI completeness and consistency, using existing Storybook components and blocks wherever they fit.
2. Select the single most important UI presentation task from @IMPLEMENTATION_PLAN.md. Then investigate only the files needed for that task. Do not do repo-wide file listings. Prefer 1 targeted search and 1–3 file reads max before implementing.
3. After implementing the improvement, run the tests for that unit of code that was improved. If tests unrelated to your work fail, resolve them as part of the increment.
4. When you discover UI completeness or hierarchy issues, immediately update @IMPLEMENTATION_PLAN.md with your findings using a subagent. When resolved, update and remove the item.
5. When the tests pass, update @IMPLEMENTATION_PLAN.md, then `git add -A` then `git commit` with a message describing the changes. After the commit, `git push`.

Rules:
- Focus only on layout, spacing, grouping, typography, and visual hierarchy.
- Reduce cognitive load: fewer competing elements per screen.
- Group related information into clearly separated sections.
- Improve scanability using alignment, whitespace, and consistent section headers.
- Prefer vertical rhythm over dense columns.
- Keep changes incremental and reviewable.
- One focused improvement per iteration.
- Each iteration must end with a commit that only contains presentation-layer changes.
- Use Storybook components/blocks whenever they fit; avoid inventing new primitives unless strictly necessary for layout.
- Do not add/remove fields, rename domain concepts, invent new UX flows, or change data sources.

Success Criteria:
- A new user can visually understand the structure of the page in under 5 seconds.
- Important information stands out without effort.
- Secondary information recedes naturally.
- The page no longer feels overwhelming.
- The UI feels complete and consistent with the existing design system.

99999. Important: When authoring documentation, capture the why — tests and implementation importance.
999999. Important: Single sources of truth, no migrations/adapters.
9999999. As soon as there are no build or test errors create a git tag. If there are no git tags start at 0.0.0 and increment patch by 1 for example 0.0.1  if 0.0.0 does not exist.
99999999. You may add extra logging if required to debug issues.
999999999. Keep @IMPLEMENTATION_PLAN.md current with learnings using a subagent — future work depends on this to avoid duplicating efforts. Update especially after finishing your turn.
9999999999. When you learn something new about how to run the application, update @AGENTS.md using a subagent but keep it brief. For example if you run commands multiple times before learning the correct command then that file should be updated.
99999999999. For any bugs you notice, resolve them or document them in @IMPLEMENTATION_PLAN.md using a subagent even if it is unrelated to the current piece of work.
999999999999. Implement functionality completely. Placeholders and stubs waste efforts and time redoing the same work.
9999999999999. When @IMPLEMENTATION_PLAN.md becomes large periodically clean out the items that are completed from the file using a subagent.
99999999999999. If you find inconsistencies in the specs/* then use an Opus 4.5 subagent with 'ultrathink' requested to update the specs.
999999999999999. IMPORTANT: Keep @AGENTS.md operational only — status updates and progress notes belong in `IMPLEMENTATION_PLAN.md`. A bloated AGENTS.md pollutes every future loop's context.
