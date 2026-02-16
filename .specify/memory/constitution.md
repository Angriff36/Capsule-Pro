# Project Constitution

Version: 1.0.0
Last Updated: 2026-01-23

## 1. Project Identity

### 1.1 Name & Purpose
- **Name**: Convoy
- **Purpose**: Enterprise catering management SaaS platform
- **Core Domain**: Multi-tenant catering operations

### 1.2 Key Stakeholders
- Catering operations teams
- Kitchen staff
- Event coordinators
- Business administrators

## 2. Foundational Law

### 2.1 MUST Rules (Violations Invalidate Changes)

**Package Management**
- [MUST] Use pnpm (npm/yarn prohibited)

**Database Authority**
- [MUST] Use Prisma + Neon (Supabase prohibited)
- [MUST] All tenant tables include `tenantId` column
- [MUST] All tenant tables include `createdAt`, `updatedAt`, `deletedAt`
- [MUST] Use soft deletes - never hard delete tenant data
- [MUST] Tenant isolation enforced at application layer

**Authentication & Real-time**
- [MUST] Use Clerk for authentication (custom auth prohibited)
- [MUST] Business-critical realtime uses outbox + Ably (Supabase Realtime prohibited)

**Code Quality**
- [MUST] Use Biome via ultracite (`pnpm check`, `pnpm fix`)
- [MUST] Use `@repo/*` workspace imports for shared packages
- [MUST] Use Conventional Commits format

### 2.2 SHOULD Rules (Strong Recommendations)

- [SHOULD] Keep files under 500 lines
- [SHOULD] Add tests for bug fixes
- [SHOULD] Update docs when changing behavior/APIs
- [SHOULD] Run tests before merge
- [SHOULD] Run `pnpm check` before commits
- [SHOULD] Authenticate API routes (public endpoints require explicit justification)
- [SHOULD] Prefer server components in Next.js
- [SHOULD] Use Zod for runtime validation
- [SHOULD] Prioritize: Kitchen (1) > Events (2) > Staff (3)

### 2.3 MAY Rules (Guidelines)

- [MAY] Use feature flags for gradual rollouts
- [MAY] Use Tanstack Table for complex data tables
- [MAY] Use Fuse.js for client-side fuzzy search

## 3. Architecture

### 3.1 Monorepo Structure

```
convoy/
├── apps/           # Deployable applications
│   ├── web/        # Marketing site (port 2222)
│   ├── app/        # Main SaaS app (port 2221)
│   ├── api/        # API server
│   ├── docs/       # Documentation
│   ├── email/      # Email templates
│   └── storybook/  # Component library
└── packages/       # Shared packages
    ├── database/   # Prisma schema + client
    ├── design-system/  # UI components
    ├── auth/       # Clerk authentication
    ├── collaboration/  # Real-time (Ably)
    └── ...
```

### 3.2 Technology Stack

| Layer        | Technology              |
|--------------|-------------------------|
| Framework    | Next.js + React         |
| Language     | TypeScript              |
| Database     | Neon PostgreSQL         |
| ORM          | Prisma                  |
| Auth         | Clerk                   |
| Realtime     | Ably (via outbox)       |
| Styling      | Tailwind CSS            |
| Linting      | Biome (ultracite)       |
| Testing      | Vitest                  |
| Build        | Turborepo               |

Note: Business-critical realtime uses outbox + Ably. UI presence/collaboration may use separate abstractions.

### 3.3 Naming Conventions

| Element         | Convention              |
|-----------------|-------------------------|
| Files           | kebab-case              |
| Components      | PascalCase              |
| Functions       | camelCase               |
| Constants       | UPPER_SNAKE_CASE        |
| DB tables       | snake_case              |
| DB columns      | snake_case              |

## 4. Database Schema Law

### 4.1 Schema Namespaces

| Schema           | Purpose                    | Has tenant_id? |
|------------------|----------------------------|----------------|
| platform         | Platform tables            | No             |
| core             | Shared enums, functions    | No             |
| tenant_*         | Domain-specific tables     | Yes (required) |

### 4.2 Domain Modules

| Module    | Schema           | Priority |
|-----------|------------------|----------|
| Kitchen   | tenant_kitchen   | 1        |
| Events    | tenant_events    | 2        |
| Staff     | tenant_staff     | 3        |
| CRM       | tenant_crm       | 4        |
| Inventory | tenant_inventory | 5        |
| Admin     | tenant_admin     | 6        |

### 4.3 Mandatory Table Columns (Tenant Tables)

```prisma
tenantId    String    @map("tenant_id") @db.Uuid
createdAt   DateTime  @default(now()) @map("created_at")
updatedAt   DateTime  @default(now()) @updatedAt @map("updated_at")
deletedAt   DateTime? @map("deleted_at")
```

## 5. Quality Standards

### 5.1 Testing
- Critical paths must be tested
- Bug fixes require regression tests

### 5.2 Security
- Tenant isolation at application layer
- Secrets in environment variables only
- Rate limiting via Arcjet

### 5.3 Accessibility
- WCAG 2.1 AA compliance target

## 6. Development Workflow

### 6.1 Branching
- Feature: `feature/<name>` or `<author>/<name>`
- Bugfix: `fix/<name>`
- No direct commits to main

### 6.2 Commits
Format: `<type>(<scope>): <description>`

Types: feat, fix, refactor, build, ci, chore, docs, style, perf, test

### 6.3 Code Review
- All PRs require review
- Address linting errors
- Update docs if behavior changes

## 7. Source of Truth

| Domain               | Authority                                    |
|----------------------|----------------------------------------------|
| Database schema      | `packages/database/prisma/schema.prisma`     |
| Schema patterns      | `docs/legacy-contracts/schema-contract-v2.txt` |
| Project guidance     | `CLAUDE.md`                                  |
| This constitution    | `.specify/memory/constitution.md`            |

## Changelog

### 1.0.0 - 2026-01-23
- Initial constitution
- Established technology guardrails (Prisma/Neon, Clerk, Ably)
- Defined multi-tenant database law
- Separated MUST (law) from SHOULD (policy)
