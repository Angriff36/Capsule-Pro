---
tags: [gotchas]
summary: gotchas implementation decisions and patterns
relevantTo: [gotchas]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 211
  referenced: 0
  successfulFeatures: 0
---
# gotchas

#### [Gotcha] Cannot import types from Prisma-generated database package in client code due to server-only directive (2026-01-17)
- **Situation:** KitchenTaskStatus enum exists in @repo/database but cannot be imported for client-side validation
- **Root cause:** Prisma automatically adds 'use server' directive to generated files, marking them as server-only at build time
- **How to avoid:** Avoids build errors but requires manual type synchronization and potential duplication

#### [Gotcha] Monorepo packages require manual pnpm install after adding new workspace packages (2026-01-17)
- **Situation:** Added new @repo/kitchen-state-transitions package but imports failed initially
- **Root cause:** pnpm workspace resolution needs to be regenerated to recognize new packages in workspace configuration
- **How to avoid:** Simple one-time step but easy to forget when adding packages