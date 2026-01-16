# AGENTS.md - Codex Instructions

**Version:** 2.0.0 **Last Updated:** 2026-01-14 **Project:** Enterprise Catering
Management System (Convoy)

---

**Before doing any work, read:**

- `C:\Users\Ryan\Home\agent-scripts\AGENTS.MD`
- `C:\Users\Ryan\Home\agent-scripts\docs`

**APP IS NOT PRODUCTION. IF SOMETHING SEEMS WRONG, INVESTIGATE, DONT ASSUME ALL
SYSTEMS ARE CORRECTLY WIRED AND CONFIGURED**

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

**AT THE BEGINNING OF EVERY TASK AND UPON ENCOUNTERING ANY ERROR, CALL CONTEXT7
MCP**

- Use the `planning-with-files` skill
