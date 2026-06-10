# Task 10.9 — Schema Naming Convention Style Guide + CI Enforcement

**Picked because:** Baseline is green (api/runtime typecheck 0, schema/direct-write audits 0). Nearly
all TIER 0–12 implementation tasks are DONE; remaining open items are either BLOCKED on upstream
`@angriff36/manifest` keyword support or are pure evaluation docs. Task 10.9 is the single
genuinely-actionable implementation item: not blocked, completable, real ongoing value (prevents
future schema-naming drift), and the plan ranks schema hygiene highly.

## Discovery (corrects the plan)
The plan said "4 PascalCase @@map anomalies." Reality (verified against schema.prisma):
- **245 models** = 214 PascalCase-named + 31 legacy snake_case-named.
- **20 models** resolve to a **PascalCase physical table** (not 4): 4 explicit `@@map("PascalCase")`
  (Tenant, ActivityFeed, EmployeeDeduction, OutboxEvent) + **16 PascalCase models with NO `@@map`**
  (table defaults to the verbatim PascalCase model name — the 16 IR-entity models added in Task 0.3).
  Unifying rule: *resolved table name (= `@@map` value, else model name) must be snake_case*.
- Existing docs conflict: `SCHEMAS.md:364` says "Tables: PascalCase" (conflates Prisma model name with
  physical table); the 207 `@@map("snake_case")` models + `README.md §9` establish the real convention
  (PascalCase model → snake_case table/columns).

## Plan
- [ ] Create `manifest/governance/schema-naming-allowlist.json` — two frozen allowlists
      (`legacySnakeCaseModels` [31], `pascalCaseTableExceptions` [20]) with reasons.
- [ ] Create `manifest/scripts/lint-schema.mjs` — R1 model PascalCase; R2 resolved table snake_case;
      R3 stale-allowlist hygiene. Report-only default; `--strict` exits 1; `--self-test` asserts.
- [ ] Wire `manifest:lint-schema` + `:strict` in package.json.
- [ ] Add "## Schema Naming Conventions" to `docs/database/CONTRIBUTING.md` (rules + why + exceptions).
- [ ] Fix `SCHEMAS.md:364` model-vs-table conflict.
- [ ] Verify: `--strict` exits 0 on real schema; `--self-test` exits 0; typecheck still green.
- [ ] Update IMPLEMENTATION_PLAN.md (10.9 DONE + 4→20 correction), commit (explicit paths), tag, push.

## Review

**Done (v0.12.241).** All plan items complete and verified:
- `manifest/scripts/lint-schema.mjs` — R1 (model PascalCase), R2 (resolved table snake_case),
  R3 (allowlist hygiene). Report-only default; `--strict` CI gate; `--self-test` (11/11 assertions,
  proves the rules can fail via positive+negative fixtures — Rule 9).
- `manifest/governance/schema-naming-allowlist.json` — frozen: 31 legacy snake_case models + 20
  PascalCase-table exceptions, each with a documented reason. Matches the repo's governance-JSON
  allowlist pattern (bypasses.json / schema-drift-allowlist.json).
- `package.json` — `manifest:lint-schema`, `:strict`, `:self-test`.
- `docs/database/CONTRIBUTING.md` — new "## Schema Naming Conventions" canonical style guide (rules,
  WHY, frozen exceptions, commands). `docs/database/SCHEMAS.md:364` model-vs-table conflict fixed.
- `IMPLEMENTATION_PLAN.md` — 10.9 marked DONE; milestone row added; Prisma facts corrected (4→20).

**Verification:** strict lint exits 0 on the real 245-model schema (0 violations); self-test exits 0;
package.json + allowlist parse; api/runtime typecheck were green pre-change and this touches no TS.

**Key correction recorded:** the long-cited "4 PascalCase @@map anomalies" undercounts — there are
**20** models with PascalCase physical tables (4 explicit `@@map("PascalCase")` + 16 PascalCase models
with NO `@@map`, the Task 0.3 IR-entity additions). The R2 rule (resolved table = `@@map` value else
model name) unifies both into one check.

**Note:** staged only my own files (explicit paths). The working tree carries inherited noise — ~30
CRLF-only `manifest/source/*.manifest` diffs, a CogniLayer auto-edit to CLAUDE.md, and untracked
`docs-site/` — left untouched (not mine; per the concurrent-loop-shared-tree lesson, no `git add -A`).
