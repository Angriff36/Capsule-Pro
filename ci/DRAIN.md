# ci/DRAIN.md — Standing instruction for draining CI debt

You are an agent assigned to reduce the Capsule-Pro CI debt. This is the only
direction allowed: **DOWN**. Never raise a baseline. Never quarantine a new test
to make CI green. Never `--save-baseline` to absorb a new violation.

This doc names every gate that ships with a baseline or in advisory/reporting
mode, the file that records its current debt level, and the exact rule for how
to retire one entry.

---

## The three debt mechanisms

| Mechanism | What it does | Allowed change |
|---|---|---|
| **Quarantine baseline** (`ci/quarantine-baseline.json`) | Lists `*.quarantine.test.ts` files that pnpm test skips. `ci/check-quarantine-baseline.mjs` fails CI if count grows. | Remove entries only. Rename `.quarantine.test.ts` → `.test.ts`, fix the test, then drop the file from the JSON `files` array and decrement `count`. |
| **Audit baselines** under `manifest/governance/baselines/` | Stable-key snapshots of pre-existing constitution-level findings (direct-write, security advisories). New findings block CI. | Remove entries only. Migrate the code, run the audit, regenerate via `--save-baseline` *only after the count went down*. |
| **Reporting gates** with `continue-on-error: true` in `.github/workflows/manifest-ci.yml` | Surface but don't block: governance-audit, integration-check, enforce-surface, audit-routes, check-hardcoded-routes. Each carries an inline flip-to-blocking condition. | Reduce the underlying finding count until the inline condition is met, then remove `continue-on-error: true` from the workflow. |

---

## The buckets to drain (in recommended order)

Smallest-impact buckets first, so each merge keeps CI strictly improving.

### Bucket A — `packages/sentry-integration/__tests__/integration.quarantine.test.ts` (1 file)
- **Root cause**: `queue.ts:303` calls `addBreadcrumb` against an unmocked Sentry shim; vitest test harness lacks the export.
- **Fix path**: add `addBreadcrumb: vi.fn()` to the Sentry mock used by this test, OR mock `@sentry/node` exports the queue.ts file needs.
- **After fix**: `git mv integration.quarantine.test.ts integration.test.ts`, edit `ci/quarantine-baseline.json` to remove that line and decrement `count` from 74 to 73.

### Bucket B — apps/api Sentry-addBreadcrumb harness gap (43 files)
- **Root cause**: same `addBreadcrumb is not a function` error across the apps/api test corpus. They share a setup file.
- **Fix path**: add the missing mock to `apps/api/test/setup.ts` (or wherever the apps/api vitest setup lives). One change can lift many tests at once.
- **After fix**: rename in batches. For each fixed file, `git mv X.quarantine.test.ts X.test.ts`, run `pnpm --filter api test path/to/X.test.ts` to confirm green, drop from baseline, decrement.

### Bucket C — apps/api kitchen `{params}: undefined` harness gap (21 files)
- **Root cause**: tests invoke Next.js route handlers with only `request` and no second arg; the new App Router signature is `(request, { params: Promise<...> })`. Many of these tests predate the App Router params change.
- **Fix path**: update the test harness/helper that calls route handlers so it always passes `{ params: Promise.resolve({...}) }`. One helper fix can lift many tests at once.
- **After fix**: same batching pattern as bucket B.

### Bucket D — `packages/manifest-adapters` snake_case fixtures (6 files: batch06,07,08,10,11,12)
- **Root cause**: commit `71ac7dd54` renamed snake_case Prisma models to camelCase; these test fixtures (`fakeRow` keys) and `expect.objectContaining` shapes were left as snake_case. The TrainingModule fix in commit `4a542ee15` is the worked example — apply the same pattern.
- **Fix path**: per file, convert fixture keys + assertion `where:`/`data:` shapes from snake_case to camelCase. Also audit the corresponding `src/prisma-stores/broken-read-batch<N>-*.ts` for `row.<snake_case>` accesses in `mapToManifestEntity` and convert those too.
- **After fix**: rename, smoke `pnpm --filter @repo/manifest-adapters test`, drop from baseline.

### Bucket E — apps/api manifest latency tests (2 files)
- **Root cause**: `keys.ts` env validation rejects DATABASE_URL access in test environment.
- **Fix path**: stub `DATABASE_URL` in the test setup or mock `@repo/database/keys`. Single fix likely covers both files.

---

## The constitution-level reporting gates

Each lives in `.github/workflows/manifest-ci.yml` with `continue-on-error: true` and an inline `# Flip to blocking when ...` comment. The current baselines:

| Gate | Current count | Inline flip condition |
|---|---|---|
| `Governance Audit (Reporting)` | 576 errors | `MISSING_CONFORMANCE_TEST` resolved |
| `Integration Check (Reporting)` | — | flips with governance |
| `Enforce Surface (Reported)` | 27 errors / 3 warnings | upstream raw-SQL detection ships AND 30 known findings exempted/fixed |
| `Route Boundary Audit (Strict)` | 175 ownership errors | exemptions resolved or moved to exemptions registry |
| `Check canonical routes` (in `ci.yml`) | 587 hardcoded `/api/` literals | count drops below 50 |
| `E2E Product-Flow Tests` migration step | continue-on-error; missing Supabase scaffolding | seed `core.*` schema in test DB OR migrations rewritten portable |

For each of these, the drain is the same shape: reduce findings, watch the
gate's report number drop, eventually edit the workflow to remove
`continue-on-error: true` + add `--strict` where applicable.

---

## What you MUST NOT do

- **Never** edit `ci/quarantine-baseline.json` to add an entry.
- **Never** edit `manifest/governance/baselines/*.json` to add an entry without first verifying it represents a resolved finding.
- **Never** add `continue-on-error: true` to a step or job that doesn't already have it.
- **Never** delete a quarantined test to "remove it from the count" — that destroys the only evidence of the bug. The test must be FIXED (or its harness fixed), then renamed back.
- **Never** rewrite a quarantined test's assertions to make it pass against the wrong behavior. The point of quarantine is that the assertion is correct and the source is wrong (or the harness is wrong).
- **Never** invoke `--save-baseline` on any baseline as the first step. It is the LAST step after the count went down.

If you cannot reduce a count and you have a real new finding that must be accepted:
1. Stop and surface it in the PR body.
2. Explain why it cannot be fixed in this PR.
3. Update the baseline, ONLY with reviewer ack, in the same PR that introduces the new finding.

---

## Per-session checklist

Open the gate state with `gh pr checks` or look at `manifest-ci.yml`. Pick ONE bucket from §"The buckets to drain." Make the smallest fix that retires one or more entries. Run the local equivalent of the gate to confirm. Update the baseline file (count and file list) to match the new reality. Push.

Repeat. Lower the number.
