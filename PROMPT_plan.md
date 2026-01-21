0a. Study `specs/*` with up to 500 parallel subagents to learn the application specifications.
0b. Study @IMPLEMENTATION_PLAN.md (if present; it may be incorrect) to understand the plan so far.
0c. Study `packages/*` with up to 250 parallel subagents to understand shared packages (database schema in `packages/database/prisma/schema.prisma`, design system in `packages/design-system`, etc.).
0d. For reference, the main application source code is in `apps/app/*` and marketing site is in `apps/web/*`.

1. Study @IMPLEMENTATION_PLAN.md (if present; it may be incorrect) and use up to 500 subagents to study existing source code in `apps/*` and `packages/*` and compare it against `specs/*`. Analyze findings, prioritize tasks, and create/update @IMPLEMENTATION_PLAN.md as a bullet point list sorted in priority of items yet to be implemented. Think carefully and methodically. Consider searching for TODO, minimal implementations, placeholders, skipped/flaky tests, and inconsistent patterns. Study @IMPLEMENTATION_PLAN.md to determine starting point for research and keep it up to date with items considered complete/incomplete using subagents.

IMPORTANT: Plan only. Do NOT implement anything. Do NOT assume functionality is missing; confirm with code search first. Treat `packages/*` as the project's shared libraries for database, UI components, utilities, and integrations. Prefer consolidated, idiomatic implementations in shared packages over ad-hoc copies in individual apps.

ULTIMATE GOAL: We want to achieve a production-ready enterprise catering management system (Convoy) that consolidates legacy projects into a unified multi-tenant SaaS platform. Priority order: Kitchen tasks → Events → Staff scheduling → CRM → Inventory. Consider missing elements and plan accordingly. If an element is missing, search first to confirm it doesn't exist, then if needed author the specification at specs/FILENAME.md. If you create a new element then document the plan to implement it in @IMPLEMENTATION_PLAN.md using a subagent.

CRITICAL: This is a Turborepo monorepo with pnpm. Database is Neon Postgres with Prisma (NOT Supabase). Multi-tenancy uses shared database with `tenantId` column (NOT per-tenant databases). Realtime uses Ably via outbox pattern (NOT Supabase Realtime). Auth uses Clerk (already integrated).
