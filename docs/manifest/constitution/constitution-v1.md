

# CAPSULE_PRO_CONSTITUTION.md

## Capsule-Pro Constitution

Manifest Integration Charter

### 1. Scope and Authority

This constitution governs how the Capsule-Pro application integrates with the Manifest language and runtime.

Normative authority for domain semantics resides exclusively in Manifest Tier A documentation, including `docs/DOCUMENTATION_GOVERNANCE.md`, the IR schema contract at `docs/spec/ir/ir-v1.schema.json`, runtime meaning defined in `docs/spec/semantics.md`, built-ins in `docs/spec/builtins.md`, adapter and effect boundaries in `docs/spec/adapters.md`, conformance rules and executable evidence in `docs/spec/conformance.md` and `src/manifest/conformance/**`, and repository guardrails defined in `docs/REPO_GUARDRAILS.md`.

Capsule-Pro does not redefine domain semantics. This constitution defines application-layer integration rules and prohibitions. If any conflict exists between Capsule-Pro behavior and Manifest specification documents, the Manifest specification prevails. Capsule-Pro must be brought into conformance.

---

### 2. Write Path Governance

Any domain mutation intended to be governed by Manifest must execute through `RuntimeEngine.runCommand` using compiled IR.

Capsule-Pro must not perform direct database writes for governed entities in routes, server actions, background jobs, workflow orchestrators, or UI-triggered handlers. A mutation that represents a domain command, state transition, invariant-sensitive update, or semantically governed change must pass through the runtime.

Direct writes are permitted only for records explicitly classified as "Manifest bypass allowed." Such records must be infrastructure-level and not semantically governed domain state. Each bypass must include written justification explaining why runtime governance is not required and why the bypass does not violate semantic guarantees.

Application code must not duplicate guard logic, constraint evaluation, policy checks, or transition rules outside the runtime. Capsule-Pro must not bypass Manifest execution semantics.

---

### 3. Read Path Freedom

Read paths may bypass the runtime.

Capsule-Pro may read directly from databases, projections, or materialized views. Read models are derived representations of domain state. They must not define domain meaning, enforce invariants, or encode alternative state machines.

If a projection implies behavior not defined in IR, the projection is incorrect. Semantic authority originates from IR and runtime execution, not from UI state, cached data, or derived views.

---

### 4. UI and Command Board Boundary

The UI layer, including the Command Board and workflow orchestration tooling, may visualize state and orchestrate command invocations.

UI components must not encode domain state machines, validation rules, transition graphs, or invariant logic that contradicts or duplicates IR-defined governance. The UI may surface diagnostics, validation failures, and execution outcomes returned by the runtime. It must not substitute its own domain rules.

Workflows composed in the Command Board may coordinate multiple commands. Each mutation within such a workflow must invoke governed commands via the runtime. The board is an orchestration surface, not a semantic authority.

---

### 5. Events and Outbox Discipline

Semantic events are runtime-emitted consequences of successful command execution as defined by Manifest specification.

Capsule-Pro must not synthesize semantic events in application code. No route, background job, or UI layer may fabricate, emit, or persist an event representing domain semantics unless it originates from runtime execution of a declared IR command.

Where transactional persistence is supported, state mutation and semantic event persistence must align with the same transaction boundary. If command execution fails or rolls back, semantic events must not be recorded.

Operational logs, analytics signals, or infrastructure notifications must not be treated as semantic events.

---

### 6. Determinism and Effect Boundaries in Tests

Capsule-Pro test harnesses must respect deterministic runtime options where required by Manifest specification.

When deterministic mode is enabled, effect boundary violations must surface as errors. Tests must not suppress, ignore, or override deterministic enforcement.

Tests verifying governed behavior must invoke `runCommand` with compiled IR and assert against runtime results and emitted events. Helpers that mutate governed state directly without runtime invocation are nonconforming.

---

### 7. Dispatcher Execution Wrapper Rule

There is exactly one allowed shape for Manifest command execution on the Capsule-Pro server.

`RuntimeEngine.runCommand` is the Manifest engine primitive. It is owned by the `@angriff36/manifest` package and is not a Capsule-Pro extension surface.

`apps/api/lib/manifest/execute-command.ts` `runManifestCommand` is Capsule-Pro's canonical transport execution wrapper. It is the only Capsule-Pro module permitted to invoke `RuntimeEngine.runCommand` and the only module permitted to perform command resolution, runtime creation, result normalization, policy denial mapping, guard failure mapping, command error mapping, or emitted-event mapping for HTTP transport.

`apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` is the canonical dynamic dispatcher. It must be a thin HTTP shell. Its only responsibilities are:

- URL params resolution (`entity`, `command`)
- Request body parsing
- Auth + tenant + user resolution
- `instanceId` extraction from the body
- Delegating execution to `runManifestCommand`

The dispatcher route MUST NOT duplicate any of the following — they belong exclusively to `runManifestCommand`:

- Command slug resolution (kebab-case → camelCase, exact vs alias)
- Manifest runtime creation
- `RuntimeEngine.runCommand` invocation
- Success result normalization
- Emitted-event mapping
- Policy denial → HTTP response mapping
- Guard failure → HTTP response mapping
- Semantic command error → HTTP response mapping
- General execution-time error handling

The Next.js dispatcher projection (the generator that emits `route.ts` from the Manifest IR) MUST emit the thin wrapper shape described above. If generated dispatcher output inlines `RuntimeEngine.runCommand` or any of the responsibilities listed above, that is **projection drift** — a defect in the projection itself, not in the dispatcher.

Generated dispatcher `route.ts` MUST NOT be hand-edited. If the dispatcher is wrong, fix the generator, the projection, or `runManifestCommand`, then regenerate. Hand-edits to a `// @generated` file are detector-only compliance and are not acceptable.

Dispatcher architecture tests MUST assert against the generated output (file content of `route.ts` as it appears on disk after generation), not against hand-applied fixes. A test that passes only because someone hand-edited generated output is wrong; it certifies the wrong thing.

This rule applies symmetrically to any other Manifest-projection-emitted transport (REST adapter projection, RPC projection, etc.) if and when introduced — the projection generates a thin shell, the shared wrapper owns execution semantics, and tests assert against generated output.

The narrow legitimate exception is `apps/api/app/api/user/*` style hand-written domain REST adapters that delegate to `runManifestCommand` with hard-coded `entity` and `command` values for a single endpoint. These are not dispatcher candidates because they encode a fixed command and may add endpoint-specific shape (e.g. mapping URL params to body keys). They still MUST delegate execution; they may not duplicate the responsibilities listed above.

---

### 8. Generator Source Rule

Generated files MUST NOT be hand-edited.

A file is "generated" if it carries a `// @generated`, `// auto-generated`, or equivalent banner; if it is emitted by a Manifest projection (e.g. `nextjs.dispatcher`, route helpers, IR registries); or if it is the documented output of a producer script under `scripts/manifest/` or analogous tooling.

If a generated file is wrong, the agent MUST:

1. Identify the producer: the projection, generator, or generation wrapper that emitted the file.
2. Fix the producer.
3. Regenerate.
4. Commit the regenerated file alongside the producer change.

Hand-editing a generated file to "fix" its content is projection drift. It hides the producer defect, accumulates over time, and silently diverges the on-disk artifact from what the next regeneration will produce. PRs containing edits to generated files MUST include the corresponding producer change or MUST be rejected by reviewers.

Tests asserting against generated output MUST re-run the generator (or read the file on disk after generation) so the assertion measures producer correctness, not residual hand-edits.

---

### 9. Canonical Evidence Hierarchy

When deciding what is correct — what architecture is intended, which path is canonical, what shape a file MUST take — evidence sources rank in this order, highest first:

1. **Manifest specification** (upstream `@angriff36/manifest` Tier A docs, IR schema, semantics, conformance, adapters, repo guardrails).
2. **This constitution** (`docs/manifest/constitution/constitution-v1.md`).
3. **Generator / projection contract** (e.g. dispatcher projection contract, route projection contract).
4. **Helper docstrings, in-file architectural comments, and dedicated architecture tests** (e.g. `dispatcher-architecture.test.ts`).
5. **Current call sites** — only AFTER explicitly excluding deprecated-alias paths and `// @generated` legacy output.

"Most existing code does X" is the weakest signal. A high-volume pattern in inlined dispatcher output, in `DEPRECATED ALIAS` routes, or in commented-out code is NOT authority for the canonical architecture.

When a low-tier signal conflicts with a higher tier, the higher tier wins. Agents MUST NOT cite an inlined behavior in a generated file as authority for the architecture. Agents MUST NOT cite a concrete-route compatibility alias as the canonical write path. When in doubt, the constitution and the projection contract govern; the legacy material is debt.

---

### 10. Registry Source Rule

Governance audits MUST read from `manifest/governance/*`. The three canonical registries are:

- `manifest/governance/commands.json` — full Manifest command surface
- `manifest/governance/entities.json` — full Manifest entity surface
- `manifest/governance/bypasses.json` — approved-bypass registry

The kitchen-scoped runtime sidecars at `packages/manifest-ir/dist/commands.registry.json` and `packages/manifest-ir/ir/kitchen/kitchen.commands.json` are NOT governance truth. They reflect the dispatcher's runtime resolution surface, which is currently scoped to the kitchen subset. They exist because the dynamic dispatcher's command-resolver imports a flat-array registry, and that subset happens to be what is currently dispatcher-routed.

Repo-wide governance audits (`audit-governance`, `audit-bypasses`, `integration-check`, the Capsule-local direct-write audit, and any future repo-wide gate) MUST point at `manifest/governance/*`. A gate that points at a runtime sidecar audits only the kitchen surface and MUST be labeled as such in its workflow definition and its inline comment.

`enforce-surface` is the documented exception: it audits the dispatcher's surface and therefore reads the runtime sidecar by design. That is intentional and is documented in `docs/audits/manifest-artifact-layout-adr.md`.

Producer scripts that emit governance registries MUST write to `manifest/governance/*` (canonical) via `pnpm manifest:registries`. New parallel registry locations MUST NOT be introduced.

---

### 11. Baseline-and-Block-New Rule

For constitution-level invariants where the repo has pre-existing debt and a clean-from-scratch gate would block every PR, the gate MAY ship in baselined form. The baseline:

- MUST live under `manifest/governance/baselines/<gate>.json`
- MUST be committed to the repo (it is governance state, not local scratch)
- MUST encode each existing finding with a stable key (e.g. `(file, entity, method)` for direct writes; `(advisoryId, moduleName)` for security audit) — line numbers MUST NOT be the sole key
- MUST be the diff anchor: any NEW finding not present in the baseline MUST fail the gate

A baselined gate MUST NOT use `continue-on-error: true` to suppress new findings. The `continue-on-error: true` pattern is reserved for transitional reporting gates that have NOT yet been baselined, and each such gate MUST carry an explicit flip-to-blocking condition documented inline in the workflow definition (e.g. "flip when violation count drops below 50", or "flip when upstream raw-SQL detection ships").

Regenerating a baseline (via `--save-baseline` or equivalent) is a deliberate act:

- MUST be done in a PR whose body explains why the baseline shifted
- MUST NOT be used to silence a new violation introduced by the same PR
- Reviewers MUST verify that resolved findings are real (the corresponding code was actually migrated or bypassed) and that new findings are accepted with stated reason

The constitution-level invariants this rule covers include: direct writes against governed entities (§2), event fabrication (§5), route drift, enforce-surface findings, conformance-test gaps (§6), and security advisories. Adding a new baselined invariant follows the same pattern.

---

### 12. Local Detector Rule

Upstream Manifest detectors have known structural blind spots. Capsule-Pro MUST maintain local detectors to close those gaps.

Known blind spots requiring local coverage:

- **Identifier pattern**: upstream `direct-writes` matches only the literal `prisma.X.<method>(`. Capsule writes through `database.X.<method>(` (re-exported `PrismaClient` from `@repo/database`). The local detector MUST match both identifier forms.
- **Scan globs**: upstream `direct-writes` walks only `app/api/**/route.ts`, `app/actions/**/*.ts`, `jobs/**/*.ts`. Capsule writes also live under `apps/api/app/lib/**`, `apps/api/lib/**`, server actions outside `app/actions/` (e.g. `apps/app/app/(authenticated)/**/actions.ts`), packages, and cron handlers. The local detector MUST walk these.
- **Raw SQL writes**: `$executeRaw`, `$queryRaw`, and untyped raw SQL invocations that mutate governed state are not covered by any upstream detector at this time. The local detector MUST cover them once upstream support exists; until then, a documented gap MUST be tracked in the operational governance doc.

Local detectors live under `scripts/manifest/` (Manifest-shaped) or `scripts/security/` (security-shaped). Each MUST be wired into a baselined CI gate per §11 (Baseline-and-Block-New Rule).

"Green upstream detector" is NOT a compliance claim. Per `docs/manifest/governance.md` "Hard compliance vs detector-only compliance," reporting compliance for direct writes requires the local audit also passing. A PR that cites only the upstream detector as evidence of hygiene MUST be challenged by reviewers.

When upstream ships a detector that closes a local blind spot, the local detector MAY be removed — but only after demonstrating that the upstream detector covers the same identifier patterns and the same file glob set.

---

### 13. Manifest Version Sync Rule

A `@angriff36/manifest` package version bump in any of the six `package.json` files (root, `apps/api`, `apps/app`, `packages/manifest-adapters`, `packages/manifest-ir`, `packages/mcp-server`) is a coordinated event. It MUST be done in a PR that also verifies and, where necessary, regenerates the following:

- **IR drift check**: recompile IR from sources; verify no diff vs committed `packages/manifest-ir/ir/kitchen/kitchen.ir.json` (or commit the new IR).
- **Governance registry drift check**: re-emit `manifest/governance/{commands,entities}.json` via `pnpm manifest:registries`; verify no diff (or commit the new registries).
- **Dispatcher projection drift check**: re-run the `nextjs.dispatcher` projection; verify no diff vs the committed dispatcher `route.ts` (or commit the regenerated dispatcher).
- **Runtime sidecar drift check**: re-emit the kitchen-scoped runtime sidecars; verify no diff (or commit the regenerated sidecars).
- **Enforce-surface re-run**: run `pnpm exec manifest enforce-surface ...` and surface any new findings; either fix them, add bypass entries, or update the baseline per §11.
- **Audit re-run**: `audit-governance`, `audit-bypasses`, `integration-check` against the new package version.

The PR description MUST report each check as PASS / CHANGED / FAIL. A "CHANGED" outcome requires committing the regenerated artifact in the same PR. A version-bump PR that absorbs upstream output changes silently (regeneration produces diffs that are not committed, or are committed without the changes being called out) is projection drift under §7 and §8.

Major-version bumps additionally require a re-review of this constitution against the upstream changelog.

---

### 14. Composite Endpoint Rule

Product APIs MAY expose composite endpoints that orchestrate multiple Manifest commands within a single HTTP transaction (e.g. "create-event-with-line-items", "soft-delete-with-cascade").

A composite endpoint:

- MUST delegate each governed mutation through `runManifestCommand` (or the runtime equivalent for non-HTTP transports). Every governed write inside a composite endpoint MUST be command-backed.
- MUST NOT mix governed runtime writes with direct database writes for governed entities. A composite that combines `runManifestCommand` for one entity and a direct `database.X.create` for another is non-conforming.
- MUST NOT duplicate command resolution, runtime creation, or result normalization — each component invocation flows through the canonical wrapper.

A composite endpoint that needs cross-command transactional guarantees MUST adopt one of these options:

- Decompose the requirement so each component is a complete command.
- Wrap multiple `runManifestCommand` calls in a runtime transaction supported by the Manifest engine.
- Add a documented bypass entry per §2 with a real `whyRuntimeNotRequired` explaining why a transactional cross-command boundary cannot be expressed inside the runtime.

Composite endpoints MUST be discoverable as composite in the route handler — either via an in-file architectural comment naming the constituent commands or via a naming convention that makes the orchestration explicit. A composite endpoint that masquerades as a single command is non-conforming.

---

### 15. Existing Command Before New Command Rule

Before adding a new Manifest command, new API route, new Prisma table, or new helper that writes to governed state, an agent MUST:

1. Inspect `manifest/governance/commands.json` for an existing command on the target entity.
2. Inspect the dynamic dispatcher and the hand-written domain REST adapters for an existing endpoint that already covers the use case.
3. Inspect existing helpers and server actions for an existing write path that already routes through `runManifestCommand`.

If an existing command, endpoint, or helper meets the requirement, the agent MUST use it. "Easier to add a new one than to find an existing one" is NOT acceptable. Duplicate write paths are §2 Write Path Governance violations regardless of intent, and they are §15 violations even when each individual write goes through the runtime.

A PR introducing a new command, route, table, or helper for a use case that an existing command serves MUST justify the duplication in the PR body. Acceptable justifications include: the existing command's contract genuinely cannot satisfy the new requirement; the existing command is itself deprecated and being replaced; the new shape is a documented composite endpoint per §14.

Unacceptable justifications include: "didn't see the existing one"; "wanted a cleaner shape"; "easier to test in isolation"; "wasn't sure if the existing one was canonical." None of these is sufficient.

Reviewers MUST reject duplication absent a substantive justification.

---

### 16. Test Harness Rule

Tests of governed HTTP routes MUST run within a Next.js App Router context that includes the actual middleware, auth, and tenant resolution path the production route uses. A test that bypasses production auth/tenant resolution and asserts on the route's behavior is asserting against a fiction.

Mocks of auth or tenant modules MUST preserve every export the route handler imports. A mock of `@/app/lib/tenant` that omits `requireCurrentUser`, `getCurrentUser`, or `getTenantContext` produces a runtime resolution failure that surfaces as a misleading test result — the test "fails" for the wrong reason or "passes" because the route never reached its real logic. Mock factories MUST mirror the real module's export surface.

Tests asserting against generated output (e.g. dispatcher `route.ts`, generated route helpers, emitted registries) MUST read the file from disk after generation. When the upstream package version changes, the test setup MUST re-run the generator before reading. A test that asserts against a stale generated file is asserting against the past; it certifies projection drift as compliant.

Tests of governed behavior MUST invoke `runCommand` (or `runManifestCommand` for HTTP-shaped assertions) against compiled IR and MUST assert on returned results and emitted events. Per §6, this is the only evidence tier that satisfies the `missing-tests` detector. Substring presence of a `commandId` in a hand-crafted fixture is NOT acceptable — that is named-only evidence and is rejected by the operational governance doc.

Test files asserting structural invariants about generated artifacts (e.g. `dispatcher-architecture.test.ts`) MUST be path-correct: their internal `PROJECT_ROOT` constants MUST resolve to the actual repo root, not an intermediate ancestor. A test that silently fails because its path resolution is off is worse than no test; it asserts confidence that isn't there.

---

### 17. Legacy Alias Quarantine Rule

Concrete per-command routes — files of the shape `apps/api/app/api/<entity>/<command>/route.ts` outside the canonical dispatcher tree — are compatibility aliases ONLY. They are not canonical architecture. They exist to bridge specific in-flight migrations and they MUST carry the migration debt explicitly.

A concrete route MUST carry a `DEPRECATED ALIAS` marker as the first comment line of the file. The marker MUST name:

- The canonical dispatcher target (e.g. `/api/manifest/EventContract/commands/send`).
- The specific blocker preventing immediate migration. The blocker MUST be one of the seven listed in `docs/manifest/governance.md` (composite transaction, multi-method route, pre-command validation, post-command side effect, status/body multiplexing, missing Manifest store, shadow/testing route).
- The concrete migration path: which file changes would remove the alias.
- The client guidance: what new callers SHOULD call instead.

Concrete routes that lack a quality-bar `DEPRECATED ALIAS` marker MUST be treated as violations by the route-audit gate.

Agents MUST NOT cite a concrete route as "how Capsule-Pro routes commands." The canonical write surface is the dynamic dispatcher (§7). When asked to add a new command's HTTP shape, the agent MUST extend the dispatcher or add a documented composite endpoint per §14, NOT add a new concrete route. New concrete per-command routes are forbidden under this rule and under `docs/manifest/governance.md`'s "Manifest routing rules."

Legacy aliases are debt to be retired, not architecture to be cited.

---

### 18. Change Protocol

Any behavior change affecting governed semantics must follow this order: Manifest specification update, conformance and test updates, then Capsule-Pro implementation changes.

Capsule-Pro must not implement semantic behavior that diverges from current Manifest specification. If divergence temporarily exists, it must be explicitly documented as nonconformance until resolved.

Specification changes precede implementation changes for governed behavior.

---

### 19. Enforcement Surfaces

Capsule-Pro must maintain enforcement mechanisms that prevent runtime bypass and detect nonconforming mutations.

These include route audits identifying direct writes in command routes, CI test gates validating conformance and protected invariants, and linting or static analysis rules detecting hardcoded mutation paths for governed entities.

Enforcement surfaces must align with and reinforce repository guardrails rather than redefining semantic rules.

---

### 20. Required Repo Artifacts

The following artifacts MUST exist in this repository and are subject to constitutional review. Each is normative for the rule that names it; loss, drift, or unilateral renaming violates the corresponding rule.

| Artifact | Rule | Purpose |
|---|---|---|
| `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` | §7 Dispatcher Execution Wrapper Rule | The canonical dynamic dispatcher. Generated; MUST be a thin HTTP shell delegating to `runManifestCommand`. |
| `apps/api/lib/manifest/execute-command.ts` (`runManifestCommand`) | §7 Dispatcher Execution Wrapper Rule | The canonical transport execution wrapper. Single owner of command resolution, runtime creation, `runtime.runCommand` invocation, result/error/event normalization for HTTP transport. |
| **Dispatcher projection contract** | §7 Dispatcher Execution Wrapper Rule, §8 Generator Source Rule | Documented contract describing the exact shape the `nextjs.dispatcher` projection MUST emit: thin shell, delegation to `runManifestCommand`, no inlined `RuntimeEngine.runCommand`, no duplicated resolution/normalization/error-mapping logic. The contract is what dispatcher-architecture tests assert against and what the upstream projection generator must satisfy. Any divergence is projection drift. |
| `manifest/governance/commands.json`, `manifest/governance/entities.json` | §2 Write Path Governance, §10 Registry Source Rule, §19 Enforcement Surfaces | The canonical Manifest registries. Repo-wide CI governance gates audit against these. |
| `manifest/governance/bypasses.json` | §2 Write Path Governance, §10 Registry Source Rule | The approved-bypass registry. Each entry MUST include a real `whyRuntimeNotRequired` per the operational rules in `docs/manifest/governance.md`. |
| `manifest/governance/baselines/*.json` | §11 Baseline-and-Block-New Rule | Per-gate baselines of pre-existing constitution-level debt. Required for any gate that ships baselined rather than from-zero. Stable-key encoding; line numbers MUST NOT be the sole key. |
| `scripts/manifest/audit-direct-writes.mjs` + `scripts/manifest/audit-direct-writes-baseline.mjs` | §12 Local Detector Rule, §11 Baseline-and-Block-New Rule | Capsule-local direct-write detector that closes the upstream `direct-writes` identifier and glob blind spots, plus its baseline wrapper for the block-on-new gate. |
| `scripts/security/audit-baseline.mjs` | §11 Baseline-and-Block-New Rule | Security advisory baseline wrapper. Diffs current `pnpm audit` output against `manifest/governance/baselines/pnpm-audit.json` and fails on new advisories only. |
| `scripts/manifest/emit-registries.mjs` | §10 Registry Source Rule | Canonical producer that emits governance registries to `manifest/governance/`. Single producer; no parallel registry locations. |
| `docs/manifest/governance.md` | §11, §12, §17, and operational rules | The operational rules covering routing aliases, bypass entry quality, direct-write detector blind spots, conformance evidence tiers, compliance classification, and product-impact reporting. This constitution names artifacts and binding rules; the governance doc defines how each is exercised. |

The full operational rules covering routing aliases, bypass entry quality, direct-write detector blind spots, and compliance classification live in [`docs/manifest/governance.md`](../governance.md). This list names artifacts; that doc defines how each is exercised.

---

### In plain terms

Manifest defines what the domain means and how commands work. Capsule-Pro is required to use it.

All governed domain changes must go through the runtime. Reads can be flexible, but they do not define truth. The UI can orchestrate and display, but it cannot invent rules. Events must originate from the runtime and respect transaction boundaries. Tests must honor deterministic guarantees. If semantics change, the specification changes first.

The dispatcher is a thin shell that delegates to a single shared wrapper; the wrapper alone calls `RuntimeEngine.runCommand`. Generated files are produced by generators; if a generated file is wrong, fix the generator. The constitution and the projection contract outrank current call sites — especially current call sites in generated or deprecated code. Governance audits read from `manifest/governance/`, not from runtime sidecars. Existing debt may be baselined; new debt must block. Capsule maintains local detectors for what upstream cannot see. Package bumps are coordinated drift checks, not silent absorptions. Composite endpoints orchestrate commands; they do not bypass them. Before adding a new command or route, look for the existing one first. Tests run against real auth and real generated output. Concrete routes are debt, not architecture.

Capsule-Pro integrates with Manifest. It does not override it.
