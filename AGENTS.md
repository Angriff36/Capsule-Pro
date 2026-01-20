# AGENTS.md - Codex Instructions

**Version:** 2.0.0 **Last Updated:** 2026-01-14 **Project:** Enterprise Catering
Management System (Convoy)

---

**Before doing any work, read:**

- `C:\Users\Ryan\Home\agent-scripts\AGENTS.MD`
- `C:\Users\Ryan\Home\agent-scripts\docs`

**APP IS NOT PRODUCTION. IF SOMETHING SEEMS WRONG, INVESTIGATE, DONT ASSUME ALL
SYSTEMS ARE CORRECTLY WIRED AND CONFIGURED**

**This Project uses next-forge, if you are EVER unsure of what system we use,
what the default protocols are, anything, refer to
C:\Projects\convoy\docs\llm\next-forge it has all the information you could
need.**

## Repo specifics:

- **ALL SYSTEMS CONNECTED** Every module is interconnected. Events created in
  crm module must display on kitchen mobile app etc. This is imperative.
- **Use** pnpm (never npm or yarn)
- **Stack**: Prisma + Neon (no Supabase RLS)
- **Multi-tenant**: Shared DB with `tenant_id` column (NOT per-tenant databases)
- **Realtime**: Ably via outbox pipeline (NOT Supabase Realtime)
- **Auth**: Clerk (already integrated)
- **Priority order**: Recipes > Kitchen tasks → Events → Scheduling
- **Docs**: Mintlify at http://localhost:2232/introduction (when running)

## Setup Discipline (Required)

- Follow all relevant setup steps from official docs end-to-end (install, env,
  scripts, generators, integration).
- No minimal patterns or partial installs; wire into the actual repo files.
- If blocked or missing secrets, stop and ask before proceeding.

## Planning With Files (Required)

**WHEN WORKING ON ANY 3rd PARTY LIB OR IMPLEMENTATION OF A NEW FEATURE FROM A
3rd PARTY, AND UPON ENCOUNTERING ANY ERROR THAT ISN'T A SIMPLE INCORRECT
COMMAND, CALL CONTEXT7 MCP**

- Use the `planning-with-files` skill for any task that goes beyond simple or
  mundane tasks, as well as upon encountering unexpected errors.

## CI/CD Configuration Rules

**GitHub Actions Workflows - CRITICAL**

- **NEVER** hardcode ANY versions in `.github/workflows/*.yml`
- **ALWAYS** extract versions from source-of-truth configuration files:
  - pnpm version: `package.json` `"packageManager"` field
  - Node.js version: `.nvmrc` file or `package.json` `"engines.node"` field
- Validation script blocks commits with mismatches:
  `scripts/validate-pnpm-versions.js`
- This ensures local dev, CI, and Vercel production all use identical versions
- Example: If `package.json` has `"packageManager": "pnpm@10.24.0"`, workflows
  MUST use `version: 10.24.0`
