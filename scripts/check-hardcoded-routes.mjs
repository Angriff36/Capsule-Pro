#!/usr/bin/env node

/**
 * CI Conformance Check — No Hardcoded API Routes in Client Code
 *
 * Scans client-facing source files for raw "/api/" string literals and
 * template expressions. Uses a ratchet baseline (scripts/check-canonical-
 * routes-baseline.txt): fails if the current violation count exceeds the
 * baseline. Existing violations are not blocked, but new ones cannot
 * accumulate silently. Mirrors the scripts/lint-explicit-any.mjs pattern.
 *
 * Run:  node scripts/check-hardcoded-routes.mjs
 * CI:   Added as a step in .github/workflows/ci.yml
 *
 * Allowlisted files (permitted to contain /api/ strings):
 *   - apps/app/app/lib/routes.ts          (canonical route helper definitions)
 *   - apps/app/app/lib/api.ts             (apiFetch wrapper / dev guard)
 *   - apps/app/next.config.ts             (Next.js rewrite proxy rules)
 *   - apps/app/app/api/**                 (server-side route handlers)
 *   - scripts/**                          (build/CI scripts)
 *   - *.test.ts, *.test.tsx, *.spec.ts    (test files)
 *   - apps/api/**                         (API server — not client code)
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(process.cwd());
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = join(SCRIPT_DIR, "check-canonical-routes-baseline.txt");

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
];

/** Directory prefixes that are always allowed. */
const ALLOWED_DIR_PREFIXES = [
  "apps/app/app/api/", // Server-side route handlers in the app
  "apps/api/", // API server (not client code)
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

function readBaseline() {
  const raw = readFileSync(BASELINE_PATH, "utf-8").trim();
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(
      `[check-hardcoded-routes] Invalid baseline value in ${relative(REPO_ROOT, BASELINE_PATH)}: ${raw}`
    );
  }
  return parsed;
}

function main() {
  console.log(
    "[check-hardcoded-routes] Scanning for hardcoded /api/ paths in client code...\n"
  );

  const baseline = readBaseline();
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

  const count = violations.length;
  console.log(
    `[check-hardcoded-routes] ${count} violation(s) found (baseline ${baseline}).\n`
  );

  if (count > baseline) {
    console.error(
      `[check-hardcoded-routes] ❌ FAILED — hardcoded-route count regressed (${count} > ${baseline}).`
    );
    console.error(
      'Fix: Import route helpers from "@/lib/routes" instead of hardcoding /api/ paths.'
    );
    console.error(
      "See docs/audits/hardcoded-routes-violations.md for the migration plan."
    );
    console.error(
      "Run `node scripts/check-hardcoded-routes.mjs` locally to see the full violation list.\n"
    );
    process.exit(1);
  }

  if (count < baseline) {
    console.log(
      `[check-hardcoded-routes] ✅ Count improved (${count} < ${baseline}). ` +
        `Update ${relative(REPO_ROOT, BASELINE_PATH)} to lock in the win.\n`
    );
  } else {
    console.log("[check-hardcoded-routes] ✅ Baseline held.\n");
  }

  process.exit(0);
}

main();
