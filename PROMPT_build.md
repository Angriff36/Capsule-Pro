0a. Study `specs/manifest/*` with up to 500 parallel Sonnet subagents to learn the
application specifications. 0b. Study @IMPLEMENTATION_PLAN.md. 0c. For
reference, the application source code is in `apps/app/app/*` and api routes are in `apps/api/app/api/*`.

1. Your task is to implement functionality per the specifications using the Task
   tool with parallel subagents. Follow @IMPLEMENTATION_PLAN.md and choose the
   most important item to address. Before making changes, search the codebase
   (don't assume not implemented) using Task tool with subagent_type='Explore'
   (up to 500 parallel subagents). Use Task tool with
   subagent_type='general-purpose' or model='sonnet' for build/tests (only 1
   subagent). Use Task tool with subagent_type='Opus' or model='opus' when
   complex reasoning is needed (debugging, architectural decisions). IMPORTANT:
   Always use the Task tool for file operations, searches, and analysis - never
   use Read/Grep directly unless it's a single quick lookup.
2. After implementing functionality or resolving problems, run the tests for
   that unit of code that was improved. If functionality is missing then it's
   your job to add it as per the application specifications. Ultrathink.
3. When you discover issues, immediately update @IMPLEMENTATION_PLAN.md with
   your findings using a subagent. When resolved, update and remove the item.
4. When the tests pass, update @IMPLEMENTATION_PLAN.md, then `git add -A` then
   `git commit` with a message describing the changes. After the commit,
   `git push`.

5. HIGH PRIORITY: Any task touching user-facing create/edit/delete buttons must
   add or update an E2E/product-flow test. The test must prove persistence, not
   just mocked success, visual presence, or route existence. It must click the
   real UI control, submit data, verify API/database persistence, then verify
   the saved record is visible in the UI after refetch or reload. Backpressure
   is part of the task: before committing, run the validation commands from
   @AGENTS.md that match the changed area. If a task touches a create/edit/delete
   UI flow, the matching Playwright product-flow test must pass before commit.
   Do not commit around failing backpressure.

998. For any command route implementation (`POST /commands/*`), validate
   persistence by calling the corresponding read API after execution. If the
   entity is not returned by the list/detail API, the implementation is invalid
   even if the command returns success. Do not trust command response payloads
   as persistence proof; fix storage wiring or write to the same database model
   the read API uses.

6. Important: When authoring documentation, capture the why — tests and
   implementation importance.
7. Important: Single sources of truth, no migrations/adapters. If tests
   unrelated to your work fail, resolve them as part of the increment.
8. As soon as there are no build or test errors create a git tag. If there are
   no git tags start at 0.0.0 and increment patch by 1 for example 0.0.1 if
   0.0.0 does not exist.
9. You may add extra logging if required to debug issues.
10. Keep @IMPLEMENTATION_PLAN.md current with learnings using a
   subagent_type='sonnet' — future work depends on this to avoid duplicating
   efforts. Update especially after finishing your turn. 9999999999. When you
   learn something new about how to run the application, update @AGENTS.md using
   a subagent_type='sonnet' but keep it brief. For example if you run commands
   multiple times before learning the correct command then that file should be
   updated. 99999999999. For any bugs you notice, resolve them or document them
   in @IMPLEMENTATION_PLAN.md using a subagent_type='sonnet' even if it is
   unrelated to the current piece of work. 999999999999. Implement functionality
   completely. Placeholders and stubs waste efforts and time redoing the same
   work. 9999999999999. When @IMPLEMENTATION_PLAN.md becomes large periodically
   clean out the items that are completed from the file using a
   subagent_type='sonnet'. 99999999999999. If you find inconsistencies in the
   specs/* then use an subagent_type='Opus' with 'ultrathink' requested to
   update the specs. 999999999999999. IMPORTANT: Keep @AGENTS.md operational
   only — status updates and progress notes belong in `IMPLEMENTATION_PLAN.md`.
   A bloated AGENTS.md pollutes every future loop's context.
