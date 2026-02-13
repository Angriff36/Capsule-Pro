<!--PROMPTS
<!--The instruction set for each loop iteration. Swap between PLANNING and BUILDING versions as needed.
<!--
<!--Prompt Structure:
<!--
<!--Section	Purpose
<!--Phase 0 (0a, 0b, 0c)	Orient: study specs, source location, current plan
<!--Phase 1-4	Main instructions: task, validation, commit
<!--999... numbering	Guardrails/invariants (higher number = more critical)
<!--Key Language Patterns (Geoff's specific phrasing):
<!--
<!--"study" (not "read" or "look at")
<!--"don't assume not implemented" (critical - Achilles' heel)
<!--"using parallel subagents" / "up to N subagents"
<!--"only 1 subagent for build/tests" (backpressure control)
<!--"Think extra hard" (now "Ultrathink)
<!--"capture the why"
<!--"keep it up to date"
<!--"if functionality is missing then it's your job to add it"
<!--"resolve them or document them"
<!--PROMPT_plan.md Template
<!--Notes:
<!--
<!--Update [project-specific goal] placeholder below.
<!--Current subagents names presume using Claude. -->

0a. Study `specs/*` with up to 500 parallel Sonnet subagents to learn to application specifications. 0b. Study @IMPLEMENTATION_PLAN.md. 0c. For reference, application source code is in `packages/manifest-adapters/*`, `packages/kitchen-ops/*`, `apps/api/app/api/kitchen/*`, and `packages/database/prisma/*`.

1. Your task is to implement functionality per the specifications using the Task tool with parallel subagents. Follow @IMPLEMENTATION_PLAN.md and choose the most important item to address. Before making changes, search the codebase (don't assume not implemented) using the Task tool with subagent_type='Explore' (up to 500 parallel subagents). Use the Task tool with subagent_type='general-purpose' or model='sonnet' for build/tests (only 1 subagent). Use the Task tool with subagent_type='Opus' or model='opus' when complex reasoning is needed (debugging, architectural decisions). IMPORTANT: Always use the Task tool for file operations, searches, and analysis - never use Read/Grep directly unless it's a single quick lookup.
2. After implementing functionality or resolving problems, run the tests for that unit of code that was improved. If functionality is missing then it's your job to add it as per the application specifications. Ultrathink.
3. When you discover issues, immediately update @IMPLEMENTATION_PLAN.md with your findings using a subagent. When resolved, update and remove the item.
4. When the tests pass, update @IMPLEMENTATION_PLAN.md, then `git add -A` then `git commit` with a message describing the changes. After the commit, `git push`.

5. Important: When authoring documentation, capture the why — tests and implementation importance.
6. Important: Single sources of truth, no migrations/adapters. If tests unrelated to your work fail, resolve them as part of the increment.
7. As soon as there are no build or test errors create a git tag. If there are no git tags start at 0.0.0 and increment patch by 1 for example 0.0.1 if 0.0.0 does not exist.
8. You may add extra logging if required to debug issues.
9. Keep @IMPLEMENTATION_PLAN.md current with learnings using a subagent_type='sonnet' — future work depends on this to avoid duplicating efforts. Update especially after finishing your turn. 9999999999. When you learn something new about how to run the application, update @AGENTS.md using a subagent_type='sonnet' but keep it brief. For example if you run commands multiple times before learning the correct command then that file should be updated. 99999999999. For any bugs you notice, resolve them or document them in @IMPLEMENTATION_PLAN.md using a subagent_type='sonnet' even if it is unrelated to the current piece of work. 999999999999. Implement functionality completely. Placeholders and stubs waste efforts and time redoing the same work.
10. When @IMPLEMENTATION_PLAN.md becomes large periodically clean out the items that are completed from the file using a subagent_type='sonnet'. 99999999999999. If you find inconsistencies in the specs/\* then use a subagent_type='Opus' with 'ultrathink' requested to update the specs. 999999999999999. IMPORTANT: Keep @AGENTS.md operational only — status updates and progress notes belong in `IMPLEMENTATION_PLAN.md`. A bloated AGENTS.md pollutes every future loop's context.
