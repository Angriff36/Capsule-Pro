#!/usr/bin/env node

/**
 * check-schema-drift.mjs -- Phase 3 of the Manifest Automation initiative.
 *
 * GENERATED-SCHEMA DRIFT GATE.
 *
 * WHY THIS EXISTS (the important part):
 *   Phase 2 made `manifest/ir/generated-schema.prisma` a faithful IR -> Prisma
 *   projection (it `prisma validate`s clean). But a *generated* artifact is only
 *   trustworthy if it is regenerated whenever its inputs change. Without a gate,
 *   the committed artifact silently rots the moment anyone edits a `.manifest`
 *   source, the IR, or the live `schema.prisma` (the derive step reads it) and
 *   forgets to re-run `pnpm manifest:schema:full`. That rot is not hypothetical:
 *   when this gate was first authored the committed artifacts were ~350 lines
 *   stale vs regeneration (post the v0.12.212-243 IR type-fixes + 2.4.0 upgrade).
 *
 *   This gate enforces exit-criterion #3 of phase-out-registry.md ("re-running
 *   generation produces no diff against committed artifacts") for the schema
 *   projection, mirroring the repo's existing generated-artifact discipline
 *   (route drift gate, IR validate gate). It does NOT touch the live
 *   `packages/database/prisma/schema.prisma` -- the generated schema remains a
 *   validation/reference artifact (full hand-schema replacement is Phase 2b,
 *   blocked on modeling back-relations in source -- see notes.md S14).
 *
 * WHAT IT CHECKS:
 *   Regenerates BOTH committed generated artifacts via the production scripts
 *   (`derive-prisma-options.mjs` + `generate-full-schema.mjs` -- no logic is
 *   duplicated, so the gate can never diverge from the generator), then compares
 *   byte-for-byte against the committed copies:
 *     - manifest/scripts/prisma-options.generated.json  (derived options bag)
 *     - manifest/ir/generated-schema.prisma             (projected schema)
 *   The generators write in place, so the committed files are backed up first and
 *   ALWAYS restored in a `finally` -- the working tree is left exactly as found,
 *   pass or fail.
 *
 * EXIT CODES: 0 = in sync; 1 = drift detected (or generation failed).
 *
 * USAGE:
 *   node manifest/scripts/check-schema-drift.mjs            # the CI gate
 *   node manifest/scripts/check-schema-drift.mjs --self-test  # verify diff logic
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

const ARTIFACTS = [
  {
    label: "prisma-options.generated.json",
    path: resolve(__dirname, "prisma-options.generated.json"),
  },
  {
    label: "generated-schema.prisma",
    path: resolve(PROJECT_ROOT, "manifest/ir/generated-schema.prisma"),
  },
];

const DERIVE_SCRIPT = resolve(__dirname, "derive-prisma-options.mjs");
const GENERATE_SCRIPT = resolve(__dirname, "generate-full-schema.mjs");

// ---------------------------------------------------------------------------
// Pure comparison helper (covered by --self-test)
// ---------------------------------------------------------------------------
/**
 * Compare two strings line-by-line.
 * @returns {{ inSync: boolean, firstDiffLine: number|null, committedLines: number, regeneratedLines: number, diffLineCount: number }}
 */
export function diffText(committed, regenerated) {
  if (committed === regenerated) {
    const lines = committed.split("\n").length;
    return {
      inSync: true,
      firstDiffLine: null,
      committedLines: lines,
      regeneratedLines: lines,
      diffLineCount: 0,
    };
  }
  const a = committed.split("\n");
  const b = regenerated.split("\n");
  let firstDiffLine = null;
  let diffLineCount = 0;
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i] !== b[i]) {
      if (firstDiffLine === null) {
        firstDiffLine = i + 1; // 1-based
      }
      diffLineCount++;
    }
  }
  return {
    inSync: false,
    firstDiffLine,
    committedLines: a.length,
    regeneratedLines: b.length,
    diffLineCount,
  };
}

// ---------------------------------------------------------------------------
// Self-test mode
// ---------------------------------------------------------------------------
function runSelfTest() {
  const cases = [];
  const assert = (name, cond) => cases.push({ name, pass: !!cond });

  const base = "model A {\n  id String @id\n}\n";

  // 1. identical input -> in sync
  let r = diffText(base, base);
  assert("identical -> inSync=true", r.inSync === true);
  assert("identical -> firstDiffLine=null", r.firstDiffLine === null);
  assert("identical -> diffLineCount=0", r.diffLineCount === 0);

  // 2. single-line change -> detected at the right line
  const changed = "model A {\n  id Int @id\n}\n";
  r = diffText(base, changed);
  assert("1-line change -> inSync=false", r.inSync === false);
  assert("1-line change -> firstDiffLine=2", r.firstDiffLine === 2);
  assert("1-line change -> diffLineCount=1", r.diffLineCount === 1);

  // 3. appended content (length grows) -> detected
  const appended = base + "model B {\n  id String @id\n}\n";
  r = diffText(base, appended);
  assert("append -> inSync=false", r.inSync === false);
  assert(
    "append -> regeneratedLines>committedLines",
    r.regeneratedLines > r.committedLines
  );

  // 4. removed content (length shrinks) -> detected
  r = diffText(appended, base);
  assert("remove -> inSync=false", r.inSync === false);
  assert(
    "remove -> committedLines>regeneratedLines",
    r.committedLines > r.regeneratedLines
  );

  // 5. empty vs non-empty
  r = diffText("", base);
  assert("empty vs content -> inSync=false", r.inSync === false);

  const passed = cases.filter((c) => c.pass).length;
  for (const c of cases) {
    console.log(`  ${c.pass ? "PASS" : "FAIL"}  ${c.name}`);
  }
  console.log(`\nself-test: ${passed}/${cases.length} passed`);
  process.exit(passed === cases.length ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Drift-gate mode
// ---------------------------------------------------------------------------
function runGate() {
  console.log(
    "Schema drift gate -- regenerating IR-derived Prisma artifacts...\n"
  );

  // Snapshot the committed artifacts so we can restore them no matter what.
  const backups = ARTIFACTS.map((a) => ({
    ...a,
    committed: readFileSync(a.path, "utf8"),
  }));

  let drift = false;

  try {
    // Regenerate via the production scripts (they write the artifacts in place).
    // execFileSync throws on non-zero exit -> caught below and treated as failure.
    execFileSync(process.execPath, [DERIVE_SCRIPT], {
      cwd: PROJECT_ROOT,
      stdio: ["ignore", "ignore", "inherit"],
    });
    execFileSync(process.execPath, [GENERATE_SCRIPT], {
      cwd: PROJECT_ROOT,
      stdio: ["ignore", "ignore", "inherit"],
    });

    for (const b of backups) {
      const regenerated = readFileSync(b.path, "utf8");
      const result = diffText(b.committed, regenerated);
      if (result.inSync) {
        console.log(
          `  OK    ${b.label} (${result.committedLines} lines, in sync)`
        );
      } else {
        drift = true;
        console.log(
          `  DRIFT ${b.label} -- first diff at line ${result.firstDiffLine}; ` +
            `${result.diffLineCount} line(s) differ ` +
            `(committed ${result.committedLines} -> regenerated ${result.regeneratedLines})`
        );
      }
    }
  } catch (err) {
    console.error("\nSchema generation FAILED during drift check:");
    console.error(err.message || err);
    drift = true;
  } finally {
    // Always restore the committed artifacts -- leave the working tree untouched.
    for (const b of backups) {
      writeFileSync(b.path, b.committed);
    }
  }

  console.log("");
  if (drift) {
    console.error(
      "DRIFT DETECTED. The committed IR-derived schema artifacts are stale."
    );
    console.error(
      "Fix: run `pnpm manifest:schema:full` and commit the regenerated files:"
    );
    console.error("  - manifest/scripts/prisma-options.generated.json");
    console.error("  - manifest/ir/generated-schema.prisma");
    process.exit(1);
  }
  console.log("Generated schema artifacts are in sync with the IR. No drift.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
if (args.includes("--self-test")) {
  runSelfTest();
} else {
  runGate();
}
