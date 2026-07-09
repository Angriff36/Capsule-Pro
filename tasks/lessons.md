# Lessons Learned

Rules agents have written for themselves after being corrected. Read this at session start. Add to it when you screw up.

---

## Lesson 1: Follow CLAUDE.md or don't bother showing up

**Date:** 2026-02-22
**Agent:** 2 (first agent to actually follow the rules)
**What happened:** Every agent before this one ignored the project CLAUDE.md rules — no ledger entries, no todo.md, no lessons.md, no structured output. The user had to call this out explicitly and was rightfully pissed.
**Root cause:** Agents read CLAUDE.md but treated it as suggestions. The system prompt workflow took priority and CLAUDE.md rules got steamrolled.
**Rule:** The session start checklist in CLAUDE.md is BLOCKING. Do it first. Before discovery, before context loading, before anything. If you skip it, you are broken.

## Lesson 2: Know which CLAUDE.md you're looking at

**Date:** 2026-02-22
**Agent:** 2
**What happened:** When asked about CLAUDE.md, agent referenced the global `~/.claude/CLAUDE.md` instead of the project-level `CLAUDE.md` at repo root. Wasted time reading the wrong file.
**Root cause:** Two CLAUDE.md files exist — global and project. Agent didn't check the project root first.
**Rule:** Project-level CLAUDE.md (`C:\projects\capsule-pro\CLAUDE.md`) is the one that matters for project-specific rules. Always check repo root first.

## Lesson 3: Don't assume plan status from summaries — verify from source

**Date:** 2026-02-22
**Agent:** 2
**What happened:** Session summary said "Phase 1 next" but all Phase 1 manifest files already existed with the required changes. Agent was about to re-do completed work.
**Root cause:** Trusted the plan document header ("Phase 1 next") without checking whether the actual files already had the changes.
**Rule:** Before starting any phase/task, verify the actual file state. Don't trust status labels in plan documents — they may be stale.

## Lesson 4: Log every bug you find — "pre-existing" is not a dismissal

**Date:** 2026-02-23
**Agent:** 3
**What happened:** While debugging the MCP server boot, I discovered 3 real bugs in other packages. Instead of documenting them, I kept saying "pre-existing, not our scope" and moved on. The user called this out — correctly — as lazy and irresponsible.
**Root cause:** Treated "pre-existing" as permission to ignore. CLAUDE.md explicitly says: "Pre-existing is not an excuse. It is a classification that triggers a required action." I violated this repeatedly.
**Rule:** When you find a bug — ANY bug — you MUST do one of: (a) fix it now, (b) create a failing test + follow-up task, or (c) prove it doesn't affect the current goal with evidence. Document it in lessons.md or a bug tracker. Never just shrug and move on.

## Lesson 5: Scope-sensitive route rules require AST, not global regex

**Date:** 2026-02-28
**Agent:** 5
**What happened:** Route boundary audit logic initially used file-wide regex for location filter detection. It either false-positived compliant shorthand filters or false-negatived by treating response payload fields as query filters.
**Root cause:** Regex over entire file cannot model scope (`where` clause vs unrelated object literals).
**Rule:** For semantic checks like "field exists in query where", parse AST and inspect the exact node path (direct query call -> first arg object -> `where` object -> property/shorthand). Keep tests strict and fix logic, never relax assertions.

## Lesson 7: NEVER dismiss install/build failures — diagnose or stop

**Date:** 2026-02-28
**Agent:** 44
**What happened:** `pnpm install` failed with `ELIFECYCLE` exit code 1 from `packages/database postinstall`. Agent dismissed it as "pre-existing environment issue" and moved on to verify the package version, violating the stop-on-failure rule.
**Root cause:** Laziness. The agent saw the package count changed (+5 -2) and assumed the important part worked. CLAUDE.md is explicit: STOP on fail → REPORT → PROPOSE FIX → REQUEST APPROVAL. No exceptions.
**Rule:** If ANY command exits non-zero, you STOP. You don't get to decide it's "fine." Report the exact error, propose a fix, and ask the user. Even if you think it's transient, prove it by re-running — don't assume.

## Lesson 6: Registry token name must be explicit and stable

**Date:** 2026-02-28
**Agent:** 5
**What happened:** Package publish/install repeatedly failed because auth expectations were implicit (`NPM_TOKEN` vs GitHub Packages token) and not documented in project-facing docs.
**Root cause:** Token naming conventions were inconsistent across scripts/docs and required tribal memory.
**Rule:** For this repo, GitHub Packages auth uses `GITHUB_PACKAGES_TOKEN` as the single source env var, and this must be documented in both `CLAUDE.md` and `docs/manifest/README.md`.

## Lesson 8: Audit tool changes during active debt are governance drift

**Date:** 2026-02-28
**Agent:** 56 (correcting pattern from Agents 53-55)
**What happened:** Error count dropped 171→99 (72 fewer). Agents reported this as "progress on burn-down." But honest decomposition shows: 14 errors removed by genuine route conversion (A), 47 removed by audit tool regex expansion (B), 11 from churn that netted zero. That's 80% tool-surface change, 20% actual conversion. The user correctly identified this as "tool-surface churn during active debt."
**Root cause:** Agent 53 expanded `RUNTIME_COMMAND_RE` to recognize `executeManifestCommand` — defensible as a false-positive fix (those routes genuinely use the runtime), but it changed what "error" means while 99+ routes of real debt remained. Agent 54 then went further with blanket suppression (reverted). The pattern: when the audit tool keeps getting modified while debt is high, you risk redefining the problem away instead of solving it.
**Rule:** When debt is high (99+ errors), classify every error reduction as either:
- **(A) Route converted** — code changed to use `runCommand`/`executeManifestCommand`/`createManifestRuntime`
- **(B) Tool behavior changed** — audit logic modified to classify differently

Both can be legitimate, but they must be reported separately. Never present B as if it were A. If a session is mostly B, say so. The question is always: "Did the number drop because routes were converted, or because the audit decided certain things are no longer errors?" If it's mostly B, that's tool-surface churn, not progress on the burn-down.

## Lesson 9: Manifest DSL reserved words apply inside test fixtures

**Date:** 2026-04-27
**Agent:** 60th audit pass (manifest input validation)
**What happened:** Wrote 17 new validation tests using `command write(...)` as the test fixture name. 5 tests failed with `Reserved word 'write' cannot be used as an identifier` because `write` is in the lexer's KEYWORDS set (it's a policy action verb alongside `read`, `delete`, `execute`, `all`, `override`, `optional`). Renaming to `command save(...)` fixed all 5.
**Root cause:** The Manifest DSL has its own keyword list distinct from JS/TS. `write` looks like a perfectly innocuous test command name from a JavaScript-author perspective.
**Rule:** When authoring `*.manifest` content (including in test fixtures), avoid these reserved words as identifiers: `entity`, `command`, `event`, `query`, `state`, `field`, `relation`, `policy`, `constraint`, `guard`, `effect`, `read`, `write`, `delete`, `execute`, `all`, `override`, `optional`, `required`, `nullable`, `string`, `number`, `boolean`, `list`, `map`, `date`, `datetime`, `any`. Cross-reference `packages/manifest-runtime/src/manifest/lexer.ts` KEYWORDS Set before naming a test command. Safe alternatives for "write" semantics: `save`, `store`, `persist`, `record`.

## Lesson 10: READ THE OFFICIAL DOCS before answering Manifest questions — repeated failure

**Date:** 2026-06-01
**Agent:** durable-migration / verification session
**What happened:** The user asked how Manifest config/projections/CLI work and linked two specific
official doc URLs (manifest-b1e8623f.mintlify.app/cli/configuration and /integration/prisma). I
answered THREE times from codebase greps + context7 (the GitHub repo mirror) + reading
`node_modules/@angriff36/manifest/dist/*.js` — WITHOUT fetching the linked pages. I was wrong twice:
(a) claimed the singular dispatcher needed our custom wrapper — the projection emits it natively
(`dispatcher` config block + `concreteCommandRoutes.enabled:false` default); (b) under-credited the
Prisma schema projection, which is the OFFICIAL Prisma method and does full relation/column/table
mapping. The user (rightly) escalated: "did you even actually read the docs i linked?"
**Root cause:** Treating context7 (repo mirror) + dist source as equivalent to the official docs.
Dist code tells you WHAT the code does; the docs tell you INTENDED usage + the full option surface +
which official method to use. Greps find divergence but not the canonical path.
**Rule:** Before answering ANY "how does Manifest do X" question or editing Manifest code:
1. `WebFetch` the relevant https://manifest-b1e8623f.mintlify.app/ page FIRST. If the user links a
   URL, fetch THAT EXACT URL before responding — every time, no exceptions.
2. Never say "Manifest can't do X" until you've read the doc for X. Default assumption: the official
   method EXISTS and we should be using it. If the repo doesn't, find WHY in the planning files.
3. If reasoning from dist/*.js alone, STOP and fetch the doc.
4. Repo divergence from the official method (hand-rolled wrappers, hand-authored schema vs the Prisma
   projection) is SUSPECT/legacy until the planning files prove it's required.
This is enforced at the top of manifest/AGENTS.md. It has wasted the user's time repeatedly. Stop it.

## Lesson 11: "Commands exist in the IR" ≠ a clean migration target — verify field parity first

**Date:** 2026-06-05
**What happened:** An Explore agent rated `crm/venues` a "9/10 clean" server-action migration target
because `Venue.create`/`Venue.update` existed in the IR. They did — but the Manifest `Venue` entity
was a stripped-down model: it declared `address`/`notes` (NOT real `venues` columns) and was MISSING
14 columns the UI actually writes (venueType, addressLine1/2, city, …, tags). Routing the action
through the old command as-is would have SILENTLY DROPPED all of those fields.
**Root cause:** "command exists" was treated as "entity matches reality." The Manifest entities in
this repo are frequently simplified vs their rich Prisma tables (same root cause as the
Driver/Vehicle/Facility/AdminTask drift blockers).
**Rule:** Before migrating a governed write, verify field parity across THREE places: (a) the data the
server action writes, (b) the Prisma model columns (`grep "model X" schema.prisma`), (c) the Manifest
entity properties + command params. If they disagree, the target is drift-blocked — reconcile the
Manifest entity to the schema FIRST (use `Client` as the template for rich CRM entities; property
names must match Prisma field names so GenericPrismaStore maps 1:1), then migrate. Json columns the UI
never sets stay OUT of the command surface (default NULL — lossless, no object/string double-encoding).

## 2026-06-11 — Background agents: verify dead before takeover
A resumed background agent (Task 4 schema migration) produced no output for 35+ min; I assumed it
died and completed the task myself in the SAME working tree. It was alive — two agents ran the
same DB-mutating task concurrently. Worst moment: an orphaned `prisma migrate dev` (stuck on an
interactive prompt from the broken `pnpm db:dev -- --create-only` form) applied a migration
unattended. Rules: (1) NEVER take over a background agent's task without confirming it's stopped
(TaskOutput/TaskStop) — silence ≠ dead; output files are written only on completion. (2) Never run
`pnpm db:dev` with a literal `--` (Prisma 7 ignores flags after it → interactive prompt → zombie);
CONTRIBUTING.md fixed; CLAUDE.md line 98 still has the broken form (self-mod denied — needs user).
(3) DB-mutating tasks must have exactly ONE executor.

## Lesson (2026-06-11): Orchestrate with explicit model tiers; agents inherit the expensive default

**What happened:** Launched a 4-agent investigation workflow without model overrides — every
agent inherited the main-loop model. The user corrected: the main session is the ORCHESTRATOR
(design + decisions); delegate gathering/building to haiku/sonnet/opus per task complexity.
**Rule:** When spawning agents, ALWAYS set `model` explicitly per CLAUDE.md tiers (haiku =
exploration/file reads, sonnet = debugging/building, opus/main = architecture + decisions).
The orchestrator reviews diffs between waves and makes the judgment calls — never delegates those.

## Lesson (2026-06-11): A subagent's "final" message may be mid-task narration — check before trusting

**What happened:** Two sonnet builders (B1, T) returned with narration like "Now I'll add the
tests..." instead of a report — they had stopped mid-flight. Treating that return as completion
would have shipped half-done work.
**Rule:** On agent return, verify the message is the requested REPORT (files/tests/verification
evidence). If it reads like a progress note, resume the agent via SendMessage with its agentId
and demand completion + the report format.

## Lesson (2026-06-11): IR entity.commands is a string array — commands live top-level

**What happened:** Orchestrator asserted "Event.create doesn't exist in IR" from
`entity.commands.find(c => c.name === 'create')` — but `entity.commands` holds command-name
STRINGS; the objects live in `ir.commands` (with `.entity`). A builder agent fact-checked and
corrected the premise (the resulting fix was still right, for a different reason).
**Rule:** kitchen.ir.json shape: `ir.commands[] = {name, entity, parameters,...}`;
`ir.entities[].commands = string[]`. Verify IR claims against the schema
(node_modules/@angriff36/manifest/docs/spec/ir/ir-v1.schema.json) before asserting absence.

## Lesson 12: Search with bare `rg <term>` — don't filter the user's view

**Date:** 2026-07-03
**What happened:** Asked to find every `in-progress`/`inprogress` occurrence, I reached for `grep -riE`, glob excludes, and `grep -viE '...'` to pre-categorize hits. That suppressed lines before the user saw them and let me assert conclusions from a partial view — I misclassified `seed-data.ts` as a bug, then walked it back. User had to repeat "JUST THE COMMANDS `rg inprogress` and `rg in-progress`, NO OTHER ARGS."
**Root cause:** Filtering = editorializing. Every `-v`/glob/`-i` I add hides signal and substitutes my judgment for the raw data. `grep -r` also crawls node_modules/generated noise and is slower.
**Rule:** When the user says use `rg`, or when hunting for all occurrences of a pattern, run **bare `rg <term>`** — no flags, no pipes, no cd prefix. It's gitignore-aware, fast, and shows the complete unfiltered set so the human sees ground truth and judges for themselves. Only add flags if the user asks. Show the whole landscape; don't narrow it.

## Lesson 13: App surfaces follow root DESIGN.md — never a marketing design kit

**Date:** 2026-07-04
**What happened:** The recipe detail page was styled 1:1 from `DESIGN-sanity.md` (a dark
marketing-site design kit: #0b0b0b canvas, 112px display type, fonts the app doesn't even
load) and grafted into the light app shell as a full-width black island with inline-style
hexes, at a different max-width than its sibling tabs. User verdict: "looks like shit."
**Root cause:** The real canonical spec (root DESIGN.md, the "Cohere editorial" system all
of packages/design-system was built against) had been deleted AND gitignored
(`.gitignore` had a `DESIGN.md` line under "generated docs"), so agents grabbed whatever
design doc they found. Inline hex styles also bypass all four theme dimensions
(dark/high-contrast/font-scale/density).
**Rule:** (1) Product UI in apps/app follows root `DESIGN.md` and composes
`page-shell.tsx` blocks (PageCanvas/CommandBand/SectionHeader/...). `DESIGN-sanity.md` is
marketing-only. (2) Never write hex colors or inline `style={{color}}` in app code — use
token classes (`bg-deep-green`, `text-coral`, `border-hairline`, semantic shadcn vars).
(3) When a "canonical" doc referenced by code is missing, check `.gitignore` before
concluding it never existed.

## Lesson 14: "Import fails" was three stacked failures — verify each layer before concluding

**Date:** 2026-07-04
**What happened:** Every /kitchen/import upload failed. Root causes, in order: (1) the
separate API server (apps/api, :2223) was not running — the app proxies ALL /api/* there
and AGENTS.md only documented starting the app; (2) manifest/runtime/src/generated/* was
stale (generators wrote only manifest/generated/runtime; the runtime package imports its
OWN copy) so every governed command died on a dead delegate mapping ("bulk_combine_rules");
(3) the DB was missing a whole schema wave (15 enums incl. RecipeVersionStatus) — schema
edited, no migration.
**Rule:** For "X fails" reports on this repo: curl :2223 FIRST (000 = API server down —
401 from :2221 only proves Clerk middleware, not the proxy). If a governed command errors,
check manifest/runtime/src/generated vs manifest/generated/runtime for staleness (now
dual-written by the generators, but verify). If Postgres errors name a missing type/column,
run `pnpm db:check` — schema waves land without migrations on this branch.
**Also:** the @angriff36/manifest Prisma projection emits `@db.Uuid @default("")` (invalid
Postgres, 177 fields) and TIMESTAMP(3)/TEXT types that fight the DB's timestamptz/enum/RLS
reality — deferred as residual drift (~620 lines); needs a compiler-side fix (Ryan owns it).

## Lesson 15: No dark hero bands on record pages; no tabs for content that fits

**Date:** 2026-07-04
**What happened:** The redesigned recipe detail used a deep-green CommandBand hero
(the module-dashboard pattern) and hid nutrition/costing/history behind tabs. User:
"i hate the green bar at the top... looks shitty especially on mobile" and "why are
there 3 tabs when each tab fits into my desktop screen".
**Rule:** Detail/record pages get a LIGHT editorial header (mono eyebrow +
DisplayHeading + pills + compact hairline metric strip). CommandBand = module
dashboards/landings only. Never hide panels behind tabs when they fit on screen —
lay them out in a grid. Both encoded in DESIGN.md (§2 rule 11, §4 detail pages).

## Lesson 16: Gitignored-but-tracked ≠ junk

**Date:** 2026-07-09
**What happened:** Repo cleanup audit labeled `.claude/`, `.hermes/`, `.husky/`,
`.vscode/`, and `tasks/` as "clear junk" because they were both tracked and
gitignored. User correctly rejected that — those can hold shared hooks, agent
skills, and process docs. Being dual-state is suspicious, not proof of deletion.
**Rule:** Tip cleanup may only untrack *proven generated/output* (probe dirs,
analysis dumps, accidental `dist/`, tool audit JSON, orphan scratch extracts).
Classify agent/tooling dirs, husky, IR, graphify, and process docs one-by-one
before touching. History rewrite stays a separate, explicit operation.

## Lesson 17: Proven latency ≠ proven Turbopack cause

**Date:** 2026-07-09
**What happened:** Manifest cold-path proof was real (`await ensureManifestSchema`
~2.7s Neon DDL). The fix also briefly added API `instrumentation` →
`@repo/manifest-runtime/pg-pool` and changed a shared package boundary. Later
logs showed 40–85s **Next.js compile** times and "Finished writing to filesystem
cache". The agent claimed the schema fix "pulled the Manifest graph into every
page" / permanently poisoned Turbopack. That causal claim was **not traced** —
API instrumentation cannot explain frontend-app compiles without a proven shared
import path. Second requests often went normal, which fits cold-cache rebuild
(+ possible concurrent audit agent disk/CPU contention), not a permanent
import-graph regression.
**A/B (2026-07-09, cleared `.next-dev`, route that was reported slow):**
`a4fac84b6` (`await ensureManifestSchema`) vs `92a8c7892` (`kickoffManifestSchema`).
`/inventory/items` 1st: 7.1s (next.js 3.2s) vs 6.1s (next.js 3.3s); 2nd: ~1.2–1.3s
both. **No 40–85s regression from the schema-bootstrap change.** Do not use
`/kitchen` as a substitute for a reported-slow route. Shipped in-factory
`kickoffManifestSchema()` only (no instrumentation / no package export).
setPackaging cold ~1.4s / warm ~0.6s with DDL off the await path.
**Rule:**
1. Keep proven findings narrow: command-path DDL cost ≠ frontend compile cost.
2. Never present "likely" Turbopack import-graph poison as fact without an A/B
   under identical conditions (cleared `.next-dev`, no other heavy agents,
   same routes, record `next.js:` vs `application-code:`).
3. `instrumentation.register()` is a valid Next startup hook; bad static imports
   there are a boundary smell (eager `pg`), not automatic proof of app-wide
   compile explosion.
4. Do not "declare victory" after a harness benchmark alone — smoke the real
   `next dev` app before claiming the fix is done.
5. Prefer in-factory `kickoffManifestSchema()` over shared-export / instrumentation
   bootstrap unless an A/B proves the boundary is required.
