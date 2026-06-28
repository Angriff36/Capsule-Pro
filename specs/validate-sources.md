# Spec: `manifest:validate` source-level validation

> Status: PLANNED (not yet implemented). Pairs with `IMPLEMENTATION_PLAN.md` P1a.
> Implements Part 1 of `manifest/scripts/script-index.md` (owner's handwritten contract) for `pnpm manifest:validate`.

## Purpose

`manifest:validate` must validate raw `.manifest` **sources** under `manifest/source/`, not (only) the compiled IR. Today it is `pnpm exec manifest validate manifest/ir/kitchen.ir.json` — an IR-level JSON-Schema check (Ajv vs IR v1) that runs *after* compile. Source-level defects that vanish by IR-compile time can therefore never be caught. This spec defines the Capsule-owned source checks layered on top of upstream `compileToIR`.

This is necessarily Capsule-specific: the upstream `@angriff36/manifest` CLI has **no source-level validate** (verified 2026-06-26 via mintlify + `node_modules` v2.18.0). `manifest scan` covers only policy-coverage + store-consistency; `manifest validate-ai` is an AI-scored overlay. Neither enforces the three checks below.

## Scope

- **In:** every `manifest/source/**/*.manifest` file. Runs pre-merge, per-file, **before** the trio's `manifest:compile`. Must NOT require `manifest/ir/kitchen.ir.json` to exist.
- **Out:** IR-level structural validation stays with upstream `manifest validate` (Ajv) and `manifest:verify-invariants` (recompile + byte-diff). This validator is source-level only.

## Mechanism

1. Glob sources via `getConfigPaths().srcDir` (same glob `compile.mjs` uses).
2. Per file: `compileToIR(source)` — skipping files with `use` declarations (same rule as `compile.mjs:305-311`; those are merged authoritatively by `compileProjectToIR` later). Surface upstream diagnostics as errors.
3. Optionally shell `pnpm exec manifest scan` for policy-coverage + store-consistency (complementary, not a substitute).
4. Run the three Capsule checks below against each per-file IR + source text.
5. Fail fast (non-zero exit) on any violation; print file + line + rule.

## Checks

### C1 — Annoyance guards
Reject guards whose only effect is to annoy the user or leak internal coding details. A guard is an "annoyance guard" if it blocks an action on a value the user can never have produced or that Manifest can itself derive. **Fail example:** a constraint that rejects an empty `id` on create (Manifest generates the id) or a constraint that re-validates a field Manifest auto-populates (e.g. `tenantId`, `createdAt`). **Pass:** constraints that protect real domain invariants (e.g. `guestCount >= 0`, `status in [...]`).

> Precise detection rules (which fields are "Manifest-provided" vs "user-provided") to be finalized in P1a implementation — seed list: `id`, `tenantId`, `createdAt`, `updatedAt`, `deletedAt`, and any property with a Manifest default. Flag these as UNVERIFIED-precise until the implementation enumerates them from the IR.

### C2 — Required-autogen
Reject `required` on a field Manifest can/should auto-generate. A user must never be forced to supply a value Manifest can provide. **Fail example:** `property id string required` with no autogen, or requiring `createdAt`. **Pass:** `required` only on genuine user inputs.

### C3 — Inaccessible-required
Reject `required` on a field the user cannot supply given their access (required-when-inaccessible). **Fail example:** a child/derived field marked required that no command mutates and no UI exposes. **Pass:** every `required` field is writable by at least one command the actor can invoke.

## Pass/fail contract

- Clean tree → exit 0, no output noise.
- Deliberately-broken C1/C2/C3 case → exit 1 with `file:line rule:Cx message`.
- Malformed `.manifest` (upstream `compileToIR` diagnostic) → exit 1.
- Does **not** require `manifest/ir/kitchen.ir.json` to exist (runs on source alone).

## Relationship to the trio

`manifest:validate` (source-level) → `manifest:compile` (IR) → `manifest:build` (everything). `manifest:validate-ai` remains an opt-in `--min-score 100` IR/source overlay; `manifest:verify-invariants` remains the CI IR-freshness gate.
