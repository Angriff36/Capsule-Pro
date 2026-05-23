# ADR: Manifest artifact layout normalization

**Date:** 2026-05-22
**Status:** Accepted (governance + reports normalized; runtime/IR documented for follow-up)

## Context

Manifest-related generated artifacts were scattered across five conflicting locations, each with different schemas and different consumers. CI gates, runtime code, and tests pointed at whichever path happened to be convenient — causing audit gates to silently run against the wrong subset of commands and producing the "manifest-registry/ keeps disappearing" class of bug.

### Pre-cleanup layout (problem state)

| Path | Schema | Consumers |
|---|---|---|
| `manifest-registry/commands.json` | Wrapped envelope `{irHash, compilerVersion, commands: [...]}`; **full 589 commands** | CI gates (governance-audit, integration-check) — added 2026-05-22 |
| `manifest-registry/entities.json` | Wrapped envelope; **full 130 entities** | CI gates |
| `bypasses.json` (repo root) | `{ version, bypasses[] }` | CI gates; ad hoc auditing |
| `packages/manifest-ir/dist/commands.registry.json` | Flat array `[{entity, command, commandId}]`; **kitchen-scope subset** (~half the surface) | Runtime dispatcher (`apps/api/lib/manifest/command-resolver.ts`); enforce-surface gate |
| `packages/manifest-ir/ir/kitchen/kitchen.commands.json` | Flat array; **identical content to dist/commands.registry.json** | MCP route-conformance scanner; dispatcher test fixtures |
| `packages/manifest-ir/ir/kitchen/kitchen.ir.json` | Full IR (despite the "kitchen" name) | `manifest emit registries` input; codegen scripts |
| `manifest-audit/` (repo root, gitignored) | Audit report outputs | Output destination for `pnpm manifest:audit-direct-writes` (script not present on every branch) |

The "kitchen" prefix in `packages/manifest-ir/ir/kitchen/` is historical and misleading — the file contains the **full** aggregated IR for all 86 manifest sources, not just kitchen.

## Decision

Establish a single top-level `manifest/` directory with five subdirectories whose names describe **purpose**, not **scope**:

```
manifest/
├── source/       # .manifest text sources
├── ir/           # compiled IR
├── runtime/      # dispatcher/MCP/test sidecars
├── governance/   # full registries used by CI governance gates
└── reports/      # audit output destination (gitignored)
```

### What moves in this PR

| From | To | Status |
|---|---|---|
| `bypasses.json` | `manifest/governance/bypasses.json` | **MOVED** (no runtime consumers, only CI gates added 2026-05-22) |
| `manifest-registry/commands.json` | `manifest/governance/commands.json` | **MOVED** |
| `manifest-registry/entities.json` | `manifest/governance/entities.json` | **MOVED** |

The empty `manifest-registry/` directory and root `bypasses.json` are removed.

### What does NOT move (intentional)

| Location | Reason kept | Migration plan |
|---|---|---|
| `packages/manifest-ir/dist/commands.registry.json` | Imported at module load by `apps/api/lib/manifest/command-resolver.ts`. Renaming requires updating the runtime import + the path-aware comment block in command-resolver.ts. | Separate PR: move runtime sidecars to `manifest/runtime/` and retarget the resolver/MCP/tests in one atomic change. |
| `packages/manifest-ir/ir/kitchen/kitchen.commands.json` | Read by MCP route-conformance scanner + dispatcher test fixtures. | Same PR as above. |
| `packages/manifest-ir/ir/kitchen/kitchen.ir.json` | Input to `manifest emit registries`, codegen scripts (`scripts/manifest/{build,generate,generate-all-routes}.mjs`), and `manifest:validate`. The IR was last compiled by manifest 0.3.8; current installed compiler is 0.6.1 and produces different output. | Separate PR: regenerate IR under canonical name `manifest/ir/manifest.ir.json` and retarget all producers/consumers. |
| `packages/manifest-ir/dist/routes.{manifest.json,ts}` | Generated route helpers consumed via re-export chain by `apps/app/app/lib/routes.ts`. | Stays under `dist/` per next-forge convention. |
| `packages/manifest-adapters/manifests/*.manifest` | Ships with the adapters package; relocation has package-boundary implications. | Optional future PR. |

Each new `manifest/<subdir>/README.md` documents both the canonical-future location and the current actual location, so consumers and agents can't confuse the two.

## Consequences

### Positive
- Governance CI gates have a single, unambiguous home (`manifest/governance/`) and cannot accidentally point at a kitchen-only runtime sidecar.
- `pnpm manifest:registries` is the single canonical producer.
- New CI job `manifest-registry-drift` proves the committed registries match the IR on every PR.
- The README-per-subdirectory pattern surfaces the migration plan to anyone exploring the tree.

### Negative / accepted
- The runtime/IR artifacts still live under `packages/manifest-ir/`. Anyone reading the layout sees two homes (canonical `manifest/`, legacy `packages/manifest-ir/`). The READMEs cover this; full unification waits for the follow-up PR.
- The `kitchen` prefix in `packages/manifest-ir/ir/kitchen/` stays misleading until the IR relocation PR.

### CI gate routing after this PR

| Gate | Path | Blocking |
|---|---|---|
| `manifest-registry-drift` | `manifest/governance/{commands,entities}.json` | **YES** |
| `manifest-bypass-audit` | `manifest/governance/bypasses.json` | **YES** |
| `manifest-governance-audit` | `manifest/governance/{commands,bypasses}.json` | Reporting (577 conformance-test backlog) |
| `manifest-integration-check` | `manifest/governance/{commands,bypasses}.json` | Reporting (same backlog) |
| `manifest-enforce-surface` | `packages/manifest-ir/dist/commands.registry.json` (runtime sidecar — intentional, per the 0.6.1 commit author's plan) | Reporting (30+ known findings) |
| `manifest-route-audit` | `packages/manifest-ir/ir/kitchen/kitchen.commands.json` (kitchen-only, schema requirement of audit-routes CLI) | Reporting (175 ownership errors) |

## Follow-up PRs

1. **Runtime sidecar relocation** — retarget command-resolver, MCP, dispatcher tests, and codegen scripts from `packages/manifest-ir/{dist,ir/kitchen}/` to `manifest/runtime/`. Drop the legacy paths.
2. **IR regeneration + relocation** — compile fresh IR with manifest 0.6.1, write to `manifest/ir/manifest.ir.json`, retarget all producers/consumers, drop the `kitchen` prefix.
3. **Conformance test backlog** — add fixtures for the 577 MISSING_CONFORMANCE_TEST commands so governance-audit and integration-check can flip blocking.
4. **Hardcoded routes** — burn down from 587 to <50 (see [`hardcoded-routes-violations.md`](./hardcoded-routes-violations.md)).
5. **audit-routes ownership** — resolve the 175 errors or add to exemptions registry so audit-routes can flip strict.
6. **enforce-surface findings** — fix or bypass the 30 known findings; wait on upstream raw-SQL detection in manifest CLI.
