#!/usr/bin/env node
// Gate: forbid local re-definitions of the shared plain-record guards.
//
// The single approved home for these helpers is:
//   apps/app/app/lib/is-record.ts   AND   apps/api/app/lib/is-record.ts
// exporting `isPlainRecord` and `assertRecord`. Anywhere else must import them.
//
// Run locally:  pnpm check:no-local-isrecord
// CI:           node scripts/check-no-local-isrecord.mjs   (wired in .github/workflows/ci.yml)
//
// On failure it prints `relative/path:line` for every local definition so the
// fix is mechanical: delete the local helper and `import { isPlainRecord, assertRecord } from "@/app/lib/is-record"`.

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SELF = fileURLToPath(import.meta.url);

// A *definition* of one of the shared guards: a declaration keyword
// (function/const/let/var, optionally `export`/`async`) immediately followed
// by the name. Catches `const isRecord =`, `function isRecord(`,
// `export function assertRecord(`. Does NOT match imports, call sites,
// string literals, type aliases, or object/method members.
const DEF_RE =
  /\b(?:export\s+)?(?:async\s+)?(?:function\s+|const\s+|let\s+|var\s+)(isRecord|isPlainRecord|expectRecord|assertRecord)\b/;

// Generated / build / vendored output — never scanned.
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".next-dev",
  ".turbo",
  "dist",
  "build",
  "out",
  "coverage",
  ".vercel",
  "graphify-out",
  "storybook-static",
  ".cache",
  ".swc",
  ".worktrees",
  ".tmp",
]);
const SCAN_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
]);

// The shared utilities themselves are the only files allowed to DEFINE these.
const APPROVED = new Set(
  ["apps/app/app/lib/is-record.ts", "apps/api/app/lib/is-record.ts"].map((p) =>
    p.split("/").join(sep)
  )
);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile()) {
      const dot = full.lastIndexOf(".");
      if (dot !== -1 && SCAN_EXT.has(full.slice(dot))) {
        yield full;
      }
    }
  }
}

const violations = [];
for (const file of walk(ROOT)) {
  if (file === SELF) {
    continue;
  }
  const rel = relative(ROOT, file);
  if (APPROVED.has(rel)) {
    continue;
  }
  // Skip generated manifests / reports by name pattern.
  if (rel.includes(".generated.") || rel.endsWith(".min.js")) {
    continue;
  }
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(DEF_RE);
    if (m) {
      violations.push(
        `${rel}:${i + 1}: local "${m[1]}" — import { isPlainRecord, assertRecord } from "@/app/lib/is-record" instead`
      );
    }
  }
}

if (violations.length > 0) {
  console.error(
    `\n× ${violations.length} local definition(s) of a shared plain-record guard found.\n` +
      "  Do not redefine isRecord/isPlainRecord/expectRecord/assertRecord locally.\n" +
      `  Import from "@/app/lib/is-record" (apps/*/app/lib/is-record.ts).\n`
  );
  for (const v of violations) {
    console.error(`  ${v}`);
  }
  process.exit(1);
}

console.log(
  "✓ No local isRecord/isPlainRecord/expectRecord/assertRecord definitions outside the shared utility."
);
