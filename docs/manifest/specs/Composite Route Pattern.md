---
type: spec
status: active
description: ""
---

Composite routes are application-level routes that orchestrate multiple Manifest commands inside a single database transaction. They exist because real workflows frequently require multiple domain mutations to succeed or fail together, while still honoring Manifest-defined policies, constraints, guards, transitions, concurrency controls, and emitted events.

A composite route does not define new semantics. It composes existing command semantics. Each individual command MUST be executed through `RuntimeEngine.runCommand`, preserving the evaluation order defined by IR semantics: policy evaluation, constraint evaluation, guard evaluation, action execution, event emission, and result return . The route may define the transaction boundary, but it MUST NOT bypass the runtime for any governed mutation.

All commands in a composite route execute within a single database transaction. If any command fails for any reason, including policy denial, constraint failure, guard failure, or concurrency conflict, the transaction MUST roll back. No partial state is permitted.

Event semantics are coupled to this boundary. Commands declare emitted events in IR. The runtime logs emitted events during execution, but semantic events MUST NOT be externally observed or published unless the surrounding transaction commits. If the transaction rolls back, the logical effect is that no command occurred and no semantic event exists. Composite routes therefore bind event visibility to commit.

Correct example:

```ts
// app/api/events/[id]/close-and-archive/route.ts

import { RuntimeEngine } from "@angriff36/manifest";
import { database } from "@repo/database";

export async function POST(req: Request, { params }) {
  const { id } = params;

  return database.$transaction(async (tx) => {
    const runtime = createRuntimeWithTransaction(tx);

    const closeResult = await runtime.runCommand(
      "closeEvent",
      { eventId: id },
      { entityName: "Event", instanceId: id }
    );

    if (!closeResult.success) {
      throw new Error("closeEvent failed");
    }

    const archiveResult = await runtime.runCommand(
      "archiveEvent",
      { eventId: id },
      { entityName: "Event", instanceId: id }
    );

    if (!archiveResult.success) {
      throw new Error("archiveEvent failed");
    }

    return { ok: true };
  });
}
```

Both mutations occur via `runCommand`. All Manifest semantics apply. If either command fails, the transaction rolls back and no emitted events survive the boundary.

Incorrect example:

```ts
// ❌ Incorrect composite route

await database.$transaction(async (tx) => {
  await runtime.runCommand(
    "closeEvent",
    { eventId: id },
    { entityName: "Event", instanceId: id }
  );

  await tx.event.update({
    where: { id },
    data: { status: "archived" }
  });
});
```

The second mutation bypasses Manifest. It ignores transitions, constraints, concurrency controls, and declared emits defined in IR . The transaction is intact, but governance is already broken. This violates the requirement that mutating operations relying on Manifest semantics execute through the runtime .

Composite routes are orchestration. They are not a permission slip to step outside the model.

In plain terms: if you need two or three official Manifest commands to succeed together, wrap them in one transaction and call them properly. If anything fails, nothing sticks. No silent side writes.

---

invariants/Mutation & Transaction Invariants.md

All mutations of entities defined in IR MUST execute through `RuntimeEngine.runCommand` and MUST NOT directly mutate storage .

A composite route MUST execute all contained Manifest commands inside a single database transaction that commits only if all commands succeed.

If any Manifest command in a composite route fails due to policy, constraint, guard, or concurrency conflict, the entire transaction MUST roll back .

Semantic events declared in IR MUST NOT be externally published or persisted outside the transaction boundary prior to commit .

Manifest bypass is permitted only for infrastructure-level records not represented in IR .

See: specs/Composite Route Pattern.md and specs/Route Ownership & Enforcement.md.

In plain terms: if it’s governed, use Manifest. If one part fails, everything rewinds. Events are real only after commit.

---

specs/Route Ownership & Enforcement.md

Routes in Capsule-Pro are classified by their mutation responsibility: read routes, write routes, and composite routes.

A read route retrieves data and does not mutate governed entities. It may query storage directly. Manifest policies with action `read` are not enforced by default by the runtime , so read routes must enforce any required authorization at the application layer.

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

