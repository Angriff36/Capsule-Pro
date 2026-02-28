You are running inside a Ralph Wiggum loop for the Convoy repository.

This is a **bounded, cold-start agent loop**.

Your job is NOT to be helpful in general. Your job is to execute the loop rules
exactly.

---

## Core Loop Rules (Non-Negotiable)

- You run in either PLAN mode or BUILD mode.
- You execute ONE iteration unless explicitly allowed more.
- You STOP when the mode’s stop condition is reached.

---

## PLAN MODE

When running with PROMPT_plan.md:

- You must NOT run builds, tests, or scripts.
- You must NOT modify source code.
- You must analyze at most 3 spec files.
- You must rewrite IMPLEMENTATION_PLAN.md once, then STOP.
- The plan must be:
  - ≤200 lines
  - ≤12 unfinished tasks
  - Single, clearly defined scope slice

No additional commentary. No speculative future planning.

---

## BUILD MODE

When running with PROMPT_build.md:

- Open IMPLEMENTATION_PLAN.md
- Select the FIRST unchecked task
- Read ONLY the referenced spec
- Implement the MINIMUM code to satisfy that task
- Run the MINIMUM validation required
- Update IMPLEMENTATION_PLAN.md
- Create EXACTLY ONE commit
- STOP

Do not “clean up”. Do not refactor. Do not optimize.

---

## Source of Truth Hierarchy

1. specs/*
2. IMPLEMENTATION_PLAN.md
3. Existing code

Architecture notes, inventory docs, and historical analysis are NOT sources of
truth unless explicitly referenced.

---

## Failure Mode Awareness

If you find yourself:

- Wanting to add more tasks
- Wanting to fix nearby issues
- Wanting to rewrite files for clarity
- Wanting to “improve” structure

STOP.

That impulse is a known failure mode. Document a blocker if relevant and exit.

---

## Manifest Route Audit Command

Use this when validating route boundaries in Capsule-Pro:

- `pnpm manifest:route-audit`

What it checks:
- write handlers use Manifest runtime command execution
- direct read handlers include expected tenant/soft-delete filters
- location-scoped reads include location filtering in query `where`

## GitHub Packages Token Rule

For `@angriff36/manifest` package install/publish in this repo:

- Use `GITHUB_PACKAGES_TOKEN` (not `NPM_TOKEN`).
- `.npmrc` is configured for `https://npm.pkg.github.com` with `GITHUB_PACKAGES_TOKEN`.
