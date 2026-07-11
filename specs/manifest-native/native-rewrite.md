# Native manifest source rewrite

_Serves JTBD(s):_ capsule-pro maintainers keep business rules declared natively in Manifest source — so guards, policies, constraints, cascades, and crons are enforced by the runtime and pipeline gates instead of drifting hand-rolled TypeScript.

## Job Statement

Rewrite `manifest/source/**/*.manifest` (~104 files) to use the native Manifest constructs the codebase currently ignores — real uuid defaults, role capabilities, enums, named constraints, reactions/fanOut/count, schedules — so that the source expresses what the runtime actually enforces and the live WS0 create-breaking bug is eliminated.

**The authoritative plan is `manifest/NATIVE-REWRITE-PLAN.md`** — gap matrix, workstreams WS0–WS16, Phase 0 preflights P1–P9, per-workstream how-to, sequencing, and standing constraints. This spec does not restate it; read it every iteration. Style must match `manifest/source/manifest-example.manifest.bak` and `manifest/source/manifest-example-native-fixed.manifest.example`. Pipeline mechanics live in `manifest/CLAUDE.md`.

Operating rules (from the plan's standing constraints — violations are drift, not progress):

- Edit `.manifest` source only; regenerate everything with `pnpm manifest:build`; gate with `pnpm manifest:ci`. Never hand-edit generated artifacts; never run the bare `manifest` CLI.
- One domain-batch = one commit (`refactor(manifest): <domain> <workstream> — <what>` — conventional format; the commit-msg hook rejects bracket prefixes), staged by explicit pathspec, green gates at every commit.
- Schema changes: `pnpm db:dev -- --create-only` and review the SQL. Deploy is a human step — record migrations as awaiting deploy.
- Unanswered Phase 0 preflights gate their workstreams; record answers in the plan document itself.
- WS0's persist-before-mutate wrinkle is the trap: a blind `s/= ""//` is NOT sufficient — classify each field nullable-vs-required and mutate-filled-vs-param-seeded per the plan.

## Acceptance Criteria

- [ ] Zero `uuid … = ""` defaults in `manifest/source` (WS0; 188 at plan time), with a passing Postgres-backed create smoke-test per touched entity — in-memory stores hide the failure
- [ ] Zero `user.role in [...]` literals (WS1; 464 at plan time); each capability replacement proven semantics-identical via an effectivePermissions IR diff
- [ ] Zero closed-set `status: string` fields (WS7; 82 at plan time); each domain batch fully enum-typed with its redundant `validStatus` constraint removed
- [ ] Every portable middleware ported to a native reaction/fanOut/count with wiring deleted and test ported in the same commit (WS3); justified-TS categories left alone
- [ ] 10/10 vercel.json crons declared as native `schedule` (WS5), generated route proven before hand wiring removed
- [ ] `pnpm manifest:ci` green at every commit; no new governance-allowlist entries
- [ ] Every fork-gated item (WS6, WS9-if-FK, WS11, WS12–WS14) documented as a NEEDS-RYAN proposal, not implemented

## Out of Scope

- `external entity`, `realtime` flags, new display-only `computed` aggregates, retiring the `generate.mjs` route remap — WS15 non-goals, documented so loops don't re-litigate
- Running `db:deploy`/`db:push` or hand-authoring migration SQL — human deploys
- Implementing Phase-3 / NEEDS-RYAN forks without written sign-off
- Pipeline glue divergences — those live in `MANIFEST-DIVERGENCES.md` (D-series), not this rewrite

## Open Questions

- Phase 0 preflights P1–P9 (role-name case matching, enum end-to-end, schedule/webhook projection reality, OCC status, fanOut/count conformance) — each gates its workstream; answer and record in `manifest/NATIVE-REWRITE-PLAN.md` before starting the gated work
- Is the installed compiler ≥ 3.4.23 (trusted `from context.*` params emit as optional in zod)? Verify `@angriff36/manifest` version before relying on trusted params
