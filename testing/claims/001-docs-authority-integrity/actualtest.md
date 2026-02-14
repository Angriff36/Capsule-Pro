# Actual Test Evidence: Claim 001

## Date

2026-02-11

## Environment

- repo path: `C:\Projects\Manifest`
- scope: documentation hardening and docs integrity validation

## Commands Executed

```bash
npm run docs:check
npm run verify:docs:quick
npm test
```

## Raw Outputs (Summary)

1. `npm run docs:check`
- `[docs:metadata] OK (6 files checked)`
- `[docs:links] OK (23 files checked)`

2. `npm run verify:docs:quick`
- exits 0 (runs `docs:check`)

3. `npm test`
- `Test Files 8 passed`
- `Tests 467 passed`

## Notes

- This evidence validates documentation integrity workflow and conformance/runtime tests in Manifest.
- Separate baseline failures in `npm run typecheck` and `npm run lint` were noted outside this claim scope.
