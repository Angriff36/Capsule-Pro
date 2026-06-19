#!/usr/bin/env node

/**
 * check-react-query-drift.mjs -- Generated-React-Query-hooks DRIFT GATE.
 *
 * WHY THIS EXISTS (the important part):
 *   `apps/app/app/lib/manifest-hooks.generated.ts` is a committed, *generated*
 *   artifact: a pure function of the compiled IR (`manifest/ir/kitchen.ir.json`)
 *   + the committed generated client (`manifest-client.generated.ts`, whose
 *   exported function names it reads) via `generate-react-query-hooks.mjs`. It
 *   exposes a TanStack Query hook (`use<Entity>List/Detail`,
 *   `use<Entity><Command>Mutation`) and a `queryKeys` factory for every entity
 *   and command in the IR, so a stale file silently hides hooks for new
 *   entities/commands (and offers dead hooks for removed ones) from every
 *   component that consumes it.
 *
 *   A generated artifact is only trustworthy if it is regenerated whenever its
 *   inputs change. Without a gate the committed hooks rot the moment anyone edits
 *   a `.manifest` source / recompiles the IR / regenerates the client and forgets
 *   to re-run `pnpm manifest:generate-hooks`. That rot is NOT hypothetical: when
 *   this gate was authored the committed file was ~13.3k lines out of sync vs
 *   regeneration (18,562 -> 19,326 lines), because the propagation work grew the
 *   IR to 210 entities / 1054 commands while the hooks were last regenerated days
 *   earlier.
 *
 *   The hooks generator deliberately emits NO timestamp (see
 *   generate-react-query-hooks.mjs -- the header is a fixed banner) precisely so
 *   this byte-level git-diff gate is meaningful and back-to-back runs are
 *   byte-identical. This closes the constitution's projection-conformance
 *   requirement (§10: "output is deterministic from the same IR/config/package
 *   version") and §13's "generated surface drift against IR/runtime" CI check for
 *   the react-query surface -- mirroring the repo's existing schema, openapi, and
 *   route drift gates (check-schema-drift.mjs, check-openapi-drift.mjs,
 *   audit-route-drift.mjs).
 *
 * WHAT IT CHECKS:
 *   Regenerates the committed hooks via the PRODUCTION script
 *   (`generate-react-query-hooks.mjs` -- no generation logic is duplicated here,
 *   so the gate can never diverge from the generator), then compares it
 *   byte-for-byte against the committed copy:
 *     - apps/app/app/lib/manifest-hooks.generated.ts
 *   The generator writes in place, so the committed file is backed up first and
 *   ALWAYS restored in a `finally` -- the working tree is left exactly as found,
 *   pass or fail.
 *
 * EXIT CODES: 0 = in sync; 1 = drift detected (or generation failed).
 *
 * USAGE:
 *   node manifest/scripts/check-react-query-drift.mjs              # the CI gate
 *   node manifest/scripts/check-react-query-drift.mjs --self-test  # verify diff logic
 */

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

// The generated surface is DOMAIN-PARTITIONED (feature-1781435713420-506r2pr8i):
// the entry file is now a backward-compat shim that re-exports a barrel inside a
// chunk directory. The drift gate must cover BOTH the shim and every chunk file —
// otherwise entity/command drift hides behind a static 3-line shim and, worse, the
// gate would regenerate the chunks but restore only the shim (mutating the tree).
const SHIM_PATH = resolve(
  PROJECT_ROOT,
  "apps/app/app/lib/manifest-hooks.generated.ts"
);
const CHUNK_DIR = resolve(PROJECT_ROOT, "apps/app/app/lib/manifest-hooks");

/** Snapshot every *.generated.ts file under CHUNK_DIR as {relPath: contents}. */
function snapshotChunkDir() {
  const out = {};
  if (!existsSyncSafe(CHUNK_DIR)) {
    return out;
  }
  for (const name of readdirSync(CHUNK_DIR)) {
    if (!name.endsWith(".generated.ts")) {
      continue;
    }
    const p = join(CHUNK_DIR, name);
    if (!statSync(p).isFile()) {
      continue;
    }
    out[name] = readFileSync(p, "utf8");
  }
  return out;
}
function existsSyncSafe(p) {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}

const GENERATE_SCRIPT = resolve(__dirname, "generate-react-query-hooks.mjs");

// ---------------------------------------------------------------------------
// Pure comparison helper (covered by --self-test).
// Mirrors check-openapi-drift.mjs's diffText -- intentionally kept local so this
// gate has no import-time side effects from the other gates (some run on load).
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

  const base =
    "// GENERATED by manifest:generate-hooks — DO NOT EDIT.\nexport const queryKeys = {} as const;\n";

  // 1. identical input -> in sync
  let r = diffText(base, base);
  assert("identical -> inSync=true", r.inSync === true);
  assert("identical -> firstDiffLine=null", r.firstDiffLine === null);
  assert("identical -> diffLineCount=0", r.diffLineCount === 0);

  // 2. single-line change -> detected at the right line
  const changed =
    "// GENERATED by manifest:generate-hooks — DO NOT EDIT.\nexport const queryKeys = { event: {} } as const;\n";
  r = diffText(base, changed);
  assert("1-line change -> inSync=false", r.inSync === false);
  assert("1-line change -> firstDiffLine=2", r.firstDiffLine === 2);
  assert("1-line change -> diffLineCount=1", r.diffLineCount === 1);

  // 3. appended content (length grows) -> detected
  const appended = `${base}export function useFooList() {}\n`;
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
  console.log("React Query hooks drift gate -- regenerating IR-derived hooks...\n");

  // Snapshot the committed surface (shim + every chunk file) so we can restore it
  // no matter what. The generator writes all of these in place.
  const committedShim = readFileSync(SHIM_PATH, "utf8");
  const committedChunks = snapshotChunkDir();

  let drift = false;

  try {
    // Regenerate via the production script (it writes shim + chunks in place).
    // execFileSync throws on non-zero exit -> caught below and treated as failure.
    execFileSync(process.execPath, [GENERATE_SCRIPT], {
      cwd: PROJECT_ROOT,
      stdio: ["ignore", "ignore", "inherit"],
    });

    // Compare the shim.
    const regeneratedShim = readFileSync(SHIM_PATH, "utf8");
    const shimResult = diffText(committedShim, regeneratedShim);
    if (shimResult.inSync) {
      console.log(
        `  OK    manifest-hooks.generated.ts (shim, ${shimResult.committedLines} lines, in sync)`
      );
    } else {
      drift = true;
      console.log(
        `  DRIFT manifest-hooks.generated.ts (shim) -- first diff at line ${shimResult.firstDiffLine}; ${shimResult.diffLineCount} line(s) differ`
      );
    }

    // Compare every chunk file. A new chunk (present after regen, absent before)
    // or a removed chunk both count as drift.
    const regeneratedChunks = snapshotChunkDir();
    const chunkNames = new Set([
      ...Object.keys(committedChunks),
      ...Object.keys(regeneratedChunks),
    ]);
    for (const name of [...chunkNames].sort()) {
      const before = committedChunks[name];
      const after = regeneratedChunks[name];
      if (before === undefined) {
        drift = true;
        console.log(`  DRIFT manifest-hooks/${name} -- NEW chunk (not committed)`);
        continue;
      }
      if (after === undefined) {
        drift = true;
        console.log(`  DRIFT manifest-hooks/${name} -- chunk REMOVED by regen`);
        continue;
      }
      const r = diffText(before, after);
      if (r.inSync) {
        console.log(
          `  OK    manifest-hooks/${name} (${r.committedLines} lines, in sync)`
        );
      } else {
        drift = true;
        console.log(
          `  DRIFT manifest-hooks/${name} -- first diff at line ${r.firstDiffLine}; ${r.diffLineCount} line(s) differ (committed ${r.committedLines} -> regenerated ${r.regeneratedLines})`
        );
      }
    }
  } catch (err) {
    console.error("\nReact Query hooks generation FAILED during drift check:");
    console.error(err.message || err);
    drift = true;
  } finally {
    // Always restore the committed surface -- leave the working tree untouched.
    writeFileSync(SHIM_PATH, committedShim);
    for (const [name, contents] of Object.entries(committedChunks)) {
      writeFileSync(join(CHUNK_DIR, name), contents);
    }
  }

  console.log("");
  if (drift) {
    console.error(
      "DRIFT DETECTED. The committed React Query hooks are stale vs the IR."
    );
    console.error(
      "Fix: run `pnpm manifest:generate-hooks` and commit the regenerated files:"
    );
    console.error("  - apps/app/app/lib/manifest-hooks.generated.ts");
    console.error("  - apps/app/app/lib/manifest-hooks/*.generated.ts");
    process.exit(1);
  }
  console.log("React Query hooks are in sync with the IR. No drift.");
  process.exit(0);
}

// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
if (args.includes("--self-test")) {
  runSelfTest();
} else {
  runGate();
}
