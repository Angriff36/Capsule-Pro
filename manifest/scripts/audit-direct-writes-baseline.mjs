#!/usr/bin/env node

/**
 * Baseline-and-block-new wrapper around the Capsule-local direct-write audit.
 *
 * Constitution §2 ("Any domain mutation … MUST execute through `RuntimeEngine.runCommand`")
 * says new direct writes against governed entities are forbidden. Existing debt
 * is tracked in `manifest/governance/baselines/direct-writes.json`. This wrapper
 * runs the audit, compares against the baseline, prints counts, and exits non-zero
 * when a NEW (file, governedEntity, method) triple appears.
 *
 * Baseline key
 * ------------
 * Each baseline entry is a `(file, entity, method)` triple, where:
 *   - file    — repo-relative POSIX path
 *   - entity  — governed entity name from manifest/governance/entities.json
 *   - method  — one of: create, update, delete, upsert, createMany,
 *               updateMany, deleteMany
 *
 * Catches:
 *   - new file with any governed write
 *   - existing file gaining a write against a new entity
 *   - existing file/entity gaining a new write method (e.g. add `delete`
 *     where only `create` was baselined)
 *
 * Does NOT catch (acknowledged gap):
 *   - duplicate calls of an already-baselined (file, entity, method) triple
 *     (e.g. a second `database.Event.create(...)` added to a file that already
 *     has one).
 *
 * TODO: tighter key. Two practical next steps if the gap above proves real:
 *   1. Add a per-triple `count`: store `{file, entity, method, count}` and fail
 *      when current count > baseline count. Trips on legitimate refactors
 *      (splitting one call into two) — false-positive prone but tight.
 *   2. Add a normalized-snippet hash per hit: SHA over the line with leading/
 *      trailing whitespace stripped and internal whitespace collapsed. Catches
 *      every distinct call site; breaks on formatting changes and comment
 *      edits. Use only if false-positive rate is acceptable.
 * Both require schema migration of the baseline JSON. Skip until needed.
 *
 * Line number is INTENTIONALLY NOT in the key — line numbers churn on edits
 * above the hit.
 *
 * Baseline shape (manifest/governance/baselines/direct-writes.json):
 *   {
 *     "generatedAt": "2026-...",
 *     "capturedFromReport": "manifest/reports/direct-writes/direct-writes.json",
 *     "keyShape": ["file", "entity", "method"],
 *     "count": N,
 *     "violations": [
 *       { "file": "...", "entity": "...", "method": "create" },
 *       ...
 *     ]
 *   }
 *
 * Flags:
 *   --save-baseline   Overwrite the baseline with the current report and exit 0.
 *                     Use ONLY when you intentionally accept a new set of findings
 *                     (e.g. just migrated a file off the list).
 *   --report <path>   Override the input report path.
 *   --baseline <path> Override the baseline path.
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
  reportPath: path.join(
    ROOT,
    "manifest",
    "reports",
    "direct-writes",
    "direct-writes.json"
  ),
  baselinePath: path.join(
    ROOT,
    "manifest",
    "governance",
    "baselines",
    "direct-writes.json"
  ),
};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--save-baseline") {
    opts.saveBaseline = true;
  } else if (a === "--report") {
    opts.reportPath = path.resolve(args[++i]);
  } else if (a === "--baseline") {
    opts.baselinePath = path.resolve(args[++i]);
  } else if (a === "-h" || a === "--help") {
    console.log(
      "Usage: node scripts/manifest/audit-direct-writes-baseline.mjs [--save-baseline] [--report path] [--baseline path]"
    );
    process.exit(0);
  }
}

// Key separator. None of file/entity/method can contain "|" in this repo.
const KEY_SEP = "|";

function packKey(file, entity, method) {
  return [file, entity, method].join(KEY_SEP);
}
function unpackKey(k) {
  const [file, entity, method] = k.split(KEY_SEP);
  return { file, entity, method };
}

// 1. Run the underlying audit so the report on disk is fresh.
const audit = spawnSync(
  "node",
  [path.join(__dirname, "audit-direct-writes.mjs")],
  { cwd: ROOT, stdio: ["ignore", "inherit", "inherit"] }
);
if (audit.status !== 0) {
  console.error(
    "[direct-write-baseline] Underlying audit exited non-zero; aborting."
  );
  process.exit(audit.status ?? 2);
}

// 2. Read the report.
const reportRaw = await fs.readFile(opts.reportPath, "utf-8");
const report = JSON.parse(reportRaw);

// 3. Extract the violation set: (file, governedEntity, method) triples from
//    files in the "reported, governed entity, no alias, no bypass" bucket.
function buildViolationSet(rep) {
  const set = new Set();
  for (const f of rep.findings || []) {
    if (f.classification !== "reported") {
      continue;
    }
    if (f.bypassed) {
      continue;
    }
    if (f.deprecatedAlias) {
      continue;
    }
    if (!f.touchesGovernedEntity) {
      continue;
    }
    for (const h of f.hits || []) {
      if (!h.governedEntity) {
        continue;
      }
      if (!h.method) {
        continue;
      }
      set.add(packKey(f.file, h.governedEntity, h.method));
    }
  }
  return set;
}

const currentSet = buildViolationSet(report);

// 4. Save baseline if requested and exit.
if (opts.saveBaseline) {
  const violations = Array.from(currentSet)
    .map(unpackKey)
    .sort((a, b) => {
      if (a.file !== b.file) {
        return a.file.localeCompare(b.file);
      }
      if (a.entity !== b.entity) {
        return a.entity.localeCompare(b.entity);
      }
      return a.method.localeCompare(b.method);
    });
  const baseline = {
    generatedAt: new Date().toISOString(),
    capturedFromReport: path
      .relative(ROOT, opts.reportPath)
      .split(path.sep)
      .join("/"),
    keyShape: ["file", "entity", "method"],
    note:
      "Baseline of Capsule-local direct-write audit findings. Each entry is a " +
      "(file, governedEntity, method) triple currently in the 'reported, governed, " +
      "no alias, no bypass' bucket. New triples are blocked by " +
      "scripts/manifest/audit-direct-writes-baseline.mjs. Regenerate ONLY after " +
      "intentionally migrating or bypassing a finding.",
    count: violations.length,
    violations,
  };
  await fs.mkdir(path.dirname(opts.baselinePath), { recursive: true });
  await fs.writeFile(
    opts.baselinePath,
    JSON.stringify(baseline, null, 2) + "\n"
  );
  console.log(
    `[direct-write-baseline] Saved baseline with ${baseline.count} (file, entity, method) triple(s) to ${path.relative(ROOT, opts.baselinePath)}`
  );
  process.exit(0);
}

// 5. Load baseline.
if (!existsSync(opts.baselinePath)) {
  console.error(
    `[direct-write-baseline] Baseline not found at ${path.relative(ROOT, opts.baselinePath)}. Run with --save-baseline to capture one.`
  );
  process.exit(2);
}
const baselineDoc = JSON.parse(await fs.readFile(opts.baselinePath, "utf-8"));
const baselineSet = new Set(
  (baselineDoc.violations || [])
    .filter((v) => v.file && v.entity && v.method)
    .map((v) => packKey(v.file, v.entity, v.method))
);

// 6. Diff: anything in current that's not in baseline.
const newFindings = [];
for (const k of currentSet) {
  if (!baselineSet.has(k)) {
    newFindings.push(unpackKey(k));
  }
}
newFindings.sort((a, b) => {
  if (a.file !== b.file) {
    return a.file.localeCompare(b.file);
  }
  if (a.entity !== b.entity) {
    return a.entity.localeCompare(b.entity);
  }
  return a.method.localeCompare(b.method);
});

// 7. Resolved entries (in baseline but no longer current) — informational only.
const resolved = [];
for (const k of baselineSet) {
  if (!currentSet.has(k)) {
    resolved.push(unpackKey(k));
  }
}

// 8. Output + exit.
console.log("");
console.log("[direct-write-baseline] Constitution §2 direct-write debt report");
console.log(
  `  Baseline (file, entity, method) triple count : ${baselineDoc.count}`
);
console.log(
  `  Current  (file, entity, method) triple count : ${currentSet.size}`
);
console.log(
  `  New since baseline                            : ${newFindings.length}`
);
console.log(
  `  Resolved since baseline                       : ${resolved.length}`
);

if (resolved.length > 0) {
  console.log("");
  console.log(
    "[direct-write-baseline] Resolved (regenerate baseline with --save-baseline to drop these):"
  );
  for (const v of resolved.slice(0, 20)) {
    console.log(`  ${v.file}  [${v.entity}.${v.method}]`);
  }
  if (resolved.length > 20) {
    console.log(`  ...and ${resolved.length - 20} more.`);
  }
}

if (newFindings.length > 0) {
  console.log("");
  console.log(
    "[direct-write-baseline] ::error::NEW direct-write violations not in baseline:"
  );
  for (const v of newFindings) {
    console.log(`  ${v.file}  [${v.entity}.${v.method}]`);
  }
  console.log("");
  console.log(
    "Constitution §2: governed-entity writes MUST go through RuntimeEngine.runCommand. " +
      "Migrate the write to a Manifest command, convert the route to a documented " +
      "DEPRECATED ALIAS with an in-file blocker, or add a bypass entry in " +
      "manifest/governance/bypasses.json with a real `whyRuntimeNotRequired`."
  );
  process.exit(1);
}

console.log("");
console.log("[direct-write-baseline] No new direct-write violations. ✓");
process.exit(0);
