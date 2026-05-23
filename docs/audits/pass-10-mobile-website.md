# Audit Archive — Pass 10: Mobile & Public Website Audit

Mobile app and public website audit including supplementary verification passes. Captured verbatim from `IMPLEMENTATION_PLAN.md` during the 2026-04-28 cleanup.

## Mobile & Public Website Audit (10th Pass)

> **Audited:** 2026-04-25
> **Scope:** `apps/mobile/` (React Native/Expo — 37 source files, 9 screens) + `apps/web/` (Next.js marketing site — 57 source files, 6 pages)
> **Method:** 6 parallel subagents (mobile API layer, mobile screens/navigation, mobile components/hooks, web SEO/i18n, web components/content, mobile-vs-web API cross-reference) + direct reads of all configuration, test, and page files. Every finding verified against source code.
> **Prior coverage:** Passes 1–9 covered API backend, shared packages, E2E tests, and authenticated web frontend (`apps/app/`). **Neither `apps/mobile/` nor `apps/web/` was systematically audited before this pass.** The 9th pass did note `apps/app/app/(authenticated)/components/notifications-provider.tsx` is imported by "mobile layout" — that refers to the responsive web layout under `apps/app/`, NOT the React Native app.

### Part A: Mobile App

#### Executive Summary

The mobile app is a **kitchen-first MVP** — 37 source files, 9 screens, ~1 test file. It focuses exclusively on kitchen task management and prep lists. The app is well-structured (Clerk auth, React Query, offline queue) but covers only a small fraction of web features. **Zero modules beyond kitchen/tasks/prep-lists have mobile screens.** No camera/barcode scanner, no biometric auth, no deep linking, no push notification registration with the backend. The app is functional for its narrow scope but is **not App Store-ready** (placeholder icons, no app.config.ts, no splash screen variations, no privacy policy URL).

| Metric | Value |
|--------|-------|
| Source files | 37 (.tsx/.ts) |
| Screens | 9 (Today, Tasks, PrepLists, PrepListDetail, MyWork, Search, Settings, Profile, SignIn) |
| Components | 10 |
| Hooks | 3 (useHaptics, useNetworkStatus, useOfflineSync) |
| Test files | 1 (`__tests__/offline-sync.test.ts`, 267 lines) |
| Navigation | React Navigation v7 (Bottom Tabs + Stack) |
| State | React Query + Zustand-like auth store + AsyncStorage offline queue |
| Auth | `@clerk/clerk-expo` with `expo-secure-store` token cache |

#### 1. Feature Completeness

**Module-by-module comparison (mobile vs web):**

| Module | Web App (`apps/app/`) | Mobile (`apps/mobile/`) | Status |
|--------|----------------------|------------------------|--------|
| Kitchen Tasks | Full CRUD, filtering, status transitions | `TasksScreen` — list, claim, release, start, complete | **SIMPLIFIED** — no filtering, no tags, no assignments UI |
| Kitchen Prep Lists | Full list, detail, generate, PDF export | `PrepListsScreen` + `PrepListDetailScreen` — view only | **SIMPLIFIED** — no generation, no PDF, view prep items + mark complete |
| Kitchen Recipes | Full CRUD, versions, scaling, nutrition | **MISSING** | Not in mobile |
| Kitchen Waste | Entry list, trends, analytics | **MISSING** | Not in mobile |
| Kitchen Allergens | Matrix, detection, conflicts | **MISSING** | Not in mobile |
| Kitchen Equipment | CRUD, scheduling, IoT | **MISSING** | Not in mobile |
| Inventory | Stock levels, transfers, cycle counts, barcode | **MISSING** | Not in mobile |
| Events | List, details, budgets, contracts, guests, import | **MISSING** | Not in mobile |
| Staff/Scheduling | Shifts, time clock, availability, certifications | **MISSING** | Not in mobile (prior plan P2.F noted "staffing/scheduling UI only has recommendations + coverage; no shift assignment UI") |
| CRM | Clients, proposals, interactions, scoring | **MISSING** | Not in mobile |
| Accounting | CoA, invoices, payments, collections | **MISSING** | Not in mobile |
| Facilities | Areas, assets, maintenance, work orders | **MISSING** | Not in mobile |
| Logistics | Dispatch, drivers, vehicles, routes, tracking | **MISSING** | Not in mobile |
| Payroll | Periods, runs, timecards, bank accounts | **MISSING** | Not in mobile |
| Procurement | POs, vendors, budget, requisitions | **MISSING** | Not in mobile |
| Command Board | Boards, cards, simulations, AI assistant | **MISSING** | Not in mobile |
| Search | Full-text across all modules | `SearchScreen` — kitchen-only search | **LIMITED** |
| Settings | Full settings (RBAC, manifests, webhooks, email templates) | `SettingsScreen` — push notification toggles only | **LIMITED** |
| Profile | Full profile management | `ProfileScreen` — display name + sign out | **LIMITED** |
| Today Dashboard | Aggregated dashboard | `TodayScreen` — task summary, upcoming prep | **SIMPLIFIED** |

**Coverage estimate: ~8% of web features have mobile equivalents (kitchen tasks + prep lists only).**

#### 2. API Contract Issues

**Mobile API client** (`src/api/client.ts`):
- Uses a centralized `apiClient` function that wraps `fetch()`
- Auth token obtained via `setAuthTokenGetter()` bridge from Clerk's `useAuth().getToken()`
- Base URL: `EXPO_PUBLIC_API_URL` env var (falls back to `NEXT_PUBLIC_API_URL`) — `App.tsx:84`

**Endpoints called by mobile app:**
- `/api/kitchen/tasks` — GET list, POST claim/release/start/complete (`mutations.ts`)
- `/api/kitchen/prep-lists` — GET list (`queries.ts`)
- `/api/kitchen/prep-lists/[id]` — GET detail (`queries.ts`)
- `/api/kitchen/prep-lists/[id]/items/[itemId]` — PATCH mark complete, update notes (`mutations.ts`)
- `/api/notifications/preferences` — GET/PUT push notification settings (`queries.ts`, `mutations.ts`)
- `/api/staff/me` — GET current user profile (`queries.ts`)

**API contract findings:**

| # | Finding | File | Line | Severity |
|---|---------|------|------|----------|
| A1 | No barcode scanner integration — mobile cannot scan inventory items | N/A (feature missing) | — | HIGH |
| A2 | Push notification tokens are NOT registered with backend — no endpoint to save Expo push tokens | `notifications/push-handlers.ts` | — | CRITICAL |
| A3 | Mobile only calls 6 endpoints vs 500+ available in backend — extreme under-coverage | `src/api/queries.ts`, `src/api/mutations.ts` | — | HIGH |
| A4 | `EXPO_PUBLIC_API_URL` has no validation — empty string would cause silent failures | `src/api/client.ts` | — | MEDIUM |
| A5 | No token refresh handling — if Clerk token expires mid-session, requests fail silently | `src/api/client.ts` | — | HIGH |

#### 3. Native Integration

| Feature | Status | Details |
|---------|--------|---------|
| Camera / Barcode Scanner | **MISSING** | No `expo-camera` or `expo-barcode-scanner` in dependencies; no camera usage in any screen |
| Push Notifications | **PARTIAL** | `expo-notifications` in dependencies; `push-handlers.ts` exists but **does not register tokens with backend**. Frontend listener only — notifications won't actually arrive. |
| Biometric Auth | **MISSING** | No `expo-local-authentication` in dependencies |
| Deep Linking | **MISSING** | No `linking` config in `AppNavigator.tsx`; no universal links configuration |
| Secure Storage | **PRESENT** | `expo-secure-store` for Clerk token cache — properly configured via `app.json` plugins |
| Haptics | **PRESENT** | `expo-haptics` in dependencies; `useHaptics` hook wraps feedback |
| Network Status | **PRESENT** | `@react-native-community/netinfo` via `useNetworkStatus` hook |
| Offline Support | **PRESENT** | AsyncStorage-based queue with FIFO processing, exponential backoff, 30s sync interval |

**App Store readiness issues:**

| # | Finding | File | Line | Severity |
|---|---------|------|------|----------|
| N1 | No `app.config.ts` — using bare `app.json` with minimal config | `app.json` | — | HIGH |
| N2 | No privacy policy URL configured | `app.json` | — | HIGH (App Store requirement) |
| N3 | No splash screen background color variation for dark mode | `app.json:10` | — | LOW |
| N4 | App name is "mobile" (slug/name) — not a product name | `app.json:3-4` | — | HIGH |
| N5 | No iOS App Store icon variation or Android adaptive icon foreground config | `app.json:17-22` | — | MEDIUM |
| N6 | No EAS build configuration (`eas.json` missing) | — | — | HIGH |
| N7 | `predictiveBackGestureEnabled: false` — disables Android back gesture | `app.json:24` | — | LOW |
| N8 | No `expo-updates` for OTA updates | `package.json` | — | MEDIUM |

#### 4. Code Quality

| # | Finding | File | Line | Severity |
|---|---------|------|------|----------|
| Q1 | TypeScript strict mode enabled | `tsconfig.json` | 4 | POSITIVE |
| Q2 | Only 1 test file — 267 lines covering offline queue only; 0 screen/component tests | `__tests__/offline-sync.test.ts` | — | HIGH |
| Q3 | Test uses `vi.mocked(AsyncStorage, true)` — `deep: true` parameter deprecated in Vitest | `__tests__/offline-sync.test.ts:57` | — | LOW |
| Q4 | Test file has retry/backoff tests that assert constant values, not actual sync behavior | `__tests__/offline-sync.test.ts:268-300` | — | MEDIUM |
| Q5 | `EventCard` component exists but is never used in any screen (dead code) | `src/components/EventCard.tsx` | — | LOW |
| Q6 | Navigation has both `index.ts` and `index.tsx` barrel files — confusing | `src/navigation/` | — | LOW |
| Q7 | No error boundary wrapping the app — unhandled errors crash to white screen | `App.tsx` | — | HIGH |
| Q8 | `OfflineBanner` component is imported but `useNetworkStatus` is called inside `AppContent`, not at the query level | `App.tsx:34-35` | — | MEDIUM |
| Q9 | React Query `refetchOnWindowFocus: false` is correct for mobile (no window focus) | `App.tsx:28` | — | POSITIVE |
| Q10 | Metro config properly excludes `.next` from other apps | `metro.config.cjs:11-17` | — | POSITIVE |

#### 5. Security

| # | Finding | File | Line | Severity |
|---|---------|------|------|----------|
| S1 | Clerk JWT stored in `expo-secure-store` (Keychain/Keystore) — secure | `App.tsx:9` | — | POSITIVE |
| S2 | No API key exposure in client code — all env vars use `EXPO_PUBLIC_` prefix | `package.json`, `App.tsx` | — | POSITIVE |
| S3 | No certificate pinning configured | — | — | MEDIUM |
| S4 | Offline queue stores action data in AsyncStorage (unencrypted) — queued task IDs visible if device compromised | `src/store/offline-queue.ts` | — | MEDIUM |
| S5 | Auth token getter bridges Clerk token to API client via closure — pattern is secure | `App.tsx:50-65` | — | POSITIVE |

---

### Part B: Public Website

#### Executive Summary

The public website is a **6-page marketing site** with i18n support (5 locales), Basehub CMS integration, Sentry monitoring, and Vercel deployment. It is well-structured with proper SSR, ISR caching, and metadata generation. However, the **blog is explicitly disabled**, the **pricing page has placeholder content** (all tiers $40/month, identical descriptions), and several components have **hardcoded English strings** that bypass the i18n dictionary. Only 1 test file exists (hydration regression tests).

| Metric | Value |
|--------|-------|
| Source files | 57 (.tsx/.ts) excluding `.next/` |
| Pages | 6 (Home, Blog, Blog/[slug], Contact, Pricing, Legal/[slug]) |
| Layouts | 2 (root locale, legal) |
| Components | 17 (7 homepage sections, 4 header parts, 1 footer, 1 contact form, 1 sidebar, 3 test mocks) |
| Test files | 1 (`__tests__/hydration.test.tsx`, 407 lines) + 3 test mocks |
| Locales | 5 (en, es, de, zh, fr, pt) |
| CMS | Basehub (GraphQL) |
| Monitoring | Sentry (edge + server + client) |

#### 1. SEO & Metadata

| # | Finding | File | Line | Severity |
|---|---------|------|------|----------|
| SEO1 | `robots.ts` properly configured — allows all, includes sitemap URL | `app/[locale]/robots.ts` | — | POSITIVE |
| SEO2 | `sitemap.ts` dynamically generates sitemap from CMS posts + legal pages | `app/[locale]/sitemap.ts` | — | POSITIVE |
| SEO3 | Homepage uses `generateMetadata()` with dictionary-based meta | `(home)/page.tsx:23-29` | — | POSITIVE |
| SEO4 | Contact page uses `generateMetadata()` with dictionary-based meta | `contact/page.tsx:15-21` | — | POSITIVE |
| SEO5 | Blog listing uses `generateMetadata()` with dictionary-based meta | `blog/page.tsx:17-24` | — | POSITIVE |
| SEO6 | **Pricing page has NO `generateMetadata()`** — no title/description for SEO | `pricing/page.tsx` | — | HIGH |
| SEO7 | `createMetadata()` from `@repo/seo/metadata` used consistently where metadata exists | All metadata pages | — | POSITIVE |
| SEO8 | No Open Graph image generation (`opengraph-image.tsx` files absent) | — | — | MEDIUM |
| SEO9 | ISR configured: home (86,400s), contact (86,400s), blog (1,800s) | Various pages | — | POSITIVE |
| SEO10 | `productionBrowserSourceMaps: true` — source maps uploaded to Sentry then deleted | `next.config.ts:15-16` | — | POSITIVE |
| SEO11 | `sitemap.ts` uses `fs.readdirSync("app")` at build time — fragile if build runs from different directory | `app/[locale]/sitemap.ts:6` | — | LOW |

#### 2. Internationalization

| # | Finding | File | Line | Severity |
|---|---------|------|------|----------|
| I1 | 5 valid locales configured: en, es, de, zh, fr, pt | `middleware.ts:5` | — | POSITIVE |
| I2 | Middleware properly redirects invalid locales to `/en` | `middleware.ts:85-91` | — | POSITIVE |
| I3 | Middleware handles bot user-agents — returns 404 for invalid locale + bot patterns | `middleware.ts:77-83` | — | POSITIVE |
| I4 | Layout validates locale via `isValidLocale()` and calls `notFound()` for invalid | `app/[locale]/layout.tsx:25-27` | — | POSITIVE |
| I5 | **Pricing page has ALL strings hardcoded in English** — no dictionary usage | `pricing/page.tsx` | Multiple | HIGH |
| I6 | Pricing page: "Prices that make sense!", "Managing a small business today is already tough." — untranslated | `pricing/page.tsx:15-16` | — | HIGH |
| I7 | Pricing tiers: "Startup", "Growth", "Enterprise", all descriptions hardcoded English | `pricing/page.tsx:24-57` | — | HIGH |
| I8 | Pricing features: "SSO", "AI Assistant", "Version Control", "Members", "Multiplayer Mode", "Orchestration" — hardcoded | `pricing/page.tsx:78-152` | — | HIGH |
| I9 | Blog page: "Blog is currently disabled" message is hardcoded English | `blog/page.tsx:39` | — | MEDIUM |
| I10 | Sidebar component date formatted with hardcoded `"en-US"` locale and `"America/New_York"` timezone | `components/sidebar.tsx:22-25` | — | MEDIUM |
| I11 | No `/[locale]/features/` page — product features only shown on homepage | — | — | LOW |
| I12 | `normalizeLocale()` handles `en-US`, `en_US`, `EN` variants correctly | `middleware.ts:43-45` | — | POSITIVE |

#### 3. Performance

| # | Finding | File | Line | Severity |
|---|---------|------|------|----------|
| P1 | Homepage is Server Component with ISR — good for performance | `(home)/page.tsx` | — | POSITIVE |
| P2 | Contact page is Server Component — no client-side data fetching | `contact/page.tsx` | — | POSITIVE |
| P3 | `next/image` remote patterns configured for `assets.basehub.com` | `next.config.ts:20-28` | — | POSITIVE |
| P4 | `typescript.ignoreBuildErrors: true` — **TypeScript errors suppressed in production builds** | `next.config.ts:17-19` | — | HIGH |
| P5 | Bundle analyzer available via `ANALYZE=true` env var | `next.config.ts:47-49` | — | POSITIVE |
| P6 | `Basehub Pump` component used for CMS data — enables streaming SSR | `(home)/page.tsx:38` | — | POSITIVE |
| P7 | 10 marketing images in `public/marketing/` — all PNG, not optimized WebP | `public/marketing/*.png` | — | MEDIUM |
| P8 | `vercel.json` only has `"ignoreCommand": "exit 0"` — no custom headers, caching, or redirects beyond Next.js config | `vercel.json` | — | LOW |

#### 4. Content Completeness

| # | Finding | File | Line | Severity |
|---|---------|------|------|----------|
| C1 | **Blog is explicitly disabled** — "Blog is currently disabled. This page will be re-enabled when the CMS has a posts collection wired up." | `blog/page.tsx:39` | — | HIGH |
| C2 | Blog detail page (`blog/[slug]/page.tsx`) exists but is unreachable since blog listing shows disabled message | `blog/[slug]/page.tsx` | — | HIGH |
| C3 | **Pricing page has placeholder content** — all 3 tiers priced at $40/month with identical descriptions | `pricing/page.tsx:29-57` | — | HIGH |
| C4 | Pricing descriptions: "Our goal is to streamline SMB trade, making it easier and faster than ever for everyone and everywhere." — generic boilerplate, identical across all tiers | `pricing/page.tsx:26-27,41-42,57-58` | — | HIGH |
| C5 | Contact page has a real form with dictionary-driven labels | `contact/page.tsx`, `contact/components/contact-form.tsx` | — | POSITIVE |
| C6 | Legal pages dynamically loaded from CMS via `@repo/cms` | `legal/[slug]/page.tsx` | — | POSITIVE |
| C7 | Homepage has real content: Hero, Cases, Features, Stats, Testimonials, FAQ, CTA — all dictionary-driven | `(home)/page.tsx:49-55` | — | POSITIVE |
| C8 | Homepage `<pre className="hidden">{JSON.stringify(data, null, 2)}</pre>` — debug dump of CMS data in production DOM | `(home)/page.tsx:43` | — | MEDIUM |
| C9 | No `/[locale]/about/` page — company info not available | — | — | LOW |
| C10 | No `/[locale]/docs/` page — documentation link in header goes nowhere or external | — | — | LOW |
| C11 | Navigation config exists in `header/navigation-config.ts` — structure for header links | — | — | POSITIVE |
| C12 | `basehub-types.d.ts` generated types file for CMS — indicates real CMS integration | — | — | POSITIVE |

#### 5. Security

| # | Finding | File | Line | Severity |
|---|---------|------|------|----------|
| W1 | Sentry DSN configured via environment, not hardcoded | `sentry.edge.config.ts`, `sentry.server.config.ts` | — | POSITIVE |
| W2 | `@repo/security` (Arcjet) integrated via env keys | `env.ts:7` | — | POSITIVE |
| W3 | Contact form action exists at `contact/actions/contact.tsx` — server action, not client-side API call | — | — | POSITIVE |
| W4 | `proxy.ts` exists but content not audited (same pattern as `apps/api/proxy.ts`) | `proxy.ts` | — | LOW |
| W5 | No CSP headers configured in `next.config.ts` or `vercel.json` | — | — | MEDIUM |

---

### Recommended Actions

#### Mobile App (priority order)

**CRITICAL — Must Fix Before Any Release**

74. Wire push notification token registration: create `/api/notifications/devices` endpoint in backend; call it from `push-handlers.ts` after `expo-notifications.getExpoPushTokenAsync()`.
75. Add React Error Boundary to `App.tsx` wrapping `<AppContent />`.
76. Create `app.config.ts` with proper app name, version, privacy policy URL, and EAS build config.

**HIGH — Feature Gaps**

77. Add at minimum: Inventory (stock levels, barcode scan), Events (list, details), and Staff (today's shifts, time clock) screens.
78. Add deep linking configuration to `AppNavigator.tsx` for push notification tap-through.
79. Add camera/barcode scanner for inventory (`expo-camera` + `expo-barcode-scanner` plugins).
80. Add token refresh handling — listen to Clerk's token refresh events and update the API client getter.
81. Create `eas.json` for Expo Application Services build configuration.
82. Add screen-level and component-level tests — current 1-file coverage is insufficient.

**MEDIUM — Quality**

83. Remove dead `EventCard` component or add an events screen that uses it.
84. Consolidate navigation barrel files (`index.ts` + `index.tsx`).
85. Add certificate pinning for API calls (via `expo-network` or custom config).
86. Validate `EXPO_PUBLIC_API_URL` is non-empty before making API calls.

#### Public Website (priority order)

**HIGH — Content & Metadata**

87. Add `generateMetadata()` to pricing page with proper title and description.
88. Replace pricing page hardcoded strings with dictionary entries — all tiers, descriptions, feature names.
89. Replace pricing page placeholder content with real pricing tiers and descriptions.
90. Enable blog — wire CMS posts collection and replace disabled message with actual blog listing.
91. Fix `typescript.ignoreBuildErrors: true` — resolve type errors instead of suppressing them in production.

**MEDIUM — i18n & Performance**

92. Convert marketing images from PNG to WebP for performance (10 files in `public/marketing/`).
93. Replace hardcoded `"en-US"` locale in `components/sidebar.tsx:22-25` with dynamic locale.
94. Add Open Graph image generation (`opengraph-image.tsx`) for homepage, pricing, and contact pages.
95. Remove debug `<pre>` from homepage `(home)/page.tsx:43` — CMS data dump in DOM.
96. Add CSP headers via `next.config.ts` headers configuration.
97. Fix `sitemap.ts:6` — use `path.join(process.cwd(), "app")` instead of relative `"app"`.

**LOW — Polish**

98. Add `/about` page for company information.
99. Consider adding `/features` page as a dedicated product showcase (currently only homepage sections).
100. Change app name from "mobile" to product name in `app.json:3-4`.

---

### Critical Supplementary Findings (from parallel subagent deep-reads)

The 6 subagents returned additional findings beyond the initial audit above. These are the most significant:

#### CRITICAL — Mobile API Contract Bugs (will cause runtime errors)

| # | Finding | Mobile File:Line | Backend File:Line | Severity |
|---|---------|-------------------|-------------------|----------|
| C1 | **Claim/Start/Release body field mismatch**: Mobile sends `{ taskId }` but backend claim handler destructures `{ id }` from body — returns 400 "Task ID is required" on every claim attempt | `mutations.ts:91` | `kitchen/kitchen-tasks/commands/claim/route.ts:42` | **CRITICAL** |
| C2 | **Start/Release likely affected**: Same pattern — mobile sends `{ taskId }`, backend may expect different field name depending on manifest runtime schema | `mutations.ts:196,316` | `kitchen/kitchen-tasks/commands/start/route.ts:34`, `release/route.ts:34` | **CRITICAL** |
| C3 | **Prep lists response key mismatch**: Mobile expects `{ prepLists: [] }` but backend returns `{ data: [...], pagination: {...} }` — `data.prepLists` is `undefined` → empty list on mobile | `queries.ts:23,110` | `kitchen/prep-lists/route.ts:216-224` | **CRITICAL** |
| C4 | **Prep list detail response key mismatch**: Mobile expects `{ prepList: {...} }` but backend returns flat object — `data.prepList` is `undefined` → empty detail on mobile | `queries.ts:27,124` | `kitchen/prep-lists/[id]/route.ts:139-156` | **CRITICAL** |
| C5 | **Prep list item shape mismatch**: Mobile type has `completed`, `notes`, `unit` but backend returns `isCompleted`, `preparationNotes`, `baseUnit`, `scaledQuantity`, and groups items under `stations` (not flat `items` array) | `types.ts:67-79` | `kitchen/prep-lists/[id]/route.ts:139-156` | **CRITICAL** |

**Impact**: The mobile app's core features (task claiming, prep list viewing) are **non-functional** due to these contract mismatches. Only the Today screen (events) and task listing (read-only) work correctly.

#### CRITICAL — Push Notifications Non-Functional

| # | Finding | File:Line | Severity |
|---|---------|------|------|----------|
| C6 | Backend endpoint `/api/mobile/push-token` does NOT exist — push tokens are never registered server-side | `push-handlers.ts:72` | **CRITICAL** |
| C7 | Backend endpoint `/api/mobile/notification-preferences` does NOT exist — notification preference management is non-functional | `push-handlers.ts:175,195` | **CRITICAL** |
| C8 | Backend endpoint `/api/mobile/app-settings` does NOT exist — SettingsScreen settings fetch will 404 | `SettingsScreen.tsx:33-42` | **CRITICAL** |
| C9 | Backend endpoint `/api/user/profile` may not exist — ProfileScreen profile fetch likely 404 | `ProfileScreen.tsx:38-44` | **HIGH** |

#### HIGH — Mobile Architecture Issues

| # | Finding | File:Line | Severity |
|---|---------|------|------|----------|
| C10 | `useOfflineSync` syncStatus is a ref, not state — `OfflineBanner` receives stale sync data and will not re-render on sync state changes | `useOfflineSync.ts:105-109` | **HIGH** |
| C11 | No conflict resolution for queued offline actions — stale claims/starts will fail with retries then remain in queue forever with no user notification | `useOfflineSync.ts` | **HIGH** |
| C12 | Retry `setTimeout` not cleaned up on unmount — potential state updates on unmounted component | `useOfflineSync.ts:160-170` | **HIGH** |
| C13 | `LoadingSkeleton.tsx:66` uses `Math.random()` in render — causes visual flickering on re-renders | `LoadingSkeleton.tsx:66` | **MEDIUM** |
| C14 | No shared API types package — mobile types defined locally, can silently drift from backend (root cause of C3-C5) | `types.ts` | **HIGH** |
| C15 | 7 bottom tabs exceeds platform guidelines (iOS max 5, Material 3-5) — will cause cramped tab bar | `AppNavigator.tsx:81-147` | **MEDIUM** |

#### HIGH — Zero Accessibility Across All 9 Screens

| # | Finding | Severity |
|---|---------|----------|
| C16 | Zero `accessibilityLabel` usage across all 9 screens and 10 components | **HIGH** |
| C17 | Zero `accessibilityRole` / `accessibilityHint` usage | **HIGH** |
| C18 | Emoji used as meaningful UI elements (tab icons, empty states) without accessible alternatives | **HIGH** |
| C19 | `OfflineBanner` has no `accessibilityRole="alert"` — screen readers won't announce offline state | **HIGH** |
| C20 | `ProgressBar` has no `accessibilityRole="progressbar"` or `accessibilityValue` | **MEDIUM** |

#### Updated Recommended Actions — Additional

101. **CRITICAL**: Fix mobile API body fields — change `mutations.ts:91` from `{ taskId }` to `{ id: taskId }` for claim, and verify start/release/start command handlers.
102. **CRITICAL**: Fix mobile prep-lists response parsing — update `queries.ts:110` to use `data.data` (matching `manifestSuccessResponse` wrapping) and `queries.ts:124` to handle flat response object.
103. **CRITICAL**: Fix mobile `PrepListItem` types to match backend response shape (`isCompleted` not `completed`, `preparationNotes` not `notes`, station-grouped items).
104. **CRITICAL**: Create backend endpoints `/api/mobile/push-token`, `/api/mobile/notification-preferences`, `/api/mobile/app-settings`.
105. **CRITICAL**: Verify `/api/user/profile` exists in backend; if not, create it.
106. **HIGH**: Fix `useOfflineSync` to use state (not ref) for `syncStatus` so `OfflineBanner` re-renders.
107. **HIGH**: Add conflict resolution to offline queue — detect 409 responses, notify user, and remove stale items from queue.
108. **HIGH**: Create shared `@repo/types` API contract types shared between mobile, web, and backend.
109. **HIGH**: Add `accessibilityLabel` to all touchable elements and `accessibilityRole` to interactive components.
110. **MEDIUM**: Reduce bottom tabs from 7 to 5 (combine Today + My Work, combine Search into header).
111. **MEDIUM**: Replace emoji tab icons with proper icon library (e.g., `@expo/vector-icons`).
112. **MEDIUM**: Fix `Math.random()` in `LoadingSkeleton.tsx:66` — use deterministic function based on index.

#### Web App — Additional Findings from Subagent Deep-Read

| # | Finding | File:Line | Severity |
|---|---------|------|------|----------|
| W6 | **Contact form is non-functional**: server action `actions/contact.tsx` exists but `contact-form.tsx` has no `onSubmit`/`action` binding and is not wrapped in a `<form>` element — form submissions go nowhere | `contact/components/contact-form.tsx` | **CRITICAL** |
| W7 | **Middleware conflict**: `middleware.ts` (locale-only logic) likely overrides `proxy.ts` (full security stack with Clerk + Arcjet + CSP headers) — security headers and auth middleware may not be running | `middleware.ts` vs `proxy.ts` | **HIGH** |
| W8 | **Marketing images critically oversized**: Two PNGs exceed 5 MB each (`PolishedDashboard.png`, `OperationsDashboard.png`); all 10 images are 4320px wide (far beyond display needs). Total: ~40 MB of PNG images | `public/marketing/*.png` | **HIGH** |
| W9 | **Sidebar date hardcoded to `"en-US"` / `"America/New_York"`**: Not locale-aware for a multi-locale site | `components/sidebar.tsx:22-25` | **MEDIUM** |

**Updated web actions:**

113. **CRITICAL**: Wire contact form `onSubmit` to the existing server action in `actions/contact.tsx`.
114. **HIGH**: Resolve middleware conflict — merge `proxy.ts` security stack into `middleware.ts` or ensure Next.js middleware chaining includes both locale routing and security headers.
115. **HIGH**: Convert all 10 marketing PNGs to WebP/AVIF and downscale from 4320px to 1920px max.

#### Web App — SEO/i18n Deep-Read Supplementary Findings

| # | Finding | File:Line | Severity |
|---|---------|------|------|----------|
| W10 | **Non-EN dictionaries contain stale upstream template content**: ES/DE/ZH/FR/PT show completely different metrics (100K MAU, $100K MRR) and testimonials ("Hayden Bleasel", "Lee Robinson") vs EN (7 modules, Operations Director) | `packages/internationalization/dictionaries/*.json` | **CRITICAL** |
| W11 | **SEO metadata branded "next-forge" / Vercel**: `applicationName = "next-forge"`, author = Vercel, twitter = @vercel, publisher = "Vercel" — every page title ends with "| next-forge" | `packages/seo/metadata.ts:10-16` | **CRITICAL** |
| W12 | **No canonical URLs**: `createMetadata()` never sets `alternates.canonical` — search engines may index duplicate content across locales | `packages/seo/metadata.ts` | **HIGH** |
| W13 | **No hreflang tags**: With 6 supported locales, every page should declare `alternates.languages` mapping — without this, search engines cannot identify language/region relationships | `packages/seo/metadata.ts` | **HIGH** |
| W14 | **Sitemap omits locale prefixes**: Generates `/blog/slug` instead of `/en/blog/slug`, `/es/blog/slug` — URLs will be redirected by middleware | `app/[locale]/sitemap.ts:43-54` | **CRITICAL** |
| W15 | **Zero JSON-LD structured data**: `packages/seo/json-ld.tsx` component exists but no page uses it — no Organization, WebSite, FAQPage, or Blog schema | All pages | **HIGH** |
| W16 | **Blog post `generateMetadata` returns `{}`** (empty) — no title/description for SEO | `blog/[slug]/page.tsx` | **HIGH** |
| W17 | **Header SVG title says "Vercel"** instead of "Capsule" | `components/header/index.tsx:56` | **MEDIUM** |
| W18 | **~30+ hardcoded English strings** across hero, testimonials, pricing, footer, sidebar, blog, legal pages (detailed in subagent report) | Multiple files | **HIGH** |
| W19 | **OG locale hardcoded to `"en_US"`** regardless of actual locale served | `packages/seo/metadata.ts:49` | **MEDIUM** |
| W20 | **No root `/` to `/en` redirect** — middleware lets root pass through, no root `app/layout.tsx` exists | `middleware.ts:55-57` | **HIGH** |
| W21 | **Blog detail always calls `notFound()`** — fully stubbed but sitemap still generates blog URLs from CMS that will 404 | `blog/[slug]/page.tsx` | **HIGH** |
| W22 | **Legal page description duplicates title** — `description: post._title` | `legal/[slug]/page.tsx:31-34` | **LOW** |
| W23 | **Currency "$" symbol hardcoded** in stats component regardless of locale | `(home)/components/stats.tsx:84` | **MEDIUM** |
| W24 | **Footer receives no dictionary prop** — all content hardcoded English | `components/footer.tsx` | **HIGH** |

**Updated web actions (additional):**

116. **CRITICAL**: Translate non-EN dictionaries to match Capsule content — ES/DE/ZH/FR/PT currently show upstream "next-forge" template content.
117. **CRITICAL**: Fix `packages/seo/metadata.ts` branding — change `applicationName`, author, twitter handle, publisher from next-forge/Vercel to Capsule.
118. **CRITICAL**: Fix sitemap to include locale prefixes in all URLs — generate entries for all 6 locales.
119. **HIGH**: Add canonical URLs and hreflang tags to `createMetadata()`.
120. **HIGH**: Add JSON-LD structured data to homepage (Organization, WebSite), FAQ section (FAQPage), and pricing page.
121. **HIGH**: Add `generateMetadata()` to pricing page.
122. **HIGH**: Add root `/` to `/en` redirect in middleware.
123. **HIGH**: Internationalize footer, hero CTA buttons, and ~30 hardcoded strings across the site.
124. **HIGH**: Fix blog detail page — either enable CMS posts or remove blog URLs from sitemap.
125. **MEDIUM**: Fix header SVG title from "Vercel" to "Capsule".
126. **MEDIUM**: Make OG locale dynamic based on served locale.
127. **MEDIUM**: Make stats component currency formatting locale-aware.

---

## Mobile & Public Website Audit (10th Pass)

> **Audited:** 2026-04-25
> **Scope:** `apps/mobile/` (React Native/Expo, 57 .ts/.tsx files, 9 screens) + `apps/web/` (Next.js marketing site, 37 .ts/.tsx files, 6 pages)
> **Method:** 11 parallel subagents — full screen/page inventory, API contract comparison against backend routes, offline/push/security deep-read, feature completeness vs web app, code quality scan, SEO/i18n audit
> **Prior coverage:** Passes 1–9 covered API backend, shared packages, E2E tests, and authenticated web frontend (`apps/app/`). Mobile app and public website were NEVER audited.
> **No mobile-specific packages exist** — `packages/mobile-*` returned zero results.

### Part A: Mobile App

#### Executive Summary

The mobile app (`apps/mobile/`) is a **kitchen task execution tool only**. It has 9 screens covering a single bottom-tab navigator, but only covers ~25–30% of the Kitchen module. **11 of 12 major module areas have zero mobile presence.** The app calls 4 endpoint groups (`/api/mobile/*`, `/api/user/profile`) that **have no backend routes** — they return 404. Additionally, the `taskId` vs `id` field mismatch on task claim means every claim attempt fails with 400. Prep list response shapes don't match what the mobile app expects, leaving the Prep Lists tab always empty.

**Total screens:** 9 (TodayScreen, TasksScreen, MyWorkScreen, PrepListsScreen, PrepListDetailScreen, SearchScreen, ProfileScreen, SettingsScreen, SignInScreen)
**Test coverage:** 16 tests in 1 file (`__tests__/offline-sync.test.ts`) — offline queue only, no UI/component/navigation/integration tests
**Offline architecture:** Functional queue-and-replay with optimistic UI, but fragile error detection, no conflict resolution, and a syncStatus ref bug
**Push notifications:** Handlers written but NOT integrated into App.tsx; 3 of 4 push-related endpoints missing from backend
**Security posture:** JWT properly stored via Clerk + SecureStore; no hardcoded secrets; no certificate pinning; no 401 retry logic

**Top risks:**
1. **CRITICAL**: 4 endpoint groups missing from backend — Settings, Profile, Push Token, Notification Preferences screens are all broken
2. **CRITICAL**: Task claim sends `{ taskId }` but backend expects `{ id }` — every claim returns 400
3. **CRITICAL**: Prep list response shape mismatch — both list and detail screens always show empty
4. **HIGH**: 11 of 12 modules have zero mobile representation
5. **HIGH**: Push notification handlers written but never wired into App.tsx
6. **HIGH**: syncStatus is a ref not state — OfflineBanner won't re-render on status changes

#### 1. Feature Completeness

##### Module-by-Module Gap Analysis

| Module | Web App Pages | Mobile Screens | Status |
|--------|--------------|----------------|--------|
| **Kitchen – Tasks** | Task board + create | TasksScreen (claim, start, complete, release, bundle-claim, filter) | Partial — no task creation on mobile |
| **Kitchen – Prep Lists** | List + mobile-optimized view | PrepListsScreen + PrepListDetailScreen | Present but **broken** (response shape mismatch) |
| **Kitchen – Recipes** | 10 pages (list, new, detail, dishes, menus, cleanup, mobile view) | None | **MISSING** |
| **Kitchen – Waste** | 2 pages (list + mobile entry) | None | **MISSING** |
| **Kitchen – Stations/Team/Schedule/Equipment/Allergens/Nutrition/QA/IoT** | 10+ pages | None | **MISSING** |
| **Events** | 13+ pages (list, detail, follow-ups, waitlist, battle boards, budgets, contracts, reports) | TodayScreen shows only today's kitchen events (read-only) | **MISSING** — no event list, detail, CRUD |
| **Inventory** | 8 pages (dashboard, stock levels, items, barcode, transfers, import, forecasts, recipe cost) | None | **MISSING** |
| **Staff / Scheduling / Staffing** | 15+ pages (directory, availability, time clock, time off, performance, training, shifts, budgets, coverage) | None | **MISSING** |
| **Settings / Profile** | 7+ pages (general, team, audit log, security, integrations, email templates, manifest editor) | SettingsScreen + ProfileScreen | **Broken** — backend routes don't exist |
| **Accounting** | 4 pages | None | **MISSING** |
| **Procurement** | 10+ pages | None | **MISSING** |
| **Facilities** | 5 pages | None | **MISSING** |
| **Logistics** | 7 pages | None | **MISSING** |
| **Payroll** | 9 pages | None | **MISSING** |
| **CRM** | 17+ pages (clients, pipeline, proposals, venues, etc.) | None | **MISSING** |
| **Command Board** | API + AI assistant panel | None | **MISSING** |
| **Analytics** | 9 pages | None | **MISSING** |
| **Calendar** | 2 pages | None | **MISSING** |
| **Warehouse** | 6 pages | None | **MISSING** |
| **Cycle Counting** | 2 pages | None | **MISSING** |
| **Marketing** | 2 pages | None | **MISSING** |
| **Knowledge Base** | 1 page | None | **MISSING** |

**Summary:** Web app has ~120+ page files across 20 modules. Mobile has 8 authenticated screens covering only kitchen tasks and prep lists (both broken). 11 of 12 requested audit modules (kitchen, inventory, events, staff/scheduling, settings, accounting, procurement, facilities, logistics, payroll, CRM) have zero or broken mobile coverage.

#### 2. API Contract Issues

##### BLOCKING — Endpoints with No Backend Route

| # | Mobile Endpoint | Method | Mobile Source | Impact |
|---|----------------|--------|---------------|--------|
| M2A | `/api/mobile/app-settings` | GET + PATCH | `SettingsScreen.tsx:36,49` | Settings screen always fails |
| M2B | `/api/mobile/push-token` | POST | `push-handlers.ts:72` | Push registration silently fails |
| M2C | `/api/mobile/notification-preferences` | GET + PATCH | `push-handlers.ts:176,195` | Notification toggles silently fail |
| M2D | `/api/user/profile` | GET + PATCH | `ProfileScreen.tsx:40,50` | Profile screen always shows error |

`apps/api/app/api/mobile/` directory does **not exist**. Backend `apps/api/app/api/user/` has `create`, `deactivate`, `terminate`, `update-role`, `update` — no `profile` subdirectory.

##### BLOCKING — Request Body Field Mismatches

| # | Mobile Sends | Backend Expects | Mobile Source | Backend Source | Impact |
|---|-------------|-----------------|---------------|----------------|--------|
| M3A | `{ taskId }` | `{ id }` | `mutations.ts:93` | `kitchen-tasks/commands/claim/route.ts:42-45` | Every task claim returns 400 |
| M3B | `{ itemId }` | likely `{ id }` | `mutations.ts:389` | `prep-list-items/commands/mark-completed/route.ts:34` | Mark-complete likely fails |

##### BLOCKING — Response Shape Mismatches

| # | Mobile Expects | Backend Returns | Mobile Source | Backend Source | Impact |
|---|----------------|-----------------|---------------|----------------|--------|
| M4A | `{ prepLists: PrepList[] }` | `{ data: [...], pagination: {...} }` | `queries.ts:22-24,110` | `kitchen/prep-lists/route.ts:216-224` | Prep Lists tab always empty |
| M4B | `{ prepList: PrepList }` | flat object `{ id, name, stations, ... }` | `queries.ts:26-28,124` | `kitchen/prep-lists/[id]/route.ts:139-156` | Detail screen always empty |
| M4C | `PrepList` type has `completedCount`, `totalCount`, `items`, `dueDate` | Backend returns `stations` array, `batchMultiplier`, `dietaryRestrictions`, etc. | `types.ts:45-65` | `kitchen/prep-lists/[id]/route.ts:139-156` | Even with wrapper fix, data shapes incompatible |

##### HIGH — Other Contract Issues

| # | Finding | Mobile Source | Backend Source |
|---|---------|---------------|----------------|
| M5 | Manifest command responses wrapped in `{ success, data: { result, events } }` but mobile expects simple `{ success }` | `mutations.ts:196-197` | All kitchen-tasks command routes |
| M6 | No 401 retry/re-auth in API client — if session expires, all requests fail | `client.ts:40-47` | N/A |

#### 3. Native Integration

| Area | Status | Details |
|------|--------|---------|
| **Camera / Barcode** | **Not present** | No camera usage, no barcode scanning dependency. Inventory barcode feature completely absent. |
| **Push Notifications** | **Written but NOT wired** | `push-handlers.ts` has full configuration (permissions, Expo token, backend registration, listeners) but is **never called from App.tsx**. No `configurePushNotifications()` call in the app entry. |
| **Biometric Auth** | **Not present** | No biometric dependency or usage. |
| **Deep Linking** | **Not configured** | No `scheme` in `app.json`, no `expo-linking` plugin, no deep link configuration. |
| **Haptic Feedback** | **Present** | `useHaptics` hook wraps `expo-haptics`, used in PrepListItem and TaskCard. |
| **App Store Readiness** | **Not ready** | App name is `"mobile"` (generic), no `eas.json`, no custom URL scheme, no iOS/Android specific permissions declared beyond `expo-secure-store`. |
| **Expo Config** | **Minimal** | `app.json` has basic splash/icons (all present in assets/), `newArchEnabled: true` (risky for production), single plugin (`expo-secure-store`). No EAS build config, no OTA updates config. |

#### 4. Code Quality

| Area | Finding | Severity |
|------|---------|----------|
| **TypeScript** | `strict: true` in tsconfig — good. But `any` used in `client.ts:14` (request body) and `offline-queue.ts:9` (type assertion) | MEDIUM |
| **Dead Code** | `LoadingCard` exported from `components/index.ts` but never used | LOW |
| **Unused Export** | `ApiError` re-exported from both `client.ts` and `mutations.ts` | LOW |
| **Large Files** | `TaskCard.tsx` is 468 lines — should be split | MEDIUM |
| **Large Files** | `TasksScreen.tsx` is ~780+ lines with complex filter/modal state | MEDIUM |
| **Magic Numbers** | Tab bar height hardcoded to 60px (`AppNavigator.tsx:155`), refresh intervals hardcoded throughout | LOW |
| **Design System** | All colors hardcoded (e.g., `#2563eb`, `#64748b`) — no theme provider | MEDIUM |
| **Icon Library** | Tab bar uses **emoji strings** instead of icon library (`AppNavigator.tsx:21-47`) | LOW |
| **String Externalization** | **Zero i18n** — every UI string across all 9 screens is hardcoded English | HIGH |
| **Accessibility** | **Zero accessibility labels** across all screens and components — no `accessibilityLabel`, no `accessibilityRole`, no screen reader support | HIGH |
| **Error Boundary** | No global error boundary in the app — unhandled errors will crash to OS level | HIGH |
| **State Management** | React Query + AsyncStorage + Context (auth). No global state store. Appropriate for current scope. | OK |
| **Test Coverage** | 1 test file, 16 tests — only offline queue logic. No UI, navigation, integration, or screen tests. | HIGH |

#### 5. Security

| Area | Finding | Severity |
|------|---------|----------|
| **JWT Storage** | Properly stored via Clerk SDK + `expo-secure-store` (iOS Keychain / Android Keystore) | OK |
| **Hardcoded Secrets** | None found — only `EXPO_PUBLIC_*` env vars (Clerk publishable key, Expo project ID, API URL) — all designed to be public | OK |
| **Certificate Pinning** | None — standard `fetch` with no SSL configuration | MEDIUM |
| **Default API URL** | HTTP (not HTTPS) for development (`http://10.0.2.2:2223` / `http://localhost:2223`). Production depends on `EXPO_PUBLIC_API_URL` being set to HTTPS. | LOW |
| **Token Refresh** | No explicit refresh logic — relies on Clerk SDK internal refresh. No 401 retry in API client. | LOW |
| **Offline Queue** | Stored in unencrypted AsyncStorage (not SecureStore) — queued mutations are readable if device is compromised | MEDIUM |
| **Math.random()** | Used for optimistic ID generation (`mutations.ts:47`) — not cryptographically secure, potential for collisions | LOW |

### Part B: Public Website

#### Executive Summary

The public website (`apps/web/`) is a Next.js 15 marketing site with 6 pages, CMS integration via BaseHub, i18n support for 6 locales, Sentry monitoring, and Arcjet security. It uses shared packages from `packages/` for SEO, analytics, feature flags, and internationalization.

**Page count:** 6 (home, blog, blog/[slug], contact, legal/[slug], pricing)
**Test coverage:** 1 test file (`__tests__/hydration.test.tsx`) — component hydration stability only, no page-level tests
**CMS:** BaseHub integration for blog and legal pages, but blog is **completely disabled** with hardcoded "Blog is currently disabled" message
**i18n:** 6 locales supported via `[locale]` routing, but **dozens of hardcoded English strings** across components

**Top risks (beyond findings already in W1–W24):**
1. Blog system completely disabled — always shows "disabled" message, slug pages always 404
2. Contact form exists but is NOT wired to the server action — form submission does nothing
3. Pricing page shows identical $40/mo for all tiers, no `generateMetadata()`, no i18n
4. `next.config.ts` has `productionBrowserSourceMaps: true` and `ignoreBuildErrors: true`
5. Cases carousel has duplicate images and 1-second auto-scroll (too fast for users)

Note: Findings W1–W24 from the 9th pass (SEO/i18n deep-read) remain valid and are not repeated here. This section covers **new findings only**.

#### 1. SEO & Metadata (New Findings)

| # | Finding | File:Line | Severity |
|---|---------|-----------|----------|
| W25 | **Pricing page has no `generateMetadata()`** — no title, description, or OG tags for /pricing | `pricing/page.tsx` | HIGH |
| W26 | **Blog page `generateMetadata` works** but blog itself is disabled — metadata serves no purpose and may confuse crawlers | `blog/page.tsx:15-25` | MEDIUM |
| W27 | **`productionBrowserSourceMaps: true`** in next.config — exposes source code in production | `next.config.ts:13-14` | HIGH |
| W28 | **`ignoreBuildErrors: true`** — TypeScript errors don't block builds, masking real issues | `next.config.ts:16-18` | HIGH |

#### 2. Internationalization (New Findings)

| # | Finding | File:Line | Severity |
|---|---------|-----------|----------|
| W29 | **Pricing page: zero i18n** — all tier names, prices, features, CTA text hardcoded English | `pricing/page.tsx` | HIGH |
| W30 | **Hero CTA buttons hardcoded** — "Get in touch", "Sign up" not from dictionary | `(home)/components/hero.tsx:35,40` | MEDIUM |
| W31 | **CTA section buttons hardcoded** — "Get in touch", "Get started" not from dictionary | `(home)/components/cta.tsx:26,32` | MEDIUM |
| W32 | **Cases carousel images duplicated** — lines 23+32, 24+34 show identical image references | `(home)/components/cases.tsx:23-35` | MEDIUM |
| W33 | **Cases carousel auto-scroll: 1 second** — too fast for users to read content | `(home)/components/cases.tsx:50` | HIGH |
| W34 | **Testimonials carousel auto-scroll: 4 seconds with no pause control** — no user control over speed | `(home)/components/testimonials.tsx` | MEDIUM |
| W35 | **Error page (`error.tsx`) hardcoded English** — all text, including "Go to home" link hardcoded to `/en` | `(home)/error.tsx:46-59` | HIGH |
| W36 | **Locale error page (`[locale]/error.tsx`)** redirects to hardcoded `/en` instead of current locale | `[locale]/error.tsx:66` | HIGH |
| W37 | **Global error page hardcoded `lang="en"`** | `[locale]/global-error.tsx:36` | MEDIUM |
| W38 | **Legal page has hardcoded "Back to Home" text** — not from dictionary | `legal/[slug]/page.tsx:68` | LOW |
| W39 | **Footer tagline hardcoded** — "Enterprise business solutions, unified." | `components/footer.tsx:42` | MEDIUM |

#### 3. Performance (New Findings)

| # | Finding | File:Line | Severity |
|---|---------|-----------|----------|
| W40 | **Sitemap does filesystem sync read** (`readdirSync`) on every request — no caching | `app/[locale]/sitemap.ts:6` | MEDIUM |
| W41 | **Blog detail page always returns `notFound()`** but sitemap still generates blog URLs — crawlers hit 404s | `blog/[slug]/page.tsx:28` + `sitemap.ts` | HIGH |
| W42 | **Home page `betaFeature` call is unawaited** — potential race condition | `(home)/page.tsx:35` | LOW |
| W43 | **Cases carousel: 12 large images, no lazy loading** — impacts initial page load | `(home)/components/cases.tsx` | MEDIUM |
| W44 | **Feature images load immediately** — no lazy loading for below-fold content | `(home)/components/features.tsx` | LOW |

#### 4. Content Completeness (New Findings)

| # | Finding | File:Line | Severity |
|---|---------|-----------|----------|
| W45 | **Blog system completely disabled** — shows hardcoded "Blog is currently disabled" message | `blog/page.tsx:39-46` | CRITICAL |
| W46 | **Blog slug page always returns 404** — `generateStaticParams` returns `[]`, page always calls `notFound()` | `blog/[slug]/page.tsx:18-28` | CRITICAL |
| W47 | **Contact form NOT wired to server action** — form renders but `onSubmit` does nothing (no handler) | `contact/components/contact-form.tsx` | CRITICAL |
| W48 | **Server action exists** (`actions/contact.tsx`) with Resend email + rate limiting, but form doesn't call it | `contact/actions/contact.tsx:39-45` vs `contact-form.tsx` | HIGH |
| W49 | **Pricing page: all tiers identical $40/mo** — Startup, Growth, Enterprise all show same price | `pricing/page.tsx` | HIGH |
| W50 | **Missing email template** — server action references `@repo/email/templates/contact` but file may not exist | `contact/actions/contact.tsx` | HIGH |
| W51 | **Testimonials avatar fallback is "??"** — not professional for production | `(home)/components/testimonials.tsx:68` | MEDIUM |
| W52 | **All testimonial/cases images have generic alt text** ("Operations preview") — not descriptive | `(home)/components/testimonials.tsx` + `cases.tsx` | MEDIUM |
| W53 | **Beta banner text hardcoded English** — "Beta feature now available" | `(home)/page.tsx:46` | LOW |
| W54 | **Home page debug `<pre>` element** renders in production — should be gated behind dev/flag | `(home)/page.tsx:43` | MEDIUM |
| W55 | **Legal page description duplicates title** — `description: post._title` | `legal/[slug]/page.tsx:31-34` | LOW |

### Recommended Actions

#### Mobile App — Priority Ordered

**CRITICAL (app is non-functional without these):**
128. Create backend routes for `/api/mobile/app-settings` (GET + PATCH), `/api/mobile/push-token` (POST), `/api/mobile/notification-preferences` (GET + PATCH), `/api/user/profile` (GET + PATCH) — four entire feature areas are dead.
129. Fix task claim body: change mobile from `{ taskId }` to `{ id }` in `mutations.ts:93`, or update backend to accept `taskId`.
130. Fix prep list response shape: mobile expects `{ prepLists }` / `{ prepList }` wrappers but backend returns `{ data }` or flat object — align mobile's `select` transforms with actual backend shapes.
131. Fix prep list detail type: mobile's `PrepList` type (`types.ts:45-65`) has fields (`completedCount`, `totalCount`, `items`, `dueDate`) that don't exist in the backend response (`stations`, `batchMultiplier`, `dietaryRestrictions`).

**HIGH:**
132. Wire push notification handlers into App.tsx — `configurePushNotifications()` is never called.
133. Fix `syncStatus` in `useOfflineSync.ts:105-110` — change from ref to state so OfflineBanner re-renders.
134. Add global error boundary to App.tsx.
135. Add accessibility labels to all interactive elements across all 9 screens.
136. Externalize all hardcoded UI strings (100+ instances) to a localization system.
137. Create `eas.json` for production builds.
138. Set `newArchEnabled: false` in `app.json` for production stability.
139. Add deep linking configuration (URL scheme + universal links).
140. Expand test coverage beyond 1 file — add screen, component, and navigation tests.
141. Replace emoji tab icons with an icon library (e.g., `@expo/vector-icons`).

**MEDIUM:**
142. Add theme provider to replace hardcoded colors throughout components.
143. Implement certificate pinning for API communication.
144. Move offline queue storage from AsyncStorage to encrypted storage (SecureStore).
145. Add conflict resolution for offline queue (version checking or server-side merge).
146. Improve network error detection — currently only catches `TypeError` with `"Network"`.
147. Split `TaskCard.tsx` (468 lines) and `TasksScreen.tsx` (~780 lines) into smaller components.
148. Remove unused `LoadingCard` export.
149. Deduplicate `ApiError` export.
150. Change app name from `"mobile"` to branded name in `app.json`.

#### Public Website — Priority Ordered

**CRITICAL:**
151. Wire contact form `onSubmit` to the server action in `actions/contact.tsx`.
152. Either enable CMS blog posts and fix `blog/[slug]/page.tsx`, or remove blog URLs from sitemap entirely.

**HIGH:**
153. Disable `productionBrowserSourceMaps` and `ignoreBuildErrors` in `next.config.ts`.
154. Add `generateMetadata()` to pricing page.
155. Internationalize pricing page — all content currently hardcoded English.
156. Fix cases carousel: remove duplicate images and increase auto-scroll from 1s to 5s+.
157. Fix error pages to use current locale instead of hardcoded `/en` redirect.
158. Fix `betaFeature` unawaited call or remove debug `<pre>` element from homepage.

**MEDIUM:**
159. Externalize all remaining hardcoded strings (CTA buttons, footer tagline, legal "Back to Home").
160. Add lazy loading for below-fold images (cases, features sections).
161. Cache sitemap generation results instead of sync filesystem read on every request.
162. Fix testimonials avatar fallback from "??" to initials or default avatar.
163. Add descriptive alt text to testimonial/cases images.
164. Fix global error page `lang="en"` to use dynamic locale.

---

## 10th Pass — Verification & Corrections (2026-04-25)

> **Method:** 7 parallel subagents re-read every source file in `apps/mobile/` and `apps/web/`, cross-referencing all prior 10th-pass claims against actual code. This section documents corrections, new findings, and structural issues with the plan itself.

### Structural Note: Duplicate 10th Pass

The 10th pass audit appears **twice** in this document:
- Lines ~1956–2343: First copy (findings A1–A5, M2A–M6, N1–N8, Q1–Q10, S1–S5, SEO1–SEO11, I1–I12, P1–P8, C1–C12, W1–W5, C1–C20, W6–W24, actions 74–112)
- Lines ~2345–2605: Second copy (overlapping + additional W25–W55, actions 128–164)

**Recommendation:** Deduplicate — keep the second copy (more findings), merge unique items from the first (C6–C20 supplementary, W6–W24), then delete the first copy. This would save ~350 lines.

### Corrections to Prior 10th Pass

| # | Prior Claim | Actual | Source |
|---|-------------|--------|--------|
| ERR-1 | **Q5**: "EventCard is never used in any screen (dead code)" | **WRONG** — EventCard IS imported and rendered by `TodayScreen.tsx` for displaying event cards | `TodayScreen.tsx` imports `EventCard` from components |
| ERR-2 | **Navigation**: "Both `index.ts` and `index.tsx` barrel files" | **WRONG** — `src/navigation/index.tsx` does NOT exist. Only `index.ts` and `AppNavigator.tsx` | `find apps/mobile/src/navigation/ -type f` confirms only 2 files |
| ERR-3 | **Tests**: "267 lines, 16 tests" | **WRONG** — File is 300 lines with 7 test cases in 5 describe blocks | `__tests__/offline-sync.test.ts` — wc -l = 300 |
| ERR-4 | **Tests**: "vi.mocked(AsyncStorage, true) — deep: true deprecated" | **WRONG** — No `deep` option used. `vi.mocked(AsyncStorage, true)` passes `true` as the second arg to `vi.mocked`, which is the `deep` parameter in older Vitest but is not a named option. This is valid usage. | `__tests__/offline-sync.test.ts:57` |
| ERR-5 | **TasksScreen**: "~780+ lines" | **UNDERSTATED** — File is actually 1,258 lines | `wc -l apps/mobile/src/screens/TasksScreen.tsx` |
| ERR-6 | **TaskCard**: "468 lines" | **MINOR** — File is 467 lines | `wc -l apps/mobile/src/components/TaskCard.tsx` |

### New Findings Not in Prior 10th Pass

#### Mobile — API Contract

| # | Finding | File:Line | Severity |
|---|---------|-----------|----------|
| M-NEW-1 | **BundleClaimResponse type mismatch**: Mobile types.ts defines `BundleClaimResponse` with `{ success, data?: { claimed: [...], totalClaimed } }` but the actual mutation handler may return `{ success, claimId }` | `types.ts:112-125`, `mutations.ts:155` | HIGH |
| M-NEW-2 | **Query key inconsistency**: `queries.ts` uses `["prepListDetail", id]` but `mutations.ts` invalidates `["prepListDetail"]` without the id — cache won't be properly invalidated for specific prep lists | `queries.ts:37`, `mutations.ts:400,412,451,463` | HIGH |
| M-NEW-3 | **Missing endpoints in prior audit's table**: TodayScreen calls `/api/kitchen/events/today`, TasksScreen calls `/api/kitchen/tasks/available` and `/api/kitchen/tasks/my-tasks` — these ARE in the code but weren't explicitly listed in the endpoint table | `queries.ts`, multiple screens | LOW |
| M-NEW-4 | **Bundle claim endpoint exists but shape may differ**: `/api/kitchen/tasks/bundle-claim` exists in backend, but response format may not match mobile expectations | `mutations.ts:155` vs backend route | MEDIUM |
| M-NEW-5 | **No empty/null task ID validation**: Mutations don't validate taskId before making requests — could cause 400 errors with unhelpful messages | `mutations.ts` (all mutation hooks) | LOW |

#### Mobile — Architecture

| # | Finding | File:Line | Severity |
|---|---------|-----------|----------|
| M-NEW-6 | **Expo SDK 54 + React Native 0.81 + React 19.1**: This is a very recent stack. `newArchEnabled: true` on SDK 54 is less risky than on older SDKs — the new architecture is maturing. Downgrading severity of prior finding N1 from HIGH to MEDIUM. | `package.json` | INFO |
| M-NEW-7 | **No babel.config.js**: Project relies on Expo's default Babel config — acceptable for Expo SDK 54 but limits custom transforms | Project root | LOW |
| M-NEW-8 | **Network error detection is narrow**: Only catches `TypeError` with substring `"Network"` — misses DNS errors, timeouts, CORS issues, and other network failure modes | `mutations.ts` (7 instances: lines 98, 159, 204, 258, 323, 392, 444) | MEDIUM |

#### Mobile — Confirmed Prior Findings Worth Highlighting

| # | Finding | Verified | Notes |
|---|---------|---------|-------|
| V-1 | `/api/mobile/` directory does NOT exist in backend | Confirmed | All 4 mobile-prefixed endpoints (app-settings, push-token, notification-preferences, and profile) return 404 |
| V-2 | `/api/user/profile` does NOT exist | Confirmed | Backend has user create/deactivate/terminate/update-role/update but no `profile` subdirectory |
| V-3 | `/api/staff/me` does NOT exist | Confirmed | Listed in prior endpoint table but no backend route exists |
| V-4 | Task claim sends `{ taskId }` | Confirmed | `mutations.ts:93` sends `{ taskId }`, backend claim handler expects different field name |
| V-5 | Prep list response shape mismatch | Confirmed | Mobile expects `{ prepLists }` wrapper, backend returns `{ data, pagination }` |
| V-6 | Push handlers never wired into App.tsx | Confirmed | `configurePushNotifications()` is defined but never called |
| V-7 | syncStatus is a ref, not state | Confirmed | `useOfflineSync.ts:105` uses useRef, OfflineBanner won't re-render |

#### Web — Confirmed Prior Findings Worth Highlighting

| # | Finding | Verified | Notes |
|---|---------|---------|-------|
| V-8 | Blog disabled with hardcoded English message | Confirmed | `blog/page.tsx:39` |
| V-9 | Pricing page: all tiers $40/month, identical descriptions | Confirmed | `pricing/page.tsx:30,46,62` |
| V-10 | Contact form NOT wired to server action | Confirmed | `contact-form.tsx` has no onSubmit/action binding |
| V-11 | SEO branded "next-forge"/Vercel | Confirmed | `packages/seo/metadata.ts:10-16` |
| V-12 | Non-EN dictionaries have stale upstream template content | Confirmed | ES/DE/ZH/FR/PT reference "trading systems", "Hayden Bleasel", "Lee Robinson" — generic next-forge boilerplate |
| V-13 | Sitemap omits locale prefixes | Confirmed | `sitemap.ts:43-48` |
| V-14 | Header SVG title says "Vercel" | Confirmed | `header/index.tsx:55` |
| V-15 | Error pages redirect to hardcoded `/en` | Confirmed | `(home)/error.tsx:56`, `[locale]/error.tsx:66,73` |

### Updated Severity Adjustments

| Finding | Prior Severity | Recommended | Reason |
|---------|---------------|-------------|--------|
| N1 (newArchEnabled) | HIGH | MEDIUM | SDK 54 new architecture is maturing, less risky than when originally flagged |
| Q5 (EventCard dead code) | LOW | **REMOVE** | Finding is incorrect — EventCard IS used |

### Actions to Add (Not in Prior Lists)

165. **HIGH**: Fix query key inconsistency in `mutations.ts` — change `queryClient.invalidateQueries({ queryKey: ["prepListDetail"] })` to include the specific id: `["prepListDetail", prepListId]`.
166. **HIGH**: Verify BundleClaimResponse type matches backend actual response — test `POST /api/kitchen/tasks/bundle-claim` and update `types.ts:112-125` accordingly.
167. **MEDIUM**: Broaden network error detection in mutations — catch `TypeError`, `AbortError`, and check `error.message` for "network", "timeout", "fetch" patterns instead of only `TypeError` + "Network".
168. **LOW**: Add guard in mutation hooks to validate taskId/prepListId is non-empty before making API call.

### Deduplication Cleanup

When consolidating the two 10th-pass copies, preserve these items from the FIRST copy that are NOT in the second:
- Supplementary findings C6–C20 (push non-functional, mobile architecture issues, zero accessibility)
- Web findings W6–W24 (contact form, middleware conflict, marketing images, SEO/i18n deep-read)
- Actions 74–112 (from the first recommended actions list)

Items already in the second copy can be safely removed from the first.

---

## 10th Pass — Supplementary Re-Verification (2026-04-25, second session)

> **Method:** 15 parallel subagents (11 mobile + 4 web verification) re-read every source file, cross-referenced mobile API calls against backend routes, and compared all findings against the two existing 10th-pass copies. This section contains only corrections and genuinely NEW findings.

### Corrections to Prior Verification Section

| # | Prior Claim | Actual | Evidence |
|---|-------------|--------|----------|
| ERR-7 | **ERR-2**: "`src/navigation/index.tsx` does NOT exist. Only `index.ts` and `AppNavigator.tsx`" | **WRONG** — `index.tsx` DOES exist (1-line placeholder: `// This file intentionally left blank - exports are in index.ts`). Original finding Q6 was correct: both barrel files exist. | `ls apps/mobile/src/navigation/` shows 3 files including `index.tsx` |
| ERR-8 | **ERR-3**: "267 lines, 16 tests" corrected to "300 lines with 7 test cases in 5 describe blocks" | **PARTIALLY WRONG** — File is 300 lines, but the original first copy's "267 lines" was closer to content lines. Both 7 test cases and 5 describe blocks confirmed. The second copy's "16 tests" was wrong; original "267 lines" was just stale. | `wc -l apps/mobile/__tests__/offline-sync.test.ts` = 300 |
| ERR-9 | **SEO10**: "productionBrowserSourceMaps: true — source maps uploaded to Sentry then deleted" (POSITIVE) | **MISFRAMED** — This is a HIGH risk. Source maps are publicly downloadable in browser devtools, exposing full source code. The first copy correctly flagged it as HIGH (P4, W27). The POSITIVE rating in the SEO table is wrong. | `next.config.ts:13-14` — `productionBrowserSourceMaps: true` |

### Genuinely New Mobile Findings (Not in Any Prior Copy)

| # | Finding | File:Line | Severity |
|---|---------|-----------|----------|
| M-SUP-1 | **SettingsScreen support links are non-functional placeholders** — "Help Center", "Report a Bug", "Contact Support" items have no navigation or URL (lines 352-369) | `SettingsScreen.tsx:352-369` | MEDIUM |
| M-SUP-2 | **ProfileScreen role fallback hardcoded "Staff"** — if API returns no role, displays "Staff" as default (line 166) | `ProfileScreen.tsx:166` | LOW |
| M-SUP-3 | **ProfileScreen version hardcoded "1.0.0"** — not read from app.json or native module | `ProfileScreen.tsx:284` | LOW |
| M-SUP-4 | **SearchScreen is client-side only** — fetches all tasks and all prep lists, then filters locally. No `/api/search` endpoint used. Does not scale. | `SearchScreen.tsx:30-70` | MEDIUM |
| M-SUP-5 | **Offline queue has no size limit** — unlimited growth possible if user queues many actions offline. No maxItems cap in `addToOfflineQueue()` | `store/offline-queue.ts:16-20` | MEDIUM |
| M-SUP-6 | **Offline queue has no corruption detection** — AsyncStorage JSON parse errors are caught by returning `[]` but silently discard the entire queue with no user notification | `store/offline-queue.ts:8-14` | LOW |
| M-SUP-7 | **Offline sync polls queue count every 5 seconds** (`useOfflineSync.ts:222-226`) — inefficient; should use event-driven updates after queue mutations | `useOfflineSync.ts:222-226` | LOW |
| M-SUP-8 | **TodayScreen has "Future" navigation comment** — `// Future: Could use navigation.navigate with nested structure` (line 33-37) suggesting planned but incomplete deep navigation | `TodayScreen.tsx:33-37` | INFO |
| M-SUP-9 | **All 13 kitchen endpoints verified to EXIST in backend** — the core API layer is correctly wired. Only `/api/mobile/app-settings` and `/api/user/profile` are missing (already documented as M2A, M2D). The prior first copy's endpoint list (lines 2017-2022) missed several endpoints that DO work: `/api/kitchen/events/today`, `/api/kitchen/tasks/available`, `/api/kitchen/tasks/my-tasks`, `/api/kitchen/tasks/bundle-claim` | `apps/api/app/api/kitchen/` | POSITIVE |

### Genuinely New Web Findings (Not in Any Prior Copy)

| # | Finding | File:Line | Severity |
|---|---------|-----------|----------|
| W-SUP-1 | **Contact form has file input (`<input type="file">`) with no handler** — contact-form.tsx renders a file upload field (lines 103-107) but has no onChange handler, no file state, and the server action doesn't accept file uploads | `contact/components/contact-form.tsx:103-107` | MEDIUM |
| W-SUP-2 | **Server action `actions/contact.tsx` implements rate limiting (Redis) + Resend email** — properly architected backend, but entirely unreachable because form has no onSubmit binding (already documented as W6/W47/W48). Adding: the server action also references `@repo/email/templates/contact` which may not exist. | `contact/actions/contact.tsx:23-45` | INFO |
| W-SUP-3 | **Cases carousel has exact duplicate image pairs**: lines 23+32 and 24+34 reference identical images. Only 6 unique images across 12 carousel slides. | `(home)/components/cases.tsx:23-35` | MEDIUM (adds specificity to W32) |
| W-SUP-4 | **All homepage hero/features/stats/FAQ/CTA sections are properly server-rendered** with dictionary props — no `'use client'` on these components | `(home)/components/*.tsx` | POSITIVE |
| W-SUP-5 | **ISR revalidation is well-configured**: home 86400s, contact 86400s, blog 1800s, legal 86400s — appropriate for a marketing site | Multiple page files | POSITIVE |

### Structural Recommendations for This Document

1. **Merge the two 10th-pass copies** — lines 1956-2343 (first copy) and 2345-2605 (second copy) have significant overlap. The verification section (2609-2698) already identified this.
2. **Correct ERR-2** — `index.tsx` DOES exist in navigation; Q6 is valid.
3. **Downgrade SEO10** — `productionBrowserSourceMaps: true` should be HIGH risk, not POSITIVE.
4. **Actions to add:**
   - 169. **MEDIUM**: Add navigation handlers to SettingsScreen support links (Help Center URL, email link for bug reports).
   - 170. **MEDIUM**: Add server-side search API for mobile SearchScreen or implement pagination to avoid fetching all tasks/prep-lists.
   - 171. **MEDIUM**: Add `maxItems` cap to offline queue (suggest 100) with oldest-item eviction and user notification.
   - 172. **LOW**: Replace 5-second polling in `useOfflineSync` with event-driven count updates after queue mutations.

---

