#!/usr/bin/env node
/**
 * Quarantine baseline gate.
 *
 * Fails CI if the number of `*.quarantine.test.ts` files in the repo
 * EXCEEDS the count in `ci/quarantine-baseline.json`. The only allowed
 * direction is DOWN: when a quarantined test is fixed, the file is
 * renamed back to `.test.ts` AND its entry is removed from the baseline.
 *
 * Does NOT enforce that the same files are quarantined — only the count
 * ceiling. Reviewers compare the file list change in PR review.
 *
 * Per `ci/DRAIN.md`, raising the baseline number is forbidden; a PR that
 * adds a new quarantined test without removing an existing one MUST be
 * rejected.
 *
 * Why count-only and not exact-match-only:
 *   - File renames inside the quarantine set (e.g. moving a kitchen
 *     subdirectory) shouldn't fail the gate as long as the count holds.
 *   - The baseline file's `files` array still records the exact identity
 *     of every quarantined test; reviewers diff against it manually.
 *
 * Exits 0 on PASS, 1 on FAIL.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const BASELINE_PATH = path.join(ROOT, "ci", "quarantine-baseline.json");

// 1. Read baseline.
const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf-8"));
const baselineCount = baseline.count;
const baselineSet = new Set(baseline.files);

// 2. Count current quarantined files via git ls-files (only tracked files).
const lsOut = execSync("git ls-files", { cwd: ROOT, encoding: "utf-8" });
const currentFiles = lsOut
  .split("\n")
  .map((f) => f.trim())
  .filter((f) => f.endsWith(".quarantine.test.ts"))
  .sort();
const currentSet = new Set(currentFiles);
const currentCount = currentFiles.length;

// 3. Diff.
const newlyAdded = currentFiles.filter((f) => !baselineSet.has(f));
const removed = baseline.files.filter((f) => !currentSet.has(f));

// 4. Report.
console.log("");
console.log("[quarantine-baseline] Test quarantine count report");
console.log(`  Baseline count : ${baselineCount}`);
console.log(`  Current  count : ${currentCount}`);
console.log(`  Newly added    : ${newlyAdded.length}`);
console.log(`  Removed        : ${removed.length}`);

if (removed.length > 0) {
  console.log("");
  console.log(
    "[quarantine-baseline] Removed files (good — these were retired or renamed):"
  );
  for (const f of removed.slice(0, 20)) {
    console.log(`  ${f}`);
  }
  if (removed.length > 20) {
    console.log(`  ...and ${removed.length - 20} more.`);
  }
}

if (newlyAdded.length > 0) {
  console.log("");
  console.log(
    "[quarantine-baseline] ::error::NEW quarantined files not in baseline:"
  );
  for (const f of newlyAdded) {
    console.log(`  ${f}`);
  }
  console.log("");
  console.log(
    "Adding a new quarantined test means quarantining a NEW failure into the " +
      "advisory bucket. Per ci/DRAIN.md the only allowed direction is DOWN: " +
      "fix tests and remove them from quarantine; do not add new ones. If a " +
      "new failure is unavoidable (e.g. a transient harness incompatibility " +
      "introduced by an upstream package bump), regenerate the baseline AND " +
      "justify in the PR body — but reviewers should challenge this."
  );
  process.exit(1);
}

if (currentCount > baselineCount) {
  // Defensive: even if no new identities, a count overrun is forbidden.
  console.log("");
  console.log(
    `[quarantine-baseline] ::error::Current count (${currentCount}) exceeds baseline (${baselineCount}). Update the baseline only if you can justify the regression.`
  );
  process.exit(1);
}

if (currentCount < baselineCount) {
  console.log("");
  console.log(
    `[quarantine-baseline] Count DROPPED ${baselineCount} → ${currentCount}. ` +
      "Retire the removed entries from ci/quarantine-baseline.json's `files` " +
      "array and `count` to make the new lower number the new ceiling. Run " +
      "`node ci/check-quarantine-baseline.mjs --save-baseline` to do that " +
      "automatically (when implemented), or edit by hand."
  );
}

console.log("");
console.log("[quarantine-baseline] No new quarantined tests. ✓");
process.exit(0);
