0a. Study `specs/command-board/*.md` using up to 300 parallel Sonnet subagents to understand Command Board product direction, existing bug history, and quality expectations.
0b. Study `specs/command-board/IMPLEMENTATION_PLAN_commandboard_hardening.md` (if present) to understand what is already complete.
0c. Study existing codepaths with up to 400 parallel Sonnet subagents:

- `apps/api/app/api/conflicts/detect/route.ts`
- `apps/app/app/api/command-board/chat/`
- `apps/app/app/api/command-board/`
- `apps/app/app/(authenticated)/command-board/`
- `apps/app/__tests__/api/command-board/`
  0d. For shared logic reference, inspect `packages/database/`, `packages/ai/`, and `packages/manifest-adapters/`.

Study `specs/command-board/IMPLEMENTATION_PLAN_commandboard_hardening.md` (it may be incomplete) and use up to 500 Sonnet subagents to compare code against specs and this plan. Use an Opus subagent to prioritize tasks and update that implementation plan with a concise, ordered checklist.

IMPORTANT: Plan only. Do NOT implement anything. Do NOT assume gaps; verify by code search first.

ULTIMATE GOAL: deliver a crash-resistant, observable, and regression-tested Command Board that behaves correctly on empty/new boards, seeded boards, malformed assistant tool args, tenant mismatches, and partial detector failures.

Priority order to enforce in the plan:

- Conflict API stabilization and typed payload guarantees
- SQL hardening (Prisma/typed `Prisma.sql` usage)
- Assistant tool-arg safety and response guardrails
- Regression tests for all known crash classes and signatures
- Partial-results conflict resilience in API and UI
- UX/data safety polish (empty state, select sentinel safety, projection/card fallbacks)
- Command route contract/idempotency tests
- Structured observability with correlation IDs + normalized error codes
- CI board-health smoke script
- Performance baseline and regression budget for board load
