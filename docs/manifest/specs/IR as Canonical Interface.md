---
type: spec
status: active
description: ""
---
IR is the sole semantic authority for domain behavior in Capsule-Pro. The compiled IR defines the complete, executable contract for entities, commands, policies, constraints, transitions, actions, and declared events. Any behavior that affects domain correctness must be represented in IR. No other layer may introduce, modify, or override domain semantics.

The IR schema defines the only valid structural representation of domain behavior. The root object requires `entities`, `commands`, `events`, `policies`, and related sections, and forbids undeclared structural extensions . This ensures that the semantic surface of the system is closed and enumerable. If a rule does not appear in IR, it is not part of the domain contract.

Runtime meaning is defined exclusively by IR semantics. A conforming runtime evaluates commands in a fixed order: policy evaluation, command-level constraints, guards, actions, then declared event emission . This order is not advisory. It is binding. No route, projection, or generated adapter may reorder these phases, short-circuit them differently, or partially execute them.

IR is immutable at runtime. Variability enters only through runtime context and input parameters, never by mutating IR objects or synthesizing new behavior dynamically . This guarantees that identical IR plus identical runtime context and input produce identical results. Determinism is a property of IR interpretation, not of route implementation.

Routes, projections, UI layers, and tooling are derived artifacts. Projections generate framework-specific code from IR and are explicitly not semantic authorities . Usage guidance requires that mutating operations execute through `RuntimeEngine.runCommand` so that IR-defined policies, constraints, guards, actions, and emits execute in spec order . Any layer that performs domain mutation without invoking runtime command execution is bypassing IR and is therefore outside the governed system.

The following decisions are forbidden outside IR.

Authorization rules that determine whether a command may execute must not be implemented in controllers or UI conditionals as substitutes for IR policies. State transition rules must not be hardcoded in route handlers if transitions are defined in IR. Guard logic must not be duplicated in client or server code as an alternative enforcement path. Event emission semantics must not be recreated manually in transport code. Action ordering must not be altered in generated templates. No layer may introduce fallback logic that makes a failing command succeed by bypassing policies, constraints, or guards.

A correct route delegates semantic authority entirely to the runtime.

```ts
// app/api/inventory/consume/route.ts

import { RuntimeEngine } from "@angriff36/manifest";
import { ir } from "@/manifest/compiled-ir";

export async function POST(req: Request) {
  const body = await req.json();

  const runtime = new RuntimeEngine(ir, {
    user: body.user,
    context: { requestId: body.requestId }
  });

  const result = await runtime.runCommand(
    "consume",
    { quantity: body.quantity },
    { entityName: "InventoryItem", instanceId: body.id }
  );

  if (!result.success) {
    return new Response(JSON.stringify(result), { status: 422 });
  }

  return new Response(JSON.stringify(result), { status: 200 });
}
```

In this example, the route performs no authorization checks, no guard evaluation, no transition validation, and no direct persistence. All domain semantics are interpreted by the runtime from IR. The route is transport only. If IR changes, behavior changes without modifying this route.

The following example duplicates semantic authority in code and is prohibited.

```ts
// PROHIBITED: duplicating IR semantics

export async function POST(req: Request) {
  const body = await req.json();

  // Authorization duplicated outside IR
  if (!["manager", "admin"].includes(body.user.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const item = await db.inventoryItem.findUnique({ where: { id: body.id } });

  // Transition rule duplicated outside IR
  if (item.status !== "available") {
    return new Response("Invalid state", { status: 422 });
  }

  await db.inventoryItem.update({
    where: { id: body.id },
    data: { quantity: item.quantity - body.quantity }
  });

  return new Response("ok");
}
```

This route redefines authorization and transition rules outside IR. Even if those rules currently mirror IR definitions, they are now maintained separately. They are not evaluated in the mandated runtime order. They are not covered by IR determinism guarantees. They may drift. This creates two semantic sources of truth. That is a violation of governance.

IR semantics and runtime guarantees together define the canonical interface. Command execution order is fixed and must not be reinterpreted . IR structure is schema-bound and closed to arbitrary extension . IR must not be mutated at runtime . Projections are tooling, not business logic . All mutation flows must execute through the runtime .

IR is therefore the canonical interface between domain intent and execution. All other layers are adapters around it.

In plain terms:  
The IR is the only place where real business rules live. Routes and UI just pass inputs to the runtime. If business logic shows up anywhere else, it is breaking the system’s contract.

