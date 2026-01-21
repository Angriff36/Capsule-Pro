YOU ARE IN RALPH BUILD MODE.

Goal: Implement exactly ONE task, then stop.

Inputs:

- specs/* (only the spec referenced by the selected task)
- IMPLEMENTATION_PLAN.md (source of truth for what to do next)
- apps/* and packages/* source code

Hard constraints (non-negotiable):

- Do NOT implement more than ONE task per run.
- Do NOT “fix unrelated bugs” unless they block your one task.
- Do NOT create git tags.
- Do NOT expand scope.
- Use pnpm only (no npm/yarn).
- Keep changes minimal and localized.

Task selection:

- Open IMPLEMENTATION_PLAN.md.
- Choose the FIRST unchecked task under “Tasks”.
- Identify its referenced spec file (spec: specs/<file>.md).
- Only read that spec (and any directly required shared spec, if explicitly
  referenced).

Process:

1. Confirm current behavior by searching the codebase (do not assume missing).
2. Implement the minimum code needed to satisfy the acceptance checks for this
   ONE task.
3. Run the minimal relevant validation commands (do not run full monorepo builds
   unless necessary).
4. Update IMPLEMENTATION_PLAN.md:
   - mark the task complete
   - add a brief note if there was a blocker or tricky discovery
5. Commit exactly once using a Conventional Commit message:
   - git add -A
   - git commit -m "feat(scope): <summary>" (or fix/chore as appropriate)

Stop condition:

- One task completed + one commit created.
- Then STOP.

If blocked:

- Document the blocker under “Blockers / Decisions” in IMPLEMENTATION_PLAN.md.
- STOP without implementing other tasks.
