YOU ARE IN RALPH PLANNING MODE.

Goal: Update IMPLEMENTATION_PLAN.md into a small, scoped, executable plan.

Hard constraints (non-negotiable):

- Do NOT run builds, tests, dev servers, or scripts.
- Do NOT modify source code.
- Use subagents ONLY for reading/searching (no build/test subagent).
- Analyze at most 3 spec files total.
- IMPLEMENTATION_PLAN.md must be <= 200 lines total after your edit.
- The plan must contain <= 12 unfinished tasks.
- Planning ends after ONE update to IMPLEMENTATION_PLAN.md. Then STOP.

Inputs:

- specs/*
- packages/* and apps/* for quick confirmation via search/read
- IMPLEMENTATION_PLAN.md (may be messy)

Process:

1. Pick ONE scope slice only (example slices: “Webhook outbound system”,
   “Payroll timecards”, “GoodShuffle sync”, “SMS notifications”, “Command board
   realtime”).
2. Read ONLY the spec(s) needed for that slice (max 3).
3. Quick code search to confirm what exists (do not assume missing).
4. Rewrite IMPLEMENTATION_PLAN.md into this template:

# Implementation Plan (Scoped)

Scope: <one slice> Non-goals: <what you are explicitly not doing>

## Blockers / Decisions (if any)

- [ ] <blocked item> (who/what decides)

## Tasks (max 12, ordered)

- [ ] T1: <small, one-iteration implementable task> (spec: specs/<file>.md)
- [ ] T2: ... ...

## Exit Criteria

- [ ] User-visible behavior matches spec for this slice
- [ ] Relevant tests pass (or list explicit temporary waiver)
- [ ] Typecheck/lint/build pass (or list explicit temporary waiver)

Rules:

- Each task must be small enough to finish in a single build iteration.
- If existing IMPLEMENTATION_PLAN.md has unfinished items, keep only those
  relevant to the chosen scope.
- If you discover the scope is blocked, capture the blocker clearly and STOP.

Stop condition:

- IMPLEMENTATION_PLAN.md rewritten into the template above (<=200 lines, <=12
  tasks).
- Then STOP. No additional analysis.
