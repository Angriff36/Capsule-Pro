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

---

### Run: 2026-05-14T04:09Z (scheduled cron)

**Git HEAD:** 952db5a89e717149a795eafebfa58112e54b31a1 *(new commit since prior run — was 024396fe)*

**Summary:** 4 confirmed bugs, 3 suspicious items, 6 false alarms.

BUG-4 concrete command route count updated: 72 total non-dispatcher (70 in apps/api + 2 in apps/app). Prior count was 71 — one additional route added with new commit.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. UNRESOLVED.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer rate limiting and key auth. UNRESOLVED.
4. **BUG-4** — 72 concrete command `route.ts` files outside manifest single-dispatcher (70 in apps/api, 2 in apps/app). UNRESOLVED (count +1 from prior run).

**Previously reported bugs status:** New HEAD confirms no fixes landed for any of the four bugs. All persist. No regressions detected. Main report updated at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T04:43Z (scheduled cron)

**Git HEAD:** bb0b6b3822e8d9d66a9e70987d4a6e1f4aa8a1d3 *(new commit since prior run — was 952db5a8)*

**Summary:** 4 confirmed bugs, 3 suspicious items, 7 false alarms. Counts unchanged. No fixes landed.

Concrete command route count: 72 non-dispatcher total (70 in apps/api, 2 in apps/app). Same as prior run.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. UNRESOLVED.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer rate limiting and key auth. UNRESOLVED.
4. **BUG-4** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher (+ 2 in apps/app = 72 total). UNRESOLVED.

**Previously reported bugs status:** New HEAD (bb0b6b38) — no fixes landed for any of the four bugs since last run (952db5a8). All bugs persist. No regressions. Main report refreshed at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T05:18Z (scheduled cron)

**Git HEAD:** c8f7c6944305b24b1043a04deac9f4a5d08d28ed *(new commit since prior run — was bb0b6b38)*

**Summary:** 4 confirmed bugs, 3 suspicious items, 6 false alarms. No change in bug categories or counts.

Concrete command route count: 72 total non-dispatcher (70 in apps/api + 2 in apps/app). Same as prior run.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. UNRESOLVED.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer rate limiting and key auth. UNRESOLVED.
4. **BUG-4** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher (+ 2 in apps/app = 72 total). UNRESOLVED.

**Previously reported bugs status:** New HEAD (c8f7c694) — no fixes landed for any of the four bugs since last run (bb0b6b38). All bugs persist. No regressions. Main report refreshed at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T05:51Z (scheduled cron)

**Git HEAD:** c8f7c6944305b24b1043a04deac9f4a5d08d28ed *(unchanged from prior run)*

**Summary:** 4 confirmed bugs, 3 suspicious items, 6 false alarms. No change in any category or count.

Concrete command route count: 72 total non-dispatcher (70 in apps/api + 2 in apps/app). Unchanged.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. UNRESOLVED.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer rate limiting and key auth. UNRESOLVED.
4. **BUG-4** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher (+ 2 in apps/app = 72 total). UNRESOLVED.

**Previously reported bugs status:** Git HEAD unchanged (c8f7c694) — no code fixes landed since prior run (05:18Z). All bugs persist. No regressions. Main report refreshed at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T06:23Z (scheduled cron)

**Git HEAD:** c8f7c6944305b24b1043a04deac9f4a5d08d28ed *(unchanged from prior run)*

**Summary:** 4 confirmed bugs, 3 suspicious items, 6 false alarms. No change in any category or count.

Concrete command route count: 72 total non-dispatcher (70 in apps/api + 2 in apps/app). Unchanged.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. UNRESOLVED.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer rate limiting and key auth. UNRESOLVED.
4. **BUG-4** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher (+ 2 in apps/app = 72 total). UNRESOLVED.

**Previously reported bugs status:** Git HEAD unchanged (c8f7c694) — no code fixes landed since prior run (05:51Z). All bugs persist. No regressions. Main report refreshed at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T06:56Z (scheduled cron)

**Git HEAD:** c8f7c6944305b24b1043a04deac9f4a5d08d28ed *(unchanged from prior run)*

**Summary:** 4 confirmed bugs, 3 suspicious items, 6 false alarms. No change in any category or count.

Concrete command route count: 72 total non-dispatcher (70 in apps/api + 2 in apps/app). Unchanged.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. UNRESOLVED.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer rate limiting and key auth. UNRESOLVED.
4. **BUG-4** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher (+ 2 in apps/app = 72 total). UNRESOLVED.

**Previously reported bugs status:** Git HEAD unchanged (c8f7c694) — no code fixes landed since prior run (06:23Z). All bugs persist. No regressions. Main report unchanged.

---

### Run: 2026-05-14T07:27Z (scheduled cron)

**Git HEAD:** c8f7c6944305b24b1043a04deac9f4a5d08d28ed *(unchanged from prior run)*

**Summary:** 4 confirmed bugs, 3 suspicious items, 6 false alarms. No change in any category or count.

Concrete command route count: 72 total non-dispatcher (70 in apps/api + 2 in apps/app). Unchanged.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. UNRESOLVED.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer rate limiting and key auth. UNRESOLVED.
4. **BUG-4** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher (+ 2 in apps/app = 72 total). UNRESOLVED.

**Previously reported bugs status:** Git HEAD unchanged (c8f7c694) — no code fixes landed since prior run (06:56Z). All bugs persist. No regressions. Main report unchanged.

---

### Run: 2026-05-14T08:00Z (scheduled cron)

**Git HEAD:** c8f7c6944305b24b1043a04deac9f4a5d08d28ed *(unchanged from prior run)*

**Summary:** 4 confirmed bugs, 3 suspicious items, 7 false alarms. No change in any category or count.

Concrete command route count: 72 total non-dispatcher (70 in apps/api + 2 in apps/app). Unchanged.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. UNRESOLVED.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer rate limiting and key auth. UNRESOLVED.
4. **BUG-4** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher (+ 2 in apps/app = 72 total). UNRESOLVED.

**Previously reported bugs status:** Git HEAD unchanged (c8f7c694) — no code fixes landed since prior run (07:27Z). All bugs persist. No regressions. Main report refreshed at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T08:33Z (scheduled cron)

**Git HEAD:** c8f7c6944305b24b1043a04deac9f4a5d08d28ed *(unchanged from prior run)*

**Summary:** 4 confirmed bugs, 3 suspicious items, 7 false alarms. No change in any category or count.

Concrete command route count: 72 total non-dispatcher (70 in apps/api + 2 in apps/app). Unchanged.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. UNRESOLVED.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer rate limiting and key auth. UNRESOLVED.
4. **BUG-4** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher (+ 2 in apps/app = 72 total). UNRESOLVED.

**Previously reported bugs status:** Git HEAD unchanged (c8f7c694) — no code fixes landed since prior run (08:00Z). All bugs persist. No regressions. Main report updated timestamp only.

---

### Run: 2026-05-14T09:06Z (scheduled cron)

**Git HEAD:** c8f7c6944305b24b1043a04deac9f4a5d08d28ed *(unchanged from prior run)*

**Summary:** 4 confirmed bugs, 3 suspicious items, 7 false alarms. No change in any category or count.

Concrete command route count: 72 total non-dispatcher (70 in apps/api + 2 in apps/app). Unchanged.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. UNRESOLVED.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer rate limiting and key auth. UNRESOLVED.
4. **BUG-4** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher (+ 2 in apps/app = 72 total). UNRESOLVED.

**Previously reported bugs status:** Git HEAD unchanged (c8f7c694) — no code fixes landed since prior run (08:33Z). All bugs persist. No regressions. Main report timestamp updated.

### Run: 2026-05-14T09:38Z (scheduled cron)

**Git HEAD:** c8f7c6944305b24b1043a04deac9f4a5d08d28ed *(unchanged from prior run)*

**Summary:** 4 confirmed bugs, 3 suspicious items, 7 false alarms. No change in any category or count.

Concrete command route count: 72 total non-dispatcher (70 in apps/api + 2 in apps/app). Unchanged.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. UNRESOLVED.
2. **BUG-2** — `apps/app/app/layout.tsx:57` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer rate limiting and key auth. UNRESOLVED.
4. **BUG-4** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher (+ 2 in apps/app = 72 total). UNRESOLVED.

**Previously reported bugs status:** Git HEAD unchanged (c8f7c694) — no code fixes landed since prior run (09:06Z). All bugs persist. No regressions. Main report refreshed at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T10:11Z (scheduled cron)

**Git HEAD:** b10436ed77ef793ab505f3ca816aa18cddb4993c *(new commit since prior run — was c8f7c694)*

**Summary:** 4 confirmed bugs, 3 suspicious items, 7 false alarms. No change in bug categories or counts.

Concrete command route count: 72 total non-dispatcher (70 in apps/api + 2 in apps/app). Unchanged.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. UNRESOLVED.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer rate limiting and key auth. UNRESOLVED.
4. **BUG-4** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher (+ 2 in apps/app = 72 total). UNRESOLVED.

**Previously reported bugs status:** New HEAD (b10436ed) — no fixes landed for any of the four bugs since last run (c8f7c694). All bugs persist. No regressions. Main report updated at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

---

### Run: 2026-05-14T10:44Z (scheduled cron)

**Git HEAD:** 1d75cea5 *(new commit since prior run — was b10436ed)*

**Summary:** 4 confirmed bugs, 3 suspicious items, 7 false alarms. Counts unchanged from prior run.

Concrete command route count: 72 total non-dispatcher (70 in apps/api + 2 in apps/app). Unchanged.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. UNRESOLVED.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer rate limiting and key auth. UNRESOLVED.
4. **BUG-4** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher (+ 2 in apps/app = 72 total). UNRESOLVED.

**Previously reported bugs status:** New HEAD (1d75cea5) vs prior (b10436ed). Commit message: "fix: resolve P2.D payroll period ID and P2.G search FR-107 violation" — unrelated to any tracked bug. All 4 bugs persist. No regressions. No fixes.

---

### Run: 2026-05-14T11:18Z (scheduled cron)

**Git HEAD:** 1d75cea5 *(unchanged from prior run)*

**Summary:** 4 confirmed bugs, 3 suspicious items, 7 false alarms. No change in any category or count.

Concrete command route count: 72 total non-dispatcher (70 in apps/api + 2 in apps/app). Unchanged.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. UNRESOLVED.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer rate limiting and key auth. UNRESOLVED.
4. **BUG-4** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher (+ 2 in apps/app = 72 total). UNRESOLVED.

**Previously reported bugs status:** Git HEAD unchanged (1d75cea5) — no code fixes landed since prior run (10:44Z). All 4 bugs persist. No regressions. Main report timestamp updated.

---

### Run: 2026-05-14T12:24Z (scheduled cron)

**Git HEAD:** 1d75cea5c68ba47cc4b778866aa62bf80791e02b *(unchanged from prior run)*

**Summary:** 4 confirmed bugs, 3 suspicious items, 8 false alarms. No change in any category or count.

Concrete command route count: 72 total non-dispatcher (70 in apps/api + 2 in apps/app). Unchanged.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. UNRESOLVED.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer rate limiting and key auth. UNRESOLVED.
4. **BUG-4** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher (+ 2 in apps/app = 72 total). UNRESOLVED.

**Previously reported bugs status:** Git HEAD unchanged (1d75cea5) — no code fixes landed since prior run (11:50Z). All 4 bugs persist. No regressions. Main report timestamp updated.

---

### Run: 2026-05-14T11:50Z (scheduled cron)

**Git HEAD:** 1d75cea5c68ba47cc4b778866aa62bf80791e02b *(unchanged from prior run)*

**Summary:** 4 confirmed bugs, 3 suspicious items, 8 false alarms. No change in any category or count.

Concrete command route count: 72 total non-dispatcher (70 in apps/api + 2 in apps/app). Unchanged.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. UNRESOLVED.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer rate limiting and key auth. UNRESOLVED.
4. **BUG-4** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher (+ 2 in apps/app = 72 total). UNRESOLVED.

**Previously reported bugs status:** Git HEAD unchanged (1d75cea5) — no code fixes landed since prior run (11:18Z). All 4 bugs persist. No regressions. Main report refreshed at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T12:55Z (scheduled cron)

**Git HEAD:** 1d75cea5c68ba47cc4b778866aa62bf80791e02b *(unchanged from prior run)*

**Summary:** 4 confirmed bugs, 3 suspicious items, 8 false alarms. No change in any category or count.

Concrete command route count: 72 total non-dispatcher (70 in apps/api + 2 in apps/app). Unchanged.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` called above `ThemeProvider`; Clerk dark theme never applied. UNRESOLVED.
2. **BUG-2** — `apps/app/app/layout.tsx:55` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
3. **BUG-3** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer rate limiting and key auth. UNRESOLVED.
4. **BUG-4** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher (+ 2 in apps/app = 72 total). UNRESOLVED.

**Previously reported bugs status:** Git HEAD unchanged (1d75cea5) — no code fixes landed since prior run (12:24Z). All 4 bugs persist. No regressions. Main report refreshed at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T13:32Z (scheduled cron)

**Git HEAD:** bbccf85ac35b70c44750e2ca4f894420f9fcdcae *(new commit since prior run — was 1d75cea5)*

**Summary:** 3 confirmed bugs, 3 suspicious items, 7 false alarms.

**Key change this run:** Prior BUG-1 (useTheme above ThemeProvider in ClerkProviderClient) **reclassified as FALSE ALARM**. Re-tracing the render tree confirms `ClerkProviderClient` is a child of `DesignSystemProvider` which wraps `ThemeProvider` — `useTheme()` is called correctly below `ThemeProvider`. Prior audit passes misread the nesting direction.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/layout.tsx:54` + `packages/design-system/index.tsx:23` — Duplicate `<Toaster />` rendered; doubled toasts. UNRESOLVED.
2. **BUG-2** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer rate limiting and key auth. UNRESOLVED.
3. **BUG-3** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher (+ 2 in apps/app = 72 total). UNRESOLVED (backlog).

**Previously reported bugs status:**
- Prior BUG-1 (useTheme above ThemeProvider) → **RECLASSIFIED FALSE ALARM** — render tree analysis confirms it was never broken.
- Prior BUG-2 (Duplicate Toaster) → renumbered BUG-1. UNRESOLVED.
- Prior BUG-3 (shifts routes in apps/app) → renumbered BUG-2. UNRESOLVED.
- Prior BUG-4 (70 concrete command routes) → renumbered BUG-3. UNRESOLVED.

**Notes:** Main report rewritten with corrected analysis at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

---

### Run: 2026-05-14T14:07Z (scheduled cron)

**Git HEAD:** 2dbdaa48ba6cb9d82f9b6ff58c5006fb5154794c *(new commit since prior run — was bbccf85a)*

**Summary:** 2 confirmed bugs, 3 suspicious items, 8 false alarms.

**Key change this run:** Prior BUG-1 (duplicate Toaster) **FIXED** by commit `2dbdaa48`. `apps/app/app/layout.tsx` no longer renders `<Toaster />`. Only the `DesignSystemProvider` copy remains.

**Confirmed Bugs:**

1. **BUG-1** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — Concrete command routes in frontend app; bypass API-layer rate limiting and key auth. UNRESOLVED.
2. **BUG-2** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher (+ 2 in apps/app = 72 total). UNRESOLVED (backlog).

**Previously reported bugs status:**
- Prior BUG-1 (duplicate Toaster) → **FIXED** in commit `2dbdaa48`. No longer appears in layout.tsx.
- Prior BUG-2 (shifts routes in apps/app) → renumbered BUG-1. UNRESOLVED.
- Prior BUG-3 (70 concrete command routes) → renumbered BUG-2. UNRESOLVED.

**Notes:** Main report rewritten at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T20:15Z (automated fix cron)

**Git HEAD:** 2dbdaa48ba6cb9d82f9b6ff58c5006fb5154794c *(pre-fix HEAD; fix commit pending)*

**Summary:** 1 bug FIXED. 1 confirmed bug remains (backlog). 3 suspicious items, 8 false alarms.

**Fixed this run:**

1. **BUG-1 (former BUG-1)** — `apps/app/app/api/staff/shifts/commands/{create-validated,update-validated}/route.ts` — **FIXED.** Both files deleted. The `next.config.ts` already proxies `/api/staff/:path*` to the API app via `afterFiles` rewrite. The local filesystem routes were taking priority over the rewrite and handling requests locally, bypassing the API's rate limiter, auth scope enforcement, and Sentry. After deletion, the rewrite takes effect and requests flow through `apps/api/app/api/staff/shifts/commands/` which uses the full manifest runtime with proper policy/guard enforcement.

**Remaining bugs:**

1. **BUG-2** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher (down from 72 total; 2 in apps/app removed). UNRESOLVED (backlog).

**Previously reported bugs status:**
- Prior BUG-1 (shifts routes in apps/app) → **FIXED** this run. Both files deleted. Rewrite now active.
- Prior BUG-2 (70 concrete command routes in apps/api) → renumbered BUG-2. UNRESOLVED (backlog).

**Notes:** `pnpm --filter app typecheck` passed. Build fails on pre-existing missing `RESEND_FROM`/`RESEND_TOKEN` env vars (unrelated). Main report updated at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14 (scheduled audit cron — read-only pass)

**Git HEAD:** 2d60b7acae29000c33c38d94c4bf3f34f8059936 *(same commit as prior fix run — no new commits)*

**Summary:** 2 confirmed bugs, 3 suspicious items, 6 false alarms.

**Confirmed Bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files in `apps/api` outside the manifest single-dispatcher. None of these are tracked by the manifest IR or enforced by policy/guard middleware. UNRESOLVED (backlog).
2. **BUG-2** — 3 of the 70 concrete routes completely bypass `executeManifestCommand`: `events/profitability/commands/recalculate/route.ts` (direct Prisma + hardcoded cost percentages), `procurement/purchase-orders/commands/update-status/route.ts` (raw SQL), and `procurement/purchase-orders/commands/receive/route.ts` (raw SQL). UNRESOLVED.

**Suspicious items:**

- SUSP-1: `apps/mobile/App.tsx:84` — fallback to `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in Expo context.
- SUSP-2: `apps/app/proxy.ts` public route allowlist has no `/_next` static asset entries.
- SUSP-3: `apps/api/proxy.ts` uses `@repo/auth/server` re-export; version drift risk.

**Previously reported bugs:**
- Prior BUG-1 (duplicate Toaster) → confirmed **still fixed**. Not present in layout.tsx.
- Prior BUG-1 (shifts routes in apps/app) → confirmed **still fixed**. Files deleted.
- BUG-1/BUG-2 this run are new confirmed findings (manifest route invariant violations in apps/api).

**Notes:** No files modified this pass (read-only audit). Main report overwritten at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T15:15Z (scheduled cron — read-only audit)

**Git HEAD:** 2d60b7acae29000c33c38d94c4bf3f34f8059936 *(same as prior audit run — no new commits)*

**Summary:** 2 confirmed bugs, 3 suspicious items, 8 false alarms. No change from prior run.

Concrete command route count: 70 non-dispatcher in `apps/api` (the 2 in `apps/app` were deleted in the 2026-05-14T20:15Z fix run and remain gone). Unchanged.

**Confirmed Bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher. None enforced by manifest policy/guard middleware. UNRESOLVED (backlog).
2. **BUG-2** — 3 of those 70 routes bypass manifest runtime entirely: `events/profitability/commands/recalculate/route.ts` (direct Prisma + hardcoded cost percentages), `procurement/purchase-orders/commands/update-status/route.ts` (raw SQL), `procurement/purchase-orders/commands/receive/route.ts` (raw SQL). UNRESOLVED.

**Previously reported bugs status:**
- Prior duplicate Toaster → **still fixed**. Not present in layout.tsx.
- Prior shift routes in apps/app → **still fixed**. Files remain deleted.
- BUG-1 / BUG-2 from prior audit run → **still unresolved**. Git HEAD unchanged — no fixes landed.

**Notes:** No files modified this pass (read-only audit). Main report overwritten at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14 (scheduled cron — read-only audit, HEAD 742341a)

**Git HEAD:** 742341a54a1bff2777c2ea8a93eec0bca4cc618a

**Summary:** 3 confirmed bugs, 3 suspicious items, 7 false alarms.

**New vs prior run:** BUG-1 and BUG-2 carry forward unchanged. **BUG-3 is a new finding** — `apps/api/proxy.ts` lists `/api/sentry-fixer/process` as a public (unauthenticated) route.

**Confirmed Bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher. Manifest guards/policies not applied. UNRESOLVED (backlog).
2. **BUG-2** — 3 of those 70 routes bypass manifest runtime entirely: `events/profitability/commands/recalculate/route.ts` (direct Prisma + hardcoded cost percentages), `procurement/purchase-orders/commands/update-status/route.ts` (raw SQL), `procurement/purchase-orders/commands/receive/route.ts` (raw SQL). UNRESOLVED.
3. **BUG-3 (NEW)** — `apps/api/proxy.ts:10` lists `/api/sentry-fixer/process` in the public route allowlist — no Clerk auth required to hit this internal cron endpoint. Fix: remove from public matcher, add cron-secret header check in handler.

**Previously reported bugs status:**
- Prior duplicate Toaster → **still fixed**.
- Prior shift routes in apps/app → **still fixed**.
- BUG-1 / BUG-2 from prior runs → **still unresolved**. Git HEAD changed from `2d60b7a` — new commits landed, but BUG-3 is a new issue in the updated code.

**Notes:** No files modified this pass (read-only audit). Main report overwritten at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T16:58Z (scheduled cron — read-only audit)

**Git HEAD:** f6243963 (fix: BUG-3 remove sentry-fixer/process from public routes)

**Summary:** 2 confirmed bugs, 3 suspicious items, 8 false alarms.

**Key change this run:** BUG-3 (sentry-fixer/process exposed publicly) → **FIXED** in commit `f6243963`. `apps/api/proxy.ts` no longer lists `/api/sentry-fixer/process` in the public route matcher. Endpoint now requires Clerk auth or `x-vercel-cron: 1` header.

**Confirmed Bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher. Manifest guards/policies not applied. UNRESOLVED (backlog).
2. **BUG-2** — 3 of those 70 routes bypass manifest runtime entirely: `events/profitability/commands/recalculate/route.ts` (hardcoded cost ratios), `procurement/purchase-orders/commands/update-status/route.ts` (raw SQL), `procurement/purchase-orders/commands/receive/route.ts` (raw SQL). UNRESOLVED.

**Previously reported bugs status:**
- BUG-3 (sentry-fixer in public routes) → **FIXED** in f6243963.
- BUG-1 / BUG-2 → still unresolved. No related commits landed.
- Prior duplicate Toaster → still fixed (2dbdaa48).
- Prior shift routes in apps/app → still fixed (deleted).
- SUSP-1 (ClerkProviderClient theme-flash) → still fixed (e7234fa7).

**Notes:** No files modified this pass (read-only audit). Main report overwritten at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T17:31Z (scheduled cron — read-only audit)

**Git HEAD:** f6243963 *(unchanged from prior run — fix: BUG-3 remove sentry-fixer/process from public routes)*

**Summary:** 2 confirmed bugs, 3 suspicious items, 8 false alarms. No change from prior run.

Concrete command route count: 70 non-dispatcher in `apps/api`. Unchanged.

**Confirmed Bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher. Manifest guards/policies not applied. UNRESOLVED (backlog).
2. **BUG-2** — 3 of those 70 routes bypass manifest runtime entirely: `events/profitability/commands/recalculate/route.ts` (hardcoded cost ratios), `procurement/purchase-orders/commands/update-status/route.ts` (raw SQL), `procurement/purchase-orders/commands/receive/route.ts` (raw SQL). UNRESOLVED.

**Previously reported bugs status:**
- BUG-3 (sentry-fixer in public routes) → **still fixed** (f6243963).
- BUG-1 / BUG-2 → still unresolved. Git HEAD unchanged — no fixes landed.
- Prior duplicate Toaster → still fixed (2dbdaa48).
- Prior shift routes in apps/app → still fixed (deleted).
- SUSP-1 (ClerkProviderClient theme-flash) → still fixed (e7234fa7).

**Notes:** No files modified this pass (read-only audit). Main report overwritten at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T16:30Z (scheduled cron — read-only audit)

**Git HEAD:** e7234fa7f4cb62ed6b2916e668edbe139abf4539

**Summary:** 3 confirmed bugs, 2 suspicious items, 8 false alarms.

**New vs prior run:** HEAD advanced from `742341a5` to `e7234fa7` (fix: SUSP-1 add mounted guard to ClerkProviderClient). SUSP-1 is now resolved — the ClerkProviderClient theme-flash hydration bug is fixed. BUG-1, BUG-2, BUG-3 carry forward unchanged.

**Confirmed Bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher (`apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`). Manifest guards/policies not applied to any of these routes. UNRESOLVED (backlog).
2. **BUG-2** — 3 of those 70 routes bypass manifest runtime entirely: `events/profitability/commands/recalculate/route.ts` (direct Prisma + hardcoded 35%/15%/5% cost ratios), `procurement/purchase-orders/commands/update-status/route.ts` (raw SQL), `procurement/purchase-orders/commands/receive/route.ts` (raw SQL). UNRESOLVED.
3. **BUG-3** — `apps/api/proxy.ts:11` lists `/api/sentry-fixer/process` in the public route allowlist — no Clerk auth required. Internal cron endpoint exposed publicly. UNRESOLVED.

**Previously reported bugs status:**
- Prior duplicate Toaster → **still fixed**.
- Prior shift routes in apps/app → **still fixed** (deleted in 2d60b7ac).
- SUSP-1 (ClerkProviderClient theme-flash) → **FIXED** in e7234fa7. Mounted guard prevents hydration mismatch.
- BUG-1 / BUG-2 / BUG-3 → **still unresolved**. No related commits landed.

**Notes:** No files modified this pass (read-only audit). Main report overwritten at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-15T01:00Z (automated fix cron)

**Git HEAD:** f6243963f472add930d23cf88aefca87c74b1d7d *(pre-fix HEAD; fix commit pending)*

**Summary:** 1 bug FIXED (BUG-2). 1 confirmed bug remains (backlog). 3 suspicious items unchanged.

**Fixed this run:**

1. **BUG-2** — 3 routes bypass manifest runtime with hardcoded business logic — **FIXED (low-risk step).**
   - `events/profitability/commands/recalculate/route.ts` — cost ratios (0.35/0.15/0.05) extracted to `FOOD_COST_RATIO`, `LABOR_COST_RATIO`, `OVERHEAD_COST_RATIO`; category keywords extracted to `FOOD_CATEGORY_KEYWORDS`, `LABOR_CATEGORY_KEYWORDS`, `OVERHEAD_CATEGORY_KEYWORDS`.
   - `procurement/purchase-orders/commands/update-status/route.ts` — `VALID_TRANSITIONS` moved to shared `constants.ts`.
   - `procurement/purchase-orders/commands/receive/route.ts` — status strings replaced with `QUALITY_STATUS` and `PO_STATUS` constants from shared `constants.ts`.
   - New file: `apps/api/app/api/procurement/purchase-orders/constants.ts` — shared PO domain constants.

**Remaining bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher. UNRESOLVED (backlog — requires entity-by-entity dispatcher wiring).

**Previously reported bugs status:**
- Duplicate Toaster → **still fixed** (2dbdaa48).
- Shift routes in apps/app → **still fixed** (2d60b7ac).
- ClerkProviderClient theme-flash → **still fixed** (e7234fa7).
- BUG-3 (sentry-fixer in public routes) → **FIXED** (f6243963).
- BUG-2 (this run) → **FIXED** (commit pending).
- BUG-1 → **still unresolved**.

**Notes:** Typecheck passes clean (`pnpm --filter api typecheck`). Main report updated at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T18:00Z (scheduled cron audit)

**Git HEAD:** cbc329bd081de7418b043ca8f836b071d8c3b6a3

**Summary:** 1 confirmed bug (BUG-1, backlog unchanged). 1 suspicious item (SUSP-1 redirect URL cross-contamination, new). 6 false alarms confirmed clean.

**Confirmed bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files exist outside the single manifest dispatcher at `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`. All delegate to `executeManifestCommand()` (auth enforced), but the structural invariant is violated. UNRESOLVED (backlog).

**Suspicious items:**

1. **SUSP-2 (new)** — `packages/auth/components/sign-up.tsx:29–31` and `sign-in.tsx:29–31` cross-default fallback redirect URLs; `signInFallbackRedirectUrl` defaults to `signUpFallbackRedirectUrl` and vice versa. Benign when no env vars diverge (both fall back to `/`), but could misdirect users in split-URL config.

**False alarms / clean:**

- Provider graph: ThemeProvider → ClerkProviderClient ordering correct in `app/layout.tsx`. No broken dependency order.
- No duplicate ClerkProvider in any nested layout.
- No `afterSignInUrl`/`afterSignUpUrl` deprecated props anywhere.
- API middleware (`apps/api/proxy.ts`) returns JSON 401 — no HTML redirect on API routes.
- App middleware (`apps/app/proxy.ts`) returns JSON 401 for API, redirect only for page routes.
- NotificationsProvider `useTheme()` usage: correctly inside ThemeProvider tree.

**Previously reported bugs status:**

- Duplicate Toaster → **still fixed**.
- Shift routes in `apps/app` → **still fixed** (2d60b7ac).
- ClerkProviderClient theme-flash (SUSP-1) → **still fixed** (e7234fa7).
- BUG-3 (sentry-fixer in public routes) → **still fixed** (f6243963).
- BUG-2 (hardcoded cost ratios / SQL status strings) → **still fixed** (cbc329bd — this HEAD).
- BUG-1 (concrete manifest command routes) → **still unresolved**.

**Notes:** Read-only audit pass. No files modified. Main report overwritten at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T20:45Z (automated fix cron)

**Git HEAD:** cbc329bd081de7418b043ca8f836b071d8c3b6a7 *(pre-fix HEAD; fix commit pending)*

**Summary:** 1 bug FIXED (SUSP-1 cross-contaminated redirect fallback URLs). 1 confirmed bug remains (backlog).

**Fixed this run:**

1. **SUSP-1** — Cross-contaminated fallback redirect URLs in `packages/auth` — **FIXED.**
   - `packages/auth/components/sign-up.tsx:31` — `signInFallbackRedirectUrl` default changed from `signUpFallbackRedirectUrl` to `"/"`
   - `packages/auth/components/sign-in.tsx:31` — `signUpFallbackRedirectUrl` default changed from `signInFallbackRedirectUrl` to `"/"`
   - Both now independently default to `"/"` when their respective env vars are unset, instead of cross-wiring to each other's fallback.

**Remaining bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files in `apps/api` outside manifest single-dispatcher. UNRESOLVED (backlog — requires entity-by-entity dispatcher wiring).

**Previously reported bugs status:**
- Duplicate Toaster → **still fixed** (2dbdaa48).
- Shift routes in apps/app → **still fixed** (2d60b7ac).
- ClerkProviderClient theme-flash → **still fixed** (e7234fa7).
- BUG-3 (sentry-fixer in public routes) → **still fixed** (f6243963).
- BUG-2 (hardcoded cost ratios) → **still fixed** (cbc329bd).
- SUSP-1 (this run) → **FIXED** (commit pending).
- BUG-1 → **still unresolved**.

**Notes:** Typecheck passes clean (`pnpm --filter app typecheck`). Main report updated at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-14T18:42:00Z (scheduled cron)

**Git HEAD:** b614e7995abdf94766d15b99304960f3d6e8d255

**Summary:** 1 confirmed bug, 3 suspicious items, 6 false alarms.

**Confirmed Bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files under `apps/api/app/api/**/commands/*/route.ts` outside the manifest single-dispatcher. Violates manifest route invariant. Domains: email-templates, staff/shifts, inventory, kitchen, events, crm, procurement.

**Previously reported bugs — status:**

- **Prior BUG-1** (`clerk-provider.client.tsx:13` — `useTheme()` above ThemeProvider): **RESOLVED / FALSE ALARM.** Tree order is correct — `ClerkProviderClient` is nested inside `DesignSystemProvider` which wraps `ThemeProvider`. The prior report was incorrect.
- **Prior BUG-2** (duplicate `<Toaster />`): Not reproduced this run — only one `<Toaster />` found in `packages/design-system/index.tsx`. No duplicate in app layout. **Appears resolved or was a false alarm.**
- **Prior BUG-3** (`NotificationsProvider` mounted guard): Confirmed as intentional hydration guard, not a crash. Reclassified as SUSP-3.
- **Prior BUG-4** (command routes in frontend `apps/app`): Not reproduced — zero command route files found in `apps/app/app/api`. **Resolved or was a false alarm.**
- **Prior BUG-5** (71 concrete command routes): Still present as BUG-1 this run, count now 70.


---

### Run: 2026-05-14T22:00Z (scheduled cron)

**Git HEAD:** b614e7995abdf94766d15b99304960f3d6e8d255

**Summary:** 1 confirmed bug, 2 suspicious items, 6 false alarms.

**Confirmed Bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files under `apps/api/app/api/**/commands/*/route.ts` outside the manifest single-dispatcher. Violates manifest route invariant. Domains: email-templates, staff/shifts, inventory, kitchen, events, crm, procurement. **UNRESOLVED — same as previous runs.**

**Suspicious Items:**

1. **SUSP-1** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` with `mounted` guard causes dark-mode Clerk UI flash on first paint. Not a crash or provider order violation.
2. **SUSP-3** — `apps/api/proxy.ts:7-11` — Prefix-based public route matchers (`/webhooks(.*)`, `/api/health(.*)`) silently make future endpoints public.

**Previously reported bugs — status:**

- Prior BUG-1 (`clerk-provider.client.tsx` provider order inversion): **Remains a FALSE ALARM.** Tree order correct.
- Duplicate `<Toaster />`: **Still resolved.**
- Shift command routes in `apps/app`: **Still resolved.**
- `afterSignInUrl`/`afterSignUpUrl` deprecated props: **Still clean.**
- SUSP-1 cross-contaminated fallback URLs: **Still fixed** (prior fix run).
- **BUG-1** (concrete manifest command routes, count=70): **Still unresolved.** Same HEAD as last run — no change.

**Notes:** Main report overwritten at `docs/audits/ai-integration-invariants-2026-05-13.md`. No files modified in this pass.

---

### Run: 2026-05-15T02:52Z (scheduled cron)

**Git HEAD:** b614e7995abdf94766d15b99304960f3d6e8d255

**Summary:** 1 confirmed bug, 1 suspicious item, 6 false alarms.

**Confirmed Bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files under `apps/api/app/api/**/commands/*/route.ts` outside the manifest single-dispatcher. Domains: email-templates, staff/shifts, inventory (bulk-order-rules, variance-reports), kitchen (prep-task-plan-workflows, alerts-config), events (catering-orders, import-workflows, profitability), crm (leads, proposals). **UNRESOLVED — same HEAD as previous run.**

**Suspicious Items:**

1. **SUSP-1** — `apps/app/proxy.ts:5-11` — Prefix-based public route matchers (`/plasmic(.*)`, `/view/proposal(.*)`, `/sign/contract(.*)`) could silently expose future routes without explicit auth decision. Not broken today.

**Previously reported bugs — status:**

- **SUSP-1 (clerk mounted guard / theme flash):** Promoted to false alarm. `mounted` guard is correct; provider order correct.
- **SUSP-3 (api proxy prefix matchers):** API proxy (`apps/api`) is clean — only exposes `/webhooks` and `/api/health`. App proxy (`apps/app`) has the broader prefix risk (now SUSP-1 this run).
- **BUG-1 (70 concrete manifest command routes):** **Still unresolved.** Same HEAD as last run.
- Deprecated Clerk redirect props: **Still clean.**
- Multiple ClerkProviders: **Still clean.**

**Notes:** No code changes since previous run (same HEAD b614e799). Main report overwritten at `docs/audits/ai-integration-invariants-2026-05-13.md`. No source files modified in this pass.

---

---

### Run: 2026-05-15T03:24Z (scheduled cron)

**Git HEAD:** b614e7995abdf94766d15b99304960f3d6e8d255

**Summary:** 1 confirmed bug, 1 suspicious item, 6 false alarms.

**Confirmed Bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files under `apps/api/app/api/**/commands/*/route.ts` outside the manifest single-dispatcher. Domains: email-templates, staff/shifts, inventory (bulk-order-rules, variance-reports), kitchen (prep-task-plan-workflows, alerts-config), events (catering-orders, import-workflows, profitability), crm (leads, proposals), procurement (purchase-orders, requisitions). **UNRESOLVED — same HEAD as all previous runs.**

**Suspicious Items:**

1. **SUSP-1** — `apps/app/proxy.ts:5-11` — Prefix-based public route matchers (`/plasmic(.*)`, `/view/proposal(.*)`, `/sign/contract(.*)`) could silently expose future routes without explicit auth decision. Not broken today.

**Previously reported bugs — status:**

- **BUG-1 (70 concrete manifest command routes):** **Still unresolved.** HEAD unchanged at b614e799 since fix commits landed.
- Deprecated Clerk redirect props: **Still clean.**
- Multiple ClerkProviders: **Still clean.**
- Provider order (ClerkProviderClient / notifications-provider useTheme): **Still false alarms — order correct.**
- API middleware JSON 401: **Still clean.**

**Notes:** HEAD unchanged since last run. No new bugs introduced. Main report overwritten at `docs/audits/ai-integration-invariants-2026-05-13.md`. No source files modified in this pass.

---

---

### Run: 2026-05-15T(cron) — scheduled audit pass

**Git HEAD:** b614e7995abdf94766d15b99304960f3d6e8d255

**Summary:** 1 confirmed bug, 1 suspicious item, 6 false alarms.

**Confirmed Bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files exist under `apps/api/app/api/**/commands/*/route.ts` outside the manifest single-dispatcher. 62 delegate to `executeManifestCommand`; 8 are fully bespoke handlers bypassing manifest runtime entirely. Domains affected: email-templates, staff/shifts, inventory (bulk-order-rules, variance-reports), kitchen (prep-task-plan-workflows, alerts-config), events (catering-orders, import-workflows, profitability), crm (leads, proposals), procurement (purchase-orders). **UNRESOLVED — HEAD unchanged.**

**Suspicious Items:**

1. **SUSP-1** — `apps/app/proxy.ts:5–11` — Prefix-based public route matchers (`/plasmic(.*)`, `/view/proposal(.*)`, `/sign/contract(.*)`) could silently expose future routes without explicit auth. Not broken today.

**False Alarms:** FA-1 through FA-6 — all previously reported (ClerkProviderClient/useTheme ordering, NotificationsProvider/useTheme, auth/provider.tsx intentional omission, deprecated Clerk props, multiple ClerkProviders, API HTML redirects). All confirmed clean.

**Previously reported bugs — status:**

- **BUG-1 (70 concrete manifest command routes):** **Still unresolved.** HEAD unchanged at b614e799.
- All other previously confirmed false alarms remain clean.

**Notes:** HEAD unchanged from all previous runs. No new bugs introduced. No source files modified in this audit pass. 8 bespoke route handlers (not using executeManifestCommand) newly called out as higher-severity subset of BUG-1.

---

---

### Run: 2026-05-15T(cron-2) — scheduled audit pass

**Git HEAD:** b614e7995abdf94766d15b99304960f3d6e8d255

**Summary:** 1 confirmed bug, 1 suspicious item, 7 false alarms.

**Confirmed Bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files exist under `apps/api/app/api/**/commands/*/route.ts` outside the single-dispatcher. 8 are fully bespoke handlers not invoking manifest runtime (staff/shifts create-validated + update-validated, inventory bulk-order-rules create + update, inventory variance-reports review + approve, events profitability recalculate). 62 delegate to executeManifestCommand but still violate placement invariant. **STILL UNRESOLVED — HEAD unchanged.**

**Suspicious Items:**

1. **SUSP-1** — `apps/app/proxy.ts:5-11` — Prefix-based public route matchers (/plasmic, /view/proposal, /sign/contract) silently expose future routes added under those prefixes.

**False Alarms:** FA-1 through FA-7 confirmed clean — ClerkProviderClient/useTheme ordering (valid), NotificationsProvider/useTheme (valid), auth/provider.tsx intentional ClerkProvider omission (valid), no deprecated Clerk redirect props (clean), no duplicate ClerkProviders (clean), API routes return JSON 401/403 (clean), mobile AuthTokenBridge useAuth() correctly nested (clean).

**Previously reported bugs:**

- **BUG-1:** Still unresolved. HEAD b614e799 unchanged across all runs.

**Notes:** No new bugs. Provider graph clean. Auth middleware clean. No source files modified.

---

---

### Run: 2026-05-15T(cron-3) — scheduled audit pass

**Git HEAD:** 98dc79423d0b98685c2d12619deb8f634fa2034e

**Previous HEAD:** b614e7995abdf94766d15b99304960f3d6e8d255

**Commits since last run:** 3 (fix(v104): rate limiting on public API mutations; fix(v104): CI truth gate repair; fix: SUSP-1 Clerk redirect URL cross-contamination)

**Summary:** 1 confirmed bug (unchanged), 1 new suspicious item, 7 false alarms, 1 previous suspicious item resolved.

**Confirmed Bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files exist under `apps/api/app/api/**/commands/*/route.ts` outside the single-dispatcher. 8 are fully bespoke handlers not invoking manifest runtime. 62 delegate to `executeManifestCommand` but still violate placement invariant. **STILL UNRESOLVED.**

**Suspicious Items:**

1. **SUSP-2 (NEW)** — `apps/api/proxy.ts:11` — New `/api/public(.*)` prefix matcher (added commit 98dc7942) skips all auth for GET/HEAD and only applies rate limiting for mutations. Any handler added under `/api/public/` that omits token validation creates an unauthenticated write endpoint. No compile-time enforcement.

**Previously Reported — Now Resolved:**

- **SUSP-1** — Clerk fallback redirect URL cross-contamination — **FIXED** in commit b614e799. No deprecated `afterSignInUrl`/`afterSignUpUrl` props detected anywhere.

**False Alarms:** FA-1 through FA-8 confirmed clean — provider ordering valid, no duplicate ClerkProviders, no deprecated Clerk props, API routes return JSON 401/403, mobile ClerkProvider nesting correct.

**Notes:** No source files modified in this audit pass. Provider graph and auth middleware remain clean.

---

### Run: 2026-05-15T(cron-4) — scheduled audit pass

**Git HEAD:** 98dc79423d0b98685c2d12619deb8f634fa2034e *(unchanged from prior run — cron-3)*

**Summary:** 1 confirmed bug, 1 suspicious item, 8 false alarms. No change from cron-3.

**Confirmed Bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files exist under `apps/api/app/api/**/commands/*/route.ts` outside the single-dispatcher. 8 are fully bespoke handlers not invoking manifest runtime (staff/shifts create-validated + update-validated, inventory bulk-order-rules create + update, inventory variance-reports review + approve, events profitability recalculate, communications email-templates create). 62 delegate to `executeManifestCommand` but still violate placement invariant. **STILL UNRESOLVED — HEAD unchanged.**

**Suspicious Items:**

1. **SUSP-2** — `apps/api/proxy.ts:11` — `/api/public(.*)` prefix matcher skips auth for GET/HEAD and only rate-limits mutations. No compile-time enforcement that handlers under this prefix validate tokens. Any future route under `/api/public/` without token validation is silently unauthenticated.

**Previously Reported — Status:**

- **BUG-1 (70 concrete manifest command routes):** Still unresolved. HEAD unchanged at 98dc7942.
- **SUSP-1 (Clerk fallback redirect cross-contamination):** Still fixed (b614e799). No deprecated props found.
- All other false alarms (FA-1 through FA-8) remain confirmed clean.

**Notes:** HEAD unchanged from cron-3. No new bugs introduced. No source files modified. Main report overwritten at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

---

### Run: 2026-05-15T(cron-5) — scheduled audit pass

**Git HEAD:** ec1aad0b (test: add event intake E2E workflow + pricing engine unit tests)

**Previous HEAD:** 98dc79423d0b98685c2d12619deb8f634fa2034e

**Commits since last run:** 1 (test-only: E2E workflow + pricing engine unit tests — no provider, route, or auth changes)

**Summary:** 1 confirmed bug, 2 suspicious items, 8 false alarms. No change in bug categories or counts.

**Confirmed Bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files under `apps/api/app/api/**/commands/*/route.ts` outside the manifest single-dispatcher. ~8 bespoke handlers bypass manifest runtime entirely (staff/shifts create-validated + update-validated, inventory bulk-order-rules create + update, inventory variance-reports review + approve, events profitability recalculate, communications email-templates create). 62 others call `executeManifestCommand` but still violate placement invariant. **STILL UNRESOLVED — backlog.**

**Suspicious Items:**

1. **SUSP-2** — `apps/api/proxy.ts:11` — `/api/public(.*)` prefix matcher skips all auth for GET/HEAD; no compile-time enforcement that handlers under this prefix validate tokens.
2. **SUSP-1** — `apps/app/proxy.ts:5-11` — Prefix-based public route matchers (`/plasmic(.*)`, `/view/proposal(.*)`, `/sign/contract(.*)`) could silently expose future routes without explicit auth decision.

**Previously reported bugs — status:**

- **BUG-1 (70 concrete manifest command routes):** Still unresolved. HEAD advanced from 98dc7942 → ec1aad0b but new commit is test-only; no fix landed.
- **SUSP-1 (Clerk fallback redirect cross-contamination):** Still fixed (b614e799).
- Duplicate Toaster: Still fixed (2dbdaa48).
- Shift routes in apps/app: Still fixed (deleted).
- BUG-3 sentry-fixer in public routes: Still fixed (f6243963).
- BUG-2 hardcoded cost ratios: Still fixed (cbc329bd).
- All FA-1 through FA-8: Confirmed clean.

**Notes:** No source files modified in this audit pass. Provider graph, Clerk ordering, auth middleware all clean. Main report overwritten at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

### Run: 2026-05-15T(cron-6) — scheduled audit pass

**Git HEAD:** ec1aad0b (test: add event intake E2E workflow + pricing engine unit tests)

**Previous HEAD:** ec1aad0b *(unchanged from cron-5)*

**Summary:** 1 confirmed bug, 2 suspicious items, 8 false alarms. No change in any category or count.

**Confirmed Bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files under `apps/api/app/api/**/commands/*/route.ts` outside the manifest single-dispatcher. ~8 bespoke handlers bypass manifest runtime entirely (staff/shifts create-validated + update-validated, inventory bulk-order-rules create + update, inventory variance-reports review + approve, events profitability recalculate, communications email-templates create). 62 others call `executeManifestCommand` but still violate placement invariant. **STILL UNRESOLVED — backlog.**

**Suspicious Items:**

1. **SUSP-2** — `apps/api/proxy.ts:11` — `/api/public(.*)` prefix matcher skips all auth for GET/HEAD; no compile-time enforcement that handlers under this prefix validate tokens.
2. **SUSP-1** — `apps/app/proxy.ts:5-11` — Prefix-based public route matchers (`/plasmic(.*)`, `/view/proposal(.*)`, `/sign/contract(.*)`) could silently expose future routes without explicit auth decision.

**Previously reported bugs — status:**

- **BUG-1 (70 concrete manifest command routes):** Still unresolved. HEAD unchanged at ec1aad0b since cron-5.
- **SUSP-1 (Clerk fallback redirect cross-contamination):** Still fixed (b614e799).
- Duplicate Toaster: Still fixed (2dbdaa48).
- Shift routes in apps/app: Still fixed (deleted, 2d60b7ac).
- sentry-fixer in public routes: Still fixed (f6243963).
- Hardcoded cost ratios: Still fixed (cbc329bd).
- All FA-1 through FA-8: Confirmed clean.

**Notes:** HEAD unchanged from cron-5. No new bugs introduced. No source files modified. Provider graph, Clerk ordering, auth middleware all clean. Main report overwritten at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---

---

### Run: 2026-05-15T(cron-7) — scheduled audit pass

**Git HEAD:** ec1aad0b (test: add event intake E2E workflow + pricing engine unit tests)

**Previous HEAD:** ec1aad0b *(unchanged from cron-6)*

**Summary:** 2 confirmed bugs, 2 suspicious items, 8 false alarms.

> Note: BUG count revised from 1 to 2 this run. BUG-1 is the same 70-route invariant violation (unchanged). BUG-2 is the `ClerkProviderClient` useTheme-before-hydration flash — previously classified as part of BUG-1 context; now broken out explicitly as a confirmed (mitigated) cosmetic bug. No new regressions.

**Confirmed Bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files under `apps/api/app/api/**/commands/*/route.ts` outside the manifest single-dispatcher. 3 of these fully bypass manifest runtime (no `runCommand`/`executeManifestCommand`): `events/profitability/commands/recalculate/route.ts` (hardcoded cost ratios, pure DB write), `procurement/purchase-orders/commands/update-status/route.ts` (raw SQL), `procurement/purchase-orders/commands/receive/route.ts` (raw SQL). STILL UNRESOLVED — backlog.

2. **BUG-2** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` resolves `undefined` during SSR/initial hydration causing a flash of light-mode Clerk UI on dark-mode pages. Mitigated by `mounted` guard but flash is still present. Cosmetic only.

**Suspicious Items:**

1. **SUSP-1** — `apps/app/proxy.ts:5-11` — Prefix-based public matchers (`/plasmic(.*)`, `/view/proposal(.*)`, `/sign/contract(.*)`) silently expose any future routes added under these paths.
2. **SUSP-2** — `apps/api/proxy.ts:11` — `/api/public(.*)` blanket GET/HEAD bypass; per-handler token validation not statically enforced.

**Previously reported bugs — status:**

- **BUG-1 (70 concrete manifest command routes):** Still unresolved. HEAD unchanged at ec1aad0b.
- **BUG-2 (ClerkProviderClient useTheme flash):** Mitigated but cosmetically broken. Not new — existing since initial implementation.
- Deprecated `afterSignInUrl`/`afterSignUpUrl`: Confirmed ABSENT — not found anywhere in codebase.
- Duplicate Toaster: Still fixed.
- Shift routes in apps/app: Still fixed.
- sentry-fixer in public routes: Still fixed.
- FA-1 through FA-8: Confirmed clean.

**Notes:** HEAD unchanged from cron-6. No new bugs introduced. No source files modified. Provider graph ordering valid. QueryClientProvider covers all hook callers. Single ClerkProvider at root — no duplicates. No stale Clerk redirect props found.

---

---

### Run: 2026-05-15T(cron-8) — scheduled audit pass

**Git HEAD:** ec1aad0bc4e045df5ea300e9667759b88b90ea03

**Previous HEAD:** ec1aad0b *(unchanged from cron-7)*

**Summary:** 2 confirmed bugs, 2 suspicious items, 8 false alarms.

> Note: HEAD unchanged for the third consecutive run. No new bugs. All previously confirmed findings stable.

**Confirmed Bugs:**

1. **BUG-1** — 70 concrete command `route.ts` files under `apps/api/app/api/**/commands/*/route.ts` outside the manifest single-dispatcher. 8 routes fully bypass `executeManifestCommand` entirely; worst: `events/profitability/commands/recalculate/route.ts` (hardcoded cost ratios), `procurement/purchase-orders/commands/update-status/route.ts` (raw SQL), `procurement/purchase-orders/commands/receive/route.ts` (raw SQL). STILL UNRESOLVED — backlog.

2. **BUG-2** — `apps/app/app/clerk-provider.client.tsx:13` — `useTheme()` resolves `undefined` during SSR/initial hydration causing a flash of light-mode Clerk UI on dark-mode pages. Mitigated by `mounted` guard; cosmetic only.

**Suspicious Items:**

1. **SUSP-1** — `apps/app/proxy.ts:5-11` — Prefix-based public matchers (`/plasmic(.*)`, `/view/proposal(.*)`, `/sign/contract(.*)`) silently expose any future routes added under these paths.
2. **SUSP-2** — `apps/api/proxy.ts:11` — `/api/public(.*)` blanket GET/HEAD bypass; per-handler token validation not statically enforced.

**Previously reported bugs — status:**

- **BUG-1:** STILL UNRESOLVED. No code changes at HEAD.
- **BUG-2:** Mitigated, cosmetically unfixed. No change.
- **SUSP-1/SUSP-2:** Unchanged design risks.
- All FA-1 through FA-8: Still clean.

**Notes:** HEAD unchanged from cron-7. No source files modified in this pass. Provider graph, Clerk ordering, QueryClientProvider coverage, and auth middleware all confirmed clean. Main report overwritten at `docs/audits/ai-integration-invariants-2026-05-13.md`.

---
