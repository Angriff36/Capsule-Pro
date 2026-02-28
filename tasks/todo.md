# Current Task

## Agent 2 — 2026-02-22

**Goal:** Enforce CLAUDE.md compliance — create missing task files, add blocking session checklist to CLAUDE.md

- [x] Read `tasks/ledger.md` — last Agent ID is 1 (example), mine is 2
- [x] Identify what CLAUDE.md rules agents have been ignoring
- [x] Add blocking session start/end checklist to project CLAUDE.md
- [x] Create `tasks/lessons.md` with initial lessons
- [x] Create `tasks/todo.md` (this file)
- [x] Append ledger entry to `tasks/ledger.md`

## Review

All three enforcement mechanisms now exist:

- `CLAUDE.md` has a blocking checklist at the top that agents cannot miss
- `tasks/lessons.md` initialized with 3 lessons from this session
- `tasks/todo.md` initialized with this session's work
- Ralph loop exemption preserved ("If you are a ralph loop agent working on `implementation_plan.md`, skip this checklist")

---

## Agent 3 — 2026-02-23

**Goal:** Fix MCP server runtime boot — resolve `server-only`, dotenv, and ESM interop blockers

### Current Task
- [x] Diagnose `server-only` crash in standalone Node.js
- [x] Diagnose ESM named export failure from CJS `.ts` workspace packages
- [x] Create preload.cts shim for `server-only` + dotenv
- [ ] Fix `@prisma/client` → `.prisma/client/default` missing module
- [ ] Fix ESM interop for `@repo/database` (CJS `.ts` → ESM named exports)
- [ ] Boot test the MCP server end-to-end
- [ ] Typecheck passes
- [ ] Update ledger

### Bugs Found During MCP Server Boot Debugging

#### BUG-1: `ingredient-resolution.ts` imports from `@prisma/client` instead of generated client
- **File:** `packages/database/src/ingredient-resolution.ts:7`
- **Issue:** `import { Prisma as PrismaNamespace } from "@prisma/client"` — Prisma v7 with custom `output = "../generated"` does NOT populate `@prisma/client` with the generated types. Per official Prisma docs: "Under no circumstances should `import { PrismaClient } from '@prisma/client'` be used in this configuration."
- **Impact:** Runtime crash — `@prisma/client/default.js` tries `require('.prisma/client/default')` which doesn't exist. Works in Next.js only because webpack resolves it differently.
- **Fix:** Change to `import { Prisma as PrismaNamespace } from "../generated/client.js"` — BUT the generated `Prisma` namespace has a different shape (no `.prototype.$queryRaw`). Needs investigation of what `PrismaNamespace.prototype.$queryRaw`, `PrismaNamespace.sql`, and `PrismaNamespace.join` map to in the generated client.
- **Typecheck also broken:** `pnpm --filter @repo/database typecheck` fails with 4 errors in this file.

#### BUG-2: `@repo/database` missing `"type": "module"` causes ESM interop failures
- **File:** `packages/database/package.json`
- **Issue:** No `"type": "module"` field. `"main": "./index.ts"` is a TypeScript file. When ESM packages (like `manifest-adapters/dist/*.js`) do `import { Prisma } from "@repo/database"`, Node treats the `.ts` file as CJS. Node's CJS-to-ESM named export detection fails for `.ts` files — it can't statically analyze TypeScript.
- **Impact:** Any standalone ESM process that transitively imports `@repo/database` gets `SyntaxError: The requested module '@repo/database' does not provide an export named 'X'`. Works in Next.js because webpack handles the resolution.
- **Fix:** Add `"type": "module"` to `packages/database/package.json`. Requires testing all consumers (apps/api, apps/app, etc.) to ensure nothing breaks.

#### BUG-3: `@repo/database` imports `server-only` which blocks non-Next.js usage
- **File:** `packages/database/index.ts:1`
- **Issue:** `import "server-only"` at the top of the entry point. This is a Next.js RSC guard that throws `Error: This module cannot be imported from a Client Component module` in ANY non-Next.js Node.js process.
- **Impact:** No standalone Node.js script, CLI tool, or MCP server can import `@repo/database` without shimming `server-only` first. The package is effectively locked to Next.js.
- **Fix options:** (a) Move `server-only` behind a conditional check, (b) Add a separate entry point without the guard (e.g., `@repo/database/standalone`), (c) Use package.json `exports` with conditions to serve different entry points.

#### BUG-4: `.prisma/client/default` not generated with custom output
- **File:** `packages/database/prisma/schema.prisma` — `output = "../generated"`
- **Issue:** Prisma 7 with custom `output` does NOT create the `.prisma/client/default` module that `@prisma/client/default.js` expects. The `@prisma/client` npm package does `require('.prisma/client/default')` which fails with `MODULE_NOT_FOUND`.
- **Impact:** Any code importing from `@prisma/client` (instead of the generated client path) crashes at runtime. This is a known Prisma v7 migration issue.
- **Fix:** Either (a) fix all imports to use the generated client path, or (b) add a postgenerate script that creates the `.prisma/client/default` shim, or (c) add `@prisma/client` `exports` override in package.json.

### Fix Strategy Options (for next agent)

All 4 bugs are interconnected. Each partial fix exposes the next. Three strategies:

**Option A: Fix `@repo/database` properly (correct fix, bigger scope)**
1. Add `"type": "module"` to `packages/database/package.json` → fixes BUG-2
2. Fix `ingredient-resolution.ts` import to use `../generated/client.js` → fixes BUG-1 + BUG-4
   - NOTE: `Prisma` namespace from generated client has different shape than `@prisma/client`. Need to investigate `PrismaNamespace.prototype.$queryRaw`, `.sql`, `.join` equivalents.
3. Add conditional `server-only` or separate entry point → fixes BUG-3
4. Test ALL consumers: `apps/api`, `apps/app`, `apps/mobile`, any scripts
5. MCP server preload.cts becomes just dotenv loading (no shims needed)

**Option B: Preload shim + `type:module` (MCP-only workaround)**
1. Add `"type": "module"` to `packages/database/package.json` → fixes BUG-2
2. Preload shims `server-only` (already done) → fixes BUG-3 for MCP only
3. Preload shims `@prisma/client` to redirect to generated client → fixes BUG-1 + BUG-4 for MCP only
4. Only test MCP server, defer full consumer testing
5. Risk: `type:module` change may break Next.js apps

**Option C: Bypass `@repo/database` entirely in MCP server**
1. Create standalone PrismaClient in MCP server using Neon adapter directly
2. Don't import `@repo/database` at all — duplicate ~30 lines of setup
3. Still need preload for `manifest-adapters` transitive dependency (it imports `@repo/database` via `prisma-store.js`)
4. This means Option C still needs BUG-2 fixed (or the transitive import crashes)
5. Least invasive to other packages but doesn't actually solve the root cause

**Recommendation:** Option A is the correct fix. The database package needs to work outside Next.js — MCP server is just the first consumer, there will be more (CLI tools, scripts, workers). The `type:module` + generated client import fix is the Prisma v7 documented pattern.

### What's Already Done (files to keep)
- `packages/mcp-server/` — all 12 source files are written and typecheck clean
- `packages/mcp-server/src/preload.cts` — shims `server-only` + loads dotenv (keep regardless of strategy)
- `.mcp.json` — updated with capsule-pro server entries
- `node_modules/.prisma/client/default.js` — ephemeral shim, will be lost on `pnpm install`

### What's NOT Done
- ~~MCP server has never successfully booted~~
- No runtime testing of any tools
- No integration test with actual MCP client

---

## Agent 46 — 2026-02-28

**Goal:** Fix false-positive COMMAND_ROUTE_ORPHAN detection in manifest CLI audit

### Completed
- [x] Diagnosed root cause: `hasCommandManifestBacking` compared kebab-case filesystem paths against lowercased camelCase IR commands without normalization
- [x] Wrote failing test proving the bug (kebab-case vs camelCase multi-word commands)
- [x] Fixed `hasCommandManifestBacking` with `toKebabCase()` normalization
- [x] All 741 manifest tests pass
- [x] Published `@angriff36/manifest@0.3.29`
- [x] Updated capsule-pro dependency (4 package.json + lockfile)
- [x] Verified: COMMAND_ROUTE_ORPHAN warnings dropped from 61 → 2 (genuine orphans only)
- [x] Full build pipeline verified: 539 files audited, 172 errors, 43 warnings
- [x] Ledger entry written

### Follow-ups (separate PRs per handoff constraint)
- [ ] Delete 4 camelCase duplicate station command routes
- [ ] Delete 6 prep-lists/items duplicate routes
- [ ] Triage 2 genuine orphans: staff/shifts/commands/{update,create}-validated
- [ ] Fix known issues: conflicts/detect auth gap, user-preferences dead exports, prep-lists/save legacy
- [ ] Implement missing plan tests A, B, C, G

---

## Agent 7 — 2026-02-23

**Goal:** Fix MCP server boot — resolve remaining blockers

### Fixes Applied
- [x] Fix BUG-1: `ingredient-resolution.ts` was already fixed (imports from `../generated/client`)
- [x] Fix BUG-2: Added `"type": "module"` to `packages/database/package.json`
- [x] Fix BUG-3: Handled by `preload.cts` shim (server-only stub)
- [x] Fix BUG-4: Handled by `preload.cts` shim (@prisma/client cache population)
- [x] Fix `preload.cts`: Changed `import.meta.dirname` to `__dirname` for CJS compatibility
- [x] MCP server boots successfully
- [x] TypeScript passes
- [x] Build passes
- [x] Tests pass (667/667)

### Files Changed
- `packages/database/package.json` — Added `"type": "module"`
- `packages/mcp-server/src/preload.cts` — Fixed CJS compatibility (`__dirname` vs `import.meta.dirname`)

### Verification
```
$ pnpm --filter @repo/mcp-server start
[db] Using Neon host: ... (pooler: true)
{"level":"info","message":"MCP server starting","mode":"tenant",...}
{"level":"info","message":"MCP server connected via stdio transport","mode":"tenant"}

$ pnpm tsc --noEmit
(no errors)

$ pnpm turbo build --filter=api
Tasks: 7 successful, 7 total

$ pnpm vitest run (manifest-runtime)
Test Files: 14 passed, Tests: 667 passed
```
