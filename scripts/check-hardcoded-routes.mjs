#!/usr/bin/env node

/**
 * CI Conformance Check — No Hardcoded API Routes in Client Code
 *
 * Scans client-facing source files for raw "/api/" string literals and
 * template expressions. Fails with exit code 1 if any violations are found.
 *
 * Run:  node scripts/check-hardcoded-routes.mjs
 * CI:   Added as a step in .github/workflows/ci.yml
 *
 * Allowlisted files (permitted to contain /api/ strings):
 *   - apps/app/app/lib/routes.ts          (canonical route helper definitions)
 *   - apps/app/app/lib/api.ts             (apiFetch wrapper / dev guard)
 *   - apps/app/next.config.ts             (Next.js rewrite proxy rules)
 *   - apps/app/app/api/**                 (server-side route handlers)
 *   - packages/manifest-ir/dist/**        (generated route manifest)
 *   - scripts/**                          (build/CI scripts)
 *   - *.test.ts, *.test.tsx, *.spec.ts    (test files)
 *   - apps/api/**                         (API server — not client code)
 *   - eslint.config.mjs                   (ESLint config for this rule)
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const REPO_ROOT = resolve(process.cwd());

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Directories to scan for client code. */
const SCAN_DIRS = [join(REPO_ROOT, "apps/app"), join(REPO_ROOT, "packages/ui")];

/** File extensions to check. */
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);

/** Regex that matches hardcoded /api/ path strings. */
const VIOLATION_RE = /["'`]\/api\//g;

/**
 * Files/patterns that are allowed to contain /api/ strings.
 * Paths are relative to REPO_ROOT, using forward slashes.
 */
const ALLOWLIST = [
  "apps/app/app/lib/routes.ts",
  "apps/app/app/lib/api.ts",
  "apps/app/next.config.ts",
  "apps/app/env.ts",
  "eslint.config.mjs",
];

/** Directory prefixes that are always allowed. */
const ALLOWED_DIR_PREFIXES = [
  "apps/app/app/api/", // Server-side route handlers in the app
  "apps/api/", // API server (not client code)
  "packages/manifest-ir/", // Generated manifest artifacts
  "scripts/", // Build/CI scripts
  "node_modules/", // Dependencies
  ".next/", // Build output
  "dist/", // Build output
];

/** File suffixes that are always allowed (tests). */
const ALLOWED_SUFFIXES = [
  ".test.ts",
  ".test.tsx",
  ".spec.ts",
  ".spec.tsx",
  ".test.skip.ts",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isAllowed(relPath) {
  const normalized = relPath.replace(/\\/g, "/");

  // Exact file match
  if (ALLOWLIST.includes(normalized)) {
    return true;
  }

  // Directory prefix match
  for (const prefix of ALLOWED_DIR_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      return true;
    }
  }

  // Test file suffix match
  for (const suffix of ALLOWED_SUFFIXES) {
    if (normalized.endsWith(suffix)) {
      return true;
    }
  }

  return false;
}

function walkFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".next" ||
        entry.name === ".next-dev" ||
        entry.name === "dist" ||
        entry.name === ".turbo" ||
        entry.name === ".vercel" ||
        entry.name === "generated" ||
        entry.name === "coverage" ||
        entry.name === "storybook-static"
      ) {
        continue;
      }
      results.push(...walkFiles(full));
    } else if (entry.isFile()) {
      const ext = entry.name.slice(entry.name.lastIndexOf("."));
      if (EXTENSIONS.has(ext)) {
        results.push(full);
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log(
    "[check-hardcoded-routes] Scanning for hardcoded /api/ paths in client code...\n"
  );

  const violations = [];

  for (const scanDir of SCAN_DIRS) {
    let files;
    try {
      files = walkFiles(scanDir);
    } catch {
      // Directory doesn't exist — skip
      continue;
    }

    for (const filePath of files) {
      const relPath = relative(REPO_ROOT, filePath);

      if (isAllowed(relPath)) {
        continue;
      }

      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (VIOLATION_RE.test(line)) {
          violations.push({
            file: relPath.replace(/\\/g, "/"),
            line: i + 1,
            content: line.trim().slice(0, 120),
          });
        }
        // Reset regex lastIndex (global flag)
        VIOLATION_RE.lastIndex = 0;
      }
    }
  }

  if (violations.length === 0) {
    console.log("[check-hardcoded-routes] ✅ No violations found.\n");
    process.exit(0);
  }

  console.error(
    `[check-hardcoded-routes] ❌ Found ${violations.length} violation(s):\n`
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    ${v.content}`);
    console.error("");
  }
  console.error(
    'Fix: Import route helpers from "@/lib/routes" instead of hardcoding /api/ paths.'
  );
  console.error('See AGENTS.md § "How to Add a New Route" for instructions.\n');
  process.exit(1);
}

main();
