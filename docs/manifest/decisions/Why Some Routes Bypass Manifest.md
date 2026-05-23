---
type: decision
status: active
description: ""
---

### Why Some Routes Bypass Manifest

Some routes bypass Manifest, but not because they are “too complex” or special cases. They bypass it because they are doing orchestration work that sits above the level Manifest is designed to operate at. These are referred to as [[Composite Route Pattern|Composite routes]]

A compostie route is a route-level orchestration boundary. It opens a database transaction, creates a Manifest runtime that is explicitly bound to that transaction, and then executes multiple Manifest commands within it. The defining property is that all of those commands either succeed together or fail together. Events are emitted only if the transaction commits, and no partial state is ever observable.

Put simply, a composite route composes multiple Manifest-governed mutations into a single atomic, user-facing operation. It does not bypass Manifest’s rules. It applies them in coordination.

There are also routes that bypass Manifest entirely, but only when they are dealing with infrastructure-level records rather than governed domain entities. For example:

```ts
// Infrastructure-only record management
await prisma.wasteEntry.delete({ where: { id } });
```

This is allowed because `WasteEntry` is not a governed domain entity. No business invariants apply, no [[Event Semantics#Semantic Events|semantic events]] are expected, and routing this through Manifest would introduce artificial coupling without adding safety or clarity.

What is not allowed is bypassing Manifest for entities that are part of the governed domain, even if the code looks superficially similar:

```ts
// NOT allowed
await prisma.inventoryItem.update({ ... });
```

In this case, `InventoryItem` is governed. It has invariants, policies, and expected [[Event Semantics]]. Writing to it directly breaks those guarantees and undermines the governance boundary that Manifest exists to enforce.

**In plain terms:**  
Some user actions need to change several things at once. When that happens, you wrap all of those changes together so they either all succeed or all fail. A composite route is just the place where that coordination happens. Manifest still enforces the rules, but the route controls the timing.

Skipping Manifest is only okay when you’re touching records that don’t have business rules attached to them, like cleanup or infrastructure data. If the thing you’re changing actually matters to the business, you don’t bypass Manifest, even if the code looks similar. That’s how you avoid half-finished updates and broken state.

---

If you want, next we can do the same pass for:

- **Composite Route Pattern**
    
- **Route Ownership & Enforcement**
    
- **Mutation & Transaction Invariants**
    

