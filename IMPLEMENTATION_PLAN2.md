## Phase 2: Product Coherence & UX Power

### 2.1 Objective

Phase 2 ensures the platform behaves as **one coherent system to users**, not
just a collection of correctly wired subsystems. The goal is to eliminate UX
fragmentation, inconsistent object representations, and partial workflows, while
enabling high-agency interactions (bulk actions, combination, rapid
manipulation) across all modules and surfaces.

Phase 1 answered: _“Is the system correct and real-time?”_ Phase 2 answers: _“Is
the system complete, powerful, and trustworthy to operate?”_

---

### 2.2 Canonical Object Coherence (Non-Negotiable)

**Definition:** A canonical object (task, event, client, employee, container,
etc.) must behave identically regardless of where it is viewed, manipulated, or
referenced.

**Requirements:**

- Every UI surface must consume the same canonical contract for an object.
- Object lifecycle states, permissions, and transitions must not diverge by
  module.
- Derived or contextual views (boards, lists, dashboards) must never fork object
  identity or logic.
- Realtime updates must reconcile into the same in-memory representation, not
  parallel copies.

**Deliverables:**

- Explicit definition of canonical entities and their lifecycle states.
- Shared client-side object normalization strategy.
- Enforcement that all module views resolve objects via shared accessors/hooks.
- Elimination of duplicate “local representations” of the same object.

**Success criteria:** A user can modify an object in one module and immediately
recognize it as the _same object_ everywhere else — same status, same ownership,
same affordances.

---

### 2.3 UI Interaction Completion & Polish

This phase treats polish as **functional completeness**, not aesthetics.

**Scope includes (but is not limited to):**

- Consistent empty states, loading states, and error states across modules.
- Uniform interaction patterns for drag, drop, click, keyboard, and touch.
- Removal of placeholder UI and partial affordances.
- Visual and behavioral parity between similar components across modules.

**Explicit non-goal:** No “we’ll clean it up later” UI. If an interaction
exists, it must be finished.

**Deliverables:**

- Interaction parity audit across all major views.
- Standardized component behavior contracts (selection, hover, focus, disabled,
  error).
- Completion of all partially implemented UI flows.
- Removal of dead or misleading UI elements.

**Success criteria:** No feature requires “knowing how this page works.” The UI
teaches itself through consistency.

---

### 2.4 Bulk Operations & High-Agency Workflows

Bulk actions are first-class workflows, not shortcuts.

**Covered operations include:**

- Bulk selection (homogeneous and heterogeneous objects).
- Bulk combine / merge / split where domain-appropriate.
- Bulk reassignment, rescheduling, status changes.
- Conflict detection and resolution during bulk operations.
- Undo / rollback semantics where feasible.

**Requirements:**

- Clear domain rules for what _can_ and _cannot_ be combined.
- Deterministic outcomes for bulk actions.
- Auditability via events and logs.
- Realtime propagation identical to single-item actions.

**Deliverables:**

- Defined bulk action APIs and domain rules.
- UI patterns for previewing bulk changes before commit.
- Conflict surfacing instead of silent failure.
- Event emission for bulk operations using the same outbox pipeline.

**Success criteria:** Power users can reshape the system state rapidly without
fear of hidden side effects.

---

### 2.5 Cross-Module UX Consistency

Modules must feel distinct in purpose, not behavior.

**Requirements:**

- Shared navigation and mental model across modules.
- Consistent terminology for the same concepts everywhere.
- Uniform permission feedback (why something is disabled, not just that it is).
- Identical realtime feedback patterns across views.

**Deliverables:**

- Terminology and labeling alignment pass.
- Shared UX patterns for permissions, locks, conflicts, and ownership.
- Removal of module-specific “special case” UX unless explicitly justified.

**Success criteria:** Switching modules never feels like switching products.

---

### 2.6 Mobile Readiness (Even If Mobile Is Deferred)

This phase explicitly decides how mobile is treated — ambiguity is not allowed.

**Options (one must be chosen):**

- Full mobile app build.
- PWA with defined constraints.
- Explicit deferral with mobile-safe assumptions enforced.

**Regardless of option:**

- Touch interaction assumptions must be audited.
- Screen size constraints must not break core workflows.
- APIs must not assume desktop-only usage patterns.

**Deliverables:**

- Declared mobile strategy.
- UI constraints documented and enforced.
- API usage audited for mobile compatibility.

**Success criteria:** Mobile is either supported or intentionally deferred —
never accidentally broken.

---

### 2.7 Phase 2 Completion Criteria

Phase 2 is complete when:

- All canonical objects behave identically across all modules.
- No partial or placeholder UI remains.
- Bulk operations are reliable, predictable, and auditable.
- Users experience the platform as a single, coherent system.
- The product feels _finished_, not just _correct_.

---

### 2.8 Relationship to Phase 1

Phase 1 guarantees correctness, integrity, and realtime propagation. Phase 2
guarantees **usability, power, and trust**.

Phase 2 must not modify Phase 1 foundations except to consume them more
strictly.
