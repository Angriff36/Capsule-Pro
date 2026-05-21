#!/usr/bin/env node
/**
 * Capsule-local direct-write audit.
 *
 * Why this exists
 * ---------------
 * The bundled `@angriff36/manifest` direct-writes detector only matches the
 * identifier `prisma.X.<writeMethod>(...)` and only scans:
 *   - app/api/**\/route.ts
 *   - app/actions/**\/*.ts
 *   - jobs/**\/*.ts
 *
 * Capsule-Pro re-exports `PrismaClient` as `database` from `@repo/database`,
 * so the entire codebase writes through `database.X.<writeMethod>(...)`.
 * Capsule-Pro also has writes in helpers (`apps/api/app/lib/*`, server
 * actions outside `app/actions/`, packages, etc.) that the upstream detector
 * never scans.
 *
 * Per `docs/manifest/governance.md`, absence of a detector hit is NOT
 * approval — direct writes for governed entities are still violations.
 * This script makes those writes visible.
 *
 * What it does
 * ------------
 *   1. Walks `apps/` and `packages/` for `.ts` / `.tsx` files.
 *   2. Matches `\b(database|prisma)\.\w+\.<writeMethod>(` on every line.
 *   3. Classifies each hit using a small, documented allowlist of paths
 *      that are infrastructure or test-only by design.
 *   4. Cross-references hits with `DEPRECATED ALIAS` route markers and
 *      with `bypasses.json` at the repo root.
 *   5. Emits a JSON report and a Markdown report to `manifest-audit/`.
 *
 * What it deliberately does NOT do
 * --------------------------------
 *   - Does not approve any write. The output is a list; classifications
 *     are mechanical, not authoritative. Reviewers must decide per entry.
 *   - Does not write to `bypasses.json` or migrate any code.
 *   - Does not claim hard compliance.
 *
 * Flags
 * -----
 *   --strict            Exit code 1 if any REPORTED hit is unallowlisted
 *                       and not covered by bypasses.json.
 *   --json <path>       Override JSON output path.
 *   --md <path>         Override Markdown output path.
 *   --root <dir>        Override repo root (defaults to script's repo root).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, "..", "..");

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const opts = {
  strict: false,
  json: null,
  md: null,
  root: DEFAULT_ROOT,
};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--strict") opts.strict = true;
  else if (a === "--json") opts.json = args[++i];
  else if (a === "--md") opts.md = args[++i];
  else if (a === "--root") opts.root = path.resolve(args[++i]);
  else if (a === "-h" || a === "--help") {
    console.log(
      "Usage: node scripts/manifest/audit-direct-writes.mjs [--strict] [--json path] [--md path] [--root dir]"
    );
    process.exit(0);
  }
}

const ROOT = opts.root;
const OUT_DIR = path.join(ROOT, "manifest-audit");
const JSON_OUT = opts.json
  ? path.resolve(opts.json)
  : path.join(OUT_DIR, "direct-writes.json");
const MD_OUT = opts.md
  ? path.resolve(opts.md)
  : path.join(OUT_DIR, "direct-writes.md");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Directories to scan, relative to repo root.
const SCAN_ROOTS = ["apps", "packages"];

// Paths whose hits are reported as `allowed`, with a documented reason.
// Reasons are surfaced in the report so reviewers can challenge any entry.
const ALLOWLIST = [
  {
    match: /^packages[\\/](manifest-adapters)[\\/]src[\\/]/,
    reason:
      "manifest-runtime-owned: PrismaStore / PrismaJsonStore / outbox writer / idempotency store — these ARE the runtime adapter layer that the constitution allows to write.",
  },
  {
    match: /^packages[\\/](database)[\\/]/,
    reason:
      "infrastructure: @repo/database is the Prisma client + generated client wrappers; writes here are part of the ORM layer, not application code.",
  },
  {
    match: /^packages[\\/](sentry-integration)[\\/]/,
    reason:
      "infrastructure: a store implementation used by the Sentry integration; structurally analogous to the manifest stores.",
  },
  {
    match: /^packages[\\/](payroll-engine)[\\/]src[\\/]dataSource[\\/]/,
    reason:
      "infrastructure: PayrollDataSource adapter — read/write data source abstraction (analogous to a store).",
  },
  {
    match: /[\\/]__tests__[\\/]/,
    reason: "test-or-setup: __tests__ directory, allowed to write fixtures.",
  },
  {
    match: /\.test\.tsx?$/,
    reason: "test-or-setup: .test.{ts,tsx} file.",
  },
  {
    match: /\.spec\.tsx?$/,
    reason: "test-or-setup: .spec.{ts,tsx} file.",
  },
  {
    match: /[\\/]test-scripts[\\/]/,
    reason: "test-or-setup: test-scripts directory.",
  },
  {
    match: /[\\/]prisma[\\/]seed[\w-]*\.ts$/,
    reason: "test-or-setup: Prisma seed script.",
  },
  {
    match: /[\\/]sample-data[\\/]seed\.ts$/,
    reason: "test-or-setup: sample-data seed script.",
  },
];

// Directories to skip entirely (never walk into).
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".turbo",
  "dist",
  "build",
  "out",
  "coverage",
  ".vercel",
  ".pnpm",
  "generated", // packages/database/generated — Prisma client generated code
  ".worktrees",
  ".cache",
  ".biome-sweep",
  ".autolab",
  ".automaker",
  ".idea",
  ".git",
]);

// File extensions to scan.
const SCAN_EXT = new Set([".ts", ".tsx"]);

const DIRECT_WRITE_METHODS = [
  "create",
  "update",
  "delete",
  "upsert",
  "createMany",
  "updateMany",
  "deleteMany",
];

const DIRECT_WRITE_RE = new RegExp(
  `\\b(database|prisma)\\s*\\.\\s*(\\w+)\\s*\\.\\s*(${DIRECT_WRITE_METHODS.join(
    "|"
  )})\\s*\\(`,
  "g"
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toPosix(p) {
  return p.split(path.sep).join("/");
}

async function walk(dir, acc) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const ent of entries) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      await walk(full, acc);
    } else if (ent.isFile() && SCAN_EXT.has(path.extname(ent.name))) {
      acc.push(full);
    }
  }
  return acc;
}

function classify(relPath) {
  for (const rule of ALLOWLIST) {
    if (rule.match.test(relPath)) {
      return { allowed: true, reason: rule.reason };
    }
  }
  return { allowed: false, reason: null };
}

function classifySurface(relPath) {
  // Coarse surface bucket for grouping in the report.
  const p = relPath.replace(/\\/g, "/");
  if (p.startsWith("apps/api/app/api/")) return "apps/api route";
  if (p.startsWith("apps/api/app/lib/")) return "apps/api lib helper";
  if (p.startsWith("apps/api/lib/")) return "apps/api lib helper";
  if (p.startsWith("apps/api/")) return "apps/api other";
  if (p.includes("apps/app/app/(authenticated)/")) return "apps/app server action";
  if (p.includes("apps/app/app/(unauthenticated)/")) return "apps/app unauthenticated";
  if (p.startsWith("apps/app/app/lib/")) return "apps/app lib helper";
  if (p.startsWith("apps/app/lib/")) return "apps/app lib helper";
  if (p.startsWith("apps/app/")) return "apps/app other";
  if (p.startsWith("apps/mobile/")) return "apps/mobile";
  if (p.startsWith("apps/web/")) return "apps/web";
  if (p.startsWith("packages/")) return "packages";
  return "other";
}

function routePath(relPath) {
  // Convert an apps/{api,app}/app/api/.../route.ts path to a URL surface.
  const p = relPath.replace(/\\/g, "/");
  const m = p.match(/^apps\/(api|app)\/app\/api\/(.+)\/route\.ts$/);
  if (!m) return null;
  return "/api/" + m[2];
}

async function scanFile(absPath) {
  const rel = toPosix(path.relative(ROOT, absPath));
  let content;
  try {
    content = await fs.readFile(absPath, "utf-8");
  } catch {
    return { rel, hits: [], deprecatedAlias: false };
  }
  // Match the convention used by real alias shims: the marker is the FIRST
  // comment line of the file (sometimes prefixed with a banner of `///`).
  // Avoids false positives from blocker comments that mention the phrase
  // in negated form (e.g. "NOT marked as a `DEPRECATED ALIAS`").
  const firstNonBlankLines = content
    .split(/\r?\n/)
    .slice(0, 3)
    .map((l) => l.trimStart())
    .filter((l) => l.length > 0);
  const deprecatedAlias =
    firstNonBlankLines.length > 0 &&
    /^\/\/\s*DEPRECATED\s+ALIAS\b/.test(firstNonBlankLines[0]);
  const hits = [];
  // Iterate line-by-line so we can report line numbers and skip simple
  // comment-only lines. This is a heuristic: a `//` mid-line is allowed,
  // and block comments are not handled, but it keeps the script trivial.
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
    DIRECT_WRITE_RE.lastIndex = 0;
    let m;
    while ((m = DIRECT_WRITE_RE.exec(line)) !== null) {
      hits.push({
        line: i + 1,
        col: m.index + 1,
        client: m[1], // "database" or "prisma"
        model: m[2],
        method: m[3],
        snippet: line.trim().slice(0, 220),
      });
    }
  }
  return { rel, hits, deprecatedAlias };
}

async function readJsonSafe(filePath) {
  try {
    const text = await fs.readFile(filePath, "utf-8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function loadBypassPaths(bypassDoc) {
  if (!bypassDoc || !Array.isArray(bypassDoc.bypasses)) return new Set();
  const set = new Set();
  for (const entry of bypassDoc.bypasses) {
    if (typeof entry?.path === "string") set.add(entry.path);
  }
  return set;
}

// Build a set of governed Prisma model identifiers (camelCase / snake_case as
// they appear on the Prisma client) from the entities registry. Manifest
// entities are PascalCase; Prisma client accessors are PascalCase first letter
// lowered (`User` → `user`) OR identical when the schema model name is already
// lowercase/snake-cased (`sms_automation_rules` stays the same).
//
// We cover both forms: if the registry lists `SmsAutomationRule`, we accept
// both `smsAutomationRule` and (via a snake_case heuristic) `sms_automation_rule`/
// `sms_automation_rules`. The script consumer must still inspect ambiguous
// matches manually — the cross-reference is advisory.
function buildGovernedModelMap(entitiesDoc) {
  /** @type {Map<string, string>} prismaModelKey → entityName */
  const map = new Map();
  if (!entitiesDoc || !Array.isArray(entitiesDoc.entities)) return map;
  for (const e of entitiesDoc.entities) {
    if (typeof e?.name !== "string") continue;
    if (e.classification && e.classification !== "governed") continue;
    const name = e.name;
    // Form 1: PascalCase first letter lowered.
    const camel = name.charAt(0).toLowerCase() + name.slice(1);
    map.set(camel, name);
    // Form 2: snake_case (lowercase, _ between words).
    const snake = name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
    if (!map.has(snake)) map.set(snake, name);
    // Form 3: plural snake_case (Capsule sometimes pluralizes table models).
    if (!map.has(snake + "s")) map.set(snake + "s", name);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const files = [];
  for (const sub of SCAN_ROOTS) {
    await walk(path.join(ROOT, sub), files);
  }

  const bypasses = await readJsonSafe(path.join(ROOT, "bypasses.json"));
  const bypassPaths = loadBypassPaths(bypasses);

  const entitiesDoc = await readJsonSafe(
    path.join(ROOT, "manifest-registry", "entities.json")
  );
  const governedModels = buildGovernedModelMap(entitiesDoc);

  const findings = [];
  let totalHits = 0;
  for (const abs of files) {
    const { rel, hits, deprecatedAlias } = await scanFile(abs);
    if (hits.length === 0) continue;
    totalHits += hits.length;
    // Tag each hit with the governed entity name when the model maps to one.
    let fileTouchesGoverned = false;
    for (const h of hits) {
      const entity = governedModels.get(h.model) ?? null;
      h.governedEntity = entity;
      if (entity) fileTouchesGoverned = true;
    }
    const cls = classify(rel);
    findings.push({
      file: rel,
      surface: classifySurface(rel),
      route: routePath(rel),
      deprecatedAlias,
      bypassed: bypassPaths.has(rel),
      touchesGovernedEntity: fileTouchesGoverned,
      classification: cls.allowed ? "allowed" : "reported",
      reason: cls.reason,
      hits,
    });
  }

  findings.sort((a, b) => a.file.localeCompare(b.file));

  const allowed = findings.filter((f) => f.classification === "allowed");
  const reported = findings.filter((f) => f.classification === "reported");
  const reportedBypassed = reported.filter((f) => f.bypassed);
  const reportedUnbypassed = reported.filter((f) => !f.bypassed);
  const reportedAlias = reportedUnbypassed.filter((f) => f.deprecatedAlias);
  const reportedNoAlias = reportedUnbypassed.filter((f) => !f.deprecatedAlias);

  // Governed-entity sub-buckets — these are the hits that violate the
  // constitution per §"Direct-write rules" (writes against governed entities
  // outside the runtime). Non-governed direct writes are allowed by the
  // constitution and are reported only for visibility.
  const reportedAliasGoverned = reportedAlias.filter((f) => f.touchesGovernedEntity);
  const reportedNoAliasGoverned = reportedNoAlias.filter((f) => f.touchesGovernedEntity);
  const reportedNoAliasUngoverned = reportedNoAlias.filter((f) => !f.touchesGovernedEntity);

  // ----- JSON report -----
  await fs.mkdir(path.dirname(JSON_OUT), { recursive: true });
  const summary = {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    totals: {
      filesScanned: files.length,
      filesWithHits: findings.length,
      totalHits,
      allowedFiles: allowed.length,
      reportedFiles: reported.length,
      reportedBypassedFiles: reportedBypassed.length,
      reportedUnbypassedFiles: reportedUnbypassed.length,
      reportedDeprecatedAliasFiles: reportedAlias.length,
      reportedNoAliasFiles: reportedNoAlias.length,
      reportedAliasGovernedFiles: reportedAliasGoverned.length,
      reportedNoAliasGovernedFiles: reportedNoAliasGoverned.length,
      reportedNoAliasUngovernedFiles: reportedNoAliasUngoverned.length,
      governedEntityModelKeys: governedModels.size,
    },
    bypassPathsCount: bypassPaths.size,
    findings,
  };
  await fs.writeFile(JSON_OUT, JSON.stringify(summary, null, 2));

  // ----- Markdown report -----
  const md = [];
  md.push("# Direct-write audit (Capsule-local)");
  md.push("");
  md.push(`Generated: ${summary.generatedAt}`);
  md.push(`Root: \`${path.relative(process.cwd(), ROOT) || "."}\``);
  md.push("");
  md.push("## Why this exists");
  md.push("");
  md.push(
    "The upstream `@angriff36/manifest` direct-writes detector only matches " +
      "`prisma.X.<method>` and only scans `app/api/**/route.ts`, " +
      "`app/actions/**/*.ts`, `jobs/**/*.ts`. Capsule uses `database.X.<method>` and " +
      "writes from many helpers outside those globs. A green manifest CLI does **not** " +
      "imply zero direct writes."
  );
  md.push("");
  md.push("## Summary");
  md.push("");
  md.push(`- Files scanned: ${summary.totals.filesScanned}`);
  md.push(`- Files with hits: ${summary.totals.filesWithHits}`);
  md.push(`- Total hits: ${summary.totals.totalHits}`);
  md.push(`- Allowed (allowlist / test / runtime): ${summary.totals.allowedFiles}`);
  md.push(`- Reported (need review): ${summary.totals.reportedFiles}`);
  md.push(
    `  - With \`DEPRECATED ALIAS\` marker: ${summary.totals.reportedDeprecatedAliasFiles}` +
      ` (${summary.totals.reportedAliasGovernedFiles} touch governed entities)`
  );
  md.push(
    `  - Without alias marker: ${summary.totals.reportedNoAliasFiles}` +
      ` (${summary.totals.reportedNoAliasGovernedFiles} touch governed entities, ${summary.totals.reportedNoAliasUngovernedFiles} ungoverned)`
  );
  md.push(
    `  - Covered by \`bypasses.json\`: ${summary.totals.reportedBypassedFiles}`
  );
  md.push(
    `- Governed entity model keys loaded from registry: ${summary.totals.governedEntityModelKeys} (multiple keys per entity to cover camelCase / snake_case Prisma accessors)`
  );
  md.push("");
  md.push(
    "**Governed-entity hits are the only ones that violate the constitution's " +
      "direct-write rule.** Ungoverned-entity hits are reported for visibility; they " +
      "live in non-Manifest endpoints and are not governance violations on their own."
  );
  md.push("");

  const writeFinding = (f) => {
    md.push(`### \`${f.file}\``);
    md.push("");
    md.push(`- Surface: ${f.surface}`);
    if (f.route) md.push(`- Route: \`${f.route}\``);
    md.push(`- Hits: ${f.hits.length}`);
    for (const h of f.hits) {
      const gov = h.governedEntity ? ` [governed: ${h.governedEntity}]` : "";
      md.push(
        `  - L${h.line}:${h.col} — \`${h.client}.${h.model}.${h.method}(\`${gov} — \`${h.snippet}\``
      );
    }
    md.push("");
  };

  if (reportedNoAliasGoverned.length > 0) {
    md.push(
      "## Reported — governed entity, no `DEPRECATED ALIAS` marker, no bypass"
    );
    md.push("");
    md.push(
      "**These are the actual constitution violations.** A write against a " +
        "governed entity, outside the runtime, outside any alias shim, outside " +
        "the bypass registry. Each one must be migrated to a Manifest command, " +
        "converted to a documented alias with an in-file blocker, or added to " +
        "`bypasses.json` with a real `whyRuntimeNotRequired`."
    );
    md.push("");
    for (const f of reportedNoAliasGoverned) writeFinding(f);
  }

  if (reportedAliasGoverned.length > 0) {
    md.push("## Reported — governed entity, `DEPRECATED ALIAS` marker present");
    md.push("");
    md.push(
      "These routes are flagged as deprecated aliases AND still hold a direct " +
        "write against a governed entity. Per `docs/manifest/governance.md`, each " +
        "must either be a true thin forwarder to the dispatcher or carry a precise " +
        "in-file blocker. This is the natural migration backlog."
    );
    md.push("");
    for (const f of reportedAliasGoverned) writeFinding(f);
  }

  if (reportedNoAliasUngoverned.length > 0) {
    md.push("## Reported — ungoverned entity, no alias marker");
    md.push("");
    md.push(
      "Direct writes against entities the IR does not classify as governed. " +
        "These are not constitution violations on their own, but worth a glance to " +
        "confirm the entity should remain ungoverned. Listed compactly."
    );
    md.push("");
    for (const f of reportedNoAliasUngoverned) {
      const models = Array.from(new Set(f.hits.map((h) => h.model)));
      md.push(
        `- \`${f.file}\` — ${f.hits.length} hit(s); models: ${models
          .map((m) => `\`${m}\``)
          .join(", ")}`
      );
    }
    md.push("");
  }

  if (reportedBypassed.length > 0) {
    md.push("## Reported — covered by `bypasses.json`");
    md.push("");
    md.push(
      "These hits are explicitly allowed by an entry in `bypasses.json`. " +
        "Verify each bypass entry's `whyRuntimeNotRequired` is still true."
    );
    md.push("");
    for (const f of reportedBypassed) {
      md.push(`- \`${f.file}\` — ${f.hits.length} hit(s)`);
    }
    md.push("");
  }

  if (allowed.length > 0) {
    md.push("## Allowed (allowlisted by audit script)");
    md.push("");
    md.push(
      "These files are structurally part of the runtime / infrastructure / test " +
        "tier and are allowed to write directly. Each entry surfaces the rule " +
        "that allowed it so the rule itself can be challenged."
    );
    md.push("");
    // Group by reason for compactness.
    const byReason = new Map();
    for (const f of allowed) {
      const arr = byReason.get(f.reason) ?? [];
      arr.push(f);
      byReason.set(f.reason, arr);
    }
    for (const [reason, list] of byReason) {
      md.push(`### ${reason}`);
      md.push("");
      for (const f of list) {
        md.push(`- \`${f.file}\` — ${f.hits.length} hit(s)`);
      }
      md.push("");
    }
  }

  await fs.writeFile(MD_OUT, md.join("\n"));

  // ----- Console output -----
  process.stdout.write(
    `[direct-write-audit] Files scanned: ${summary.totals.filesScanned}\n`
  );
  process.stdout.write(
    `[direct-write-audit] Files with hits: ${summary.totals.filesWithHits} (${summary.totals.totalHits} hits)\n`
  );
  process.stdout.write(
    `[direct-write-audit] Allowed: ${summary.totals.allowedFiles}; Reported: ${summary.totals.reportedFiles}\n`
  );
  process.stdout.write(
    `[direct-write-audit]   Reported, governed entity, no alias, no bypass: ${summary.totals.reportedNoAliasGovernedFiles}\n`
  );
  process.stdout.write(
    `[direct-write-audit]   Reported, governed entity, DEPRECATED ALIAS: ${summary.totals.reportedAliasGovernedFiles}\n`
  );
  process.stdout.write(
    `[direct-write-audit]   Reported, ungoverned entity: ${summary.totals.reportedNoAliasUngovernedFiles}\n`
  );
  process.stdout.write(
    `[direct-write-audit]   Reported & in bypasses.json: ${summary.totals.reportedBypassedFiles}\n`
  );
  process.stdout.write(
    `[direct-write-audit] Governed entity model keys (camel + snake forms): ${summary.totals.governedEntityModelKeys}\n`
  );
  process.stdout.write(`[direct-write-audit] JSON: ${path.relative(ROOT, JSON_OUT)}\n`);
  process.stdout.write(`[direct-write-audit] MD:   ${path.relative(ROOT, MD_OUT)}\n`);

  if (opts.strict) {
    // Strict = any governed-entity hit that is neither in an alias shim
    // nor covered by a bypass entry.
    const violations = reportedNoAliasGoverned.length;
    if (violations > 0) {
      process.stdout.write(
        `[direct-write-audit] STRICT: ${violations} governed-entity file(s) reported without a bypass or alias. Exiting 1.\n`
      );
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error("[direct-write-audit] Fatal:", err);
  process.exit(2);
});
