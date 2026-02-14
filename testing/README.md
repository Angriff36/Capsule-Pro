# Testing Proof System

This directory tracks what we claim is true and what is actually proven.

## Structure

- `proven-with-tests.md`: append-only high-level proof ledger.
- `proof-backlog.md`: prioritized list of claims that still need proof.
- `claims/`: one folder per claim.
- `_templates/`: reusable templates for new claims.

## Claim Folder Contract

Each claim folder must contain:

- `testclaim.md`: what is being claimed and pass criteria.
- `testreport.md`: concise result summary after running tests.
- `actualtest.md`: raw command transcript and concrete evidence.

## Naming

Use numeric prefixes for stable ordering:

- `claims/001-<short-claim-name>/`
- `claims/002-<short-claim-name>/`

## Workflow

1. Create or update `testclaim.md` with clear acceptance criteria.
2. Run commands and collect outputs.
3. Record summary in `testreport.md`.
4. Paste exact commands/results in `actualtest.md`.
5. If proven, append a short entry to `proven-with-tests.md`.
