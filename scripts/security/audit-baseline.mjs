#!/usr/bin/env node

/**
 * Baseline-and-block-new wrapper around `pnpm audit`.
 *
 * Capsule has 225 known CVEs at the moderate+ tier (mostly transitive deps
 * through @stripe/agent-toolkit, langchain, clerk-expo, etc.). Bumping the
 * full backlog in one PR is impractical. Per the project rule "do not keep
 * a blocking security job that every PR fails forever," this wrapper allows
 * existing advisories to pass while blocking any NEW (advisory, module) pair.
 *
 * Baseline key
 * ------------
 * `{ advisoryId, moduleName }` per advisory occurrence.
 *   - advisoryId: GitHub advisory ID (GHSA-xxxx-xxxx-xxxx) if present, else
 *     the npm advisory numeric id as a string.
 *   - moduleName: the vulnerable module name.
 *
 * Severities considered: moderate, high, critical. (low ignored, matching
 * the original `--audit-level moderate` policy.)
 *
 * Files:
 *   - Baseline: manifest/governance/baselines/pnpm-audit.json
 *   - Wrapper:  this file
 *
 * Flags:
 *   --save-baseline   Overwrite baseline with current advisory set + exit 0.
 *                     Use ONLY after intentionally accepting a new set
 *                     (e.g. just bumped a dep that introduces or removes a CVE).
 *   --baseline <path> Override baseline path.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");

const args = process.argv.slice(2);
const opts = {
  saveBaseline: false,
  baselinePath: path.join(
    ROOT,
    "manifest",
    "governance",
    "baselines",
    "pnpm-audit.json"
  ),
};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--save-baseline") {
    opts.saveBaseline = true;
  } else if (a === "--baseline") {
    opts.baselinePath = path.resolve(args[++i]);
  } else if (a === "-h" || a === "--help") {
    console.log(
      "Usage: node scripts/security/audit-baseline.mjs [--save-baseline] [--baseline path]"
    );
    process.exit(0);
  }
}

const SEP = "|";
const TRACKED_SEVERITIES = new Set(["moderate", "high", "critical"]);

function packKey(advisoryId, moduleName) {
  return [advisoryId, moduleName].join(SEP);
}
function unpackKey(k) {
  const [advisoryId, moduleName] = k.split(SEP);
  return { advisoryId, moduleName };
}

// 1. Run pnpm audit and capture JSON.
const audit = spawnSync(
  "pnpm",
  ["audit", "--audit-level", "moderate", "--json"],
  { cwd: ROOT, encoding: "utf-8", shell: true }
);
// pnpm audit exits non-zero when vulnerabilities are found at the level, which
// is the entire point. We only care that stdout is parseable JSON.
if (!(audit.stdout?.trim())) {
  console.error("[security-baseline] pnpm audit produced no output. Aborting.");
  if (audit.stderr) {
    console.error(audit.stderr);
  }
  process.exit(2);
}

let report;
try {
  report = JSON.parse(audit.stdout);
} catch (err) {
  console.error(
    "[security-baseline] Failed to parse pnpm audit JSON:",
    err.message
  );
  process.exit(2);
}

// 2. Build current set from report.advisories.
function buildAdvisorySet(rep) {
  const set = new Set();
  const advisories = rep?.advisories ?? {};
  for (const key of Object.keys(advisories)) {
    const a = advisories[key];
    if (!a) {
      continue;
    }
    const sev = (a.severity || "").toLowerCase();
    if (!TRACKED_SEVERITIES.has(sev)) {
      continue;
    }
    const advisoryId =
      a.github_advisory_id || (a.id == null ? null : String(a.id));
    const moduleName = a.module_name;
    if (!(advisoryId && moduleName)) {
      continue;
    }
    set.add(packKey(advisoryId, moduleName));
  }
  return set;
}

const currentSet = buildAdvisorySet(report);

// 3. Save baseline if requested.
if (opts.saveBaseline) {
  const advisories = Array.from(currentSet)
    .map(unpackKey)
    .sort((a, b) => {
      if (a.advisoryId !== b.advisoryId) {
        return a.advisoryId.localeCompare(b.advisoryId);
      }
      return a.moduleName.localeCompare(b.moduleName);
    });
  const baseline = {
    generatedAt: new Date().toISOString(),
    keyShape: ["advisoryId", "moduleName"],
    severities: Array.from(TRACKED_SEVERITIES),
    note:
      "Baseline of pnpm audit advisories at moderate+ severity. Each entry is " +
      "an (advisoryId, moduleName) pair currently in the dependency tree. New " +
      "advisories are blocked by scripts/security/audit-baseline.mjs. Regenerate " +
      "ONLY after intentionally bumping deps that change the advisory set.",
    count: advisories.length,
    advisories,
  };
  await fs.mkdir(path.dirname(opts.baselinePath), { recursive: true });
  await fs.writeFile(
    opts.baselinePath,
    `${JSON.stringify(baseline, null, 2)}\n`
  );
  console.log(
    `[security-baseline] Saved baseline with ${baseline.count} (advisoryId, moduleName) pair(s) to ${path.relative(ROOT, opts.baselinePath)}`
  );
  process.exit(0);
}

// 4. Load baseline.
if (!existsSync(opts.baselinePath)) {
  console.error(
    `[security-baseline] Baseline not found at ${path.relative(ROOT, opts.baselinePath)}. Run with --save-baseline.`
  );
  process.exit(2);
}
const baselineDoc = JSON.parse(await fs.readFile(opts.baselinePath, "utf-8"));
const baselineSet = new Set(
  (baselineDoc.advisories || [])
    .filter((v) => v.advisoryId && v.moduleName)
    .map((v) => packKey(v.advisoryId, v.moduleName))
);

// 5. Diff.
const newAdvisories = [];
for (const k of currentSet) {
  if (!baselineSet.has(k)) {
    newAdvisories.push(unpackKey(k));
  }
}
const resolved = [];
for (const k of baselineSet) {
  if (!currentSet.has(k)) {
    resolved.push(unpackKey(k));
  }
}
newAdvisories.sort((a, b) =>
  a.advisoryId === b.advisoryId
    ? a.moduleName.localeCompare(b.moduleName)
    : a.advisoryId.localeCompare(b.advisoryId)
);

// 6. Output.
console.log("");
console.log("[security-baseline] pnpm audit baseline report (moderate+)");
console.log(`  Baseline pair count : ${baselineDoc.count}`);
console.log(`  Current  pair count : ${currentSet.size}`);
console.log(`  New since baseline   : ${newAdvisories.length}`);
console.log(`  Resolved since base. : ${resolved.length}`);

if (resolved.length > 0) {
  console.log("");
  console.log(
    "[security-baseline] Resolved (regenerate baseline with --save-baseline to drop):"
  );
  for (const v of resolved.slice(0, 20)) {
    console.log(`  ${v.advisoryId}  [${v.moduleName}]`);
  }
  if (resolved.length > 20) {
    console.log(`  ...and ${resolved.length - 20} more.`);
  }
}

if (newAdvisories.length > 0) {
  console.log("");
  console.log("[security-baseline] ::error::NEW advisories not in baseline:");
  for (const v of newAdvisories) {
    console.log(`  ${v.advisoryId}  [${v.moduleName}]`);
  }
  console.log("");
  console.log(
    "A dependency change introduced a moderate+ advisory not present in the " +
      "baseline. Either: (a) bump the affected dep to a patched version, " +
      "(b) replace the dep, or (c) intentionally accept the advisory by " +
      "regenerating the baseline with `--save-baseline` and explain why in the PR."
  );
  process.exit(1);
}

console.log("");
console.log("[security-baseline] No new advisories. ✓");
process.exit(0);
