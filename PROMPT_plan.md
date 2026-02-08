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
<!--"don't assume not implemented" (critical - the Achilles' heel)
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



0a. Study `specs/*` with up to 250 parallel Sonnet subagents to learn the application specifications.
0b. Study @IMPLEMENTATION_PLAN.md (if present) to understand the plan so far.
0c. Study ``apps/app/app/*`lib/*` with up to 250 parallel Sonnet subagents to understand shared utilities & components.
0d. For reference, the application source code is in `apps/app/app/*`

1. Study @IMPLEMENTATION_PLAN.md (if present; it may be incorrect) and use up to 500 Sonnet subagents to study existing source code in `apps/app/app/*` and compare it against `specs/*`. Use an Opus subagent to analyze findings, prioritize tasks, and create/update @IMPLEMENTATION_PLAN.md as a bullet point list sorted in priority of items yet to be implemented. Ultrathink. Consider searching for TODO, minimal implementations, placeholders, skipped/flaky tests, and inconsistent patterns. Study @IMPLEMENTATION_PLAN.md to determine starting point for research and keep it up to date with items considered complete/incomplete using subagents.

IMPORTANT: Plan only. Do NOT implement anything. Do NOT assume functionality is missing; confirm with code search first. Treat `packages/*` as the project's standard library for shared utilities and components. Prefer consolidated, idiomatic implementations there over ad-hoc copies.

ULTIMATE GOAL: We want to focus on implementing the full command board implementation. complete these specs fully: specs\strategic-command-board-foundation_TODO
specs\command-board-entity-cards_TODO
specs\command-board-persistence_TODO
specs\command-board-realtime-sync_TODO
specs\command-board-relationship-lines_TODO. Consider missing elements and plan accordingly. If an element is missing, search first to confirm it doesn't exist, then if needed author the specification at specs/FILENAME.md. If you create a new element then document the plan to implement it in @IMPLEMENTATION_PLAN.md using a subagent.