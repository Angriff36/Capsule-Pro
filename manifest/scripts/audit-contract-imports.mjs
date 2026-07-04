#!/usr/bin/env node

/**
 * audit-contract-imports.mjs -- CONTRACT-PACKAGE IMPORT GATE.
 *
 * WHY THIS EXISTS (the important part):
 *   Constitution §4a designates `@repo/manifest-runtime` (at `manifest/runtime/`) as
 *   the single shared runtime/contract workspace package, and §17 states its
 *   `package.json` exports field "is the canonical list of available adapters."
 *   Generated Manifest artifacts -- merged IR (`manifest/ir/`), the OpenAPI spec
 *   (`manifest/api-docs/`), generated runtime metadata (`manifest/generated/`,
 *   `manifest/runtime/src/generated/`), the routes manifest / command-source-map /
 *   commands registry, the Prisma projection (`generated-schema.prisma`), and the
 *   store-options bag -- are producer/runtime-internal. App and API FEATURE code
 *   must consume the contract through the package boundary, not reach into those
 *   paths by relative string or import specifier.
 *
 *   Without a gate, feature code silently re-couples to generated file locations,
 *   so a regeneration that moves/renames an artifact breaks callers at runtime
 *   (not at compile time), and the §10 "generated surface drift against IR/runtime"
 *   CI check has no import-level enforcement. This gate is that enforcement
 *   (constitution §13 lists this class as a required CI check).
 *
 * WHAT IT CHECKS:
 *   Uses ripgrep to find candidate lines across `apps/**` and `packages/**`, then
 *   flags any QUOTED string literal (import specifier, `path.resolve/join(...)`
 *   argument, `readFileSync(...)` argument, template literal, etc.) that references
 *   a forbidden generated path. Quoted-match deliberately ignores unquoted comment
 *   prose (e.g. `// see manifest/runtime/src/...`) -- a comment is documentation,
 *   not a coupling.
 *
 *   The `manifest/` tree is never scanned (it IS the generation/runtime boundary),
 *   and the in-app generated CLIENT surface
 *   (`apps/app/app/lib/manifest-client|manifest-hooks|manifest-types.generated.ts|
 *    manifest-field-hints.generated.ts`) is excluded -- under the contract policy
 *   that surface is the allowed client projection (it is `.generated.ts`, not in
 *   the forbidden list). `@repo/manifest-runtime/*` and `@angriff36/manifest` are
 *   the legitimate package imports and are never matched.
 *
 * ALLOWLIST:
 *   Legitimate consumers (the IR embed, the OpenAPI-serving route, build
 *   `outputFileTracingIncludes`, the MCP introspection server, IR-reading test
 *   fixtures) are registered in `manifest/governance/contract-import-allowlist.json`
 *   with a reason (+ optional `expiresOn`), mirroring `audit-routes-exemptions.json`.
 *   An entry may be an exact `path` or a `pathPrefix` (dir-level).
 *
 * EXIT CODES:
 *   0 = clean (no unallowlisted violations; under --strict, no stale allowlist
 *       entries either).
 *   1 = unallowlisted violation, or (under --strict) a stale allowlist entry, or
 *       self-test failure.
 *
 * USAGE:
 *   node manifest/scripts/audit-contract-imports.mjs               # report + fail on unallowlisted
 *   node manifest/scripts/audit-contract-imports.mjs --strict      # also fail on stale allowlist entries
 *   node manifest/scripts/audit-contract-imports.mjs --self-test   # verify the detector logic
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

// ---------------------------------------------------------------------------
// Forbidden generated-path patterns. Matched against the CONTENT of quoted
// string literals only. First match wins (order affects only the reported label).
// ---------------------------------------------------------------------------
const FORBIDDEN = [
  { label: "manifest/ir (merged IR)", re: /manifest\/ir\// },
  { label: "manifest/api-docs (openapi)", re: /manifest\/api-docs\// },
  { label: "manifest/generated (generated tree)", re: /manifest\/generated\// },
  {
    label: "manifest/runtime/src/generated (deep package path)",
    re: /manifest\/runtime\/src\/generated\//,
  },
  {
    label: "manifest/runtime/routes.manifest.json",
    re: /manifest\/runtime\/routes\.manifest\.json/,
  },
  {
    label: "manifest/runtime/routes.ts",
    re: /manifest\/runtime\/routes\.ts(?!x)/,
  },
  {
    label: "manifest/runtime/command-source-map.json",
    re: /manifest\/runtime\/command-source-map\.json/,
  },
  {
    label: "manifest/runtime/commands.registry.json",
    re: /manifest\/runtime\/commands\.registry\.json/,
  },
  {
    label: "generated-schema.prisma (prisma projection)",
    re: /generated-schema\.prisma/,
  },
  {
    label: "prisma-store-options.generated.json",
    re: /prisma-store-options\.generated\.json/,
  },
  {
    label: "prisma-options.generated.json",
    re: /prisma-options\.generated\.json/,
  },
  {
    label: "kitchen.ir.generated.json (IR embed)",
    re: /kitchen\.ir\.generated\.json/,
  },
  {
    label: "*.generated.json (generated json artifact)",
    re: /\.generated\.json/,
  },
];

// ripgrep candidate pattern (raw substring alternation; the quoted-literal check
// below is what actually decides a violation -- rg only narrows to candidate lines).
const RG_PATTERN =
  "manifest/ir/|manifest/api-docs/|manifest/generated/|manifest/runtime/src/generated/|" +
  "manifest/runtime/routes.manifest.json|manifest/runtime/routes.ts|manifest/runtime/command-source-map.json|" +
  "manifest/runtime/commands.registry.json|generated-schema.prisma|" +
  "prisma-store-options.generated.json|prisma-options.generated.json|kitchen.ir.generated.json|.generated.json";

// Captures single/double/backtick-quoted string literals (no raw newlines).
const QUOTE_RE = /(['"`])(?:\\.|(?!\1).)*\1/g;
// Splits rg stdout into lines (top-level per biome useTopLevelRegex).
const NEWLINE_RE = /\r?\n/;

// Repo-relative generated CLIENT surfaces that ARE the allowed consumption model
// (generated projections emitted into the app/package, not raw manifest artifacts).
const ALLOWED_GEN_PREFIXES = [
  "apps/app/app/lib/manifest-client/",
  "apps/app/app/lib/manifest-hooks/",
  "apps/app/app/lib/manifest-field-hints.generated.ts",
  "apps/app/app/lib/manifest-types.generated.ts",
  "packages/database/generated/",
  "packages/database/prisma/generated/",
];

// ripgrep include/exclude globs.
const RG_INCLUDE = ["*.ts", "*.tsx", "*.js", "*.cjs", "*.mjs"];
const RG_EXCLUDE_DIRS = [
  "node_modules",
  ".next",
  ".next-dev",
  ".next-dev-webpack",
  ".turbo",
  "dist",
  "coverage",
  ".cache",
];

// ---------------------------------------------------------------------------
// Allowlist
// ---------------------------------------------------------------------------
const ALLOWLIST_DEFAULT = resolve(
  PROJECT_ROOT,
  "manifest/governance/contract-import-allowlist.json"
);

function loadAllowlist(path) {
  if (!existsSync(path)) {
    return [];
  }
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8"));
    if (!Array.isArray(raw)) {
      throw new Error("allowlist JSON must be an array of entries");
    }
    return raw;
  } catch (err) {
    console.error(
      `[contract-imports] allowlist at ${path} is invalid: ${err.message}`
    );
    process.exit(1);
  }
}

/** Returns the matching allowlist entry (exact path or pathPrefix), or null. */
function allowlistEntryFor(relPath, allowlist) {
  for (const entry of allowlist) {
    if (entry.path && entry.path === relPath) {
      return entry;
    }
    if (entry.pathPrefix && relPath.startsWith(entry.pathPrefix)) {
      return entry;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// ripgrep candidate search
// ---------------------------------------------------------------------------
function runRg() {
  const args = [
    "--line-number",
    "--no-heading",
    "--with-filename",
    "--color",
    "never",
    ...RG_INCLUDE.flatMap((g) => ["-g", g]),
    ...RG_EXCLUDE_DIRS.flatMap((d) => ["-g", `!${d}/**`]),
    RG_PATTERN,
    "apps",
    "packages",
  ];
  const res = spawnSync("rg", args, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.error) {
    console.error(
      `[contract-imports] ripgrep failed to launch (is 'rg' on PATH?): ${res.error.message}`
    );
    process.exit(1);
  }
  // rg exits 1 when there are no matches -- that is not an error here.
  if (res.status !== 0 && res.status !== 1) {
    console.error(
      `[contract-imports] ripgrep exited ${res.status}:\n${res.stderr}`
    );
    process.exit(1);
  }
  if (!res.stdout) {
    return [];
  }
  return res.stdout.split(NEWLINE_RE);
}

// ---------------------------------------------------------------------------
// Quoted-literal extraction + forbidden match for one line
// ---------------------------------------------------------------------------
function scanLine(content) {
  const findings = [];
  for (const tok of content.matchAll(QUOTE_RE)) {
    const literal = tok[0];
    const hit = FORBIDDEN.find((f) => f.re.test(literal));
    if (hit) {
      findings.push({ label: hit.label, snippet: literal });
    }
  }
  return findings;
}

/** Parse a `path:line:content` rg line into parts (paths use forward slashes). */
function parseRgLine(line) {
  const i = line.indexOf(":");
  const j = line.indexOf(":", i + 1);
  if (i < 0 || j < 0) {
    return null;
  }
  return {
    file: line.slice(0, i).replace(/\\/g, "/"),
    lineNo: Number(line.slice(i + 1, j)),
    content: line.slice(j + 1),
  };
}

// ---------------------------------------------------------------------------
// Main scan
// ---------------------------------------------------------------------------
function scan(allowlistPath) {
  const allowlist = loadAllowlist(allowlistPath);
  const allowlistHits = new Set();

  const violations = [];
  for (const raw of runRg()) {
    if (!raw) {
      continue;
    }
    const parsed = parseRgLine(raw);
    if (!parsed) {
      continue;
    }
    if (ALLOWED_GEN_PREFIXES.some((p) => parsed.file.startsWith(p))) {
      continue;
    }

    const trimmed = parsed.content.trimStart();
    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("/*")
    ) {
      continue; // full-line comment prose, not a coupling
    }

    const findings = scanLine(parsed.content);
    if (findings.length === 0) {
      continue;
    }

    const entry = allowlistEntryFor(parsed.file, allowlist);
    if (entry) {
      allowlistHits.add(entry.path ?? entry.pathPrefix);
      continue;
    }
    for (const f of findings) {
      violations.push({ ...parsed, ...f });
    }
  }

  return { violations, allowlist, allowlistHits };
}

function printFindings(violations) {
  if (violations.length === 0) {
    console.log(
      "[contract-imports] ✓ no forbidden generated-path references in feature code."
    );
    return;
  }
  console.error(
    `[contract-imports] ✗ ${violations.length} forbidden generated-path reference(s) in feature code:\n`
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.lineNo}  [${v.label}]`);
    console.error(`    ${v.snippet}\n`);
  }
  console.error(
    "Feature code must import generated Manifest artifacts through the @repo/manifest-runtime\n" +
      "package boundary, not by path. If a reference is legitimate (build tracing, an introspection\n" +
      "server, an IR-reading test fixture, the drift-gated IR embed), add it with a reason to\n" +
      "manifest/governance/contract-import-allowlist.json.\n"
  );
}

function printAllowlistUsage(allowlist, allowlistHits) {
  const stale = [];
  for (const entry of allowlist) {
    const id = entry.path ?? entry.pathPrefix;
    if (!allowlistHits.has(id)) {
      stale.push(entry);
    }
  }
  if (allowlist.length === 0) {
    return stale;
  }
  console.log(
    `[contract-imports] allowlist: ${allowlistHits.size}/${allowlist.length} entries currently match a violation.`
  );
  if (stale.length) {
    console.warn(
      "[contract-imports] stale allowlist entries (no current violation matches; remove or keep intentionally):"
    );
    for (const e of stale) {
      console.warn(
        `  - ${e.path ?? e.pathPrefix}  (${e.reason ?? "no reason"})`
      );
    }
  }
  return stale;
}

// ---------------------------------------------------------------------------
// Self-test (verifies scanLine on synthetic inputs; does not touch the FS)
// ---------------------------------------------------------------------------
function selfTest() {
  const cases = [
    [`const p = "manifest/ir/kitchen.ir.json";`, "manifest/ir (merged IR)"],
    [
      `import x from "../../manifest/api-docs/openapi.json";`,
      "manifest/api-docs (openapi)",
    ],
    [
      `const m = path.resolve(cwd, "manifest/runtime/routes.manifest.json");`,
      "manifest/runtime/routes.manifest.json",
    ],
    [
      `const f = "manifest/generated/runtime/foo.generated.ts";`,
      "manifest/generated (generated tree)",
    ],
    [
      `const e = "./kitchen.ir.generated.json";`,
      "kitchen.ir.generated.json (IR embed)",
    ],
    [
      `const g = "manifest/generated-schema.prisma";`,
      "generated-schema.prisma (prisma projection)",
    ],
    // Allowed -- must NOT match:
    [
      `import { loadRoutePatterns } from "@repo/manifest-runtime/routes-manifest";`,
      null,
    ],
    [`import type { IR } from "@angriff36/manifest/ir";`, null],
    ["// see manifest/runtime/src/runtime/loadManifests.ts for details", null],
    [`const c = "apps/app/app/lib/manifest-client/core.generated.ts";`, null],
    [`const r = "/api/manifest/Event/commands/create";`, null],
  ];
  let pass = 0;
  let fail = 0;
  for (const [line, expected] of cases) {
    const found = scanLine(line)[0]?.label ?? null;
    const ok = found === expected;
    if (ok) {
      pass++;
    } else {
      fail++;
    }
    console.log(
      `  ${ok ? "✓" : "✗"} expect=${JSON.stringify(expected)} got=${JSON.stringify(found)}  | ${line}`
    );
  }
  console.log(`[contract-imports] self-test: ${pass} passed, ${fail} failed.`);
  return fail === 0;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const out = { strict: false, selfTest: false, allowlist: ALLOWLIST_DEFAULT };
  for (const [i, a] of argv.entries()) {
    if (a === "--strict") {
      out.strict = true;
    } else if (a === "--self-test") {
      out.selfTest = true;
    } else if (a === "--allowlist" && argv[i + 1]) {
      out.allowlist = resolve(argv[i + 1]);
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (args.selfTest) {
  process.exit(selfTest() ? 0 : 1);
}

const { violations, allowlist, allowlistHits } = scan(args.allowlist);
printFindings(violations);
const stale = printAllowlistUsage(allowlist, allowlistHits);

let exitCode = 0;
if (violations.length > 0) {
  exitCode = 1;
}
if (args.strict && stale.length > 0) {
  console.error(
    `[contract-imports] ✗ --strict: ${stale.length} stale allowlist entry/entries (tighten the allowlist).`
  );
  exitCode = 1;
}
process.exit(exitCode);
