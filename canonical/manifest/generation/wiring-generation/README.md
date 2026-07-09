# Wiring contract generation

Canonical ID: `manifest.generation.wiring-generation`

Type: `generator`

Owner decision status: `final`

Implementation status: `working`

Last reviewed: `2026-07-09`

Last updated by: `cursor-agent`

---

## 1. What This Is

Plain-English purpose:

```text
Emit Manifest product wiring artifacts (contract JSON + safe bindings) as part of
normal Capsule-Pro Manifest generation so agents can inspect and remediate app
consumers without ad-hoc contract generation.
```

Real app impact:

```text
When correct:
- pnpm manifest:generate / manifest:build produces the wiring contract
- pnpm manifest:wiring:inspect and :remediate use that contract immediately
- one-defect remediation patches exactly one verified auto-fixable finding

When wrong:
- Agents invent local contract paths or hand-run bare CLI generate -p wiring
- Remediation proofs require one-off setup and drift from project config
```

---

## 2. Ryan Final Decision

Decision:

```text
Wiring is a first-class configured projection (projections.wiring). Artifacts are
generated during normal manifest:generate, gitignored under manifest/generated/wiring/,
and consumed via pnpm manifest:wiring:inspect / manifest:wiring:remediate wrappers.
Do not commit the contract; do not invent a parallel generate path.
```

Reason:

```text
Matches existing IR projection policy (manifest/generated/* gitignored except
runtime/ and guard-messages). Same pattern as other config-driven generators.
```

Do not do:

```text
- Hand-run `manifest generate -p wiring` with a one-off output path for proofs
- Commit manifest/generated/wiring/** into git
- Manually pick dietaryTags / allergens — use one-defect remediate
- Add a second analyzer or reporting system
- Invent defaults / sentinel IDs / dates for missing required inputs
```

---

## 3. Current Status

Current recorded status:

```text
projections.wiring in manifest.config.yaml
generate-wiring.mjs invoked from generate.mjs
wrappers: manifest:wiring, :inspect, :remediate
Requires @angriff36/manifest >= 3.4.0 (wiring projection + CLI commands)
add-required-input auto-applies only with proven in-scope value sources
```

Known gaps / limitations:

```text
- Large unwired capability counts remain until overrides are authored
- add-required-input refuses weak plans (no source, ambiguous sources,
  wrong type, second unresolved required field, trusted client spoof)
- Failed verification leaves the target repo unchanged (patch not committed)
- npm publish may lag cut-release; local file: link is fine for proofs
```

Confidence: `high`

Evidence:

```text
manifest.config.yaml → projections.wiring
manifest/scripts/generate.mjs (spawns generate-wiring.mjs)
manifest/scripts/generate-wiring.mjs
manifest/scripts/wiring-inspect.mjs
manifest/scripts/wiring-remediate.mjs
.gitignore: manifest/generated/*
Upstream: docs/projections/wiring.md (Manifest repo)
```

---

## 4. Paths

| Role                 | Path                                                                    |
| -------------------- | ----------------------------------------------------------------------- |
| Config               | `manifest.config.yaml` → `projections.wiring`                           |
| Generator            | `manifest/scripts/generate-wiring.mjs`                                  |
| Normal entry         | `pnpm manifest:generate` / `pnpm manifest:build`                        |
| Contract (generated) | `manifest/generated/wiring/src/generated/manifest-wiring-contract.json` |
| Bindings (generated) | `manifest/generated/wiring/src/generated/manifest-wiring-bindings.ts`   |
| Inspect              | `pnpm manifest:wiring:inspect`                                          |
| One-defect remediate | `pnpm manifest:wiring:remediate`                                        |
| Upstream docs        | Manifest `docs/projections/wiring.md`                                   |

---

## 5. Normal one-defect workflow

```text
Capsule-Pro normal Manifest generation
→ wiring contract generated
→ wiring inspect
→ one-defect remediation
→ post-repair verification
→ stop
```

```bash
pnpm manifest:generate                 # emits wiring artifacts
pnpm manifest:wiring:inspect           # optional
pnpm manifest:wiring:remediate         # exactly one verified auto-fix
# focused tests / gates on touched app files
# commit the app repair (not the generated contract)
```

### One-defect behavior

- Selects the highest-priority `automaticApplicationAllowed` plan.
- Prefers proven expression repairs (`replace-payload-expression`, …) over weak `add-required-input`.
- Skips candidates that fail apply or post-repair verification.
- Stops after the first verified successful apply.

### Verification / rollback

1. Re-run wiring inspection for the touched capability.
2. Prove the targeted mismatch is gone.
3. Prove no new contract mismatch was introduced for that capability.
4. Only then write files to disk.
5. If verification fails, leave the repository unchanged (in-memory patch discarded).

### Trusted context

Parameters declared `from context.*` are server-owned. Remediation strips client spoofing; it never wires trusted values from browser/form sources.

### `add-required-input` limitations

Auto-apply only when a unique proven source exists in consumer scope (same-name param/local/object/form field with compatible type). Otherwise classify `ambiguous-product-decision` or `unsafe-to-apply` — never invent values.
