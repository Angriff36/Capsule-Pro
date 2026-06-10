# CLAUDE.md

This file defines how agents work in this repo. It is enforceable behavior, not suggestions.

If you are unsure what to do next, default to: reproduce → isolate → fix root cause → add/strengthen tests → verify → document.
# CLAUDE.md — 12-rule template

These rules apply to every task in this project unless explicitly overridden.
Bias: caution over speed on non-trivial work. Use judgment on trivial tasks.

## Rule 1 — Think Before Coding
State assumptions explicitly. If uncertain, ask rather than guess.
Present multiple interpretations when ambiguity exists.
Push back when a simpler approach exists.
Stop when confused. Name what's unclear.

## Rule 2 — Simplicity First
Minimum code that solves the problem. Nothing speculative.
No features beyond what was asked. No abstractions for single-use code.
Test: would a senior engineer say this is overcomplicated? If yes, simplify.

## Rule 3 — Surgical Changes
Touch only what you must. Clean up only your own mess.
Don't "improve" adjacent code, comments, or formatting.
Don't refactor what isn't broken. Match existing style.

## Rule 4 — Goal-Driven Execution
Define success criteria. Loop until verified.
Don't follow steps. Define success and iterate.
Strong success criteria let you loop independently.

## Rule 5 — Use the model only for judgment calls
Use me for: classification, drafting, summarization, extraction.
Do NOT use me for: routing, retries, deterministic transforms.
If code can answer, code answers.

## Rule 6 — Token budgets are not advisory
Per-task: 4,000 tokens. Per-session: 30,000 tokens.
If approaching budget, summarize and start fresh.
Surface the breach. Do not silently overrun.

## Rule 7 — Surface conflicts, don't average them
If two patterns contradict, pick one (more recent / more tested).
Explain why. Flag the other for cleanup.
Don't blend conflicting patterns.

## Rule 8 — Read before you write
Before adding code, read exports, immediate callers, shared utilities.
"Looks orthogonal" is dangerous. If unsure why code is structured a way, ask.

## Rule 9 — Tests verify intent, not just behavior
Tests must encode WHY behavior matters, not just WHAT it does.
A test that can't fail when business logic changes is wrong.

## Rule 10 — Checkpoint after every significant step
Summarize what was done, what's verified, what's left.
Don't continue from a state you can't describe back.
If you lose track, stop and restate.

## Rule 11 — Match the codebase's conventions, even if you disagree
Conformance > taste inside the codebase.
If you genuinely think a convention is harmful, surface it. Don't fork silently.

## Rule 12 — Fail loud
"Completed" is wrong if anything was skipped silently.
"Tests pass" is wrong if any were skipped.
Default to surfacing uncertainty, not hiding it.
## Operational Rules

Operational rules (build commands, validation, manifest persistence, planning file discipline, known gotchas) are owned by `AGENTS.md`. Read it as part of session start.

@AGENTS.md

---

## Database & Migrations

**Canonical doc:** `docs/database/CONTRIBUTING.md` — schema-change workflow, table/migration documentation templates, and rollback rules. **Read it before any schema or migration work.** Supplementary references: `docs/database/README.md` (architecture), `docs/database/SCHEMAS.md` (per-schema overview), `docs/database/KNOWN_ISSUES.md` (active gotchas).

### Hard rules (non-negotiable)

1. **Never hand-author a `migrations/<ts>_name/migration.sql` folder.** Use `pnpm db:dev --create-only --name <name>` so the shadow DB validates every table reference at authoring time. Hand-written SQL skips validation and is the #1 cause of failed `db:deploy` runs (`P3018`, "relation does not exist"). **Do not run `prisma migrate dev` directly** (`npx prisma …`, `pnpm --filter @repo/database exec prisma migrate dev`, etc.) — that path is **unsupported**: it bypasses the repo workflow. The supported migrate-dev entrypoint is **`pnpm db:dev`** (and `pnpm migrate`, which chains into `db:dev`).
2. **Verify table names against `schema.prisma` before writing raw SQL.** Naming is **not** consistently snake_case in this repo. Examples that have burned past sessions:
   - `model User` → `@@map("employees")` → table is `tenant_staff.employees`, NOT `users`
   - `model EmployeeDeduction` → no `@@map` → table is `tenant_staff.EmployeeDeduction` (PascalCase), NOT `employee_deductions`
   Always `grep -n "@@map\|model <Name>" packages/database/prisma/schema.prisma` for any model whose table you reference. If the model has no `@@map`, the table name is the PascalCase model name verbatim.
3. **Existing migrations are immutable.** Never edit a committed migration file — add a new one. The only exception is repairing a migration that is in a failed state on the dev DB *before* it has been applied anywhere else; in that case mark it rolled-back (`pnpm migrate:resolve --rolled-back <name>`), patch the SQL, and redeploy.
4. **Never run `prisma db push`** (disabled in this repo) and **never run `prisma migrate reset`** without explicit user confirmation — it drops all data.
5. **`pnpm db:repair` creates untracked folders.** If you run it, `git add` the new folder *immediately* and commit. Auto-stash hooks will eat untracked migration folders and leave orphan rows in `_prisma_migrations`. If you see stash@{N} entries containing `*_repair_drift/`, that's how migration folders get lost.

### Standard workflow (from `docs/database/CONTRIBUTING.md`, copied here for visibility)

Use the repo's wrapper scripts — not raw `pnpm prisma`. The wrappers ensure correct workspace filtering, pass through `--schema`, and run drift checks in the right order. **`SHADOW_DATABASE_URL`** is **optional** for `pnpm db:dev`: Prisma Migrate auto-creates and deletes the shadow database automatically (Neon supports this natively — manual setup is no longer required per [Neon's changelog](https://neon.com/docs/changelog)). Because shadow-DB provisioning is auto, there is no enforcement gate for `SHADOW_DATABASE_URL` — `pnpm db:dev` invokes `prisma migrate dev` directly with no preflight check. Only if `prisma migrate dev` actually fails with a shadow database create permission error should you bootstrap it: `pnpm db:neon-shadow -- --write` (emergency fallback only). It is **not** part of `@repo/database/keys` (app/runtime validation is **`DATABASE_URL` only**). `packages/database/prisma.config.ts` uses `DIRECT_URL` (with `DATABASE_URL` fallback) for the main connection and sets `shadowDatabaseUrl` only when `SHADOW_DATABASE_URL` is present. Next/Vercel build, `prisma generate`, `db:deploy`, `migrate:status`, and app startup do **not** require it.

```
1. pnpm db:check                                      # detect drift first
2. edit packages/database/prisma/schema.prisma        # source of truth
3. pnpm db:dev -- --create-only --name X             # generate + validate SQL via shadow DB (args after --)
4. review the generated migration                     # verify it does what you intend
5. pnpm db:deploy                                     # apply to current DB
6. pnpm db:check                                      # confirm zero drift
7. commit schema + migration folder + any docs in one commit
```

`pnpm migrate` runs steps 1–3 chained (`db:check && prisma:format && prisma:check && db:dev`) but **omits `--create-only`**, so it auto-applies the generated migration. Use it only when you don't need a review-before-apply step. `pnpm migrate:status` is the wrapper for `prisma migrate status`; `pnpm migrate:resolve` for `prisma migrate resolve`.

### Recovery cheatsheet (when things are already broken)

- **`P3009` "failed migrations in target database":** run `pnpm migrate:resolve --rolled-back <name>`, fix the SQL, redeploy.
- **`_prisma_migrations` row exists but folder is missing:** **first** try to restore the folder. Check `git stash list` for `*_repair_drift/` (folder may be in `stash@{N}^3` untracked tree, recover with `git show stash@{N}^3:<path> > <path>`). Also check unreachable git blobs (`git fsck --unreachable`) and other dev clones. **Restoring the file is always the preferred fix** — Prisma's official guidance is to repair migration histories by restoring/reverting migration files, not by editing `_prisma_migrations`.
- **`_prisma_migrations` row truly unrecoverable** (folder lost from every clone, stash, and reachable/unreachable history): deleting the row is a last resort. **Required before any DELETE:**
   1. Manually verify the row has `rolled_back_at` set OR `applied_steps_count = 0` OR you have audited the schema and confirmed the migration's effects are already baked into a later migration. Capture the verification query output.
   2. Get explicit user approval — never delete `_prisma_migrations` rows autonomously.
   3. Run the DELETE inside a transaction so you can roll back if anything looks wrong.
   Prefer restoring the file over deleting the row in every ambiguous case.
- **Table-name mismatch in raw SQL:** grep schema for `@@map`, fix the migration SQL, mark rolled-back via `pnpm migrate:resolve --rolled-back <name>`, redeploy.

---

## Workflow Orchestration

### 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean. 
- Any time there will be more than 2 files read use a subagent and have it return a succinct summary. Use Haiku models for exploration and file reads, use sonnet models for debugging and use opus 4.6 model for architecture and decisions. 
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One tack per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness
- This is from a preexisting bug or error unrelated to my changes is NOT justification to ignore it. FIX IT AT THE END OF YOUR CURRENT TASK, improve the codebase over time!

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

---

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimat Impact**: Changes should only touch what's necessary. Avoid introducing bugs.



# === COGNILAYER (auto-generated, do not delete) ===

## CogniLayer v4 Active
Persistent memory + code intelligence is ON.
ON FIRST USER MESSAGE in this session, briefly tell the user:
  'CogniLayer v4 active — persistent memory is on. Type /cognihelp for available commands.'
Say it ONCE, keep it short, then continue with their request.

## Tools — HOW TO WORK

FIRST RUN ON A PROJECT:
When DNA shows "[new session]" or "[first session]":
1. Run /onboard — indexes project docs (PRD, README), builds initial memory
2. Run code_index() — builds AST index for code intelligence
Both are one-time. After that, updates are incremental.
If file_search or code_search return empty → these haven't been run yet.

UNDERSTAND FIRST (before making changes):
- memory_search(query) → what do we know? Past bugs, decisions, gotchas
- code_context(symbol) → how does the code work? Callers, callees, dependencies
- file_search(query) → search project docs (PRD, README) without reading full files
- code_search(query) → find where a function/class is defined
Use BOTH memory + code tools for complete picture. They are fast — call in parallel.

BEFORE RISKY CHANGES (mandatory):
- Renaming, deleting, or moving a function/class → code_impact(symbol) FIRST
- Changing a function's signature or return value → code_impact(symbol) FIRST
- Modifying shared utilities used across multiple files → code_impact(symbol) FIRST
- ALSO: memory_search(symbol) → check for related decisions or known gotchas
Both required. Structure tells you what breaks, memory tells you WHY it was built that way.

AFTER COMPLETING WORK:
- memory_write(content) → save important discoveries immediately
  (error_fix, gotcha, pattern, api_contract, procedure, decision)
- session_bridge(action="save", content="Progress: ...; Open: ...")
DO NOT wait for /harvest — session may crash.

SUBAGENT MEMORY PROTOCOL:
When spawning Agent tool for research or exploration:
- Include in prompt: synthesize findings into consolidated memory_write(content, type, tags="subagent,<task-topic>") facts
  Assign a descriptive topic tag per subagent (e.g. tags="subagent,auth-review", tags="subagent,perf-analysis")
- Do NOT write each discovery separately — group related findings into cohesive facts
- Write to memory as the LAST step before return, not incrementally — saves turns and tokens
- Each fact must be self-contained with specific details (file paths, values, code snippets)
- When findings relate to specific files, include domain and source_file for better search and staleness detection
- End each fact with 'Search: keyword1, keyword2' — keywords INSIDE the fact survive context compaction
- Record significant negative findings too (e.g. 'no rate limiting exists in src/api/' — prevents repeat searches)
- Return: actionable summary (file paths, function names, specific values) + what was saved + keywords for memory_search
- If MCP tools unavailable or fail → include key findings directly in return text as fallback
- Launch subagents as foreground (default) for reliable MCP access — user can Ctrl+B to background later
Why: without this protocol, subagent returns dump all text into parent context (40K+ tokens).
With protocol, findings go to DB and parent gets ~500 token summary + on-demand memory_search.

BEFORE DEPLOY/PUSH:
- verify_identity(action_type="...") → mandatory safety gate
- If BLOCKED → STOP and ask the user
- If VERIFIED → READ the target server to the user and request confirmation

## VERIFY-BEFORE-ACT
When memory_search returns a fact marked ⚠ STALE:
1. Read the source file and verify the fact still holds
2. If changed → update via memory_write
3. NEVER act on STALE facts without verification

## Process Management (Windows)
- NEVER use `taskkill //F //IM node.exe` — kills ALL Node.js INCLUDING Claude Code CLI!
- Use: `npx kill-port PORT` or find PID via `netstat -ano | findstr :PORT` then `taskkill //F //PID XXXX`

## Git Rules
- Commit often, small atomic changes. Format: "[type] what and why"
- commit = Tier 1 (do it yourself). push = Tier 3 (verify_identity).

## Project DNA: capsule-pro
Stack: TypeScript
Style: [unknown]
Structure: .autolab, .automaker, .biome-sweep, .codex, .cursor, .github, .husky, .idea
Deploy: [NOT SET]
Active: [new session]
Last: [first session]

## Last Session Bridge
[proactive bridge @ 75% context — saved before compacting]
Files (6):
  manifest/scripts/compile.mjs (edit)
  manifest/runtime/src/runtime/loadManifests.ts (edit)
  manifest/runtime/src/manifest-runtime-factory.ts (edit)
  apps/api/__tests__/kitchen/manifest-runtime-factory.test.ts (edit)
  apps/api/__tests__/kitchen/provenance-verification.test.ts (create)
  apps/api/__tests__/kitchen/provenance-verification.test.ts (edit)

# === END COGNILAYER ===
