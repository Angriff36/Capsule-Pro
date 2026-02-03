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

**Clients Module** ([COMPLETED]):
- ~~Client profiles crammed with information in inconsistent layouts~~ **IMPROVED**: Client detail view now uses proper section headers and Separator elements
- ~~Client list view suffers from similar badge overcrowding~~ **IMPROVED**: Client list now uses proper Select component and organized filter layout
- ~~Missing standardized contact information blocks~~ **IMPROVED**: Quick Stats organized in semantic section with proper hierarchy
- ~~No clear visual separation between primary client data and secondary metrics~~ **IMPROVED**: Separators and section headers establish clear information hierarchy

**Dashboard Module** ([COMPLETED]):
- ~~Widget density overwhelming the information hierarchy~~ **IMPROVED**: Analytics page now uses clear section headers and proper card spacing
- ~~Competing data visualization elements without proper context~~ **IMPROVED**: Top Events table given its own section with proper hierarchy
- ~~Missing standardized dashboard block components~~ **IMPROVED**: Profitability dashboard uses proper section-based organization with standardized card hierarchy
- ~~Information architecture unclear without clear section breaks~~ **IMPROVED**: Added section headers and Separator for clear visual grouping across both analytics and profitability dashboards

**Missing Design System Components:**
- Event detail blocks (should replace current ad-hoc layouts)
- Client profile cards (structured component missing)
- Dashboard widget containers (standardized needed)
- Information density controllers (collapsible sections, progressive disclosure)

**Actionable Improvements:**
1. ~~Implement badge hierarchy system with clear priority levels~~ **COMPLETED**: Event-card, Analytics page, Profitability Dashboard, and Clients Module now use proper badge placement
2. ~~Create standardized information density patterns with proper spacing~~ **COMPLETED**: Analytics page and Profitability Dashboard demonstrate section-based organization
3. Develop missing design system block components before continuing new features
4. ~~Apply consistent visual language across all modules~~ **COMPLETED**: Events, Analytics, Profitability Dashboard, and Clients Modules now use consistent patterns (Separators, section headers, card hierarchy)
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
- ~~Apply same hierarchy principles to event details view~~ **COMPLETED**: Event Details View now uses section headers, Separator, and semantic structure
- Create standardized event detail blocks (replace ad-hoc layouts)
- Ensure consistent card pattern across different event types

**Applicability to Other Modules:**
- **Clients Module**: Similar badge/tag hierarchy needed for client profiles and list view
- **Dashboard Module**: Widget containers need standardized information density patterns
- Pattern established here should be documented in design system guidelines

---

### 2.8 Completed UI Improvements (Analytics/Dashboard Module)

**Iteration: Analytics Page Visual Hierarchy Enhancement**

Analytics page component (`apps/app/app/(authenticated)/analytics/page.tsx`) successfully refactored to establish clear visual hierarchy and reduce information density issues.

**Improvements Implemented:**

1. **Section-Based Organization**
   - Added semantic `<section>` elements with descriptive headers for each content area
   - Each section gets its own header with consistent styling: `text-sm font-medium text-muted-foreground`
   - Clear visual separation: Performance Overview → Focus Metrics → Top Events

2. **Card Hierarchy Standardization**
   - Performance cards now use proper CardDescription → CardTitle order (description first, then value)
   - Fixed inverted hierarchy where value was in title position (confusing to scan)
   - Trend indicators (↑/↓) use subtle colors with explicit direction rather than relying solely on color

3. **Information Density Reduction**
   - Focus Metrics expanded from cramped 3-column inside a single card to full-width 3-card grid
   - Each metric gets proper breathing room with full Card structure
   - Top Events table given its own section with clean table-only card (no nested card)

4. **Component Structure**
   - Added Separator between page header and first section for clear visual break
   - Status variant map added for consistent badge styling
   - Removed double-nested cards (Top Events was in a card within a grid section)

**Key Learnings:**

1. **Section Headers Are Critical**: Adding section headers (Performance Overview, Focus Metrics, Top Events) immediately gives users a mental model of the page structure
2. **Card Hierarchy Matters**: CardDescription should always describe the value in CardTitle — reversing this creates confusion
3. **One Level of Nesting**: Cards inside cards (Top Events in a card inside a section) create unnecessary visual noise; flat structure is cleaner
4. **Trend Indicators Need More Than Color**: Using ↑/↓ symbols + color makes trends accessible and unambiguous

**Remaining Work in Dashboard Module:**
- Apply same hierarchy principles to profitability-dashboard component (very dense)
- Create standardized dashboard metric card component
- Consider creating dashboard-section block component for consistency

**Applicability to Other Modules:**
- **Profitability Dashboard**: Needs similar section-based reorganization; currently very dense with cramped layouts
- **CLV Dashboard**: Likely similar density issues; audit needed
- **Employee Performance Dashboard**: Likely similar density issues; audit needed

---

### 2.8 Completed UI Improvements (Clients Module)

**Iteration: Clients Module Visual Hierarchy Enhancement**

Client List View (`apps/app/app/(authenticated)/crm/clients/components/clients-client.tsx`) and Client Detail View (`apps/app/app/(authenticated)/crm/clients/[id]/components/client-detail-client.tsx`) successfully refactored to establish clear visual hierarchy and reduce information density issues.

**Improvements Implemented:**

**Client List View:**
1. **Select Component Consistency**
   - Replaced native `<select>` with proper Select component from design system for consistency
   - Ensures visual alignment with other form controls across the platform

2. **Filter Section Reorganization**
   - Added vertical Separator for grouping filter controls
   - Implemented proper flex-wrap for responsive layout
   - Added fixed width classes for consistent sizing (min-w-[150px], w-[200px])

3. **Visual Separation**
   - Added Separator between page header and filters for better visual grouping
   - Improved results count typography with font-medium weight

**Client Detail View:**
1. **Badge Reduction**
   - Changed source badge from Badge component to subtle text (`via {source}`)
   - Eliminates visual noise for low-priority metadata

2. **Header Layout Improvement**
   - Switched to items-start alignment for proper spacing
   - Added Separator between header and content sections

3. **Section Organization**
   - Added "Overview" section header for Quick Stats cards
   - Wrapped Quick Stats in semantic `<section>` element
   - Added Separator before Tabs for better visual grouping

**Key Learnings:**

1. **Select Component Usage**: The native `<select>` element doesn't match the design system aesthetic; proper Select component provides consistent UX
2. **Separator for Grouping**: Vertical separators work well to group related filter controls without adding borders
3. **Subtle Text Alternatives**: For low-priority metadata like "source", a simple text span (`via {source}`) is cleaner than a Badge component
4. **Section Headers Matter**: Adding "Overview" header to Quick Stats provides context similar to Analytics page improvements
5. **Responsive Filter Layout**: Using flex-wrap with fixed-width classes prevents layout shifts

**Remaining Work in Clients Module:**
- Apply same hierarchy principles to client edit form
- Create standardized client profile component with consistent blocks
- Ensure consistent contact information display across all client views

**Applicability to Other Modules:**
- **Employee Module**: Likely similar badge hierarchy needed for employee profiles
- **Employee Performance Dashboard**: May need similar filter organization patterns
- **All List Views**: Filter component pattern should be standardized across modules

---

### 2.9 Completed UI Improvements (Profitability Dashboard)

**Iteration: Profitability Dashboard Visual Hierarchy Enhancement**

Profitability Dashboard component (`apps/app/app/(authenticated)/analytics/events/components/profitability-dashboard.tsx`) successfully refactored to establish clear visual hierarchy and reduce information density issues.

**Improvements Implemented:**

1. **Section-Based Organization**
   - Added semantic `<section>` elements with descriptive headers for each content area
   - Each section gets its own header with consistent styling: `text-sm font-medium text-muted-foreground`
   - Clear visual separation: Performance Overview → Cost Analysis & Trends → Variance Analysis (event view) / Summary Metrics → Historical Trends (historical view)

2. **Card Hierarchy Standardization**
   - Performance cards now use proper CardDescription → CardTitle order (description first, then value)
   - Fixed inverted hierarchy where title was in description position (confusing to scan)
   - Total Costs card improved: cost breakdown moved from cramped single-line to vertical stack with space-y-1

3. **Select Component Consistency**
   - Replaced native `<select>` element with proper Select component from design system
   - Ensures visual alignment with other form controls across the platform
   - Consistent width (w-[180px]) and styling

4. **Component Structure**
   - Added Separator between page header and first section for clear visual break
   - Added Separator between major content sections
   - Increased spacing between sections from space-y-6 to space-y-8 for better breathing room
   - Section headers provide mental model of page structure

5. **Information Density Reduction**
   - Total Costs breakdown: Food, Labor, Overhead now on separate lines (space-y-1) instead of cramped single line
   - Variance Analysis given its own section with proper header instead of being inline
   - Historical Trends table given its own section with clear header

**Key Learnings:**

1. **Section Headers Work for Complex Dashboards**: Even with two different views (eventId metrics vs historical trends), adding section headers immediately gives users a mental model of the page structure
2. **Vertical Stack Beats Single Line**: The Total Costs breakdown went from "Food: $X | Labor: $Y | Overhead: $Z" (cramped) to three separate lines — much easier to scan
3. **Separator Between Page Header and Content**: Adding Separator after the page header creates visual breathing room similar to Analytics page improvements
4. **space-y-8 vs space-y-6**: Increasing spacing between sections from 6 to 8 creates better visual rhythm for dense dashboards
5. **Select Component Over Native**: The native `<select>` doesn't match the design system aesthetic; proper Select component provides consistent UX

**Applicability to Other Modules:**
- **CLV Dashboard**: Likely similar density issues; needs section-based reorganization
- **Employee Performance Dashboard**: Similar improvements may be needed (section-based organization already applied)
- **Any Dashboard with Dense Tables**: Apply section headers, separators, and proper card hierarchy

---

### 2.10 Completed UI Improvements (Employee Performance Dashboard)

**Iteration: Employee Performance Dashboard Visual Hierarchy Enhancement**

Employee Performance Dashboard component (`apps/app/app/(authenticated)/analytics/staff/components/employee-performance-dashboard.tsx`) successfully refactored to establish clear visual hierarchy and reduce information density issues.

**Improvements Implemented:**

1. **Section-Based Organization**
   - Added semantic `<section>` elements with descriptive headers for both individual employee view and summary view
   - Each section gets its own header with consistent styling: `text-sm font-medium text-muted-foreground`
   - Clear visual separation between different performance metrics sections

2. **Select Component Consistency**
   - Replaced native `<select>` element with proper Select component from design system
   - Ensures visual alignment with other form controls across the platform

3. **Component Structure**
   - Added Separator between page header and first section for clear visual break
   - Increased spacing between sections from space-y-6 to space-y-8 for better breathing room
   - Consistent section header styling across all views

4. **Semantic HTML Structure**
   - Added proper `<section>` elements with descriptive headers
   - Improved accessibility and document structure
   - Clear visual separation between different content areas

**Key Learnings:**

1. **Section Headers Work for Multi-View Dashboards**: Section headers work effectively for both individual employee view and summary view, giving users clear mental models of page structure
2. **Select Component Provides Consistent UX**: The proper Select component from design system ensures consistent visual language across the platform
3. **space-y-8 vs space-y-6 Creates Better Visual Rhythm**: Increasing spacing between sections from 6 to 8 creates better visual rhythm for dashboards
4. **Semantic Sections Provide Better Structure**: Using semantic `<section>` elements improves accessibility and provides clear content grouping

**Applicability to Other Modules:**
- **CLV Dashboard**: Similar improvements may be needed (currently already well-structured)
- **Any dashboard with multiple views or filtering options**: Apply section headers, proper Select components, and semantic structure

---

### 2.12 Completed UI Improvements (Event Details View)

**Iteration: Event Details Visual Hierarchy Enhancement**

Event Details View component (`apps/app/app/(authenticated)/events/[eventId]/event-details-client.tsx`) successfully refactored to establish clear visual hierarchy and reduce information density issues.

**Improvements Implemented:**

1. **Section-Based Organization**
   - Added semantic `<section>` elements with descriptive headers for each major content area
   - Each section gets its own header with consistent styling: `text-xs uppercase tracking-[0.25em] text-slate-400`
   - Clear visual separation: Event Overview → Menu Intelligence → AI Insights → Guests & RSVPs → Event Explorer

2. **Main Container Spacing Improvement**
   - Changed main container spacing from `gap-10` to `gap-8` for consistent visual rhythm with other dashboards
   - Added `Separator` between page header (MissingFieldsBanner) and first content section

3. **Semantic HTML Structure**
   - Wrapped major content areas in semantic `<section>` elements with descriptive headers
   - Properly nested grid layouts within sections
   - Improved accessibility and document structure

4. **Section Headers Added**
   - Event Overview (main event card + featured media + operations snapshot)
   - Menu Intelligence (recipes + menu dishes + ingredient coverage)
   - AI Insights (executive summary + task breakdown + suggestions + prep tasks + budget)
   - Guests & RSVPs section (already had header, preserved)
   - Event Explorer section (already had header, preserved)

**Key Learnings:**

1. **Section Headers for Complex Pages**: Even on very complex pages with 2800+ lines of code, adding section headers immediately gives users a mental model of the page structure
2. **Separator After Page Header**: Adding Separator after the MissingFieldsBanner creates visual breathing room and separates header from content
3. **space-y-8 vs space-y-10**: Reducing spacing from 10 to 8 creates better visual rhythm consistent with other dashboard improvements
4. **Uppercase Tracking for Headers**: Using `text-xs uppercase tracking-[0.25em]` creates a subtle, elegant header style that doesn't compete with content

**Remaining Work in Events Module:**
- Create standardized event detail blocks (replace remaining ad-hoc layouts with design system components)
- Ensure consistent card pattern across different event types
- Consider creating event-detail-section block component for consistency

**Applicability to Other Modules:**
- **Any Complex Detail View**: The section header pattern works well for complex detail views with multiple content areas
- **Any Page with Multiple Sections**: Apply section headers, separators, and semantic structure
- **Design System**: Consider creating standardized section-header component for reuse

---

### 2.11 Phase 2 Completion Criteria

Phase 2 is complete when:

- All canonical objects behave identically across all modules.
- No partial or placeholder UI remains.
- Bulk operations are reliable, predictable, and auditable.
- Users experience the platform as a single, coherent system.
- The product feels _finished_, not just _correct_.

---

### 2.11 Relationship to Phase 1

Phase 1 guarantees correctness, integrity, and realtime propagation. Phase 2
guarantees **usability, power, and trust**.

Phase 2 must not modify Phase 1 foundations except to consume them more
strictly.
