---
type: spec
status: active
description: ""
---


---

A semantic event is a runtime-emitted record defined in the IR and produced only as a consequence of successful command execution. Events are declared in the IR root `events` array as `IREvent` objects with a `name`, `channel`, and `payload` shape. Commands reference events by name in their `emits` array, and those references must resolve to declared IR events. The runtime does not infer or synthesize events. It emits only those explicitly declared and only during the emission phase defined by command execution semantics.

Event emission occurs strictly after governance and mutation. A conforming runtime evaluates policies, then command-level constraints, then guards, then executes actions, and only after successful action execution emits declared events. If execution stops at any earlier phase, no semantic events are emitted. An emitted event therefore proves that all required governance checks passed and that the command’s actions completed.

Emission is transaction-bound. Within a single `runCommand` invocation, mutations and emits form one semantic unit. If the underlying store supports transactions, mutation and event persistence align with the same boundary. If the command fails or the transaction rolls back, semantic events must not be observable. Bypassing `runCommand` for governed mutations breaks this alignment and exits Manifest governance.

Emit ordering is deterministic. Events are emitted in the order declared in the command’s `emits` array. Each emitted event includes an `emitIndex`, a zero-based counter scoped to that specific command execution. The counter resets at the start of each invocation. Given identical IR, identical runtime context including injected `now` and `generateId`, identical inputs, and identical command options, emitted events must have identical ordering and identical `emitIndex` values. `emitIndex` is not a global sequence and carries no cross-command ordering meaning.

If `correlationId` or `causationId` are supplied in command options, the runtime propagates those values to every emitted event. The runtime does not generate them; it treats them as opaque workflow metadata provided by the caller.

When an `IdempotencyStore` is configured, idempotency is enforced before any command evaluation. If a provided `idempotencyKey` has already been seen, the runtime returns the previously cached `CommandResult` without re-evaluating policies, constraints, guards, actions, or emits. Both successful and failed results are cached. As a result, semantic events for a given idempotency key are emitted at most once. If no idempotency store is configured, no such guarantee exists.

Semantic events guarantee that:

- The command completed all required governance phases.
    
- All actions executed before emission.
    
- The emitted event name and payload conform to the IR definition.
    
- Per-command ordering is deterministic.
    

They do not guarantee external delivery, durable storage outside the configured runtime store, global ordering across commands, or exactly-once processing by downstream consumers. Those responsibilities belong to the integration layer.

Correct example:

```manifest
event TaskOpened on "tasks.opened" {
  id: string required
  status: string required
}

entity Task {
  command open() {
    guard: self.status == "draft"
    mutate self.status = "open"
    emit TaskOpened
  }
}
```

```ts
const result = await runtime.runCommand(
  "open",
  {},
  { entityName: "Task", instanceId: "task-1" },
  {
    correlationId: "workflow-77",
    causationId: "event-12",
    idempotencyKey: "open-task-1"
  }
);
```

If policies pass, the guard evaluates truthy, and the mutation succeeds, a single `TaskOpened` event is emitted after actions complete. It includes `emitIndex: 0`, propagated workflow metadata, and a payload matching the IR definition. Reusing the same `idempotencyKey` returns the cached result and does not emit a second event.

Incorrect example:

```ts
await prisma.task.update({
  where: { id: "task-1" },
  data: { status: "open" }
});

eventBus.publish({
  name: "TaskOpened",
  payload: { id: "task-1", status: "open" }
});
```

This bypasses `runCommand`. No policies, constraints, or guards are evaluated. The emitted message is not governed by IR `emits`, has no `emitIndex`, and is not protected by runtime idempotency. It is an application-level side effect, not a semantic event.

For governed entities, emitting a semantic event is a contractual declaration that the state change is valid, committed, and safe for other components to rely on. Writing directly to governed storage skips that declaration and breaks the contract. For non-governed or infrastructure records, no such contract exists, and bypass is acceptable.

In plain terms:  
A semantic event is the system’s official record that a governed command succeeded. It exists only after all rules passed and the mutation completed. It is emitted in a fixed, deterministic order, tagged for tracing, and protected from duplicate execution when idempotency is enabled. If you mutate state and publish your own event without `runCommand`, you are outside the guarantees of the system.
