#!/usr/bin/env node
/**
 * check-convex-drift.mjs — IR ↔ Convex projection drift gate.
 *
 * Regenerates all six Convex surfaces from kitchen.ir.json and fails if
 * committed convex/{schema,queries,mutations,crons,http,sagas}.ts differs.
 * Working tree is always restored (backup + finally).
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

const ARTIFACTS = [
  "convex/schema.ts",
  "convex/queries.ts",
  "convex/mutations.ts",
  "convex/crons.ts",
  "convex/http.ts",
  "convex/sagas.ts",
].map((p) => resolve(ROOT, p));

const GENERATE = resolve(__dirname, "generate-convex.mjs");

export function diffText(a, b) {
  if (a === b) return { inSync: true, diffLineCount: 0 };
  const ca = a.split("\n");
  const cb = b.split("\n");
  let first = null;
  let count = 0;
  const max = Math.max(ca.length, cb.length);
  for (let i = 0; i < max; i++) {
    if (ca[i] !== cb[i]) {
      if (first === null) first = i + 1;
      count++;
    }
  }
  return { inSync: false, firstDiffLine: first, diffLineCount: count };
}

function selfTest() {
  const r = diffText("a\nb", "a\nc");
  if (r.inSync || r.firstDiffLine !== 2) {
    console.error("self-test failed");
    process.exit(1);
  }
  console.log("self-test passed");
  process.exit(0);
}

if (process.argv.includes("--self-test")) selfTest();

const backups = new Map();
for (const path of ARTIFACTS) {
  backups.set(path, readFileSync(path, "utf8"));
}

try {
  execFileSync(process.execPath, [GENERATE], { stdio: "inherit", cwd: ROOT });
  let failed = false;
  for (const path of ARTIFACTS) {
    const committed = backups.get(path);
    const regenerated = readFileSync(path, "utf8");
    const rel = path.replace(`${ROOT}/`, "");
    const d = diffText(committed, regenerated);
    if (!d.inSync) {
      failed = true;
      console.error(
        `::error::${rel} is stale (${d.diffLineCount} line(s) differ, first at line ${d.firstDiffLine}). Run: pnpm manifest:generate-convex`
      );
    }
  }
  if (failed) process.exit(1);
  console.log("Convex projection is in sync with IR.");
} finally {
  for (const [path, content] of backups) {
    writeFileSync(path, content, "utf8");
  }
}
