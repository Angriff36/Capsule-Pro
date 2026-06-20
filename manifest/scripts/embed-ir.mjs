#!/usr/bin/env node

/**
 * embed-ir.mjs -- Freeze the compiled Manifest IR as a static module in apps/api.
 *
 * WHY THIS EXISTS:
 *   The canonical command dispatcher loads the merged IR on first use via
 *   `loadMergedPrecompiledIR()` (manifest/runtime/src/runtime/loadManifests.ts),
 *   which walks up to find the repo root, `readFileSync`s the ~7MB
 *   `manifest/ir/kitchen.ir.json`, `JSON.parse`s it, then reads it a SECOND time
 *   to hash it. That whole dance runs once per cold process start -- the most
 *   expensive part of a serverless function's first request.
 *
 *   Copying the IR into the api package as a plain `.json` lets the bundler inline
 *   it and lets V8's module cache parse it exactly once. The dispatcher imports
 *   the frozen module (apps/api/lib/manifest/frozen-ir.ts) and injects it into the
 *   runtime factory, so the cold-start path pays zero filesystem / repo-root /
 *   re-hash cost.
 *
 * WHAT IT DOES:
 *   Byte-copies manifest/ir/kitchen.ir.json -> apps/api/lib/manifest/kitchen.ir.generated.json.
 *   The copy is a COMMITTED, drift-gated artifact (see check-ir-embed-drift.mjs),
 *   mirroring the repo's other generated-and-committed surfaces (openapi.json,
 *   generated-schema.prisma, manifest-hooks.generated.ts).
 *
 *   Deterministic: a verbatim copy of a byte-stable source (compile.mjs reuses the
 *   prior `compiledAt` when sources are unchanged), so re-running produces zero diff.
 *
 * USAGE:
 *   node manifest/scripts/embed-ir.mjs            # write the frozen module
 *   node manifest/scripts/embed-ir.mjs --check    # exit 1 if it would change (no write)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

export const SOURCE_IR = resolve(PROJECT_ROOT, "manifest/ir/kitchen.ir.json");
export const EMBED_TARGET = resolve(
  PROJECT_ROOT,
  "apps/api/lib/manifest/kitchen.ir.generated.json"
);

/**
 * Read the source IR and the current embedded copy (if any).
 * @returns {{ source: string, current: string | null }}
 */
function readBoth() {
  const source = readFileSync(SOURCE_IR, "utf8");
  let current = null;
  try {
    current = readFileSync(EMBED_TARGET, "utf8");
  } catch {
    current = null; // not yet generated
  }
  return { source, current };
}

function main() {
  const checkOnly = process.argv.slice(2).includes("--check");
  const { source, current } = readBoth();

  if (current === source) {
    console.log(
      `[embed-ir] frozen IR in sync (${source.length} bytes) -> ${EMBED_TARGET}`
    );
    process.exit(0);
  }

  if (checkOnly) {
    console.error(
      "[embed-ir] DRIFT: apps/api/lib/manifest/kitchen.ir.generated.json is stale " +
        "vs manifest/ir/kitchen.ir.json. Run `pnpm manifest:ir:embed` and commit."
    );
    process.exit(1);
  }

  writeFileSync(EMBED_TARGET, source);
  console.log(
    `[embed-ir] wrote frozen IR (${source.length} bytes) -> ${EMBED_TARGET}`
  );
  process.exit(0);
}

// Run only when invoked directly (not when imported by check-ir-embed-drift.mjs,
// which reuses SOURCE_IR / EMBED_TARGET).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
