# Claim 001: Manifest Docs Authority and Integrity Checks Are Enforced

## Claim

The Manifest repository enforces documentation integrity for canonical docs and has executable checks proving:

1. Tier-A spec markdown files include required metadata headers.
2. Canonical docs links resolve without dead local references.
3. Core conformance/runtime test suite remains green after docs hardening updates.

## Why It Matters

Prevents authority drift and broken documentation pathways that mislead humans/agents.

## Preconditions

- Manifest repo available at `C:\Projects\Manifest`.
- `npm` dependencies installed.

## Pass Criteria

- `npm run docs:check` exits 0.
- `npm run verify:docs:quick` exits 0.
- `npm test` exits 0.

## Commands To Run

```bash
cd C:\Projects\Manifest
npm run docs:check
npm run verify:docs:quick
npm test
```
