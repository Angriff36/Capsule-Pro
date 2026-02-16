# Claim 003: Request Identity Hardening Prevents Identity Spoofing

## Claim

Route handlers ignore client-provided identity fields and inject auth/path-authoritative values (`id`, `userId`, tenant/org identity).

## Why It Matters

Prevents parameter tampering and identity spoofing in mutation and access flows.

## Preconditions

- Handler implementation follows payload hygiene pattern.
- Auth context and route params available.

## Pass Criteria

- Client-supplied identity values are stripped.
- Server reconstructs payload with authoritative identity fields.
- Non-identity fields (for example `stationId`) are preserved.
- Spoofing attempts fail to alter effective identity.

## Commands To Run

```bash
# TODO: add concrete test command(s) and request fixtures
```
