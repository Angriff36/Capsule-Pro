# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Convoy** is an enterprise catering management system built on the next-forge template (a production-grade Next.js Turborepo). The project salvages working components from multiple legacy projects (Capsule, Shift-Stream, Battle-Boards, PrepChefApp, etc.) to build a comprehensive multi-tenant SaaS platform for catering operations.

### Key Context
- **Mission**: Consolidate legacy catering management projects into a unified platform
- **Architecture**: Monorepo managed by Turborepo with shared packages and multiple apps
- **Multi-tenancy**: Shared database with `tenant_id` column (NOT per-tenant databases)
- **Domain modules**: Staff scheduling, kitchen tasks, events/battle boards, inventory, CRM, admin

## Development Commands

### Essential Commands
```bash
# Install dependencies
pnpm install

# Run all apps in dev mode (parallel)
pnpm dev

# Run specific apps (web=port 2222, app=port 2221)
pnpm dev:apps

# Build all apps
pnpm build

# Lint and format (using Biome via ultracite)
pnpm check      # Check for issues
pnpm fix        # Auto-fix issues

# Run tests
pnpm test       # All tests
cd apps/app && pnpm test  # Single app tests

# Database operations
pnpm migrate    # Format, generate client, push schema to DB
cd packages/database && npx prisma studio  # Database GUI

# Update dependencies
pnpm bump-deps  # Update all dependencies except recharts
pnpm bump-ui    # Update shadcn/ui components

# Translations
pnpm translate  # Generate translations
```

### Single Test Execution
```bash
# Run specific test file
cd apps/app && npx vitest run __tests__/sign-in.test.tsx
```

## Tech Stack

### Core Technologies
- **Framework**: Next.js 16 (React 19)
- **Language**: TypeScript 5.9+
- **Build Tool**: Turborepo
- **Package Manager**: pnpm 10.24+ (required)
- **Database**: Neon Postgres with Prisma ORM
- **Auth**: Clerk
- **Styling**: Tailwind CSS v4
- **Linting**: Biome (via ultracite)
- **Testing**: Vitest with React Testing Library
- **Real-time**: Ably (via outbox pattern, not Supabase Realtime)

### Key Services
- Analytics: Google Analytics + Posthog
- Observability: Sentry (errors), BetterStack (logging/uptime)
- Security: Arcjet (rate limiting, security headers)
- Email: Resend with React Email templates
- Payments: Stripe
- Feature Flags: Built-in feature flag management
- CMS: Type-safe content management

## Architecture

### Monorepo Structure

```
convoy/
├── apps/                    # Deployable applications
│   ├── web/                # Marketing site (port 2222)
│   ├── app/                # Main SaaS application (port 2221)
│   ├── api/                # API server
│   ├── docs/               # Documentation (Mintlify)
│   ├── email/              # Email templates (React Email)
│   └── storybook/          # Component library showcase
└── packages/               # Shared packages
    ├── database/           # Prisma schema + generated client
    ├── design-system/      # UI components (shadcn/ui based)
    ├── auth/               # Clerk authentication
    ├── analytics/          # Analytics utilities
    ├── collaboration/      # Real-time features
    ├── internationalization/  # i18n support
    └── ...                 # Other shared packages
```

### Database Architecture

**Multi-tenant Schema Design** (defined in `packages/database/prisma/schema.prisma`):

Prisma schema uses **multiple PostgreSQL schemas**:
- `public`: Core models (Tenant, User, KitchenTask, OutboxEvent)
- `platform`: Platform-level tables (no tenant_id)
- `core`: Shared enums, functions, types
- `tenant_*`: Domain-specific tenant tables (all have tenant_id):
  - `tenant_staff`: Staff scheduling, shifts, time tracking
  - `tenant_kitchen`: Kitchen tasks, prep lists, recipes
  - `tenant_events`: Events, battle boards, menus
  - `tenant_inventory`: Inventory management
  - `tenant_crm`: CRM operations
  - `tenant_admin`: Admin/reporting functions

**Important**: The schema contract lives in `supabase/Schema Contract v2.txt` and defines mandatory patterns for RLS, audit trails, soft deletes, and foreign key strategies. While the project uses Neon + Prisma (not Supabase), these patterns inform the schema design.

### Key Design Patterns

1. **Multi-tenancy**: Every tenant-scoped table includes `tenantId` with indexes. Tenant isolation enforced at application layer.

2. **Soft Deletes**: Tables include `deletedAt` timestamp. Use `WHERE deletedAt IS NULL` in queries.

3. **Audit Trail**: All tables have `createdAt` and `updatedAt` timestamps (auto-managed by Prisma).

4. **Outbox Pattern**: Real-time events use `OutboxEvent` model published to Ably (not direct Supabase Realtime).

5. **Realtime Priority Order**:
   - Kitchen task claims/progress (highest priority)
   - Events board updates
   - Scheduling changes

### App Structure

**apps/app** (Main SaaS Application):
- Uses Next.js App Router with route groups
- `(authenticated)/`: Protected routes requiring authentication
  - Module-based structure: `/administrative`, `/analytics`, `/crm`, `/events`, `/inventory`, `/kitchen`, `/staff`
  - Each module has its own layout and navigation
- `(unauthenticated)/`: Public routes (sign-in, sign-up)
- `(dev-console)/`: Development tools
- `api/`: API routes for backend operations
- `lib/`: Shared utilities, contexts, hooks

**apps/web** (Marketing Site):
- Public-facing marketing website
- Internationalization support via `@repo/internationalization`
- CMS integration for content management

## Agent Protocols (from AGENTS.MD)

### Mandatory Workflows
1. **Read agent docs first**: `C:\Users\Ryan\Home\agent-scripts\AGENTS.MD` and relevant docs in `C:\Users\Ryan\Home\agent-scripts\docs\`
2. **Planning with files**: Use skill at `C:\Users\Ryan\.claude\skills\planning-with-files` for complex work
   - **Create files in `claude-code-plans/` directory** (isolated from Codex)
   - Create `task_plan.md` and `notes.md` at task start
   - Subagents work within this directory or report to orchestrator
   - Archive completed plans to `docs/task-plans/` when done
3. **Check documentation before coding**: Run `pnpm docs:list` to open docs, follow `read_when` hints
4. **Context7 MCP**: Call at the beginning of every task and upon encountering errors
5. **Use pnpm**: Never use npm or yarn (this is a pnpm workspace)

### Communication Style
- **Telegraph style**: Noun phrases ok; drop grammar; minimal tokens
- **Recap sessions**: Open with recap of previous session (active context)
- **Critical thinking**: Fix root cause (not band-aid); if clear correct decision exists, choose it; only present options if real uncertainty or tradeoffs exist

### Workspace & Files
- **Parent workspace**: `C:\Projects\` contains multiple repos
- **This repo**: `C:\Projects\convoy`
- **Legacy repos** (for salvaging): `C:\Projects\Capsule`, `C:\Projects\Shift-Stream`, etc.
- **Shell**: PowerShell is default on Windows
- **Agent scripts**: `C:\Users\Ryan\Home\agent-scripts`
- **File size**: Keep under ~500 LOC; split/refactor as needed

### Git Protocols
- **Safe by default**: `git status`, `git diff`, `git log` are always safe
- **Commits**: Use Conventional Commits format (feat|fix|refactor|build|ci|chore|docs|style|perf|test)
- **No amends**: Unless explicitly asked
- **No destructive ops**: reset --hard, clean, restore, rm require explicit consent
- **Deletes**: Prefer Recycle Bin or `trash` command; ask if not available
- **Branch changes**: Require user consent
- **Remotes**: Prefer HTTPS for repos under `C:\Projects`
- **Small commits**: Keep edits reviewable; no repo-wide search/replace scripts

### Testing & Quality Gates
- **Before handoff**: Run full gate (lint/typecheck/tests/docs) if available
- **Regression tests**: Add when fixing bugs (when it fits)
- **End-to-end verification**: Prefer full verification; if blocked, state what's missing
- **CI**: Use `gh run list/view`, rerun, fix, push until green

### Documentation
- **Update with changes**: No ship without docs when behavior/API changes
- **Keep notes short**: Follow docs structure and hints

### Convoy-Specific Guardrails (Do Not Drift)
- **Stack**: Prisma + Neon (NOT Supabase with RLS)
- **Multi-tenant**: Shared DB with `tenant_id` column (NOT per-tenant databases)
- **Realtime**: Ably via outbox pipeline (NOT Supabase Realtime)
- **Auth**: Clerk (already integrated)
- **Priority Order**: Kitchen tasks → Events → Scheduling
- **Docs**: Mintlify at http://localhost:2232/introduction (when running)

### Notes Management
- Keep `notes.md` as a scratch pad with:
  - Static Guardrails section at the top
  - Short Handoff section after each task
  - Clear scratch content when task complete (don't delete file)

## Module-Specific Context

### Kitchen Module (Priority #1)
- **Tables**: `KitchenTask`, `KitchenTaskClaim`, `KitchenTaskProgress` (public schema)
- **Real-time**: Task claims and progress updates via Ably
- **Mobile Focus**: Prep lists, recipe views, task management
- **Status Flow**: open → in_progress → done (or canceled)
- **Priorities**: low, medium, high, urgent

### Events Module (Priority #2)
- **Table**: `Event` (tenant_events schema)
- **Features**: Battle boards, TPP PDF parsing, event briefing exports
- **Integration**: CSV/PDF import pipeline for event data
- **Source Assets**: Battle-Boards and Kitchen-Manager-Module legacy code

### Staff Module (Priority #3)
- **Schema**: tenant_staff
- **Features**: Scheduling, time tracking, availability, time-off requests
- **Source Assets**: Shift-Stream data model
- **Integration**: GoodShuffle, Nowsta (future)

### CRM Module
- **Schema**: tenant_crm
- **Scope**: Companies, contacts, deals, activities
- **Level**: Tenant-wide (not location-scoped)

### Inventory Module
- **Schema**: tenant_inventory
- **Scope**: Items, locations, stock, transactions
- **Level**: Location-scoped where applicable

## Testing

- **Framework**: Vitest + React Testing Library
- **Location**: `apps/*/tests__/` directories
- **Run tests**: `pnpm test` (all) or `cd apps/app && npx vitest run __tests__/file.test.tsx` (specific)
- **Config**: Each app has its own `vitest.config.ts`

## Internationalization

- Package: `@repo/internationalization`
- Generate translations: `pnpm translate`
- Apps support multiple locales with route-based locale detection

## Code Quality

- **Linter**: Biome configured via ultracite presets
- **Config**: `biome.jsonc` extends ultracite/core, ultracite/react, ultracite/next
- **Exclusions**: shadcn/ui components, generated files, email templates
- **Commands**: `pnpm check` (lint), `pnpm fix` (auto-fix)
- **Pre-commit**: Enforce checks before commits

## Deployment

- Apps are independently deployable
- Turbo caching configured for builds
- Environment variables: Use `.env.local` files (gitignored)
- Database migrations: Run `pnpm migrate` before deploying

## Salvage Sources Reference

Legacy projects being integrated (located in `C:\Projects\`):
- **Capsule**: Supabase schema contract, multi-tenant migrations
- **Shift-Stream**: Staff scheduling data model
- **Battle-Boards**: CSV/TPP PDF parsing, battle board UI
- **Kitchen-Manager-Module**: Event/run-report JSON schemas
- **Mikes Module**: PDF parsing pipeline, allergen configs
- **PrepChefApp**: Kitchen prep workflows, mobile-first design
- **caterkingapp**: OpenAPI contracts for API endpoints
- **codemachine**: System scope documentation
- **hq-operations**: Module separation architecture

See `spec.md` for detailed salvage integration plan.

## Important Files

- `AGENTS.md`: AI agent coordination patterns (external reference at C:\Users\Ryan\Home\agent-scripts\AGENTS.MD)
- `spec.md`: Detailed technical specification and migration plan
- `supabase/Schema Contract v2.txt`: Database schema patterns and conventions
- `turbo.json`: Turborepo task configuration
- `package.json`: Root scripts and workspace configuration

## Multi-Agent Orchestration System

### Core Principle

> **"The main thread is the Orchestrator, not the Implementer"**

This project uses a **multi-agent orchestration architecture** where the main Claude Code session acts as an **Orchestrator** that delegates work to specialist subagents.

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR LAYER                        │
│  (Main Thread - Claude Code Session)                         │
│  - Accepts user requests                                      │
│  - Analyzes intent and requirements                           │
│  - Selects appropriate specialist agents                      │
│  - Coordinates parallel execution                             │
│  - Merges outcomes and verifies results                       │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  SPECIALIST │ │  SPECIALIST │ │  SPECIALIST │
│   AGENTS    │ │   AGENTS    │ │   AGENTS    │
│ (Domain     │ │ (Domain     │ │ (Domain     │
│  Experts)   │ │  Experts)   │ │  Experts)   │
└─────────────┘ └─────────────┘ └─────────────┘
```

### NON-NEGOTIABLE RULES

**1. ORCHESTRATOR CANNOT EXECUTE COMMANDS**
- The main thread (Orchestrator) is FORBIDDEN from running Bash, Edit, Write, or any execution tools
- ONLY specialist agents may execute commands and modify code
- Orchestrator's job: Plan → Delegate → Verify Results (NOT implement)

**2. AGENTS CANNOT SIGN OFF ON THEIR OWN WORK**
- An agent that implements code CANNOT validate it themselves
- NO "I implemented this and verified it works" - that's a conflict of interest
- ALL implementations require independent verification by a different agent

**3. ORCHESTRATOR CANNOT SIGN OFF ON AGENT WORK**
- Orchestrator approving agent work defeats the purpose of delegation
- ONLY specialized Validation or Architect agents may sign off
- Orchestrator can ONLY report what the validator found

**4. ALL WORK MUST BE VALIDATED BEFORE COMPLETION**
- Nothing is "done" until a validator agent has verified it
- No "I'll fix it later" - broken code blocks all progress
- Tests must pass, types must check, build must compile

### Workflow (ENFORCED)

```
┌─────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR (Main Thread)                                 │
│  - Reads code, plans tasks, delegates to agents            │
│  - NEVER executes commands or modifies code                │
│  - NEVER signs off on work                                 │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ delegates to
               ▼
┌─────────────────────────────────────────────────────────────┐
│  IMPLEMENTATION AGENT                                       │
│  - Executes commands, writes code, runs tests             │
│  - Reports results WITHOUT claiming "done"                │
│  - CANNOT validate own work                                │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ passes to
               ▼
┌─────────────────────────────────────────────────────────────┐
│  VALIDATION/ARCHITECT AGENT                                  │
│  - Runs type-check, lint, tests                            │
│  - Verifies against architectural constraints               │
│  - ONLY this agent can sign off                             │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ reports back to
               ▼
┌─────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR                                                │
│  - Reports validation results to user                      │
│  - Only then can work be considered "complete"              │
└─────────────────────────────────────────────────────────────┘
```

### Acceptable Uses for Orchestrator

**Orchestrator MAY:**
- Read files to understand context
- Use Grep/Glob to find code patterns
- Plan tasks and break down work
- Delegate to appropriate specialist agents
- Use AskUserQuestion to clarify requirements
- Report validation results from agents

**Orchestrator MUST NOT:**
- Run Bash commands (except git status/read-only)
- Edit or Write files
- Execute implementations
- Sign off on work it delegated

### Available Specialist Agents

Key agents for Convoy work (use via Task tool):
- **frontend-ui-implementer**: UI components, pages, layouts (web/mobile)
- **Senior Engineer**: Complex debugging, unblocking, performance optimization
- **Implementation Specialist**: Well-defined tasks across all domains
- **codebase-architect**: Architectural sign-off, file creation approval, task completion marking
- **test-enforcement-architect**: Comprehensive testing, browser-based tests, no test modifications
- **Planning Specialist**: Break features into domain-isolated tasks with dependencies
- **Feature Architect**: Transform concepts into formalized features with templates

### Full Documentation

Complete multi-agent system documentation at: `C:/Projects/capsule/AGENTS_FULL.md`

## Common Pitfalls

1. **Don't use npm/yarn**: This is a pnpm workspace
2. **Don't bypass ultracite**: Use `pnpm check` and `pnpm fix` instead of direct Biome commands
3. **Don't create per-tenant databases**: Use shared DB with tenant_id column
4. **Don't use Supabase**: Database is Neon, real-time is Ably, auth is Clerk
5. **Check AGENTS.md first**: Always review agent coordination patterns before starting complex work
6. **Follow schema contract**: Tenant tables must have tenant_id, soft deletes, timestamps
7. **Test imports**: Prefer `@repo/*` workspace imports over relative paths for shared packages
