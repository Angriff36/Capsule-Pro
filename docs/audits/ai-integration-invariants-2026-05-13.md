# AI Integration Invariants Audit

**Last updated:** 2026-05-14T09:38Z  
**Auditor:** Hermes (scheduled cron)  
**Git HEAD:** c8f7c6944305b24b1043a04deac9f4a5d08d28ed  
**Scope:** Provider graph, Clerk, auth routes, manifest route invariants, stale wrappers

---

## Executive Summary — Top 5 Risks

| # | Risk | Severity |
|---|------|----------|
| 1 | `ClerkProviderClient` calls `useTheme()` before `ThemeProvider` exists in the tree — Clerk dark mode is permanently broken | **HIGH** |
| 2 | Two `<Toaster />` components rendered simultaneously — every toast fires twice | **MEDIUM** |
| 3 | Concrete shift-command routes live in `apps/app` (frontend), bypassing API-layer auth/rate-limiting | **MEDIUM** |
| 4 | 70 concrete command `route.ts` files in `apps/api` violate the single-dispatcher manifest invariant | **MEDIUM** |
| 5 | `sign-in`/`sign-up` Clerk analytics wrappers call `useAuth()` inside the unauthenticated layout — valid only because ClerkProvider is at root, but fragile | **LOW** |

---

## Confirmed Bugs

### BUG-1 — `useTheme()` called above `ThemeProvider` (Clerk theming broken)

**File:** `apps/app/app/clerk-provider.client.tsx:13`  
**Also:** `apps/app/app/layout.tsx:36–57`, `packages/design-system/index.tsx:20`

**Proof:**  
Root layout render order:
```
<ClerkProviderClient>          ← useTheme() fires HERE (line 13)
  <QueryProvider>
    <DesignSystemProvider>
      <ThemeProvider>          ← next-themes ThemeProvider arrives AFTER
        ...
      </ThemeProvider>
    </DesignSystemProvider>
  </QueryProvider>
</ClerkProviderClient>
```
`useTheme()` from `next-themes` returns `undefined` / `"system"` when called above its provider. `resolvedTheme` is always `undefined`, so `theme` is always `undefined`, and `ClerkProvider appearance={{ theme: undefined }}` — dark mode never applied.

**Product impact:** Clerk modals (sign-in, sign-up, user profile) are permanently light-themed regardless of the user's system or app theme setting.

**Smallest safe fix:** Move `ClerkProviderClient` inside `DesignSystemProvider` in `apps/app/app/layout.tsx`, or extract the theme-reading logic into a child component that renders below `ThemeProvider`.

---

### BUG-2 — Duplicate `<Toaster />`

**Files:**  
- `apps/app/app/layout.tsx:57` — `<Toaster />` rendered directly in root layout  
- `packages/design-system/index.tsx:23` — `<Toaster />` also rendered inside `DesignSystemProvider`

**Proof:**  
`DesignSystemProvider` always renders `<Toaster />` as part of its tree. Root layout additionally renders `<Toaster />` as a sibling of `<DesignSystemProvider>`. Every `toast()` call fires two notifications.

**Product impact:** All toast notifications display twice, confusing users and polluting the screen.

**Smallest safe fix:** Remove the `<Toaster />` import and usage from `apps/app/app/layout.tsx:57` — `DesignSystemProvider` already provides it.

---

### BUG-3 — Concrete command routes in `apps/app` (frontend app)

**Files:**  
- `apps/app/app/api/staff/shifts/commands/create-validated/route.ts`  
- `apps/app/app/api/staff/shifts/commands/update-validated/route.ts`

**Proof:**  
These are Next.js API route handlers (`POST`) living inside the **frontend** app (`apps/app`), not the dedicated API service (`apps/api`). The frontend app's middleware (`apps/app/proxy.ts`) is a page/auth guard — it does not enforce API-layer rate limiting, key validation, or the canonical command pipeline. These routes also perform `$queryRaw` and `database.*` calls directly from frontend-land.

**Product impact:** Shift create/update commands bypass the API service's rate-limiting and any API-key auth enforced there. They're also invisible to API monitoring and the manifest dispatcher.

**Smallest safe fix:** Move these two route files to `apps/api/app/api/staff/shifts/commands/` and wire them via the manifest dispatcher or at minimum the API service.

---

### BUG-4 — 70 concrete command `route.ts` files in `apps/api` outside the manifest dispatcher

**File pattern:** `apps/api/app/api/**/commands/*/route.ts` (excluding the single dispatcher at `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`)

**Count (this run):** 70 files in `apps/api` + 2 in `apps/app` = **72 total**

**Sample paths:**
- `apps/api/app/api/kitchen/prep-task-plan-workflows/commands/*/route.ts` (15 commands)
- `apps/api/app/api/events/import-workflows/commands/*/route.ts` (16 commands)
- `apps/api/app/api/crm/proposals/commands/*/route.ts` (5 commands)
- `apps/api/app/api/procurement/requisitions/commands/*/route.ts` (8 commands)

**Proof:** AGENTS.md states: _"Concrete generated command route files are illegal unless they are the single dispatcher: `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`"_. All 70 files are concrete, named routes.

**Product impact:** These routes exist in parallel with (or instead of) the manifest dispatcher. Any route not flowing through the dispatcher bypasses manifest-level validation, audit trail, and command lifecycle hooks. It also creates routing ambiguity and test surface fragmentation.

**Smallest safe fix:** This is a systematic problem requiring a planned migration pass — each concrete route must be ported to a manifest command definition and the file removed. Do not attempt ad-hoc deletions; coordinate with a dedicated manifest-consolidation pass.

---

## Suspicious But Unproven

### SUSP-1 — `NotificationsProvider` (`useTheme()`) in authenticated layout

**File:** `apps/app/app/(authenticated)/components/notifications-provider.tsx:16`

The `NotificationsProvider` component calls `useTheme()` with a `mounted` guard to avoid hydration mismatch. It is rendered inside `GlobalSidebar`, which is inside `AppLayout` (`apps/app/app/(authenticated)/layout.tsx`). The authenticated layout is a child of root layout, which means it renders below `DesignSystemProvider > ThemeProvider`. The guard (`mounted` state) is therefore defensive but not strictly required.

**Verdict:** Probably fine — `ThemeProvider` is an ancestor. The `mounted` guard is good practice regardless. Not flagging as confirmed. Watch if theme behavior in notifications diverges.

### SUSP-2 — `useAuth()` in unauthenticated sign-in/sign-up pages

**Files:**  
- `apps/app/app/(unauthenticated)/sign-in/[[...sign-in]]/sign-in-with-analytics.tsx:14`  
- `apps/app/app/(unauthenticated)/sign-up/[[...sign-up]]/sign-up-with-analytics.tsx:14`

These components call `useAuth()` inside the `(unauthenticated)` route group layout. `ClerkProvider` is at root so this works — but if someone ever moves the `(unauthenticated)` layout to render above `ClerkProviderClient`, it breaks silently. Low risk currently.

### SUSP-3 — `apps/app` API routes have no rate limiting

**Files:** `apps/app/app/api/**` (all routes)

`apps/app/proxy.ts` performs auth checks but no rate limiting. Any route handler in `apps/app/app/api/` is only protected by Clerk session auth. Arcjet (`secure()`) is only called in the authenticated page layout, not on API routes. Not a provider graph invariant, but related to BUG-3.

---

## False Alarms / Intentionally Valid

1. **`packages/auth/provider.tsx`** — `AuthProvider` is a shell; it explicitly does NOT render `ClerkProvider`. Intent is documented in-file. Valid.
2. **`packages/design-system/providers/theme.tsx`** — thin wrapper around `next-themes ThemeProvider`. Valid passthrough.
3. **`apps/mobile/App.tsx`** — `ClerkProvider` wraps `QueryClientProvider` wraps app screens. Correct provider order for React Native. Valid.
4. **`packages/auth/components/sign-in.tsx` / `sign-up.tsx`** — Uses `signInFallbackRedirectUrl` / `signUpFallbackRedirectUrl` (current API). No deprecated `afterSignInUrl`/`afterSignUpUrl` detected in codebase. Valid.
5. **`apps/app/proxy.ts`** — Public route allowlist is explicit (`/sign-in(.*)`, `/sign-up(.*)`, `/plasmic(.*)`, `/view/proposal(.*)`, `/sign/contract(.*)`). API routes return JSON 401/403. Correct.
6. **`apps/storybook/.storybook/preview.tsx`** — `ThemeProvider` wrapping stories. Valid isolated storybook context, not part of app provider tree.
7. **`packages/design-system/components/mode-toggle.tsx`** / **`packages/design-system/components/ui/sonner.tsx`** — Both call `useTheme()`. These are leaf components always consumed below `ThemeProvider` in both app and storybook. Not flagged.

---

## Methodology Notes

- Provider graph traced manually from `apps/app/app/layout.tsx` downward.
- Clerk deprecated prop check: `git grep afterSignInUrl afterSignUpUrl` — zero hits in app/packages source.
- Manifest route invariant: `find apps -path '*/commands/*/route.ts'` — 73 total results, 1 is the dispatcher, leaving 72 concrete violations (70 in apps/api, 2 in apps/app).
- No files were modified during this audit.
