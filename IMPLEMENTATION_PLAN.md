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

### 2.6 UI Hierarchy & Presentation Issues

Major visual and structural issues discovered during UI exploration that require attention:

**Major Issues Across Modules:**
- **Badge proliferation**: Excessive, overlapping badges creating visual noise and competing elements
- **Dense information display**: Overcrowded layouts with insufficient white space
- **Inconsistent UI patterns**: Different implementations of similar components across events, clients, and dashboard views
- **Missing design system blocks**: Underutilization of standardized components

**Specific Problems:**

**Events Module** ([PARTIALLY COMPLETED]):
- ~~Event cards overloaded with status badges, tags, and metadata~~ **IMPROVED**: Event card now uses proper hierarchy with CardAction for badge placement and subtle tag styling
- Competing visual hierarchy between primary event info and secondary indicators
- No consistent card pattern for different event types
- Missing proper block components for event details view

**Clients Module:**
- Client profiles crammed with information in inconsistent layouts
- Client list view suffers from similar badge overcrowding
- Missing standardized contact information blocks
- No clear visual separation between primary client data and secondary metrics

**Dashboard Module:**
- Widget density overwhelming the information hierarchy
- Competing data visualization elements without proper context
- Missing standardized dashboard block components
- Information architecture unclear without clear section breaks

**Missing Design System Components:**
- Event detail blocks (should replace current ad-hoc layouts)
- Client profile cards (structured component missing)
- Dashboard widget containers (standardized needed)
- Information density controllers (collapsible sections, progressive disclosure)

**Actionable Improvements:**
1. ~~Implement badge hierarchy system with clear priority levels~~ **STARTED**: Event-card now demonstrates CardAction-based badge placement with reduced visual noise
2. Create standardized information density patterns with proper spacing
3. Develop missing design system block components before continuing new features
4. Apply consistent visual language across all modules
5. Implement progressive disclosure for dense information areas

---

### 2.7 Completed UI Improvements (Events Module)

**Iteration: Event Card Visual Hierarchy Enhancement**

Event card component (`apps/web/src/modules/events/components/event-card.tsx`) successfully refactored to establish clear visual hierarchy and reduce information density issues.

**Improvements Implemented:**

1. **Header Reorganization**
   - Clear hierarchy: event number → type → title (with appropriate weight and spacing)
   - Status badge moved to CardAction for proper semantic structure
   - Separator added between header and content for clear visual separation

2. **Information Density Reduction**
   - Date/guests displayed in 2-column grid (reduces vertical space by ~40%)
   - Date format shortened to "month day" (e.g., "Feb 15" instead of "February 15, 2025")
   - Tags made more subtle: 11px text, muted background, max 3 visible
   - "+N" indicator for additional tags beyond 3
   - TagIcon removed to reduce visual noise

3. **Component Structure**
   - Removed outer group wrapper (unnecessary nesting)
   - Delete button uses ghost variant with proper CardAction placement
   - Proper use of CardAction pattern for action items

**Key Learnings:**

1. **CardAction Pattern Works**: Moving status badges and actions to CardAction creates cleaner semantic structure and consistent interaction patterns
2. **Information Density Control**: Limiting visible items (max 3 tags) with "+N" overflow indicator is effective pattern for dense data
3. **Visual Hierarchy Principles**: Clear separation of primary info (header) from secondary (content) via Separator and spacing
4. **Typography Matters**: 11px for metadata tags vs base size for content creates natural hierarchy

**Remaining Work in Events Module:**
- Apply same hierarchy principles to event details view
- Create standardized event detail blocks (replace ad-hoc layouts)
- Ensure consistent card pattern across different event types

**Applicability to Other Modules:**
- **Clients Module**: Similar badge/tag hierarchy needed for client profiles and list view
- **Dashboard Module**: Widget containers need standardized information density patterns
- Pattern established here should be documented in design system guidelines

---

### 2.8 Phase 2 Completion Criteria

Phase 2 is complete when:

- All canonical objects behave identically across all modules.
- No partial or placeholder UI remains.
- Bulk operations are reliable, predictable, and auditable.
- Users experience the platform as a single, coherent system.
- The product feels _finished_, not just _correct_.

---

### 2.9 Relationship to Phase 1

Phase 1 guarantees correctness, integrity, and realtime propagation. Phase 2
guarantees **usability, power, and trust**.

Phase 2 must not modify Phase 1 foundations except to consume them more
strictly.
