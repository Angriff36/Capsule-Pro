# Manifest IR Compilation

Canonical ID: `manifest.generation.ir-compilation`

Type: `generator`

Owner decision status: `final` — the stock CLI compile path is correct; the wrapper's *glob-bug rationale* is retired (see §2)

Implementation status: `working`

Last reviewed: `2026-06-27`

Last updated by: `agent`

---

## 1. What This Is

Plain-English purpose:

```text
The first step of the Manifest pipeline: compile all manifest/source/*.manifest files into one
merged IR (manifest/ir/kitchen.ir.json) plus sibling artifacts (commands manifest + registry,
provenance, merge report, module graph). Every downstream generator (types, client, hooks, routes,
OpenAPI) reads this IR. Run via `pnpm manifest:compile` (manifest/scripts/compile.mjs), which calls
the OFFICIAL compiler APIs `compileToIR` / `compileProjectToIR` from @angriff36/manifest.
```

Real app impact:

```text
When correct:
- One merged IR is the single source of truth for all generation.
- All entities/commands/enums from every source file are present (not just the last file).

When wrong:
- Agents see compile.mjs's old comment and wrongly conclude the stock CLI is BROKEN, then avoid the
  bare CLI or reinvent merge logic.
- A partial IR (missing entities) silently breaks every downstream generator.
```

---

## 2. Ryan Final Decision

Decision:

```text
FINAL: The stock `manifest compile` CLI is NOT broken. The "--glob last file wins" bug that
compile.mjs was written to work around HAS BEEN FIXED in the published CLI.
```

Reason (verified by Ryan, 2026-06-27 — fixed by Ryan himself):

```text
- The bug: `manifest compile <glob> -o out.json` with multiple .manifest files used to overwrite
  the single JSON output once per file → only the LAST file's IR survived ("last file wins").
- The fix: `compileCommand` now auto-merges when multiple sources target one `.json` output:
      if (files.length > 1 && options.output?.endsWith('.json')) {
        return compileMerged(source, { ...options, merge: true });   // packages/cli/src/commands/compile.ts:325-330
      }                                                               // dist/commands/compile.js:262-264
- Landed in commit d6d42fc, shipped since v2.10.0 → present in the installed v2.18.5
  (verified via `git tag --contains`).
- So bare `manifest compile '<glob>' -o kitchen.ir.json` merges correctly today.
```

Do not do:

```text
- Do NOT treat the stock `manifest compile` CLI as broken or "last-file-wins". It is fixed (≥2.10.0).
- Do NOT reinvent merge logic citing this bug.
- Do NOT delete manifest/scripts/compile.mjs on the assumption it is "just the glob workaround" —
  it ALSO emits sibling artifacts the bare CLI does not (see §3a). Before removing it, TEST the bare
  bare-CLI merged output against the wrapper's and confirm artifact parity. Do not assume.
- If you find another wrapper justified by a "Manifest bug", STOP and ask Ryan before acting —
  the bug may already be fixed upstream (Ryan owns the compiler).
```

---

## 3. Current Status

Current recorded status:

```text
`pnpm manifest:compile` (manifest/scripts/compile.mjs) compiles manifest/source/*.manifest to
manifest/ir/kitchen.ir.json via the official compileToIR / compileProjectToIR APIs. It also writes:
commands manifest, commands registry, provenance, merge report, and module graph.

The committed IR is stamped compilerVersion 2.18.0 (provenance), predating the 2.18.5 package bump —
a recompile would re-stamp it. (Datetime properties are represented as { name: "datetime" } in the IR.)
```

Known gaps:

```text
1. compile.mjs's header comment still asserts the "--glob last file wins" bug as a present fact.
   That rationale is STALE (fixed ≥2.10.0). The comment is being corrected; the wrapper is kept for
   its sibling-artifact emission, NOT for the merge workaround.
2. Whether the bare CLI's merged output is byte-equivalent to the wrapper's IR is UNVERIFIED — must
   be tested before any decision to retire compile.mjs.
```

Confidence: `high` (fix facts are Ryan-verified; he authored the fix)

Evidence:

```text
- Wrapper: manifest/scripts/compile.mjs (uses @angriff36/manifest/ir-compiler, /multi-compiler)
- Output: manifest/ir/kitchen.ir.json (+ commands/registry/provenance/merge-report/module-graph)
- CLI fix: packages/cli/src/commands/compile.ts:325-330 (manifest repo), commit d6d42fc, since v2.10.0
- Installed compiler: @angriff36/manifest 2.18.5
- Official CLI: `manifest compile [source]` — "Compile .manifest source to IR"
```

---

## 3a. Custom Glue & Why Manifest Can't Do It Natively

| Glue | Why it was written | Native today? | Status |
|---|---|---|---|
| Merge-multiple-sources (`compile.mjs` calling `compileToIR`/`compileProjectToIR`) | Stock `manifest compile <glob> -o out.json` used to keep only the last file ("last file wins") | **YES — fixed ≥2.10.0.** Bare CLI auto-merges multiple sources into one `.json`. | **RATIONALE RETIRED** — the glob-bug reason no longer holds |
| Sibling-artifact emission (commands manifest + registry, provenance, merge report, module graph) | Capsule consumes these alongside the IR | The bare CLI emits only the IR | **STILL DOES MORE THAN THE CLI** — keep until parity verified |

Net: the *merge* glue is redundant (CLI fixed), but `compile.mjs` is not simply deletable because it also produces sibling artifacts. Retire only after a bare-CLI-vs-wrapper equivalence test.

---

## 4. Where It Lives

```text
Canonical decision file: canonical/manifest/generation/ir-compilation/README.md
Source:                  manifest/scripts/compile.mjs
Compiler APIs:           @angriff36/manifest/ir-compiler, @angriff36/manifest/multi-compiler
Generated output:        manifest/ir/kitchen.ir.json (+ commands/registry/provenance/merge-report/module-graph)
CLI:                     pnpm manifest:compile  (or stock `manifest compile`)
```

---

## 5. What Consumes It

```text
Every downstream generator reads kitchen.ir.json: type-generation, client-generation,
route-generation, docs-generation, react-query hooks, field-hints, zod schemas, OpenAPI.
Human: Ryan, coding agents, manifest:ci.
```

---

## 10. Open Questions

| ID | Question | Why it matters | Evidence | Options | Ryan decision |
|---|---|---|---|---|---|
| Q001 | Retire `compile.mjs` now that the CLI merges natively? | Removes a wrapper whose primary rationale is stale. | CLI merge fixed ≥2.10.0; but wrapper also emits 5 sibling artifacts the bare CLI doesn't. | A: Keep wrapper for sibling artifacts; B: Retire after verifying bare-CLI parity + moving artifact emission elsewhere | NEEDS-RYAN |

---

## 11. Decision History

| Date | Decision | Made by | Reason |
|---|---|---|---|
| 2026-06-27 | Recorded that the stock CLI "--glob last file wins" bug is FIXED (≥2.10.0, commit d6d42fc, in 2.18.3). compile.mjs's workaround rationale is stale; wrapper kept for sibling-artifact emission. | Ryan | Ryan authored the upstream fix; stop agents treating the CLI as broken |
