

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

Direct writes are permitted only for records explicitly classified as “Manifest bypass allowed.” Such records must be infrastructure-level and not semantically governed domain state. Each bypass must include written justification explaining why runtime governance is not required and why the bypass does not violate semantic guarantees.

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

### 8. Change Protocol

Any behavior change affecting governed semantics must follow this order: Manifest specification update, conformance and test updates, then Capsule-Pro implementation changes.

Capsule-Pro must not implement semantic behavior that diverges from current Manifest specification. If divergence temporarily exists, it must be explicitly documented as nonconformance until resolved.

Specification changes precede implementation changes for governed behavior.

---

### 9. Enforcement Surfaces

Capsule-Pro must maintain enforcement mechanisms that prevent runtime bypass and detect nonconforming mutations.

These include route audits identifying direct writes in command routes, CI test gates validating conformance and protected invariants, and linting or static analysis rules detecting hardcoded mutation paths for governed entities.

Enforcement surfaces must align with and reinforce repository guardrails rather than redefining semantic rules.

---

### 10. Required Repo Artifacts

The following artifacts MUST exist in this repository and are subject to constitutional review. Each is normative for the rule that names it; loss, drift, or unilateral renaming violates the corresponding rule.

| Artifact | Rule | Purpose |
|---|---|---|
| `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts` | §7 Dispatcher Execution Wrapper Rule | The canonical dynamic dispatcher. Generated; must be a thin HTTP shell delegating to `runManifestCommand`. |
| `apps/api/lib/manifest/execute-command.ts` (`runManifestCommand`) | §7 Dispatcher Execution Wrapper Rule | The canonical transport execution wrapper. Single owner of command resolution, runtime creation, runtime.runCommand invocation, result/error/event normalization for HTTP transport. |
| **Dispatcher projection contract** | §7 Dispatcher Execution Wrapper Rule | A documented contract (in `docs/manifest/` or upstream Manifest projection docs) describing the exact shape the `nextjs.dispatcher` projection MUST emit: thin shell, delegation to `runManifestCommand`, no inlined `RuntimeEngine.runCommand`, no duplicated resolution/normalization/error-mapping logic. The contract is what dispatcher-architecture tests assert against; it is also what the upstream projection generator must satisfy. Any divergence between emitted dispatcher output and this contract is projection drift. |
| `manifest/governance/commands.json`, `manifest/governance/entities.json` | §2 Write Path Governance, §9 Enforcement Surfaces | The canonical Manifest registries. CI governance gates audit against these. |
| `manifest/governance/bypasses.json` | §2 Write Path Governance | The approved-bypass registry. Each entry must include a real `whyRuntimeNotRequired` per the operational rules in `docs/manifest/governance.md`. |

The full operational rules covering routing aliases, bypass entry quality, direct-write detector blind spots, and compliance classification live in [`docs/manifest/governance.md`](../governance.md). This list names artifacts; that doc defines how each is exercised.

---

### In plain terms

Manifest defines what the domain means and how commands work. Capsule-Pro is required to use it.

All governed domain changes must go through the runtime. Reads can be flexible, but they do not define truth. The UI can orchestrate and display, but it cannot invent rules. Events must originate from the runtime and respect transaction boundaries. Tests must honor deterministic guarantees. If semantics change, the specification changes first.

Capsule-Pro integrates with Manifest. It does not override it.
