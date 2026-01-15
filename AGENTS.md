# AGENTS.md - Codex Instructions

**Version:** 2.0.0
**Last Updated:** 2026-01-14
**Project:** Enterprise Catering Management System (Convoy)

---

## Codex Entrypoint

Before doing any work, read:
- `C:\Users\Ryan\Home\agent-scripts\AGENTS.MD`
- `C:\Users\Ryan\Home\agent-scripts\docs` (relevant docs only)

Repo specifics:
- Use pnpm (never npm or yarn)

## Guardrails (Do Not Drift)

- **Stack**: Prisma + Neon (no Supabase RLS)
- **Multi-tenant**: Shared DB with `tenant_id` column (NOT per-tenant databases)
- **Realtime**: Ably via outbox pipeline (NOT Supabase Realtime)
- **Auth**: Clerk (already integrated)
- **Priority order**: Kitchen tasks → Events → Scheduling
- **Docs**: Mintlify at http://localhost:2232/introduction (when running)

## Planning With Files (Required)

**AT THE BEGINNING OF EVERY TASK AND UPON ENCOUNTERING ANY ERROR, CALL CONTEXT7 MCP**

- Use the `planning-with-files` skill (at `C:\Users\Ryan\.claude\skills\planning-with-files`)
- **Create files in `codex-plans/` directory** (isolated from Claude Code)
- Create `task_plan.md` and `notes.md` at task start for complex work
- Update `task_plan.md` after each phase
- Archive completed `task_plan.md` to `docs/task-plans/` when done
- Treat `notes.md` as scratch pad:
  - Keep static Guardrails section at top
  - Keep short Handoff section after each task
  - Clear scratch content when task complete (don't delete file)

---

**Note**: Claude Code multi-agent orchestration system is documented in `CLAUDE.md` (not applicable to Codex)
