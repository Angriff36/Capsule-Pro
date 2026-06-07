#!/usr/bin/env node
/**
 * audit-ir-drift.mjs — Semantic IR-level drift detection
 *
 * Compares the current compiled IR against a baseline using the upstream
 * @angriff36/manifest ir-diff and breaking-change engines. Produces a
 * structured report classifying each change as compatible / deprecated /
 * breaking, and exits with code 1 when unacknowledged breaking changes are
 * found (or any change in --strict mode).
 *
 * Usage:
 *   node manifest/scripts/audit-ir-drift.mjs                      # report only
 *   node manifest/scripts/audit-ir-drift.mjs --strict              # CI gate: fail on any change
 *   node manifest/scripts/audit-ir-drift.mjs --baseline <path>     # custom baseline IR file
 *   node manifest/scripts/audit-ir-drift.mjs --ack-file <path>     # custom ack file
 *
 * pnpm scripts:
 *   manifest:audit-ir-drift         # report only
 *   manifest:audit-ir-drift:strict  # CI gate mode
 */

import { execSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  unlinkSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");
const REPORTS_DIR = resolve(PROJECT_ROOT, "manifest/reports/ir-drift");
const DEFAULT_IR_PATH = resolve(PROJECT_ROOT, "manifest/ir/kitchen.ir.json");
const DEFAULT_ACK_PATH = resolve(
  PROJECT_ROOT,
  "manifest/governance/breaking-change-acks.json"
);

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const strict = argv.includes("--strict");

function getArgValue(flag) {
  const idx = argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= argv.length) return null;
  return argv[idx + 1];
}

const baselinePath = getArgValue("--baseline");
const ackFilePath = getArgValue("--ack-file") || DEFAULT_ACK_PATH;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function loadJSON(filePath, label) {
  if (!existsSync(filePath)) {
    console.error(`  ERROR: ${label} file not found: ${filePath}`);
    process.exit(1);
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (err) {
    console.error(`  ERROR: Failed to parse ${label} file: ${filePath}`);
    console.error(`    ${err.message}`);
    process.exit(1);
  }
}

function loadGitBaseline() {
  const tmpFile = join(tmpdir(), `ir-baseline-${Date.now()}.json`);
  try {
    // Pipe to temp file to avoid ENOBUFS on large IR files (Windows)
    execSync(
      `git show HEAD:manifest/ir/kitchen.ir.json > "${tmpFile}"`,
      { cwd: PROJECT_ROOT, encoding: "utf8", timeout: 30000, shell: true }
    );
    const raw = readFileSync(tmpFile, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    // May be untracked or first commit — fall back to self-comparison
    console.log("  Note: Could not load git HEAD baseline (file may be untracked).");
    console.log("        Comparing current IR against itself (expect zero changes).");
    return null;
  } finally {
    try { if (existsSync(tmpFile)) unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("IR semantic drift detection");
  console.log("Mode:", strict ? "STRICT (exit 1 on any change)" : "REPORT (exit 1 on unacknowledged breaking)");

  // 1. Load current IR
  console.log("\n[1/5] Loading current IR...");
  const currentIR = loadJSON(DEFAULT_IR_PATH, "Current IR");
  const entityCount = Object.keys(currentIR.entities || {}).length;
  const commandCount = Object.keys(currentIR.commands || {}).length;
  console.log(`  Loaded: ${entityCount} entities, ${commandCount} commands`);

  // 2. Load baseline IR
  console.log("\n[2/5] Loading baseline IR...");
  let baselineIR;
  if (baselinePath) {
    console.log(`  Baseline: ${baselinePath}`);
    baselineIR = loadJSON(baselinePath, "Baseline");
  } else {
    console.log("  Baseline: git HEAD version");
    baselineIR = loadGitBaseline();
    if (baselineIR === null) {
      baselineIR = currentIR;
    }
  }

  // 3. Import upstream diff + classify
  console.log("\n[3/5] Running IR diff...");
  let diffIR, classifyBreakingChanges;
  try {
    const irDiffMod = await import("@angriff36/manifest/ir-diff");
    diffIR = irDiffMod.diffIR;
    if (typeof diffIR !== "function") {
      // Try default export or named variants
      diffIR = irDiffMod.default?.diffIR || irDiffMod.default;
    }
  } catch (err) {
    console.error("  ERROR: Could not import @angriff36/manifest/ir-diff");
    console.error(`    ${err.message}`);
    console.error("  Ensure @angriff36/manifest@2.2.0+ is installed.");
    process.exit(1);
  }

  try {
    const bcMod = await import("@angriff36/manifest/breaking-change");
    classifyBreakingChanges = bcMod.classifyBreakingChanges;
    if (typeof classifyBreakingChanges !== "function") {
      classifyBreakingChanges = bcMod.default?.classifyBreakingChanges || bcMod.default;
    }
  } catch (err) {
    console.error("  ERROR: Could not import @angriff36/manifest/breaking-change");
    console.error(`    ${err.message}`);
    console.error("  Ensure @angriff36/manifest@2.2.0+ is installed.");
    process.exit(1);
  }

  if (typeof diffIR !== "function") {
    console.error("  ERROR: diffIR is not a function. Got:", typeof diffIR);
    process.exit(1);
  }
  if (typeof classifyBreakingChanges !== "function") {
    console.error("  ERROR: classifyBreakingChanges is not a function. Got:", typeof classifyBreakingChanges);
    process.exit(1);
  }

  // 4. Compute diff and classify
  const diffReport = diffIR(baselineIR, currentIR);
  console.log("  Diff computed:", diffReport.summary.hasChanges ? "CHANGES DETECTED" : "NO CHANGES");

  // Load acknowledgments
  let ackFile = undefined;
  if (existsSync(ackFilePath)) {
    try {
      const raw = JSON.parse(readFileSync(ackFilePath, "utf8"));
      // Support both { version, acknowledged } and plain array formats
      if (Array.isArray(raw)) {
        ackFile = { version: 1, acknowledged: raw };
      } else if (raw.acknowledged) {
        ackFile = raw;
      }
      console.log(`  Loaded ${ackFile.acknowledged.length} acknowledged changes`);
    } catch {
      console.log("  Warning: Could not parse ack file, treating as empty");
    }
  }

  const classified = classifyBreakingChanges(diffReport, ackFile);

  // 5. Report
  console.log("\n[4/5] Classification results:");
  console.log("  Total changes:", classified.summary.total);
  console.log("    Compatible:", classified.summary.compatible);
  console.log("    Deprecated:", classified.summary.deprecated);
  console.log("    Breaking:", classified.summary.breaking);

  if (classified.summary.breaking > 0) {
    console.log("\n  BREAKING CHANGES:");
    for (const change of classified.classified.filter(
      (c) => c.severity === "breaking"
    )) {
      console.log(`    [${change.category}] ${change.path}`);
      console.log(`      ${change.description}`);
      if (change.consumerImpact.length > 0) {
        console.log(`      Impact: ${change.consumerImpact.join(", ")}`);
      }
    }
  }

  if (classified.summary.deprecated > 0) {
    console.log("\n  DEPRECATED CHANGES:");
    for (const change of classified.classified.filter(
      (c) => c.severity === "deprecated"
    )) {
      console.log(`    [${change.category}] ${change.path}`);
      console.log(`      ${change.description}`);
    }
  }

  if (classified.summary.compatible > 0) {
    console.log("\n  COMPATIBLE CHANGES:");
    for (const change of classified.classified.filter(
      (c) => c.severity === "compatible"
    )) {
      console.log(`    [${change.category}] ${change.path}`);
    }
  }

  // Acknowledgment status
  if (classified.unacknowledged.length > 0) {
    console.log(
      `\n  UNACKNOWLEDGED BREAKING: ${classified.unacknowledged.length}`
    );
    for (const change of classified.unacknowledged) {
      console.log(`    ${change.path} (${change.category})`);
    }
    console.log(
      `\n  To acknowledge, add entries to ${ackFilePath}`
    );
  } else if (classified.summary.breaking > 0) {
    console.log(
      `\n  All ${classified.summary.breaking} breaking changes are acknowledged.`
    );
  }

  // Consumer impact summary
  const impact = classified.consumerImpact;
  const hasImpact =
    impact.commands.length > 0 ||
    impact.routes.length > 0 ||
    impact.projections.length > 0;
  if (hasImpact) {
    console.log("\n  CONSUMER IMPACT:");
    if (impact.commands.length > 0) {
      console.log(`    Commands: ${impact.commands.join(", ")}`);
    }
    if (impact.routes.length > 0) {
      console.log(`    Routes: ${impact.routes.join(", ")}`);
    }
    if (impact.projections.length > 0) {
      console.log(`    Projections: ${impact.projections.join(", ")}`);
    }
  }

  // Write JSON report
  console.log("\n[5/5] Writing report...");
  if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });

  const report = {
    timestamp: new Date().toISOString(),
    mode: strict ? "strict" : "report",
    baseline: baselinePath || "git:HEAD:manifest/ir/kitchen.ir.json",
    current: DEFAULT_IR_PATH,
    diffSummary: diffReport.summary,
    classified: classified,
    exitCode: 0,
  };

  // Determine exit code
  const shouldFail =
    strict
      ? classified.summary.total > 0
      : classified.unacknowledged.length > 0;

  report.exitCode = shouldFail ? 1 : 0;

  const reportPath = resolve(REPORTS_DIR, "ir-drift.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`  Report: ${reportPath}`);

  // Final verdict
  console.log("\n---");
  if (shouldFail) {
    if (strict) {
      console.log(
        `FAIL (strict): ${classified.summary.total} total change(s) detected.`
      );
    } else {
      console.log(
        `FAIL: ${classified.unacknowledged.length} unacknowledged breaking change(s).`
      );
    }
    process.exit(1);
  } else {
    if (classified.summary.total === 0) {
      console.log("PASS: No IR changes detected.");
    } else if (classified.summary.breaking === 0) {
      console.log(
        `PASS: ${classified.summary.total} compatible change(s), 0 breaking.`
      );
    } else {
      console.log(
        `PASS: ${classified.summary.breaking} breaking change(s) all acknowledged.`
      );
    }
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(2);
});
