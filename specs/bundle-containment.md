Here is the same guidance converted into a clean implementation spec you can drop into your planning system. This is written as an actionable engineering spec, not conversational guidance.

---

# Bundle Containment & Runtime Weight Reduction Spec

## Objective

Reduce unnecessary JavaScript shipped to the browser and edge runtime by isolating heavyweight dependencies behind execution boundaries, narrowing middleware scope, and restructuring instrumentation imports.

Success criteria:

* Shared client bundle size decreases
* `/analytics/sales` route payload decreases
* Edge instrumentation bundle size decreases
* Middleware executes only where required
* Analyzer shows heavyweight libraries moved into isolated chunks

---

## Scope

### In Scope

* Lazy loading of heavyweight client libraries
* Instrumentation import restructuring
* Middleware matcher restriction
* Analyzer-driven dependency tracing

### Out of Scope

* Feature removal
* Architectural rewrites
* Library replacement
* Server runtime refactors
* UI/UX changes

---

## Constraints

* Must follow documented Next.js mechanisms:

  * Dynamic imports (`next/dynamic`, `import()`)
  * Instrumentation conventions
  * Middleware `matcher` configuration
* Must not alter functional behavior
* Must preserve existing route functionality

References:

* Lazy Loading: [https://nextjs.org/docs/app/guides/lazy-loading](https://nextjs.org/docs/app/guides/lazy-loading)
* Instrumentation: [https://nextjs.org/docs/app/guides/instrumentation](https://nextjs.org/docs/app/guides/instrumentation)
* Middleware Matching: [https://nextjs.org/docs/13/pages/building-your-application/routing/middleware](https://nextjs.org/docs/13/pages/building-your-application/routing/middleware)
* Bundle Analysis / Tracing: [https://nextjs.org/docs/app/guides/package-bundling](https://nextjs.org/docs/app/guides/package-bundling)

---

## Identified Targets

### Client Bundle

Heavy dependencies currently bundled eagerly:

* react-pdf
* pdfkit
* xlsx
* instrumentation-client
* analytics/sales visualization stack

### Edge Bundle

* edge instrumentation module (~1.55MB)
* telemetry / UA parsing imports

### Middleware

* Global execution across route space

---

## Requirements

### R1 — Client Dependency Isolation

#### Goal

Ensure heavyweight libraries load only when required by user interaction or route execution.

#### Implementation Requirements

1. Locate import sites of:

   * react-pdf
   * pdfkit
   * xlsx
   * instrumentation-client

2. If imported in:

   * Layouts
   * Providers
   * Shared components
   * Barrel index exports

   → Refactor to leaf usage boundary.

3. Replace eager imports with documented lazy mechanisms:

   **Client Components**

   * Use `next/dynamic`

   **Library Usage**

   * Use `import()` within handler scope

4. Validate analyzer output:

   * Libraries appear in separate async chunks
   * Removed from shared chunk

#### Acceptance Criteria

* Libraries absent from shared bundle
* Libraries appear only in route-specific or interaction chunks

---

### R2 — Edge Instrumentation Containment

#### Goal

Reduce edge bundle size by deferring heavyweight imports.

#### Implementation Requirements

1. Inspect `instrumentation.ts/js`
2. Move heavyweight imports inside `register()` function
3. Apply runtime gating where applicable
4. Avoid top-level imports of:

   * Telemetry frameworks
   * UA parsing
   * Non-edge-safe packages

#### Acceptance Criteria

* Reduced edge chunk size in analyzer
* No functional regression in telemetry behavior

---

### R3 — Middleware Execution Scope Reduction

#### Goal

Prevent middleware execution on irrelevant routes.

#### Implementation Requirements

1. Define explicit route targets
2. Configure:

```
export const config = {
  matcher: [...]
}
```

3. Exclude:

   * Static assets
   * Public pages
   * Unauthenticated sections

#### Acceptance Criteria

* Middleware executes only on protected routes
* Analyzer confirms unchanged bundle weight
* Latency improvements observable

---

### R4 — Import Chain Leak Identification

#### Goal

Eliminate dependency leakage into shared bundles.

#### Implementation Requirements

1. Use analyzer visualization
2. Trace oversized modules
3. Identify first shared import point
4. Refactor import location or lazy-load
5. Re-run analyzer

#### Acceptance Criteria

* Shared chunk reduction observed
* Heavy dependencies isolated
* No behavior change

---

## Validation Procedure

1. Build with analyzer enabled

2. Record:

   * Shared JS size
   * Edge chunk size
   * `/analytics/sales` route payload

3. Apply changes

4. Rebuild

5. Compare metrics

Success defined as measurable reduction in any of the above without regression.

---

## Risk Assessment

| Risk                         | Impact            | Mitigation           |
| ---------------------------- | ----------------- | -------------------- |
| Lazy boundary misplacement   | Feature breakage  | Incremental rollout  |
| Runtime conditional error    | Telemetry failure | Logging verification |
| Middleware matcher mis-scope | Auth bypass       | Integration test     |

---

## Priority Order

1. Client dependency isolation
2. Edge instrumentation containment
3. Middleware scope reduction
4. Import-chain tracing cleanup

---

## Expected Outcome

* Smaller initial client payload
* Reduced hydration surface
* Faster edge cold starts
* Lower request overhead
* Clear dependency boundaries

## Impacted Code Areas
- Primary — apps/app/
- Changes will primarily occur in the application runtime layer:
- apps/app/middleware.ts
- Restrict middleware execution scope via config.matcher
- apps/app/instrumentation.ts
- Move heavy imports inside register() and gate runtime-specific logic
- Route-specific feature code
- apps/app/app/analytics/sales/**
- Apply lazy loading boundaries to heavyweight libraries
- Shared client entry points
- Root layouts / providers
- apps/app/app/**/layout.tsx
- apps/app/app/**/providers.tsx
- Remove eager imports that pollute shared bundles
- Conditional — packages/*
- Only if analyzer traces show shared package leakage:
- packages/ui/** or packages/design-system/**
- Remove heavy deps from reusable components or barrel exports
- Observability / telemetry packages
- Prevent client instrumentation from entering shared bundles
- Realtime / integration wrappers (e.g. Ably)
- Move initialization to feature boundary
- Unlikely — apps/api/
- Modifications expected only if:
- Shared packages introduce bundle leakage
- Instrumentation or middleware logic overlaps