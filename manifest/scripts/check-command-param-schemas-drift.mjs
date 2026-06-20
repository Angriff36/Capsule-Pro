#!/usr/bin/env node

/**
 * check-command-param-schemas-drift.mjs -- command-param Zod schemas DRIFT GATE.
 *
 * `manifest/runtime/src/generated/command-param-schemas.generated.ts` is a
 * committed, generated artifact: a pure function of the compiled IR
 * (`manifest/ir/kitchen.ir.json`) via the @angriff36/manifest ZodProjection
 * `zod.command` surface (see generate-command-param-schemas.mjs). The canonical
 * command dispatcher uses it as a pre-flight validation gate, so a stale file
 * silently lets malformed requests through (or rejects valid new params).
 *
 * Mirrors check-react-query-drift.mjs / check-openapi-drift.mjs: regenerate via
 * the PRODUCTION script (no generation logic duplicated here), compare byte-for-
 * byte against the committed copy, and ALWAYS restore the committed file in a
 * `finally` so the working tree is left exactly as found. The generator emits no
 * timestamp, so back-to-back runs are byte-identical.
 *
 * EXIT CODES: 0 = in sync; 1 = drift detected (or generation failed).
 *
 * USAGE:
 *   node manifest/scripts/check-command-param-schemas-drift.mjs              # CI gate
 *   node manifest/scripts/check-command-param-schemas-drift.mjs --self-test  # diff logic
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

const ARTIFACT = {
  label: "command-param-schemas.generated.ts",
  path: resolve(
    PROJECT_ROOT,
    "manifest/runtime/src/generated/command-param-schemas.generated.ts"
  ),
};

const GENERATE_SCRIPT = resolve(
  __dirname,
  "generate-command-param-schemas.mjs"
);

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
        firstDiffLine = i + 1;
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

function runSelfTest() {
  const cases = [];
  const assert = (name, cond) => cases.push({ name, pass: !!cond });
  const base = "// @generated\nexport const COMMAND_PARAM_SCHEMAS = {};\n";

  let r = diffText(base, base);
  assert("identical -> inSync=true", r.inSync === true);
  assert("identical -> diffLineCount=0", r.diffLineCount === 0);

  const changed =
    "// @generated\nexport const COMMAND_PARAM_SCHEMAS = { x: 1 };\n";
  r = diffText(base, changed);
  assert("1-line change -> inSync=false", r.inSync === false);
  assert("1-line change -> firstDiffLine=2", r.firstDiffLine === 2);

  const appended = `${base}// extra\n`;
  r = diffText(base, appended);
  assert(
    "append -> regenerated>committed",
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

function runGate() {
  console.log(
    "Command-param schemas drift gate -- regenerating IR-derived schemas...\n"
  );

  const committed = readFileSync(ARTIFACT.path, "utf8");
  let drift = false;

  try {
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
    console.error(
      "\nCommand-param schema generation FAILED during drift check:"
    );
    console.error(err.message || err);
    drift = true;
  } finally {
    writeFileSync(ARTIFACT.path, committed);
  }

  console.log("");
  if (drift) {
    console.error(
      "DRIFT DETECTED. The committed command-param schemas are stale vs the IR."
    );
    console.error(
      "Fix: run `pnpm manifest:command-schemas` and commit the regenerated file:"
    );
    console.error(
      "  - manifest/runtime/src/generated/command-param-schemas.generated.ts"
    );
    process.exit(1);
  }
  console.log("Command-param schemas are in sync with the IR. No drift.");
  process.exit(0);
}

const args = process.argv.slice(2);
if (args.includes("--self-test")) {
  runSelfTest();
} else {
  runGate();
}
