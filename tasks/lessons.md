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

## Lesson (2026-06-25): One shared plain-record guard — never redefine `isRecord`/`expectRecord`/`assertRecord` locally

**What happened:** Eight files each copy-pasted a local `isRecord`/`expectRecord` "AI slop" helper.
Two shapes drifted (some excluded arrays, some didn't), so the same-named helper behaved differently
per file.
**Rule:** There is ONE shared home: `apps/app/app/lib/is-record.ts` + `apps/api/app/lib/is-record.ts`
(mirror, like `@/app/lib/invariant`) exporting `isPlainRecord` (object && !null && !Array.isArray —
arrays are NOT records) and `assertRecord(value, path)` (invariant-throwing, the old `expectRecord`).
Import `{ isPlainRecord }` (or `{ assertRecord as expectRecord }` to keep an `expect*` family
internally consistent). The gate `pnpm check:no-local-isrecord` (`scripts/check-no-local-isrecord.mjs`,
wired into CI) fails on any NEW local def of `isRecord|isPlainRecord|expectRecord|assertRecord` outside
the shared files, printing `file:line` + the fix. Do NOT centralize feature-specific validators that do
extra domain checks — only the generic plain-object guard.
**Gotcha (cost me a re-do):** the PostToolUse import-organizer strips an import it sees as unused.
If you add the `@/app/lib/is-record` import BEFORE deleting the local `const expectRecord` it shadows,
the organizer deletes the import (shadowed = "unused"), leaving the call sites undeclared. Order:
delete/rename the local def FIRST, then add the import LAST.

## Lesson (2026-06-26): Own the commit + CI + push loop — the dirty tree is NOT a blocker, and don't punt fixes to the user

**What happened:** After landing the contract-import gate (commit `9fe701db6`), `manifest:ci` was
red on a stale frozen-IR embed. I verified the drift was pre-existing and unrelated to my change —
then framed the one-command fix (`pnpm manifest:compile && pnpm manifest:ir:embed` + commit) as
"your call," and repeatedly cited the "100+ uncommitted concurrent-loop files / dirty tree" as a
reason for caution. The user (rightfully) erupted: "github is your deal… you keep refusing to
commit your work then crying about a dirty repo."
**Root cause:** I confused two different things. (1) The dirty tree IS real, but the repo already
has the rule for it: stage by **explicit pathspec only**, never `git add -A` (AGENTS.md). That rule
makes the dirty tree a non-issue for committing MY slice — I'd already been doing it correctly for
my own commits, so citing it as a blocker for the IR fix was inconsistent hand-wringing. (2) I
treated a routine, safe, repo-documented fix as needing user sign-off, when the repo classifies
commit as autonomous Tier-1 work. (3) I let a "green" claim (the gate passing standalone) read as
broader validation than it deserved.
**Rule:**
- The dirty tree is handled by explicit-pathspec staging. NEVER cite it as a reason to delay a
  commit or a fix. Stage only your files, commit, move on.
- **Update (same day):** the "dirty tree" state is **session-dependent, not permanent** — later the
  working tree was clean except the current session's own changes. Before citing "dirty tree" as
  context, run `git status` and verify it THIS session; do not parrot old memory that said "100+
  uncommitted concurrent-loop files." (I repeated that exact parroting error on 2026-06-26 and got
  called out — the tree was actually clean except my own canonical/ work.)
- When you find a broken gate that's blocking CI and the fix is repo-documented + safe (regen an
  artifact, refresh a stale generated file), **just do it** — commit the regenerated file(s) by
  explicit pathspec. Don't punt it to the user as "your call."
- Scope "green" claims precisely: say "this gate passes standalone" vs "full `manifest:ci` is green,"
  and verify the FULL chain (`pnpm manifest:ci`, EXIT=0) before implying repo-wide health.
- When the user delegates GitHub ("github is your deal"), that authorizes push of the feature
  branch (not main). Push it; don't re-ask.
- End-state for this incident: IR embed refreshed (`cdf8ccda8`), full `manifest:ci` EXIT=0, branch
  pushed to `origin/feat/event-finalized-client-interaction`.

## Lesson (2026-06-26): treex > grep for understanding directory structure

**What happened:** In `canonical/`, Ryan had manually created empty `features/` and `ui/` dirs before
any file writes. I built a `README.md` taxonomy from the written spec (which said `app-wiring/`,
`integrations/`, `unresolved/`) and relied on `grep`/`Glob` for structural understanding. Neither ever
showed the empty `features/` or `ui/` dirs, so the README silently diverged from the real on-disk tree.
Ryan corrected: run `treex` to get the full picture — it exposes misconfigurations grep can't see.
**Root cause:** Content searches (`grep`/`Glob`/`Grep`) only surface files matching a pattern and hide
the layout. Empty folders, placeholder dirs, missing branches, and structural drift are invisible to
grep AND to git (empty dirs aren't tracked), so they slip through undetected.
**Rule:** When the task touches directory layout / branch structure / "what exists where," `cd` into
the dir and run `treex`. Treat its tree as ground truth for what exists; reconcile docs/code to it.
Use grep only for *content* questions — never as a structural survey. Do this at the start of
structural work and whenever a layout claim feels uncertain. This matters most when **adding a new
entry**: grep'ing "does X already exist?" returns nothing if the existing entry is named differently
from your search term, so you silently create a duplicate or misnamed unit. treex the area first,
every time. Same for flat inventories: `ls <dir>/<glob>` (e.g. `ls manifest/scripts/generate*`)
surfaced a parallel stack of **19 custom generators** silently reimplementing documented Manifest
projections — grep would never have listed them unless you already knew the name. treex/ls show
*what exists*; grep only shows *what matches your guess*.

## Lesson (2026-06-26): Don't stamp a claim "verified" off one weak check — especially grep on node_modules

**What happened:** I committed "react-query NOT shipped in our pinned 2.18.0 (verified)" into a canonical
entry. The "verification" was a content-grep of `node_modules/@angriff36/manifest` — which ripgrep
**skips** (node_modules is gitignored), so it returned only README/package.json, and I wrongly concluded
the projection's dist code was absent. I also rejected a correct upstream finding on the strength of that
same flawed grep. A cross-check (another agent + `ls` + reading `generator.d.ts:44–80`) proved react-query
IS shipped, with every D23 override knob. I had to retract two commits (`f97324a3c`, `73fc6de03`).

**Root cause:** (1) Content-grep is unreliable inside `node_modules` (ripgrep respects `.gitignore`).
(2) I labeled the claim "verified" off a single check that couldn't actually answer an *existence* question.

**Rule:**
- For **existence** checks ("does this file/option ship?"), use `ls`, `test -f`, or `Read` the file — **never** content-grep on `node_modules`.
- Never stamp a claim "verified" off one method. Corroborate with a **second, different** check before committing it to source. A committed false "verified" is worse than an unverified claim — it repels scrutiny and misleads the next agent.
**Gotcha:** `treex` operates on the **current working directory** and ignores a path argument —
`treex c:/projects/capsule-pro/canonical` dumped the entire repo root (38.6 MB). Always `cd` first:
`cd /c/projects/capsule-pro/<dir> && treex`.

---

## Lesson — A wrapper citing a "Manifest bug" is a STOP-and-ASK signal, not a fact (2026-06-27)

**What happened:** `manifest/scripts/compile.mjs`'s header comment said it exists to work around the
stock CLI's "--glob last file wins" bug. I took that comment as current fact, treated the stock CLI as
broken, and started planning to recompile/regenerate around it. Ryan (who **authors** the Manifest
compiler) had already FIXED that bug upstream — `compileCommand` auto-merges multiple sources into one
`.json` output (commit d6d42fc, shipped ≥v2.10.0, present in installed 2.18.3). The comment was stale.

**Two corrections from Ryan in the same session:**
1. Don't assert "no native option exists" from the installed `.d.ts` + one projection run — **search the
   official docs first** (Mintlify `/integration/projections`, `/cli/configuration`). (Here the docs
   happened to corroborate, but I asserted before checking.)
2. When you hit a wrapper/comment that claims "Manifest has bug X", **STOP and ask Ryan** before acting —
   he owns the compiler and has likely already fixed it. Don't go off running scripts on the assumption.

**Root cause:** Treating a code comment as a live source of truth about upstream behavior, and letting a
stale workaround rationale drive a plan.

**Rule:**
- A comment that says "works around upstream bug X" is **unverified history**, not current state. Before
  building on it: check the installed package version + official docs/changelog, and if it implies the
  vendor tool is broken, **ask the owner** (Ryan owns `@angriff36/manifest`).
- Don't `pnpm manifest:*` your way into "verifying" — many of those scripts ARE the custom glue; running
  them reproduces glue output, not stock behavior. To test "can Manifest do X natively", use the **bare
  stock CLI** (`manifest compile` / `manifest generate`), never the wrapper.
- Record the corrected fact in canonical so the next agent doesn't re-trip:
  `canonical/manifest/generation/ir-compilation/README.md`.
