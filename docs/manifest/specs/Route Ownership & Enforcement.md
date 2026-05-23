---
type: spec
status: active
description: ""
---

Routes in Capsule-Pro are classified by their mutation responsibility: read routes, write routes, and composite routes.

A read route retrieves data and does not mutate governed entities. It may query storage directly. Manifest policies with action `read` are not enforced by default by the runtime , so read routes must enforce any required authorization at the application layer.

ExecuteManifestCommand Is Canonically Treated as Runtime Execution — The audit tool now recognizes helper-based runtime calls, removing a major class of false positives and stabilizing signal quality.  

A write route executes exactly one Manifest command. It MUST invoke `RuntimeEngine.runCommand`. It MUST NOT directly mutate a governed entity. The IR root `commands` array is the authoritative definition of available mutations . If a route changes the state of an entity defined in IR without invoking its command, the route is not owned by Manifest and is nonconforming.


A composite route executes multiple Manifest commands inside a single transaction. It is a write route with orchestration. It composes existing semantics; it does not redefine them.

“Owned by Manifest” means that every state transition of a governed entity is produced by a command defined in IR and executed through the runtime in the prescribed order . The route does not replicate guards. It does not re-check constraints manually. It does not apply “cleanup” writes. All domain mutation logic lives in `.manifest` definitions and is enforced at runtime.

Forbidden example:

```ts
// ❌ Looks reasonable. Violates ownership.

const result = await runtime.runCommand(
  "completePrepTask",
  { taskId },
  { entityName: "PrepTask", instanceId: taskId }
);

if (result.success) {
  await database.prepTask.update({
    where: { id: taskId },
    data: { status: "archived" }
  });
}
```

The command succeeded. Then the route directly changed the entity. That second write is invisible to IR-defined transitions, constraints, concurrency controls, and emitted events . The route has split authority. Governance is broken.

Enforcement is straightforward. For every mutation of a governed entity, reviewers must be able to point to the specific Manifest command responsible. If they cannot, the route is noncompliant.

In plain terms: read routes can read however you want. Write routes must go through Manifest. Composite routes just bundle official commands together. If you see a raw database write touching a governed table, that route is cheating.
