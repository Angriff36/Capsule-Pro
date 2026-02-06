<!--0a. Study `specs/*` with up to 500 parallel Sonnet subagents to learn the application specifications.
<!--0b. Study @IMPLEMENTATION_PLAN.md.
<!--0c. For reference, the application source code is in `src/*`.
<!--
<!--1. Your task is to implement functionality per the specifications using parallel subagents. Follow @IMPLEMENTATION_PLAN.md and choose the most important item to address. Before making changes, search the codebase (don't assume not implemented) using Sonnet subagents. You may use up to 500 parallel Sonnet subagents for searches/reads and only 1 Sonnet subagent for build/tests. Use Opus subagents when complex reasoning is needed (debugging, architectural decisions).
<!--2. After implementing functionality or resolving problems, run the tests for that unit of code that was improved. If functionality is missing then it's your job to add it as per the application specifications. Ultrathink.
<!--3. When you discover issues, immediately update @IMPLEMENTATION_PLAN.md with your findings using a subagent. When resolved, update and remove the item.
<!--4. When the tests pass, update @IMPLEMENTATION_PLAN.md, then `git add -A` then `git commit` with a message describing the changes. After the commit, `git push`.
<!--
<!--99999. Important: When authoring documentation, capture the why — tests and implementation importance.
<!--999999. Important: Single sources of truth, no migrations/adapters. If tests unrelated to your work fail, resolve them as part of the increment.
<!--9999999. As soon as there are no build or test errors create a git tag. If there are no git tags start at 0.0.0 and increment patch by 1 for example 0.0.1  if 0.0.0 does not exist.
<!--99999999. You may add extra logging if required to debug issues.
<!--999999999. Keep @IMPLEMENTATION_PLAN.md current with learnings using a subagent — future work depends on this to avoid duplicating efforts. Update especially after finishing your turn.
<!--9999999999. When you learn something new about how to run the application, update @AGENTS.md using a subagent but keep it brief. For example if you run commands multiple times before learning the correct command then that file should be updated.
<!--99999999999. For any bugs you notice, resolve them or document them in @IMPLEMENTATION_PLAN.md using a subagent even if it is unrelated to the current piece of work.
<!--999999999999. Implement functionality completely. Placeholders and stubs waste efforts and time redoing the same work.
<!--9999999999999. When @IMPLEMENTATION_PLAN.md becomes large periodically clean out the items that are completed from the file using a subagent.
<!--99999999999994. If you find inconsistencies in the specs/* then use an Opus 4.5 subagent with 'ultrathink' requested to update the specs.
<!--999999999999995. IMPORTANT: Keep @AGENTS.md operational only — status updates and progress notes belong in `IMPLEMENTATION_PLAN.md`. A bloated AGENTS.md pollutes every future loop's context.
THE COMMENTED OUT TEXT IS A TEMPLATE, USE IT TO CREATE A BUILD PROMPT SPECIFIC TO THE RELEVANT SPEC DONT REPLACE IT -->

0a. Study `specs/manifest-kitchen-ops-rules-overrides_TODO/manifest-kitchen-ops-rules-overrides.md` with up to 500 parallel Sonnet subagents to learn the application specifications.
0b. Study @IMPLEMENTATION_PLAN.md.
0c. For reference, the application source code is in `apps/*` and `packages/*` (focus on `apps/app*` first unless the plan requires broader changes).

1. Your task is to implement functionality per the specifications using parallel subagents. Follow @IMPLEMENTATION_PLAN.md and choose the most important item to address from constraint evaluation outcomes, override semantics, workflow conventions, concurrency controls, runtime performance, diagnostics, or conformance tests.

2. MANDATORY EXECUTION MODEL (DO NOT VIOLATE)
2a. All repo exploration (Glob/Grep/Read over trees, multi-file inspection, spec mapping, implementation mapping) MUST be done using the Task tool with subagent_type='Explore' (up to 500 parallel subagents). HARD CONSTRAINT: Explore subagents must NEVER run builds, tests, lint, typecheck, or dev commands. Their job is exclusively to read, map, and summarize. Use `list_dir` or `file_search` for directory listing; `LS` is unavailable.
2b. The main agent MUST NOT do direct Glob/Grep/Read except a single quick lookup of one small file when strictly necessary.
2c. If the Task tool cannot be used for exploration, STOP and report that you cannot proceed under these constraints (do not fallback to monolithic exploration).

3. Before making changes, search the codebase (don't assume not implemented) using Task tool with subagent_type='Explore' (up to 500 parallel subagents). Exploration subagents must return:
- exact file paths
- concise summaries (no large pasted file contents)
- any key identifiers (export names, routes, functions, tests) needed to proceed
HARD CONSTRAINT: Return summaries only. Never return raw file dumps or full match lists. Limit output to concise bullet findings and key file paths. Do not run builds/tests/lint/typecheck/dev.

4. Use Task tool with subagent_type='general-purpose' or model='sonnet' for build/tests (only 1 subagent). Do not run tests in parallel.

5. Use Task tool with subagent_type='Opus' or model='opus' only when complex reasoning is needed (debugging, architectural decisions).

6. After implementing functionality or resolving problems, the main agent must run the validation suite (pnpm build, pnpm check, pnpm dlx ultracite check, and pnpm test) for that unit of code that was improved to provide a "Workflow Validation Report". If functionality is missing then it's your job to add it as per the application specifications. Ultrathink.

7. When you discover issues, immediately update @IMPLEMENTATION_PLAN.md with your findings using a subagent. When resolved, update and remove the item.

8. When the tests pass, update @IMPLEMENTATION_PLAN.md, then `git add -A` then `git commit` with a message describing the changes. After the commit, `git push`.

99999. Important: When authoring documentation, capture the why — tests and implementation importance.
999999. Important: Single sources of truth, no migrations/adapters. If tests unrelated to your work fail, resolve them as part of the increment.
9999999. As soon as there are no build or test errors create a git tag. If there are no git tags start at 0.0.0 and increment patch by 1 for example 0.0.1  if 0.0.0 does not exist.
99999999. You may add extra logging if required to debug issues.
999999999. Keep @IMPLEMENTATION_PLAN.md current with learnings using a subagent — future work depends on this to avoid duplicating efforts. Update especially after finishing your turn.
9999999999. When you learn something new about how to run the application, update @AGENTS.md using a subagent but keep it brief. For example if you run commands multiple times before learning the correct command then that file should be updated.
99999999999. For any bugs you notice, resolve them or document them in @IMPLEMENTATION_PLAN.md using a subagent even if it is unrelated to the current piece of work.
999999999999. Implement functionality completely. Placeholders and stubs waste efforts and time redoing the same work.
9999999999999. When @IMPLEMENTATION_PLAN.md becomes large periodically clean out the items that are completed from the file using a subagent.
99999999999994. If you find inconsistencies in the specs/* then use an Opus 4.5 subagent with 'ultrathink' requested to update the specs.
999999999999995. IMPORTANT: Keep @AGENTS.md operational only — status updates and progress notes belong in `IMPLEMENTATION_PLAN.md`. A bloated AGENTS.md pollutes every future loop's context.
