# Projection Conformance Governance

Status: Binding reference for Capsule-Pro Manifest governance  
Applies to: Manifest projections, Next.js dispatcher output, generated route/client/type surfaces, MCP/Agent SDK descriptors, and read-model projections

## Rule

A projection is deterministic, dispatcher-aligned, and non-authoritative — or it is not conforming.

Projections translate IR/runtime facts into transport or developer surfaces. They do not define new domain semantics.

## Minimum proof

Every projection that can influence governed command execution must provide evidence for these claims:

### 1. Deterministic

Same input, same config, same package version, same output.

Minimum proof:

- input IR path and hash;
- projection package/version;
- generation command;
- checked-in output or snapshot;
- repeat run produces no unexpected diff;
- no wall-clock, random, environment, machine path, or ordering noise in output.

### 2. Dispatcher-aligned

Command projections must delegate governed writes to the canonical runtime path.

Minimum proof:

- generated dispatcher or route shell delegates to `runManifestCommand` or another constitution-approved wrapper;
- no generated concrete command route duplicates command resolution, runtime creation, `RuntimeEngine.runCommand`, policy mapping, guard mapping, event mapping, or success/error normalization;
- command/entity names resolve against the generated runtime registry;
- generated aliases, if any, are thin compatibility shells and not semantic owners.

### 3. Non-authoritative

Projection output is evidence of what was generated, not evidence of what is semantically true.

Minimum proof:

- docs and comments state that IR/runtime are authoritative;
- disagreement policy points back to fixing producer/projection and regenerating;
- generated read models, clients, MCP descriptors, and Agent SDK schemas do not introduce new commands, transitions, policies, events, or invariants;
- stale projection output is classified as drift, not accepted as behavior.

## Projection drift

Projection drift exists when generated output differs from the constitution, compiled IR, runtime command registry, or runtime behavior.

Required response:

1. Identify the generated file and producer.
2. Identify the authoritative IR/runtime fact it violates.
3. Fix projection/generator/wrapper or record `PROJECTION DRIFT` with a removal plan.
4. Regenerate and show diff.
5. Run grep/audit checks proving no concrete command routes or retired package paths were introduced.

## Migration boundary

Convex schema changes (via Manifest projection) are persistence changes, not Manifest semantic changes.

A projection must not use migration shape as proof that a governed command exists. A migration can add columns/tables needed by runtime adapters, but command meaning still comes from Manifest source, compiled IR, runtime adapters, and conformance evidence.

## Review checklist

Before accepting a projection-affecting change, verify:

- generation command is documented;
- output is deterministic;
- command writes route through the dispatcher/wrapper;
- read projections remain read-only;
- generated files were not hand-edited as the only fix;
- no retired Manifest workspace paths were reintroduced;
- no new concrete command routes were created;
- AI/MCP/SDK descriptors match compiled IR/runtime and do not become command authority.
