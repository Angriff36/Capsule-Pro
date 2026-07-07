---
source: Manifest published docs (mintlify) — embedded verbatim
divergences: U9, D27, D15
pages: language/workflows, language/computed-properties
note: >-
  These are COMPLETE Manifest documentation pages. Not every section applies to this directory. Read the embedded page(s) and follow the parts relevant to the change you are making here. Do not treat unrelated sections as required work.
---

# Manifest reference for `manifest/source/kitchen`

**Why this file:** Kitchen .manifest rules: model the prep-task plan workflow with native workflow/saga + value/Json types (D27), and keep computed properties (e.g. quantityAvailable) IR-owned rather than hand-stored (D15).

**Relevant divergences:** U9, D27, D15 — see `manifest/MANIFEST-DIVERGENCES.md` for the full remediation detail.

**How to use:** These are COMPLETE Manifest documentation pages. Not every section applies to this directory. Read the embedded page(s) and follow the parts relevant to the change you are making here. Do not treat unrelated sections as required work.

---

## 📄 Manifest doc — `language/workflows` · Workflows: saga orchestration and scheduled commands

Manifest provides two workflow primitives for coordinating execution across time and services: **saga orchestration** for distributed transactions with compensation, and **scheduled commands** for time-based triggers.

## Saga orchestration

A saga declares a sequence of steps that execute across entities or services. Each step has a forward command and an optional compensate command for rollback. If any step fails, the saga runs compensate for all previously completed steps in reverse order.

### Declaring a saga

Use the `saga` keyword at the program or module level:

```manifest
saga ProcessOrder {
  step reserveInventory
    forward Inventory.reserve with { orderId: self.id }
    compensate Inventory.release with { orderId: self.id }

  step chargePayment
    forward Payment.charge with { orderId: self.id, amount: self.total }
    compensate Payment.refund with { orderId: self.id }

  step shipOrder
    forward Shipping.dispatch with { orderId: self.id }

  on_failure emit OrderProcessingFailed
}
```

### Saga lifecycle

<Steps>
  <Step title="Start">
    The saga begins when the first step's forward command is invoked. The runtime creates a saga execution record tracking the current step index.
  </Step>
  <Step title="Execute forward">
    Each step's forward command runs in sequence. If the command succeeds, the saga advances to the next step.
  </Step>
  <Step title="On failure — compensate">
    If any forward command fails, the saga enters compensation mode. It runs each completed step's compensate command in reverse order (last completed first).
  </Step>
  <Step title="Complete or failed">
    After all steps complete (or all compensations run), the saga emits a completion or failure event.
  </Step>
</Steps>

### Best-effort compensation

Compensation is best-effort. If a compensate command itself fails, the saga logs the failure and continues compensating remaining steps. This ensures partial rollback rather than aborting the compensation process entirely.

### Saga lifecycle events

| Event | When emitted |
|-------|-------------|
| `{SagaName}Started` | Saga execution begins |
| `{SagaName}StepCompleted` | Each forward step succeeds |
| `{SagaName}Completed` | All forward steps complete |
| `{SagaName}StepCompensated` | Each compensate step completes |
| `{SagaName}Failed` | Saga enters compensation mode or compensation fails |

<Note>
Saga events carry `correlationId` and `causationId` from the originating command, enabling cross-service tracing through the entire workflow.
</Note>

## Scheduled commands

Scheduled commands trigger entity commands on a time-based schedule using cron expressions, fixed intervals, or periodic timers.

### Declaring a scheduled command

Use the `schedule` keyword inside an entity block:

```manifest
entity Report {
  property required id: string
  property lastRunAt: number = 0
  property status: string = "idle"

  schedule generateDaily
    cron "0 6 * * *"           // Every day at 6:00 AM
    run generate

  schedule healthCheck
    interval 300000            // Every 5 minutes (in ms)
    run checkHealth

  schedule cleanup
    every 24 hours             // Every 24 hours
    run purgeExpired

  command generate() {
    mutate status = "running"
    emit ReportGenerationStarted
  }

  command checkHealth() {
    mutate lastRunAt = now()
  }

  command purgeExpired() {
    mutate status = "cleaned"
  }
}
```

### Trigger types

| Type | Syntax | Description |
|------|--------|-------------|
| `cron` | `cron "0 6 * * *"` | Standard 5-field cron expression (minute hour day month weekday) |
| `interval` | `interval <ms>` | Fixed interval in milliseconds |
| `every` | `every <n> hours/minutes/seconds` | Human-readable period |

### Schedule resolution

Schedules are resolved at compile time and emitted to the IR as `IRSchedule` objects. The runtime does not include a built-in scheduler — schedules are declarative metadata that projection targets consume:

- **Next.js projection**: Generates Next.js [cron routes](https://nextjs.org/docs/app/api-reference/cron) (`/api/cron/[name]/route.ts`).
- **Express/Hono projections**: Emit route handlers intended for external scheduler invocation.
- **Infrastructure projections** (Terraform): Generate CloudWatch Event rules or similar scheduled resources.

### Inline parameters

Scheduled commands can pass static parameters to the target command:

```manifest
entity Cache {
  schedule warmCache
    cron "0 */6 * * *"
    run refresh with { keys: "all" }

  command refresh(keys: string) {
    // ...
  }
}
```

<Warning>
The Manifest runtime does not execute schedules autonomously. Schedules are declarations consumed by projections. You must deploy the generated cron routes and ensure your hosting platform invokes them on schedule.
</Warning>

## Combining sagas and schedules

Sagas and schedules can work together. A scheduled command can initiate a saga, enabling periodic batch workflows:

```manifest
entity DailyReconciliation {
  schedule runReconciliation
    cron "0 2 * * *"
    run startReconciliation

  command startReconciliation() {
    emit ReconciliationRequested
  }
}

saga ReconcileAccounts {
  step fetchTransactions
    forward Transaction.fetchPending

  step matchRecords
    forward Ledger.match with { date: self.date }

  on_failure emit ReconciliationFailed
}
```

---

## 📄 Manifest doc — `language/computed-properties` · Computed properties: derived values

A computed property is a read-only value derived from an expression rather than stored directly. You declare it with the `computed` keyword inside an entity block. The runtime evaluates it on demand, using the current instance fields and any declared dependencies.

## Syntax

```manifest
computed <name>: <type> = <expression>
```

The expression can reference `self`, `this`, any property on the instance, other computed properties, and the standard built-ins (`now()`, `uuid()`).

```manifest
entity Item {
  property required price: number
  property quantity: number = 1
  property discountPercent: number = 0

  computed total: number = price * quantity
  computed discountedTotal: number = total * (1 - discountPercent / 100)
  computed hasDiscount: boolean = discountPercent > 0
  computed isExpensive: boolean = total > 100
}
```

## Evaluation context

When the runtime evaluates a computed property, the context contains:

| Binding | Value |
|---------|-------|
| `self` / `this` | The current entity instance |
| All property values | Direct field access by name |
| Any dependencies listed in IR | Other computed properties that have already resolved |
| `user` | The current user object (if the runtime provides one) |
| `context` | The runtime context object |

```manifest
entity Author {
  property required name: string
  hasMany books: Book

  computed bookCount: number = self.books.length
}
```

Relationship traversal (`self.books`) is fully supported in computed expressions. The runtime resolves the relationship synchronously before evaluating the expression.

## Chaining computed properties

A computed property can reference another computed property on the same entity. The runtime resolves them in dependency order:

```manifest
entity WorkflowStep {
  property status: string = "pending"
  property executedAt: number = 0

  computed isPending: boolean = self.status == "pending"
  computed isInProgress: boolean = self.status == "in_progress"
  computed isCompleted: boolean = self.status == "completed"
  computed canStart: boolean = self.isPending
  computed canComplete: boolean = self.isInProgress
}
```

`canStart` depends on `isPending`, which depends on `status`. The runtime evaluates in bottom-up order.

## When computed properties re-evaluate

Computed properties are evaluated fresh each time they are accessed — there is no caching layer in the default runtime. They reflect the state of the instance at the moment of access. This means:

- After a `mutate` action inside a command, any subsequent access to a computed property reflects the updated field values.
- Computed properties based on `now()` return a different value on each evaluation if the time source advances.

## Infinite recursion prevention

The runtime detects dependency cycles. If evaluating a computed property would cause infinite recursion, the runtime returns `undefined` for that property instead of throwing. This is defined behavior, not an error condition.

```manifest
entity Circular {
  // If A depends on B and B depends on A, both evaluate to undefined
  computed a: number = self.b + 1
  computed b: number = self.a + 1
}
```

<Warning>
A computed property that returns `undefined` due to a cycle will silently produce `undefined` in guard and action expressions. If you rely on a computed value being non-null, ensure there are no cycles in the dependency graph.
</Warning>

## Using computed properties in guards and actions

Computed properties are first-class values in the evaluation context. You can reference them in guards, policies, and action expressions:

```manifest
entity Task {
  property required title: string
  property required status: string = "todo"
  property required assigneeId: string = ""
  property required createdAt: number = 0

  computed isOverdue: boolean = (now() - self.createdAt) > 86400000 and self.status != "done"
  computed assignedUser: string = self.assigneeId != "" ? self.assigneeId : "Unassigned"
  computed isHighPriority: boolean = self.priority != null and self.priority >= 3

  command updateStatus(newStatus: string) {
    guard newStatus != null and newStatus != ""
    guard newStatus == "todo" or newStatus == "in-progress" or newStatus == "done"
    mutate status = newStatus
    emit TaskStatusUpdated
  }

  command assignTask(userId: string) {
    guard userId != null and userId != ""
    guard self.assigneeId == "" or user.role == "admin"
    mutate assigneeId = userId
    emit TaskAssigned
  }
}
```

Guards like `self.assigneeId == ""` reference the raw property. A guard referencing `self.isHighPriority` would evaluate the computed property first and use the result.

## Computed properties in the TypeScript output

When you use the Next.js projection or TypeScript types surface, computed properties appear as read-only fields on the generated interface. They are not persisted in the store — they are derived each time the instance is loaded.

```typescript
interface Task {
  title: string;
  status: string;
  assigneeId: string;
  createdAt: number;
  // Computed — derived at read time
  readonly isOverdue: boolean;
  readonly assignedUser: string;
  readonly isHighPriority: boolean;
}
```

---
