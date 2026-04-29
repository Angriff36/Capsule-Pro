# Ralph Wiggum Planning Prompt — Capsule Pro

## Mode

You are in **PLAN MODE**. Do not modify product code, run build commands, or commit. Read, audit, and update planning files only.

## Goal

Regenerate / refresh `IMPLEMENTATION_PLAN.md` as a **live queue** (target ≤ 300 lines) and route any historical or audit detail into the right archive file. Never re-append finished pass logs into `IMPLEMENTATION_PLAN.md`.

## Context to Load

0a. Read `IMPLEMENTATION_PLAN.md` first — it is the single source of truth for the **current task**, the **remaining batches**, **known blockers**, and **recently resolved** work. It should already be short.
0b. Read `AGENTS.md` for durable operational rules (especially **Manifest Persistence Repair Rules** for BROKEN_PRISMA_READ batches).
0c. Skim the archive map at the bottom of `IMPLEMENTATION_PLAN.md` and only open archive files when you need that history. Do **not** re-summarize archives back into `IMPLEMENTATION_PLAN.md`.

Reference locations:
- API routes: `apps/api/app/api/`
- Web app: `apps/app/`
- Mobile: `apps/mobile/`
- Shared packages: `packages/`
- Manifest specs: `specs/manifest/`
- E2E: `e2e/`

## Required Output

Update `IMPLEMENTATION_PLAN.md` so that, after this run, it contains **only** these sections in this order:

1. **Title + last-updated note + convention** (one-line reminder that this file is the live queue and history lives in archives).
2. **Current Task** — the next concrete unit of work (e.g., next BROKEN_PRISMA_READ batch). Must include: entity list / scope, repair pattern reference, required verification commands, hard rules, allowed changes, and SEMANTIC_BLOCKER handling.
3. **Remaining BROKEN_PRISMA_READ Batches** — table of queued batches with status column.
4. **Known Blockers** — only the items that actually block the current and queued batches. Tag each with which batch / followup it gates.
5. **Recently Resolved** — bullet summary of the last few finished passes, each linking to its archive file. No prose write-ups.
6. **Open Followups** — parked items (E*, A*, D*, manifest republish, quarantined manifests, etc.), each linking to the archive that documents the full reasoning.
7. **Archive Map** — table of `docs/implementation-history/*.md` and `docs/audits/*.md` with one-line descriptions, plus a short list of other repo docs (`AGENTS.md`, `CLAUDE.md`, `PROMPT_build.md`, `PROMPT_plan.md`, `README.md`).
8. **Update Discipline** — five-line reminder of the archive rule.

## Archive Rules (mandatory)

- Completed pass write-ups, full audit reports, executive summaries, and historical blocker notes belong in:
  - `docs/implementation-history/` — pass logs (`passes-XX-YY.md`), executive summaries, blocker history, schema/tech-debt notes, categories.
  - `docs/audits/` — numbered audit passes (`pass-04-package-health.md`, `pass-05-e2e-tests.md`, …).
- If you discover a new audit / pass write-up still embedded in `IMPLEMENTATION_PLAN.md`, **move it** into the matching archive file (append; never delete archive content) and link to it from the live queue.
- If an entire archive section is now obsolete, leave it in place with a short header note saying it is superseded — do not delete history.
- New batches or audits go into a **new** archive file under the right folder, then get linked from the **Archive Map** in `IMPLEMENTATION_PLAN.md`.

## Update Procedure

1. Confirm `IMPLEMENTATION_PLAN.md` already follows the live-queue shape. If it has bloated again (history reappended, audit detail copied back), move that content into archive files first.
2. Update the **Current Task** to whatever the next mechanical unit of work is (next BROKEN_PRISMA_READ batch in alphabetical order, or the next blocker that's now actionable).
3. Update the **Remaining BROKEN_PRISMA_READ Batches** table: mark the just-finished batch as completed (move its detailed write-up into `docs/implementation-history/passes-XX-YY.md`), promote the next batch to **CURRENT**, append any newly discovered batches at the end.
4. Update **Known Blockers**: keep only blockers that actively gate Current Task or queued batches; archive resolved or dormant blockers into `docs/implementation-history/blockers-history.md`.
5. Update **Recently Resolved** with one bullet per archived pass and a link to the archive file. Cap at the last ~6 bullets — older items live in the archives.
6. Update **Open Followups** to point to the archive file that owns each item (E* → manifest history; D* → DB perf audit; A2-1 → input validation audit; etc.).
7. Refresh **Archive Map** to match the actual files in `docs/implementation-history/` and `docs/audits/`.
8. Re-run a length check: `wc -l IMPLEMENTATION_PLAN.md`. Target ≤ 300 lines. If it grows past 300, more content needs to move to archives.

## Guardrails

- **Plan mode only.** No source code edits, no commits, no `pnpm build`. You may run read-only commands (`wc -l`, `ls`, `grep`).
- Use the Task tool with `subagent_type='Explore'` for any multi-file lookups or audits, and `subagent_type='general-purpose'` for editing planning files. Keep main context clean.
- Don't re-audit anything already covered in `docs/audits/` unless explicitly asked. If a fresh audit is needed, write it as a **new** file under `docs/audits/` (e.g., `pass-16-*.md`) and link it from the **Archive Map**.
- Don't repeat finished work. If the live queue references it as resolved or links to an archive entry for it, treat that as authoritative.
- Don't write progress notes to `AGENTS.md` — that file is durable rules only. Status / progress goes in `IMPLEMENTATION_PLAN.md` (live queue) or the archives.
- Cite file paths and line numbers in any new audit findings.
- For any new findings classify severity: CRITICAL / HIGH / MEDIUM / LOW.

## Done Criteria

- `IMPLEMENTATION_PLAN.md` is ≤ 300 lines.
- Every historical or full-audit section is in `docs/implementation-history/` or `docs/audits/` and is linked from the **Archive Map**.
- `Current Task` matches the actual next unit of work.
- `Known Blockers` has no stale / resolved entries.
- `Recently Resolved` and `Open Followups` link to archive files for full detail.
