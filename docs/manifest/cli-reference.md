# Manifest CLI Reference

> **Audience:** Capsule-Pro contributors
> **Manifest version:** `@angriff36/manifest@0.5.0`
> **Last updated:** 2026-05-20
> **Source of truth:** [`packages/cli/src/index.ts`](https://github.com/Angriff36/Manifest/blob/main/packages/cli/src/index.ts)

The Manifest CLI ships with the `@angriff36/manifest` package. Inside this
workspace, invoke any command as:

```powershell
pnpm manifest <command> [options]
```

The binary is registered through `package.json` `bin.manifest`. There is **no**
separate `manifest` or `pnpm manifest install` global command — every command
below is a sub-command of the `manifest` binary that comes from the installed
package.

---

## Quick orientation

The CLI groups into seven lifecycle stages:

| Stage | Purpose | Commands |
|---|---|---|
| **Bootstrap** | One-time project setup | `init` |
| **Compile pipeline** | `.manifest` → IR JSON, validate against schema | `compile`, `validate`, `check`, `build` |
| **Code generation** | IR → Next.js routes, types, registries | `generate`, `emit registries`, `routes` |
| **Static analysis** | Pre-runtime configuration + governance audits | `scan`, `lint-routes`, `audit-routes`, `audit-governance`, `audit-bypasses` |
| **Runtime testing** | Execute commands against `RuntimeEngine` with assertions | `harness` |
| **Diagnosis** | When something breaks, figure out which layer failed | `doctor`, `runtime-check`, `inspect entity`, `diff source-vs-ir`, `duplicates`, `cache-status` |
| **Umbrella validation** | Single command that runs everything end-to-end | `integration-check` |

### Destructive commands

Only commands that **write files** are destructive. They overwrite without
warning when the target path already exists:

- `init` — writes `manifest.config.yaml`
- `compile -o <path>` — writes IR JSON
- `generate -o <path>` — writes generated TypeScript/route files
- `build` — writes both IR and generated code
- `emit registries --out <dir>` — writes `commands.json` and `entities.json`

Everything else is read-only or prints to stdout.

### Exit codes

`0` on success, non-zero on the failures noted per-command. Most
static-analysis commands surface a non-zero exit on errors found (CI-friendly).
`integration-check` aggregates: exit `1` if any section fails.

---

## At-a-glance reference

| Command | Stage | Reads | Writes | Non-zero exit on |
|---|---|---|---|---|
| `init` | bootstrap | — | `manifest.config.yaml` | write failure |
| `compile` | compile | `.manifest` | IR JSON (if `-o`) | parse/compile errors |
| `validate` | compile | IR JSON | — | schema violations |
| `check` | compile | `.manifest` | IR JSON (if `-o`) | compile or schema failure |
| `build` | compile + codegen | `.manifest` | IR + generated code | either failure |
| `generate` | codegen | IR JSON | TS/route files | codegen failure |
| `emit registries` | codegen | IR or `.manifest` | `commands.json`, `entities.json` | invalid output |
| `routes` | codegen | IR | stdout JSON | compile failure |
| `scan` | static | `.manifest` | — | policy gaps, unknown stores |
| `lint-routes` | static | TS source | — | hardcoded route strings |
| `audit-routes` | static | TS routes | — | boundary violations |
| `audit-governance` | static (umbrella) | TS + registries | — | governance findings |
| `audit-bypasses` | static | bypass registry | — | invalid registry, missing files |
| `harness` | runtime | `.manifest` + JSON | — | assertion failures |
| `doctor` | diagnosis | source + IR + routes | — | source/IR drift |
| `runtime-check` | diagnosis | source + IR + routes | — | command missing somewhere |
| `inspect entity` | diagnosis | source + IR | — | entity drift |
| `diff source-vs-ir` | diagnosis | source + IR | — | drift |
| `duplicates` | diagnosis | `*.merge-report.json` | — | suspicious duplicates |
| `cache-status` | diagnosis | IR timestamps | — | never (advisory) |
| `integration-check` | umbrella | everything above | temp `.tgz` (auto-deleted) | any section fails |

---

## 1. Bootstrap

### `init`

Interactive scaffold of `manifest.config.yaml` in the current directory.

- **Use when:** brand-new project adopting Manifest for the first time.
- **Don't use when:** the config already exists (use `-f` to overwrite, but
  that's destructive).
- **Destructive:** yes — writes a config file.
- **Relevance to Capsule-Pro:** skip. The config is already in place.

```powershell
pnpm manifest init [-f]
```

---

## 2. Compile pipeline

### `compile [source]`

Compiles `.manifest` source files into IR JSON.

- **Use when:** you want to inspect a single file's IR or feed it into
  custom tooling. Mostly useful for debugging compiler output.
- **Don't use when:** you're going straight to generated code — use `build`
  so IR and generated code stay in sync.
- **Destructive:** only if `-o <path>` is set. Without it, prints to stdout.

```powershell
pnpm manifest compile [source] [-o <path>] [-g <pattern>] [-d] [--pretty]
```

Options of note:
- `-d, --diagnostics` — include compiler diagnostics in the output
- `--pretty` — pretty-print JSON (default `true`)

### `validate [ir]`

Validates an IR JSON file against the v1 schema
(`docs/spec/ir/ir-v1.schema.json` in the Manifest repo).

- **Use when:** verifying a hand-written or hand-edited IR file before the
  runtime loads it.
- **Don't use when:** you just compiled the IR through this CLI — the
  compiler produces schema-valid IR by construction.
- **Destructive:** no.

```powershell
pnpm manifest validate [ir] [--schema <path>] [--strict]
```

### `check [source]`

`compile` then `validate` with a single exit code. CI gate for manifest edits.

- **Use when:** every PR that touches manifests, to confirm sources parse and
  the resulting IR matches the schema.
- **Don't use when:** you also want generated code — use `build` for the full
  pipeline.
- **Destructive:** only if `-o` is set.

```powershell
pnpm manifest check [source] [-o <path>] [-g <pattern>] [--strict]
```

### `build [source]`

Compiles to IR then runs `generate`. Day-to-day "I edited a manifest, rebuild
everything" command.

- **Use when:** any time you've edited a `.manifest` file and need fresh IR
  + generated routes/types.
- **Don't use when:** you only want IR (`compile`) or only want regen from
  existing IR (`generate`).
- **Destructive:** yes — overwrites `ir/` and `generated/` (or whatever your
  `manifest.config.yaml` says).

```powershell
pnpm manifest build [source] [-p <projection>] [-s <surface>] `
  [--ir-output <dir>] [--code-output <dir>] [-g <pattern>] `
  [--auth <provider>] [--database <path>] [--runtime <path>] [--response <path>]
```

This is what Capsule-Pro's `pnpm manifest:build` script invokes.

---

## 3. Code generation

### `generate <ir>`

Emits generated code from compiled IR via a projection.

Projections:
- `nextjs` (default) — emits Next.js App Router route handlers, including the
  canonical dispatcher
  `app/api/manifest/[entity]/commands/[command]/route.ts`
- `ts.types` — TypeScript type declarations
- `ts.client` — typed client for hitting the dispatcher from the frontend

Surfaces: `route`, `command`, `types`, `client`, `all`.

- **Use when:** IR is fresh and you want to regenerate only the code, or you
  need to scaffold the dispatcher route into a new app.
- **Don't use when:** IR is stale — recompile via `build`.
- **Destructive:** yes — overwrites the output path.

```powershell
pnpm manifest generate <ir> -p nextjs -s route -o app/api
```

**Relevance to Capsule-Pro:** how to scaffold the canonical dispatcher if it's
missing. Run with `--projection nextjs --surface route` and inspect the output.

### `emit registries`

Emits machine-readable `commands.json` and `entities.json` from compiled IR
(or directly from `.manifest` source). These registries are the index that
governance audits consume.

- **Use when:** entity/command surface has changed, or you're publishing
  registries for downstream consumers.
- **Don't use when:** no entity/command changes — registries are stable.
- **Destructive:** yes — overwrites `manifest-registry/` by default.

```powershell
# From source:
pnpm manifest emit registries --source "**/*.manifest" --out manifest-registry

# From precompiled IR:
pnpm manifest emit registries --ir <path/to/ir.json> --out manifest-registry
```

### `routes`

Compiles all `.manifest` files and prints the canonical route manifest as JSON
(or a summary). Authoritative "every route the runtime expects to exist."

- **Use when:** you want to diff against the actual `app/api/**/route.ts`
  files to find drift, or feed the route inventory into another tool.
- **Don't use when:** you want files written to disk — this only prints.
- **Destructive:** no.

```powershell
pnpm manifest routes -s "src/**/*.manifest" -f json
```

---

## 4. Static analysis

### `scan [source]`

Quick sanity check on `.manifest` files before runtime ever touches them.

Checks:
- Every command has at least one policy
- Every `store X in Y` target is a built-in (`memory`, `localStorage`,
  `postgres`, `supabase`) or bound in `manifest.config.ts`

- **Use when:** pre-commit hook on manifest edits.
- **Don't use when:** you want deep governance audits — that's
  `audit-governance`.
- **Destructive:** no.

```powershell
pnpm manifest scan [source] [-g <pattern>] [-f text|json] [--strict]
```

### `lint-routes`

Greps TypeScript source for hardcoded route strings
(e.g. `fetch('/api/recipes/create')`) that should go through the typed
dispatcher client instead.

- **Use when:** enforcing "no hand-written route strings on the client" across
  the codebase.
- **Don't use when:** intentional exemptions exist — add them to the lint
  config rather than disabling the lint.
- **Destructive:** no.

```powershell
pnpm manifest lint-routes [-f text|json] [-c <config>]
```

### `audit-routes`

Static analysis of route handlers for boundary compliance.

Checks:
- Writes execute via `runtime.runCommand`, not direct ORM calls
- Reads include expected tenant/location/soft-delete filters
- Ownership rules (when a commands manifest is supplied)

- **Use when:** "do any of my routes bypass the runtime?"
- **Don't use when:** legitimate exemptions exist — use `audit-bypasses` to
  whitelist them via `bypasses.json`.
- **Destructive:** no.

```powershell
pnpm manifest audit-routes `
  -r . `
  --tenant-field tenantId `
  --deleted-field deletedAt `
  --location-field locationId `
  --commands-manifest manifest-registry/commands.json `
  --exemptions bypasses.json `
  --strict
```

### `audit-governance` (alias: `audit-constitution`)

Umbrella running all five governance detectors and aggregating findings.

| Detector | What it flags |
|---|---|
| `direct-writes` | Direct ORM writes outside `runtime.runCommand` |
| `event-fabrication` | Semantic events created outside the runtime |
| `route-drift` | Per-command routes that bypass the canonical dispatcher |
| `missing-tests` | Governed commands without test references |
| `bypass-violations` | Direct writes not present in the bypass registry |

`audit-constitution` is preserved as a deprecated alias for backwards
compatibility.

- **Use when:** every CI build that touches manifests, route handlers, or the
  bypass registry. The central governance gate.
- **Don't use when:** you only need one detector — pass `--only direct-writes`
  (or any single name) for faster iteration.
- **Destructive:** no.

```powershell
pnpm manifest audit-governance `
  -r . `
  --commands-registry manifest-registry/commands.json `
  --bypass-registry bypasses.json `
  --strict
```

This is the single most important command for the Capsule-Pro Manifest
migration. Run it first to see the baseline violation count.

### `audit-bypasses`

Validates the approved-bypass registry against the schema. Reports missing-file
references as errors and expired `reviewBy` dates as warnings (errors under
`--strict-expiry`).

- **Use when:** after any edit to `bypasses.json`.
- **Don't use when:** the project doesn't use a bypass registry — start one
  before adopting governance gates.
- **Destructive:** no.

```powershell
pnpm manifest audit-bypasses --registry bypasses.json --strict-expiry
```

---

## 5. Runtime testing

### `harness <manifest> -s <script.json>`

Runs a JSON harness script against an in-memory `RuntimeEngine` and reports
assertion results. The script declares commands to run plus expected outcomes
(success, guard failure, policy denial, emitted events, state after).

- **Use when:** repeatable runtime behavior assertions without writing TS test
  code. Useful for QA-style verification scripts.
- **Don't use when:** you want unit tests against the runtime — write vitest
  tests directly against `RuntimeEngine`.
- **Destructive:** no — uses an in-memory store.

```powershell
pnpm manifest harness src/recipes.manifest -s harness/recipes.create.json
```

---

## 6. Diagnosis

### `doctor`

Triage entry point. Ranked offline diagnostics for source-vs-IR drift, route
correlation, and duplicate-merge detection. Prints a prioritized issue list
with suggested fix commands.

- **Use when:** runtime errors, "command not found" mysteries, generated-code
  weirdness — anything where you don't know which layer broke.
- **Don't use when:** you have a specific hypothesis — use a more targeted
  command (`runtime-check`, `inspect entity`).
- **Destructive:** no.

```powershell
pnpm manifest doctor [--entity <Name>] [--command <name>] [--route <path>] [--json]
```

### `runtime-check <Entity> <command>`

Focused doctor. "Is this specific entity.command wired up end-to-end?"
Correlates source manifest, compiled IR, and route surface for one command.

- **Use when:** the runtime returns `Command 'X.y' not found` and you need to
  identify which layer lost the command.
- **Don't use when:** no specific suspect — use `doctor` for broad triage.
- **Destructive:** no.

```powershell
pnpm manifest runtime-check Recipe create `
  --route /api/manifest/Recipe/commands/create
```

### `inspect entity <EntityName>`

Deep-dive on a single entity across source manifests and compiled IR. Lists
every command, property, emit, policy, and flags any drift.

- **Use when:** "what does Manifest currently think this entity looks like?"
- **Don't use when:** you want a multi-entity view — there isn't one.
- **Destructive:** no.

```powershell
pnpm manifest inspect entity Recipe --json
```

### `diff source-vs-ir <EntityName>`

Targeted drift report between `.manifest` source and compiled IR for one
entity. Lighter than `inspect entity` — just the differences.

- **Use when:** you suspect precompiled IR is stale relative to source.
- **Don't use when:** you're about to rebuild anyway — drift resolves on the
  next `build`.
- **Destructive:** no.

```powershell
pnpm manifest diff source-vs-ir Recipe --json
```

### `duplicates`

Summarizes any `*.merge-report.json` files produced when your build merges
multi-file manifests. Flags suspicious duplicates (vs. known/expected ones).

- **Use when:** you split manifests across files and want to confirm nothing
  silently collided during the merge.
- **Don't use when:** you don't use multi-file manifests.
- **Destructive:** no.

```powershell
pnpm manifest duplicates --entity Recipe
```

### `cache-status`

Prints precompiled IR file timestamps and advice about restarting long-running
processes to flush any in-memory IR cache.

- **Use when:** you rebuilt IR but the running server still acts like it has
  the old IR loaded.
- **Don't use when:** the deploy pipeline restarts servers anyway.
- **Destructive:** no — purely advisory.

```powershell
pnpm manifest cache-status --entity Recipe --command create
```

---

## 7. Umbrella validation

### `integration-check`

Single command that proves a downstream repo is correctly integrated with the
full Manifest governance + runtime contract.

Sections (each must pass for the overall exit to be `0`):

1. **governance** — runs all five `audit-governance` detectors
2. **bypasses** — validates `bypasses.json` against the schema
3. **dispatcher** — confirms the canonical
   `app/api/manifest/[entity]/commands/[command]/route.ts` route exists
4. **runtime-smoke** — instantiates an in-memory `RuntimeEngine` with
   `MemoryAuditSink` + `MemoryOutboxStore`, runs a synthetic command, asserts
   exactly-one audit emission plus one outbox enqueue plus correct
   `RuntimeContext` threading
5. **package-shape** — imports every documented subpath export and packs the
   tarball (via `pnpm pack`) to confirm SQL schemas, CLI bin, and adapter
   `dist/` files are all present

- **Use when:** validating the integration after a Manifest version bump, or
  as a CI gate that catches "we upgraded but forgot to migrate something."
- **Don't use when:** iterating on a single check — call that check's command
  directly for faster feedback.
- **Destructive:** no — the tarball it produces is auto-deleted.

```powershell
pnpm manifest integration-check `
  --root . `
  --commands-registry manifest-registry/commands.json `
  --bypass-registry bypasses.json
```

Skip flags (each is opt-in, never default):
- `--skip-runtime-smoke` — don't instantiate `RuntimeEngine`
- `--skip-package-shape` — don't run subpath-import + tarball checks
- `--skip-tarball` — keep the subpath-import sub-check but skip the
  `pnpm pack` step

---

## Recommended sequence for the v0.5.0 migration

Capsule-Pro just upgraded from `0.3.39` to `0.5.0` and has
`@angriff36/manifest` installed in five packages (`apps/api`, `apps/app`,
`packages/manifest-adapters`, `packages/manifest-ir`, `packages/mcp-server`).
Run these in order:

```powershell
# 1. Baseline — see what's actually wired up and what isn't.
pnpm manifest integration-check `
  --root . `
  --commands-registry manifest-registry/commands.json `
  --bypass-registry bypasses.json

# 2. If integration-check is noisy, zoom in on just the static gate.
pnpm manifest audit-governance `
  -r . `
  --commands-registry manifest-registry/commands.json `
  --bypass-registry bypasses.json `
  --strict

# 3. If the dispatcher route is missing, scaffold it.
pnpm manifest generate <path/to/ir.json> `
  --projection nextjs `
  --surface route `
  -o apps/api/app/api

# 4. After any entity/command surface change, refresh the governance index.
pnpm manifest emit registries `
  --source "**/*.manifest" `
  --out manifest-registry

# 5. Add to CI as a pre-merge gate on any manifest, route, or bypass change.
pnpm manifest check "**/*.manifest"
pnpm manifest audit-governance -r . --strict
```

When a runtime error shows up later:

```powershell
pnpm manifest doctor                              # broad triage
pnpm manifest runtime-check <Entity> <command>    # if "command not found"
```

---

## Commands you probably won't need

These exist for completeness — ignore them unless you hit the specific case:

- `init` — config already scaffolded
- `validate` — the compiler produces valid IR by construction
- `inspect entity` — only during deep debugging
- `diff source-vs-ir` — usually resolved by rebuilding
- `duplicates` — only if you split manifests across multiple files
- `cache-status` — your deploy pipeline already restarts processes

---

## See also

- [Manifest specification](https://github.com/Angriff36/Manifest/tree/main/docs/spec) — normative semantics
- [Integration check guide](https://github.com/Angriff36/Manifest/blob/main/docs/guides/integration-check.md) — deeper dive on the umbrella command
- [Adapter contracts](https://github.com/Angriff36/Manifest/blob/main/docs/spec/adapters.md) — `AuditSink`, `OutboxStore`, custom stores
