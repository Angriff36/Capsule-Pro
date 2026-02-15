# Manifest Shadow Route Identity-Spoofing Validation

Date: 2026-02-11

## Scope

This documents the shadow-route hardening and verification work for:

- `C:\projects\capsule-pro\apps\api\app\api\kitchen\tasks\[id]\claim-shadow-manifest\route.ts`
- `C:\projects\capsule-pro\apps\api\__tests__\kitchen\manifest-shadow-claim-route.test.ts`

Goal: prove request-body identity spoofing is ignored, while keeping production traffic routing unchanged.

## Implementation State Verified

The shadow handler strips identity-like fields from request body before building the command payload:

- stripped: `id`, `userId`, `tenantId`, `orgId`, `user`
- authoritative values used instead:
  - route param `id` from `ctx.params`
  - authenticated `userId` from auth context
  - authenticated tenant context for runtime creation

Command payload passed to runtime is built from sanitized body + server-authoritative identity.

## Test Coverage Verified

`manifest-shadow-claim-route.test.ts` includes:

- existing spoof test for `userId` override attempt
- added multi-field spoof test with body including:
  - `userId`
  - `tenantId`
  - `orgId`
  - `user` object
- positive assertions:
  - runtime initialized with auth identity
  - `runCommand` called with auth `userId`
- negative assertions:
  - `runCommand` not called with spoofed `userId`
  - payload does not include spoofed `tenantId`, `orgId`, or `user`

## Command Results (Latest Run)

### 1) Targeted shadow-route test

Command:

```bash
pnpm --filter api test __tests__/kitchen/manifest-shadow-claim-route.test.ts -- --run
```

Result:

- Test Files: `1 passed`
- Tests: `4 passed`
- Exit code: `0`

### 2) Kitchen suite

Command:

```bash
pnpm --filter api test __tests__/kitchen/ -- --run
```

Result:

- Test Files: `15 passed`
- Tests: `160 passed`
- Exit code: `0`

## Notes

- Production route wiring was not switched to shadow route.
- This validation confirms a backup generated-style route can enforce auth-authoritative identity independently.
