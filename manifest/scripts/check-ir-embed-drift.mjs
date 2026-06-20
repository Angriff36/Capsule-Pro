#!/usr/bin/env node

/**
 * check-ir-embed-drift.mjs -- Frozen-IR snapshot DRIFT GATE (vs the DSL sources).
 *
 * WHY THIS EXISTS:
 *   `apps/api/lib/manifest/kitchen.ir.generated.json` is a committed, generated
 *   artifact: a verbatim copy of the IR compiled from the `.manifest` DSL sources
 *   (manifest/scripts/embed-ir.mjs copies manifest/ir/kitchen.ir.json). The
 *   dispatcher imports it directly (apps/api/lib/manifest/frozen-ir.ts) to skip
 *   the filesystem/JSON.parse cost on every cold start. A stale snapshot means the
 *   API silently runs against an OLD IR -- wrong guards, missing commands, drifted
 *   semantics -- while the source IR has moved on. That is the exact failure this
 *   gate prevents.
 *
 * WHAT IT CHECKS:
 *   Recompiles the IR FROM the current DSL sources via the production
 *   `manifest/scripts/compile.mjs` (no compile logic is duplicated here, so the
 *   gate can never diverge from the compiler), then compares the freshly compiled
 *   `manifest/ir/kitchen.ir.json` byte-for-byte against the committed embedded
 *   snapshot. This verifies the snapshot matches the CURRENT DSL sources, not just
 *   the last-committed IR.
 *
 *   compile.mjs is deterministic (it reuses the prior `compiledAt` when sources
 *   are unchanged), so on a clean tree the recompile is a no-op on disk. The
 *   committed kitchen.ir.json is snapshotted and restored in a `finally` regardless,
 *   so the working tree is left exactly as found -- pass or fail.
 *
 * EXIT CODES: 0 = in sync; 1 = drift detected (or compilation failed).
 *
 * USAGE:
 *   node manifest/scripts/check-ir-embed-drift.mjs              # the CI gate
 *   node manifest/scripts/check-ir-embed-drift.mjs --self-test  # verify diff logic
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EMBED_TARGET, SOURCE_IR } from "./embed-ir.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMPILE_SCRIPT = resolve(__dirname, "compile.mjs");
const PROJECT_ROOT = resolve(__dirname, "../..");

// ---------------------------------------------------------------------------
// Pure comparison helper (covered by --self-test). Mirrors check-openapi-drift.
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

  const base = '{\n  "provenance": { "irHash": "abc" },\n  "entities": []\n}\n';

  let r = diffText(base, base);
  assert("identical -> inSync=true", r.inSync === true);
  assert("identical -> firstDiffLine=null", r.firstDiffLine === null);

  const changed =
    '{\n  "provenance": { "irHash": "xyz" },\n  "entities": []\n}\n';
  r = diffText(base, changed);
  assert("1-line change -> inSync=false", r.inSync === false);
  assert("1-line change -> firstDiffLine=2", r.firstDiffLine === 2);
  assert("1-line change -> diffLineCount=1", r.diffLineCount === 1);

  const appended = `${base}{"extra":true}\n`;
  r = diffText(base, appended);
  assert("append -> inSync=false", r.inSync === false);
  assert(
    "append -> regeneratedLines>committedLines",
    r.regeneratedLines > r.committedLines
  );

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
  console.log("Frozen-IR drift gate -- recompiling IR from DSL sources...\n");

  // Snapshot the committed embedded artifact and the committed source IR so we
  // can restore the source IR no matter what (the embedded copy is never written
  // by this gate -- only compared).
  const embedded = readFileSync(EMBED_TARGET, "utf8");
  const committedSourceIr = readFileSync(SOURCE_IR, "utf8");

  let drift = false;

  try {
    // Recompile the IR from DSL via the production compiler (writes in place).
    // execFileSync throws on non-zero exit -> caught below and treated as failure.
    execFileSync(process.execPath, [COMPILE_SCRIPT], {
      cwd: PROJECT_ROOT,
      stdio: ["ignore", "ignore", "inherit"],
    });

    const freshSourceIr = readFileSync(SOURCE_IR, "utf8");
    const result = diffText(embedded, freshSourceIr);
    if (result.inSync) {
      console.log(
        `  OK    kitchen.ir.generated.json (${result.committedLines} lines, in sync with DSL)`
      );
    } else {
      drift = true;
      console.log(
        `  DRIFT kitchen.ir.generated.json -- first diff at line ${result.firstDiffLine}; ` +
          `${result.diffLineCount} line(s) differ ` +
          `(embedded ${result.committedLines} -> compiled-from-DSL ${result.regeneratedLines})`
      );
    }
  } catch (err) {
    console.error("\nIR compilation FAILED during drift check:");
    console.error(err.message || err);
    drift = true;
  } finally {
    // Always restore the committed source IR -- leave the working tree untouched.
    writeFileSync(SOURCE_IR, committedSourceIr);
  }

  console.log("");
  if (drift) {
    console.error(
      "DRIFT DETECTED. The frozen IR snapshot in apps/api is stale vs the DSL sources."
    );
    console.error(
      "Fix: run `pnpm manifest:compile && pnpm manifest:ir:embed` and commit:"
    );
    console.error("  - manifest/ir/kitchen.ir.json");
    console.error("  - apps/api/lib/manifest/kitchen.ir.generated.json");
    process.exit(1);
  }
  console.log("Frozen IR snapshot is in sync with the DSL sources. No drift.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
if (args.includes("--self-test")) {
  runSelfTest();
} else {
  runGate();
}
