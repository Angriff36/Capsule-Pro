

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

### 7. Change Protocol

Any behavior change affecting governed semantics must follow this order: Manifest specification update, conformance and test updates, then Capsule-Pro implementation changes.

Capsule-Pro must not implement semantic behavior that diverges from current Manifest specification. If divergence temporarily exists, it must be explicitly documented as nonconformance until resolved.

Specification changes precede implementation changes for governed behavior.

---

### 8. Enforcement Surfaces

Capsule-Pro must maintain enforcement mechanisms that prevent runtime bypass and detect nonconforming mutations.

These include route audits identifying direct writes in command routes, CI test gates validating conformance and protected invariants, and linting or static analysis rules detecting hardcoded mutation paths for governed entities.

Enforcement surfaces must align with and reinforce repository guardrails rather than redefining semantic rules.

---

### In plain terms

Manifest defines what the domain means and how commands work. Capsule-Pro is required to use it.

All governed domain changes must go through the runtime. Reads can be flexible, but they do not define truth. The UI can orchestrate and display, but it cannot invent rules. Events must originate from the runtime and respect transaction boundaries. Tests must honor deterministic guarantees. If semantics change, the specification changes first.

Capsule-Pro integrates with Manifest. It does not override it.

