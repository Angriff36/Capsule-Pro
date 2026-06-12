#!/usr/bin/env node
/**
 * audit-route-drift.mjs — Task 0.5: Route regen-diff harness
 *
 * Regenerates all Manifest routes and checks for drift against committed files.
 * Per constitution §10/§16: generated routes ("DO NOT EDIT") must be derivable
 * from the IR by running `pnpm manifest:generate`. Any drift indicates either
 * the generator changed or a generated file was hand-edited.
 *
 * The NextJsProjection emits list routes (nextjs.route), detail routes
 * (nextjs.detail), and a canonical dispatcher (nextjs.dispatcher). This script
 * verifies all generated surfaces remain consistent with the committed IR.
 *
 * Usage:
 *   node manifest/scripts/audit-route-drift.mjs          # report only
 *   node manifest/scripts/audit-route-drift.mjs --strict  # exit 1 on drift
 *
 * pnpm scripts:
 *   manifest:audit-route-drift         # report only
 *   manifest:audit-route-drift:strict  # exit 1 on drift (CI gate)
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");
const REPORTS_DIR = resolve(PROJECT_ROOT, "manifest/reports/route-drift");

const strict = process.argv.includes("--strict");

// ---------------------------------------------------------------------------
// 1. Snapshot current generated route file hashes
// ---------------------------------------------------------------------------
console.log("Route regen-diff harness (Task 0.5)");
console.log("Mode:", strict ? "STRICT (exit 1 on drift)" : "REPORT ONLY");

console.log("\n[1/4] Snapshotting current generated route hashes...");

const generatedFiles = execSync('grep -rl "DO NOT EDIT" apps/api/app/api/', {
  cwd: PROJECT_ROOT,
  encoding: "utf8",
  timeout: 30_000,
})
  .trim()
  .split("\n")
  .filter(Boolean);

console.log("  Found", generatedFiles.length, "generated route files");

const snapshot = {};
for (const file of generatedFiles) {
  try {
    const hash = execSync(`git hash-object "${file}"`, {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      timeout: 5000,
    }).trim();
    snapshot[file] = hash;
  } catch {
    // File may be untracked — skip
  }
}

// ---------------------------------------------------------------------------
// 2. Run route generator
// ---------------------------------------------------------------------------
console.log("\n[2/4] Running pnpm manifest:generate...");
try {
  execSync("node manifest/scripts/generate.mjs", {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    timeout: 120_000,
    stdio: "pipe",
  });
  console.log("  Generator completed successfully");
} catch (err) {
  console.error("  ERROR: Generator failed!");
  console.error("  ", (err.stderr || err.message).substring(0, 500));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 3. Compare generated output against snapshot
// ---------------------------------------------------------------------------
console.log("\n[3/4] Comparing generated output against committed files...");

const driftResults = {
  timestamp: new Date().toISOString(),
  strict,
  totalGenerated: generatedFiles.length,
  drifted: [],
  added: [],
  removed: [],
  unchanged: 0,
};

for (const file of generatedFiles) {
  try {
    const hashAfter = execSync(`git hash-object "${file}"`, {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      timeout: 5000,
    }).trim();
    const hashBefore = snapshot[file];
    if (hashBefore && hashAfter !== hashBefore) {
      driftResults.drifted.push({ file, hashBefore, hashAfter });
    } else {
      driftResults.unchanged++;
    }
  } catch {
    driftResults.removed.push(file);
  }
}

// Check for newly-generated files
const generatedAfter = execSync(
  'grep -rl "DO NOT EDIT" apps/api/app/api/ 2>/dev/null || true',
  { cwd: PROJECT_ROOT, encoding: "utf8", timeout: 30_000 }
)
  .trim()
  .split("\n")
  .filter(Boolean);

const originalSet = new Set(generatedFiles);
for (const file of generatedAfter) {
  if (!originalSet.has(file)) {
    driftResults.added.push(file);
  }
}

// ---------------------------------------------------------------------------
// 4. Report results
// ---------------------------------------------------------------------------
console.log("\n[4/4] Results:");
console.log("  Total generated files:", generatedFiles.length);
console.log("  Unchanged:", driftResults.unchanged);
console.log("  Drifted:", driftResults.drifted.length);
console.log("  Added:", driftResults.added.length);
console.log("  Removed:", driftResults.removed.length);

const hasDrift =
  driftResults.drifted.length > 0 ||
  driftResults.added.length > 0 ||
  driftResults.removed.length > 0;

if (hasDrift) {
  console.log("\n  ⚠ DRIFT DETECTED:");
  for (const d of driftResults.drifted.slice(0, 20)) {
    console.log("    CHANGED:", d.file);
  }
  for (const d of driftResults.added.slice(0, 20)) {
    console.log("    ADDED:", d);
  }
  for (const d of driftResults.removed.slice(0, 20)) {
    console.log("    REMOVED:", d);
  }
  if (driftResults.drifted.length > 20) {
    console.log(
      "    ... and",
      driftResults.drifted.length - 20,
      "more changed"
    );
  }
  console.log(
    "\n  Run 'pnpm manifest:generate' to regenerate, then commit changes."
  );
} else {
  console.log(
    "\n  ✅ No drift detected. Generated routes are consistent with IR."
  );
}

// Write report
if (!existsSync(REPORTS_DIR)) {
  mkdirSync(REPORTS_DIR, { recursive: true });
}
const reportPath = resolve(REPORTS_DIR, "route-drift.json");
writeFileSync(reportPath, JSON.stringify(driftResults, null, 2));
console.log("  Report:", reportPath);

if (strict && hasDrift) {
  console.log("\n  STRICT MODE: Exiting with error due to route drift.");
  process.exit(1);
}
