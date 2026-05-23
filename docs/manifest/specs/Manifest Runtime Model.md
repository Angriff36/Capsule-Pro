---
type: spec
status: active
description: ""
---

The Manifest runtime is the interpreter of IR. It accepts an IR document that conforms to the IR v1 schema and executes commands strictly according to the runtime semantics defined for IR v1 . It does not interpret `.manifest` source files directly and does not derive meaning from projections or generated code. The IR is the only executable authority.

A runtime instance consists of the IR program, configured stores, runtime context, and an in-memory event log . The IR MUST be treated as immutable during execution. Any behavioral variation must enter through runtime context or runtime options, never through mutation of IR structures. This immutability requirement is reinforced by repository guardrails that prohibit runtime modification of IR .

Command execution begins by constructing the evaluation context. The runtime MUST bind `self` and `this` to the current entity instance or `null` when no instance is bound. Input parameters are bound by name. The runtime MAY expose a `user` object and a `context` object supplied at construction time . Expressions are evaluated only against these bindings and the spec-defined builtins. If a guard or policy references `user` and no user is provided, execution MUST fail. The runtime MUST NOT inject default values to force success .

After building the evaluation context, the runtime MUST evaluate applicable policies for the command. Policies with action `execute` or `all` are enforced during command execution . If any applicable policy evaluates to false, execution halts immediately with denial. No constraints, guards, actions, or events are processed after a policy failure. Entity `defaultPolicies`, if present, are expanded into the command’s effective policy list at compile time; the runtime evaluates only what appears in `IRCommand.policies` .

Command-level constraints are evaluated next. Each constraint produces a `ConstraintOutcome` as defined by the IR schema and interpreted by the runtime semantics . Severity governs behavior. A `block` constraint that fails without an authorized override MUST stop execution. A `warn` constraint records its outcome but does not stop execution. An `ok` constraint is informational. Overrides are permitted only when the constraint is marked `overrideable` and any referenced override policy passes; otherwise, override attempts MUST be rejected .

If the entity defines state transitions, the runtime MUST validate mutations against `IRTransition` rules before entity constraint validation . If a property change violates an allowed transition from the current value, the command fails. The runtime does not attempt to coerce state or infer alternative transitions.

Guards are evaluated after policies and command-level constraints. Guards are evaluated strictly in declaration order and execution halts on the first falsey result . The runtime MUST NOT reorder guards, merge them, or attempt fallback logic. If a guard fails, no actions are executed.

If all policies, constraints, transitions, and guards succeed, the runtime executes actions in the order declared in IR . `mutate` actions evaluate an expression and assign the result to the specified target field when an instance is bound. Adapter actions such as `persist`, `publish`, and `effect` follow adapter contracts defined in the specification . By default, these actions evaluate their expression and return the value without performing external side effects. When deterministic mode is enabled, the runtime MUST throw a `ManifestEffectBoundaryError` for these adapter actions instead of applying default no-op behavior . This enforces the effect boundary and prevents non-deterministic behavior during conformance or test execution.

After actions complete, the runtime emits declared events in order and attaches required metadata such as timestamp and per-command `emitIndex`, using injected deterministic sources where provided . Event emission is part of the command result. The runtime guarantees that events are produced only after successful command execution and in the IR-defined order. Alignment with database transaction commit is the responsibility of the hosting application; the runtime does not manage database transactions directly.

Deterministic behavior is mandatory for reproducibility. The runtime MUST use injected `now` and `generateId` functions when provided and MUST NOT call ambient time or random APIs directly . Given identical IR, identical runtime context, identical injected sources, identical input, and identical command options, the runtime MUST produce identical results and emitted events.

The runtime boundary is strict. Storage interaction occurs through configured stores defined in IR and runtime options . The runtime is store-agnostic and interacts only through the store interface; it does not embed database-specific logic . Routes are integration surfaces. Any write route that intends to enforce Manifest semantics MUST execute commands via `runCommand`. Direct database writes bypass policy checks, constraint evaluation, transition validation, guard order, action semantics, and event emission, and therefore fall outside the governed boundary . Projections generate framework-specific artifacts from IR but do not redefine runtime meaning; they must preserve execution order and semantic guarantees .

Correct usage example:

```ts
import { RuntimeEngine } from '@angriff36/manifest';
import { ir } from './compiled-ir';

const runtime = new RuntimeEngine(ir, {
  user: { id: 'u-1', role: 'manager' },
  context: { requestId: 'req-42' },
  now: () => 1700000000000,
  generateId: () => 'fixed-id'
});

const result = await runtime.runCommand(
  'approve',
  { reason: 'validated' },
  { entityName: 'Invoice', instanceId: 'inv-1' }
);

if (!result.success) {
  throw new Error('Command failed');
}

for (const event of result.events) {
  await outbox.insert(event);
}
```

This code delegates all mutation logic to the runtime. Policies, constraints, transitions, guards, actions, and event emission are executed in the mandated order. Events are handled only after successful execution and can be coordinated with external transaction commit.

Incorrect example that bypasses governance:

```ts
// Direct mutation inside a route
await prisma.invoice.update({
  where: { id: 'inv-1' },
  data: { status: 'approved' }
});

// Manual event publication
await eventBus.publish({
  name: 'InvoiceApproved',
  payload: { id: 'inv-1' }
});
```

This code bypasses IR-defined policies, constraints, transitions, and guards. It emits events without runtime ordering guarantees. It therefore violates the Manifest runtime model and falls outside the governed mutation path.

All behavior described here is defined by and anchored to the IR schema and IR semantics specification . The runtime is a deterministic interpreter of IR and must not introduce implicit behavior, fallback logic, or convenience shortcuts.

In plain terms:  
The runtime is the engine that enforces your Manifest rules. It builds a strict context, checks policies and constraints first, runs guards in order, performs actions, then emits events. If you do not call it, you are not enforcing the rules. If you give it the same IR and the same inputs, it must behave the same way every time.

