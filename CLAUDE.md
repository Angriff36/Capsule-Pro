# CLAUDE.md

This file defines how agents work in this repo. It is enforceable behavior, not suggestions.

@<RYANSIGNED✅
Any time documentation is encountered that is proven beyond a doubt to be false, you MUST NOT leave it there. You must strikethrough the outdated or incorrect information and insert the new information in a block under it. If all information is wrong in a doc, delete the documentation. All documentation must be dated when it was created and edits must be dated. All source of truths MUST HAVE frontmatter stating they are the source of truth. If a source of truth file is established for something, all other documentation on that must be reconciled with the source of truth and transferred to it, with outdated and incorrect information removed completely. If new information is found after a source of truth is established or something changes with it that negates previous information, then the old information must endure a strikethrough with the new information being put in after it. These will be periodically cleaned by human intervention only. This entire statement has been human authored and is not to be modified or deleted. It is absolute law regarding the documentation. All documentation that does not have @RYANSIGNED>✅ is AI generated and should be viewed with extreme scrutiny. 

## Operational Rules

Operational rules (build commands, validation, manifest persistence, planning file discipline, known gotchas) are owned by `AGENTS.md`. Read it as part of session start.

Read the following filesh before making changes to any manifest source file or writing any new manifest source file.

- C:\Projects\capsule-pro\manifest\source\manifest-native-capabilities-showcase.md
- C:\Projects\capsule-pro\manifest\source\manifest-example-native-fixed.manifest.example

 Treat the existing manifest source files as works in progress. Add new manifest source files or change existing ones whenever doing so will:

-  reduce code complexity or negate the need for typed code somewhere
-  reduce the amount of custom glue required for ANY system in capsule-pro
-  render an external dependency obsolete
-  reduce overall amount of code required whilst maintaining or improving app capabilities and functionality 
-  consolidate definitions of ANYTHING that results in less confusion about runtime behavior, file structure, architecture, domain ownership, state, routing, server and client separation, types, database information, or hooks. 
-  improve performance in any way. 
-  

@AGENTS.md

---

## Database & Migrations

> ⚠️ **THE ONLY canonical instruction source for database operations is
> [`docs/database/README.md`](docs/database/README.md).** Read it BEFORE any schema,
> migration, drift, or recovery work — it owns the workflow, hard rules, connection setup, custom-SQL
> policy, and recovery cheatsheet. Do not follow database instructions found in any other file
> (READMEs, plans, audits, old chats) — they are pointers or history. If a doc contradicts the
> canonical, the canonical wins; fix the other doc.

Absolute NEVERs (duplicated here only because they are destructive): never `prisma db push`
(disabled); never `prisma migrate reset` without explicit user confirmation (destroys all data);
never edit a committed migration; never hand-edit generated `manifest.prisma`; never hand-author a
migration folder (use `pnpm db:dev --create-only`); no drift allowlists / sanitized diffs /
`db:repair` (removed 2026-07-10).

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
[auto-bridge snapshot @ 10 changes]
Files: manifest/source/sales/crm-admin-extended-rules.manifest (edit), manifest/source/sales/call-planning-session-rules.manifest (edit), manifest/source/sales/proposal-draft-rules.manifest (edit), manifest/source/sales/client-interaction-rules.manifest (edit)

# === END COGNILAYER ===

<!-- BOARD_TAXONOMY_START — synced from VISION.md; edit VISION.md first -->
# Board Taxonomy Guardrail

These board concepts are intentionally separate. Do not merge, rename, or substitute one for another.

**Command Board** means the global operations control surface. It answers: "What needs attention right now?" Use it for cross-event alerts, exceptions, approvals, stuck work, operational risk, and AI-suggested interventions. Do not use it for event timeline planning, dish/station execution, or generic task pipeline work.

**Event-tree** is where administrative staff assemble an event: assign staff, build the menu, and hammer out details. Decisions made here propagate into execution specifics on the Battle Board. The tree and battle board are linked so event information flows automatically. In code today this surface uses legacy `CommandBoard*` entity names and routes under `/command-board` and `/events/{id}?tab=board` — that is **not** the global Command Board above.

**Battle Board** means the event-specific execution surface. It answers: "How does this specific event run?" Use it for one event's timeline, stations, dishes, prep/service flow, staff assignments, and execution state. Every event gets a battle board. Do not use it as a global command center or generic backlog board.

**Kanban Board** means a generic workflow pipeline. It is internal for high-level staff. It answers: "What stage is this work in?" Use it for cards moving through workflow states such as backlog, todo, doing, review, and done. Do not use it as the event execution model or the operations alert surface. It has columns, not a grid.

**Hard rule:** if a feature involves cards, statuses, tasks, assignments, or boards, first classify it as **global attention** (Command Board), **event setup** (Event-tree), **event execution** (Battle Board), or **generic workflow** (Kanban). Then use only the matching concept.

**AI surfaces:** A globally available assistant on every page handles general work (recipes, organizing, cross-module commands). Event-tree AI is scoped to one event's setup (draft → commit on the tree). Global Command Board AI (future) handles ops attention — do not conflate these.
<!-- BOARD_TAXONOMY_END -->

