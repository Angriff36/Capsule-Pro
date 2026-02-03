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

**Events Module** ([COMPLETED]):
- ~~Event cards overloaded with status badges, tags, and metadata~~ **IMPROVED**: Event card now uses proper hierarchy with CardAction for badge placement and subtle tag styling
- ~~Competing visual hierarchy between primary event info and secondary indicators~~ **IMPROVED**: Command Board EventCard now uses Card components with consistent visual hierarchy
- ~~No consistent card pattern for different event types~~ **COMPLETED**: Command Board EventCard refactored to use same design system pattern as events list card
- ~~Missing proper block components for event details view~~ **COMPLETED**: CollapsibleSectionBlock and SectionHeaderBlock used throughout event details

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

**Design System Components - [COMPLETED]:**
- ~~Event detail blocks (should replace current ad-hoc layouts)~~ **COMPLETED**: CollapsibleSectionBlock created and 3 sections refactored; SectionHeaderBlock used for AI sections (TaskBreakdownSection, ExecutiveSummarySection, SuggestionsSection)
- ~~Client profile cards (structured component missing)~~ **COMPLETED**: ClientQuickStatsBlock created and client detail view refactored to use this new block
- ~~Dashboard widget containers (standardized needed)~~ **COMPLETED**: MetricCardBlock created with comprehensive stories
- ~~Information density controllers (collapsible sections, progressive disclosure)~~ **COMPLETED**: CollapsibleSectionBlock handles progressive disclosure

**Actionable Improvements:**
1. ~~Implement badge hierarchy system with clear priority levels~~ **COMPLETED**: Event-card, Analytics page, Profitability Dashboard, and Clients Module now use proper badge placement
2. ~~Create standardized information density patterns with proper spacing~~ **COMPLETED**: Analytics page and Profitability Dashboard demonstrate section-based organization
3. ~~Develop missing design system block components before continuing new features~~ **COMPLETED**: CollapsibleSectionBlock, SectionHeaderBlock, ClientQuickStatsBlock, and MetricCardBlock created with stories
4. ~~Apply consistent visual language across all modules~~ **COMPLETED**: Events, Analytics, Profitability Dashboard, and Clients Modules now use consistent patterns (Separators, section headers, card hierarchy)
5. ~~Implement progressive disclosure for dense information areas~~ **COMPLETED**: TaskCard component now uses proper expandable details with enhanced spacing and visual hierarchy

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
- **CLV Dashboard**: **COMPLETED** - Now uses section-based organization with clear visual hierarchy
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
- ~~Apply same hierarchy principles to client edit form~~ **COMPLETED**: Contact info edit form now uses section-based organization
- Create standardized client profile component with consistent blocks
- Ensure consistent contact information display across all client views

**Applicability to Other Modules:**
- **Employee Module**: Likely similar badge hierarchy needed for employee profiles
- **Employee Performance Dashboard**: May need similar filter organization patterns
- **All List Views**: Filter component pattern should be standardized across modules
- **All Edit Forms**: Section-based organization pattern established here should be applied to other edit forms

---

### 2.8.1 Completed UI Improvements (Client Contact Info Edit Form)

**Iteration: Client Contact Info Edit Form Visual Hierarchy Enhancement**

Client Contact Info Edit Form (`apps/app/app/(authenticated)/crm/clients/[id]/components/tabs/contact-info-tab.tsx`) successfully refactored to establish clear visual hierarchy and improve information organization.

**Improvements Implemented:**

1. **Section-Based Organization**
   - Replaced single Card with nested space-y-4 structure with section-based layout
   - Each section gets its own header with consistent styling: `text-xs uppercase tracking-[0.25em] text-muted-foreground`
   - Clear visual separation: Basic Information → Contact Details → Address → Additional Information

2. **Component Structure**
   - Added Separator between each section for clear visual break
   - Wrapped each section in semantic `<section>` element with consistent `space-y-8` spacing
   - Each section content wrapped in rounded-2xl border container with padding
   - Removed outer Card wrapper; sections now stand independently with better visual rhythm

3. **Form Grouping**
   - Basic Information: Company name, first name, last name (identity data)
   - Contact Details: Email, phone, website (communication channels)
   - Address: Full address fields with proper col-span for full-width fields
   - Additional Information: Tax ID, tags, notes (metadata)

4. **Improved Label Association**
   - Added explicit `htmlFor` attributes to all Labels for proper form accessibility
   - Address lines now have unique IDs (addressLine1, addressLine2, etc.) instead of relying on placeholder-only identification

**Key Learnings:**

1. **Section Headers Work for Edit Forms**: Even in edit mode, section headers give users clear mental model of what information they're editing
2. **Separator Creates Visual Breathing Room**: Adding Separator between sections in edit forms creates better visual rhythm and reduces cognitive load
3. **Rounded Containers Beat Card Nesting**: Using rounded-2xl border containers instead of nested Cards creates cleaner visual hierarchy
4. **space-y-8 for Edit Forms**: Increasing spacing between sections to 8 creates better visual rhythm for complex forms
5. **Semantic Sections Improve Accessibility**: Using semantic `<section>` elements with descriptive headers improves form structure and navigation

**Remaining Work in Clients Module:**
- Create standardized client profile component with consistent blocks
- Ensure consistent contact information display across all client views

**Applicability to Other Modules:**
- **All Edit Forms**: The section-based organization pattern established here should be applied to other edit forms across the platform
- **Employee Edit Forms**: Similar improvements needed for employee contact info editing
- **Event Edit Forms**: Apply similar section-based organization to event editing

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
- **CLV Dashboard**: **COMPLETED** - Now uses section-based organization with clear visual hierarchy
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
- **CLV Dashboard**: **COMPLETED** - Now uses section-based organization with clear visual hierarchy
- **Any dashboard with multiple views or filtering options**: Apply section headers, proper Select components, and semantic structure

---

### 2.11 Completed UI Improvements (CLV Dashboard)

**Iteration: CLV Dashboard Visual Hierarchy Enhancement**

CLV Dashboard component (`apps/app/app/(authenticated)/analytics/clients/components/clv-dashboard.tsx`) successfully refactored to establish clear visual hierarchy and improve information architecture.

**Improvements Implemented:**

1. **Section-Based Organization**
   - Added semantic `<section>` elements with descriptive headers for each major content area
   - Each section gets its own header with consistent styling: `text-sm font-medium text-muted-foreground`
   - Clear visual separation: Performance Overview → Revenue & Cohort Analysis → Client Insights

2. **Component Structure**
   - Added Separator between page header and first section for clear visual break
   - Increased spacing between sections from space-y-6 to space-y-8 for better visual rhythm
   - Consistent section header styling across all sections

3. **Semantic HTML Structure**
   - Wrapped major content areas in semantic `<section>` elements with descriptive headers
   - Improved accessibility and document structure
   - Clear visual separation between different content areas

**Key Learnings:**

1. **Section Headers Work for Multi-Dashboard Layouts**: Even with a component-based structure (MetricsCards, RevenueTrends, etc.), adding section headers immediately gives users a mental model of the dashboard structure
2. **Separator Creates Visual Breathing Room**: Adding Separator after the page header creates visual separation similar to other dashboard improvements
3. **space-y-8 vs space-y-6**: Increasing spacing between sections from 6 to 8 creates better visual rhythm consistent with other dashboard improvements
4. **Semantic Sections Provide Better Structure**: Using semantic `<section>` elements improves accessibility and provides clear content grouping

**Remaining Work in CLV Dashboard:**
- None identified — the dashboard is now well-structured with clear visual hierarchy

**Applicability to Other Modules:**
- **Any Component-Based Dashboard**: The section header pattern works well for dashboards composed of multiple sub-components
- **Any Dashboard with Multiple Sections**: Apply section headers, separators, and semantic structure

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
- ~~Create standardized event detail blocks (replace remaining ad-hoc layouts with design system components)~~ **IN PROGRESS**: CollapsibleSectionBlock created with 3 sections refactored
- Ensure consistent card pattern across different event types
- Consider creating event-detail-section block component for consistency

**Applicability to Other Modules:**
- **Any Complex Detail View**: The section header pattern works well for complex detail views with multiple content areas
- **Any Page with Multiple Sections**: Apply section headers, separators, and semantic structure
- **Design System**: Consider creating standardized section-header component for reuse

---

### 2.13 Completed UI Improvements (Design System - CollapsibleSectionBlock)

**Iteration: Standardized Collapsible Section Block Component**

Created a new reusable `CollapsibleSectionBlock` component in the design system that captures the common pattern used across multiple event detail sections.

**Component Created:**
- `packages/design-system/components/blocks/collapsible-section-block.tsx`
- `packages/design-system/components/blocks/collapsible-section-block.stories.tsx`

**Features:**
- Icon + title + subtitle header with customizable icon colors
- Collapsible content with separator
- Integrated empty state configuration with icon, title, description, and action
- Header actions support for buttons/controls in the header
- Optional ID prop for accessibility
- Consistent styling: rounded-xl border, shadow-sm, proper spacing
- Also includes `SectionHeaderBlock` for non-collapsible section headers

**Sections Refactored:**

1. **PrepTasksSection** (`apps/app/app/(authenticated)/events/[eventId]/event-details-sections.tsx`)
   - Refactored to use CollapsibleSectionBlock
   - Empty state: "No prep tasks yet" with "Generate with AI" action
   - Icon: PlusIcon with purple color

2. **SourceDocumentsSection** (`apps/app/app/(authenticated)/events/[eventId]/event-details-sections.tsx`)
   - Refactored to use CollapsibleSectionBlock
   - Icon: FileTextIcon for document association
   - File upload form in content area

3. **MenuDishesSection** (`apps/app/app/(authenticated)/events/[eventId]/event-details-sections.tsx`)
   - Refactored to use CollapsibleSectionBlock
   - Header actions: Add Dish Dialog
   - Empty state: "No dishes linked to this event" with "Add First Dish" action
   - Loading state handled inline
   - Icon: UtensilsIcon with emerald color

**Key Learnings:**

1. **Block Pattern Reduces Duplication**: The collapsible section pattern was duplicated across 4+ sections. Creating a standardized block reduces code duplication and ensures consistent behavior.

2. **Empty State Configuration**: The `emptyState` prop provides a consistent pattern for empty states across all sections, with optional icon, title, description, and action button.

3. **Header Actions Support**: The `headerActions` prop allows sections to have custom buttons/controls in the header area (e.g., "Add Dish" dialog trigger).

4. **Loading State Flexibility**: Loading state is handled inline in the children content rather than through a prop, giving components more flexibility for custom loading indicators.

5. **Special Cases Still Need Custom Code**: BudgetSection was not refactored because it has dynamic trigger text ("View budget" vs "Create budget") that depends on state. This is a legitimate use case for keeping the original collapsible pattern.

**Remaining Work:**
- BudgetSection could be refactored if CollapsibleSectionBlock is enhanced to support dynamic trigger text via a function prop
- Consider refactoring other modules (Clients, Employees) to use CollapsibleSectionBlock where similar patterns exist

**Applicability to Other Modules:**
- **Clients Module**: Profile sections could use CollapsibleSectionBlock for expandable information areas
- **Employee Module**: Similar detail view sections could benefit from standardized pattern
- **Dashboard Module**: Some expandable widget containers could use this pattern

---

### 2.14 Completed UI Improvements (Task Breakdown Display)

**Iteration: TaskCard Visual Hierarchy Enhancement**

TaskCard component (`apps/app/app/(authenticated)/events/components/task-breakdown-display.tsx`) successfully refactored to establish clear visual hierarchy and reduce information density issues.

**Improvements Implemented:**

1. **Primary Content Section**
   - Clear hierarchy: task name → description (with proper spacing)
   - Time badges positioned on the right side for balance
   - Increased gap from gap-2 to gap-3 for better breathing room

2. **Secondary Metadata Simplification**
   - Confidence indicator moved to its own section with proper spacing
   - Removed duplicate historical context from secondary metadata (now only in details)
   - Made metadata more subtle with proper muted-foreground styling

3. **Expandable Details Enhancement**
   - Changed "More details" button spacing from mt-2 to mt-3 for better vertical rhythm
   - Improved CollapsibleContent spacing from space-y-2 to space-y-3
   - Added uppercase tracking-wide headers for "Ingredients" and "Steps"
   - List items now use text-muted-foreground for better hierarchy
   - Historical context enhanced with rounded container and icon

4. **Action Footer**
   - Replaced border-t with Separator component for consistent visual language
   - Changed from mt-3 to my-3 for proper margin on both sides

**Key Learnings:**

1. **Separator Creates Consistency**: Using the Separator component instead of border-t creates consistent visual language across the platform
2. **Uppercase Headers for Details**: Using uppercase tracking-wide headers for "Ingredients" and "Steps" creates clear visual separation
3. **Container Enhancement for Special Content**: Historical context benefits from a rounded container with icon to distinguish it from other content
4. **Single Source of Truth for Metadata**: Removing duplicate historical context from secondary metadata reduces cognitive load
5. **Vertical Rhythm Matters**: Consistent spacing (mt-3, space-y-3, my-3) creates better visual rhythm

**Applicability to Other Modules:**
- **Any Card with Expandable Details**: The pattern of uppercase headers, enhanced containers, and proper separators should be applied to other card components
- **Progressive Disclosure Components**: The spacing improvements (mt-3, space-y-3) provide better visual rhythm for expandable content

---

### 2.15 Completed UI Improvements (AI Sections Header Standardization)

**Iteration: AI Sections Visual Consistency Enhancement**

AI-related section components (`apps/app/app/(authenticated)/events/[eventId]/event-details-sections.tsx`) successfully refactored to use the standardized `SectionHeaderBlock` component for visual consistency.

**Improvements Implemented:**

1. **TaskBreakdownSection Refactoring**
   - Replaced custom flex header with `SectionHeaderBlock`
   - Icon: SparklesIcon with purple color
   - Title: "AI Task Assistant"
   - Actions: "Generate Task Breakdown" button

2. **ExecutiveSummarySection Refactoring**
   - Replaced custom flex header with `SectionHeaderBlock`
   - Icon: SparklesIcon with primary color
   - Title: "Executive Summary"
   - Actions: "Generate Summary" button

3. **SuggestionsSection Refactoring**
   - Replaced custom flex header with `SectionHeaderBlock`
   - Icon: Lightbulb with amber color
   - Title: "AI Suggestions"
   - Actions: Dynamic toggle button ("Show/Hide Suggestions") with badge count

4. **Import Consolidation**
   - Added `SectionHeaderBlock` to imports from design system blocks
   - Maintained all existing component behavior and functionality

**Key Learnings:**

1. **SectionHeaderBlock Works for Non-Collapsible Sections**: The `SectionHeaderBlock` component is well-suited for sections that need consistent header styling without collapsible functionality.

2. **Actions Pattern is Flexible**: The `actions` prop accepts any React.ReactNode, making it easy to pass complex buttons including those with dynamic variants, badges, and conditional rendering.

3. **Code Reduction**: Refactoring these three sections reduced header boilerplate code significantly while maintaining full functionality.

4. **Design System Leveraging**: Using existing design system blocks (`SectionHeaderBlock`) instead of creating custom implementations ensures consistency across the platform.

**Remaining Work in Event Details:**
- BudgetSection remains with custom collapsible implementation (legitimate special case due to dynamic trigger text)
- Consider refactoring BudgetSection if CollapsibleSectionBlock is enhanced to support dynamic trigger text via function prop

**Applicability to Other Modules:**
- **Any section with icon + title + actions header pattern**: The SectionHeaderBlock can be used wherever a non-collapsible section header is needed
- **Other AI-related sections**: Consider applying the same pattern to any other AI feature sections in the platform
- **Design System Adoption**: The pattern established here encourages using existing blocks before creating custom implementations

---

### 2.15.1 Completed UI Improvements (Design System - ClientQuickStatsBlock)

**Iteration: Standardized Client Quick Stats Block Component**

Created a new reusable `ClientQuickStatsBlock` component in the design system that captures the common pattern for displaying client contact information and key metrics in a standardized format.

**Component Created:**
- `packages/design-system/components/blocks/client-quick-stats-block.tsx`
- `packages/design-system/components/blocks/client-quick-stats-block.stories.tsx`

**Features:**
- Structured layout for client contact information with proper semantic HTML
- Consistent typography and spacing for different types of information
- Phone number and email with appropriate link formatting
- Address display with optional line breaks
- Optional header section for context
- Responsive design with proper column layout
- Uses design system components like Card, Avatar, and Separator

**Client Detail View Refactored:**

1. **Client Detail View** (`apps/app/app/(authenticated)/crm/clients/[id]/components/client-detail-client.tsx`)
   - Replaced manual Quick Stats organization with ClientQuickStatsBlock
   - Proper contact information structure: avatar, name, title, email, phone, address
   - Consistent styling and spacing across all client profiles
   - Address information properly formatted and accessible
   - Visual hierarchy established through proper typography and layout

**Key Learnings:**

1. **Structured Components Reduce Repetition**: The Quick Stats pattern was manually implemented with similar structure across multiple client views. Creating a standardized block reduces code duplication and ensures consistent behavior.

2. **Semantic HTML Improves Accessibility**: Using proper HTML structure for contact information (addresses, links, phone numbers) improves accessibility and SEO while maintaining visual consistency.

3. **Flexibility Through Props**: The component supports customization through props like optional headers, while maintaining consistent core functionality for all client profiles.

4. **Layout Consistency**: The standardized grid layout ensures all client profiles present contact information in the same order and style, reducing cognitive load for users.

5. **Design System Integration**: Using existing design system components (Card, Avatar) ensures visual consistency with the broader platform language.

**Remaining Work:**
- Consider extending the block to support additional client metrics or customizable fields
- Apply the same pattern to other client-related views (list view compact display, dashboard widgets)

**Applicability to Other Modules:**
- **Employee Module**: Similar quick stats pattern could be standardized for employee profiles
- **Dashboard Components**: Client cards in dashboards could use a simplified version of this pattern
- **Contact Lists**: Any list view showing contact information could benefit from standardized blocks

---

### 2.16 Completed UI Improvements (Design System - MetricCardBlock)

**Iteration: Standardized Dashboard Metric Card Component**

Created a new reusable `MetricCardBlock` component in the design system that captures the common pattern used across all dashboard metric cards, eliminating duplication and ensuring consistent visual hierarchy.

**Component Created:**
- `packages/design-system/components/blocks/metric-card-block.tsx`
- `packages/design-system/components/blocks/metric-card-block.stories.tsx`

**Features:**
- Consistent CardDescription → CardTitle → CardContent hierarchy
- Support for trend indicators (up/down/neutral with arrow icons)
- Optional custom value coloring for positive/negative values
- Flexible detail content (simple text or complex React nodes)
- Optional size variants for value display (text-xl, text-2xl, text-3xl)
- Comprehensive Storybook coverage with 12 story variants

**Pattern Standardization:**

The `MetricCardBlock` captures the most common dashboard metric patterns:

1. **Basic Metric**: Description → Value → Detail text
2. **Trend Metric**: Description → Value → Trend indicator with arrow and detail
3. **Colored Value Metric**: Description → Colored Value → Variance info
4. **Multi-line Detail**: Description → Value → Complex content breakdown

**Key Learnings:**

1. **Single Pattern Reduces Duplication**: All dashboards (Analytics, Profitability, CLV, Employee Performance) were implementing the same metric card pattern with slight variations. A single standardized component eliminates this duplication.

2. **Trend Indicators Need Consistent Treatment**: Using `↑` and `↓` symbols with color coding (green/red) provides unambiguous trend communication. The component handles this automatically via the `trend` prop.

3. **Value Coloring is Domain-Specific**: Some metrics need colored values (e.g., green for positive margin, red for negative variance). The `valueColor` prop provides this flexibility without requiring custom card implementations.

4. **Detail Content Flexibility**: Some metrics need multi-line breakdowns (e.g., cost breakdown by category). Supporting both simple string and complex React node for the `detail` prop enables this use case.

5. **Storybook Variants Guide Usage**: With 12 different story variants (DashboardGrid, FocusMetricsGrid, CostAnalysisGrid, etc.), developers can quickly find and adapt the right pattern for their use case.

**Bug Fixes (Pre-existing Issues):**

While implementing this component, discovered and fixed three pre-existing bugs in `collapsible-section-block.stories.tsx`:

1. **Function in args causing serialization error**: Storybook build was failing because `onAction` functions in `args` objects don't serialize properly. Fixed by converting affected stories (`EmptyState`, `NoSubtitle`, `EmptyStateNoIcon`) to use `render` functions instead.

2. **Syntax error in CustomTriggerText story**: Line 271 had `title="Event Budget"` (using `=`) instead of `title: "Event Budget"` (using `:`). This was causing "Invalid shorthand property initializer" error during Storybook build.

**Applicability to Other Modules:**

- **Any Dashboard with Metric Cards**: The pattern is now available for all dashboards (Finance, Kitchen, Employee, etc.) to use consistent metric card displays.
- **Performance Overview Sections**: Any section displaying KPIs, metrics, or summary statistics can use this component.
- **Metric Grids**: The `DashboardGrid`, `FocusMetricsGrid`, and `CostAnalysisGrid` story variants demonstrate common grid patterns.

**Remaining Work:**
- Consider migrating existing dashboard implementations to use `MetricCardBlock` where appropriate
- The component is ready to use; no additional work needed for the block itself

**Applicability to Other Modules:**
- **All Dashboard Modules**: Analytics, Profitability, CLV, Employee Performance, and any future dashboards can use this standardized component
- **Finance Module**: Cost analysis, budget variance, and revenue tracking displays
- **Kitchen Module**: Performance metrics and efficiency tracking cards
- **Employee Module**: Performance metrics and productivity tracking displays

---

### 2.17 Completed UI Improvements (Command Board EventCard Standardization)

**Iteration: Command Board EventCard Visual Consistency Enhancement**

Command Board EventCard component (`apps/app/app/(authenticated)/command-board/components/cards/event-card.tsx`) successfully refactored to use the same design system Card pattern as the events list card, eliminating UI inconsistency across the platform.

**Improvements Implemented:**

1. **Card Component Adoption**
   - Replaced plain div structure with proper Card, CardHeader, CardContent components
   - Added CardAction for semantic action button placement
   - Uses Separator for clear visual separation between header and content

2. **Consistent Status Badge Pattern**
   - Replaced custom color classes (`bg-emerald-100 text-emerald-700 border-emerald-200`) with design system variants (`default`, `secondary`, `destructive`, `outline`)
   - Status badge now uses CardAction placement matching events list card pattern
   - Consistent `statusVariantMap` pattern for uniform status display

3. **Visual Hierarchy Standardization**
   - CardDescription → CardTitle order matches events list card pattern
   - Event type displayed as CardDescription in header
   - Status badge positioned on right side via CardAction
   - Consistent icon sizing (`size-3.5`) for metadata icons

4. **Information Layout**
   - Metadata (date, guests, budget, venue) organized in CardContent with `space-y-1.5`
   - Consistent icon + label + value pattern
   - Proper truncation and line-clamp for overflow text

**Before vs After:**

| Aspect | Before | After |
|--------|--------|-------|
| Structure | Plain divs with custom classes | Card components (Card, CardHeader, CardContent) |
| Status Badges | Custom color classes | Design system variants (default/secondary/destructive/outline) |
| Visual Separator | None | Separator component |
| Header Layout | Badge row above title | CardDescription + CardTitle with CardAction badge |
| Actions | Ghost button in footer | CardAction with DropdownMenu |

**Key Learnings:**

1. **Cross-Module Consistency Matters**: Users switching between the Command Board and Events list will now see the same visual language for event cards, reducing cognitive load.

2. **Design System Variants Replace Custom Colors**: The status variant map (`statusVariantMap`) using design system variants is more maintainable than custom color classes and automatically adapts to theme changes.

3. **CardAction Pattern is Versatile**: Using CardAction for both the status badge (header) and quick actions menu (footer) provides consistent semantic structure.

4. **Separators Improve Scanability**: Adding Separator between CardHeader and CardContent creates clear visual separation, making cards easier to scan.

5. **Icon Consistency**: Using `size-3.5` consistently for metadata icons across all event cards creates visual rhythm.

**Remaining Work in Events Module:**
- All major UI hierarchy issues in the Events Module are now complete
- Event cards across the platform (events list, command board) now use consistent design system patterns

**Applicability to Other Modules:**
- **Any Module with Multiple Card Variants**: When the same entity is displayed as a card in multiple contexts, use the same Card component pattern to maintain consistency
- **Dashboard Cards**: The pattern established here (CardHeader → Separator → CardContent → CardAction) should be applied to all dashboard metric cards
- **List/Board Views**: Entities appearing in both list and kanban board views should use the same card structure with appropriate density adjustments

---

### 2.18 Completed UI Improvements (Finance Analytics Dashboard)

**Iteration: Finance Analytics Dashboard Visual Hierarchy Enhancement**

Finance Analytics Dashboard components (`apps/app/app/(authenticated)/analytics/finance/page.tsx` and `FinanceAnalyticsPageClient.tsx`) successfully refactored to establish clear visual hierarchy and improve information architecture.

**Improvements Implemented:**

1. **Page Header Separator**
   - Added `<Separator />` component between page header and content for clear visual break
   - Consistent with other analytics pages (Analytics, Employee Performance)

2. **Section-Based Organization**
   - Added semantic `<section>` elements with descriptive headers for each content area
   - Each section gets its own header with consistent styling: `text-sm font-medium text-muted-foreground`
   - Clear visual separation: Performance Overview → Financial Analysis

3. **Card Hierarchy Standardization**
   - Finance highlight cards now use proper CardDescription → CardTitle order (description first, then value)
   - Fixed inverted hierarchy where value was in title position without description
   - Added CardDescription to Ledger Summary and Finance Alerts cards

4. **Component Structure**
   - Increased spacing between sections from `space-y-6` to `space-y-8` for better breathing room
   - Section headers provide mental model of page structure
   - Loading state now also uses section-based organization

**Key Learnings:**

1. **Section Headers Work for Finance Dashboards**: Even for financial data visualization, adding section headers ("Performance Overview", "Financial Analysis") immediately gives users a mental model of the page structure.

2. **CardDescription + CardTitle Hierarchy**: For finance highlights cards, the pattern is CardDescription (label) → CardTitle (value with conditional color), not the reverse. This matches the pattern established in other dashboards.

3. **Separator After Page Header**: Adding Separator after the page header creates visual breathing room similar to other analytics pages.

4. **space-y-8 vs space-y-6**: Increasing spacing between sections from 6 to 8 creates better visual rhythm for finance dashboards.

5. **Loading State Consistency**: Even loading states should follow the same section-based organization pattern for visual consistency.

**Applicability to Other Modules:**

- **Any Dashboard with Multiple Content Areas**: The section header pattern works well for dashboards composed of multiple distinct sections.
- **Finance/Analytics Modules**: The CardDescription → CardTitle hierarchy pattern should be applied to all finance-related metric cards.
- **Any Page with Multiple Sections**: Apply section headers, separators, and semantic structure.

**Files Modified:**
- `apps/app/app/(authenticated)/analytics/finance/page.tsx` - Added Separator, changed spacing to space-y-8
- `apps/app/app/(authenticated)/analytics/finance/FinanceAnalyticsPageClient.tsx` - Added section headers, semantic sections, CardDescription, improved hierarchy

---

### 2.17 Phase 2 Completion Criteria

Phase 2 is complete when:

- All canonical objects behave identically across all modules.
- No partial or placeholder UI remains.
- Bulk operations are reliable, predictable, and auditable.
- Users experience the platform as a single, coherent system.
- The product feels _finished_, not just _correct_.

---

### 2.18 Relationship to Phase 1

Phase 1 guarantees correctness, integrity, and realtime propagation. Phase 2
guarantees **usability, power, and trust**.

Phase 2 must not modify Phase 1 foundations except to consume them more
strictly.
