# Task Plan: Local Build Recovery (App/Web)

## Goal
Restore local dev/build stability for `apps/app` and `apps/web` before further deployment work.

## Current Phase
Paused

## Phases
### Phase 1: Fix Local Build Errors
- [ ] Address `next/font/google` missing in `@repo/design-system` (add `next` dep + lockfile)
- [ ] Re-run `pnpm --filter app run build`
- [ ] Re-run `pnpm --filter web run build`
- **Status:** pending

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|  |  |  |

# Task Plan: Fix Capsule-Pro Web Build (Basehub Blog Types)

## Goal
Resolve Basehub blog type/schema mismatches so the `apps/web` build passes on Vercel without unsafe casts or fallback hacks.

## Current Phase
Phase 1

## Phases
### Phase 1: Schema + Type Alignment
- [ ] Confirm Basehub blog fields available in schema (title vs _title, description, slug)
- [ ] Align `packages/cms` fragments to the schema fields used in UI
- [ ] Update blog pages to use the canonical fields only
- **Status:** in_progress

### Phase 2: Verification
- [ ] Run `pnpm --filter web run build` and confirm no TS errors
- [ ] Capture any warnings/errors in this plan
- **Status:** pending

### Phase 3: Ship
- [ ] Commit changes
- [ ] Push to `capsule-pro` remote
- **Status:** pending

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `pnpm --filter web build` reported "No projects matched the filters C:\\projects\\convoy" | 1 | Use `pnpm --filter web run build` or `pnpm --filter ./apps/web run build` |
| TS error: `Property '_title' does not exist on type 'Post'` | 1 | Pending (align schema + fragment) |
| TS error: `Property 'description' does not exist on type 'Post'` | 2 | Pending (align schema + fragment) |

# Task Plan: Long-Term Feature List (Convoy)

## Goal
Create an extended, actionable feature list grounded in legacy CaterKing docs while aligned to Convoy's stack (Prisma + Neon, Clerk, Ably).

## Current Phase
Phase 0

## Phases

### Phase 0: Module Navigation + Sidebars
- [x] Replace placeholder nav items with real modules
- [x] Add module layouts with local sidebars
- [x] Add stub screens for module sections
- **Status:** complete

### Phase 0b: Dev Console UI
- [x] Add Dev Console route group with dedicated sidebar
- [x] Implement Dashboard + Tenant Manager mock screens
- [x] Apply dev-console-only styling
- **Status:** complete

### Phase 0c: Theme Tokens
- [x] Define sharper light theme with dark sidebar
- [x] Refresh dark mode palette for stronger contrast
- **Status:** complete

### Phase 0d: Kitchen Overview UI
- [x] Build Kitchen Production Board mock layout
- [x] Keep sidebar items non-interactive (placeholder)
- **Status:** complete

### Phase 0e: Module Header + Sidebar Slot
- [x] Move module navigation to header
- [x] Render module-specific sidebar items in global sidebar
- [x] Add per-module settings route placeholder
- **Status:** complete

### Phase 1: Source Review
- [x] Read CaterKing overview, SRS, UI design, PRD
- [ ] Capture key feature themes for Convoy adaptation
- **Status:** in_progress

### Phase 2: Feature List Draft
- [ ] Update `feature_list.md` with long-term roadmap
- [ ] Highlight differences vs legacy stack (Prisma/Neon/Clerk/Ably)
- **Status:** pending

### Phase 3: Docs & Handoff
- [ ] Note plan in `notes.md` and `progress.md`
- [ ] Confirm any missing sections with user
- **Status:** pending

## Key Questions
1. Should mobile and wall-display modes be treated as first-class milestones?
2. Do we want explicit deliverables for role-based workflows (staff/manager/owner)?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Use CaterKing docs as guidance, not source of truth | Convoy uses different stack and existing architecture |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|

## Notes
- Update this plan every phase
