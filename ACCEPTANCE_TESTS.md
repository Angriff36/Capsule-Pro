<!--
Completion contract. Seeded from the success criteria of manifest/NATIVE-REWRITE-PLAN.md;
PLAN mode maintains it from specs/manifest-native/*. BUILD mode gates completion on this
file: every non-RETIRED criterion needs its real check passing — no deleting, skipping,
or weakening checks to fake a pass.

Ids are stable: assigned once, never renumbered. Status: PENDING | PASS | RETIRED.
Counts show plan-time → re-verified 2026-07-11 (bare rg over manifest/source/*.manifest,
reference .bak/.example excluded). Re-count every iteration — never trust these.
-->

| Id | Spec | Outcome to verify (WHAT, not HOW) | Required check | Status |
| ------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ------- |
| AC-001 | specs/manifest-native/native-rewrite.md | WS0: zero `uuid … = ""` defaults remain in `manifest/source` (188 plan-time → **134 / 47 files** on 2026-07-11 after the logistics nullable WS0 batch; was 139/48 post-maintenance) | `rg 'uuid.*= ""' manifest/source -g '*.manifest'` → 0 matches | PENDING |
| AC-002 | specs/manifest-native/native-rewrite.md | WS0: every entity touched by a uuid-default fix has a passing Postgres-backed create smoke-test (in-memory stores hide the bug). TrainingAssignment pilot already proven. | per-entity create smoke-test against Postgres | PENDING |
| AC-003 | specs/manifest-native/native-rewrite.md | WS1: zero `user.role in [...]` literals (464 plan-time → **461** on 2026-07-11); each replacement capability resolves the identical role set. Gated on P1 (snake_case data vs PascalCase `_base` roles). | `rg 'user\.role in \[' manifest/source -g '*.manifest'` → 0 + effectivePermissions IR-diff script per batch | PENDING |
| AC-004 | specs/manifest-native/native-rewrite.md | WS7: zero `status: string` on true closed sets (82 plan-time; **140 raw incl. params / 92 `validStatus` constraints** on 2026-07-11); each domain batch fully migrated to `enum` with its redundant `validStatus` constraint deleted | `rg 'status: string' manifest/source -g '*.manifest'` audit + `pnpm manifest:ci` green | PENDING |
| AC-005 | specs/manifest-native/native-rewrite.md | WS3: every portable middleware ported to native reaction/fanOut/count with its middleware wiring deleted and its test ported and passing — never both live at once (0 `fanOut` in source on 2026-07-11) | ported reaction conformance tests + `manifest-runtime-factory.ts` wiring count reduced | PENDING |
| AC-006 | specs/manifest-native/native-rewrite.md | WS5: 10/10 `apps/api/vercel.json` crons declared as `schedule` (0 native `schedule` in source on 2026-07-11), generated route proven firing before any hand route deleted | route-drift audit + manual cron trigger test per migrated entry | PENDING |
| AC-007 | specs/manifest-native/native-rewrite.md | `pnpm manifest:ci` green at every commit; no new governance-allowlist entries added | `pnpm manifest:ci` | PENDING |
| AC-008 | specs/manifest-native/native-rewrite.md | Every Phase-3 / fork-gated item (WS6, WS9-if-FK, WS11, WS12–WS14) has a written NEEDS-RYAN proposal instead of a silent implementation | review of IMPLEMENTATION_PLAN.md / canonical/ entries | PENDING |
