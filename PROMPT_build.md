0a. Study `specs/*` using parallel subagents.
0b. Study @IMPLEMENTATION_PLAN.md.
0c. Reference source code in `src/*`.

1. Implement functionality per specifications.
   - Choose highest priority item
   - Search codebase first
   - Use parallel subagents where available
   - If tools unavailable proceed directly (do NOT halt)

2. Run validation for improved unit of work.
   - Tests
   - Typecheck
   - Lint
   - Build
   Resolve failures.

3. Update @IMPLEMENTATION_PLAN.md with discoveries using subagent.

4. When validation passes:
   git add -A
   git commit
   git push

99999. Documentation captures WHY.
999999. Single sources of truth enforced.
9999999. Git tagging ONLY when milestone/phase complete.
99999999. Logging permitted.
999999999. Keep plan current.
9999999999. Update AGENTS.md with operational learnings only.
99999999999. Fix unrelated bugs or record them.
999999999999. No placeholders.
9999999999999. Periodically clean completed plan items.
99999999999999. Resolve spec inconsistencies with deep reasoning agent.
999999999999999. Keep AGENTS.md operational only.
