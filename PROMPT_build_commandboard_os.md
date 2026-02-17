0a. Study `specs/command-board/*` with up to 500 parallel Sonnet subagents to learn the Command Board OS specifications — especially `specs/command-board/boardspec.md` (the master AI-Native Command Board OS spec).
0b. Study @IMPLEMENTATION_PLAN_commandboard_os.md.
0c. For reference, the application source code is in `apps/app/app/(authenticated)/command-board/`, `apps/api/app/api/command-board/`, `apps/api/app/api/ai/`, `apps/app/app/lib/command-board/`, and `packages/ai/`.

Your task is to implement the AI-Native Command Board OS spec (`specs/command-board/boardspec.md`) using parallel subagents. Follow @IMPLEMENTATION_PLAN_commandboard_os.md and choose the most important item to address. The spec defines five phases: (1) Intent-to-Execution Engine, (2) Risk Intelligence, (3) Simulation Engine, (4) Autonomous Execution Mode, and five architecture layers: Human Intent, Plan Orchestration, Manifest Runtime, Projection Engine, AI Assist Intelligence Modules. Before making changes, search the codebase (don't assume not implemented) using Sonnet subagents. You may use up to 500 parallel Sonnet subagents for searches/reads and only 1 Sonnet subagent for build/tests. Use Opus subagents when complex reasoning is needed (debugging, architectural decisions).

After implementing functionality or resolving problems, run the tests for that unit of code that was improved. If functionality is missing then it's your job to add it as per the Command Board OS specifications. Ultrathink.

When you discover issues, immediately update @IMPLEMENTATION_PLAN_commandboard_os.md with your findings using a subagent. When resolved, update and remove the item.

When the tests pass, update @IMPLEMENTATION_PLAN_commandboard_os.md, then `git add -A` then `git commit` with a message describing the changes. After the commit, `git push`.

Important: When authoring documentation, capture the why — tests and implementation importance.

Important: Single sources of truth, no migrations/adapters. If tests unrelated to your work fail, resolve them as part of the increment.
As soon as there are no build or test errors create a git tag. If there are no git tags start at 0.0.0 and increment patch by 1 for example 0.0.1 if 0.0.0 does not exist.
You may add extra logging if required to debug issues.

Key architectural constraints from the spec:

- All mutations MUST compile to Manifest domain commands — no direct data mutation from UI
- AI MUST NOT directly mutate board state — all changes go through approved plan flow
- Board is a pure projection of domain truth, not a CRUD surface
- AI emits structured intent, never writes directly
- Server validates, enforces policies, executes domain commands, persists idempotency, emits audit trail
- Board preview layer MUST visually distinguish ghost mutations from persisted state
- System MUST derive edges from domain relationships, not manual wiring
- Plan execution must be idempotent, auditable, reversible when possible

Keep @IMPLEMENTATION_PLAN_commandboard_os.md current with learnings using a subagent — future work depends on this to avoid duplicating efforts. Update especially after finishing your turn. 9999999999. When you learn something new about how to run the application, update @AGENTS.md using a subagent but keep it brief. For example if you run commands multiple times before learning the correct command then that file should be updated. 99999999999. For any bugs you notice, resolve them or document them in @IMPLEMENTATION_PLAN_commandboard_os.md using a subagent even if it is unrelated to the current piece of work. 999999999999. Implement functionality completely. Placeholders and stubs waste efforts and time redoing the same work. 9999999999999. When @IMPLEMENTATION_PLAN_commandboard_os.md becomes large periodically clean out the items that are completed from the file using a subagent. 99999999999999. If you find inconsistencies in the specs/\* then use an Opus 4.5 subagent with 'ultrathink' requested to update the specs. 999999999999999. IMPORTANT: Keep @AGENTS.md operational only — status updates and progress notes belong in `IMPLEMENTATION_PLAN_commandboard_os.md`. A bloated AGENTS.md pollutes every future loop's context.
