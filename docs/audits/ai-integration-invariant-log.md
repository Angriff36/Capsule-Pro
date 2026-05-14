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
