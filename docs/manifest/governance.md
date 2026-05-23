<!-- BEGIN:capsule-manifest-constitution-rules -->

# Capsule-Pro: Manifest Constitution is the governing layer

This is the canonical Manifest governance doc for Capsule-Pro. It pairs with the formal charter at [`docs/manifest/constitution/constitution-v1.md`](./constitution/constitution-v1.md) (semantic authority) and the 2026-02-22 implementation plan at [`docs/manifest/Manifest-governance.md`](./Manifest-governance.md) (historical strategy). The constitution decides what is allowed; this doc defines the operational rules for THIS app and is the source of truth for routing, aliasing, bypassing, evidence, and reporting.

Before any Capsule-Pro coding, planning, cleanup, route migration, API work, auth work, Prisma/database work, or test work:

1. Read this doc.
2. Read the formal charter at `docs/manifest/constitution/constitution-v1.md`.
3. Read the installed Manifest CLI/runtime source or bundled docs relevant to the task.
4. Treat the Manifest constitution + this governance doc as the repo's decision-making authority.
5. Do not treat a green CLI result as proof of real compliance unless behavior is actually governed, tested, and routed correctly.

The Manifest constitution decides what is allowed. Framework docs only explain how to implement an allowed change.

## Mandatory preflight

Before editing files, report:

- Which constitution/governance files were read.
- Which Manifest CLI/runtime files or docs were read.
- Which Manifest command surface is affected.
- Whether the change touches dispatcher routing, governance, bypasses, direct writes, event emission, auth, tenant isolation, stores, or conformance tests.
- Whether the work is hard compliance or detector-only compliance risk.

If the constitution or Manifest docs are missing, stale, contradictory, or unclear, stop and report the gap. Do not guess.

## Manifest routing rules

- Canonical server dispatcher (verified): `apps/api/app/api/manifest/[entity]/commands/[command]/route.ts`.
- Canonical dispatcher URL shape: `POST /api/manifest/{entity}/commands/{command}`.
- Client/UI callers (Next.js app) must NOT contain raw `/api/...` string literals. Verified client SDK: `apps/app/app/lib/routes.ts` (the *only* file in client code allowed to define `/api/...` strings; covers all API endpoints, not just Manifest). The CI conformance check + ESLint rule enforce this.
- App-side server-action shim (verified): `apps/app/lib/manifest-runtime.ts` (wraps `@repo/manifest-adapters/manifest-runtime-factory`). Server actions that invoke `runCommand` directly use this. There is **no** `apps/app/lib/manifest/routes.ts` — that path was a stale doc invention and has been removed from this repo's docs.

- Do not add new concrete per-command API routes.
- Do not bypass the dispatcher with direct `runCommand` route handlers unless the route is explicitly documented as a temporary compatibility alias.
- Do not add `DEPRECATED ALIAS` just to silence route-drift.
- A `DEPRECATED ALIAS` is only acceptable if the route is either:
  - a true thin forwarder to the canonical dispatcher, or
  - a temporary compatibility route with a precise blocker documented in-file.

Valid blockers include only:
- composite transaction
- multi-method route
- pre-command validation
- post-command side effect
- status/body multiplexing
- missing Manifest store
- shadow/testing route

Every alias must name the canonical dispatcher target and explain what would break if migrated immediately.

## Bypass rules

A bypass is an explicit, documented exception to the canonical write path. It must live in `bypasses.json` at the repo root and validate clean under `pnpm manifest audit-bypasses --registry bypasses.json --strict-expiry`.

Required per entry (schema: `node_modules/@angriff36/manifest/docs/spec/registry/bypasses.schema.json`):
- `entity` — name of the governed entity being bypassed.
- `path` — repo-root-relative file path of the bypass, forward-slashed.
- `reason` — what the bypass does, in plain words.
- `whyRuntimeNotRequired` — why this mutation legitimately does NOT need runtime governance. The phrase "we will migrate later" is explicitly NOT acceptable.
- `tenantBoundary` — what tenant/security boundary still applies (e.g. "enforced by RLS", "admin-only via Clerk middleware", "no tenant data").
- `owner` — human or team responsible.
- `approvedAt` — ISO date of approval.
- `reviewBy` — ISO date by which the bypass must be re-reviewed. Past dates fail `--strict-expiry`.

Rules:
- Bypasses are last-resort, not a substitute for governed commands.
- Never add a bypass to silence a detector; the bypass must reflect a real, intentional design decision.
- Prefer migration to the canonical dispatcher over an allowlist.
- An empty `{ "version": "1", "bypasses": [] }` is acceptable and preferred when no real bypasses exist.
- If `direct-writes` later flags a file that has no legitimate manifest path, either migrate it or add a bypass entry — never just delete the detector hit.

## Direct-write rules

A direct write is any code outside the manifest runtime that mutates governed entity state (e.g. `database.X.create/update/delete/upsert/*Many`, `prisma.X.create(...)`, raw SQL `INSERT/UPDATE/DELETE`, etc.).

- Direct writes for governed entities are forbidden outside of `bypasses.json` entries.
- Read paths may bypass the runtime freely (per constitution §3). Reads must not encode domain meaning or invariants.
- Outbox events must originate from runtime command execution, not from application code (per constitution §5 and [`Manifest-governance.md`](./Manifest-governance.md) §D).
- If you find a direct write that the detector did not flag, you are still responsible for flagging it: open a bypass entry or migrate it.

### The `@angriff36/manifest` detector blind spot

The bundled `direct-writes` detector is structurally narrow and does NOT prove Capsule-Pro is clean. Read its source at `node_modules/@angriff36/manifest/packages/cli/dist/audit/direct-writes.js`. Two narrowing factors:

1. **Identifier regex.** The detector regex is
   `\bprisma\s*\.\s*\w+\s*\.\s*(create|update|delete|upsert|createMany|updateMany|deleteMany)\s*\(`.
   It only matches the literal identifier `prisma.`. Capsule re-exports `PrismaClient` as `database` from `@repo/database`, so the vast majority of repo writes (`database.X.method(...)`) are silently skipped.

2. **Scan globs.** The detector only walks:
   - `app/api/**/route.ts`
   - `app/actions/**/*.ts`
   - `jobs/**/*.ts`

   Writes from helpers under `apps/api/app/lib/**`, `apps/api/lib/**`, server actions outside `app/actions/` (e.g. Capsule's `apps/app/app/(authenticated)/**/actions.ts`), packages, and cron handlers under `app/api/cron/**` are all out of scope.

A green `pnpm manifest audit-governance ... --strict` therefore proves nothing about direct-write hygiene. **Treat detector results as soft compliance only**; hard compliance for direct writes requires the Capsule-local audit described below.

### Capsule-local direct-write audit

The repo ships a Capsule-local audit at `scripts/manifest/audit-direct-writes.mjs`. Run it:

```bash
# Reads bypasses.json + manifest-registry/entities.json,
# writes JSON + Markdown reports to manifest-audit/.
pnpm manifest:audit-direct-writes

# Same, but exits non-zero if any governed-entity write is unallowlisted
# and uncovered by a bypass entry.
pnpm manifest:audit-direct-writes:strict
```

What the script does:

1. Walks `apps/` and `packages/` for every `.ts` / `.tsx` file.
2. Matches `\b(database|prisma)\.\w+\.<writeMethod>(` per line (both client identifiers, all seven write methods).
3. Skips a small documented allowlist of paths that are structurally part of the manifest runtime, the ORM, the Sentry store, or the test corpus. Each allowlist rule's reason is surfaced in the report so reviewers can challenge the rule itself.
4. Cross-references each hit's Prisma model against `manifest-registry/entities.json` (governed entities) and against `bypasses.json` (approved exceptions).
5. Cross-references each file against the `DEPRECATED ALIAS` marker at the top of the file.
6. Emits two artifacts:
   - `manifest-audit/direct-writes.json` — full structured report
   - `manifest-audit/direct-writes.md` — human-readable report bucketed by severity

Report buckets, highest priority first:

- **Reported — governed entity, no `DEPRECATED ALIAS`, no bypass.** Real constitution violations. Each must be migrated to a Manifest command, converted to a documented alias, or added to `bypasses.json` with a real `whyRuntimeNotRequired`.
- **Reported — governed entity, `DEPRECATED ALIAS` marker present.** The migration backlog. Each retained alias must carry an in-file blocker that is exact and actionable (see "Alias blocker quality bar" below).
- **Reported — ungoverned entity.** Not a constitution violation; the entity has no manifest definition. Reported for visibility so reviewers can confirm the entity should stay ungoverned.
- **Allowed (allowlisted by the audit script).** Runtime / infrastructure / test tier. The reason for each allowlist rule is in the report.

### Alias blocker quality bar

For every retained `DEPRECATED ALIAS` that contains a direct write, the in-file comment at the top of the route MUST identify:

- The canonical dispatcher target (e.g. `/api/manifest/EventContract/commands/send`).
- The **specific** reason a direct write remains. Pick one of the seven blockers in "Manifest routing rules" above and name it concretely (e.g. "post-command side effect: signing-token generation will move to an event handler"; "store-parity gap: SmsAutomationRule is not in ENTITIES_WITH_SPECIFIC_STORES so PrismaJsonStore does not write the relational columns").
- The concrete migration path (what change to which file would remove the alias).
- The migration client guidance (what new clients should call instead).

"We will migrate later" is not acceptable as a blocker.

### Compliance classification for direct writes

Always report direct-write compliance in one of three modes; do not conflate them:

- **Hard compliance:** `manifest:audit-direct-writes:strict` exits 0 AND every retained alias has a quality-bar blocker. This is what the constitution requires.
- **Soft compliance:** The upstream detectors are green but the local audit still reports governed-entity writes outside aliases/bypasses. The repo is in a known-leaky state with a tracked migration backlog.
- **Detector-only compliance:** Only the upstream CLI was run; the Capsule-local audit was not. This is NOT a compliance claim. Reject any PR description that calls a green `pnpm manifest audit-governance` "compliance" without also running the local audit.

## Conformance rules

The `missing-tests` detector substring-greps the test corpus (`*.test.ts`, `*.test.tsx`, `*.test.js`, `*.conformance.json`, `*.fixture.json`, `**/conformance/**/*.json`, `**/harness/**/*.json`) for each governed `commandId`. Any reference satisfies the detector.

**Only one tier of evidence is acceptable:**
- **Behavior evidence** — real `*.test.{ts,tsx,js}` (or `*.conformance.json` fixtures driven by `harness`) that invokes `runCommand` against compiled IR and asserts the outcome plus the emitted events. This is what constitution §6 requires.

**Not acceptable:**
- An auto-generated JSON file whose only function is to list every `commandId` so the substring detector matches. That is detector-only / fake compliance. An IR-derived projection (e.g. `apps/api/manifest-conformance/commands-contract.json` — **note: no `.conformance.json` suffix, intentionally**) is allowed as repo documentation, but must NOT be placed where the corpus globs would match it (`*.conformance.json`, `**/conformance/**/*.json`, `**/harness/**/*.json`, etc.). If you add such reference data, name it so the detector ignores it.
- Hand-crafted strings, comments, or fixtures whose only purpose is to make a `commandId` appear in the corpus.

If `pnpm manifest integration-check` is failing on `MISSING_CONFORMANCE_TEST`, the honest responses are: (a) add a behavior test that genuinely covers the command, (b) accept the failure as a tracked gap and report soft compliance for that command, or (c) demote the command from the governed registry if it is dead. Silencing the detector with named-only evidence is not a response.

## Hard compliance vs detector-only compliance

Two distinct compliance modes exist; both must be considered for every Manifest-touching change.

- **Hard compliance** — the change actually upholds the constitution: routed through the canonical dispatcher, mutations executed by `runCommand`, events emitted by the runtime, guards/policies evaluated, idempotency stable, outbox single-source, tenants isolated, tests assert observable behavior.
- **Detector-only compliance** — the `manifest` CLI reports zero errors but one or more of the above is not actually true (e.g. a DEPRECATED ALIAS that does not forward; a contract fixture that names a commandId nobody executes; a bypass with a "we will migrate later" rationale; an event re-emitted from a server action).

Rules:
- Every Manifest-touching change must be classified by the author as `hard-compliance` or `detector-only`. If `detector-only`, the change must include the specific remediation plan and the owner.
- A clean `pnpm manifest integration-check` is necessary but not sufficient. Reviewers must verify the underlying behavior.
- "Silencing the detector" is not a valid task outcome. The valid outcomes are: migrate, refactor, add a documented alias with an in-file blocker, add a bypass entry, or open a tracked follow-up.

## Product-impact reporting requirement

For every Manifest-touching change, the PR/commit description must include a "Product impact" section that reports:

1. **Surface affected** — which entity/command(s), and which routes.
2. **Compliance class** — `hard-compliance` or `detector-only`. If detector-only, the remediation plan + owner.
3. **Behavior delta** — what observable behavior is added, changed, or removed for end users or external clients. Use "no observable change" only when literally true.
4. **Backward compatibility** — which existing URLs/contracts are preserved as aliases, which are deprecated, which are removed.
5. **Evidence** — which detectors were run, what the result was, and which behavior tests cover the change (or why they don't yet).
6. **Followups** — any tracked migration, test, or governance work created by this change.

If a change touches Manifest but the author cannot fill in the Product impact section, the change is not ready to merge.

## Governance check commands

Manifest governance is not optional.

Use `pnpm manifest <command>` only. Operational command examples (cheat sheet) live in [`AGENTS.md`](../../AGENTS.md#manifest-cli-cheat-sheet).

The four upstream checks that gate a Manifest-touching change:

```bash
pnpm manifest check -g "packages/manifest-adapters/manifests/*.manifest"
pnpm manifest audit-bypasses --registry bypasses.json --strict-expiry
pnpm manifest audit-governance -r apps/api --commands-registry ../../manifest-registry/commands.json --bypass-registry ../../bypasses.json --strict
pnpm manifest integration-check --root apps/api --commands-registry manifest-registry/commands.json --bypass-registry bypasses.json
```

Plus the Capsule-local check that closes the direct-write detector blind spot:

```bash
pnpm manifest:audit-direct-writes          # report-only
pnpm manifest:audit-direct-writes:strict   # fail on governed-entity violations
```

All five must pass before a change can claim hard compliance for direct writes. A pass on the upstream four alone does not imply hard compliance — see "Hard compliance vs detector-only compliance" and "The `@angriff36/manifest` detector blind spot" above.

<!-- END:capsule-manifest-constitution-rules -->
