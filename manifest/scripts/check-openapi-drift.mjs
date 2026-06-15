#!/usr/bin/env node

/**
 * check-openapi-drift.mjs -- Generated-OpenAPI-spec DRIFT GATE.
 *
 * WHY THIS EXISTS (the important part):
 *   `manifest/api-docs/openapi.json` is a committed, *generated* artifact: a pure
 *   function of the compiled IR (`manifest/ir/kitchen.ir.json`) + the pinned
 *   `@angriff36/manifest` OpenApiProjection + the Capsule post-process in
 *   `generate-openapi.mjs`. It is served verbatim at `/api-docs` (Scalar UI) and
 *   consumed by the MCP server's `openapi` plugin, so a stale spec silently lies
 *   to every API consumer and AI tool about the live HTTP contract.
 *
 *   A generated artifact is only trustworthy if it is regenerated whenever its
 *   inputs change. Without a gate the committed spec rots the moment anyone edits
 *   a `.manifest` source / recompiles the IR / bumps the package and forgets to
 *   re-run `pnpm manifest:openapi`. That rot is NOT hypothetical: when this gate
 *   was authored the committed spec was ~1.6k lines stale vs regeneration (the IR
 *   had grown from ~1460 to 1474 paths / 210 entities / 1054 commands across the
 *   propagation work, but the spec was last regenerated 2026-06-14).
 *
 *   The OpenApiProjection generator deliberately emits NO `x-generated-at`
 *   timestamp (see generate-openapi.mjs) precisely so this byte-level git-diff
 *   gate is meaningful. This closes the constitution's projection-conformance
 *   requirement (§10: "output is deterministic from the same IR/config/package
 *   version") and §13's "generated surface drift against IR/runtime" CI check for
 *   the openapi projection -- mirroring the repo's existing schema + route drift
 *   gates (check-schema-drift.mjs, audit-route-drift.mjs).
 *
 * WHAT IT CHECKS:
 *   Regenerates the committed spec via the PRODUCTION script
 *   (`generate-openapi.mjs` -- no generation logic is duplicated here, so the gate
 *   can never diverge from the generator), then compares it byte-for-byte against
 *   the committed copy:
 *     - manifest/api-docs/openapi.json
 *   The generator writes in place, so the committed file is backed up first and
 *   ALWAYS restored in a `finally` -- the working tree is left exactly as found,
 *   pass or fail.
 *
 * EXIT CODES: 0 = in sync; 1 = drift detected (or generation failed).
 *
 * USAGE:
 *   node manifest/scripts/check-openapi-drift.mjs              # the CI gate
 *   node manifest/scripts/check-openapi-drift.mjs --self-test  # verify diff logic
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

const ARTIFACT = {
  label: "openapi.json",
  path: resolve(PROJECT_ROOT, "manifest/api-docs/openapi.json"),
};

const GENERATE_SCRIPT = resolve(__dirname, "generate-openapi.mjs");

// ---------------------------------------------------------------------------
// Pure comparison helper (covered by --self-test).
// Mirrors check-schema-drift.mjs's diffText -- intentionally kept local so this
// gate has no import-time side effects from the schema gate (which runs on load).
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

  const base = '{\n  "openapi": "3.1.0",\n  "paths": {}\n}\n';

  // 1. identical input -> in sync
  let r = diffText(base, base);
  assert("identical -> inSync=true", r.inSync === true);
  assert("identical -> firstDiffLine=null", r.firstDiffLine === null);
  assert("identical -> diffLineCount=0", r.diffLineCount === 0);

  // 2. single-line change -> detected at the right line
  const changed = '{\n  "openapi": "3.0.0",\n  "paths": {}\n}\n';
  r = diffText(base, changed);
  assert("1-line change -> inSync=false", r.inSync === false);
  assert("1-line change -> firstDiffLine=2", r.firstDiffLine === 2);
  assert("1-line change -> diffLineCount=1", r.diffLineCount === 1);

  // 3. appended content (length grows) -> detected
  const appended = `${base}{"extra":true}\n`;
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
  console.log("OpenAPI drift gate -- regenerating IR-derived spec...\n");

  // Snapshot the committed artifact so we can restore it no matter what.
  const committed = readFileSync(ARTIFACT.path, "utf8");

  let drift = false;

  try {
    // Regenerate via the production script (it writes the artifact in place).
    // execFileSync throws on non-zero exit -> caught below and treated as failure.
    execFileSync(process.execPath, [GENERATE_SCRIPT], {
      cwd: PROJECT_ROOT,
      stdio: ["ignore", "ignore", "inherit"],
    });

    const regenerated = readFileSync(ARTIFACT.path, "utf8");
    const result = diffText(committed, regenerated);
    if (result.inSync) {
      console.log(
        `  OK    ${ARTIFACT.label} (${result.committedLines} lines, in sync)`
      );
    } else {
      drift = true;
      console.log(
        `  DRIFT ${ARTIFACT.label} -- first diff at line ${result.firstDiffLine}; ` +
          `${result.diffLineCount} line(s) differ ` +
          `(committed ${result.committedLines} -> regenerated ${result.regeneratedLines})`
      );
    }
  } catch (err) {
    console.error("\nOpenAPI generation FAILED during drift check:");
    console.error(err.message || err);
    drift = true;
  } finally {
    // Always restore the committed artifact -- leave the working tree untouched.
    writeFileSync(ARTIFACT.path, committed);
  }

  console.log("");
  if (drift) {
    console.error(
      "DRIFT DETECTED. The committed OpenAPI spec is stale vs the IR."
    );
    console.error(
      "Fix: run `pnpm manifest:openapi` and commit the regenerated file:"
    );
    console.error("  - manifest/api-docs/openapi.json");
    process.exit(1);
  }
  console.log("OpenAPI spec is in sync with the IR. No drift.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
if (args.includes("--self-test")) {
  runSelfTest();
} else {
  runGate();
}
