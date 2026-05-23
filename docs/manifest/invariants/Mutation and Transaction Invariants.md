---
type: invariant
status: active
description: ""
---

 [[Event Semantics|Semantic events]] must reflect committed state; do not emit domain events outside the [[Transaction boundary]].

All mutations of entities defined in IR MUST execute through `RuntimeEngine.runCommand` and MUST NOT directly mutate storage .

A composite route MUST execute all contained Manifest commands inside a single database transaction that commits only if all commands succeed.

If any Manifest command in a composite route fails due to policy, constraint, guard, or concurrency conflict, the entire transaction MUST roll back .

Semantic events declared in IR MUST NOT be externally published or persisted outside the transaction boundary prior to commit .

Manifest bypass is permitted only for infrastructure-level records not represented in IR .

See: specs/Composite Route Pattern.md and specs/Route Ownership & Enforcement.md.

In plain terms: if it’s governed, use Manifest. If one part fails, everything rewinds. Events are real only after commit.


