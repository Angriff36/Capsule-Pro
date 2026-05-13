# v61 Spec Comparison — Detailed Analysis

> Generated 2026-05-14 as part of IMPLEMENTATION_PLAN.md v61 audit.
> This file is the detailed companion to the Spec Gap Summary in IMPLEMENTATION_PLAN.md.

---

## Events Spec (`specs/events/SPEC.md`)

### Status: Substantially built but significant spec gaps

**14 pages use legacy Header component** instead of design system shell. These should migrate to the standard layout pattern.

**Missing status transition commands**: No `/confirm`, `/cancel`, `/start`, `/complete` command routes exist. Event lifecycle management is incomplete in the API layer.

**EventSummary missing `confidence` field**: The spec defines a confidence score on the summary model. Implementation does not include this field.

**Import pipeline mismatch**: UI shows 8-phase display for import workflow. Backend only has a 3-state model (pending/processing/complete). The import pipeline spec requires a 6-stage pipeline with granular phase tracking.

**MetricBand missing 3 cells**: Revenue at risk, overdue contracts, and unstaffed events are specified but not rendered in the event metrics band.

**Battle board divergence**: Spec requires a dish-voting interface for event menu planning. Implementation is a generic timeline/task-based board. This is a fundamental UX mismatch.

**Additional gaps**:
- `Event.importWorkflowId` not in Prisma schema
- Multi-day event support not modeled (single `eventDate` field)
- Event import code at `apps/api/app/api/events/documents/parse/route.ts:936-944` has BLOCKER comment — import functions need porting
- Profitability recalculate route missing (P0.AB)
- Import-workflows command routes missing (P0.AC)
- Dishes route missing (P0.Y)
- Menu story route missing (P0.R)
- Catering order command routes missing (P0.V)

---

## Command Board Spec (`specs/command-board/boardspec.md`)

### Status: Backend rich, frontend is 5-file prototype

11 spec files exist (most spec coverage of any domain). Implementation is a 5-file prototype with major feature gaps.

**AI Chat Panel**: Backend fully built with streaming responses, context management, and conversation persistence. Frontend component does not exist. No UI to interact with the chat system.

**Plan Approval/Rejection UI**: Backend endpoints for plan review, approval, and rejection are fully functional. No frontend UI to display pending plans or trigger approval/rejection flows.

**Simulation Toggle**: 6 API endpoints built for simulation mode (enable, disable, status, configure, run, results). No frontend toggle or configuration interface exists.

**Liveblocks**: Real-time collaboration infrastructure exists (Liveblocks provider, presence hooks, room management). NOT wired to the actual board canvas. Board-canvas uses local state instead of Liveblocks rooms.

**React Flow**: Spec explicitly requires React Flow for the board visualization. Implementation uses a custom HTML canvas with manual drag-and-drop. No React Flow dependency or integration.

**Data model divergence**: Frontend uses `CommandBoardCard` type from server actions. API routes use `BoardProjection` type from manifest system. These are not reconciled — creates dual-write/dual-read issues.

**Template sharing blocked**: `shareId`/`isPublic` fields missing from CommandBoard model. Share routes return 501.

---

## Marketing Spec (`specs/marketing/SPEC.md`)

### Status: Partially built with design system gaps

**Campaigns**: "Coming Soon" placeholder page with legacy Header component. No campaign CRUD, no campaign builder, no scheduling.

**SMS Rules**: Uses plain `<Dialog>` for create/edit instead of `ContactFormCard` as spec requires. List view uses custom `<div>` grid instead of `ResearchTable`. No inline editing.

**Leads**: List uses custom `<div>` grid layout. Zero `ResearchTable` usage anywhere in marketing module. Lead scoring UI exists but scoring routes have raw SQL with no tests.

**Analytics page**: Returns `0` for zero-data case at `apps/app/app/(authenticated)/marketing/analytics/page.tsx:62` instead of null or em-dash per spec convention.

**No public lead capture endpoint**: Spec FR-702 and SC-005 require a public-facing lead capture form. No public API route or page exists.

**E2E test stale**: Asserts `text=Marketing -- Coming Soon` on main page, but page now renders `ModuleLanding`.

---

## Calendar Spec (`specs/calendar/SPEC.md`)

### Status: Core functionality works, design system gaps

**Sync works**: ProviderSync model correctly handles calendar provider connections. Not broken as earlier versions claimed.

**Entry-type filters**: Use `<Badge>` component instead of `BlogFilterChip` per spec.

**Reschedule API**: Lacks optimistic concurrency and RBAC enforcement.

---

## Staffing Spec (`specs/staffing/SPEC.md`)

### Status: Core scheduling works, polish gaps

**Recommendations page**: Uses bare `<Card>` ladder layout instead of design system components.

**CoverageBar**: Not extracted as a reusable primitive despite being specified.

**Labor budget alerts**: Not surfaced in UI despite backend support.

---

## Contracts Spec (`specs/contracts/SPEC.md`)

### Status: Redirects to events/contracts

- No SLA breach recording UI
- Pastel background violations
- No Renew action for VendorContracts
- Contract commands not routed through manifest IR

---

## Search Spec (`specs/general/search.md`)

### Status: Basic search exists, spec features missing

- Card grid instead of ResearchTable for results
- Select dropdown instead of BlogFilterChip for filters
- No saved searches (entire feature missing — no model, no API, no UI)
- No search history (entire feature missing)
- No secondary filters (status, date-range, tags)

---

## Tools Spec (`specs/general/tools.md`)

### Status: AI tools partially built, design system violations

- Zero `BlogFilterChip` or `ResearchTable` usage
- No `MetricBand` for summary statistics
- Ad-hoc colors instead of design-system tokens
- ~50 bare Card violations
- 4 copies of StatCard (should be single shared component)

---

## Settings Spec (inferred from general specs)

### Status: Functional but monolithic

- **332 bare Card violations** across tools (142) and settings (190)
- Integrations-client.tsx: 2,064 lines (monolithic)
- Notifications-client.tsx: 1,714 lines (monolithic)
- Rate limits: full API, zero UI
- MFA link: zero implementation
- Audit writer: exists but never called (P1.H)

---

## Design System Adoption Summary

| Component | Spec Target | Actual Adopters | Gap |
|-----------|-------------|-----------------|-----|
| ResearchTable | 50+ pages | ~15 | 35+ pages |
| BlogFilterChip | 40+ pages | ~6 | 34+ pages |
| ContactFormCard | All create/edit forms | 0 | All forms |
| ModuleLanding | 20+ modules | 7 | 13+ modules |
| MetricBand | All dashboard metrics | ~5 | Most dashboards |
| Empty state primitive | 40+ pages | ~16 | 24+ pages |

---

## Dead Packages

Confirmed zero-import packages (candidates for removal):

| Package | Imports | Notes |
|---------|---------|-------|
| `packages/ai/` | 0 | Re-exports bare Vercel AI SDK |
| `packages/brand/` | 0 | Wrong naming (`@capsule/` vs `@repo/`) |
| `packages/kitchen-state-transitions/` | 0 | State logic handled inline |
| `packages/sales-reporting/` | 1 (API only) | No frontend UI |

---

## Methodology Notes

Spec comparison conducted by:
1. Reading all spec files under `specs/` (50+ files across 11 directories)
2. Mapping spec requirements to actual implementation files
3. Cross-referencing with code audit findings (P0/P1/P2 items)
4. Identifying design system adoption gaps via grep analysis
5. Verifying dead package status via import analysis
