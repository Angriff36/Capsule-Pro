---
type: spec
status: stub
description: ""
---


The Command Board is a projection-layer workspace that renders IR-defined entities and exposes IR-defined commands as executable interactions. It is not a domain model, not a mutation engine, and not a policy authority. It is a consumer of the IR program and a caller of the runtime.

The board operates over the compiled IR structure whose shape is defined by the IR schema . Commands available to a board node are those referenced by `IREntity.commands` and defined in the root `commands` array. The board does not infer commands from UI state, transitions, or naming conventions. If a command is not present in IR, it does not exist to the board.

The boundary with runtime is absolute. All mutation behavior, including policy evaluation, command constraints, guard execution, action execution, transition validation, concurrency checks, and event emission, is defined by IR v1 semantics . The board must treat `runCommand` as the only semantic entry point for governed mutations. It may pass parameters and runtime context. It may not reproduce, reorder, or pre-evaluate semantic phases.

The boundary with routes is transport only. A board may call a generated route or use an embedded runtime instance, but the semantic boundary remains identical. Routes must delegate to runtime execution as described in the usage patterns . If a route bypasses runtime for a governed entity, the board is invoking an invalid mutation path.

The boundary with projections is tooling. Projection adapters generate scaffolding, not meaning . If a projection generates board helpers, those helpers must call runtime execution without redefining behavior. Any divergence between projection output and IR semantics is a projection defect.

The board reflects IR-defined events without becoming an event authority. When a command emits events, the runtime logs them according to semantic rules, including ordered emission and metadata attachment . The board may display emitted events or subscribe to them, but it must not fabricate equivalent events, alter emission order, or emit compensating events for UX reasons. Event existence and structure are defined by IR.

Correct example:

An entity `EventTask` declares a `start` command in IR. The board renders a card for an `EventTask` instance and exposes a Start action. When invoked, the board delegates to the runtime.

```ts
import { RuntimeEngine } from '@angriff36/manifest';

const runtime = new RuntimeEngine(ir, {
  user: { id: user.id, role: user.role },
  context: { requestId }
});

const result = await runtime.runCommand(
  'start',
  {},
  { entityName: 'EventTask', instanceId: taskId }
);

if (!result.success) {
  return { error: result.error };
}

return {
  emitted: result.emittedEvents
};
```

In this flow, the board does not inspect transition rules, evaluate guards, or validate concurrency fields. If the IR defines state transitions or optimistic concurrency, those checks occur inside runtime execution . The board observes the outcome but does not define it.

Incorrect example:

The board encodes domain logic directly and mutates storage without invoking a command.

```ts
if (task.status === 'planned') {
  await db.eventTask.update({
    where: { id: taskId },
    data: { status: 'in_progress' }
  });
}
```

This implementation duplicates transition logic, bypasses policy and guard evaluation, skips command constraints, and emits no IR-defined events. It creates a second mutation authority outside the runtime. For governed entities, this is a violation of the usage constraints requiring runtime execution for semantic enforcement .

The Command Board is therefore a deterministic reflection of IR plus runtime context. Its responsibility is to render entities, expose declared commands, collect parameters, invoke runtime execution, and display results. It must never infer additional allowed transitions, synthesize business rules, or suppress runtime failures. If runtime denies execution, the denial is authoritative.

In plain terms:  
The Command Board shows what the IR already defines. When a user clicks a command, the board calls the runtime. The runtime decides what is allowed and what happens. The board never decides business rules itself.

Confidence: 97% — Directly grounded in IR schema, IR v1 semantics, and documented projection and runtime integration constraints.