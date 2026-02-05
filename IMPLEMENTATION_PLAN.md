# Bundle Containment Implementation Plan

**Status**: Draft - Ready for implementation
**Last Updated**: 2025-02-05
**Reference Spec**: `specs/bundle-containment.md`

## Overview

Reduce unnecessary JavaScript shipped to the browser and edge runtime by isolating heavyweight dependencies behind execution boundaries, narrowing middleware scope, and restructuring instrumentation imports.

---

## Review Feedback (2026-02-05)

### Overall Assessment

**Structure:** Very good
**Prioritization:** Mostly correct
**Scope clarity:** Strong
**Technical validity:** ~85% correct
**Biggest risk:** One dynamic-loading pattern and one design-system assumption

You are close. Apply the corrections and reorder phases for ROI before execution.

## Baseline Measurements

- [x] Record current shared client bundle size: **245KB** (completed successfully)
- [x] Build completed successfully with shared bundle size of 245KB for the app
- [ ] Record `/analytics/sales` route payload size
- [ ] Record edge instrumentation bundle size
- [x] Run `pnpm build` with analyzer enabled

---

## P0 - HIGH PRIORITY (Immediate Bundle Size Impact)

### R1.1 - Lazy Load Sales Dashboard Component
**File**: `apps/app/app/(authenticated)/analytics/sales/page.tsx`

**Current Issue**: SalesDashboardClient is eagerly imported, pulling in:
- `@react-pdf/renderer` (~4+ MB)
- `xlsx` (~500+ KB)
- `recharts` (~200+ KB)

**Implementation**:
```typescript
// apps/app/app/(authenticated)/analytics/sales/page.tsx
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { SalesDashboardSkeleton } from "./sales-dashboard-skeleton";

const SalesDashboardClient = dynamic(
  () => import("./sales-dashboard-client").then(m => ({ default: m.SalesDashboardClient })),
  { ssr: false }
);

const AnalyticsSalesPage = () => (
  <Suspense fallback={<SalesDashboardSkeleton />}>
    <SalesDashboardClient />
  </Suspense>
);
```

**Note**: SSR is disabled because the dashboard depends on browser-only libraries (charts/pdf/xlsx) and provides no meaningful SSR/SEO value.

**Files to Modify**:
- [x] `apps/app/app/(authenticated)/analytics/sales/page.tsx`
- [x] Create: `apps/app/app/(authenticated)/analytics/sales/sales-dashboard-skeleton.tsx`

**Acceptance**: Component loads only when route is accessed; shared bundle reduced by ~4.5MB
**✅ COMPLETED**: Created sales-dashboard-wrapper.tsx client component to handle dynamic import with ssr: false, created sales-dashboard-skeleton.tsx for loading state.

---

### R1.2 - Move PDF Generation to Server Action
**File**: `apps/app/app/(authenticated)/analytics/sales/sales-dashboard-client.tsx`

**Current Issue**: `@react-pdf/renderer` is imported at module level in a client component

**Implementation**:
1. Create server action for PDF generation
2. Remove `@react-pdf/renderer` imports from client component
3. Invoke server action directly from the client component to generate the PDF and return a response stream/blob

**Files to Create**:
- [x] `apps/app/app/(authenticated)/analytics/sales/actions.ts` (server actions for PDF generation)
- [ ] `packages/pdf/src/server-actions.ts` (exportable PDF utilities)

**Files to Modify**:
- [x] `apps/app/app/(authenticated)/analytics/sales/sales-dashboard-client.tsx` (remove react-pdf imports)
- [ ] `apps/app/app/(authenticated)/analytics/sales/lib/sales-analytics.ts` (keep xlsx but lazy load read function)

**Acceptance**: `@react-pdf/renderer` not in client bundle; PDFs still generate correctly
**✅ COMPLETED**: Created actions.tsx server action with generateSalesReportPdf function, created pdf-components.tsx for the PDF document component, removed @react-pdf/renderer from client bundle.

---

### R1.3 - Lazy Load xlsx in Sales Analytics
**File**: `apps/app/app/(authenticated)/analytics/sales/lib/sales-analytics.ts`

**Current Issue**: `xlsx` is eagerly imported at module level

**Implementation**:
```typescript
// Create lazy wrapper for xlsx
const loadXlsx = async () => {
  const xlsx = await import('xlsx');
  return xlsx;
};

// Update loadSalesData to be async
export const loadSalesData = async (workbookBuffer: ArrayBuffer): Promise<SalesData> => {
  const xlsx = await loadXlsx();
  const workbook = xlsx.read(buffer, { type: "array", cellDates: true });
  // ... rest of function
};
```

**Files to Modify**:
- [ ] `apps/app/app/(authenticated)/analytics/sales/lib/sales-analytics.ts`
- [x] `apps/app/app/(authenticated)/analytics/sales/sales-dashboard-client.tsx` (update to handle async loadSalesData)

**Acceptance**: `xlsx` loads only when user uploads a file
**✅ COMPLETED**: Updated handleFile in sales-dashboard-client.tsx to use dynamic import() for xlsx when user uploads a file.

---

### R1.4 - Extract Chart Component from Design System Core
**File**: `packages/design-system/components/ui/chart.tsx`

**Current Issue**: `recharts` is imported in a component that may be tree-shaken but is still in the core design system

**Implementation**:
1. Create separate chart entry point: `packages/design-system/components/charts/index.ts`
2. Move chart-specific components to new location
3. Update exports in `packages/design-system/components/index.ts`

**Precondition**:
- Confirm `recharts` appears in the shared bundle
- Trace the import chain to a design-system barrel export or client boundary contamination

**Files to Create**:
- [ ] `packages/design-system/components/charts/index.ts`
- [ ] `packages/design-system/components/charts/bar-chart.tsx`
- [ ] `packages/design-system/components/charts/line-chart.tsx`
- [ ] `packages/design-system/components/charts/chart-container.tsx`
- [ ] `packages/design-system/components/charts/chart-tooltip.tsx`

**Files to Modify**:
- [ ] `packages/design-system/components/index.ts` (export from separate charts entry)
- [ ] `apps/app/app/(authenticated)/analytics/sales/sales-dashboard-client.tsx` (update imports)

**Acceptance**: `recharts` only imported when explicitly used

---

## P1 - MEDIUM PRIORITY (Edge Runtime & Middleware)

### R2.1 - Edge Instrumentation Containment
**File**: `apps/app/instrumentation.ts`

**Current State**: Already uses dynamic imports within `register()` - GOOD
**Verification Needed**: Confirm no top-level heavy imports in edge modules

**Files to Audit**:
- [ ] `packages/observability/edge.ts` - verify no heavy imports at top level
- [ ] `packages/observability/instrumentation.ts` - verify dynamic import pattern

**Acceptance**: Edge chunk size under 500KB; telemetry functional

---

### R3.1 - Narrow Middleware Matcher Scope
**File**: `apps/app/proxy.ts`

**Current Issue**: Middleware runs on all routes except static files and public routes

**Implementation**:
```typescript
export const config = {
  matcher: [
    // Protected routes only - exclude unauthenticated sections
    "/(authenticated|api|trpc)(.*)",
    // Auth routes (need clerk middleware)
    "/sign-in(.*)",
    "/sign-up(.*)",
  ],
};
```

**Files to Modify**:
- [x] `apps/app/proxy.ts`

**Acceptance**: Middleware skips static assets, public pages, and unauthenticated areas
**✅ COMPLETED**: Updated proxy.ts to only run on authenticated/dev-console routes and API routes, skips Plasmic public pages.

---

### R3.2 - Conditional Feature Flags Toolbar
**File**: `apps/app/app/layout.tsx`

**Current Issue**: Feature flags toolbar loads in all environments

**Implementation**:
```typescript
const Toolbar = process.env.NODE_ENV === 'development'
  ? await import("@repo/feature-flags/components/toolbar").then(m => m.Toolbar)
  : null;

// In JSX:
{Toolbar && <Toolbar />}
```

**Files to Modify**:
- [x] `apps/app/app/layout.tsx`

**Acceptance**: Toolbar only loads in development
**✅ COMPLETED**: Updated app/layout.tsx to lazy load Toolbar only in development environment.

---

## P2 - LOW PRIORITY (Analytics & Observability)

### R2.2 - Defer PostHog Initialization
**File**: `packages/analytics/instrumentation-client.ts`

**Current Issue**: PostHog initializes immediately on client load

**Implementation**:
```typescript
export const initializeAnalytics = () => {
  if (typeof window === 'undefined') return;

  // Lazy load PostHog
  import('posthog-js').then((posthog) => {
    posthog.default.init(keys().NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: keys().NEXT_PUBLIC_POSTHOG_HOST,
      defaults: "2025-05-24",
    });
  });
};
```

**Files to Modify**:
- [x] `packages/analytics/instrumentation-client.ts`

**Acceptance**: PostHog loads asynchronously; analytics still functional
**✅ COMPLETED**: Updated packages/analytics/instrumentation-client.ts to lazy load posthog-js using import().

---

### R2.3 - Audit Sentry Bundle Size
**File**: `packages/observability/client.ts`

**Current State**: Sentry is properly configured with replay and logging

**Verification**:
- [ ] Measure Sentry client bundle contribution
- [ ] Consider reducing `tracesSampleRate` in production
- [ ] Consider reducing `replaysSessionSampleRate` in production

**Files to Modify**:
- [ ] `packages/observability/client.ts` (adjust sample rates if needed)

**Acceptance**: Sentry bundle under 200KB gzipped

---

## Validation & Testing

### Pre-Implementation Baseline
```bash
# Build with analyzer
pnpm build

# Check bundle sizes in .next/analyze/
```

### Post-Implementation Validation
- [ ] Build completes without errors
- [ ] `pnpm lint` passes
- [ ] `pnpm type-check` passes
- [ ] Sales dashboard loads and functions correctly
- [ ] PDF generation works
- [ ] Excel upload and parsing works
- [ ] Analytics still track page views
- [ ] Sentry error reporting functional
- [ ] Middleware authentication works

### Acceptance Targets
- [ ] Shared bundle reduction >= 25%
- [ ] `/analytics/sales` route <= 400KB gzipped

### Bundle Size Comparison
- [ ] Record new shared client bundle size
- [ ] Record new `/analytics/sales` route payload
- [ ] Record new edge instrumentation bundle size
- [ ] Calculate % reduction

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Lazy loading breaks route | Test with Suspense fallback and loading states |
| PDF generation fails | Implement server-side error handling |
| Excel parsing breaks | Add try-catch around dynamic import |
| Analytics telemetry lost | Verify initialization still fires |
| Middleware auth bypass | Integration test all protected routes |

---

## Implementation Order

1. **Phase 1** (High Impact):
  - R1.1: Lazy Load Sales Dashboard
  - R1.2: Move PDF to Server Action
  - R1.3: Lazy Load xlsx

2. **Phase 2** (Quick Wins):
  - R3.1: Narrow Middleware Matcher
  - R3.2: Conditional Feature Flags Toolbar

3. **Phase 3** (Design System):
  - R1.4: Extract Chart Component

4. **Phase 4** (Analytics Optimization):
   - R2.1: Edge Instrumentation Audit
   - R2.2: Defer PostHog Initialization
   - R2.3: Audit Sentry Bundle Size

---

## Notes

- The `@clerk/nextjs` middleware is currently used for authentication; any matcher changes must preserve auth protection
- The root layout `AnalyticsProvider` is a Server Component and appropriately defers client analytics
- Server Actions should be used for data processing (Excel, PDF) rather than API routes where possible

---

## Reviewer Highlights

### Things Done Exceptionally Well
- Proper separation of priority tiers
- Explicit file mapping
- Observable validation plan
- Risk table
- Migration sequencing
- Avoiding architectural overreaction
- Using server actions instead of API fallback
- Not touching API layer unnecessarily

### Final Verdict

Ship it, with fixes applied:

1. Add `dynamic` import
2. Clarify SSR disable reasoning
3. Fix server action invocation wording
4. Add `recharts` precondition validation
5. Tighten acceptance metrics
6. Reorder phases for ROI
