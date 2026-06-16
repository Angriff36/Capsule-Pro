#!/usr/bin/env node
/**
 * Generate Convex schema + functions from compiled Manifest IR.
 * Uses @angriff36/manifest/projections/convex — the authoritative persistence
 * projection for this clone repo (NOT Prisma).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { getConfigPaths } from "./read-config.mjs";

const repoRoot = resolve(process.cwd());
const { irPath } = getConfigPaths();
const convexDir = resolve(repoRoot, "convex");

const SURFACES = [
  "convex.schema",
  "convex.queries",
  "convex.mutations",
  "convex.crons",
  "convex.http",
  "convex.sagas",
];

const convexPkg = resolve(
  repoRoot,
  "node_modules/@angriff36/manifest/dist/manifest/projections/convex/index.js"
);
const { ConvexProjection } = await import(pathToFileURL(convexPkg).href);

const ir = JSON.parse(readFileSync(irPath, "utf8"));
const projection = new ConvexProjection();
const options = {
  output: "convex/schema.ts",
  referenceMode: "stringId",
  emitEventsTable: true,
  eventsTable: "manifestEvents",
  policyMode: "enforce",
};

let hadError = false;

for (const surface of SURFACES) {
  const result = projection.generate(ir, { surface, options });
  for (const d of result.diagnostics) {
    const line = `[${d.severity}] ${d.code}${d.entity ? ` (${d.entity})` : ""}: ${d.message}`;
    if (d.severity === "error") {
      console.error(line);
      hadError = true;
    } else {
      console.warn(line);
    }
  }
  for (const artifact of result.artifacts) {
    const outPath = resolve(repoRoot, artifact.pathHint);
    mkdirSync(dirname(outPath), { recursive: true });
    let code = artifact.code;
    if (artifact.pathHint === "convex/mutations.ts") {
      code = patchMutationsAuth(code);
    }
    writeFileSync(outPath, code, "utf8");
    console.log(`wrote ${artifact.pathHint}`);
  }
}

const mutationsPath = resolve(repoRoot, "convex/mutations.ts");
if (existsSync(mutationsPath)) {
  writeFileSync(
    mutationsPath,
    patchMutationsAuth(readFileSync(mutationsPath, "utf8")),
    "utf8"
  );
  console.log("patched convex/mutations.ts auth wiring");
}

/** Wire Clerk JWT auth into every generated mutation handler. */
function patchMutationsAuth(source) {
  if (source.includes("resolveMutationAuth")) {
    return source;
  }
  let code = source.replace(
    'import { mutation } from "./_generated/server";',
    'import { mutation } from "./_generated/server";\nimport { resolveMutationAuth } from "./lib/resolveAuth";'
  );
  code = code.replace(
    /const user = \(ctx as any\)\.auth \?\? \{\};/g,
    "const user = await resolveMutationAuth(ctx);"
  );
  return code;
}

if (hadError) {
  process.exit(1);
}
