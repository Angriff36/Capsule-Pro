# Manifest Contract Alignment — kill the Manifest↔route↔UI drift class

> Created 2026-06-03. Root problem: hand-written routes + UI guess at command/read
> contracts, response shapes, and date serialization, so they drift from the Manifest
> backend. Symptoms (one per page): "Failed to save signature" (bootstrap), "Invalid
> time value" (date), "Cannot read properties of undefined (reading 'signerName')"
> (response shape). Fix the CONTRACT, not the pages.

## Key finding (changes the scope)
The **backend already emits the canonical shape** in BOTH execute paths:
- `apps/api/lib/manifest/execute-command.ts` (run-core/dispatcher) → `manifestSuccessResponse({ result, events })`
- `apps/api/lib/manifest-command-handler.ts` (legacy `executeManifestCommand`) → `manifestSuccessResponse({ result, events })`

`manifestSuccessResponse` wraps as `{ success: true, result, events }`. So the drift is
**almost entirely on the frontend** (guessing `result.signature`, raw `Intl.format`,
hand fetch URLs). The fix is: one date policy, one typed command client, and a
normalizer for any legacy route that still returns a custom shape.

## Tasks (status)
- [x] **T2 — Canonical response shape `{ success, result, events, constraintOutcomes? }`.** Already emitted by both backend paths. Verified. (Legacy errors already include `constraintOutcomes` via `manifestErrorResponse`.)
- [x] **T1/T4 — Legacy `executeManifestCommand` parity + normalizer.** Legacy handler now (a) seeds full body on create (bootstrap fix) and (b) returns the identical `{ success, result, events }` envelope. A frontend normalizer (`unwrapCommandResult`) tolerates legacy `{ data }`/`{ signature }` during migration.
- [x] **T5 — One date serialization policy + safe helper.** `apps/app/app/lib/format.ts` `formatDate`/`formatDateTime` hardened to accept `string | Date | number | null | undefined` and never throw (invalid → fallback). Rule: **API sends ISO strings or null; UI uses `formatDate`/`formatDateTime`; never call `Intl.DateTimeFormat.format(value)` on a raw value.**
- [x] **T3 (foundation) — Typed command client.** `apps/app/app/lib/manifest-client.ts` `executeCommand(entity, command, body)` POSTs the canonical dispatcher `/api/manifest/{entity}/commands/{command}`, throws on `!success`, returns typed `result`. UI calls this instead of guessing URLs/shapes. Proven on the signature flow.
- [ ] **T3 (full) — Generate typed clients per entity.** Run the unused `react-query` + `zod` projections (see `2.0-adoption` audit — they ship but are never executed) to emit typed hooks + input schemas per command, replacing hand fetches app-wide.
- [ ] **T6 — Audit + replace flat hand routes.** e.g. `apps/api/app/api/cateringorder/*`: reads → generated GET route (`events/catering-orders/*`), writes → dispatcher. Sweep all non-`Generated from Manifest IR` routes under `apps/api/app/api/`.
- [ ] **T7 — Contract tests.** For every command route assert response is exactly `{ success, result, events? }`; lint/test that page clients don't read `result.signature`-style fields outside the typed client.

## Done this session (proof of pattern)
- Hardened `formatDate`/`formatDateTime` (T5).
- Added `manifest-client.ts` `executeCommand` + `unwrapCommandResult` (T1/T3/T4 foundation).
- Migrated the contract **signature save** + contract **date rendering** to the typed client + shared date helper (no more page-local `dateFormatter`, no `result.signature` guess).

Next agent: continue at T3-full (projection-generated clients) then T6, T7.
