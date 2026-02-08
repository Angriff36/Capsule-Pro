# Implementation Plan: Performance & Hydration Optimization

**Date**: 2025-02-07
**Project**: Capsule Pro (next-forge)
**Focus**: Performance enhancements, hydration resistance, code quality improvements, events page overhaul

---

## Executive Summary

This implementation plan addresses critical performance and hydration issues identified across the codebase. The research found patterns that cause hydration mismatches, performance bottlenecks, and code maintainability concerns.

### Key Findings

1. **CRITICAL: Events Page Monolith** - `event-details-client.tsx` is **3,064 lines** (10x the 300-line guideline)
2. **Hydration Risks**: Intl.NumberFormat/DateTimeFormat without explicit locale, useState with new Date() during render
3. **Non-deterministic Rendering**: Array index keys in multiple components
4. **Performance Issues**: No caching strategy, broad middleware matcher, setTimeout without cleanup
5. **Server Component Overload**: Events page server component has 8 complex database queries

### Scope

This plan covers **two applications**:
- **apps/web** - Marketing site (hydration fixes, caching)
- **apps/app** - Main application (events page overhaul, performance)

---

## Priority Classifications

- **P0 (Critical)**: Data loss, security vulnerabilities, production-breaking issues, 1000+ line components
- **P1 (High)**: Major UX impact, performance degradation, hydration errors
- **P2 (Medium)**: Minor UX issues, code quality improvements
- **P3 (Low)**: Nice-to-have optimizations, polish

---

## Phase 0: Events Page Overhaul (P0 - CRITICAL)

### Task 0.1: Split Event Details Client Component
**Priority**: P0 (Critical)
**File**: `C:\projects\capsule-pro\apps\app\app\(authenticated)\events\[eventId]\event-details-client.tsx` (3,064 lines)

**Problem**: Massive client component with 70 hooks, complex state management, and hydration risks. Violates the 300-line component guideline by 10x.

**Acceptance Criteria**:
- [ ] Create component directory: `event-details-client/`
- [ ] Extract EventOverview section (~300 lines)
- [ ] Extract MenuIntelligence section (~400 lines)
- [ ] Extract AIInsights section (~300 lines)
- [ ] Extract GuestManagement section (~300 lines)
- [ ] Extract EventExplorer section (~400 lines)
- [ ] Extract RecipeDrawer modal (~200 lines)
- [ ] Extract filters, modals, and dialogs (~500 lines)
- [ ] Main component reduced to <200 lines (composition only)
- [ ] All extracted components have proper TypeScript types
- [ ] No functionality regressions

**Implementation Structure**:
```
event-details-client/
  ├── index.tsx              # Main composition (<200 lines)
  ├── event-overview.tsx     # Event info, media, stats
  ├── menu-intelligence.tsx  # Dishes, ingredients, inventory
  ├── ai-insights.tsx        # Summary, task breakdown, suggestions
  ├── guest-management.tsx   # RSVPs, guest list
  ├── event-explorer.tsx     # Related events, filtering, timeline
  ├── recipe-drawer.tsx      # Recipe details sheet
  ├── filters-panel.tsx      # Event filters sidebar
  └── hooks.ts               # Extracted custom hooks
```

**Dependencies**: None
**Estimated Time**: 8 hours

---

### Task 0.2: Optimize Server Data Fetching
**Priority**: P0 (Critical)
**File**: `C:\projects\capsule-pro\apps\app\app\(authenticated)\events\[eventId]\page.tsx` (540 lines)

**Problem**: Server component performs 8 complex database queries synchronously, causing slow page loads.

**Current Queries**:
1. Event basic info (findFirst)
2. RSVP count (count)
3. Event dishes with joins ($queryRaw)
4. Recipe versions with DISTINCT ON ($queryRaw)
5. Recipe ingredients with joins ($queryRaw)
6. Recipe steps ($queryRaw)
7. Inventory items ($queryRaw)
8. Inventory stock with aggregation ($queryRaw)
9. Prep tasks ($queryRaw)
10. Related events with guest counts (findMany + groupBy)

**Acceptance Criteria**:
- [ ] Create `event-details-data.ts` for data fetching functions
- [ ] Implement parallel data fetching with Promise.all() where safe
- [ ] Add React.cache() for deduplicating queries
- [ ] Consider streaming with Suspense for slower sections
- [ ] Add error handling for each query
- [ ] Page component reduced to <200 lines
- [ ] Document data dependencies

**Implementation**:
```typescript
// Parallel independent queries
const [event, rsvpCount, eventDishes] = await Promise.all([
  getEvent(eventId, tenantId),
  getRsvpCount(eventId, tenantId),
  getEventDishes(eventId, tenantId),
]);

// Dependent queries after
const recipeDetails = eventDishes.length > 0
  ? await getRecipeDetails(eventDishes, tenantId)
  : [];
```

**Dependencies**: None
**Estimated Time**: 4 hours

---

### Task 0.3: Fix Hydration Issues in Event Details
**Priority**: P0 (Critical)
**Files**:
- `C:\projects\capsule-pro\apps\app\app\(authenticated)\events\[eventId]\event-details-client.tsx` (lines 164-213)
- Formatters at component level causing server/client divergence

**Problems**:
1. Intl formatters created at module level (lines 164-181)
2. `getTimeZoneLabel()` uses Intl during render (line 207)
3. `setInterval` updates `now` state every 30s (line 340)
4. `localStorage` accessed in useEffect without hydration check (line 351)

**Acceptance Criteria**:
- [ ] Move Intl formatters to useMemo with locale dependency
- [ ] Use server-provided timezone in props, not detected
- [ ] Add proper cleanup for setInterval
- [ ] Implement localStorage hydration-safe pattern
- [ ] No hydration warnings in browser console

**Implementation**:
```typescript
// Intl formatters - useMemo with locale
const formatters = useMemo(() => ({
  currency: new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }),
  date: new Intl.DateTimeFormat(locale, dateOptions),
}), [locale]);

// Timezone - from server
const timeZone = event.timeZone || 'UTC';

// setInterval - proper cleanup
useEffect(() => {
  const interval = setInterval(() => setNow(new Date()), 30000);
  return () => clearInterval(interval);
}, []);

// localStorage - hydration safe
const [isClient, setIsClient] = useState(false);
useEffect(() => setIsClient(true), []);
const savedEvents = isClient ? localStorage.getItem('saved-events') : null;
```

**Dependencies**: Task 0.1
**Estimated Time**: 2 hours

---

### Task 0.4: Lazy Load Heavy Event Components
**Priority**: P1 (High)
**File**: `C:\projects\capsule-pro\apps\app\app\(authenticated)\events\[eventId]\page.tsx`

**Problem**: Battle board, task breakdown, and related events loaded eagerly.

**Acceptance Criteria**:
- [ ] Battle board link uses standard href (no preload)
- [ ] Event explorer section uses dynamic import
- [ ] AI insights section lazy-loaded
- [ ] Add loading skeletons for lazy sections
- [ ] Measure bundle size reduction

**Dependencies**: Task 0.1
**Estimated Time**: 2 hours

---

## Phase 1: Hydration Resistance Fixes (P1)

### Task 1.1: Fix Intl.NumberFormat without Locale
**Priority**: P1 (High)
**Files**:
- `C:\projects\capsule-pro\apps\web\app\[locale]\(home)\components\stats.tsx` (line 36)
- `C:\projects\capsule-pro\apps\web\components\sidebar.tsx` (line 21)

**Problem**: Intl.NumberFormat and Intl.DateTimeFormat are called without explicit locale, causing server/client rendering differences.

**Acceptance Criteria**:
- [ ] All Intl.NumberFormat calls specify locale parameter (e.g., `Intl.NumberFormat("en-US")`)
- [ ] All Intl.DateTimeFormat calls specify locale parameter
- [ ] Components receive locale as prop from parent context
- [ ] No hydration warnings in browser console
- [ ] Tests pass: `pnpm test`

**Implementation**:
```typescript
// Before
new Intl.NumberFormat().format(value)

// After
new Intl.NumberFormat(locale || "en-US").format(value)
```

**Dependencies**: None
**Estimated Time**: 1 hour

---

### Task 1.2: Fix useState with new Date() Initialization
**Priority**: P1 (High)
**File**: `C:\projects\capsule-pro\apps\web\app\[locale]\contact\components\contact-form.tsx` (line 23)

**Problem**: `useState<Date | undefined>(new Date())` initializes with current time, causing different values on server vs client.

**Acceptance Criteria**:
- [ ] Date state initialized lazily or from server-provided prop
- [ ] No hydration mismatch warnings
- [ ] Form still functions correctly for date selection
- [ ] Tests pass

**Implementation Options**:
1. Use lazy initialization: `useState(() => new Date())`
2. Use undefined initial state: `useState<Date | undefined>()`

**Dependencies**: None
**Estimated Time**: 30 minutes

---

### Task 1.3: Replace suppressHydrationWarning with Proper Fix
**Priority**: P2 (Medium)
**File**: `C:\projects\capsule-pro\apps\web\app\[locale]\layout.tsx` (line 28)

**Problem**: `suppressHydrationWarning` on `<html>` tag suppresses all hydration warnings instead of fixing root cause.

**Acceptance Criteria**:
- [ ] Remove suppressHydrationWarning if safe
- [ ] Or document why it's necessary with inline comment
- [ ] No hydration errors occur after change
- [ ] Tests pass

**Investigation Needed**: Determine why the warning exists (likely due to `lang="en"` vs dynamic locale)

**Dependencies**: Task 1.1
**Estimated Time**: 30 minutes

---

### Task 1.4: Fix Non-Deterministic Array Keys
**Priority**: P1 (High)
**Files**:
- `C:\projects\capsule-pro\apps\web\app\[locale]\contact\components\contact-form.tsx` (line 40)
- `C:\projects\capsule-pro\apps\web\app\[locale]\(home)\components\stats.tsx` (line 24)
- `C:\projects\capsule-pro\apps\web\app\[locale]\(home)\components\faq.tsx` (line 41)
- `C:\projects\capsule-pro\apps\web\app\[locale]\(home)\components\testimonials.tsx` (line 51)
- `C:\projects\capsule-pro\apps\web\app\[locale]\components\header\index.tsx` (line 96)

**Problem**: Using array index as React key causes issues when items are reordered or filtered.

**Acceptance Criteria**:
- [ ] All .map() iterations use unique, stable keys from data
- [ ] Keys derived from data (IDs, slugs, titles) not indices
- [ ] No warnings in React DevTools
- [ ] Tests pass

**Implementation**:
```typescript
// Before
{items.map((item, index) => <div key={index}>...</div>)}

// After (use unique identifier)
{items.map((item) => <div key={item.id || item.slug || item.title}>...</div>)}
```

**Dependencies**: None
**Estimated Time**: 2 hours

---

## Phase 2: Performance Enhancements (P1-P2)

### Task 2.1: Add Caching Strategy to Pages
**Priority**: P1 (High)
**Files**: All page.tsx files in `apps/web/app/[locale]`

**Problem**: No export of `revalidate`, `dynamic`, or `fetchCache` config - Next.js uses defaults.

**Acceptance Criteria**:
- [ ] Home page: `export const revalidate = 3600` (1 hour)
- [ ] Blog listing: `export const revalidate = 1800` (30 minutes)
- [ ] Contact/Pricing: `export const revalidate = 86400` (24 hours)
- [ ] Legal pages: `export const revalidate = 86400` (24 hours)
- [ ] Dynamic routes add ISR where appropriate
- [ ] Document caching strategy in project README
- [ ] Build succeeds with cache headers

**Dependencies**: None
**Estimated Time**: 2 hours

---

### Task 2.2: Optimize Middleware Matcher
**Priority**: P2 (Medium)
**File**: `C:\projects\capsule-pro\apps\api\middleware.ts` (line 4)

**Problem**: Overly broad matcher `"/((?!_next|[^?]*\\.(?:html?|css...)).*)"` runs middleware on every request.

**Acceptance Criteria**:
- [ ] Exclude static assets explicitly
- [ ] Exclude public routes that don't need middleware
- [ ] Document which routes require middleware
- [ ] Verify middleware still runs where needed
- [ ] Tests pass

**Implementation**:
```typescript
// More specific matcher - only run for authenticated routes and API
matcher: [
  "/(api|trpc)(.*)",
  "/app/:path*",
  "/dashboard/:path*"
]
```

**Dependencies**: None
**Estimated Time**: 1 hour

---

### Task 2.3: Fix setTimeout Without Cleanup
**Priority**: P1 (High)
**Files**:
- `C:\projects\capsule-pro\apps\web\app\[locale]\(home)\components\cases.tsx` (line 37)
- `C:\projects\capsule-pro\apps\web\app\[locale]\(home)\components\testimonials.tsx` (line 31)

**Problem**: setTimeout in useEffect without cleanup function causes memory leaks and potential errors.

**Acceptance Criteria**:
- [ ] All setTimeout/setInterval have cleanup functions
- [ ] Use refs for mutable values in timeouts
- [ ] Verify no memory leaks in React DevTools profiler
- [ ] Carousels still auto-rotate correctly
- [ ] Tests pass

**Implementation**:
```typescript
useEffect(() => {
  if (!api) return;

  const timeoutId = setTimeout(() => {
    // ... code
  }, 4000);

  return () => clearTimeout(timeoutId);
}, [api, current]);
```

**Dependencies**: None
**Estimated Time**: 1 hour

---

### Task 2.4: Add Dynamic Imports for Heavy Dependencies
**Priority**: P2 (Medium)
**Files**: Large client components identified

**Problem**: Heavy components loaded synchronously, increasing initial bundle size.

**Acceptance Criteria**:
- [ ] Identify heavy dependencies (charting libraries, rich text editors)
- [ ] Add dynamic imports with loading states
- [ ] Measure bundle size improvement
- [ ] Verify components load correctly
- [ ] Build succeeds

**Implementation**:
```typescript
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton />,
  ssr: false
});
```

**Dependencies**: None
**Estimated Time**: 3 hours (requires bundle analysis)

---

## Phase 3: Code Quality Improvements (P2-P3)

### Task 3.1: Extract Navigation Logic from Header
**Priority**: P2 (Medium)
**File**: `C:\projects\capsule-pro\apps\web\app\[locale]\components\header\index.tsx` (199 lines)

**Problem**: Header component is approaching size limit (199 lines, should be <300). Navigation logic could be extracted.

**Acceptance Criteria**:
- [ ] Extract navigation items config to separate file
- [ ] Extract mobile menu to separate component
- [ ] Extract desktop menu to separate component
- [ ] Header component reduced to <150 lines
- [ ] Tests pass
- [ ] No visual regressions

**Implementation**:
```
components/
  header/
    index.tsx (main header)
    navigation-config.ts
    desktop-nav.tsx
    mobile-nav.tsx
    language-switcher.tsx
```

**Dependencies**: None
**Estimated Time**: 2 hours

---

### Task 3.2: Extract Footer Navigation Config
**Priority**: P3 (Low)
**File**: `C:\projects\capsule-pro\apps\web\app\[locale]\components\footer.tsx` (118 lines)

**Problem**: Navigation items mixed with component logic.

**Acceptance Criteria**:
- [ ] Extract navigation items to config file
- [ ] Simplify component logic
- [ ] Footer component reduced to <80 lines
- [ ] Tests pass

**Dependencies**: None
**Estimated Time**: 1 hour

---

### Task 3.3: Add Component Documentation
**Priority**: P3 (Low)
**Files**: All components in `apps/web/app/[locale]/components`

**Problem**: Missing JSDoc comments for complex components.

**Acceptance Criteria**:
- [ ] Add JSDoc to Header, Footer, Form components
- [ ] Document prop types and purposes
- [ ] Document any non-obvious behavior

**Dependencies**: None
**Estimated Time**: 2 hours

---

## Phase 4: Testing & Validation (P1)

### Task 4.1: Add Hydration Testing
**Priority**: P1 (High)
**File**: New test files

**Problem**: No automated tests for hydration issues.

**Acceptance Criteria**:
- [ ] Create test suite for server component rendering
- [ ] Create test suite for client component hydration
- [ ] Test Intl formatting with different locales
- [ ] Test form state initialization
- [ ] CI/CD runs tests automatically
- [ ] All tests pass

**Implementation**:
```typescript
// Example hydration test
import { render } from '@testing-library/react'

describe('Hydration', () => {
  it('should render Stats component without hydration mismatch', () => {
    const { container } = render(<Stats dictionary={mockDict} />)
    expect(container).toMatchSnapshot()
  })
})
```

**Dependencies**: Tasks 1.1-1.4
**Estimated Time**: 4 hours

---

### Task 4.2: Performance Benchmarking
**Priority**: P2 (Medium)
**File**: New performance tests

**Problem**: No baseline performance metrics.

**Acceptance Criteria**:
- [ ] Establish baseline Lighthouse scores
- [ ] Measure Time to First Byte (TTFB)
- [ ] Measure Largest Contentful Paint (LCP)
- [ ] Measure Cumulative Layout Shift (CLS)
- [ ] Document current metrics
- [ ] Set targets for improvement

**Dependencies**: Task 2.1, 2.2
**Estimated Time**: 3 hours

---

## Execution Order

### Week 1: Events Page Overhaul (CRITICAL)
1. Task 0.1: Split event-details-client into components (8h)
2. Task 0.2: Optimize server data fetching (4h)
3. Task 0.3: Fix hydration issues in event details (2h)
4. Task 0.4: Lazy load heavy components (2h)

**Total**: 16 hours

### Week 2: Critical Hydration Fixes (apps/web)
1. Task 1.1: Fix Intl usage (1h)
2. Task 1.2: Fix useState Date initialization (0.5h)
3. Task 1.4: Fix array keys (2h)
4. Task 2.3: Fix setTimeout cleanup (1h)
5. Task 4.1: Add hydration tests (4h)

**Total**: 8.5 hours

### Week 3: Performance & Code Quality
1. Task 1.3: Address suppressHydrationWarning (0.5h)
2. Task 2.1: Add caching strategy (2h)
3. Task 2.2: Optimize middleware (1h)
4. Task 3.1: Extract header navigation (2h)
5. Task 4.2: Performance benchmarking (3h)

**Total**: 8.5 hours

### Week 4: Final Polish
1. Task 2.4: Dynamic imports (3h)
2. Task 3.2: Extract footer config (1h)
3. Task 3.3: Add documentation (2h)

**Total**: 6 hours

**Grand Total**: 39 hours (~5 weeks part-time)

---

## Validation Checklist

Before marking this plan complete, ensure:

- [ ] All hydration warnings eliminated from browser console
- [ ] No React 18/19 strict mode warnings
- [ ] Lighthouse scores >= 90 across all metrics
- [ ] Bundle size reduced by at least 10% (measure before/after)
- [ ] All tests pass: `pnpm test`
- [ ] Build succeeds: `pnpm build`
- [ ] No linting errors: `pnpm lint`
- [ ] Code properly formatted: `pnpm format`
- [ ] No TypeScript errors
- [ ] Manual testing of all pages (home, contact, pricing, blog)
- [ ] Performance regression tests pass

---

## Notes

### Current State Assessment

**apps/app (Main Application)**
- CRITICAL: `event-details-client.tsx` is **3,064 lines** - requires immediate refactoring
- `page.tsx` (events page) is 540 lines with 10 database queries - needs optimization
- Good separation of concerns in most other areas
- Some hydration issues with Intl formatters and localStorage

**apps/web (Marketing Site)**
- Largest component: 199 lines (Header) - acceptable, near but under 300-line guideline
- Main issues are hydration risks and missing caching strategy
- Good component separation overall

### Recommended Tooling
Consider adding:
- `@next/bundle-analyzer` for bundle size tracking
- `webpack-bundle-analyzer` for visualization
- Lighthouse CI for automated performance testing
- Playwright for hydration testing

---

## Appendix: File Inventory

### Files Requiring Changes

**CRITICAL - Events Page Overhaul (apps/app):**
1. `apps/app/app/(authenticated)/events/[eventId]/event-details-client.tsx` (**3,064 lines**)
2. `apps/app/app/(authenticated)/events/[eventId]/page.tsx` (540 lines)

**Hydration Issues (apps/web):**
3. `apps/web/app/[locale]/(home)/components/stats.tsx` (54 lines)
4. `apps/web/app/[locale]/contact/components/contact-form.tsx` (119 lines)
5. `apps/web/app/[locale]/(home)/components/faq.tsx` (51 lines)
6. `apps/web/app/[locale]/(home)/components/testimonials.tsx` (80 lines)
7. `apps/web/app/[locale]/components/header/index.tsx` (199 lines)
8. `apps/web/components/sidebar.tsx` (50 lines)
9. `apps/web/app/[locale]/layout.tsx` (45 lines)

**Performance Issues:**
10. `apps/web/app/[locale]/(home)/components/cases.tsx` (80 lines)
11. `apps/api/middleware.ts` (10 lines)
12. All page.tsx files (need cache headers)

**Code Quality:**
13. `apps/web/app/[locale]/components/footer.tsx` (118 lines)

**Total Files**: 13 files requiring direct modification
**Total Lines of Code**: ~4,200 lines (including 3,604 lines from events page)
**Estimated Impact**: Critical - addresses massive monolithic component and critical hydration issues
