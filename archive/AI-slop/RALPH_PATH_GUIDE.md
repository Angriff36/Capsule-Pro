# Ralph Path Guide for Capsule Pro Monorepo

> **TL;DR**: Don't use generic `src/*` - be specific about which app/package you're working on.

---

## Monorepo Structure

```
capsule-pro/                    ← Loop runs from here
├── apps/
│   ├── app/                    ← Next.js frontend (Command Board, UI)
│   │   └── app/
│   │       ├── (authenticated)/
│   │       ├── (auth)/
│   │       └── lib/            ← App-level utilities
│   └── api/                    ← Hono API backend
│       └── app/
│           └── api/            ← API routes
├── packages/
│   ├── design-system/          ← Shared UI components
│   ├── manifest-adapters/      ← Manifest logic
│   ├── database/               ← Prisma + DB
│   └── [others]/
├── specs/                      ← Requirement specs
│   ├── command-board/
│   ├── manifest/
│   └── [others]/
├── PROMPT_plan_[name].md       ← Planning prompt
├── PROMPT_build_[name].md      ← Build prompt
├── IMPLEMENTATION_PLAN_[name].md ← Task list
└── loop-[name].sh              ← Loop script
```

---

## Path Templates by Work Type

### 1. Frontend Work (Command Board, UI, Components)

**Example**: Command Board bug fixes, UI polish, new features

```markdown
# PROMPT*plan*[feature].md

0a. Study `specs/command-board/*` with up to 250 parallel Sonnet subagents
0b. Study IMPLEMENTATION*PLAN*[feature].md (if present)
0c. Study `apps/app/app/(authenticated)/command-board/` with up to 500 parallel Sonnet subagents
0d. Study `packages/design-system/` for shared UI components
0e. For reference, the main app structure is in `apps/app/app/`
```

**Key paths for frontend:**

- Main app: `apps/app/app/`
- Command Board: `apps/app/app/(authenticated)/command-board/`
- Events: `apps/app/app/(authenticated)/events/`
- Shared UI: `packages/design-system/`
- App utils: `apps/app/app/lib/`

---

### 2. API/Backend Work (Manifest, Routes, Business Logic)

**Example**: Manifest adapters, API endpoints, cron jobs

```markdown
# PROMPT*plan*[feature].md

0a. Study `specs/manifest/*` with up to 250 parallel Sonnet subagents
0b. Study IMPLEMENTATION*PLAN*[feature].md (if present)
0c. Study `apps/api/app/api/` with up to 500 parallel Sonnet subagents
0d. Study `packages/manifest-adapters/` for manifest logic
0e. For reference, API routes are in `apps/api/app/api/`
```

**Key paths for API:**

- API routes: `apps/api/app/api/`
- Manifest adapters: `packages/manifest-adapters/`
- Database: `packages/database/`
- Shared types: `packages/types/`

---

### 3. Full-Stack Work (Touches Both Frontend + Backend)

**Example**: New feature that needs UI + API + DB

```markdown
# PROMPT*plan*[feature].md

0a. Study `specs/[feature]/*` with up to 250 parallel Sonnet subagents
0b. Study IMPLEMENTATION*PLAN*[feature].md (if present)
0c. Study `apps/app/app/` with up to 300 parallel Sonnet subagents (frontend)
0d. Study `apps/api/app/api/` with up to 300 parallel Sonnet subagents (backend)
0e. Study `packages/` for shared packages (design-system, database, manifest-adapters)
```

**Key paths for full-stack:**

- Frontend: `apps/app/app/`
- Backend: `apps/api/app/api/`
- Shared packages: `packages/design-system/`, `packages/database/`, etc.

---

### 4. Package Work (Shared Utilities, Components, Logic)

**Example**: Design system updates, manifest adapter changes

```markdown
# PROMPT*plan*[feature].md

0a. Study `specs/[feature]/*` with up to 250 parallel Sonnet subagents
0b. Study IMPLEMENTATION*PLAN*[feature].md (if present)
0c. Study `packages/[target-package]/` with up to 500 parallel Sonnet subagents
0d. Study usage in `apps/app/` and `apps/api/` to understand integration points
```

**Key paths for packages:**

- Design system: `packages/design-system/`
- Manifest: `packages/manifest-adapters/`
- Database: `packages/database/`
- Check usage: `apps/app/`, `apps/api/`

---

## Quick Reference: Path Patterns

### Command Board (Frontend)

```markdown
0c. Study `apps/app/app/(authenticated)/command-board/` with up to 500 parallel Sonnet subagents
0d. Study `packages/design-system/` for shared UI components
```

### Manifest (Backend)

```markdown
0c. Study `apps/api/app/api/` with up to 500 parallel Sonnet subagents
0d. Study `packages/manifest-adapters/` for manifest logic
```

### Events (Frontend)

```markdown
0c. Study `apps/app/app/(authenticated)/events/` with up to 500 parallel Sonnet subagents
0d. Study `packages/design-system/` for shared UI components
```

### Database/Schema

```markdown
0c. Study `packages/database/` with up to 500 parallel Sonnet subagents
0d. Study usage in `apps/app/` and `apps/api/` to understand schema usage
```

---

## Rules of Thumb

### ✅ DO:

- **Be specific** about which app/package you're working on
- **List the exact directories** Ralph should study
- **Include shared packages** when relevant (`packages/design-system/`, etc.)
- **Scale subagent counts** based on scope (250 for specs, 500 for code)

### ❌ DON'T:

- Use generic `src/*` (doesn't exist in this monorepo)
- Say "study the codebase" without specifying paths
- Forget to mention shared packages when they're relevant
- Over-scope (don't study entire monorepo if only touching one feature)

---

## Template: Copy-Paste for New Work

```markdown
# PROMPT*plan*[YOUR_FEATURE].md

You are Ralph Wiggum, an autonomous planning agent. Your job is to study the codebase, understand the [FEATURE] spec, and update IMPLEMENTATION*PLAN*[YOUR_FEATURE].md with concrete, actionable tasks.

## Phases

### Phase 0a: Study the Spec

Read and understand:

- `specs/[YOUR_FEATURE]/*` — The specifications

### Phase 0b: Study the Codebase

Use up to 500 parallel Sonnet subagents to study the existing implementation. **Don't assume functionality is missing** - search first before planning new implementations.

Focus on these areas:

- `[PATH_TO_MAIN_CODE]/` — Main implementation area
- `[PATH_TO_RELATED_CODE]/` — Related functionality
- `packages/[RELEVANT_PACKAGE]/` — Shared packages (if applicable)

### Phase 0c: Study Related Patterns

Use parallel Sonnet subagents to search for existing patterns:

- [Pattern 1 to look for]
- [Pattern 2 to look for]
- [Pattern 3 to look for]

### Phase 1: Update IMPLEMENTATION_PLAN.md

Use an Opus subagent to analyze findings and update IMPLEMENTATION*PLAN*[YOUR_FEATURE].md.

Break down [FEATURE] into concrete tasks...

[Rest of planning instructions]
```

---

## Examples from Current Setup

### My Command Board Setup (CORRECT):

```markdown
0b. Study the Codebase

Use up to 500 parallel Sonnet subagents to study the existing Command Board implementation.

Focus on these areas:

- `apps/app/app/(authenticated)/command-board/components/` — Components
- `apps/app/app/(authenticated)/command-board/actions/` — Server actions
- `apps/app/app/(authenticated)/command-board/nodes/` — React Flow nodes
- `packages/design-system/` — Shared UI components
```

**Why this works**: Specific paths that exist in the monorepo, scoped to Command Board work only.

---

## Summary

**Original Ralph**: Single app with `src/` → Generic paths work
**Your Monorepo**: Multi-app with `apps/` and `packages/` → Specific paths required

**The Rule**: **Tailor paths to the work**. If working on Command Board, study `apps/app/app/(authenticated)/command-board/`. If working on Manifest, study `apps/api/app/api/` and `packages/manifest-adapters/`.

**Don't overthink it** - just be specific about which directories contain the code Ralph needs to understand.
