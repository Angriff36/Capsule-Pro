## Run Log — AI Integration Invariants Audit

---

### Run: 2026-05-14T00:00:00Z (scheduled cron)

**Git HEAD:** e7a934bc89f3d914a3a2bfcfc485ab949abef16b

**Summary:** 5 confirmed bugs, 3 suspicious items, 6 false alarms.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. (`ClerkProviderClient` wraps `DesignSystemProvider` which contains `ThemeProvider` — ordering inverted.)
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; potential doubled toasts.
3. **BUG-3** — `apps/app/app/(mobile-kitchen)/layout.tsx:30` — `NotificationsProvider` (which calls `useTheme()`) rendered with `mounted` guard as the only hydration protection; not a crash but load-bearing guard that silently masks the issue.
4. **BUG-4** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes living in frontend app (`apps/app`) instead of API app; bypass API-layer auth/middleware.
5. **BUG-5** — 71 concrete `route.ts` files under `apps/api/app/api/**/commands/*/route.ts` outside the manifest single-dispatcher; violates manifest route invariant per AGENTS.md.

**Previously reported bugs:** First run — no prior entries to compare.

**Notes:** Full details in `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T08:24Z (scheduled cron)

**Git HEAD:** 024396fe87fa3b90fe0b18377d6c1b5f76617c48

**Summary:** 5 confirmed bugs, 3 suspicious items, 6 false alarms.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer auth/middleware.
4. **BUG-4** — 72 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher.
5. **BUG-5** — `apps/app/app/(mobile-kitchen)/layout.tsx:30` — `NotificationsProvider` calls `useTheme()` with only a `mounted` guard; fragile.

**Previously reported bugs status:** All 5 bugs from run 2026-05-14T00:00Z remain unresolved. No regressions or new fixes detected. Git commit changed (e7a934bc → 024396fe) — the new commit message indicates test mock fixes only; no provider or route changes.

**Notes:** Full details in `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T01:56Z (scheduled cron)

**Git HEAD:** 024396fe87fa3b90fe0b18377d6c1b5f76617c48

**Summary:** 5 confirmed bugs, 3 suspicious items, 6 false alarms.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer auth/middleware.
4. **BUG-4** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher. (Rescan from 72; delta is counting variance, no new routes added or removed.)
5. **BUG-5** — `apps/app/app/(mobile-kitchen)/layout.tsx:30` — `NotificationsProvider` calls `useTheme()` with only a `mounted` guard; fragile.

**Previously reported bugs status:** All 5 bugs from run 2026-05-14T08:24Z remain unresolved. Git HEAD unchanged (024396fe) — no code fixes landed between runs.

**Notes:** Full details in `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T02:29Z (scheduled cron)

**Git HEAD:** 024396fe87fa3b90fe0b18377d6c1b5f76617c48

**Summary:** 4 confirmed bugs, 3 suspicious items, 6 false alarms. (Prior BUG-5 — NotificationsProvider mounted guard — demoted to SUSP-1; could not confirm missing ThemeProvider without full layout trace.)

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. UNRESOLVED.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass canonical API-layer path. UNRESOLVED.
4. **BUG-4** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher. UNRESOLVED.

**Previously reported bugs status:** Git HEAD unchanged (024396fe) — no code fixes landed since last run. All bugs persist. No regressions. Main report refreshed at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T03:02Z (scheduled cron)

**Git HEAD:** 024396fe87fa3b90fe0b18377d6c1b5f76617c48

**Summary:** 4 confirmed bugs, 3 suspicious items, 7 false alarms. No change from prior run.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. UNRESOLVED.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass canonical API-layer rate limiting and key auth. UNRESOLVED.
4. **BUG-4** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher. UNRESOLVED.

**Previously reported bugs status:** Git HEAD unchanged (024396fe) — no code fixes landed since last run. All bugs persist. No regressions. Main report refreshed at `docs/audits/ai-integration-invariants-2026-05-13.md`.


---

### Run: 2026-05-14T03:36Z (scheduled cron)

**Git HEAD:** 024396fe87fa3b90fe0b18377d6c1b5f76617c48

**Summary:** 4 confirmed bugs, 3 suspicious items, 6 false alarms. BUG-4 count updated to 71 concrete command routes (was 70 — one route added). No new bug categories. No fixes landed.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. UNRESOLVED.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer rate limiting and key auth. UNRESOLVED.
4. **BUG-4** — 71 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher. UNRESOLVED (count up by 1).

**Previously reported bugs status (this run):** Git HEAD unchanged (024396fe) — no code fixes landed since prior run. All bugs persist. No regressions. Main report refreshed at `docs/audits/ai-integration-invariants-2026-05-13.md`.
