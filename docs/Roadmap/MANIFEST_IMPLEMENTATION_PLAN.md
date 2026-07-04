# Manifest Integration Implementation Plan

**Status**: Active Planning | **Last Updated**: 2026-02-11 | **Priority**: CRITICAL

---

## Executive Summary

The Capsule-Pro Manifest integration has a **CRITICAL IR GENERATION BUG** that must be fixed before any other work. Beyond that, the system is **PRODUCTION READY** but suffers from structural conflicts that impede developer clarity and maintainability. The system is functionally operational with 180+ passing tests and 42 generated command routes, but:

### Critical Issues (VERIFIED 2026-02-11)

1. **CRITICAL: IR Generation Last-File-Wins Bug**
   - `pnpm manifest:compile` compiles multiple manifests to the **same output file**
   - Each manifest overwrites the previous, resulting in single-manifest IR
   - When compiling from `packages/manifest-adapters/manifests/*.manifest` (6 files), only the last file (`inventory-rules.manifest`) ends up in `kitchen.ir.json`
   - The committed `kitchen.ir.json` contains only `InventoryItem` entity instead of all 6 kitchen entities

2. **HIGH: Wrong Source Paths in Config and Scripts**
   - `manifest.config.yaml` points to `packages/manifest-sources/kitchen/*.manifest` (3 files)
   - `scripts/manifest/compile.mjs` hardcodes the same wrong path
   - `scripts/manifest/build.mjs` also uses the wrong path
   - Should point to `packages/manifest-adapters/manifests/*.manifest` (6 files)

3. **HIGH: Station and InventoryItem Use In-Memory Storage**
   - `station-rules.manifest` line 162: `store Station in memory`
   - `inventory-rules.manifest` line 246: `store InventoryItem in memory`
   - Missing `StationPrismaStore` and `InventoryItemPrismaStore` implementations (TODO at line 870 of `prisma-store.ts`)
   - **DATA LOSS BUG**: Changes to these entities are lost between requests

4. **CRITICAL: CI/CD References Non-Existent Paths**
   - `.github/workflows/manifest-ci.yml` references `packages/kitchen-ops/manifests/` (doesn't exist)
   - `.github/MANIFEST_CI.md` has outdated paths
   - `.github/pull_request_template.md` has outdated paths

### Current State
- **Working**: 42 generated command routes, 45+ handwritten query routes, 180+ passing tests
- **Broken**: IR build pipeline produces single-manifest IR output; missing PrismaStore for Station/InventoryItem
- **Confusing**: Duplicate manifest sources, wrong config paths, documentation contradictions

### Root Cause Analysis
1. **Wrong Source Paths**: Config and scripts point to `manifest-sources` instead of `manifest-adapters`
2. **Compile Strategy Bug**: `--glob` pattern with single `--output` causes last-file-wins behavior
3. **Duplicate Sources**: `packages/manifest-sources/kitchen/` duplicates 3 manifests from `manifest-adapters`
4. **Missing Stores**: PrismaStore implementations not done for Station and InventoryItem
5. **Documentation Drift**: Multiple files reference old `kitchen-ops` structure

### Risk Assessment
- **Functionality**: CRITICAL - IR generation is broken; missing data persistence for Station/InventoryItem
- **Maintainability**: CRITICAL - Developers don't know which files to edit
- **Future Migration**: CRITICAL - Conflicts will block domain expansion

---

## Implementation Sequence

**IMPORTANT**: Complete Phase 0 BEFORE any other phases. The IR must be fixed first.

1. **Phase 0**: Fix IR Generation (CRITICAL PRE-REQUISITE)
2. **Phase 1**: Resolve Critical Conflicts - Path cleanup
3. **Phase 2**: Cleanup and Consistency - Remove deprecated paths
4. **Phase 3**: Enhanced Documentation - READMEs and guides
5. **Phase 4**: Bug Fixes & Optional Enhancements - PrismaStore, path case standardization

---

## Complete Directory Map

```
C:/projects/capsule-pro/
  manifest.config.yaml                    # COMPILE CONFIG (points to WRONG source)
  scripts/manifest/
    compile.mjs                           # Compile script (hardcodes WRONG path)
    generate.mjs                           # Generate routes from IR
    build.mjs                              # Compile + generate (hardcodes WRONG path)
    check.mjs                              # Validation script (has outdated paths)
  packages/
    manifest-sources/                      # DEPRECATED - DUPLICATE FILES
      kitchen/
        prep-list.manifest                 # DUPLICATE of prep-list-rules.manifest
        prep-task.manifest                 # DUPLICATE of prep-task-rules.manifest
        recipe.manifest                    # DUPLICATE of recipe-rules.manifest
      (NO README - package purpose unclear)
    manifest-adapters/                     # CANONICAL SOURCE (6 active files)
      manifests/                           # ACTUAL manifest location used by runtime
        prep-task-rules.manifest           # Used by runtime (234 lines)
        prep-list-rules.manifest           # Used by runtime (388 lines)
        recipe-rules.manifest              # Used by runtime (365 lines)
        menu-rules.manifest                # Used by runtime (NOT in sources)
        inventory-rules.manifest           # Used by runtime (NOT in sources)
        station-rules.manifest             # Used by runtime (NOT in sources)
      src/
        prisma-store.ts                    # PrismaStore adapter (line 870 has TODO)
        runtime-engine.ts                  # ManifestRuntimeEngine
        ir-contract.ts                     # IR enforcement utilities
        route-helpers.ts                   # Route generation helpers
        api-response.ts                    # HTTP response helpers
        event-import-runtime.ts            # Event import handling
        prep-list-autogeneration.ts        # Prep list business logic
        manifest-runtime.ts                # Runtime factory (6 factories)
        index.ts                           # Package exports
      (NO README - package purpose undocumented)
    manifest-ir/                           # Generated output (committed)
      ir/
        kitchen/
          kitchen.ir.json                  # Compiled IR (3,101 lines) - BROKEN
          kitchen.provenance.json          # Compilation metadata
      src/
        index.ts                           # IR accessor functions
      (NO README - generated nature undocumented)
  apps/
    api/
      lib/
        manifest-runtime.ts                # Runtime wrapper (uses adapters)
        manifest-response.ts               # Response helpers
        manifest/
          outbox.ts                        # Outbox pattern (referenced by check.mjs)
          telemetry.ts                     # Observability hooks
      app/
        api/
          kitchen/                         # Generated + handwritten routes
            stations/commands/*/route.ts   # 6 generated command routes
            prep-lists/commands/*/route.ts # 7 generated command routes
            prep-lists/items/commands/*/route.ts  # 5 generated command routes
            inventory/commands/*/route.ts  # 6 generated command routes
            dishes/commands/*/route.ts     # 2 generated command routes
            ingredients/commands/*/route.ts # 1 generated command route
            recipe-ingredients/commands/*/route.ts # 1 generated command route
            recipes/commands/*/route.ts    # 4 generated command routes
            recipes/versions/commands/*/route.ts # 1 generated command route
            menus/commands/*/route.ts      # 3 generated command routes
            prep-tasks/commands/*/route.ts # 6 generated command routes
            manifest/**                    # 7 manifest-based routes (handwritten)
            **/list/route.ts               # 45+ query routes (handwritten)
      __tests__/kitchen/                   # 16 test files
        manifest-*.test.ts                 # Unit + integration tests
        manifest-*-http.test.ts            # HTTP integration tests
        manifest-projection-*.test.ts      # Snapshot/golden tests
  docs/manifest/
    README.md                              # Overview (mostly accurate)
    structure.md                           # Contains CONTRADICTORY info
    FILES_TO_EDIT.md                       # Has correct paths now
    generation.md                          # Compile/generate commands (WRONG paths)
    INTEGRATION.md                         # Runtime architecture
    USAGE.md                               # Developer workflow (references root `ir`)
  .github/
    workflows/
      manifest-ci.yml                       # CI workflow (WRONG paths)
    MANIFEST_CI.md                          # Docs (WRONG paths)
    pull_request_template.md                # PR template (WRONG paths)
  archive/
    manifest-legacy-2026-02-10/            # Quarantined old structure
```

---

## Complete Conflict List

### CRITICAL Conflicts (MUST RESOLVE)

| # | Conflict | Location A | Location B | Impact |
|---|----------|------------|------------|--------|
| 1 | **IR Generation Last-File-Wins** | `manifest compile --glob ... --output single-file` | Multiple files compile to same output | Only last manifest ends up in IR |
| 2 | **manifest.config.yaml wrong source** | Points to `packages/manifest-sources/kitchen/*.manifest` (3 files) | Should point to `packages/manifest-adapters/manifests/*.manifest` (6 files) | Compile misses 3 manifests |
| 3 | **compile.mjs hardcodes wrong path** | Line 11: `"packages/manifest-sources/kitchen/*.manifest"` | Should be `"packages/manifest-adapters/manifests/*.manifest"` | Compile ignores config file |
| 4 | **build.mjs hardcodes wrong path** | Line 11: `"packages/manifest-sources/kitchen/*.manifest"` | Should be `"packages/manifest-adapters/manifests/*.manifest"` | Build uses wrong source |
| 5 | **check.mjs expects wrong lib path** | Lines 15-18: `apps/api/lib/manifest/*` | Actual: `apps/api/lib/manifest-*.ts` | Validation script fails |
| 6 | **check.mjs expects wrong source** | Line 11: `packages/manifest-sources/kitchen` | Should be `packages/manifest-adapters/manifests` | Checks wrong directory |
| 7 | **CI workflow wrong path** | `.github/workflows/manifest-ci.yml:7,59` | `packages/kitchen-ops/manifests` doesn't exist | CI will fail on PRs |
| 8 | **CI docs wrong paths** | `.github/MANIFEST_CI.md:30,41,146,236` | References `packages/kitchen-ops/manifests/` | Developers following docs will fail |
| 9 | **PR template wrong paths** | `.github/pull_request_template.md:20,29` | References `packages/kitchen-ops/manifests/` | PR instructions don't match reality |

### HIGH Conflicts (SHOULD RESOLVE)

| # | Conflict | Details | Impact |
|---|----------|---------|--------|
| 10 | **Duplicate manifest files** | `packages/manifest-sources/kitchen/*.manifest` (3 files) duplicate files in `manifest-adapters/manifests/*-rules.manifest` | Developers editing wrong files won't see changes in runtime |
| 11 | **structure.md contradiction** | Line 52 says `manifest-adapters/manifests` is source of truth, but tree shows `manifest-sources` as source | Documentation confusion |
| 12 | **generation.md wrong path** | Line 6 says source is `packages/manifest-sources/kitchen/*.manifest` | Misleads developers |
| 13 | **USAGE.md wrong IR path** | Lines 9-11 reference root `ir` instead of `packages/manifest-ir/ir/` | Developers can't find IR |
| 14 | **INTEGRATION.md wrong IR path** | Line 8 references root `ir` instead of `packages/manifest-ir/ir/kitchen/` | Documentation confusion |
| 15 | **Missing manifests in sources** | `packages/manifest-sources/` only has 3 files, `manifest-adapters/manifests/` has 6 files | Even if sources were canonical, they're incomplete |

### MEDIUM Conflicts (NICE TO RESOLVE)

| # | Conflict | Details | Impact |
|---|----------|---------|--------|
| 16 | **No package READMEs** | All 3 manifest packages lack README files | No local package documentation |
| 17 | **Legacy comments in source** | References to `kitchen-ops` in comments and route headers | Confuses developers reading code |
| 18 | **@manifest/runtime path case** | Mixed case: `file:../../../Manifest` vs `file:../../../manifest` | Creates two entries on case-sensitive systems |

---

## Canonical Location Table

| Artifact Type | Canonical Location | Ownership | Editable? | Notes |
|---------------|-------------------|------------|-----------|-------|
| **Manifest Source Files** | `packages/manifest-adapters/manifests/*.manifest` | Domain Engineer | YES | 6 files: prep-task-rules, prep-list-rules, recipe-rules, menu-rules, inventory-rules, station-rules |
| **Compiled IR** | `packages/manifest-ir/ir/kitchen/kitchen.ir.json` | Generated (committed) | NO | Should contain all 6 entities, currently broken |
| **IR Provenance** | `packages/manifest-ir/ir/kitchen/kitchen.provenance.json` | Generated (committed) | NO | Compilation metadata |
| **IR Accessors** | `packages/manifest-ir/src/index.ts` | Generated | NO | Typed accessor functions |
| **Runtime Factories** | `packages/manifest-adapters/src/manifest-runtime.ts` | Adapter Package | YES | 6 factory functions |
| **Prisma Store Adapter** | `packages/manifest-adapters/src/prisma-store.ts` | Adapter Package | YES | Database integration (line 870 has TODO for Station/InventoryItem) |
| **Runtime Engine** | `packages/manifest-adapters/src/runtime-engine.ts` | Adapter Package | YES | Core runtime logic |
| **Route Helpers** | `packages/manifest-adapters/src/route-helpers.ts` | Adapter Package | YES | Generation helpers |
| **Generated Command Routes** | `apps/api/app/api/kitchen/**/commands/*/route.ts` | Generated | NO | 42 files, auto-generated |
| **Handwritten Query Routes** | `apps/api/app/api/kitchen/**/list/route.ts` | App Integration | YES | 45+ files |
| **Manifest-Based Routes** | `apps/api/app/api/kitchen/manifest/**/route.ts` | App Integration | YES | 7 workflow routes |
| **API Runtime Wrapper** | `apps/api/lib/manifest-runtime.ts` | App Integration | YES | App-specific runtime setup |
| **Response Helpers** | `apps/api/lib/manifest-response.ts` | App Integration | YES | HTTP response utilities |
| **Tests** | `apps/api/__tests__/kitchen/*.test.ts` | App Integration | YES | 16 test files |
| **Compile Config** | `manifest.config.yaml` | Repo Root | YES | Points to source manifests |
| **Compile Script** | `scripts/manifest/compile.mjs` | Repo Root | YES | Compiles manifests to IR |
| **Generate Script** | `scripts/manifest/generate.mjs` | Repo Root | YES | Generates routes from IR |
| **Check Script** | `scripts/manifest/check.mjs` | Repo Root | YES | Validates structure |
| **DEPRECATED Sources** | `packages/manifest-sources/**` | NONE | NO | To be removed in Phase 2 |

---

## Repository Guardrails

### Rules to Prevent Conflicts Returning

1. **Single Source of Truth**: All manifest files MUST live in `packages/manifest-adapters/manifests/`
2. **Config Consistency**: `manifest.config.yaml` MUST match the actual source location
3. **Script Alignment**: All scripts MUST use paths from config, not hardcoded values
4. **Documentation Sync**: All documentation MUST reference the canonical location
5. **CI Accuracy**: CI workflows MUST reference paths that actually exist
6. **No Duplicate Sources**: Never create duplicate manifest files in multiple locations
7. **README Required**: Every package MUST have a README explaining its purpose
8. **IR Determinism**: Use entry manifest or separate IR files + merge, not multi-file-overwrite

### Pre-Commit Checklist (Recommended)

Before committing manifest changes:
- [ ] Edited files are in `packages/manifest-adapters/manifests/`
- [ ] Ran `pnpm manifest:compile` successfully
- [ ] Ran `pnpm manifest:generate` to update routes
- [ ] Ran `pnpm test` and all tests pass
- [ ] Updated documentation if adding new entities
- [ ] No files in `packages/manifest-sources/` were modified

### Adding New Domain Manifests

1. Create manifest file in `packages/manifest-adapters/manifests/{domain}-rules.manifest`
2. Add factory to `packages/manifest-adapters/src/manifest-runtime.ts`
3. Add PrismaStore support if needed in `packages/manifest-adapters/src/prisma-store.ts`
4. Run `pnpm manifest:compile` to update IR
5. Run `pnpm manifest:generate` to generate routes
6. Add tests in `apps/api/__tests__/kitchen/`
7. Update relevant documentation

### Editing Existing Manifests

1. Edit file in `packages/manifest-adapters/manifests/{name}-rules.manifest`
2. Run `pnpm manifest:compile` to update IR
3. Run `pnpm manifest:generate` to regenerate routes
4. Run `pnpm test` to verify changes

### Files to NEVER Edit

- `packages/manifest-ir/ir/**/*` (generated IR)
- `apps/api/app/api/kitchen/**/commands/*/route.ts` (generated routes)
- `packages/manifest-sources/**/*` (deprecated location)
- `node_modules/@manifest/runtime/**` (external dependency)

---

## Updated Implementation Plan

### Phase 0: Fix IR Generation (CRITICAL PRE-REQUISITE)

**Priority**: CRITICAL | **Estimated Time**: 45-90 minutes | **Risk**: MEDIUM

**Status**: NOT STARTED | **Verified**: 2026-02-11

#### Problem Summary

The manifest compile command has a **last-file-wins bug**:
- When running `pnpm manifest:compile` with the correct source glob (`packages/manifest-adapters/manifests/*.manifest`), the CLI finds 6 files
- Each file compiles to the same output path: `packages/manifest-ir/ir/kitchen/kitchen.ir.json`
- The result is a single-manifest IR (only `inventory-rules.manifest` content ends up in the committed IR)
- The current committed `kitchen.ir.json` contains only `InventoryItem` entity

**Evidence**:
```bash
$ pnpm exec manifest compile --glob "packages/manifest-adapters/manifests/*.manifest" --output /tmp/test.ir.json
i Found 6 file(s)
√ Compiled packages\manifest-adapters\manifests\station-rules.manifest → /tmp/test.ir.json
√ Compiled packages\manifest-adapters\manifests\recipe-rules.manifest → /tmp/test.ir.json
√ Compiled packages\manifest-adapters\manifests\prep-task-rules.manifest → /tmp/test.ir.json
√ Compiled packages\manifest-adapters\manifests\prep-list-rules.manifest → /tmp/test.ir.json
√ Compiled packages\manifest-adapters\manifests\menu-rules.manifest → /tmp/test.ir.json
√ Compiled packages\manifest-adapters\manifests\inventory-rules.manifest → /tmp/test.ir.json
```

#### Solution Approach

Create a **unified entry manifest** that imports all domain manifests, or implement a merge strategy. The recommended approach is:

1. Create `packages/manifest-adapters/manifests/kitchen-entry.manifest` that imports all 6 domain manifests
2. Compile the entry manifest to produce the unified `kitchen.ir.json`

#### Actions

1. **Verify Current IR State** (5 minutes)
   ```bash
   # Check current entity count in committed IR
   node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('packages/manifest-ir/ir/kitchen/kitchen.ir.json','utf8'));console.log('Entities:', (j.entities||[]).map(e=>e.name).join(', '))"
   # Expected after fix: InventoryItem, Menu, PrepList, PrepTask, Recipe, Station
   # Current: InventoryItem (only one entity)
   ```

2. **Create Entry Manifest** (10 minutes)
   Create `packages/manifest-adapters/manifests/kitchen-entry.manifest`:
   ```manifest
   // Kitchen Domain Entry Point
   // Imports all kitchen domain manifests

   import "./prep-task-rules.manifest"
   import "./prep-list-rules.manifest"
   import "./recipe-rules.manifest"
   import "./menu-rules.manifest"
   import "./inventory-rules.manifest"
   import "./station-rules.manifest"
   ```

3. **Update `manifest.config.yaml`** (2 minutes)
   ```yaml
   $schema: https://manifest.dev/config.schema.json
   # Canonical manifest sources and compiled IR artifact for kitchen domain.
   src: "packages/manifest-adapters/manifests/kitchen-entry.manifest"
   output: "packages/manifest-ir/ir/kitchen/kitchen.ir.json"
   projections:
     nextjs:
       output: apps/api/app/api/kitchen
   ```

4. **Update `scripts/manifest/compile.mjs`** (5 minutes)
   ```javascript
   const defaultArgs = [
     "exec",
     "manifest",
     "compile",
     "--input",  // Changed from --glob
     "packages/manifest-adapters/manifests/kitchen-entry.manifest",  // Changed from glob pattern
     "--output",
     "packages/manifest-ir/ir/kitchen/kitchen.ir.json",
     "--diagnostics",
   ];
   ```

5. **Update `scripts/manifest/build.mjs`** (5 minutes)
   ```javascript
   const defaultArgs = [
     "exec",
     "manifest",
     "build",
     "--input",  // Changed from --glob
     "packages/manifest-adapters/manifests/kitchen-entry.manifest",  // Changed from glob pattern
     "--ir-output",
     "packages/manifest-ir/ir/kitchen/kitchen.ir.json",
     "--provenance-output",
     "packages/manifest-ir/ir/kitchen/kitchen.provenance.json",
     "--code-output",
     "apps/api/app/api/kitchen",
     "--projection",
     "nextjs",
     "--surface",
     "route",
   ];
   ```

6. **Regenerate IR** (5 minutes)
   ```bash
   pnpm manifest:compile
   ```

7. **Verify IR Contains All 6 Entities** (5 minutes)
   ```bash
   # Check entity names in kitchen IR
   node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('packages/manifest-ir/ir/kitchen/kitchen.ir.json','utf8'));console.log((j.entities||[]).map(e=>e.name))"
   # Expected output:
   # [ 'InventoryItem', 'Menu', 'PrepList', 'PrepTask', 'Recipe', 'Station' ]
   ```

8. **Verify Provenance Updated** (2 minutes)
   ```bash
   cat packages/manifest-ir/ir/kitchen/kitchen.provenance.json
   # Verify: contentHash, irHash, compiledAt have new values
   ```

9. **Run Full Test Suite** (10 minutes)
   ```bash
   pnpm test
   # Expected: All 180+ tests still pass
   ```

10. **Verify Generated Routes** (5 minutes)
    ```bash
    # Count command route directories
    find apps/api/app/api/kitchen -type d -name commands | wc -l
    # Expected: 10 command directories (prep-tasks, stations, inventory, etc.)
    ```

#### Validation Checklist

- [ ] `kitchen-entry.manifest` created and imports all 6 domain manifests
- [ ] `manifest.config.yaml` points to entry manifest
- [ ] `compile.mjs` uses entry manifest with `--input`
- [ ] `build.mjs` uses entry manifest with `--input`
- [ ] `pnpm manifest:compile` succeeds without errors
- [ ] `kitchen.ir.json` contains all 6 entity definitions
- [ ] `kitchen.ir.json` contains all 42 commands across 6 domains
- [ ] `kitchen.provenance.json` has new compilation timestamp
- [ ] All 180+ tests pass
- [ ] Generated routes exist for all 6 domains

#### Rollback Plan

If issues occur after IR regeneration:
1. Revert `manifest.config.yaml` to previous version
2. Revert `compile.mjs` and `build.mjs` to previous versions
3. Delete `kitchen-entry.manifest`
4. Restore `kitchen.ir.json` and `kitchen.provenance.json` from git
5. Investigate which manifest file causes the issue
6. Fix the problematic manifest and retry

**Owner**: Senior Engineer
**Dependencies**: NONE (must be done first)
**Blocks**: Phase 1 (consolidate manifest sources)

---

### Phase 1: Resolve Critical Conflicts (MUST DO)

**Priority**: CRITICAL | **Estimated Time**: 2-3 hours | **Risk**: LOW (tests already pass)

#### 1.1 Consolidate Manifest Sources

**Problem**: Duplicate manifest files in two locations, with tooling pointing to incomplete set

**Actions**:
1. Delete `packages/manifest-sources/kitchen/` directory (3 duplicate files)
   - `prep-list.manifest` is identical to `prep-list-rules.manifest`
   - `prep-task.manifest` is identical to `prep-task-rules.manifest`
   - `recipe.manifest` is identical to `recipe-rules.manifest`
   - These are exact duplicates (verified line-by-line)
   - The adapters location has 6 files; sources only has 3
   - Runtime uses adapters location exclusively

2. Update `manifest.config.yaml`:
   ```yaml
   src: "packages/manifest-adapters/manifests/kitchen-entry.manifest"
   output: "packages/manifest-ir/ir/kitchen/kitchen.ir.json"
   projections:
     nextjs:
       output: apps/api/app/api/kitchen
   ```

3. Run `pnpm manifest:compile` to verify entry manifest is found and compiled

4. Run full test suite to ensure no breakage

**Validation**:
- [ ] `pnpm manifest:compile` succeeds
- [ ] `pnpm manifest:validate` passes
- [ ] All 180+ tests still pass
- [ ] IR contains all 6 domains (PrepTask, PrepList, Recipe, Menu, Inventory, Station)

**Owner**: Senior Engineer

#### 1.2 Fix Documentation Paths

**Problem**: Multiple documentation files reference non-existent or deprecated paths

**Actions**:
1. Update `.github/MANIFEST_CI.md`:
   - Line 30: Change `packages/kitchen-ops/manifests/` to `packages/manifest-adapters/manifests/`
   - Line 41: Change example path
   - Line 146: Change tree diagram
   - Line 236: Change loop path
   - Update all instances of `packages/kitchen-ops/manifests/`

2. Update `.github/pull_request_template.md`:
   - Line 20: Change reference from `packages/kitchen-ops/manifests/`
   - Line 29: Change example path in validation instructions

3. Update `.github/workflows/manifest-ci.yml`:
   - Line 7: Change trigger path from `packages/kitchen-ops/manifests/**` to `packages/manifest-adapters/manifests/**`
   - Line 59: Change `MANIFEST_DIR` to `packages/manifest-adapters/manifests`
   - Line 70: Update compile command path reference

4. Update `docs/manifest/structure.md`:
   - Clarify that `packages/manifest-sources/` is deprecated
   - Emphasize `packages/manifest-adapters/manifests/` as canonical source
   - Remove or update contradictory tree diagram
   - Add warning banner about deprecated location

5. Update `docs/manifest/generation.md`:
   - Line 6: Change source path to entry manifest
   - Line 38: Update edit instruction path

6. Update `docs/manifest/INTEGRATION.md`:
   - Line 8: Change IR artifact path from root `ir` to `packages/manifest-ir/ir/kitchen/`
   - Line 27: Update runtime path reference
   - Line 30: Update prisma-store.ts path reference
   - Line 33: Update api-response.ts path reference

7. Update `docs/manifest/USAGE.md`:
   - Lines 9-11: Change IR artifact path from root `ir` to `packages/manifest-ir/ir/kitchen/`
   - Line 45: Update runtime source path reference
   - Line 46: Update prisma-store.ts path reference

8. Update `docs/manifest/FILES_TO_EDIT.md`:
   - Line 14: Clarify IR location as `packages/manifest-ir/ir/` not root `ir`
   - Ensure all paths use full canonical locations

**Validation**:
- [ ] Manual review of all changed documentation
- [ ] All paths verified to exist
- [ ] No remaining references to `packages/kitchen-ops/`
- [ ] No remaining references to `packages/manifest-sources/` (except deprecation notices)
- [ ] IR path references consistently point to `packages/manifest-ir/ir/`

**Owner**: Senior Engineer

#### 1.3 Fix Validation Script

**Problem**: `scripts/manifest/check.mjs` expects wrong library and source paths

**Actions**:
1. Update `scripts/manifest/check.mjs`:
   - Lines 11: Change `packages/manifest-sources/kitchen` to `packages/manifest-adapters/manifests`
   - Lines 15-18: Change `apps/api/lib/manifest/*` to `apps/api/lib/manifest-*.ts`
   - Lines 36-44: Update directory checks to use correct path
   - Add check for entry manifest file

2. Test with `pnpm manifest:check`

**Validation**:
- [ ] `pnpm manifest:check` passes without errors
- [ ] All file existence checks succeed

**Owner**: Senior Engineer

#### 1.4 Add Package READMEs

**Problem**: No documentation in manifest packages, making purpose unclear

**Actions**:
1. Create `packages/manifest-adapters/README.md`:
   ```markdown
   # Manifest Adapters Package

   This package contains:
   - **Manifest Sources**: `manifests/` directory with domain rule definitions
   - **Runtime Adapters**: Runtime factories and database integration
   - **Route Helpers**: Utilities for generating API routes

   ## Structure

   - `manifests/`: Canonical source for all domain manifest files
     - `kitchen-entry.manifest`: Entry point that imports all domain manifests
     - `*-rules.manifest`: Individual domain manifests (6 files)
   - `src/`: Runtime implementations and adapters
     - `manifest-runtime.ts`: Factory functions for each domain
     - `runtime-engine.ts`: Core runtime execution engine
     - `prisma-store.ts`: Database store adapter
     - `route-helpers.ts`: Route generation utilities

   ## Usage

   This package is used by `apps/api` to generate and execute manifest-based commands.

   DO NOT edit generated routes in `apps/api/app/api/kitchen/**/commands/*/route.ts`.
   Edit manifest source files in `manifests/` instead.
   ```

2. Create `packages/manifest-ir/README.md`:
   ```markdown
   # Manifest IR Package

   This package contains the compiled Intermediate Representation (IR) for all domain manifests.

   ## Structure

   - `ir/kitchen/`: Compiled IR artifacts (generated, committed)
     - `kitchen.ir.json`: Main IR file (contains all 6 kitchen domain entities)
     - `kitchen.provenance.json`: Compilation metadata
   - `src/index.ts`: Typed accessor functions for reading IR

   ## Important

   - The `ir/` directory contents are GENERATED OUTPUT
   - Do NOT hand-edit these files
   - Regenerate by running `pnpm manifest:compile`
   - Changes to manifest files will automatically update IR
   ```

3. Create `packages/manifest-sources/README.md`:
   ```markdown
   # DEPRECATED - Manifest Sources Package

   **This package is deprecated and should not be used.**

   The canonical location for manifest files is now:
   - `packages/manifest-adapters/manifests/`

   ## Migration

   If you were directed to edit files in this package, please update your workflow:
   1. Navigate to `packages/manifest-adapters/manifests/`
   2. Edit the corresponding `-rules.manifest` file
   3. Run `pnpm manifest:compile` to update IR
   4. Run `pnpm manifest:generate` to update routes

   This directory will be removed in Phase 2 of the cleanup plan.
   ```

**Validation**:
- [ ] READMEs are clear and accurate
- [ ] READMEs are linked from main docs
- [ ] New developers can understand system from READMEs alone

**Owner**: Senior Engineer

### Phase 2: Cleanup and Consistency (SHOULD DO)

**Priority**: HIGH | **Estimated Time**: 1-2 hours | **Risk**: LOW

#### 2.1 Remove Deprecated Directory

**Actions**:
1. After Phase 1 completes, remove entire `packages/manifest-sources/` directory
2. Update all documentation to remove deprecation notices
3. Verify CI/CD doesn't reference this path

**Validation**:
- [ ] `pnpm build` succeeds
- [ ] CI/CD passes
- [ ] No references to `manifest-sources` remain

**Owner**: Senior Engineer

#### 2.2 Verify All References Updated

**Actions**:
1. Final grep search for remaining references:
   - `packages/manifest-sources`
   - `packages/kitchen-ops`
   - `apps/api/lib/manifest/` (should be `apps/api/lib/manifest-*.ts`)

2. Additional file locations to check:
   - `apps/api/lib/manifest-response.ts` - Check for comments referencing old paths
   - `packages/manifest-adapters/src/prep-list-autogeneration.ts` - Line 7 comment
   - `packages/manifest-adapters/dist/*` - Compiled JavaScript files
   - `apps/api/app/api/events/documents/parse/route.ts` - Check for old path references
   - `apps/api/app/api/kitchen/manifest/recipes/route.ts` - Check for old path comments
   - `apps/api/app/api/kitchen/manifest/prep-lists/route.ts` - Check for old path comments
   - `other-app/app/api/kitchen/manifest/recipes/route.ts` - Check for old path references

3. Update any remaining references found

4. Run full validation suite

**Validation**:
- [ ] Grep shows zero legacy references (except archive/)
- [ ] All documentation internally consistent
- [ ] No comments or code reference old paths

**Owner**: Senior Engineer

#### 2.3 Final CI/CD Verification

**Actions**:
1. Trigger manual CI run or create test PR
2. Verify all jobs pass:
   - manifest-validate
   - manifest-codegen-check
   - manifest-typescript-check
   - manifest-tests
3. Review logs for any path-related warnings

**Validation**:
- [ ] All CI jobs pass
- [ ] No path-related errors or warnings
- [ ] Test coverage remains at 180+ tests

**Owner**: Senior Engineer

### Phase 3: Enhanced Documentation (NICE TO HAVE)

**Priority**: MEDIUM | **Estimated Time**: 1 hour | **Risk**: NONE

#### 3.1 Expand Package Documentation

**Actions**:
1. Expand `packages/manifest-adapters/README.md` with:
   - All exports documented
   - PrismaStore usage examples
   - RuntimeEngine usage examples
   - Troubleshooting common issues

2. Expand `packages/manifest-ir/README.md` with:
   - IR structure explanation
   - Provenance format
   - How to use accessor functions
   - Common IR inspection tasks

3. Create `docs/manifest/TROUBLESHOOTING.md`:
   - Common developer errors
   - How to diagnose compile issues
   - How to diagnose generation issues
   - When to regenerate vs hand-fix

**Validation**:
- [ ] Documentation is comprehensive
- [ ] New team members can understand from READMEs alone
- [ ] Troubleshooting guide covers common issues

**Owner**: Implementation Specialist

### Phase 4: Bug Fixes & Optional Enhancements (BACKLOG)

**Priority**: VARIES | **Estimated Time**: 3-5 hours | **Risk**: MEDIUM

#### 4.1 Implement Missing PrismaStore Classes (HIGH)

**Priority**: HIGH | **Estimated Time**: 2-3 hours | **Risk**: MEDIUM

**DISCOVERED**: 2026-02-11 via comprehensive codebase exploration

**Problem**: Line 870 of `packages/manifest-adapters/src/prisma-store.ts` contains TODO:
```typescript
// TODO: Add StationPrismaStore and InventoryItemPrismaStore as needed
```

**Impact**:
- Station and InventoryItem entities currently use **in-memory storage**
- **DATA LOSS BUG**: Changes to these entities are lost between requests
- Manifest files specify `store Station in memory` and `store InventoryItem in memory`
- This is a production data persistence issue

**Actions**:
1. Create `StationPrismaStore` class (follow pattern of existing stores like `PrepTaskPrismaStore`)
   - Implement `read()`, `write()`, `delete()` methods
   - Map Prisma schema fields to Manifest entity
   - Handle Station-specific fields (capacitySimultaneousTasks, equipmentList, etc.)

2. Create `InventoryItemPrismaStore` class
   - Implement CRUD methods
   - Map Prisma schema fields to Manifest entity
   - Handle InventoryItem-specific fields (quantityOnHand, quantityReserved, etc.)

3. Add factory cases in `getPrismaStore()` function
   ```typescript
   case "Station":
     return new StationPrismaStore(prisma, tenantId) as Store<StationInstance>;
   case "InventoryItem":
     return new InventoryItemPrismaStore(prisma, tenantId) as Store<InventoryItemInstance>;
   ```

4. Update manifest files to use Prisma storage:
   - `station-rules.manifest` line 162: Change `store Station in memory` to `store Station in prisma`
   - `inventory-rules.manifest` line 246: Change `store InventoryItem in memory` to `store InventoryItem in prisma`

5. Write tests for both stores
   - Unit tests for CRUD operations
   - Integration tests for manifest command execution
   - Verify data persistence across requests

6. Remove TODO comment from line 870

**Validation**:
- [ ] Station and InventoryItem commands persist to database
- [ ] Tests for both entities pass
- [ ] No in-memory fallback behavior
- [ ] Data survives server restart

**Owner**: Senior Engineer

#### 4.2 Standardize @manifest/runtime Path Case (MEDIUM)

**Priority**: MEDIUM | **Estimated Time**: 15 minutes | **Risk**: LOW

**DISCOVERED**: 2026-02-11 via comprehensive codebase exploration

**Problem**: Two different casings for the manifest runtime path:
- `apps/api/package.json`: `"file:../../../Manifest"` (capital M)
- `apps/app/package.json`: `"file:../../../Manifest"` (capital M)
- `packages/manifest-adapters/package.json`: `"file:../../../manifest"` (lowercase m)

**Impact**:
- On case-sensitive filesystems (Linux, macOS), this creates **TWO separate dependency entries**
- `pnpm-lock.yaml` shows both paths registered separately
- Potential for version inconsistencies or double-linking
- May cause subtle bugs on different platforms

**Actions**:
1. Choose canonical case: **lowercase** (`"file:../../../manifest"`)
2. Update `apps/api/package.json`:
   ```json
   "@manifest/runtime": "file:../../../manifest"
   ```
3. Update `apps/app/package.json`:
   ```json
   "@manifest/runtime": "file:../../../manifest"
   ```
4. Run `pnpm install` to update lockfile
5. Verify only one `@manifest/runtime` entry in `pnpm-lock.yaml`

**Validation**:
- [ ] Only one `@manifest/runtime` entry in `pnpm-lock.yaml`
- [ ] All builds pass
- [ ] No runtime errors related to manifest imports

**Owner**: Implementation Specialist

#### 4.3 Add Schema Registry Validation (LOW)

**Priority**: LOW | **Estimated Time**: 30 minutes | **Risk**: LOW

**Actions**:
1. Verify `packages/manifest-ir/schema-registry-v2.txt` is up to date
2. Add schema validation to CI/CD if not present
3. Document schema update process

**Owner**: Senior Engineer

#### 4.4 Improve Developer Experience (LOW)

**Priority**: LOW | **Estimated Time**: 1-2 hours | **Risk**: LOW

**Actions**:
1. Add VS Code snippets for manifest editing
2. Add pre-commit hook for manifest validation
3. Add manifest compilation to pre-push hook

**Owner**: Implementation Specialist

#### 4.5 Test Coverage Expansion (LOW)

**Priority**: LOW | **Estimated Time**: 2-3 hours | **Risk**: LOW

**Actions**:
1. Add E2E tests for full command flow
2. Add multi-tenant isolation tests
3. Add security/access control tests

**Owner**: QA Engineer

---

## Definition of Done

### Phase 0 Complete When:
- [ ] `kitchen-entry.manifest` created and imports all 6 domain manifests
- [ ] `manifest.config.yaml` points to entry manifest
- [ ] `compile.mjs` uses entry manifest with `--input`
- [ ] `build.mjs` uses entry manifest with `--input`
- [ ] `pnpm manifest:compile` succeeds and finds all 6 manifests
- [ ] `kitchen.ir.json` contains all 6 entity definitions (InventoryItem, Menu, PrepList, PrepTask, Recipe, Station)
- [ ] `kitchen.ir.json` contains all 42 commands across 6 domains
- [ ] `kitchen.provenance.json` has new compilation timestamp
- [ ] All 180+ tests pass after IR regeneration
- [ ] Generated routes exist for all 6 domains

### Phase 1 Complete When:
- [ ] `packages/manifest-sources/kitchen/` directory removed (all 3 duplicate files)
- [ ] `manifest.config.yaml` points to entry manifest (from Phase 0)
- [ ] `compile.mjs` uses entry manifest (from Phase 0)
- [ ] `build.mjs` uses entry manifest (from Phase 0)
- [ ] `pnpm manifest:compile` succeeds (from Phase 0)
- [ ] `pnpm manifest:validate` succeeds
- [ ] All 180+ tests pass (from Phase 0)
- [ ] `.github/MANIFEST_CI.md` has correct paths (no `kitchen-ops` references)
- [ ] `.github/pull_request_template.md` has correct paths
- [ ] `.github/workflows/manifest-ci.yml` has correct paths
- [ ] `docs/manifest/structure.md` reflects canonical structure
- [ ] `docs/manifest/generation.md` has correct paths
- [ ] `docs/manifest/INTEGRATION.md` has correct IR paths
- [ ] `docs/manifest/USAGE.md` has correct IR paths
- [ ] `docs/manifest/FILES_TO_EDIT.md` has correct paths
- [ ] `packages/manifest-adapters/README.md` exists
- [ ] `packages/manifest-ir/README.md` exists
- [ ] `packages/manifest-sources/README.md` exists (with deprecation notice)
- [ ] `scripts/manifest/check.mjs` has correct lib paths

### Phase 2 Complete When:
- [ ] No references to `packages/manifest-sources/` in codebase (except historical)
- [ ] No references to `packages/kitchen-ops` in codebase
- [ ] Additional legacy references in source files cleaned up
- [ ] `packages/manifest-sources/` directory completely removed
- [ ] CI/CD workflow passes with updated paths
- [ ] All documentation internally consistent
- [ ] Grep for legacy paths returns zero results

### Phase 3 Complete When:
- [ ] Package READMEs are comprehensive
- [ ] Troubleshooting guide exists
- [ ] New developer can understand system from READMEs alone

### Phase 4 Complete When:
- [ ] StationPrismaStore and InventoryItemPrismaStore implemented (HIGH)
- [ ] Station and InventoryItem entities use Prisma storage (HIGH)
- [ ] @manifest/runtime path case standardized (MEDIUM)
- [ ] Only one @manifest/runtime entry in pnpm-lock.yaml (MEDIUM)
- [ ] Selected enhancements implemented
- [ ] Team agrees on prioritization of remaining items

---

## Risk Mitigation

### Low Risk Actions
- Removing duplicate manifest files (runtime doesn't use them)
- Updating documentation (no code changes)
- Adding READMEs (no functional changes)

### Medium Risk Actions
- Updating manifest.config.yaml (may affect tooling)
- Fixing validation script (need to verify all use cases)
- Updating CI workflow (must test in actual CI environment)
- Implementing PrismaStore for Station/InventoryItem (requires testing)

### High Risk Actions
- Fixing IR generation (core change to build process)

### Mitigation Strategy
1. All changes made in a feature branch: `feature/manifest-integration-cleanup`
2. Full test suite run after each phase
3. Incremental commits per phase for easy rollback
4. Pair programming review for critical path changes
5. Manual CI run verification before merging

### Rollback Plan
If issues arise after merge:
1. Identify which phase introduced the issue
2. Revert that phase's commit(s)
3. Investigate root cause
4. Create fix with additional testing
5. Re-apply phase with fix

---

## Technical Notes

### Duplicate File Analysis

The following files were verified as EXACT duplicates (line-by-line comparison):

| Source File | Adapter File | Status |
|-------------|---------------|---------|
| `packages/manifest-sources/kitchen/prep-list.manifest` | `packages/manifest-adapters/manifests/prep-list-rules.manifest` | IDENTICAL (388 lines) |
| `packages/manifest-sources/kitchen/prep-task.manifest` | `packages/manifest-adapters/manifests/prep-task-rules.manifest` | IDENTICAL (234 lines) |
| `packages/manifest-sources/kitchen/recipe.manifest` | `packages/manifest-adapters/manifests/recipe-rules.manifest` | IDENTICAL (365 lines) |

**Additional files only in adapters:**
- `menu-rules.manifest` (not in sources)
- `inventory-rules.manifest` (not in sources)
- `station-rules.manifest` (not in sources)

This confirms that `manifest-adapters/manifests/` is the complete, canonical source.

### Why System Works Despite Conflicts

The system continues to work because:
1. The **runtime** (`apps/api/lib/manifest-runtime.ts`) reads source manifests from `packages/manifest-adapters/manifests/*.manifest` and compiles IR at runtime via `compileToIR`.
2. Many **tests** compile manifest source directly with `compileToIR` from adapters manifests, bypassing committed `kitchen.ir.json`.
3. **Generated routes** are already committed and call `createManifestRuntime`, so runtime behavior can remain functional even if committed IR is stale.
4. CI/workflows currently do not enforce `pnpm manifest:compile` for the adapters manifests path, so IR drift can survive while tests/typecheck pass.

This is why tests pass and the application functions, but developers are confused about where to make changes.

### Confirmed Missing Implementations

Based on comprehensive codebase search, these are **confirmed missing** (not assumed):

1. **Journal Entry Implementation** (Accounting)
   - File: `apps/api/app/api/accounting/accounts/[id]/route.ts`
   - Line 83: `// TODO: Implement when JournalEntry model exists`
   - Status: Placeholder implementation, function returns false

2. **StationPrismaStore** (Kitchen)
   - File: `packages/manifest-adapters/src/prisma-store.ts`
   - Line 870: `// TODO: Add StationPrismaStore and InventoryItemPrismaStore as needed`
   - Status: Not implemented, Station uses in-memory storage

3. **InventoryItemPrismaStore** (Kitchen)
   - File: `packages/manifest-adapters/src/prisma-store.ts`
   - Line 870: `// TODO: Add StationPrismaStore and InventoryItemPrismaStore as needed`
   - Status: Not implemented, InventoryItem uses in-memory storage

---

## References

- [Manifest Official Spec](../manifest-official)
- [Capsule-Pro Manifest Integration](./docs/manifest/README.md)
- [Current Structure Documentation](./docs/manifest/structure.md)
- [File Editing Guidelines](./docs/manifest/FILES_TO_EDIT.md)
- [Generation Workflow](./docs/manifest/generation.md)
- [CI/CD Documentation](../.github/MANIFEST_CI.md)

---

## Change History

| Date | Phase | Change | Author |
|------|-------|--------|--------|
| 2026-02-11 | All | Initial comprehensive plan from synthesis of codebase exploration | Senior Engineer |

---

## Next Steps

1. **Review this plan** with team and stakeholders
2. **Create feature branch**: `feature/manifest-integration-cleanup`
3. **Execute Phase 0** (Fix IR generation determinism + entry manifest) before any cleanup work
4. **Execute Phase 1.1** (Consolidate Manifest Sources)
5. **Execute Phase 1.2** (Fix Documentation Paths)
6. **Execute Phase 1.3** (Fix Validation Script)
7. **Execute Phase 1.4** (Add Package READMEs)
8. **Validate after each sub-phase**
9. **Merge Phase 1** before starting Phase 2
10. **Track progress** in project management system

---

## Appendix: Quick Reference Command Summary

```bash
# Compile manifests (after updating config and compile.mjs)
pnpm manifest:compile

# Generate routes from IR
pnpm manifest:generate

# One-step compile + generate
pnpm manifest:build

# Validate structure
pnpm manifest:check

# Full validation with CLI
pnpm manifest:validate

# Run all tests
pnpm test

# Type check
pnpm check

# Format and lint
pnpm format
pnpm lint
```
