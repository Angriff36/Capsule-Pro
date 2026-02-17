#!/usr/bin/env node

/**
 * Sync Manifest Runtime from upstream source.
 *
 * Copies source files, dist artifacts, and package metadata from the
 * canonical @manifest/runtime repo at C:/projects/manifest into the
 * vendored copy at packages/manifest-runtime/ in this monorepo.
 *
 * What it syncs:
 *   - src/manifest/**          (source files — lexer, parser, IR, runtime, projections)
 *   - dist/manifest/**         (pre-built JS/DTS — committed because this package has no build step here)
 *   - packages/cli/**          (CLI tool)
 *   - vitest.config.ts         (test config)
 *   - test-setup.ts            (test setup)
 *   - package.json             (version + exports — merged, preserving local overrides)
 *
 * What it does NOT sync:
 *   - node_modules, .git, docs, scripts, specs, tools, generated, .bolt, .claude, etc.
 *   - Vite app files (index.html, vite.config.ts, tailwind, postcss)
 *   - Root config files (eslint, tsconfig.app, tsconfig.node)
 *
 * Usage:
 *   node scripts/sync-manifest-runtime.mjs                    # default source
 *   node scripts/sync-manifest-runtime.mjs C:/other/manifest  # custom source
 *   node scripts/sync-manifest-runtime.mjs --dry-run          # preview only
 *   node scripts/sync-manifest-runtime.mjs --rebuild-dist     # also rebuild dist after sync
 *
 * After syncing, you should:
 *   1. Review the diff:  git diff packages/manifest-runtime/
 *   2. Run tests:        cd apps/api && pnpm test -- --run manifest
 *   3. Rebuild dist if source changed:  cd packages/manifest-runtime && pnpm build:lib
 *      (or pass --rebuild-dist to this script)
 */

import { execSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_SOURCE = "C:/projects/manifest";
const TARGET = resolve(process.cwd(), "packages/manifest-runtime");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const REBUILD_DIST = args.includes("--rebuild-dist");
const SOURCE = resolve(args.find((a) => !a.startsWith("--")) || DEFAULT_SOURCE);

/**
 * Directories/files to sync from source root into target root.
 * Each entry is { src, dst?, transform? }.
 *   - src: path relative to SOURCE
 *   - dst: path relative to TARGET (defaults to src)
 *   - transform: optional function to transform content
 */
const SYNC_TREE = [
  // Core source
  { src: "src/manifest", dst: "src/manifest" },
  // CLI
  { src: "packages/cli", dst: "packages/cli" },
  // Dist (pre-built)
  { src: "dist/manifest", dst: "dist/manifest" },
  // Test config
  { src: "vitest.config.ts" },
  { src: "test-setup.ts" },
  // Lib tsconfig (used for build:lib)
  { src: "tsconfig.lib.json" },
];

/**
 * Patterns to EXCLUDE from sync (relative to the sync root).
 * Matched against the relative path within each sync entry.
 */
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.turbo/,
  /coverage/,
  /\.DS_Store/,
  // Benchmark files — not needed in consumer
  /\.bench\.ts$/,
  // Vite app dist (index.html, assets/) — not the lib dist
  /^dist\/index\.html$/,
  /^dist\/assets\//,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shouldExclude(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
  return EXCLUDE_PATTERNS.some((re) => re.test(normalized));
}

function walkDir(dir) {
  const results = [];
  if (!existsSync(dir)) {
    return results;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function filesAreIdentical(a, b) {
  if (!(existsSync(a) && existsSync(b))) {
    return false;
  }
  const bufA = readFileSync(a);
  const bufB = readFileSync(b);
  return bufA.equals(bufB);
}

// ---------------------------------------------------------------------------
// Package.json merge
// ---------------------------------------------------------------------------

/**
 * Merge upstream package.json into local, preserving local-only fields.
 *
 * Upstream wins for: version, exports, bin, files, main, types, type
 * Local wins for:    private, dependencies, devDependencies, scripts (merged)
 */
function mergePackageJson(sourcePkg, targetPkg) {
  const merged = { ...targetPkg };

  // Upstream wins — these define the public API
  merged.name = sourcePkg.name;
  merged.version = sourcePkg.version;
  merged.type = sourcePkg.type;
  merged.main = sourcePkg.main;
  merged.types = sourcePkg.types;
  merged.exports = sourcePkg.exports;

  if (sourcePkg.bin) {
    merged.bin = sourcePkg.bin;
  }
  if (sourcePkg.files) {
    merged.files = sourcePkg.files;
  }

  // Local wins — monorepo-specific
  // Keep private: true (this is a workspace package, not published)
  // Keep local dependencies (workspace:* refs)
  // Keep local devDependencies

  // Merge scripts: upstream adds new scripts, local overrides win for existing keys
  // This ensures local overrides (e.g. build: "echo 'pre-built'") survive syncs.
  if (sourcePkg.scripts) {
    merged.scripts = { ...sourcePkg.scripts, ...targetPkg.scripts };
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log("[sync-manifest-runtime] Manifest Runtime Sync");
  console.log(`  Source: ${SOURCE}`);
  console.log(`  Target: ${TARGET}`);
  console.log(`  Mode:   ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log("");

  // Validate source exists
  if (!existsSync(SOURCE)) {
    console.error(`[sync-manifest-runtime] ERROR: Source not found: ${SOURCE}`);
    process.exit(1);
  }
  if (!existsSync(join(SOURCE, "package.json"))) {
    console.error(
      "[sync-manifest-runtime] ERROR: No package.json in source — is this the right directory?"
    );
    process.exit(1);
  }

  // Read source version
  const sourcePkg = JSON.parse(
    readFileSync(join(SOURCE, "package.json"), "utf-8")
  );
  const targetPkgPath = join(TARGET, "package.json");
  const targetPkg = existsSync(targetPkgPath)
    ? JSON.parse(readFileSync(targetPkgPath, "utf-8"))
    : {};

  console.log(`  Source version: ${sourcePkg.version} (${sourcePkg.name})`);
  console.log(`  Target version: ${targetPkg.version || "unknown"}`);
  console.log("");

  // Track stats
  let added = 0;
  let updated = 0;
  let unchanged = 0;
  let removed = 0;

  // -----------------------------------------------------------------------
  // Sync each tree entry
  // -----------------------------------------------------------------------

  for (const entry of SYNC_TREE) {
    const srcPath = join(SOURCE, entry.src);
    const dstBase = entry.dst || entry.src;
    const dstPath = join(TARGET, dstBase);

    if (!existsSync(srcPath)) {
      console.warn(`  ⚠ Source not found, skipping: ${entry.src}`);
      continue;
    }

    const srcStat = statSync(srcPath);

    if (srcStat.isFile()) {
      // Single file sync
      const relDisplay = dstBase;
      if (shouldExclude(relDisplay)) {
        continue;
      }

      if (filesAreIdentical(srcPath, dstPath)) {
        unchanged++;
        continue;
      }

      const action = existsSync(dstPath) ? "UPDATE" : "ADD";
      console.log(`  ${action === "ADD" ? "+" : "~"} ${relDisplay}`);

      if (!DRY_RUN) {
        ensureDir(dstPath);
        copyFileSync(srcPath, dstPath);
      }

      if (action === "ADD") {
        added++;
      } else {
        updated++;
      }
    } else if (srcStat.isDirectory()) {
      // Directory sync — collect all source files
      const srcFiles = walkDir(srcPath);
      const dstFiles = existsSync(dstPath) ? walkDir(dstPath) : [];

      // Build set of expected destination files
      const expectedDstFiles = new Set();

      for (const srcFile of srcFiles) {
        const relToSrc = relative(srcPath, srcFile);
        if (shouldExclude(relToSrc)) {
          continue;
        }

        const dstFile = join(dstPath, relToSrc);
        expectedDstFiles.add(dstFile);

        if (filesAreIdentical(srcFile, dstFile)) {
          unchanged++;
          continue;
        }

        const action = existsSync(dstFile) ? "UPDATE" : "ADD";
        const relDisplay = join(dstBase, relToSrc).replace(/\\/g, "/");
        console.log(`  ${action === "ADD" ? "+" : "~"} ${relDisplay}`);

        if (!DRY_RUN) {
          ensureDir(dstFile);
          copyFileSync(srcFile, dstFile);
        }

        if (action === "ADD") {
          added++;
        } else {
          updated++;
        }
      }

      // Remove files in target that don't exist in source (stale files)
      for (const dstFile of dstFiles) {
        if (!expectedDstFiles.has(dstFile)) {
          const relToTarget = relative(dstPath, dstFile);
          if (shouldExclude(relToTarget)) {
            continue;
          }

          const relDisplay = join(dstBase, relToTarget).replace(/\\/g, "/");
          console.log(`  - ${relDisplay} (stale — removed)`);

          if (!DRY_RUN) {
            rmSync(dstFile, { force: true });
            // Clean up empty parent dirs
            let parent = dirname(dstFile);
            while (
              parent !== dstPath &&
              existsSync(parent) &&
              readdirSync(parent).length === 0
            ) {
              rmSync(parent, { force: true });
              parent = dirname(parent);
            }
          }

          removed++;
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Merge package.json
  // -----------------------------------------------------------------------

  console.log("");
  const merged = mergePackageJson(sourcePkg, targetPkg);
  const mergedJson = `${JSON.stringify(merged, null, 2)}\n`;
  const currentJson = existsSync(targetPkgPath)
    ? readFileSync(targetPkgPath, "utf-8")
    : "";

  if (mergedJson !== currentJson) {
    console.log("  ~ package.json (merged)");
    if (!DRY_RUN) {
      writeFileSync(targetPkgPath, mergedJson);
    }
    updated++;
  } else {
    unchanged++;
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------

  console.log("");
  console.log("[sync-manifest-runtime] Summary:");
  console.log(`  Added:     ${added}`);
  console.log(`  Updated:   ${updated}`);
  console.log(`  Unchanged: ${unchanged}`);
  console.log(`  Removed:   ${removed}`);
  console.log("");

  if (DRY_RUN) {
    console.log("[sync-manifest-runtime] DRY RUN — no files were modified.");
    console.log("  Remove --dry-run to apply changes.");
  } else {
    console.log("[sync-manifest-runtime] Sync complete.");

    if (REBUILD_DIST) {
      console.log("");
      console.log("[sync-manifest-runtime] Rebuilding dist...");
      try {
        execSync("pnpm run build:lib", {
          cwd: TARGET,
          stdio: "inherit",
          shell: process.platform === "win32",
        });
        console.log("[sync-manifest-runtime] Dist rebuild complete.");
      } catch (_err) {
        console.error(
          "[sync-manifest-runtime] ERROR: Dist rebuild failed. Run manually:"
        );
        console.error("  cd packages/manifest-runtime && pnpm build:lib");
        process.exit(1);
      }
    } else if (updated > 0 || added > 0) {
      console.log("");
      console.log("  Next steps:");
      console.log("    1. Review:  git diff packages/manifest-runtime/");
      console.log("    2. Test:    cd apps/api && pnpm test -- --run manifest");
      console.log("    3. If source changed, rebuild dist:");
      console.log("       cd packages/manifest-runtime && pnpm build:lib");
      console.log("       (or re-run with --rebuild-dist)");
    }
  }
}

main();
