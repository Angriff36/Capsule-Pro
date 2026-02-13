# Spec 1: Capsule-Pro Manifest Integration for Kitchen Ops Rules, Overrides, and Anti-Spaghetti

## Title
Manifest-Backed Operations Rules and Workflow Spine (Capsule-Pro)

## Status
Draft

## Outcome
Capsule-Pro business rules for kitchen operations live in Manifest specs and are enforced by the runtime (not scattered across routes/jobs/UI). The system supports real-world improvisation via structured overrides, while keeping auditability, correctness, and predictable behavior across API + UI + background workers.

## Scope

### In scope
- Kitchen Ops entities: PrepTask, Station, Shift, InventoryItem, Event, BattleBoard (as applicable)
- Rules enforcement via Manifest commands/policies/guards
- Soft constraints (warn/allow) and hard constraints (block)
- Override workflow (who, why, what was overridden)
- Event choreography for multi-step workflows (import → validate → generate tasks → reserve inventory → activate)
- Unified error/diagnostic surface for UI and API responses
- Conformance fixtures required for every new rule category

### Out of scope
- Full job orchestration framework replacement
- Replacing Prisma schema design
- Replacing auth provider; Manifest consumes "runtime context user" only
- Complex optimization solvers (auto-scheduling across the entire week)

## Principles

1. **All state mutations that matter go through Manifest commands.**
2. **Every violation is either: OK, WARN (allowed), or BLOCK (denied).**
3. **Improvisation is explicit: overrides are structured and auditable, not "hidden bypass flags."**
4. **Events are the integration surface between rules and side effects (LLM parsing, notifications, external services).**
5. **Conformance tests are the executable semantics and regression barrier.**

## Core Domain Behaviors

### A) Constraint Severity Model
Constraints evaluate to an outcome object, not a boolean.

#### ConstraintOutcome
```typescript
{
  severity: "OK" | "WARN" | "BLOCK"
  code: string // stable identifier
  message: string // user-displayable
  details: object // structured values for UI
  suggestedActions: string[] // optional
}
```

**Rules by default should prefer WARN unless they are safety or data-integrity critical.**

#### Hard constraints (BLOCK) examples
- Allergen conflicts (when allergen data exists and is trusted)
- Negative inventory / consuming unavailable lot
- Double-claim where exclusivity is required
- Invalid state transition (workflow invariants)

#### Soft constraints (WARN) examples
- Station capacity exceeded
- Task dependency not met but can be parallelized
- Prep window tight
- Inventory shortfall but substitutions exist

### B) Override Model
Overrides are explicit and recorded.

#### OverrideRequest
```typescript
{
  reason: string // required
  overrideCode: enum string // customer_request, equipment_failure, time_crunch, substitution, staffing_gap, other
  authorizedBy: runtime context user // derived, not supplied
  scope: which constraint code(s) are being overridden
}
```

#### Authorization
- Overrides require role-based authorization per constraint code or per severity.
- Example: WARN constraints may allow override by kitchen leads; BLOCK overrides require manager or admin.

#### Audit
- Every override emits an OverrideUsed event with full detail.
- Overrides are queryable for ops reporting and postmortems.

### C) Command Execution Contract
Every command execution returns a structured result, even on success.

#### CommandResult
```typescript
{
  success: boolean
  deniedBy: policy id/code // if denied
  guardFailure / policyFailure // structured, ordered
  constraintOutcomes: ConstraintOutcome[] // including WARN/OK
  overrideRequired: boolean
  overrideableConstraints: string[] // codes
  emittedEvents: EmittedEvent[]
  version/etag: entity version // for concurrency
}
```

### D) Workflow Pattern (Cross-Entity)
Use a Workflow entity for multi-step operations.

#### Examples
- **EventImportWorkflow**: parse → extract → validate → propose tasks → reserve inventory → activate
- **PrepTaskPlanWorkflow**: generate → review → approve → instantiate tasks → schedule windows

#### Requirements
- Steps are idempotent (same input doesn't duplicate tasks)
- Retries are safe
- Each step emits events with enough info to replay/diagnose
- Partial failure leaves workflow in a visible state, not silent limbo

### E) UI and API Responsibilities

#### UI
- Displays WARN outcomes prominently but does not block unless BLOCK
- If BLOCK and overrideable, UI provides an "Override with reason" flow
- Shows exact constraint messages and details
- Shows audit history (events, overrides)

#### API
- Never re-implements business rules
- Calls runtime, returns structured CommandResult
- Side effects happen in handlers based on emitted events

## Implementation Plan (Capsule-Pro)

### Phase 0: Containment
- Define "Manifest-only mutation" boundary for selected entities (start with PrepTask + Inventory reserve/consume).
- Make API routes call runtime commands rather than mutating DB directly.
- Add telemetry: count of WARN, BLOCK, override usage, top constraint codes.

### Phase 1: Constraints + Overrides
- Implement constraint severity evaluation for key operations: claim, start, complete, reassign, reserve, consume.
- Implement override flow and audit events.

### Phase 2: Workflows
- Introduce workflow entities for: event import pipeline and task generation pipeline.
- Add idempotency keys and replayable steps.

### Phase 3: Expand coverage
- Shift scheduling constraints (overlaps, certs, overtime)
- Station capacity and time window constraints
- Battle board projections from task state/events

## Acceptance Criteria

1. No kitchen-ops critical mutation path bypasses runtime.
2. All constraint failures show deterministic diagnostics.
3. Overrides are auditable with who/why/what.
4. WARN vs BLOCK is consistent and test-covered.
5. Conformance fixtures cover: OK, WARN, BLOCK, override, idempotent retries.

## Performance Budget

- Runtime evaluation overhead must remain minor relative to IO.
- Specs compile once and are cached; no per-request parsing.
- Command execution must be O(number of relevant guards/policies/constraints), with clear upper bounds per command.