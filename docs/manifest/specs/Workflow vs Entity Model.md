---
type: spec
status: active
description: ""
---
The entity model in Capsule-Pro is the governed definition of state and behavior as compiled into IR. An entity is represented in IR as a structured definition containing properties, computed properties, relationships, constraints, policies, and references to commands. The IR schema defines entities and commands as first-class elements of the program, and commands are the only mutation entry points for governed state .

Entity behavior is expressed exclusively through IRCommand definitions bound to that entity. Each command specifies parameters, guards, optional constraints, actions, and emitted events. Runtime execution order is fixed and normative. A conforming runtime MUST build evaluation context, evaluate applicable policies, evaluate command-level constraints, evaluate guards in order, execute actions in order, emit declared events in order, and then return a CommandResult . No workflow code may alter this sequence.

Workflows are not represented in IR. A workflow is an application-level orchestration pattern that invokes multiple commands in sequence or coordination. A workflow does not define new transitions. It composes existing commands. A workflow may span multiple entities. It may coordinate transaction scope at the application layer. It may react to emitted events. It does not modify IR, does not redefine guard semantics, and does not bypass policy or constraint enforcement.

The boundary between entity transitions and workflow steps is strict. An entity transition is a property mutation validated by IR-defined transition rules and constraints. Transition validation occurs during command execution before entity constraints are evaluated . A workflow step is a separate invocation of a command. If a workflow invokes two commands, those are two distinct governed transitions, each independently validated against IR semantics.

A correct workflow orchestration invokes multiple commands without embedding cross-step logic inside any single command.

```ts
import { RuntimeEngine } from '@angriff36/manifest';

async function finalizeOrder(runtime: RuntimeEngine, orderId: string) {
  const approve = await runtime.runCommand(
    'approve',
    {},
    { entityName: 'Order', instanceId: orderId }
  );

  if (!approve.success) {
    return approve;
  }

  const issueInvoice = await runtime.runCommand(
    'issueInvoice',
    {},
    { entityName: 'Order', instanceId: orderId }
  );

  if (!issueInvoice.success) {
    return issueInvoice;
  }

  return { success: true };
}
```

In this example, each call to runCommand follows the required runtime phases defined by IR semantics . Policies are evaluated per command. Guards are evaluated per command. Transition rules and constraints are enforced per command. Events declared by each command are emitted only after successful action execution. The workflow does not merge or simulate these phases. It sequences them.

An incorrect design embeds workflow logic inside a single entity command by collapsing multiple domain steps into one monolithic command.

```manifest
entity Order {
  command finalize {
    guard: self.status == "draft"

    action mutate self.status = "approved"

    action effect sendInvoice(self.id)

    action mutate self.status = "invoiced"

    emit OrderFinalized
  }
}
```

This design conflates distinct transitions into a single command. The transition from "draft" to "approved" and the transition from "approved" to "invoiced" are treated as one atomic step. Guard evaluation and policy enforcement occur only once at the start. Failure during a later action does not reflect a clear workflow boundary. The entity command now encodes orchestration intent rather than a single governed transition. This prevents independent reuse of intermediate transitions and obscures IR-defined state progression.

Entity commands must represent single governed transitions that are valid under IR-defined constraints and transition rules. Workflows must coordinate multiple such transitions by invoking commands explicitly. All enforcement of invariants, policies, guards, transition rules, and event emission ordering is anchored in IR and runtime semantics . Workflow code may decide when to call commands and how to react to results, but it may not redefine what a command means.

In plain terms:  
An entity defines the rules for changing a specific piece of state. A command is one allowed change that follows strict runtime rules. A workflow is just application code that calls several commands in order. Commands enforce the rules. Workflows decide the sequence. Mixing the two makes the rules harder to enforce and reason about.

Confidence: 98% — Directly grounded in the IR schema and runtime semantics specifications cited above.